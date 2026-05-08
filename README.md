# Easy Harness Platform Prototype

Interactive front-end platform prototype for the early Easy Harness request flow.
The prototype is request-driven and role-based: customer, staff, and admin
accounts enter separate workspaces while reading and updating shared request
data.

Prototype data is persisted in browser `localStorage`, so requests, user profile
changes, role changes, and terms acceptance survive refreshes in the same
browser. This is a local persistence adapter, not the production database.

The local persistence layer now mirrors the production data shape more closely:
auth session, profiles, requests, request messages, quotes, orders, payment
sessions, shipment records, order messages, attachment metadata, storage object
records, notifications, notification deliveries, service events, and audit logs
are stored as separate local ledgers. Files are still local metadata only; the
browser does not upload binary content to a server yet.

Stage 2A backend-readiness files now exist under `supabase/` and `docs/`.
They define the intended Supabase/PostgreSQL schema, RLS policies, Edge Function
contracts, and environment variables before PayPal, DHL, domain, email, and
other offline resources are available.
The staging Supabase database has been migrated with `stage_2a_schema`,
`stage_2a_rls`, and `stage_2a_security_hardening`.
The front end now initializes Supabase Auth when `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` are configured. Without those values, the app
keeps the local auth adapter available for offline localhost development. Hosted
deployments do not silently create local accounts if Auth configuration is
missing.

## Run

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

Optional hosted-auth environment:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_APP_BASE_URL=http://127.0.0.1:5173
```

Smoke check:

```bash
npm run build
npm run test
```

## Handoff Docs

Before starting a new AI conversation or handing the project to another person,
read:

```text
PROJECT_HANDOFF.md
NEW_AI_PROMPT.md
docs/STAGE_2A_BACKEND_READINESS.md
```

`PROJECT_HANDOFF.md` is the current project baseline. `NEW_AI_PROMPT.md` is a
copy-ready prompt for a fresh AI/Codex conversation.
`docs/STAGE_2A_BACKEND_READINESS.md` explains what is ready for Supabase and
what still waits on external accounts, credentials, legal text, and customs
information.
`docs/AUTH_EMAIL_AND_GOOGLE_SETUP.md` contains the customer-facing Supabase
email templates and the Google OAuth setup checklist.

## Demo Flow

1. Open the app. Visitors land directly in the customer workspace. Private
   request and order history appears only after login.
2. Upload files or click **Use sample request**, accept the upload terms, then submit.
3. The account modal opens. When Supabase Auth environment variables are set,
   email login and customer registration send a real sign-in email. Without
   those values, use `customer@example.com` to log in locally, or create a new
   customer account with an email address and optional nickname. Public
   registration only creates customer accounts. Google sign-in is wired through
   Supabase OAuth and works after the Google provider credentials are configured
   in Supabase. Microsoft and Apple positions remain reserved for later provider
   connection.
4. Watch the checklist transition and enter the request thread. If the checking
   result needs more information, the customer thread now shows a clear prompt
   for the missing details before staff quote work continues. The local
   checking adapter now uses the same result shape expected from a future
   checking service: accepted, needs more information, or unable to review.
5. Use the top-right account menu to sign out, then log in with
   `staff@easyharness.com` to enter the ops workspace.
6. Pick a request from the queue.
7. Reply in the same thread as Easy Harness.
8. Optionally upload attachments, include an inline table or layout preview, and/or set the harness price.
9. Send the update. If a price is included, the request gets a versioned harness
   quote record. The quote covers the harness only; shipping, import duties, and
   tax handling remain part of the order checkout.
10. The customer receives in-app notifications for updates and can confirm once a price is ready.
11. Confirming a request creates a checkout-style order with a request snapshot,
    Shenzhen origin, estimated package, service-level shipping options, DAP
    import-charge boundary, payment-before-production confirmation rules,
    after-sales policy, and checkout total. The delivery form is personal-user
    first; business import fields stay optional and collapsed.
12. Choose a payment route: hosted card/wallet checkout, PayPal checkout, or bank transfer reference.
    Card and PayPal create a local payment-session record before the payment
    confirmation callback is recorded.
13. After payment, the order opens as an order-status page instead of a locked checkout form. Customers can review the confirmed item, delivery details, production state, and carrier tracking.
14. Use the lightweight order message thread for customer questions about
    address, production, tracking, or after-sales.
15. Log in with `staff@easyharness.com` to work grouped request/order lanes,
    update payment state, delivery details, package estimate, selected shipping
    service, production status, shipment tracking, and order messages.
16. Log in with `admin@easyharness.com` to open the business dashboard, manage
    users, review the roles matrix, inspect requests and orders, review the
    audit log plus local integration-adapter events, and inspect the
    backend-shaped data model, API replacement map, backend readiness panel, and
    first database schema blueprint.

Customer accounts also include an account page for nickname, email status,
notification preferences, sign-in status, and upload terms. Delivery address is
handled during order checkout. A customer must accept the upload terms before
submitting a request.

If an update is sent without a price, the request remains **In review**. Once a
price exists, the request becomes **Ready to confirm** and does not bounce back
to earlier states during later discussion.

## Product Assumptions

- The first launch version includes a real checking agent.
- The checking step only decides whether the request can enter review.
- Draft creation and final pricing can improve over time without changing the user flow.
- The user-facing flow should look like an AI request workspace, not an old ticket system.
- User and ops views share the same request data and message history.
- Request confirmation creates a separate order; checkout, payment,
  production, and shipping belong to the order rather than the request thread.
- The checkout model uses DAP terms for the first version: shipping is included
  in the payable total, but import duties, VAT, brokerage, or customs fees are
  not collected at checkout unless a landed-cost service is connected.
- Card and wallet payment should be opened through a hosted payment provider
  session; the app should not collect raw card details.
- Bank transfer is a slower payment path with a reference code and manual
  receipt confirmation.
- Shipping is represented as service-level options. Manual tracking and future
  carrier API tracking are both modeled on the order.
- Customer order tracking keeps production lightweight: scheduled, in production,
  ready to ship, then carrier tracking once shipped.
- Staff updates, customer confirmations, and payment activity create audit
  records.
- Visitors can enter the customer workspace before login. Login or customer
  account creation is required before saving requests, orders, and account
  details.
- Role and user management are local only, but sign-in and registration now
  create a local session record that should later be connected to a managed
  identity service. Public registration only creates customer accounts; staff
  and admin accounts are invited or created by admin.
- Local persistence should later be replaced by server tables and managed
  sessions.
- Stage 2A selects Supabase/PostgreSQL/Supabase Auth/Supabase Storage/Supabase
  Edge Functions as the first backend path. The repository contains migration
  and function contracts, but live integration still waits on offline accounts
  and secrets.
- Local adapters now mark the handoff points for future checking, storage,
  payment, shipping, tracking, and notification APIs. The current behavior is
  still local, but the data shape is closer to a deployable service boundary.
- The admin **Data model** view shows local keys, future table names, service
  ownership, row counts, API replacement points, and a first schema blueprint.
  Use it as the first map when replacing localStorage with a server database.
- Shipping rates, tax calculation, and merchant payment are represented by
  local records and should be replaced by server-side integrations before launch.
