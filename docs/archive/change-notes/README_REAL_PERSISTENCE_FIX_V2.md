# Easy Harness Real Persistence Fix v2

This replaces the previous real-persistence patch. Do not use the earlier package.

## Core correction

The platform must not let the frontend invent permanent request/order records in hosted mode.

This patch makes request creation and order confirmation database-owned:

1. Request numbers are generated inside Supabase by `create_request_with_number`.
2. The frontend no longer uses the currently loaded browser state to guess the next `HD-...` number in Supabase mode.
3. Staff price release must persist a quote before the customer can confirm.
4. Customer confirmation must create or return a real Supabase order. If the database does not save the order, the frontend does not show a successful order.
5. Business records in Supabase mode are loaded from Supabase, not treated as localStorage truth.
6. The home headline is reduced and visually calmer.

## Files

Replace / add:

- `src/App.jsx`
- `src/styles.css`
- `supabase/migrations/202605120002_real_request_order_persistence.sql`

## Supabase step

Open Supabase → SQL Editor → New query.

Paste the full contents of:

`supabase/migrations/202605120002_real_request_order_persistence.sql`

Run it once.

This creates/replaces:
- `public.create_request_with_number`
- `public.confirm_request_order`

## Local checks

Run:

```bash
npm test -- --run
npm run build
```

Validation completed here:
- `npm test -- --run` passed
- `npm run build` passed

## Retest

1. Create a new request from the home page.
   - It should save normally.
   - The new request number should continue from the latest Supabase request number.

2. Open the same customer account in incognito.
   - Requests should load from Supabase.

3. Staff releases a price.
   - Customer should only be able to confirm after the quote is saved.

4. Customer confirms.
   - Supabase `public.orders` should get a real row.
   - Refresh/reopen should not lose the order.
