# Qwen Draft Worker Runbook

This runbook is for the production path where Easy Harness must receive real
Qwen Draft results instead of local fallback Drafts.

Important boundary:

- Running `npm.cmd run draft:worker:once` on a developer machine is only a
  staging/proof check.
- A real customer-facing platform needs `scripts/qwen-draft-worker.mjs` running
  continuously in a hosted environment such as a small server or managed worker
  runtime.
- Supabase Edge Function `run-checking` only queues work. It is intentionally
  not the long-running Qwen executor.

## Goal

```text
Customer request + attachments
-> run-checking queues draft_jobs
-> external Qwen worker reads request/messages/files
-> Qwen returns Easy Harness Draft JSON
-> worker writes requests.check_result and request_messages
```

`run-checking` must not save a local Draft when Qwen times out.

## 1. Apply Database Migration

In Supabase Dashboard:

```text
SQL Editor -> New query
```

Run:

```sql
create table if not exists public.draft_jobs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  request_number text not null,
  trigger text not null default 'manual',
  status text not null default 'queued' check (
    status in ('queued', 'running', 'completed', 'failed', 'retry_needed', 'superseded', 'canceled')
  ),
  provider text not null default 'qwen',
  model text not null default '',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts > 0),
  locked_by text,
  locked_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  last_error text,
  input_snapshot jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists draft_jobs_status_created_idx
on public.draft_jobs(status, created_at);

create index if not exists draft_jobs_request_created_idx
on public.draft_jobs(request_id, created_at desc);

create unique index if not exists draft_jobs_one_active_per_request_idx
on public.draft_jobs(request_id)
where status in ('queued', 'running', 'retry_needed');

alter table public.draft_jobs enable row level security;

drop policy if exists draft_jobs_select_owner_or_staff on public.draft_jobs;
create policy draft_jobs_select_owner_or_staff
on public.draft_jobs for select
to authenticated
using (
  exists (
    select 1
    from public.requests r
    where r.id = draft_jobs.request_id
      and (r.customer_id = auth.uid() or public.is_staff_or_admin())
  )
);

drop policy if exists draft_jobs_staff_all on public.draft_jobs;
create policy draft_jobs_staff_all
on public.draft_jobs for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());
```

## 2. Deploy run-checking

Deploy the current local file:

```text
D:\Harness\easy-harness-prototype\supabase\functions\run-checking\index.ts
```

The deployed function must contain:

```text
externalDraftJobsEnabled
enqueueExternalDraftJob
draft_job_queued
primary_agent_failed_draft_pending
```

It must not contain:

```text
primary_agent_failed_local_draft_used
local-draft-builder
```

## 3. Configure Secrets

In Supabase Edge Function secrets:

```text
AI_DRAFT_PROVIDER=qwen
QWEN_API_KEY=<secret>
QWEN_MODEL=qwen3.6-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MAX_TOKENS=12000
AI_DRAFT_USE_EXTERNAL_WORKER=true
AI_DRAFT_ENABLE_ATTACHMENT_VISION=true
AI_DRAFT_ENABLE_QWEN_FILE_EXTRACT=false
```

The worker environment also needs:

```text
SUPABASE_URL=<project url>
SUPABASE_SERVICE_ROLE_KEY=<secret service role key>
QWEN_API_KEY=<secret>
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen3.6-plus
AI_DRAFT_WORKER_QWEN_TIMEOUT_MS=900000
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code or any `VITE_`
variable.

`AI_DRAFT_WORKER_QWEN_TIMEOUT_MS` belongs to the worker runtime. Adding it only
to Supabase Edge Function secrets does not change the timeout of a locally or
externally hosted worker process.

The current worker evidence layer sends these attachment signals into Qwen:

- image attachments as short-lived signed `image_url` inputs,
- text/CSV/JSON/MD excerpts and CSV table samples,
- XLSX/XLSM/XLS sheet samples,
- lightweight PDF text probes,
- CAD/3D filename/type metadata for context boundaries.

## 4. Run Worker

For one job:

```powershell
npm.cmd run draft:worker:once
```

This is not a production operating mode. It is only used to prove that one queued
job can be claimed, sent to Qwen, parsed, and written back.

For continuous processing:

```powershell
npm.cmd run draft:worker
```

In production, run the continuous worker command from a hosted environment with
process supervision/restart. Do not rely on a user or developer PC being online.

If Qwen returns malformed JSON, the worker makes one generic JSON-repair pass
with Qwen and records `source.qwen_json_repaired = true` when that repair was
used. This is syntax repair only; it must not reinterpret the request.

## 5. Verify

After submitting a request, run:

```sql
select
  r.request_number,
  r.status,
  r.check_status,
  r.check_result->>'model' as model,
  r.check_result->>'provider' as provider,
  r.check_result#>>'{agent_runtime,primary_agent_completed}' as primary_agent_completed,
  r.check_result#>>'{agent_runtime,local_draft_builder_used}' as local_draft_builder_used,
  r.check_result#>>'{agent_runtime,external_worker_completed}' as external_worker_completed,
  r.check_result#>>'{source,draft_job_id}' as draft_job_id,
  r.check_result#>>'{source,attachment_observation_count}' as attachment_observation_count,
  r.check_result#>>'{source,image_count_sent_to_model}' as image_count_sent_to_model
from requests r
order by r.created_at desc
limit 10;
```

Expected real Qwen result:

```text
provider = qwen
primary_agent_completed = true
local_draft_builder_used = false
external_worker_completed = true
draft_job_id is not null
```

Check job status:

```sql
select
  request_number,
  status,
  provider,
  model,
  attempt_count,
  locked_by,
  started_at,
  finished_at,
  left(coalesce(last_error, ''), 500) as last_error
from draft_jobs
order by created_at desc
limit 20;
```
