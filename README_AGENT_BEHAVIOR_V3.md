# Easy Harness Agent Behavior V3

## What changed

- Clears the new-request and thread composer immediately after submit, instead of waiting for the high-reasoning Agent response.
- Replaces new local message timestamps with real timestamp values and formats message times to the minute.
- Keeps the Agent thinking card as a temporary front-end loading state only.
- Tightens the DeepSeek relevance gate:
  - vague text + generic commercial/device image is not enough to prepare a draft;
  - when there is no connection goal, the Agent asks for harness-specific context instead of saying a draft is prepared;
  - customer-facing Agent questions must stay in English;
  - when no draft can be prepared, the Agent asks at most three basic intake questions.

## Files

- src/App.jsx
- src/styles.css
- supabase/functions/run-checking/index.ts

## Required deploy steps

1. Replace the files in the project.
2. Run `npm run build` and `npm run test`.
3. Commit and push front-end changes to GitHub/Vercel.
4. Also update Supabase Edge Function `run-checking/index.ts` in the Supabase Dashboard and click Deploy updates.
