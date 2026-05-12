# Easy Harness v6 — Profile-scoped workspace repair

This patch addresses the case where a request is created and visible in the current tab,
but disappears after switching pages, signing out/in, using another browser, or entering staff view.

## Root cause addressed

The previous v5 patch fixed one RPC 400 error path, but the frontend still depended on the
Supabase auth UID boundary when loading workspace data. In the current prototype, the visible
account identity is the `profiles.id` used by the app. If the browser session / auth UID and the
app profile identity drift, the current tab can show an in-memory request, but fresh reads in
another browser or after reload return no workspace rows.

## What changed

Frontend:
- Request creation now calls `create_request_with_number_for_profile` with the current profile id.
- Request list loading now calls `list_workspace_requests_for_profile`.
- Order list loading now calls `list_workspace_orders_for_profile`.
- Confirmation now calls `confirm_request_order_for_profile`.
- Requests / Orders reload from Supabase when entering those views.
- Staff queue/detail/order views reload from Supabase when opened.
- Customer order opening no longer re-filters Supabase-returned orders with local-only logic.

Database:
- Adds profile-scoped RPCs:
  - `create_request_with_number_for_profile`
  - `list_workspace_requests_for_profile`
  - `list_workspace_orders_for_profile`
  - `confirm_request_order_for_profile`

## Files

Replace/add:
- `src/App.jsx`
- `src/styles.css`
- `supabase/migrations/202605120005_profile_scoped_workspace_fix_v6.sql`

## Important

Run the SQL migration in Supabase SQL Editor, then push the frontend files and wait for Vercel deployment.

## Retest

1. Customer creates a request.
2. Click Requests in the same browser: the request must remain visible.
3. Open another browser with the same account: Requests must show the same request.
4. Log in as staff: Queue / Active request must show the customer's request.
5. Then test staff price -> customer confirm -> Orders table and Orders page.
