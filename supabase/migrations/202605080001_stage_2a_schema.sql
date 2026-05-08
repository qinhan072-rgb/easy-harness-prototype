-- Easy Harness Stage 2A backend schema.
-- Target stack: Supabase Auth, PostgreSQL, Supabase Storage, Edge Functions.
-- This migration creates the deployable table shape before live credentials
-- for payment, shipping, email, and AI services are available.

create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  display_name text,
  role text not null default 'customer' check (role in ('customer', 'staff', 'admin')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  verified boolean not null default false,
  notification_preferences jsonb not null default '{"email":true,"whatsapp":false,"sms":false}'::jsonb,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  customer_label text not null default '',
  title text not null,
  status text not null default 'draft_saved' check (
    status in ('draft_saved', 'checking', 'needs_info', 'not_supported', 'in_review', 'ready_to_confirm', 'confirmed', 'paid')
  ),
  customer_summary text not null default '',
  check_status text not null default 'pending' check (check_status in ('pending', 'accepted', 'needs_info', 'rejected')),
  check_result jsonb not null default '{}'::jsonb,
  files_count integer not null default 0 check (files_count >= 0),
  active_quote_id uuid,
  confirmed_quote_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_role text not null check (author_role in ('customer', 'easy_harness', 'event', 'system')),
  body text not null default '',
  blocks jsonb not null default '[]'::jsonb,
  visibility text not null default 'thread' check (visibility in ('thread', 'internal')),
  created_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  version integer not null check (version > 0),
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'USD',
  basis_message_ids uuid[] not null default '{}',
  status text not null default 'released' check (status in ('draft', 'released', 'confirmed', 'expired', 'void')),
  released_by uuid references public.profiles(id) on delete set null,
  released_at timestamptz not null default now(),
  valid_until date,
  unique (request_id, version)
);

alter table public.requests
  add constraint requests_active_quote_fk
  foreign key (active_quote_id) references public.quotes(id) deferrable initially deferred;

alter table public.requests
  add constraint requests_confirmed_quote_fk
  foreign key (confirmed_quote_id) references public.quotes(id) deferrable initially deferred;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  request_id uuid not null references public.requests(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  quote_id uuid references public.quotes(id) on delete restrict,
  title text not null,
  status text not null default 'checkout' check (
    status in ('checkout', 'awaiting_bank_transfer', 'scheduled', 'in_production', 'ready_to_ship', 'shipped', 'delivered')
  ),
  payment_status text not null default 'unpaid' check (
    payment_status in ('unpaid', 'payment_pending', 'bank_transfer_pending', 'paid', 'refunded', 'failed')
  ),
  fulfillment_status text not null default 'not_shipped' check (
    fulfillment_status in ('not_shipped', 'label_created', 'in_transit', 'out_for_delivery', 'delivered', 'exception')
  ),
  production_status text not null default 'checkout' check (
    production_status in ('checkout', 'scheduled', 'in_production', 'ready_to_ship', 'shipped', 'delivered')
  ),
  harness_price numeric(12,2) not null default 0 check (harness_price >= 0),
  shipping_price numeric(12,2) not null default 0 check (shipping_price >= 0),
  total_due numeric(12,2) not null default 0 check (total_due >= 0),
  currency char(3) not null default 'USD',
  incoterm text not null default 'DAP',
  address jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  package_estimate jsonb not null default '{}'::jsonb,
  selected_shipping_rate_id uuid,
  production_lead_time text not null default '',
  estimated_production_complete date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_role text not null check (author_role in ('customer', 'easy_harness', 'system')),
  body text not null,
  visibility text not null default 'thread' check (visibility in ('thread', 'internal')),
  created_at timestamptz not null default now()
);

create table if not exists public.storage_objects (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'request-uploads',
  object_path text not null unique,
  status text not null default 'pending_upload' check (status in ('pending_upload', 'uploaded', 'available', 'blocked', 'deleted')),
  access_scope text not null default 'request_participants' check (access_scope in ('request_participants', 'order_participants', 'staff_only')),
  content_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  checksum text,
  signed_upload_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  request_id uuid references public.requests(id) on delete cascade,
  request_message_id uuid references public.request_messages(id) on delete set null,
  order_id uuid references public.orders(id) on delete cascade,
  order_message_id uuid references public.order_messages(id) on delete set null,
  storage_object_id uuid references public.storage_objects(id) on delete set null,
  name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  purpose text not null default 'request_upload' check (purpose in ('request_upload', 'staff_preview', 'order_support', 'internal')),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null check (provider in ('stripe', 'paypal', 'bank_transfer')),
  method text not null default '',
  status text not null default 'created' check (
    status in ('created', 'pending', 'requires_action', 'paid', 'failed', 'canceled', 'refunded')
  ),
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'USD',
  provider_session_id text,
  provider_reference text,
  checkout_url text,
  bank_reference text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  event_type text not null,
  provider_event_id text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create table if not exists public.shipping_rate_quotes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  provider text not null default 'dhl_express',
  carrier text not null default 'DHL Express',
  service text not null,
  service_level text not null default '',
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'USD',
  estimated_days text not null default '',
  incoterm text not null default 'DAP',
  origin jsonb not null default '{}'::jsonb,
  destination jsonb not null default '{}'::jsonb,
  package_estimate jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.orders
  add constraint orders_selected_shipping_rate_fk
  foreign key (selected_shipping_rate_id) references public.shipping_rate_quotes(id) deferrable initially deferred;

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'dhl_express',
  carrier text not null default 'DHL Express',
  service text not null default '',
  status text not null default 'not_shipped' check (
    status in ('not_shipped', 'label_created', 'in_transit', 'out_for_delivery', 'delivered', 'exception')
  ),
  tracking_number text,
  tracking_url text,
  label_url text,
  commercial_invoice_url text,
  customs_data jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier_code text not null default '',
  status text not null,
  description text not null default '',
  location text not null default '',
  occurred_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  role text check (role in ('customer', 'staff', 'admin')),
  request_id uuid references public.requests(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  channel text not null check (channel in ('in_app', 'email', 'whatsapp', 'sms')),
  status text not null default 'queued' check (status in ('queued', 'sent', 'delivered', 'failed', 'skipped')),
  provider text,
  provider_message_id text,
  last_attempt_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  action text not null,
  target_type text not null,
  target_id text not null,
  detail text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  adapter text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  detail text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.service_countries (
  country_code char(2) primary key,
  country_name text not null,
  region_group text not null default 'other',
  checkout_enabled boolean not null default true,
  dhl_express_enabled boolean not null default true,
  payment_enabled boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.service_countries (country_code, country_name, region_group, notes)
values
  ('US', 'United States', 'north_america', 'First launch focus if payment and DHL account coverage are available.'),
  ('CA', 'Canada', 'north_america', 'First launch focus if payment and DHL account coverage are available.'),
  ('GB', 'United Kingdom', 'europe', 'First launch focus if payment and DHL account coverage are available.'),
  ('DE', 'Germany', 'europe', 'First launch focus if payment and DHL account coverage are available.'),
  ('FR', 'France', 'europe', 'First launch focus if payment and DHL account coverage are available.'),
  ('NL', 'Netherlands', 'europe', 'First launch focus if payment and DHL account coverage are available.'),
  ('IT', 'Italy', 'europe', 'First launch focus if payment and DHL account coverage are available.'),
  ('ES', 'Spain', 'europe', 'First launch focus if payment and DHL account coverage are available.'),
  ('SE', 'Sweden', 'europe', 'First launch focus if payment and DHL account coverage are available.'),
  ('AU', 'Australia', 'oceania', 'First launch focus if payment and DHL account coverage are available.'),
  ('NZ', 'New Zealand', 'oceania', 'First launch focus if payment and DHL account coverage are available.')
on conflict (country_code) do nothing;

create unique index if not exists requests_customer_number_idx on public.requests(customer_id, request_number);
create index if not exists request_messages_request_created_idx on public.request_messages(request_id, created_at);
create index if not exists quotes_request_version_idx on public.quotes(request_id, version desc);
create index if not exists orders_customer_updated_idx on public.orders(customer_id, updated_at desc);
create index if not exists payments_order_idx on public.payments(order_id);
create index if not exists shipments_order_idx on public.shipments(order_id);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists integration_events_created_idx on public.integration_events(created_at desc);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger requests_set_updated_at
  before update on public.requests
  for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create trigger storage_objects_set_updated_at
  before update on public.storage_objects
  for each row execute function public.set_updated_at();

create trigger shipments_set_updated_at
  before update on public.shipments
  for each row execute function public.set_updated_at();

create trigger service_countries_set_updated_at
  before update on public.service_countries
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    role,
    status,
    verified
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)),
    'customer',
    'active',
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
