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
