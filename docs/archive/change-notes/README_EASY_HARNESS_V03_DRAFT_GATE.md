# Easy Harness v0.3 Draft Gate + Agent Memory Fix

This patch corrects the v0.2 behavior exposed by manual testing:

- Removes customer-visible manual/staff fallback wording.
- Keeps a single user-facing module type: Easy Harness Draft. No outline card.
- Raises the Draft readiness gate so a draft is only generated when the user-side request is a usable demand package.
- Keeps professional manufacturing details optional unless the user provides them.
- Ensures basic order-level information is not dumped into Easy Harness review too early.
- Keeps all prompt changes generalized, not case-specific.
- Keeps previous_check_result and full thread conversation in the model input so follow-up messages are interpreted in context.
- Improves the draft card into a table-like structure with a simple connection diagram.

Files included:

- src/App.jsx
- src/styles.css
- supabase/functions/run-checking/index.ts

Validation performed:

- npm ci --ignore-scripts
- npm run build
- npm test -- --run
- esbuild parse/bundle check for supabase/functions/run-checking/index.ts

Still not included:

- automatic quotation
- supplier RFQ output
- material confirmation
- connector/terminal library
- production BOM
- database schema change
- 3D generation
