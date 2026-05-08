# Stage 2A Backend Readiness

This file describes the engineering state before offline accounts, credentials,
and legal/business resources are available.

## Confirmed Technical Direction

- Frontend: current React/Vite app remains.
- Backend platform: Supabase.
- Database: Supabase PostgreSQL.
- Auth: Supabase Auth.
- Storage: Supabase Storage with private buckets and signed upload/download URLs.
- Server boundary: Supabase Edge Functions.
- Payment routes: Stripe Checkout, PayPal, and bank transfer.
- Shipping route: DHL Express API first, with Shippo/EasyPost or direct carrier
  alternatives only if DHL account/API coverage blocks launch.
- Incoterm: DAP. Shipping is collected at checkout. Import duties, VAT,
  brokerage, and customs charges are not collected unless a landed-cost provider
  is added later.

## Engineering Added In Stage 2A

- `supabase/migrations/202605080001_stage_2a_schema.sql`
  - Profiles, requests, request messages, attachments, storage objects, quotes,
    orders, order messages, payments, payment events, shipping rate quotes,
    shipments, tracking events, notifications, notification deliveries, audit
    logs, integration events, and service country configuration.
  - Auth user trigger that creates public customer profiles by default.
- `supabase/migrations/202605080002_stage_2a_rls.sql`
  - Customer, staff, and admin access policies.
  - Admin-only audit and integration visibility.
  - Customer ownership policies for requests, orders, messages, attachments, and
    notifications.
- `supabase/functions/*`
  - Edge Function contracts for payment session creation, payment webhooks, DHL
    rates, DHL shipment creation, tracking sync, signed upload setup,
    notification routing, and AI intake checking.
  - Functions intentionally return `integration_not_configured` or
    `provider_call_not_enabled` until real keys and account approvals exist.
- `.env.example`
  - Frontend, Supabase, payment, DHL, notification, and AI secret names.
- `src/supabaseClient.js`
  - Browser Supabase client initialization for hosted Auth when public
    environment variables are configured.
  - Keeps local development usable when hosted variables are absent.

## Offline Resources Still Required

These are outside the codebase and must be handled by the business/operations
team before production integration can be completed.

- Company documents, business license, ownership/beneficiary information, and
  settlement bank account.
- PayPal China merchant account.
- Stripe eligibility check or a compliant alternative entity/payment provider.
- DHL Express China account, API credentials, shipper account, pickup/return
  address, and account-level service coverage.
- Domain, DNS, and business email.
- Terms, Privacy Policy, upload authorization, after-sales terms, and payment
  wording.
- Customs template:
  - HS code confirmed by DHL, customs broker, or export specialist.
  - English product name.
  - Product use/material description.
  - Country of origin: China.
  - Declared value rule.
  - Currency.
  - Net/gross weight rule.
  - Shipper address and return address.
- First supported country list. Start with US, Canada, UK, major EU countries,
  Australia, and New Zealand unless payment or DHL account coverage says
  otherwise.

## What Can Be Built Next Without Those Resources

- Frontend repository/data adapter split: localStorage adapter plus Supabase
  database adapter behind the same method names.
- Supabase request/order/message/attachment reads and writes behind the
  existing local adapter contracts.
- Staff/admin invitation workflow and profile role management UI backed by
  Supabase Auth admin operations.
- Admin integration status view driven by configured service state.
- Server-side validation schemas for requests, checkout address, payment
  sessions, shipping rates, and shipment creation.
- Migration seed data for staff/admin invite flow and service countries.
- Smoke tests that verify migration files, RLS policies, Edge Function contracts,
  and environment templates exist.

## What Should Wait

- Live Stripe/PayPal session creation.
- Live payment webhook reconciliation.
- Live DHL rating, shipment, label, invoice, pickup, and tracking calls.
- Email/WhatsApp sending.
- Real AI checking and draft generation until the harness knowledge base,
  production constraints, and validation examples are available.
