# New AI Conversation Prompt

Copy the prompt below into a new AI/Codex conversation for this project.

---

You are taking over the Easy Harness platform.

Work in:

```text
D:\Harness\easy-harness-prototype
```

Before changing anything, read these files:

```text
README.md
PROJECT_HANDOFF.md
docs/current/CURRENT_PLATFORM_BASELINE.md
docs/ai-agent/AI_AGENT_PRINCIPLES.md
docs/setup/STAGE_2A_BACKEND_READINESS.md
docs/setup/AUTH_EMAIL_AND_GOOGLE_SETUP.md
package.json
src/App.jsx
src/supabaseClient.js
src/styles.css
scripts/smoke-test.mjs
```

Then verify the project:

```bash
npm.cmd run build
npm.cmd run test
```

Hosted staging app:

```text
https://easy-harness-prototype.vercel.app
```

Local development:

```bash
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5173
```

Important context:

- This is not a static screenshot prototype anymore.
- Treat it as an early real platform: Vercel frontend, Supabase Auth,
  PostgreSQL, Storage, and Edge Function paths are already present.
- The current authoritative baseline is
  `docs/current/CURRENT_PLATFORM_BASELINE.md`.
- The current AI Agent behavior baseline is
  `docs/ai-agent/AI_AGENT_PRINCIPLES.md`.
- Archived README files under `docs/archive/change-notes/` are history, not the
  current source of truth.
- Preserve role separation:
  - customer = customer workspace
  - staff = ops console
  - admin = admin console
- Customer, staff, and admin should not share a visible shortcut between roles.
- Visitors should land in the customer workspace before login.
- Login or customer account creation is required when saving/submitting private
  work.
- Public registration creates customer accounts only.
- Staff/admin accounts must be invited or created by admin.
- User-facing text must be written for real customers.
- Do not expose words such as prototype, mock, Auth provider, human review,
  manual review, or implementation fallback in customer-facing UI.
- The visible system identity in customer conversations is always Easy Harness.
- Requests are for communication, uploaded material, AI intake, draft, price
  release, and customer confirmation.
- Orders are for checkout, payment, production, shipping, tracking, and
  after-sales contact.
- Do not collapse request and order into one concept.
- The AI Agent's current job is Easy Harness Draft closure, not final BOM,
  supplier RFQ, automatic quote, or production package generation.
- Ask customers only for the 1-3 details that truly block Draft closure.
- Do not force customers into a long industrial questionnaire.
- Payment, DHL logistics, email/WhatsApp delivery, and the deeper AI file
  parsing/engineering pipeline are not live yet.

Before proposing changes:

1. Run build and smoke test.
2. Review the current Supabase/Vercel/Auth/AI state from code and docs.
3. If changing a core flow, update tests and current docs.
4. Keep edits scoped and preserve product decisions unless explicitly changed.
