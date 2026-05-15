# Easy Harness Project Handoff

Last updated: 2026-05-13

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
language with photos, old samples, sketches, PDFs, pinouts, or other materials.
The platform should turn that input into a clear request, then a quoteable
draft, then a separate order for checkout, payment, production, shipping, and
tracking.

The visible customer-facing system identity is always **Easy Harness**.

Requests and orders are separate:

- Request: communication, uploaded material, AI intake, draft, price release,
  and customer confirmation.
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
- `run-checking` Supabase Edge Function for Easy Harness Draft intake, with a
  configurable Qwen/DeepSeek model adapter. Qwen can optionally receive selected
  uploaded image attachments through short-lived Supabase signed URLs when
  `AI_DRAFT_ENABLE_ATTACHMENT_VISION=true`; the default remains metadata-only.

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
  support contacts, returns/refunds, tax/duty handling, and operational
  acceptance by the business.
- Deep AI engineering pipeline: file unpacking, OCR, CAD/PDF/Excel parsing,
  vision extraction, Harness JSON, catalog matching, rule validation, BOM/cut
  list/manufacturing package generation.

## AI Agent Baseline

The current AI target is not an automatic factory BOM generator.

The AI Agent's first job is to convert a customer's natural request into an
Easy Harness Draft: a clear, trustworthy, stage-specific wiring harness
requirement object that can move into Easy Harness review, quote-path
evaluation, and later manufacturing assessment.

Use:

```text
docs/ai-agent/AI_AGENT_PRINCIPLES.md
```

as the product baseline for agent behavior.

Key principles:

- Do not turn the experience into a long industrial questionnaire.
- Ask only the 1-3 questions that truly block draft closure.
- Capture any explicit connector, pinout, wire, material, voltage/current, or
  environment details the user provides.
- Do not force users to provide manufacturing details they may not know.
- Draft closure means "ready for Easy Harness review", not "ready for
  production".
- Do not expose "manual review", "human review", "prototype", "mock", or
  implementation details in customer UI.

Live AI provider settings:

```text
AI_DRAFT_PROVIDER=qwen
QWEN_API_KEY=...
QWEN_MODEL=qwen3.6-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_DRAFT_ENABLE_ATTACHMENT_VISION=false
```

Keep DeepSeek secrets only if it is used as a fallback.

## Important Docs

- `docs/current/CURRENT_PLATFORM_BASELINE.md` - authoritative current state.
- `docs/ai-agent/AI_AGENT_PRINCIPLES.md` - AI Agent configuration baseline.
- `docs/setup/STAGE_2A_BACKEND_READINESS.md` - backend and external-resource
  readiness.
- `docs/setup/AUTH_EMAIL_AND_GOOGLE_SETUP.md` - Supabase Auth email/Google
  setup.
- `docs/archive/` - historical iteration notes and patches.

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
