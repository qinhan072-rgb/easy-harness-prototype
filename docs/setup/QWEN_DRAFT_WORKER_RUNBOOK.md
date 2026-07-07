# Qwen Upload Assistant Edge Runbook

Last updated: 2026-06-29

This file keeps the historical name so older handoffs still resolve, but the
production direction has changed:

```text
Easy Harness no longer depends on a local qwen-draft-worker process.
```

The customer-facing upload assistant now runs through the Supabase Edge
Function `run-checking`.

The old local script `scripts/qwen-draft-worker.mjs` has been removed from the
repo. Do not restore it as a production dependency.

## Product Boundary

The AI is a small assistant inside the professional upload flow. It helps a
customer upload useful harness materials and prepares a concise request basis
for Easy Harness review.

It does not generate:

- final factory drawings,
- BOM or cut list,
- production work orders,
- supplier RFQ packages,
- automatic pricing.

## Runtime Path

```text
Customer uploads drawings / CAD / pinout / photos / PDFs / spreadsheets
-> browser saves files to Supabase Storage
-> request, request_messages, attachments, storage_objects are saved
-> run-checking calls Qwen from Supabase Edge Function
-> if Qwen finishes inside the fast-response window, the result returns directly
-> otherwise EdgeRuntime.waitUntil keeps the same Supabase Edge run writing back
-> requests.check_result and request_messages receive the request basis
```

There is no production `draft_jobs` handoff and no external worker requirement
for this upload assistant path.

## Required Supabase Edge Secrets

```text
AI_DRAFT_PROVIDER=qwen
QWEN_API_KEY=<secret>
QWEN_MODEL=qwen3.6-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MAX_TOKENS=12000
AI_UPLOAD_ASSISTANT_FAST_RESPONSE_MS=45000
AI_UPLOAD_ASSISTANT_PREVIEW_TIMEOUT_MS=45000
AI_UPLOAD_ASSISTANT_PREVIEW_MAX_TOKENS=800
AI_UPLOAD_ASSISTANT_PACKAGE_TIMEOUT_MS=115000
AI_UPLOAD_ASSISTANT_PACKAGE_MAX_TOKENS=1200
AI_UPLOAD_ASSISTANT_ENABLE_DEEP_THINKING=false
AI_UPLOAD_ASSISTANT_PING_TIMEOUT_MS=30000
AI_UPLOAD_ASSISTANT_PING_MAX_TOKENS=64
AI_DRAFT_ENABLE_EVIDENCE_AUDIT=true
AI_DRAFT_ENABLE_ATTACHMENT_VISION=true
AI_DRAFT_ENABLE_QWEN_FILE_EXTRACT=false
```

`AI_UPLOAD_ASSISTANT_FAST_RESPONSE_MS` controls how long the Edge Function waits
before returning a quick "organizing" response. If the result is not ready in
that window, the same Edge Function run continues through `EdgeRuntime.waitUntil`.

`AI_UPLOAD_ASSISTANT_PREVIEW_TIMEOUT_MS` controls quick pre-submit AI guidance.
The same visible sidecar automatically uses
`AI_UPLOAD_ASSISTANT_PACKAGE_TIMEOUT_MS` when the customer has uploaded files and
asks about review readiness, missing material, or upload notes. This keeps the
UI simple while allowing a 90-120 second package-aware answer inside Supabase
Edge limits.
`AI_UPLOAD_ASSISTANT_PREVIEW_MAX_TOKENS` and
`AI_UPLOAD_ASSISTANT_PACKAGE_MAX_TOKENS` keep sidecar responses small even when
the formal request-basis draft uses a larger Qwen budget.
`AI_UPLOAD_ASSISTANT_ENABLE_DEEP_THINKING=false` is the recommended first live
setting. Turn it on only after verifying Qwen still returns stable compact JSON
for package-aware chat.
During staging, type `/ping` in the upload assistant input to test only the
Supabase Edge Function -> Qwen API path with a tiny prompt.

## Attachment Evidence Boundary

The assistant may use only evidence that is actually available to the current
run:

- customer text and request messages,
- attachment metadata,
- image inputs sent to Qwen through signed Supabase URLs,
- parsed CSV/text excerpts,
- lightweight PDF text probes,
- spreadsheet sheet samples,
- CAD metadata probes,
- optional Qwen file-extract observations.

If a file is only metadata or marked `parser_needed`, the assistant may say the
file was received for Easy Harness review, but it must not claim to understand
the hidden contents.

## Deploy

When this file changes only documentation, deploy docs normally.

When this file's runtime assumptions are implemented in:

```text
supabase/functions/run-checking/index.ts
```

deploy the Supabase Edge Function too. A Vercel redeploy updates only the
frontend and does not update `run-checking`.

## Verify

Submit a request with one or more uploaded files, then inspect recent requests:

```sql
select
  request_number,
  status,
  check_status,
  check_result->>'provider' as provider,
  check_result->>'model' as model,
  check_result#>>'{source,runtime}' as runtime,
  check_result#>>'{source,attachment_observation_count}' as attachment_observation_count,
  check_result#>>'{source,image_count_sent_to_model}' as image_count_sent_to_model,
  check_result#>>'{agent_runtime,primary_agent_completed}' as primary_agent_completed
from requests
order by created_at desc
limit 10;
```

Expected successful Qwen result:

```text
provider = qwen
runtime = supabase_edge_function
primary_agent_completed = true
status in ('needs_info', 'in_review')
```

If Qwen is slow but the Edge background path continues, the request may first
show `checking/pending` and update shortly after.
