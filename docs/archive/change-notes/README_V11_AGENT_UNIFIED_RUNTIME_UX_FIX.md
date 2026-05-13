# Easy Harness v11 — Unified Agent Runtime + Notification Read + Order Copy Fix

This patch is based on the already-tested v7 persistence + v8 Agent + v9 UX cleanup baseline.

## What this fixes

### 1. Agent runtime failure must not stop the user flow
The customer should never see `AI check failed`, `please resend`, `saved`, or any message that suggests the platform stopped because the model call failed.

The Edge Function still calls the primary DeepSeek Draft Agent first. If that primary run fails due to timeout, provider error, JSON parse error, or another runtime exception, the function now generates a safe local Easy Harness Draft path from the already-submitted request text, message history, and attachment metadata.

For clear requests such as a CAN signal-only M12 harness, the fallback creates a normal Draft-ready result and inserts a Draft Summary block. It does not ask the user to resend.

### 2. Only real missing user information can trigger `Need your reply`
Runtime failure is not treated as missing customer detail.

`Need your reply` is now reserved for cases where the platform can identify a real user-side blocking question, such as:
- no connection goal at all;
- a power-carrying harness with no current/power basis;
- missing quantity/length when there is no old sample or measurement basis.

### 3. Signal-only / no-power requests do not ask for voltage/current
The fallback builder also preserves this rule. If the request says signal only / no power / data only, voltage/current for load is marked not applicable.

### 4. In-app notification unread badge no longer reappears after opening
Opening the Updates panel now stores read notification ids locally and also updates Supabase `notifications.read_at` where possible. Reloaded notifications preserve read state.

### 5. `Before payment` section is clarified
The order page section is renamed to `Payment confirmation`, and the first item now states `What payment confirms` so the section has a clear purpose while keeping the existing clickable payment/logistics flow.

## Changed files

- `supabase/functions/run-checking/index.ts`
- `src/App.jsx`
- `scripts/smoke-test.mjs`

## Deploy

1. Replace the changed files in your project.
2. Run:

```bash
npm run build
npm test
```

3. Deploy the frontend.
4. Deploy the Supabase Edge Function:

```bash
supabase functions deploy run-checking
```

No SQL migration is required.

## Retest

### Agent CAN signal-only request
Submit:

```text
I need a 1.0m CAN signal harness for outdoor field equipment, 5 pcs.
End A should be an M12 A-coded 5-pin male connector for the controller side.
End B should be an M12 A-coded 5-pin female connector for the sensor side.
This cable is signal only and carries no power.
Pin 2 = CAN-H, Pin 4 = CAN-L, Pin 5 = shield/drain.
Pins 1 and 3 are unused.
IP67 is preferred if practical. Connector brand can be selected by Easy Harness if an equivalent waterproof M12 connector is suitable.
```

Expected:
- Draft ready / Easy Harness review.
- No voltage/current question.
- No `could not finish this check`.
- No `please resend`.
- No `Need your reply` caused by runtime failure.

### Notification badge
1. Open Updates.
2. Badge count should clear.
3. Reload or wait for workspace reload.
4. Badge should not reappear for the same already-read notifications.

### Order copy
The order page should show `Payment confirmation`, not `Before payment`.
