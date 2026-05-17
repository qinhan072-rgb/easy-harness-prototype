# Next Actions

This list is for the new Codex AI. Do not start by proposing endless new
features. Stabilize what exists, then choose one focused integration line.

## P0 - Must Preserve / Verify First

### 1. Read Current Baseline

Files:

- `PROJECT_HANDOFF.md`
- `docs/current/CURRENT_PLATFORM_BASELINE.md`
- `docs/ai-agent/AI_AGENT_PRINCIPLES.md`
- this handoff folder

Acceptance:

- New AI can explain request/order separation.
- New AI can explain AI Agent evidence boundaries.
- New AI can explain why payment/logistics UI remains despite no live APIs.

### 2. Run Build And Smoke Test

Commands:

```bash
npm.cmd run build
npm.cmd run test
```

Acceptance:

- Build passes.
- Smoke test passes.
- If failing, inspect the exact smoke test contract before changing UX.

### 3. Verify Hosted Customer Flow

Use:

```text
https://easy-harness-prototype.vercel.app
```

Flow:

1. Login with a customer account.
2. Create a request with text and a real file.
3. Let AI intake create either a Draft or a concise missing-info prompt.
4. Staff releases a price.
5. Customer confirms request.
6. Order is created.
7. Confirm old request is de-emphasized and order becomes primary.

Acceptance:

- Request persists in Supabase.
- Messages/attachments persist.
- Created order appears in Orders.
- Converted request is not competing with the order.

### 4. Do Not Break Marketplace Protected Payment

Flow:

1. Customer opens order.
2. Enters delivery/shipping details.
3. Selects Marketplace protected payment.
4. Delivery/shipping become locked.
5. Staff pastes marketplace checkout link.
6. Customer sees `Open protected checkout`.
7. Staff can record payment after external confirmation.

Acceptance:

- No spinner-only waiting state.
- Customer understands they can leave and return.
- Link appears only after staff provides it.

## P1 - Next Real Integration Candidates

Choose one focused line, not all at once.

### A. Production Email Notification Delivery

Goal:

Send email for important in-app notifications.

Needed outside code:

- domain
- business email
- SMTP/Resend/provider account
- sender verification

Likely files:

- `.env.example`
- `supabase/functions/route-notification`
- `src/App.jsx`
- notification RPC migrations if needed

Acceptance:

- Important notification creates database record and sends email.
- Email copy does not mention internal implementation.
- Provider errors are logged without exposing secrets.

### B. Stripe / PayPal Hosted Payment

Goal:

Turn modeled payment routes into real hosted checkout sessions.

Needed outside code:

- PayPal merchant account
- Stripe eligibility or alternative payment provider
- legal/entity/bank details
- webhook endpoint configuration

Likely files:

- `supabase/functions/create-payment-session`
- `supabase/functions/payment-webhook`
- payment migrations/RPCs
- `src/App.jsx`

Acceptance:

- App never collects card data.
- Customer is redirected to provider-hosted checkout.
- Webhook reconciles payment state.
- Order production state advances only after confirmed payment.

### C. DHL Express Logistics

Goal:

Replace modeled rates/tracking with live DHL flow.

Needed outside code:

- DHL Express China account
- API credentials
- shipper account
- pickup/return address
- customs template
- HS code/product English name/declared value rules

Likely files:

- `supabase/functions/quote-shipping-rates`
- `supabase/functions/create-shipment`
- `supabase/functions/sync-tracking`
- shipment/tracking migrations/RPCs
- `src/App.jsx`

Acceptance:

- Shipping rates are real provider responses.
- Shipment/label/tracking events persist.
- Customer sees clean status, not raw provider payloads.

### D. Protected Marketplace API Readiness

Goal:

Move the protected marketplace payment path from staff-prepared link handoff
toward seller API-assisted order creation and reconciliation.

Needed outside code:

- Alibaba.com seller account and Trade Assurance eligibility
- developer app key/secret and seller authorization
- confirmation that `alibaba.trade.order.create` returns a usable payment URL
  for the seller's order type
- agreement on marketplace product/SKU mapping for custom harness orders

Likely files:

- `supabase/functions/create-marketplace-order`
- `supabase/functions/sync-marketplace-order`
- marketplace payment fields/RPCs
- `src/App.jsx`

Acceptance:

- Staff can review the marketplace order payload before creation.
- The external marketplace order matches the Easy Harness order basis.
- Payment URL and trade ID persist back to the Easy Harness order.
- Payment status is reconciled from marketplace order/fund APIs before
  production advances.

### E. Staff/Admin Account Management

Goal:

Support real staff/admin invitation or creation.

Needed outside code:

- decide admin owner
- production staff emails

Likely files:

- `src/App.jsx`
- Supabase Auth admin/Edge Function boundary
- profiles policies/RPCs

Acceptance:

- Public signup remains customer-only.
- Staff/admin cannot be self-created from public UI.
- Admin can invite or provision ops users.

### F. AI File Understanding Pipeline

Goal:

Give the Agent real attachment observations instead of only metadata.

Needed outside code/resources:

- examples of real harness request files
- factory/vendor demand forms if available
- connector/pinout/BOM examples
- accepted validation examples

Likely architecture:

```text
uploaded files
  -> file classifier / OCR / vision / PDF / CSV parser
  -> structured attachment observations
  -> Draft Agent
  -> Easy Harness Draft
```

Current bridge:

- `run-checking` can optionally send selected image attachments to Qwen through
  short-lived Supabase signed URLs when `AI_DRAFT_ENABLE_ATTACHMENT_VISION=true`.
- `run-checking` now creates first-pass `attachment_observations`: text/CSV
  excerpts, CSV table samples, XLSX/XLSM sheet probes, lightweight PDF text
  probes, Qwen image observations, and `parser_needed` markers.
- This is the first intake understanding layer, not the full engineering
  file-understanding pipeline.
- Scanned PDFs, complex Excel files, CAD geometry, OCR, catalog matching, and
  manufacturing package generation still need stronger dedicated parsers before
  the Agent may rely on those contents.

Likely files:

- `supabase/functions/run-checking/index.ts`
- new file parsing Edge Function or server process
- storage object metadata schema
- AI docs

Acceptance:

- Agent cites only actual parsed observations.
- It does not hallucinate file contents.
- It still avoids questionnaire behavior.

## P2 - Polish / Later

### 1. UI/UX Third-Round Real User Testing

Goal:

Let the user and colleagues try the platform as real customers.

Acceptance:

- Collect confusing labels.
- Check first-screen clarity.
- Check order/payment trust.
- Check whether converted requests/orders feel understandable.

### 2. Mobile/Narrow Layout

Goal:

Make request thread, right-side panels, order summary, and auth modal feel
professional on narrow screens.

Acceptance:

- No overlapping text.
- No hidden primary action.
- Order summary remains understandable.

### 3. Richer Staff Visual Updates

Goal:

Allow staff to show images, tables, PDFs, and structured previews directly in
conversation/order updates.

Acceptance:

- Customer can confirm based on visible evidence, not only downloads.
- Attachments remain accessible after reload.

### 4. Admin Observability

Goal:

Make admin dashboard useful for service status, failed integrations, audit logs,
and notification delivery.

Acceptance:

- Admin can diagnose provider failures without raw database browsing.

## Do Not Start Yet Unless Explicitly Requested

- full marketplace API automation
- full CAD/BOM manufacturing package generation
- heavy industrial questionnaire
- complex after-sales marketplace clone
- large design-system rewrite
