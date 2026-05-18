# File Manifest

This manifest lists the files a new AI should understand before making changes.

## Root Files

| Path | Purpose | Can Modify? | Notes |
| --- | --- | --- | --- |
| `README.md` | Short current project entry point. | Yes, carefully | Keep aligned with current baseline. |
| `PROJECT_HANDOFF.md` | Active human/AI handoff. | Yes, when baseline changes | More authoritative than archived notes. |
| `package.json` | Scripts and dependencies. | Yes, only when dependency/script changes are needed | Use `npm.cmd` scripts on Windows. |
| `package-lock.json` | Locked dependency tree. | Yes, only through install/update commands | Do not hand-edit. |
| `.env.example` | Non-secret environment template. | Yes | Add env names here, never real values. |
| `.env.local` | Local secrets. | No for handoff | Do not read/copy into docs or prompts. |
| `NEW_AI_PROMPT.md` | Older prompt/handoff helper. | Maybe | Check against current docs before relying on it. |

## Source

| Path | Purpose | Can Modify? | Notes |
| --- | --- | --- | --- |
| `src/App.jsx` | Main app, customer/staff/admin flows, Supabase data adapter, request/order UX, AI/draft rendering, marketplace path. | Yes, carefully | Large file. Search before editing. Preserve request/order separation and role boundaries. |
| `src/styles.css` | Main styling for app, auth, lists, chat, order, previews, marketplace, responsive layout. | Yes | Verify visually after meaningful UI changes. |
| `src/supabaseClient.js` | Supabase browser client and Auth redirect URL helper. | Yes, carefully | Public env only. Do not put service role keys here. |

## Supabase

| Path | Purpose | Can Modify? | Notes |
| --- | --- | --- | --- |
| `supabase/migrations/202605080001_stage_2a_schema.sql` | Base tables, profile trigger, core schema. | Avoid modifying after applied | Add new migrations instead of rewriting applied history. |
| `supabase/migrations/202605080002_stage_2a_rls.sql` | RLS policies. | Avoid modifying after applied | Add repair migrations if needed. |
| `supabase/migrations/202605080003_stage_2a_security_hardening.sql` | Security hardening. | Avoid modifying after applied | Check before rerun. |
| `supabase/migrations/202605100001_stage_2a_rls_function_grants.sql` | Grants for RPC/function usage. | Avoid modifying after applied | Required for front-end RPC access. |
| `supabase/migrations/202605100002_complete_request_check_rpc.sql` | Request checking/Draft RPC behavior. | Avoid modifying after applied | Add migration for changes. |
| `supabase/migrations/202605100003_confirm_request_order_rpc.sql` | Request confirmation -> order RPC. | Avoid modifying after applied | Central request/order boundary. |
| `supabase/migrations/202605100004_order_payment_rpc.sql` | Payment record RPC. | Avoid modifying after applied | Extended later by marketplace migration. |
| `supabase/migrations/202605100005_notifications_audit_rpc.sql` | Notifications/audit RPCs. | Avoid modifying after applied | Useful for email notification line. |
| `supabase/migrations/202605100006_storage_upload_policies.sql` | Storage upload policies. | Avoid modifying after applied | Tied to private attachment upload. |
| `supabase/migrations/202605120001_harden_confirm_request_order.sql` | Order confirmation hardening. | Avoid modifying after applied | History of fixes. |
| `supabase/migrations/202605120002_real_request_order_persistence.sql` | Real persistence repair. | Avoid modifying after applied | History of localStorage -> DB move. |
| `supabase/migrations/202605120003_workspace_rpc_read_repair.sql` | Workspace read repair. | Avoid modifying after applied | Keep for staging reproducibility. |
| `supabase/migrations/202605120004_fix_workspace_rpc_ambiguous_status_v5.sql` | RPC status ambiguity fix. | Avoid modifying after applied | Repair migration. |
| `supabase/migrations/202605120005_profile_scoped_workspace_fix_v6.sql` | Profile-scoped workspace fix. | Avoid modifying after applied | Repair migration. |
| `supabase/migrations/202605120006_real_workspace_source_of_truth_v7.sql` | Workspace source-of-truth repair. | Avoid modifying after applied | Important current behavior. |
| `supabase/migrations/202605140001_workspace_attachment_storage_paths.sql` | RPC returns storage paths for reload-stable previews. | Avoid modifying after applied | Needed for signed preview after reload. |
| `supabase/migrations/202605140002_marketplace_protected_payment.sql` | Adds marketplace payment provider contract/RPC support. | Avoid modifying after applied | Latest known important SQL. User reportedly ran this in Supabase SQL Editor. |
| `supabase/functions/run-checking/index.ts` | AI intake Edge Function. | Yes | Must deploy separately with Supabase CLI after edits. Vercel deploy does not update this. |
| `supabase/functions/*` | Placeholder/contract functions for payment, DHL, tracking, notification, signed upload. | Yes | Most return integration-not-configured until real credentials exist. |

## Docs

| Path | Purpose | Can Modify? | Notes |
| --- | --- | --- | --- |
| `docs/current/CURRENT_PLATFORM_BASELINE.md` | Current authoritative product/engineering baseline. | Yes | Update after meaningful baseline changes. |
| `docs/ai-agent/AI_AGENT_PRINCIPLES.md` | AI Agent behavior contract. | Yes, carefully | Do not weaken anti-questionnaire and evidence-boundary rules. |
| `docs/setup/AI_PROVIDER_QWEN_SETUP.md` | Qwen secrets/deploy setup. | Yes | Keep provider config current. |
| `docs/setup/AUTH_EMAIL_AND_GOOGLE_SETUP.md` | Supabase Auth email/Google setup. | Yes | Includes email template copy; no secrets. |
| `docs/setup/LAUNCH_READINESS_CHECKLIST.md` | Production/staging launch verification checklist, Supabase SQL checks, and manual protected payment/logistics SOP. | Yes | Keep aligned with current deploy and operations path. |
| `docs/setup/MARKETPLACE_PROTECTED_PAYMENT.md` | Marketplace protected payment path. | Yes | Keep aligned with order UI/staff ops flow. |
| `docs/setup/STAGE_2A_BACKEND_READINESS.md` | Backend/resource readiness. | Yes | Good planning reference. |
| `docs/archive/` | Historical notes/patches. | Usually no | Useful history, not current truth. |

## Tests And Logs

| Path | Purpose | Can Modify? | Notes |
| --- | --- | --- | --- |
| `scripts/smoke-test.mjs` | Structural smoke tests for product contracts. | Yes | Update whenever core flow behavior changes. |
| `test-fixtures/ai-attachment-intake-v1/` | Uploadable AI attachment intake regression pack with PNG, PDF, CSV, XLSX, STEP, DXF, and STL examples plus verification SQL. | Yes | Use for live run-checking verification after Edge Function deploy. |
| `vite-policy-check.log` | Previous run log. | No need | Can ignore unless debugging. |
| `vite-policy-check.err.log` | Previous error log. | No need | Can ignore unless debugging. |

## Generated / Do Not Touch Casually

| Path | Purpose | Can Modify? | Notes |
| --- | --- | --- | --- |
| `node_modules/` | Installed dependencies. | No manual edits | Do not copy into handoff. |
| `dist/` | Build output. | No manual edits | Regenerate with build. |
| `.git/` | Git metadata. | No manual edits | Git command was not available in this shell at handoff time. |
| `audit-snapshots/` | Previous verification artifacts. | Usually no | Inspect only if needed. |
