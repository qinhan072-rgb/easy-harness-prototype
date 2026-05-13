# Easy Harness

Easy Harness is an early platform for custom wiring harness requests. It is no
longer a static screenshot prototype: the hosted app uses Supabase Auth,
PostgreSQL, Storage, and Edge Function paths for the main request workflow, while
payment, logistics, notifications, and the deeper AI engineering pipeline still
wait on real provider accounts and production resources.

Current source of truth for handoff:

- `docs/current/CURRENT_PLATFORM_BASELINE.md`
- `docs/ai-agent/AI_AGENT_PRINCIPLES.md`
- `PROJECT_HANDOFF.md`

## Run

```bash
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5173
```

Verify:

```bash
npm.cmd run build
npm.cmd run test
```

Use `npm.cmd` in PowerShell. Plain `npm` can be blocked by local execution
policy.

## Current State

- Frontend: React/Vite.
- Hosting: Vercel.
- Auth: Supabase Auth email link and Google OAuth path.
- Database: Supabase PostgreSQL with RLS and workspace RPCs.
- Storage: Supabase Storage bucket `request-attachments`.
- AI intake: Supabase Edge Function `run-checking`, configured around Easy
  Harness Draft closure, with Qwen as the recommended first live provider and
  DeepSeek kept as an optional fallback.
- Payment: Stripe, PayPal, and bank transfer are modeled, but live provider
  calls are not implemented yet.
- Logistics: DHL Express is the first target, but live rate, shipment, label,
  and tracking calls are not implemented yet.
- Notifications: in-app notifications exist; email/WhatsApp provider routing is
  not live yet.

## Docs

The project documentation is organized under `docs/`:

- `docs/current/` - current product and engineering baseline.
- `docs/ai-agent/` - AI Agent principles and draft-stage behavior.
- `docs/setup/` - service setup handoffs such as Auth and backend readiness.
  See `docs/setup/AI_PROVIDER_QWEN_SETUP.md` for Qwen provider secrets.
- `docs/archive/change-notes/` - old iteration notes kept for traceability.
- `docs/archive/patches/` - historical diff and patch files.

Root files are intentionally kept short. If a README in the archive conflicts
with `docs/current/CURRENT_PLATFORM_BASELINE.md`, treat the current baseline as
authoritative.
