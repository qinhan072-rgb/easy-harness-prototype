# Easy Harness v4 — Workspace Visibility Repair

This patch replaces v3 frontend files. The database migration from v3 is still valid; no new SQL is required if `202605120003_workspace_rpc_read_repair.sql` has already been run.

## Problems fixed

1. A customer creates a request, then switches pages and the request list appears empty.
2. The same customer account logs in from another session/device/incognito and cannot see server-saved requests.
3. Orders could appear briefly and then disappear because the visible order list was filtered by browser-side state instead of trusting the server-scoped workspace result.
4. Staff enters the request workspace but Active request/queue cannot see server-saved requests consistently.

## Actual cause addressed

The v3 backend RPCs already scope workspace rows by Supabase `auth.uid()` and user role. The frontend was still applying an additional browser-side customerId filter and still persisted `activeRequestId` in localStorage. After session restore or incognito login, that local browser identity/state could hide valid rows returned from Supabase.

## What changed

- In Supabase mode, Requests and Orders pages trust the Supabase workspace RPC result instead of re-filtering by local browser user id.
- `activeRequestId` no longer persists in localStorage in Supabase mode.
- The local/demo auth-session repair effect is disabled in Supabase mode so it cannot synthesize a local session over a real Supabase session.
- Supabase read errors no longer clear already loaded request/order state.
- Customer `openRequest` authorization in Supabase mode checks the already server-scoped request list instead of comparing local ids again.

## Files

Replace:

- `src/App.jsx`
- `src/styles.css` (included unchanged from v3 so the package can be applied cleanly)

No new SQL is required if v3 SQL was already run.

## Validation

Passed:

```bash
npm test -- --run
npm run build
```

## Retest

1. Customer creates request, waits until thread opens, clicks Requests. The request must remain visible.
2. Same customer in incognito or another browser session logs in. Requests must show server-saved requests.
3. Staff logs in. Queue must show customer requests.
4. Staff opens Active request. It must not be blank and must show a real request if queue has requests.
5. Staff releases price, customer confirms. `public.orders` must get a real row and Orders page must continue showing it after page switch/refresh.
