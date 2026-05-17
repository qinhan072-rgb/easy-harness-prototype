# Qwen AI Provider Setup

Easy Harness runs the Draft Agent in the Supabase Edge Function
`run-checking`. The browser frontend must not store or expose the Qwen API key.

## Supabase Secrets

In Supabase Dashboard, open:

```text
Project Settings -> Edge Functions -> Secrets
```

Add:

```text
AI_DRAFT_PROVIDER=qwen
QWEN_API_KEY=<your Qwen/DashScope API key>
QWEN_MODEL=qwen3.6-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MAX_TOKENS=12000
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

`QWEN_MODEL` can be changed later without changing frontend code. Keep the
Draft Agent contract stable even when testing another model.

## Attachment Observations

Qwen 3.6 can accept image input through DashScope's OpenAI-compatible chat API,
but Easy Harness only gets that benefit if the Edge Function explicitly sends
the uploaded image files to the model.

`run-checking` now builds an internal `attachment_observations` layer before
calling the Draft Agent:

- Image files can be sent to Qwen as `image_url` inputs when vision is enabled.
- CSV and text files can be downloaded from Supabase Storage and converted into
  text excerpts, table samples, and structured facts.
- Small XLSX/XLSM files can be probed for sheet rows and table-like evidence.
- PDF files get a lightweight text probe when readable text is present.
- When `AI_DRAFT_ENABLE_QWEN_FILE_EXTRACT=true`, PDF, DOCX, XLSX/XLSM, CSV,
  JSON, TXT/MD, EPUB/MOBI, and common image files that were not already sent as
  `image_url` inputs can be uploaded to Qwen's file-extract path. The returned
  document observations are then passed to the Draft Agent.
- STEP/STP, DXF, OBJ, STL, and limited IGES files can get a lightweight CAD
  metadata probe: file type, product/header hints, layers, entity counts,
  sampled points, triangle/face counts, and bounding boxes when available.
- DWG, 3MF, FCStd, unsupported, encrypted, or oversized files are classified as
  `parser_needed`; the Agent may treat them as received files but must not claim
  their geometry was visually inspected.

To enable image attachment understanding for `run-checking`, set:

```text
AI_DRAFT_ENABLE_ATTACHMENT_VISION=true
```

When enabled, `run-checking` creates short-lived Supabase signed URLs for up to
`AI_DRAFT_MAX_VISION_IMAGES` image attachments and includes them as Qwen
`image_url` inputs. Text/CSV/PDF/XLSX observations are controlled by:

```text
AI_DRAFT_TEXT_ATTACHMENT_MAX_BYTES=200000
AI_DRAFT_STRUCTURED_ATTACHMENT_MAX_BYTES=2000000
AI_DRAFT_ENABLE_QWEN_FILE_EXTRACT=true
QWEN_FILE_EXTRACT_MODEL=qwen-long
AI_DRAFT_QWEN_FILE_EXTRACT_MAX_FILES=4
AI_DRAFT_QWEN_FILE_EXTRACT_MAX_BYTES=10000000
AI_DRAFT_CAD_METADATA_MAX_BYTES=10000000
```

Before enabling image vision in production, internally confirm provider terms,
privacy/upload authorization language, and customer-file handling policy. This
is an internal deployment check; do not expose implementation details in the
customer conversation.

The Qwen file-extract bridge is meant to reduce the chance that a customer
uploads a useful PDF, spreadsheet, or document and the Draft Agent only sees a
filename. The CAD metadata probe reduces the same risk for common neutral CAD
files, but it is still not a visual CAD renderer or manufacturing parser. DWG,
3MF, FCStd, and production-grade CAD geometry review need a separate converter
or preview service before the Agent can inspect those files visually.

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
