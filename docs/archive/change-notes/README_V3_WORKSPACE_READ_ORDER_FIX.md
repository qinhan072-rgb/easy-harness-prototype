# Easy Harness v3 — Workspace Read + Order Persistence Repair

This package replaces the previous v2 patch. Use this package now.

## What this patch fixes

1. Customer incognito / new browser sessions not seeing saved requests.
2. Staff incognito not seeing the request queue.
3. Staff "Active request" blank-screen crash when no active request is loaded.
4. Customer thread/order blank state when the selected request/order is missing.
5. Order workspace read path relying on fragile nested RLS selects.
6. Request/order workspace data being read through explicit Supabase RPCs instead of browser-local state.

## Files to replace / add

- Replace: `src/App.jsx`
- Replace: `src/styles.css`
- Add / run SQL: `supabase/migrations/202605120003_workspace_rpc_read_repair.sql`

## Supabase

The SQL migration creates/replaces:

- `public.create_request_with_number`
- `public.confirm_request_order`
- `public.list_workspace_requests`
- `public.list_workspace_orders`

The first two keep request/order writes real.
The last two fix customer/staff workspace reads across normal windows, incognito windows, and refreshed sessions.

## Important

Running the SQL alone is NOT enough.
You must also replace `src/App.jsx` and `src/styles.css`, then push/deploy the frontend.

## Local validation

This package was checked with:

```bash
npm test -- --run
npm run build
```

Both passed.

## Recommended deploy steps

```bash
npm test -- --run
npm run build
git add src/App.jsx src/styles.css supabase/migrations/202605120003_workspace_rpc_read_repair.sql
git commit -m "Fix workspace reads and order persistence"
git push
```

Then confirm Vercel finishes deployment.

## Retest order

1. Normal browser customer login: open Requests.
2. Incognito same customer login: Requests should show the same saved requests.
3. Incognito staff login: Queue should show customer requests.
4. Staff clicks Active request with no selection: no blank screen.
5. New request → AI draft → staff price → customer confirm → Supabase orders table should get a row.
