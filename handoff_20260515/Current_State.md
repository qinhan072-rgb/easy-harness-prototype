# Current State

Generated: 2026-05-15

## Current Stage

Easy Harness is an early real hosted platform:

```text
Vercel frontend + Supabase Auth/Postgres/Storage + Supabase Edge Function AI intake
```

It is past localStorage-only prototype work, but it is not yet a fully live
trade platform because payment/logistics/email/provider integrations are still
not connected to real production accounts.

## Already Completed

- React/Vite customer app, staff ops console, and admin console in one codebase.
- Supabase Auth email-link and Google OAuth frontend path.
- Supabase `profiles` role/status model.
- Supabase PostgreSQL schema for profiles, requests, messages, attachments,
  quotes, orders, payments, shipments, tracking, notifications, audits, service
  events, and service countries.
- RLS and workspace RPCs for customer/staff/admin data boundaries.
- Customer request creation with database-generated request numbers.
- Request and request message persistence.
- Real browser file upload to Supabase Storage bucket `request-attachments`.
- Attachment metadata and storage object metadata persistence.
- Reload-stable private attachment preview path with signed URLs.
- Inline attachment preview support for image/PDF/CSV where available.
- File/folder drag upload on home, customer thread, and staff thread surfaces.
- AI intake Edge Function `run-checking`.
- Qwen provider path documented and tested by the user; DeepSeek remains an
  optional fallback.
- Staff request replies, visual/table/preview blocks, and quote release.
- Customer quote confirmation creating a persisted order.
- Order page with delivery details, shipping option, DAP import-duty boundary,
  payment methods, production state, shipping/tracking, and support framing.
- Protected marketplace payment handoff:
  - customer requests marketplace protected checkout
  - address/shipping locks during preparation
  - staff prepares external protected checkout link
  - customer opens link from Easy Harness order summary
  - staff records payment after marketplace confirmation
- Legal/policy pages added:
  - Terms
  - Privacy
  - Upload/File Authorization
  - Quote and Custom Order Terms
  - Shipping/Duties/Regions
  - After-sales Support
- Recent UX correction: converted requests are de-emphasized after an order is
  created. Requests remain accessible, but primary work moves to Orders.
- Smoke tests include checks for protected marketplace payment, inline
  previews, storage preview paths, drag upload, and converted request handling.

## Still Not Live

- Stripe Checkout session creation and webhooks.
- PayPal checkout/order capture and webhooks.
- Bank transfer reconciliation beyond recorded state.
- Marketplace seller API automation. Current marketplace path is staff-prepared
  link handoff.
- DHL Express live rates, shipment creation, label/commercial invoice, pickup,
  and tracking sync.
- Email notification provider delivery.
- WhatsApp provider delivery.
- Production domain and production SMTP sender.
- Final legal/entity review of policy pages and support contacts.
- AI file understanding pipeline:
  - OCR
  - vision extraction
  - PDF/Excel/CAD parsing
  - structured attachment observations
  - Harness JSON
  - catalog matching
  - validation rules
  - manufacturing package generation

## Current AI Boundary

The AI Agent can create a Draft from text/history/attachment metadata and should
act as Easy Harness intake.

It must not pretend it has visually inspected or parsed file contents unless a
separate parser has supplied those observations.

Draft means:

```text
ready for Easy Harness review and quote-path evaluation
```

not:

```text
ready for factory production
```

## Most Recent Product Work Before This Handoff

The user noticed the Request and Order lists felt confusing because the same
job appeared in both places with related but different states. The product
decision was:

- keep requests and orders separate
- once an order exists, make the order primary
- heavily de-emphasize the old request
- move converted requests into a collapsed lower section
- use clearer order-facing language such as `Order created`

Related code:

- `src/App.jsx`
- `src/styles.css`
- `scripts/smoke-test.mjs`

Verification after that change passed:

```bash
npm.cmd run build
npm.cmd run test
```

## Current User Request

The user is switching Codex accounts and needs a complete local handoff package
so the new account's AI can continue without old chat history.

This package is that handoff.

## Current Blockers

Engineering blockers:

- real payment provider credentials and approval
- real DHL Express account/API coverage
- email sender/domain setup
- production domain/DNS
- AI file extraction pipeline and harness knowledge/validation resources

Operational blockers:

- company legal/entity information
- PayPal merchant account
- Stripe eligibility or alternative provider
- DHL Express China account
- marketplace seller setup if using Alibaba.com Trade Assurance
- official support email/WhatsApp
- HS code, product English name, declared value rules, origin/return address
- first supported country list

## First Files To Read When Continuing

```text
PROJECT_HANDOFF.md
README.md
docs/current/CURRENT_PLATFORM_BASELINE.md
docs/ai-agent/AI_AGENT_PRINCIPLES.md
docs/setup/MARKETPLACE_PROTECTED_PAYMENT.md
docs/setup/STAGE_2A_BACKEND_READINESS.md
docs/setup/AUTH_EMAIL_AND_GOOGLE_SETUP.md
docs/setup/AI_PROVIDER_QWEN_SETUP.md
package.json
src/App.jsx
src/styles.css
scripts/smoke-test.mjs
```

