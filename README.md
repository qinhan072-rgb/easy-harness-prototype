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

## Run

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173
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
```

`PROJECT_HANDOFF.md` is the current project baseline. `NEW_AI_PROMPT.md` is a
copy-ready prompt for a fresh AI/Codex conversation.

## Demo Flow

1. Sign in with an account email on the login screen.
2. Use `customer@example.com` to enter the customer app.
3. Upload files or click **Use sample request**, then submit.
4. Watch the checklist transition and enter the request thread. The local
   checking adapter now uses the same result shape expected from a future
   checking service: accepted, needs more information, or unable to review.
5. Sign out, then use `staff@easyharness.com` to enter the ops workspace.
6. Pick a request from the queue.
7. Reply in the same thread as Easy Harness.
8. Optionally upload attachments, include an inline table or layout preview, and/or set the harness price.
9. Send the update. If a price is included, the request gets a versioned harness
   quote record. The quote covers the harness only; shipping, import duties, and
   tax handling remain part of the order checkout.
10. The customer receives in-app notifications for updates and can confirm once a price is ready.
11. Confirming a request creates a checkout-style order with a request snapshot, Shenzhen origin, estimated package, service-level shipping options, DAP import-charge boundary, after-sales policy, and checkout total.
12. Choose a payment route: hosted card/wallet checkout, PayPal checkout, or bank transfer reference.
    Card and PayPal create a local payment-session record before the payment
    confirmation callback is recorded.
13. After payment, the order opens as an order-status page instead of a locked checkout form. Customers can review the confirmed item, delivery details, production state, and carrier tracking.
14. Use the lightweight order message thread for customer questions about
    address, production, tracking, or after-sales.
15. Sign in with `staff@easyharness.com` to work grouped request/order lanes,
    update payment state, delivery details, package estimate, selected shipping
    service, production status, shipment tracking, and order messages.
16. Sign in with `admin@easyharness.com` to manage users, review the roles
    matrix, inspect requests and orders, review the audit log plus local
    integration-adapter events, and inspect the backend-shaped data model, API
    replacement map, and first database schema blueprint.

Customer accounts also include a minimal account page for profile details and
upload terms acceptance. A customer must accept the upload terms before
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
- Role and user management are local only, but sign-in now creates a local
  session record that should later be connected to a managed identity service.
- Local persistence should later be replaced by server tables and managed
  sessions.
- Local adapters now mark the handoff points for future checking, storage,
  payment, shipping, tracking, and notification APIs. The current behavior is
  still local, but the data shape is closer to a deployable service boundary.
- The admin **Data model** view shows local keys, future table names, service
  ownership, row counts, API replacement points, and a first schema blueprint.
  Use it as the first map when replacing localStorage with a server database.
- Shipping rates, tax calculation, and merchant payment are represented by
  local records and should be replaced by server-side integrations before launch.
