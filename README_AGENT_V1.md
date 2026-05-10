# Easy Harness AI Intake Agent V1

## What this patch adds

- Supabase Edge Function `run-checking` now runs the Easy Harness intake agent on DeepSeek.
- The agent reads the saved request, request thread and attachment metadata. Image files are accepted and recorded for staff review, but this DeepSeek V1 call does not send image pixels to the model.
- The agent writes a structured order draft to `requests.check_result`.
- The agent updates request status:
  - `needs_info`: customer must answer more questions.
  - `in_review`: enough information for Easy Harness staff review.
  - `not_supported`: not a harness / connector assembly request.
- The agent adds a customer-facing Easy Harness message to the request thread.
- The frontend automatically calls `run-checking` after initial submission and after customer follow-up messages while the request is still in intake.

## Files changed

- `supabase/functions/run-checking/index.ts`
- `src/App.jsx`
- `src/styles.css`
- `.env.example`

## Required Supabase secrets

Set these in Supabase Edge Function secrets:

```bash
supabase secrets set DEEPSEEK_API_KEY="YOUR_DEEPSEEK_API_KEY"
supabase secrets set DEEPSEEK_MODEL="deepseek-v4-pro"
supabase secrets set DEEPSEEK_REASONING_EFFORT="max"
supabase secrets set DEEPSEEK_MAX_TOKENS="12000"
```

`DEEPSEEK_MODEL`, `DEEPSEEK_REASONING_EFFORT`, and `DEEPSEEK_MAX_TOKENS` are optional. If not set, the function uses `deepseek-v4-pro`, thinking mode with max reasoning effort, and `12000` max output tokens. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are default Supabase Edge Function secrets and do not need to be added manually in the Dashboard.

## Deploy

```bash
supabase functions deploy run-checking
```

This DeepSeek patch only changes the Edge Function and env/docs. If the frontend is already on Agent V1, no Vercel redeploy is required.

## Test flow

1. Log in as a customer.
2. Submit a request with text and at least one attachment.
3. Wait for the thread to refresh.
4. Confirm Easy Harness adds an intake message.
5. If the request asks questions, reply in the thread.
6. Confirm the intake draft updates again.
7. Log in as staff and open the same request.
8. Review the `Intake draft` card and then manually continue quotation.
