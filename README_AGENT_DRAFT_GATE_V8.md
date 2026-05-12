# Easy Harness Agent Draft Gate v8

This patch updates the Easy Harness intake agent behavior without adding pricing, BOM, supplier RFQ, connector libraries, terminal libraries, or factory production forms.

## Changed files

- `supabase/functions/run-checking/index.ts`
- `src/App.jsx`

## What changed

- Rewrites the Edge Function system prompt around Easy Harness Draft closure, not production readiness.
- Adds a fifth unknown bucket: `not_applicable`.
- Prevents vague `unknown_item` / `Needs later confirmation` placeholders from becoming user-facing review items.
- Adds deterministic post-processing for facts that the model sometimes states in summaries but fails to place into `known_requirements`: quantity, length, voltage, current, power, signal-only/no-power, CAN signal, environment/IP, connector endpoints, and simple pin assignments.
- Prevents signal-only/no-power requests from being blocked for voltage/current.
- Keeps power-carrying requests blocked only for the high-value safety question: approximate current/power when needed.
- Changes ready output to an Easy Harness Draft milestone, not a generic saved state.
- Avoids “manual review” language.
- Updates UI filtering so placeholder unknowns are not shown in the right-side Current status or Draft card.

## Deploy

1. Copy `supabase/functions/run-checking/index.ts` into your project.
2. Copy `src/App.jsx` into your project, or apply `easy-harness-agent-draft-gate-v8.patch` if you use Git.
3. Run `npm install` if your local node_modules has Rollup optional-dependency issues.
4. Run `npm run build`.
5. Deploy the Supabase Edge Function:
   `supabase functions deploy run-checking`
6. Deploy the frontend normally.

No SQL migration is required for this patch. The new `not_applicable` JSON field lives inside `requests.check_result` only.

## Verification run in this environment

- `npm run build`: passed.
- `npm test`: mostly passed, but one existing smoke test failed because the uploaded codebase still checks for `confirm_request_order` while this older branch contains `confirm_request_order_for_profile`. That failure is unrelated to this agent patch and existed in the uploaded branch's persistence wiring.
- TypeScript check for the Edge Function was run with `tsc`; only expected Deno/remote-import environment errors remained.
