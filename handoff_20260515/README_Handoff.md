# Easy Harness Handoff Package

Generated: 2026-05-15

This folder is a portable handoff package for a new Codex account/AI taking over
the Easy Harness project. It is written for another coding/product AI, not for a
general customer.

The goal is to recover the working context without relying on old chat history:
what the platform is, what has been built, what product rules must not regress,
which files matter, and what should happen next.

## Recommended Reading Order

1. `Project_Master_Prompt.md` - paste/read this first in the new Codex thread.
2. `Current_State.md` - current product and engineering baseline.
3. `Decisions_Log.md` - important decisions and reasons.
4. `Commands_and_Setup.md` - how to run, verify, deploy, and configure.
5. `File_Manifest.md` - key files and what to be careful with.
6. `Next_Actions.md` - practical next work.

Then read the live project docs:

- `PROJECT_HANDOFF.md`
- `README.md`
- `docs/current/CURRENT_PLATFORM_BASELINE.md`
- `docs/ai-agent/AI_AGENT_PRINCIPLES.md`
- `docs/setup/MARKETPLACE_PROTECTED_PAYMENT.md`
- `docs/setup/AI_PROVIDER_QWEN_SETUP.md`
- `docs/setup/AUTH_EMAIL_AND_GOOGLE_SETUP.md`

## Core Workspace

```text
D:\Harness\easy-harness-prototype
```

Hosted staging app:

```text
https://easy-harness-prototype.vercel.app
```

Local app:

```text
http://127.0.0.1:5173
```

## Sensitive Information

Do not copy secrets into prompts or documents.

This handoff intentionally records only environment variable names and setup
locations. It does not include API keys, Supabase service-role keys, database
passwords, OAuth secrets, Qwen keys, payment keys, or DHL credentials.

Known sensitive locations:

- `.env.local`
- Vercel Environment Variables
- Supabase Edge Function Secrets
- Supabase database credentials
- Google OAuth client secret
- payment/logistics provider dashboards

If any secret was pasted into old chats, rotate it before production.

