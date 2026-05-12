# Easy Harness combined fix: v7 persistence + v8 Agent behavior

This package is the safe combined version.

It keeps the v7 Supabase source-of-truth persistence fixes and adds the v8 Agent Draft Gate behavior changes.

Replace only these files in your project:

- src/App.jsx
- supabase/functions/run-checking/index.ts

The SQL file is included for reference/recovery:

- supabase/migrations/202605120006_real_workspace_source_of_truth_v7.sql

If you already ran the v7 SQL migration successfully, you usually do not need to run it again. If you are unsure, running it again is safe because the migration uses CREATE OR REPLACE FUNCTION / DROP FUNCTION IF EXISTS patterns.

Required deploy steps:

1. Replace src/App.jsx with the one in this package.
2. Replace supabase/functions/run-checking/index.ts with the one in this package.
3. Run npm install if dependencies are not installed.
4. Run npm run build.
5. Deploy frontend.
6. Deploy Supabase Edge Function: supabase functions deploy run-checking
7. Retest request refresh / cross-browser / staff queue / order persistence.

Local checks run by assistant:

- npm run build: PASS
- npm test: PASS
