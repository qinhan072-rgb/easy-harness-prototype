# Easy Harness Launch Readiness Checklist

This checklist is for the current production/staging Supabase + Vercel setup before inviting real customers. It focuses on whether the platform can operate honestly with manual payment/logistics and AI-assisted intake.

## 1. Frontend Production Environment

- Vercel production deployment is `Ready`.
- Production env points to the intended Supabase project.
- Browser network calls use the intended Supabase URL.
- Customer UI has no role switcher and does not expose internal implementation terms.
- Staff/admin workspace is only reachable by staff/admin accounts.

## 2. Supabase Database, RLS, and Storage

Run:

```text
D:\Harness\easy-harness-project-materials\test-fixtures\ai-attachment-intake-v1\sql\supabase_launch_verification.sql
```

in Supabase Dashboard > SQL Editor.

Expected:

- All migration rows are present in `supabase_migrations.schema_migrations`.
- RLS is enabled for public app tables.
- Customer rows are scoped to the owner; staff/admin policies can operate workspace flows.
- Bucket `request-attachments` exists and is private.
- Recent uploaded files exist in both `storage.objects` and app-level `public.attachments`.
- `public.attachments.storage_object_id` joins to `public.storage_objects.id`.

## 3. Edge Function and AI Secrets

Deploy the latest function after code changes:

```powershell
npx.cmd supabase functions deploy run-checking --project-ref <your-project-ref>
```

PowerShell note: use `npx.cmd`, not `npx`, if script execution policy blocks `npx.ps1`.

Required secrets for the current Qwen attachment path:

```text
AI_DRAFT_PROVIDER=qwen
QWEN_API_KEY=<set in Supabase Secrets>
QWEN_BASE_URL=<set in Supabase Secrets>
QWEN_MODEL=qwen3.6-plus
AI_UPLOAD_ASSISTANT_PREVIEW_TIMEOUT_MS=45000
AI_UPLOAD_ASSISTANT_PREVIEW_MAX_TOKENS=800
AI_UPLOAD_ASSISTANT_PACKAGE_TIMEOUT_MS=115000
AI_UPLOAD_ASSISTANT_PACKAGE_MAX_TOKENS=1200
AI_UPLOAD_ASSISTANT_ENABLE_DEEP_THINKING=false
AI_UPLOAD_ASSISTANT_PING_TIMEOUT_MS=30000
AI_UPLOAD_ASSISTANT_PING_MAX_TOKENS=64
AI_DRAFT_ENABLE_ATTACHMENT_VISION=true
AI_DRAFT_ENABLE_QWEN_FILE_EXTRACT=true
QWEN_FILE_EXTRACT_MODEL=qwen-long
```

After running a request with test attachments, expected `check_result.source` signals include:

- `image_count_sent_to_model >= 1` for image uploads.
- `qwen_file_extract_count >= 1` for PDF / XLSX / CSV / document-style files when file extract is enabled.
- `cad_metadata_count >= 1` for STEP / DXF / STL / OBJ / IGES-style references.
- `parser_needed_count > 0` only for formats that still require an external converter, such as DWG, 3MF, or FCStd.

## 4. AI Attachment Intake Test

Use:

```text
D:\Harness\easy-harness-project-materials\test-fixtures\ai-attachment-intake-v1\
```

Manual intake scenarios are listed at:

```text
D:\Harness\easy-harness-project-materials\test-plans\AI_INTAKE_TEST_PLAN.md
```

Chinese test instructions with exact customer messages and attachment lists:

```text
D:\Harness\easy-harness-project-materials\test-plans\AI_INTAKE_TEST_PLAN_ZH.md
```

Recommended first test:

- Copy the `Full Mixed Intake` customer text from the fixture README.
- Upload all files in `attachments/`.
- Trigger `run-checking`.
- Inspect the newest request with the SQL verification file.

The goal is not for AI to produce manufacturing files. The goal is that AI sees the evidence layer and drafts the request without pretending to know unsupported content.

## 5. Manual Protected Payment SOP

Until Stripe/PayPal checkout and marketplace seller APIs are integrated, the platform can use a manual protected-payment flow:

1. Easy Harness staff confirms the quote/order basis in the platform.
2. Staff creates a matching external protected checkout, for example Alibaba.com Trade Assurance or a similar marketplace order.
3. The external checkout must match the platform order amount, currency, item summary, shipping basis, delivery terms, and customer identity as closely as the marketplace allows.
4. Staff records the marketplace checkout link, reference number, amount, currency, expiry, and snapshot back into the Easy Harness order payment area.
5. Customer opens the protected checkout link and pays on the marketplace.
6. Staff verifies payment in the marketplace seller console.
7. Staff marks the Easy Harness order payment as paid and continues production.

This is not API automation yet. Easy Harness remains the operational source of truth; the marketplace is the protected payment rail.

## 6. Manual Logistics SOP

Until DHL APIs are integrated, staff can run shipment manually:

1. Staff prepares shipment outside the platform, using DHL, freight forwarder, postal service, or marketplace logistics.
2. Staff confirms package weight, dimensions, destination, declared value, HS code, origin, and contact details.
3. Staff creates the label/commercial invoice externally.
4. Staff enters carrier, service, tracking number, tracking URL, shipment status, and shipment notes into Easy Harness.
5. Customer sees order status and tracking in the platform.

This is operationally acceptable for early launch if staff consistently updates payment and tracking state.

## 7. Business Information Still Required

Before real public launch, confirm:

- Legal company name.
- Production domain.
- Support email and WhatsApp.
- Return address.
- Privacy policy and terms legal owner.
- Customs defaults: HS code, declared value principle, origin country, incoterm default.
- Return/RMA contact path.
