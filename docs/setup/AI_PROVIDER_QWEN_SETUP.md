# Qwen Upload Assistant Setup

Easy Harness uses Qwen as a lightweight upload assistant inside the Supabase
Edge Function `run-checking`. The assistant helps organize the uploaded package,
summarize the request basis, and ask only a small number of useful clarification
questions.

The browser frontend must not store or expose the Qwen API key.

## Product Boundary

The upload assistant is not a factory drawing generator. It must not promise:

- final harness drawings,
- BOM or cut list,
- manufacturing package,
- confirmed connector/terminal sourcing,
- production test plans.

The expected customer-facing result is a clearer request basis for Easy Harness
review.

## Supabase Secrets

In Supabase Dashboard, open:

```text
Project Settings -> Edge Functions -> Secrets
```

Add:

```text
AI_DRAFT_PROVIDER=qwen
QWEN_API_KEY=<your Qwen/DashScope API key>
QWEN_MODEL=qwen-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MAX_TOKENS=12000
AI_UPLOAD_ASSISTANT_FAST_RESPONSE_MS=45000
AI_UPLOAD_ASSISTANT_PREVIEW_TIMEOUT_MS=15000
AI_UPLOAD_ASSISTANT_PREVIEW_MAX_TOKENS=800
AI_DRAFT_PLATFORM_WALL_CLOCK_MS=140000
AI_DRAFT_JOB_BUDGET_MS=125000
AI_DRAFT_FIRST_PASS_TIMEOUT_MS=100000
AI_DRAFT_AUDIT_PASS_TIMEOUT_MS=20000
AI_DRAFT_PROVIDER_REQUEST_TIMEOUT_MS=110000
AI_DRAFT_PROVIDER_STATUS_TIMEOUT_MS=15000
AI_DRAFT_ENABLE_EVIDENCE_AUDIT=true
AI_DRAFT_ENABLE_ATTACHMENT_VISION=false
AI_DRAFT_MAX_VISION_IMAGES=4
AI_DRAFT_SIGNED_URL_TTL_SECONDS=600
AI_DRAFT_TEXT_ATTACHMENT_MAX_BYTES=200000
AI_DRAFT_STRUCTURED_ATTACHMENT_MAX_BYTES=2000000
AI_DRAFT_ENABLE_QWEN_FILE_EXTRACT=false
QWEN_FILE_EXTRACT_MODEL=qwen-long
QWEN_FILE_EXTRACT_MAX_TOKENS=5000
AI_DRAFT_QWEN_FILE_EXTRACT_MAX_FILES=4
AI_DRAFT_QWEN_FILE_EXTRACT_MAX_BYTES=10000000
AI_DRAFT_QWEN_FILE_EXTRACT_POLL_ATTEMPTS=8
AI_DRAFT_QWEN_FILE_EXTRACT_POLL_INTERVAL_MS=750
AI_DRAFT_CAD_METADATA_MAX_BYTES=10000000
```

`AI_UPLOAD_ASSISTANT_FAST_RESPONSE_MS` controls how long `run-checking` waits
for a quick Qwen result before returning the page to the customer. If Qwen needs
more time, the same Supabase Edge Function run registers background work with
`EdgeRuntime.waitUntil` and writes the result back when it finishes.

`AI_UPLOAD_ASSISTANT_PREVIEW_TIMEOUT_MS` controls the pre-submit AI chat sidecar
inside `Upload with AI assistance`. That path uses only the current form state
and file metadata; it does not inspect hidden file contents or create a request.
`AI_UPLOAD_ASSISTANT_PREVIEW_MAX_TOKENS` keeps this lightweight chat path from
using the long-form request-basis token budget.

Do not configure the old local `qwen-draft-worker` as a production dependency.

## Runtime Behavior

The intended online path is:

```text
Browser upload/chat
-> Supabase Storage saves attachments
-> requests/request_messages/attachments/storage_objects are written
-> run-checking calls Qwen from Supabase Edge Function
-> fast result returns immediately when available
-> otherwise EdgeRuntime.waitUntil continues the same lightweight assistant run
-> request basis and customer message are saved back to Supabase
```

This keeps the customer upload flow fast while avoiding a local machine worker.
Supabase hosted Edge Functions still have idle and wall-clock limits, so prompts
and file analysis must remain bounded. For heavier OCR, CAD rendering, drawing
normalization, or manufacturing-package generation, add a separate production
worker/service later instead of stretching `run-checking`.

## Attachment Observations

`run-checking` builds an internal `attachment_observations` layer before calling
the assistant:

- Image files can be sent to Qwen as `image_url` inputs when vision is enabled.
- CSV and text files can become excerpts, table samples, and structured facts.
- Small XLSX/XLSM files can be probed for sheet rows and table-like evidence.
- PDF files get a lightweight text probe when readable text is present.
- STEP/STP, DXF, OBJ, STL, and limited IGES files can get lightweight CAD
  metadata such as file type, header hints, entity counts, and bounding boxes.
- DWG, 3MF, FCStd, unsupported, encrypted, or oversized files are marked
  `parser_needed`; the assistant may treat them as received files but must not
  claim their geometry was visually inspected.

Enable image attachment understanding only after confirming provider terms,
privacy/upload authorization language, and customer-file handling policy:

```text
AI_DRAFT_ENABLE_ATTACHMENT_VISION=true
```

The Qwen file-extract bridge can reduce cases where a customer uploads a useful
PDF, spreadsheet, or document and the assistant only sees a filename:

```text
AI_DRAFT_ENABLE_QWEN_FILE_EXTRACT=true
QWEN_FILE_EXTRACT_MODEL=qwen-long
AI_DRAFT_QWEN_FILE_EXTRACT_MAX_FILES=4
AI_DRAFT_QWEN_FILE_EXTRACT_MAX_BYTES=10000000
```

Keep these limits conservative. The upload assistant should help the customer
submit better material; it should not become a long-running engineering parser.

Use the base URL that matches the Qwen API key region:

```text
China / Beijing: https://dashscope.aliyuncs.com/compatible-mode/v1
Singapore:       https://dashscope-intl.aliyuncs.com/compatible-mode/v1
US / Virginia:   https://dashscope-us.aliyuncs.com/compatible-mode/v1
```

## Deploy

After changing `supabase/functions/run-checking/index.ts`, deploy the Edge
Function:

```bash
supabase functions deploy run-checking
```

GitHub/Vercel redeploys update the frontend only. They do not deploy Supabase
Edge Function code.

## Fallback

DeepSeek can stay configured as a backup:

```text
DEEPSEEK_API_KEY=<optional fallback key>
DEEPSEEK_MODEL=deepseek-v4-pro
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

If `AI_DRAFT_PROVIDER` is set to `qwen`, Qwen is used. If it is not set, the
function prefers Qwen when `QWEN_API_KEY` exists, otherwise it falls back to
DeepSeek.
