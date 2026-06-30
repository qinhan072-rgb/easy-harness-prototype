# Easy Harness Project Handoff

Last updated: 2026-06-29

This is the active handoff for the Easy Harness platform. It replaces older
prototype-era notes that still mention local-only persistence.

## Working Folder

```text
D:\Harness\easy-harness-prototype
```

## Verify

```bash
npm.cmd run build
npm.cmd run test
```

Hosted staging app:

```text
https://easy-harness-prototype.vercel.app
```

Local development:

```text
http://127.0.0.1:5173
```

## Product Baseline

Easy Harness helps customers submit custom wiring harness needs in plain
language with photos, old samples, sketches, PDFs, pinouts, CAD, spreadsheets,
or other materials. The professional upload path should let prepared customers
submit their material directly, while a small Easy Harness upload assistant can
organize the package into a request basis and suggest only useful additions.
After review, the request can become a quote and then a separate order for
checkout, payment, production, shipping, and tracking.

New request entry points are now only:

- Canvas configurator.
- Upload with AI assistance.

The assistant is embedded beside the upload form. It is not a separate customer
entry path.

The visible customer-facing system identity is always **Easy Harness**.

Requests and orders are separate:

- Request: communication, uploaded material, AI-assisted request basis, price
  release, and customer confirmation.
- Order: checkout, delivery address, payment, production state, shipping,
  tracking, and after-sales contact.

Customer, staff, and admin are separate users. Do not add visible role-switching
shortcuts in the customer product.

## Current Technical State

The app is now a real hosted early platform, not only a localStorage prototype.

Implemented:

- Supabase Auth email link and Google OAuth frontend path.
- Supabase `profiles` role/status loading.
- Supabase PostgreSQL schema for profiles, requests, request messages,
  attachments, storage objects, quotes, orders, payments, shipments, tracking,
  notifications, audit logs, integration events, and service countries.
- RLS policies and workspace RPCs for customer/staff/admin data boundaries.
- Supabase Storage upload path for browser files in `request-attachments`.
- Request creation with database-generated request numbers.
- Request message persistence.
- Staff request replies and quote persistence.
- Customer quote confirmation through a persisted order RPC.
- Payment state records for modeled Stripe/PayPal/bank transfer flows.
- Protected marketplace payment handoff: customer can request a matching
  protected checkout link, and staff can paste the external marketplace order
  link back into the order.
- Staff order updates for production, payment, shipment, and tracking metadata.
- In-app notifications, notification delivery records, audit logs, and service
  events.
- `run-checking` Supabase Edge Function for the Easy Harness upload assistant,
  with a configurable Qwen/DeepSeek model adapter. Qwen can optionally receive
  selected uploaded image attachments through short-lived Supabase signed URLs
  when `AI_DRAFT_ENABLE_ATTACHMENT_VISION=true`.
- First `attachment_observations` layer in `run-checking`: CSV/text excerpts,
  CSV table samples, XLSX/XLSM sheet probes, lightweight PDF text probes, Qwen
  image-input observations, lightweight CAD metadata for STEP/STP, DXF, OBJ,
  STL, and limited IGES, plus `parser_needed` markers for unsupported or
  unparsed files.
- Optional Qwen file-extract bridge for PDF, DOCX, XLSX/XLSM, CSV, JSON,
  TXT/MD, EPUB/MOBI, and common image files that were not already sent as
  `image_url` inputs. Enable with `AI_DRAFT_ENABLE_QWEN_FILE_EXTRACT=true`.

Still not live:

- Stripe/PayPal hosted payment session calls and webhooks.
- Marketplace seller account/API automation. The current protected payment path
  is staff-prepared link handoff for a matching protected order; Alibaba
  International/Trade Assurance API automation should be treated as an
  integration candidate once seller API access and permissions are confirmed.
- DHL Express live rate, shipment, label, invoice, pickup, and tracking calls.
- Email/WhatsApp provider delivery.
- Production custom domain and company email sender.
- Customer-facing policy pages exist, but production legal/entity review is not
  complete. The missing pieces are company legal name, address, jurisdiction,
  support contacts, final tax/duty handling, and operational acceptance by the
  business. Custom-order cancellation and after-sales/return rules now have a
  production-minded draft in the customer policy pages.
- Deep AI engineering pipeline: production-grade OCR, visual CAD rendering,
  richer CAD geometry conversion, drawing/document normalization, Harness JSON,
  catalog matching, rule validation, BOM/cut list/manufacturing package
  generation.

## Upload Assistant Baseline

The current AI target is not an automatic factory drawing, BOM, or manufacturing
package generator.

The assistant's job is to help prepared customers upload better material and to
organize the submitted package into a clear request basis. Professional users
should be able to ignore the assistant and submit directly.

Use:

```text
docs/ai-agent/AI_AGENT_PRINCIPLES.md
```

as the product baseline for agent behavior.

Key principles:

- Do not turn the experience into a long industrial questionnaire.
- Ask only the 1-3 questions that truly improve the upload package or request
  basis.
- Capture any explicit connector, pinout, wire, material, voltage/current, or
  environment details the user provides.
- Do not force users to provide manufacturing details they may not know.
- Request-basis readiness means "ready for Easy Harness review", not "ready for
  production".
- Do not depend on the local `qwen-draft-worker` for production. The current
  production path is Supabase Edge Function `run-checking` calling Qwen directly
  with a bounded fast-response budget and `EdgeRuntime.waitUntil` continuation.
- Do not expose "manual review", "human review", "prototype", "mock", or
  implementation details in customer UI.

Recommended AI provider settings for the current deployment pass:

```text
AI_DRAFT_PROVIDER=qwen
QWEN_API_KEY=...
QWEN_MODEL=qwen3.6-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_DRAFT_ENABLE_ATTACHMENT_VISION=true
AI_DRAFT_ENABLE_QWEN_FILE_EXTRACT=true
QWEN_FILE_EXTRACT_MODEL=qwen-long
```

Keep DeepSeek secrets only if it is used as a fallback.

## Important Docs

- `docs/current/CURRENT_PLATFORM_BASELINE.md` - authoritative current state.
- `docs/ai-agent/AI_AGENT_PRINCIPLES.md` - AI Agent configuration baseline.
- `docs/setup/STAGE_2A_BACKEND_READINESS.md` - backend and external-resource
  readiness.
- `docs/setup/LAUNCH_READINESS_CHECKLIST.md` - launch verification checklist,
  Supabase SQL checks, and manual payment/logistics SOP.
- `docs/setup/REPOSITORY_BOUNDARY.md` - what belongs in GitHub and what should
  stay local/generated.
- `docs/setup/AUTH_EMAIL_AND_GOOGLE_SETUP.md` - Supabase Auth email/Google
  setup.
- `docs/archive/` - historical iteration notes and patches.
- `D:\Harness\easy-harness-project-materials\test-fixtures\ai-attachment-intake-v1\`
  - local companion AI attachment intake regression pack with PNG, PDF, CSV,
  XLSX, STEP, DXF, and STL files. It is intentionally outside the platform repo.

## Do Not Regress

- Visitors should enter the customer workspace before login.
- Login/register should appear only when needed to save or access private work.
- Public registration creates customer accounts only.
- Staff/admin accounts must be invited or created by admin.
- Do not collapse request and order into one concept.
- Do not label Draft/quote basis previews as production BOMs unless a real
  manufacturing package has been generated; carry explicit customer details
  from the full request thread into quote/order snapshots.
- Do not collect card details in the app; use hosted payment providers.
- Keep DAP import duty/tax boundary clear until landed-cost support exists.
- Keep production tracking simple for customers.
- Keep archived docs as history, but do not treat them as current truth.
