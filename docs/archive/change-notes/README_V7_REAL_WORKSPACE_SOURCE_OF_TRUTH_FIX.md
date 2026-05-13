# Easy Harness v7 — real workspace source-of-truth fix

## Root cause

The request/order rows were not reliably disappearing because Supabase could not store them at all. The create path was inserting a request and then merging the returned row into React state, so the current browser could briefly look correct.

The reload path was broken:

- `src/App.jsx` called `normalizeWorkspaceRequestRow` and `normalizeWorkspaceOrderRow` inside `loadSupabaseRequestData` / `loadSupabaseOrderData`.
- Those functions were not defined anywhere in the file.
- After a refresh, route change, staff view open, or different browser login, the app had to read from Supabase. That read path threw before `setRequests` / `setOrders`, so the UI fell back to an empty list.

There was also an architectural problem introduced by the profile-scoped v6 RPCs:

- `list_workspace_requests_for_profile(p_profile_id)` and related functions trusted a caller-supplied profile id.
- That can hide the real auth/session mismatch in one browser and is not a real platform boundary.
- v7 returns to Supabase `auth.uid()` as the server-side source of truth and keeps the profile-scoped names only as compatibility wrappers that reject mismatched ids.

`profiles.verified` is not used for request/order visibility.

## Changed files

- `src/App.jsx`
- `supabase/migrations/202605120006_real_workspace_source_of_truth_v7.sql`

## What changed

Frontend:

- Added missing workspace row normalizers for request/order RPC rows.
- Request/order RPC reads now use canonical `list_workspace_requests()` and `list_workspace_orders()`.
- Request creation now uses canonical `create_request_with_number()` and lets the database bind `customer_id` to `auth.uid()`.
- Order confirmation now uses canonical `confirm_request_order()` and lets the database bind the customer to `auth.uid()`.
- Supabase workspace reload effects now wait for Supabase session restoration before reading. This prevents stale `easy-harness.currentUserId` localStorage from racing ahead of the real auth session.
- Request submission is blocked until a real Supabase auth session is active for the same profile id.

Database:

- Added v7 migration with auth-bound canonical RPCs.
- Added compatibility wrappers for v6 RPC names, but the wrappers reject `p_profile_id` / `p_customer_id` values that do not match `auth.uid()`.
- Active `staff` / `admin` profiles can read the full workspace.
- Logged-in customers can read their own requests/orders regardless of `profiles.verified`.

## Deploy

1. Apply the SQL migration in Supabase SQL Editor:
   - `supabase/migrations/202605120006_real_workspace_source_of_truth_v7.sql`
2. Deploy the updated frontend:
   - `src/App.jsx`
3. Clear any old browser tab state by signing out and signing in again once after deployment.

## Local checks run

- `npm run build`
- `npm test`

Both passed in the patched workspace.

## Retest

A. Same browser refresh
1. Log in as a customer.
2. Create a request.
3. Confirm it appears in the request thread.
4. Refresh.
5. Open Requests.
6. The same request should still appear.

B. Cross-browser same account
1. Create a request in Chrome as the customer.
2. Log in to the same customer account in Edge/incognito.
3. Open Requests.
4. The same request should appear.

C. Staff visibility
1. Create a request as customer.
2. Log in as a profile with `role='staff'` and `status='active'`.
3. Open staff queue/detail.
4. The customer request should appear.

D. Order persistence
1. Staff releases a price/quote.
2. Customer confirms.
3. Confirm a real row exists in `public.orders`.
4. Refresh as customer and open Orders.
5. The order should remain visible.
6. Staff order queue should also show it.
