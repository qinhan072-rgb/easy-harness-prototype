# Easy Harness Draft v0.1 Patch

This patch implements the first formal Easy Harness Draft v0.1 baseline.

## Changed files

- `supabase/functions/run-checking/index.ts`
- `src/App.jsx`
- `src/styles.css`

## What changed

- DeepSeek agent now outputs `schema_version: easy_harness_draft_v0_1`.
- Draft status now maps to:
  - `not_harness_related`
  - `needs_harness_context`
  - `needs_key_clarification`
  - `ready_for_easy_harness_review`
  - `closed_for_easy_harness_review`
- Unknowns are separated into:
  - `ask_user_now`
  - `ask_user_if_likely_known`
  - `easy_harness_review`
  - `later_supplier_or_engineering_confirmation`
- User-facing messages are shorter and driven by structure, not repeated “I understand” language.
- Frontend request summary reads the new Draft v0.1 object.
- Full request details are folded into a details area.

## Not included

- No auto quote
- No material confirmation
- No supplier RFQ output
- No database migration
- No connector / terminal library
- No 3D diagram
- No factory production form

## Manual steps

1. Replace files in your project.
2. Run:

```bash
npm run build
npm run test
```

3. Commit and push frontend changes.
4. In Supabase Dashboard, replace `run-checking/index.ts` and deploy updates.

