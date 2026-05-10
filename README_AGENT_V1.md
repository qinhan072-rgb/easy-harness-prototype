# Easy Harness AI Intake Agent V1

## What this patch adds

- Supabase Edge Function `run-checking` now runs the Easy Harness intake agent.
- The agent reads the saved request, request thread, attachment metadata, and up to 6 uploaded images.
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
supabase secrets set SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
supabase secrets set OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
supabase secrets set OPENAI_MODEL="gpt-4.1-mini"
```

`OPENAI_MODEL` is optional. If not set, the function uses `gpt-4.1-mini`.

## Deploy

```bash
supabase functions deploy run-checking
```

Then commit and push the frontend changes to trigger Vercel deployment.

## Test flow

1. Log in as a customer.
2. Submit a request with text and at least one attachment.
3. Wait for the thread to refresh.
4. Confirm Easy Harness adds an intake message.
5. If the request asks questions, reply in the thread.
6. Confirm the intake draft updates again.
7. Log in as staff and open the same request.
8. Review the `Intake draft` card and then manually continue quotation.
