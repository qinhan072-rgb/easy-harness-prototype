# Decisions Log

## 1. Easy Harness Is A Real Platform Prototype, Not A Screenshot

Decision:

The platform should be treated as an early deployable product, not a static UI
demo.

Reason:

The user's goal is to get as close as possible to production before external
provider accounts and APIs are ready.

Related files:

- `README.md`
- `PROJECT_HANDOFF.md`
- `docs/current/CURRENT_PLATFORM_BASELINE.md`

Risk:

If future work optimizes only for screenshots, the app will drift back into a
fake prototype.

## 2. Requests And Orders Stay Separate

Decision:

Requests are for intake, communication, draft, quote, and confirmation. Orders
are for checkout, payment, production, shipping, tracking, and support.

Reason:

Custom trade platforms need a quote/request stage before a committed order.

Related files:

- `src/App.jsx`
- `supabase/migrations/202605100003_confirm_request_order_rpc.sql`
- `docs/current/CURRENT_PLATFORM_BASELINE.md`

Risk:

The same harness job can appear in both Requests and Orders. Recent UX work
de-emphasizes converted requests so Orders become primary after order creation.

## 3. Converted Requests Are Collapsed And De-Emphasized

Decision:

After an order exists, the old request remains accessible but is moved into a
collapsed "converted to orders" area and hidden from primary recent request
focus.

Reason:

Users should not feel the same job has two competing states. The request is
historical context once the order is created.

Related files:

- `src/App.jsx`
- `src/styles.css`
- `scripts/smoke-test.mjs`

Risk:

If over-hidden, users may lose the request conversation context. Keep access,
but make it secondary.

## 4. Public Registration Creates Customer Accounts Only

Decision:

Customer registration is public. Staff/admin access must be invitation or admin
created.

Reason:

Role separation is fundamental. Customers must not see staff/admin switching.

Related files:

- `src/App.jsx`
- `src/supabaseClient.js`
- `docs/setup/AUTH_EMAIL_AND_GOOGLE_SETUP.md`

Risk:

Accidental role shortcuts or weak profile policies can create serious security
and trust issues.

## 5. Auth Uses Supabase Email Link And Google OAuth

Decision:

Use Supabase Auth for email link and Google OAuth at this stage.

Reason:

It is integrated with Supabase Postgres and good enough for MVP. Public users
need simple login. Staff/admin can be invited/created.

Related files:

- `src/supabaseClient.js`
- `docs/setup/AUTH_EMAIL_AND_GOOGLE_SETUP.md`

Risk:

Production still needs custom SMTP/domain sender and final OAuth domain setup.

## 6. AI Agent Is A Demand-Translation Agent, Not A Questionnaire

Decision:

The AI Agent should organize user intent into an Easy Harness Draft, not ask a
long industrial form.

Reason:

Users know their device/use case but may not know harness manufacturing
language. The platform should reduce that burden.

Related files:

- `docs/ai-agent/AI_AGENT_PRINCIPLES.md`
- `supabase/functions/run-checking/index.ts`

Risk:

Rigid rules like "battery -> ask voltage/current" or "sensor -> ask pinout"
turn the AI into a brittle rules engine.

## 7. Attachment Evidence Must Be Honest

Decision:

The AI Agent must not claim to see file contents unless real parser/vision/OCR
evidence exists.

Reason:

Current AI intake receives text/history/attachment metadata, not a complete
file-understanding pipeline.

Related files:

- `docs/ai-agent/AI_AGENT_PRINCIPLES.md`
- `supabase/functions/run-checking/index.ts`
- `src/App.jsx`

Risk:

Hallucinated file understanding damages trust.

## 8. Keep Payment And Logistics UI, But Model Them Honestly

Decision:

Do not remove payment/logistics UI just because APIs are not live. These are
real future platform paths. Show them as preparation/fulfillment states and keep
provider calls disabled until credentials exist.

Reason:

Removing them would make the platform less close to real launch. Pretending live
payment/logistics already work would be fake.

Related files:

- `src/App.jsx`
- `.env.example`
- `supabase/functions/create-payment-session`
- `supabase/functions/quote-shipping-rates`
- `supabase/functions/create-shipment`

Risk:

Copy must not confuse users into thinking unsupported providers are already
processing real money/shipping.

## 9. DAP Is The Initial International Trade Boundary

Decision:

Use DAP for checkout: Easy Harness collects harness and shipping, but import
duties/taxes/brokerage are not collected unless landed-cost support is added.

Reason:

It is clearer and safer than pretending duty/tax calculation exists.

Related files:

- `src/App.jsx`
- `docs/current/CURRENT_PLATFORM_BASELINE.md`

Risk:

Shipping/tax wording can sound alarming if over-explained. Keep concise.

## 10. Marketplace Protected Payment Is A Trust Path

Decision:

Offer a protected marketplace handoff, preferably Alibaba.com Trade Assurance or
equivalent, for customers who do not trust direct platform payment yet.

Reason:

It can improve trust for early customers while Easy Harness still owns the
request/order/support source of truth.

Related files:

- `docs/setup/MARKETPLACE_PROTECTED_PAYMENT.md`
- `supabase/migrations/202605140002_marketplace_protected_payment.sql`
- `src/App.jsx`

Risk:

The marketplace order must match the Easy Harness quote/order. Avoid unrelated
placeholder SKU behavior.

## 11. Legal Pages Should Be Lightweight But Present

Decision:

Add core policy pages and link them at relevant moments, without flooding every
screen.

Reason:

Trade platforms need terms, privacy, upload authorization, custom quote terms,
shipping/duty terms, and after-sales framing. Users often do not read them, but
their presence improves professionalism and reduces ambiguity.

Related files:

- `src/App.jsx`
- `src/styles.css`

Risk:

Overloading request/order pages with legal copy makes the app feel bureaucratic.

