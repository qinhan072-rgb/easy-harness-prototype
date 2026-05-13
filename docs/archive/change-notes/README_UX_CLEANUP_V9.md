# Easy Harness UX cleanup v9

This patch is based on the current stable baseline that already includes:

- v7 Supabase source-of-truth persistence / workspace visibility fix
- v8 Agent Draft gate and customer-facing Draft behavior fix

It only changes UI/UX display, copy, and lightweight layout behavior.

## Changed files

- `src/App.jsx`
- `src/styles.css`
- `scripts/smoke-test.mjs`

## What changed

- Consolidated the customer account UI into one top-right account pill.
- Kept the notification bell, but reframed it as lightweight in-app request/order updates.
- Removed duplicate logged-in username display from the bottom-left sidebar.
- Improved homepage supporting copy and helper chips.
- Added stronger empty states for Requests and Orders.
- Reworded request/customer statuses to be more user-facing.
- Reworked the request header so title is primary and request number is secondary.
- Removed customer-facing full Draft schema details from the right panel.
- Kept the formal Easy Harness Draft as the main milestone in the thread.
- Simplified the right-side request panel into current step / user action / Easy Harness review.
- Changed quote confirmation wording to `Accept price and create order`.
- Kept clickable payment and shipping options on the order page, per product decision.
- Reworded checkout/order copy to feel more commercially real and less prototype-like.
- Simplified staff navigation from Queue + Active request to Requests + Orders.
- Renamed staff work lanes to clearer operational language.
- Removed staff Table / Preview composer toggles from the UI.
- Updated smoke tests to match the new UX wording.

## What did not change

- No Supabase schema changes.
- No SQL migration.
- No auth/session/persistence logic changes.
- No Agent JSON/schema changes.
- No payment provider integration changes.
- No logistics API changes.
- No staff/customer permission changes.

## Validation run

```bash
npm run build
npm test
```

Both passed locally. The build still has the existing Vite chunk-size warning, which is unrelated to this UX patch.

## Deploy

Replace the changed files, then run:

```bash
npm run build
npm test
```

Then deploy the frontend as usual.

No Supabase Edge Function deploy is required for this patch unless your deployment process always redeploys all functions.
