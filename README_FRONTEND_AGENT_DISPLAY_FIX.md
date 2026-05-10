# Easy Harness frontend Agent display fix

This patch fixes the frontend after DeepSeek Intake Agent V1 is already deployed.

## What changed

- Shows real `easy_harness` messages returned by the Agent immediately after `run-checking` completes.
- Refreshes Supabase request data without switching away from the current request.
- Removes local fake checking replies/draft/event messages from the live customer flow.
- Disables the new-request submit button while submission is running.
- Disables the thread send button while a message + Agent update is running.
- Deduplicates request rows in the sidebar and request list.
- Supports `deepseek-intake-agent-v1` in the Intake draft card.

## Files to replace

- `src/App.jsx`
- `supabase/functions/run-checking/index.ts` (no behavior change required if DeepSeek is already deployed; included to keep local code consistent)

## After replacing files

Run:

```bash
npm install
npm run build
npm run test
git add src/App.jsx supabase/functions/run-checking/index.ts README_FRONTEND_AGENT_DISPLAY_FIX.md
git commit -m "Fix agent message display and duplicate request submit"
git push
```

Vercel will redeploy the frontend after the push.

If the Supabase Edge Function is already DeepSeek version 7 or newer, you do not need to redeploy the function for this frontend fix.
