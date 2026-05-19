# Easy Harness Repository Boundary

This repository should contain the platform source, deployment configuration, Supabase schema/functions, scripts, and current product docs.

Local handoff packs, manual upload fixtures, browser audit snapshots, and old prompt notes live outside this repository at:

```text
D:\Harness\easy-harness-project-materials
```

## Keep In Git

- `src/`
- `supabase/functions/`
- `supabase/migrations/`
- `scripts/`
- `docs/`
- `package.json`
- `package-lock.json`
- `.env.example`
- `PROJECT_HANDOFF.md`
- `README.md`

## Keep Outside This Repo

- `D:\Harness\easy-harness-project-materials\test-fixtures\`
- `D:\Harness\easy-harness-project-materials\handoff_20260515\`
- `D:\Harness\easy-harness-project-materials\audit-snapshots\`
- `D:\Harness\easy-harness-project-materials\NEW_AI_PROMPT.md`
- `D:\Harness\easy-harness-project-materials\test-plans\`
- local run logs and one-off exported SQL/CSV/debug files

## Do Not Push

- `node_modules/`
- `dist/`
- `.env`, `.env.local`, `.env.*.local`
- `supabase/.temp/`
- `audit-snapshots/`
- `test-fixtures/`
- `handoff_20260515/`
- `NEW_AI_PROMPT.md`
- `*.log`, `*.pid`, temporary local run outputs

## Manual AI Attachment Test Pack

Use this local companion folder when validating uploaded file understanding:

```text
D:\Harness\easy-harness-project-materials\test-fixtures\ai-attachment-intake-v1
```

The focused SQL for checking AI attachment evidence lives at:

```text
D:\Harness\easy-harness-project-materials\test-fixtures\ai-attachment-intake-v1\sql\ai_attachment_results_latest_requests.sql
```

Expected source signals include `image_count_sent_to_model`, `qwen_file_extract_count`, and `cad_metadata_count`.

## If Ignored Files Were Already Tracked

`.gitignore` only prevents new untracked files from being added. If GitHub still shows ignored folders in a commit, remove them from Git tracking without deleting local files:

```powershell
git rm -r --cached node_modules dist audit-snapshots test-fixtures handoff_20260515 supabase/.temp
git rm --cached NEW_AI_PROMPT.md vite-policy-check.log vite-policy-check.err.log
git status --short
```

Do not run those commands until Git is available in the shell and the pending file list has been checked.
