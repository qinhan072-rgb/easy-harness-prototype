# Easy Harness Project Handoff

Last updated: 2026-05-07

This file is the working baseline for the Easy Harness prototype. Use it when
starting a new AI conversation, onboarding a teammate, or checking whether the
current product direction is still consistent.

## Project Goal

Easy Harness is a lightweight overseas-facing platform for custom wiring harness
requests. The target customer is mainly an individual user or a small buyer who
does not want to prepare formal engineering documents. The user should be able
to upload photos, sketches, PDFs, or an old harness sample, describe the need in
plain language, and let Easy Harness turn that into a quoteable request and then
an order.

The product should feel like a modern AI workspace, not an old ticket system.
However, the implementation should move toward a real platform, not a static UI
demo. The prototype should preserve realistic data flow, role boundaries, state
changes, and future integration points.

## Local Project

Project folder:

```text
D:\Harness\easy-harness-prototype
```

Run locally:

```bash
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5173
```

Verify:

```bash
npm.cmd run build
npm.cmd run test
```

Use `npm.cmd` in PowerShell. Plain `npm` may be blocked by the local PowerShell
execution policy.

## Demo Accounts

Visitors now land directly in the customer workspace. The top-right action is
**Log in** / **Create account** until a session exists, and private request or
order history is hidden until login. When Supabase environment variables are
configured, sign-in and customer registration use Supabase Auth email links and
load role/status from `public.profiles`. Without those values, the local
`easy-harness.authSession` adapter remains available for offline localhost
development only; hosted deployments must not silently create local accounts.
Public registration only creates customer accounts; staff and admin accounts
must be invited or created by admin.

| Role | Email | Purpose |
| --- | --- | --- |
| Customer | `customer@example.com` | Customer request, checkout, and order tracking |
| Staff | `staff@easyharness.com` | Request queue, Easy Harness replies, price, fulfillment updates |
| Admin | `admin@easyharness.com` | Business dashboard, user, role, request, order, and audit management |

## Current Product Flow

1. Visitor enters the customer workspace without being forced through login.
2. Visitor opens **New request**.
3. Visitor must upload at least one design file, describe the harness need, and
   accept upload terms.
4. Submit opens login / customer registration if no session exists. The request
   draft stays in place and is submitted after login or registration.
5. The checking page runs a horizontal checklist transition while the local
   checking adapter records the same result shape expected from a future service:
   accepted, needs more information, or unable to review.
6. A request thread is created.
7. If the check result needs more information, the customer thread shows the
   missing details clearly so the customer can answer in the same conversation.
8. Easy Harness posts the initial check result and, when accepted, a generated
   draft milestone.
9. Customer can keep adding details and files in the same thread.
10. Staff opens the request in the ops console.
11. Staff replies as **Easy Harness**, can attach files, insert an inline table,
   insert a lightweight preview, and set the harness price.
12. If staff sends a reply without a price, the request stays **In review**.
13. Once a price exists, the request gets a versioned harness quote and becomes
    **Ready to confirm**.
14. Customer confirms the current draft and released harness quote.
15. Confirmation creates an order.
16. Before payment, the order page behaves like checkout:
    - confirmed item and latest Easy Harness update
    - personal-user delivery address
    - shipping service selection
    - DAP import-tax boundary
    - final confirmation, address-change, cancellation, and payment-timing rules
    - after-sales policy
    - payment route selection
17. Payment routes are represented as separate provider paths:
    - card / wallet via hosted provider
    - PayPal
    - bank transfer reference
18. Card and PayPal paths create a local payment-session record before the
    callback is recorded. Bank transfer creates a transfer reference.
19. After payment, the order page becomes a dedicated order-status view instead
    of a disabled checkout form.
20. Paid order view focuses on:
    - confirmed order summary
    - payment received
    - production status
    - shipping and tracking
    - confirmed delivery information
    - lightweight order message thread
21. Staff can update payment state, delivery details, package estimate, selected
    shipping service, production state, and shipment tracking from the ops order
    console.

## Product Decisions

- The first launch version should include a real checking agent.
- The checking agent only decides whether the uploaded request can enter review,
  whether key information is missing, or whether the upload is irrelevant.
- Final draft generation, price evaluation, and production quotation can start
  as staff-assisted work and become more automated later.
- User-facing text must not mention "human review", "prototype", "mock",
  "Auth provider", or other implementation details.
- The system voice visible to customers is always **Easy Harness**.
- Visitors should see the customer workspace first. Login / registration is
  required only when saving personal work, submitting a request, or opening
  account-specific requests and orders.
- Public registration is customer-only. Staff and admin accounts are never
  self-registered from the public customer surface.
- Request state should stay simple, but intake now has explicit non-happy-path
  states so the checking flow is not an always-success animation:
  - `draft_saved`
  - `checking`
  - `needs_info`
  - `not_supported`
  - `in_review`
  - `ready_to_confirm`
  - `confirmed`
- Do not bounce request status back and forth during discussion. Before price it
  is generally **In review**; after price it is **Ready to confirm**.
- Order and request are separate concepts:
  - request = communication, draft, confirmation
  - order = checkout, payment, production, shipping, tracking
- Production status should stay lightweight. This is not a large industrial
  machine order. Current public states should be simple:
  - Scheduled
  - In production
  - Ready to ship
  - Shipped / Delivered through logistics tracking
- QC is not exposed as a main customer-facing production stage.
- Logistics tracking should be designed around normal carrier/API concepts:
  label created, in transit, out for delivery, delivered, exception.
- Checkout currently uses DAP terms:
  shipping can be charged at checkout, but import duties, VAT, brokerage, and
  customs charges are not collected unless a landed-cost integration is added.
- Do not collect raw card details inside the app. Card and wallet payments
  should go through a hosted payment provider session.
- Bank transfer can remain as a slower B2B-friendly route with a reference code
  and receipt confirmation.

## Current Technical State

This is a React/Vite front-end prototype with local persistence.

Important files:

```text
src/App.jsx
src/supabaseClient.js
src/styles.css
scripts/smoke-test.mjs
supabase/migrations/202605080001_stage_2a_schema.sql
supabase/migrations/202605080002_stage_2a_rls.sql
supabase/migrations/202605080003_stage_2a_security_hardening.sql
supabase/functions/*
docs/STAGE_2A_BACKEND_READINESS.md
README.md
```

Current persistence is browser `localStorage`, structured to resemble future
server tables:

| Local key | Future table concept |
| --- | --- |
| `easy-harness.users` | `profiles` / users |
| `easy-harness.currentUserId` | local UI pointer |
| `easy-harness.authSession` | `auth_sessions` |
| `easy-harness.requests` | requests |
| `easy-harness.requestMessages` | request messages |
| `easy-harness.quotes` | harness quote versions |
| `easy-harness.orders` | orders |
| `easy-harness.payments` | payment sessions / payment records |
| `easy-harness.shipments` | shipments / tracking events |
| `easy-harness.orderMessages` | order support messages |
| `easy-harness.attachments` | attachments |
| `easy-harness.storageObjects` | storage objects / signed upload records |
| `easy-harness.notifications` | notifications |
| `easy-harness.notificationDeliveries` | notification delivery attempts |
| `easy-harness.auditLogs` | audit logs |
| `easy-harness.serviceEvents` | integration adapter events |
| `easy-harness.activeRequestId` | local UI state |
| `easy-harness.activeOrderId` | local UI state |

This local data model is intentional preparation for Supabase. It is not
production persistence.

Local adapters currently mark future service boundaries for identity sessions,
database tables, checking, storage, payment sessions, shipping rates/tracking,
and multi-channel notifications. Keep new flow work behind these boundaries
where practical so real APIs can replace the local implementations later. The
admin **Data model** view lists the backend-shaped local ledgers, their future
table names, service owner, row counts, replacement points, and a first database
schema blueprint.

Stage 2A backend direction is now selected:

- Supabase Auth for customer login/registration and admin-created staff/admin
  accounts.
- Supabase PostgreSQL for server tables and row-level security.
- Supabase Storage private buckets with signed upload/download URLs.
- Supabase Edge Functions for payment sessions/webhooks, DHL rates, DHL
  shipment creation, tracking sync, storage upload contracts, notification
  routing, and AI checking boundaries.
- Stripe Checkout, PayPal, and bank transfer remain the payment routes.
- DHL Express API is the first shipping integration target.
- DAP remains the first checkout incoterm.

Backend-readiness files are present, but live provider calls still wait on
offline resources: PayPal China merchant account, Stripe eligibility or
alternative, DHL Express China account/API credentials, domain/DNS/email,
customs template including HS code and English product name, and legal terms.
The staging Supabase project has the Stage 2A schema, RLS, and security
hardening migrations applied. The Vercel front end can now initialize Supabase
Auth with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and
`VITE_APP_BASE_URL`. Supabase-authenticated customer requests, customer thread
messages, attachment metadata, staff request replies, released harness quotes,
and customer quote-confirmation/order creation now have live database write
paths. Checkout payment route selection and payment receipt now write
`payments` and `payment_events` rows. Staff fulfillment edits now update
orders and write `shipments` / `tracking_events`. Order support messages,
notifications, notification delivery queue rows, and audit logs now have
Supabase write paths. The largest remaining local/demo persistence gap is real
file binary upload/storage-object signing, plus the external AI/payment/DHL
provider calls.

Current adapter replacement points:

| Adapter | Replace local function | Future integration |
| --- | --- | --- |
| Auth | `signInWithEmailAdapter(email, users)`, `createCustomerAccountAdapter(form)`, and `clearAuthSessionAdapter(session)` remain as offline fallback; hosted mode uses `supabase.auth.signInWithOtp`, `onAuthStateChange`, profile loading, and `supabase.auth.signOut` | Supabase Auth |
| Database | `databaseSchemaBlueprint` plus local table ledgers | Supabase PostgreSQL, row-level access rules, migrations |
| Checking | `runCheckingAdapter(request)` | AI/service-side intake check |
| Payment | `createPaymentSessionAdapter(order, method)` and `confirmPaymentCallbackAdapter(order, method)` | Stripe Checkout, PayPal, bank reconciliation, webhooks |
| Shipping | `quoteShippingRatesAdapter(packageEstimate)` and `buildShipmentUpdateAdapter(order, form)` | DHL Express rates, shipment creation, label/invoice, and tracking |
| Notifications | `routeNotificationAdapter(payload)` | Email, WhatsApp, SMS provider routing |
| Storage | `createStorageUploadAdapter(attachments, requestId, messageId, uploadedBy)` | Object storage signed upload URLs and access rules |

## Missing Real Integrations

These are not done yet:

- Real Auth: partially connected. Supabase Auth email-link login and customer
  registration are wired in the front end once Vercel/Supabase environment
  variables are set. Staff/admin still require invited Auth users with
  `profiles.role` set by admin.
- Real database: profiles, requests, request_messages, attachments,
  storage_objects, quotes, orders, payments, shipments, order_messages,
  notifications, notification_deliveries, integration_events, audit_logs.
- Real file upload: object storage, previews, download URLs, size/type limits,
  signed upload URLs, and per-role access rules. The local storage object ledger
  records metadata only.
- AI checking agent: current local adapter only approximates request relevance,
  missing information, and rejection outcomes.
- Payment provider: Stripe Checkout, PayPal, webhook confirmation, and bank
  transfer reconciliation.
- Shipping rates: Shippo, EasyPost, carrier APIs, or manual staff fallback.
- Tracking API: carrier tracking events connected to orders.
- Landed cost / tax: Stripe Tax, Avalara, Zonos, or another landed-cost service
  if the product later chooses DDP or tax collection.
- Legal documents: Terms, Privacy Policy, upload authorization, data handling.
- Production reliability: server-side validation, security rules, error states,
  backup, monitoring, and audit retention.

Stage 2A migration/function contracts exist for the missing integrations above.
They intentionally stop at provider boundaries until the offline account and
credential work is complete.

## Current Testing Expectation

Every meaningful iteration should run:

```bash
npm.cmd run build
npm.cmd run test
```

Also manually inspect at least these flows:

1. Customer creates a request with upload and description.
2. Customer sees animated checking and lands in the request thread.
3. Staff sees the new request in queue.
4. Staff replies and sets price.
5. Customer sees the update and confirms.
6. Order is created.
7. Checkout address, shipping, tax boundary, and payment route behave clearly.
8. Payment creates the paid order state.
9. Paid order view focuses on production and logistics, not disabled checkout.
10. Staff order console updates production and tracking information.
11. Staff order console updates production and tracking information.
12. Customer and staff can use the lightweight order message thread.
13. Admin can inspect users, requests, orders, audit logs, and local service
    adapter events.

## Things Not To Regress

- Do not reintroduce a visible user/staff switch inside the customer product.
- Do not expose staff/admin functions to customer role.
- Do not put account management as a main left-nav item for customer; use the
  user/profile entry pattern.
- Do not make the checkout page feel like a random internal form.
- Keep customer checkout personal-user first. Business import details are
  optional, not the default path.
- Keep normal trade expectations visible before payment: final confirmation,
  address changes, cancellation boundary, DAP tax boundary, and after-sales
  contact.
- Do not show a generic single "Pay now" if the product decision is separate
  payment routes.
- Do not show paid orders as disabled checkout forms.
- Do not add heavy production statuses unless there is a real operational reason.
- Keep production public states lightweight. Payment and fulfillment state should
  stay separate from production state.
- Do not add misleading tax collection language. Use clear DAP/import-duty
  boundary until real landed-cost support exists.
- Do not optimize only for screenshots. The priority is coherent platform flow.

## Next Likely Work

The current active product area is order/payment/fulfillment UX.

Near-term work should make the order flow more realistic while keeping it
simple:

- Refine checkout around familiar international ecommerce patterns.
- Keep payment methods provider-specific.
- Keep shipping as service-level choices from Shenzhen, China.
- Keep DAP import-tax messaging clear but not alarming.
- Keep paid order tracking focused on production state and carrier tracking.
- Keep staff fulfillment controls close to real operational data entry.
