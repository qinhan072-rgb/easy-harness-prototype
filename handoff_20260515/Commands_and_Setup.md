# Commands And Setup

## Working Directory

```text
D:\Harness\easy-harness-prototype
```

## Install

```bash
npm.cmd install
```

Use `npm.cmd` in PowerShell. Plain `npm` can be blocked by local execution
policy.

## Run Local Development

```bash
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5173
```

The hosted staging URL is usually better for Auth/OAuth testing:

```text
https://easy-harness-prototype.vercel.app
```

## Build

```bash
npm.cmd run build
```

## Test

```bash
npm.cmd run test
```

This runs `scripts/smoke-test.mjs`.

## Preview Build

```bash
npm.cmd run preview
```

## Git Note

At handoff time, `.git` exists but the local shell could not run `git`:

```text
git: The term 'git' is not recognized
```

The new environment should check whether Git is installed or use the user's
existing GitHub/Vercel workflow.

## Vercel

GitHub/Vercel redeploy updates the frontend only.

Important public frontend environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_APP_BASE_URL
```

`VITE_APP_BASE_URL` should match the deployed frontend URL for Auth redirects.

## Supabase

Public browser values:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Server/Edge Function secrets:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
APP_BASE_URL
EASY_HARNESS_INTEGRATION_MODE
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.

## Supabase Migrations

For a fresh Supabase database, apply migrations in chronological order:

```text
202605080001_stage_2a_schema.sql
202605080002_stage_2a_rls.sql
202605080003_stage_2a_security_hardening.sql
202605100001_stage_2a_rls_function_grants.sql
202605100002_complete_request_check_rpc.sql
202605100003_confirm_request_order_rpc.sql
202605100004_order_payment_rpc.sql
202605100005_notifications_audit_rpc.sql
202605100006_storage_upload_policies.sql
202605120001_harden_confirm_request_order.sql
202605120002_real_request_order_persistence.sql
202605120003_workspace_rpc_read_repair.sql
202605120004_fix_workspace_rpc_ambiguous_status_v5.sql
202605120005_profile_scoped_workspace_fix_v6.sql
202605120006_real_workspace_source_of_truth_v7.sql
202605140001_workspace_attachment_storage_paths.sql
202605140002_marketplace_protected_payment.sql
```

For the existing staging project, do not blindly rerun all SQL. Check what has
already been applied. The user reported that `202605140002_marketplace_protected_payment.sql`
was applied manually in Supabase SQL Editor.

Deleting saved queries in Supabase SQL Editor does not delete database tables or
functions. It only removes editor drafts/history.

## Supabase Storage

Current bucket:

```text
request-attachments
```

The app uses private storage paths and signed URLs for previews.

## Supabase Edge Function: AI Intake

Function:

```text
supabase/functions/run-checking/index.ts
```

Deploy after changing it:

```bash
supabase functions deploy run-checking
```

Vercel deployment does not update this Edge Function.

## AI Provider Secrets

Recommended:

```text
AI_DRAFT_PROVIDER=qwen
QWEN_API_KEY
QWEN_MODEL
QWEN_BASE_URL
QWEN_MAX_TOKENS
```

Optional fallback:

```text
DEEPSEEK_API_KEY
DEEPSEEK_MODEL
DEEPSEEK_BASE_URL
DEEPSEEK_REASONING_EFFORT
DEEPSEEK_MAX_TOKENS
```

Do not put AI keys in frontend env vars.

## Payment Provider Env Names

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
PAYPAL_WEBHOOK_ID
```

Current payment UI is modeled. Live hosted payment sessions/webhooks are not yet
implemented.

## DHL / Logistics Env Names

```text
DHL_API_KEY
DHL_API_SECRET
DHL_ACCOUNT_NUMBER
DHL_SHIPPER_ACCOUNT
DEFAULT_ORIGIN_COUNTRY
DEFAULT_ORIGIN_CITY
DEFAULT_INCOTERM
DEFAULT_CURRENCY
```

Current shipping UI is modeled. Live DHL rates, shipment, labels, invoices, and
tracking sync are not yet implemented.

## Notifications Env Names

```text
EMAIL_FROM
EMAIL_PROVIDER_API_KEY
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
```

In-app notifications exist. Email/WhatsApp provider delivery is not live yet.

## Auth Setup

Read:

```text
docs/setup/AUTH_EMAIL_AND_GOOGLE_SETUP.md
```

Production still needs:

- custom SMTP sender/domain
- final Site URL and Redirect URLs
- Google OAuth domain/client configuration
- staff/admin invite process

## Common Gotchas

- If Google login works on Vercel but not localhost, check Google OAuth origins
  and Supabase redirect URLs.
- If frontend changes appear live but AI behavior does not change, deploy the
  Supabase Edge Function.
- If requests/orders appear only locally, check Vercel env vars and Supabase
  RLS/RPC errors.
- If attachment previews work before reload but disappear after reload, check
  migration `202605140001_workspace_attachment_storage_paths.sql` and signed URL
  generation.
- If marketplace payment state does not persist, check migration
  `202605140002_marketplace_protected_payment.sql`.

