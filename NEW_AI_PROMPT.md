# New AI Conversation Prompt

Copy the prompt below into a new AI/Codex conversation for this project.

---

You are taking over the Easy Harness platform prototype.

Work in:

```text
D:\Harness\easy-harness-prototype
```

Before changing anything, read these files:

```text
PROJECT_HANDOFF.md
README.md
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

If the local browser URL is needed, start:

```bash
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5173
```

Important context:

- This is not a static screenshot prototype anymore. Treat it as an early local
  platform prototype moving toward real deployment.
- Current data is localStorage, but it is shaped like future backend tables.
- Local adapters mark future service boundaries for auth/session, database,
  checking, storage, payment, shipping/tracking, and multi-channel notifications.
- Backend-shaped local ledgers exist for auth session, request messages, quotes,
  storage objects, payments, shipments, order messages, notification deliveries,
  and service events.
- Stage 2A backend direction is selected: Supabase Auth, Supabase PostgreSQL,
  Supabase Storage private buckets, Supabase Edge Functions, Stripe Checkout,
  PayPal, bank transfer, DHL Express API first, and DAP checkout.
- Supabase Auth is partially wired on the front end: when Vercel/Supabase
  public environment variables are present, email login and customer
  registration use Supabase Auth and load role/status from `public.profiles`.
  The local auth adapter remains an offline fallback.
- Stage 2A backend-readiness files exist in `supabase/migrations`,
  `supabase/functions`, `.env.example`, and
  `docs/STAGE_2A_BACKEND_READINESS.md`. They stop at provider boundaries until
  PayPal/DHL/domain/email/legal/customs resources are available.
- Preserve role separation:
  - customer@example.com = customer app
  - staff@easyharness.com = ops console
  - admin@easyharness.com = admin console
- Customer, staff, and admin should not share a visible shortcut between roles.
  They are separate users.
- Visitors should land in the customer workspace before login. The top-right
  action is Log in / Create account until a session exists. Private request and
  order history must stay hidden until login.
- Public registration creates customer accounts only. Staff and admin accounts
  must be invited or created by admin.
- Submitting a request should require login or registration while preserving the
  visitor's draft.
- Customer registration is personal-user first: email plus optional nickname.
  Do not add company, legal name, country, or phone fields to public signup.
- User-facing text must be written for real customers, not for the project owner
  or developer.
- Do not expose words such as prototype, mock, Auth provider, human review, or
  similar implementation details in customer-facing UI.
- The visible system identity in customer conversations is always Easy Harness.
- Requests are for communication, uploaded material, draft confirmation, and
  price confirmation.
- Orders are for checkout, payment, production, shipping, and tracking.
- Do not collapse request and order into one concept.
- Checkout is personal-user first. Business import details are optional and
  collapsed. Keep final confirmation, address-change, cancellation, payment
  timing, DAP import-tax boundary, and after-sales wording visible before
  payment.
- If checking finds missing details, the customer thread should ask for those
  details clearly in the same conversation.
- Do not optimize only for a pretty screenshot. Make the interaction, state
  changes, and data flow feel like a real platform.

First, perform your own review before proposing changes:

1. Run build and smoke test.
2. Use the customer flow:
   - create a request
   - upload at least one file
   - submit
   - use login or customer registration when prompted
   - pass the checking transition
   - inspect the request thread
3. Use the staff flow:
   - open the new request
   - reply as Easy Harness
   - add an attachment/preview/table if relevant
   - set a price
4. Return to customer:
   - confirm the request
   - open the created order
   - inspect checkout, delivery address, shipping, DAP tax boundary, payment
     route, and after-sales policy
5. Complete the local hosted-payment callback path.
6. Inspect the paid order view:
   - confirmed order
   - payment received
   - production state
   - shipping/tracking
   - delivery information
   - order message thread
7. Use staff order console:
   - update payment state if needed
   - update production status
   - update tracking number/link/events
   - inspect or reply to order messages
8. Use admin:
   - inspect users
   - inspect requests
   - inspect orders
   - inspect audit log
   - inspect service adapter events
   - inspect data model
   - inspect API replacement map and schema blueprint

After this review, summarize:

- what currently works
- what feels fake or confusing
- what would block real deployment
- what you recommend changing next

Only then start implementation unless the user explicitly asks you to implement
immediately.

Implementation rules:

- Keep edits scoped.
- Use existing React/CSS patterns.
- Run `npm.cmd run build` and `npm.cmd run test` after meaningful changes.
- If you add or change core flow behavior, also update `scripts/smoke-test.mjs`
  and documentation.
- Preserve the product decisions in `PROJECT_HANDOFF.md` unless the user
  explicitly changes them.
