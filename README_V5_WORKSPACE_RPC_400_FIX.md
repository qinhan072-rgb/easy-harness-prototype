# Easy Harness v5 — Workspace RPC 400 Fix

This patch is for the current problem shown in Chrome DevTools:

- `list_workspace_requests` returns 400 Bad Request
- `list_workspace_orders` returns 400 Bad Request
- Requests / Orders pages therefore show empty lists even though `public.requests` has records.

## Root cause

The Supabase workspace RPC functions had ambiguous PL/pgSQL column references around fields such as `status`.
Because the functions also return a column named `status`, unqualified references inside the function can be interpreted ambiguously by PostgreSQL.

That makes the RPC fail with HTTP 400, so the frontend cannot load Requests or Orders.

## What this package contains

Replace / add these files:

- `src/App.jsx`
- `src/styles.css`
- `supabase/migrations/202605120004_fix_workspace_rpc_ambiguous_status_v5.sql`

## Supabase SQL

The v5 SQL has already been applied to the connected Supabase project and returned success.

Keep the migration file in GitHub anyway.

If needed, manually run:

`supabase/migrations/202605120004_fix_workspace_rpc_ambiguous_status_v5.sql`

in Supabase SQL Editor.

## Important

The database SQL fix is necessary, but the frontend patch files should still be pushed so the repo matches the current intended state.

## Retest after Vercel deploy

1. Open customer account `zak072`.
2. Click Requests.
   - Network should no longer show `list_workspace_requests` as 400.
   - The request list should show existing requests such as recent HD-2026 requests.

3. Click Orders.
   - Network should no longer show `list_workspace_orders` as 400.
   - If `public.orders` is still empty, the empty state is expected.

4. Open staff account.
   - Queue / Active Request should load from the fixed request RPC.

5. Then test staff quote -> customer confirm.
   - Only after confirm succeeds should `public.orders` get a real row.
