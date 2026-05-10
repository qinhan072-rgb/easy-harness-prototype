# Easy Harness Agent Behavior V2 Patch

This patch moves the platform from "agent link is working" to "agent behavior is product-aware".

## Files

- `src/App.jsx`
- `src/styles.css`
- `supabase/functions/run-checking/index.ts`

## What changed

1. Adds a visible agent working state:
   - First submission: `Easy Harness is analyzing your request…`
   - Customer follow-up: `Easy Harness is thinking through your update…`

2. Adds a relevance gate to the DeepSeek intake agent:
   - Irrelevant submissions are not treated as drafts.
   - Submissions without enough harness-specific context ask for core harness information first.
   - Only real connection goals can produce an initial draft.

3. Improves customer-facing message templates:
   - No more blanket `prepared a first harness draft` for unclear submissions.
   - Draft wording only appears when a draft can actually be prepared.

4. Improves side panel labeling:
   - `Waiting for harness details` when no draft is ready.
   - `Intake draft` when a draft is being formed.
   - `Ready for review` when enough information is available.

## Apply

Copy these files into the project, then run:

```bash
npm install
npm run build
npm run test
git add src/App.jsx src/styles.css supabase/functions/run-checking/index.ts
git commit -m "Add agent behavior relevance gate and thinking state"
git push
```

If you update `supabase/functions/run-checking/index.ts`, also deploy the function in Supabase Dashboard or CLI.
