# Easy Harness Real Persistence Fix

This patch addresses the two severe platform-authenticity issues found during testing:

1. Request/order data must not depend on browser localStorage when Supabase is configured.
2. Quote confirmation must not create local-only orders. Customer confirmation must persist an order in Supabase or fail visibly.

## Files to replace

- `src/App.jsx`
- Add migration: `supabase/migrations/202605120001_harden_confirm_request_order.sql`

## What changed

### Frontend

- Supabase-backed business records (`requests`, `orders`, messages, quotes, attachments, payments, shipments) now use in-memory state in hosted/Supabase mode and are loaded from Supabase after auth/session restore.
- LocalStorage remains only for local/demo mode.
- Sign-out clears Supabase-backed business state.
- Request/order active IDs no longer keep stale local IDs when remote load returns no matching record.
- Staff price release must persist a Supabase quote before the customer can confirm.
- Customer confirmation no longer falls back to a local-only order in Supabase mode.
- If order confirmation cannot be saved, the UI blocks confirmation instead of showing an order that later disappears.

### Supabase migration

- Replaces `public.confirm_request_order`.
- Makes confirmation idempotent for the same request/quote.
- Returns an existing persisted order if the request/quote was already confirmed.
- Keeps quote confirmation, request status update, and order creation in one database operation.

## Validation run

- `npm test -- --run` passed.
- `npm run build` passed after a clean `npm ci --ignore-scripts`.
  The uploaded project ZIP had a broken bundled `node_modules` permission state, so a clean install was required.

## Deployment steps

1. Replace `src/App.jsx`.
2. Add `supabase/migrations/202605120001_harden_confirm_request_order.sql`.
3. Run:
   ```bash
   npm ci --ignore-scripts
   npm test -- --run
   npm run build
   git add src/App.jsx supabase/migrations/202605120001_harden_confirm_request_order.sql
   git commit -m "Fix Supabase-backed request and order persistence"
   git push
   ```
4. Apply the migration in Supabase. If you are not using Supabase CLI, open SQL Editor and run the SQL file content once.

## Retest

1. Login with the same customer account in a normal browser and incognito window. The same requests should load from Supabase.
2. Staff releases a price. Customer should only see confirm when the quote has been persisted.
3. Customer confirms. A row must appear in `public.orders`.
4. Refresh / switch tab / reopen incognito. The order should still appear.
