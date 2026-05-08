-- Easy Harness Stage 2A row-level security.
-- Service-role Edge Functions bypass these policies for webhook/provider work.

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.status <> 'suspended'
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() = 'admin'
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() in ('staff', 'admin')
$$;

create or replace function public.guard_profile_privilege_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin()
    and (
      new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.verified is distinct from old.verified
    )
  then
    raise exception 'Only admins can change profile role, status, or verification.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privilege_fields on public.profiles;

create trigger profiles_guard_privilege_fields
  before update on public.profiles
  for each row execute function public.guard_profile_privilege_fields();

alter table public.profiles enable row level security;
alter table public.requests enable row level security;
alter table public.request_messages enable row level security;
alter table public.quotes enable row level security;
alter table public.orders enable row level security;
alter table public.order_messages enable row level security;
alter table public.attachments enable row level security;
alter table public.storage_objects enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.shipping_rate_quotes enable row level security;
alter table public.shipments enable row level security;
alter table public.tracking_events enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.audit_logs enable row level security;
alter table public.integration_events enable row level security;
alter table public.service_countries enable row level security;

drop policy if exists profiles_select_own_or_staff on public.profiles;
create policy profiles_select_own_or_staff
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_staff_or_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists requests_select_owner_or_staff on public.requests;
create policy requests_select_owner_or_staff
on public.requests for select
to authenticated
using (customer_id = auth.uid() or public.is_staff_or_admin());

drop policy if exists requests_insert_customer_own on public.requests;
create policy requests_insert_customer_own
on public.requests for insert
to authenticated
with check (customer_id = auth.uid());

drop policy if exists requests_update_customer_open on public.requests;
create policy requests_update_customer_open
on public.requests for update
to authenticated
using (customer_id = auth.uid() and status in ('draft_saved', 'checking', 'needs_info', 'in_review', 'ready_to_confirm'))
with check (customer_id = auth.uid());

drop policy if exists requests_staff_all on public.requests;
create policy requests_staff_all
on public.requests for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists request_messages_select_participant on public.request_messages;
create policy request_messages_select_participant
on public.request_messages for select
to authenticated
using (
  exists (
    select 1
    from public.requests r
    where r.id = request_messages.request_id
      and (r.customer_id = auth.uid() or public.is_staff_or_admin())
  )
);

drop policy if exists request_messages_customer_insert on public.request_messages;
create policy request_messages_customer_insert
on public.request_messages for insert
to authenticated
with check (
  author_id = auth.uid()
  and author_role = 'customer'
  and exists (
    select 1
    from public.requests r
    where r.id = request_messages.request_id
      and r.customer_id = auth.uid()
  )
);

drop policy if exists request_messages_staff_all on public.request_messages;
create policy request_messages_staff_all
on public.request_messages for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists quotes_select_participant on public.quotes;
create policy quotes_select_participant
on public.quotes for select
to authenticated
using (
  exists (
    select 1
    from public.requests r
    where r.id = quotes.request_id
      and (r.customer_id = auth.uid() or public.is_staff_or_admin())
  )
);

drop policy if exists quotes_staff_all on public.quotes;
create policy quotes_staff_all
on public.quotes for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists orders_select_owner_or_staff on public.orders;
create policy orders_select_owner_or_staff
on public.orders for select
to authenticated
using (customer_id = auth.uid() or public.is_staff_or_admin());

drop policy if exists orders_customer_update_checkout on public.orders;
create policy orders_customer_update_checkout
on public.orders for update
to authenticated
using (customer_id = auth.uid() and status in ('checkout', 'awaiting_bank_transfer'))
with check (customer_id = auth.uid());

drop policy if exists orders_staff_all on public.orders;
create policy orders_staff_all
on public.orders for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists order_messages_select_participant on public.order_messages;
create policy order_messages_select_participant
on public.order_messages for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_messages.order_id
      and (o.customer_id = auth.uid() or public.is_staff_or_admin())
  )
);

drop policy if exists order_messages_customer_insert on public.order_messages;
create policy order_messages_customer_insert
on public.order_messages for insert
to authenticated
with check (
  author_id = auth.uid()
  and author_role = 'customer'
  and exists (
    select 1
    from public.orders o
    where o.id = order_messages.order_id
      and o.customer_id = auth.uid()
  )
);

drop policy if exists order_messages_staff_all on public.order_messages;
create policy order_messages_staff_all
on public.order_messages for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists attachments_select_participant on public.attachments;
create policy attachments_select_participant
on public.attachments for select
to authenticated
using (
  public.is_staff_or_admin()
  or owner_id = auth.uid()
  or exists (
    select 1
    from public.requests r
    where r.id = attachments.request_id
      and r.customer_id = auth.uid()
  )
  or exists (
    select 1
    from public.orders o
    where o.id = attachments.order_id
      and o.customer_id = auth.uid()
  )
);

drop policy if exists attachments_customer_insert on public.attachments;
create policy attachments_customer_insert
on public.attachments for insert
to authenticated
with check (
  owner_id = auth.uid()
  and (
    exists (
      select 1 from public.requests r
      where r.id = attachments.request_id and r.customer_id = auth.uid()
    )
    or exists (
      select 1 from public.orders o
      where o.id = attachments.order_id and o.customer_id = auth.uid()
    )
  )
);

drop policy if exists attachments_staff_all on public.attachments;
create policy attachments_staff_all
on public.attachments for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists storage_objects_select_participant on public.storage_objects;
create policy storage_objects_select_participant
on public.storage_objects for select
to authenticated
using (
  public.is_staff_or_admin()
  or exists (
    select 1
    from public.attachments a
    left join public.requests r on r.id = a.request_id
    left join public.orders o on o.id = a.order_id
    where a.storage_object_id = storage_objects.id
      and (a.owner_id = auth.uid() or r.customer_id = auth.uid() or o.customer_id = auth.uid())
  )
);

drop policy if exists storage_objects_staff_all on public.storage_objects;
create policy storage_objects_staff_all
on public.storage_objects for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists payments_select_owner_or_staff on public.payments;
create policy payments_select_owner_or_staff
on public.payments for select
to authenticated
using (
  public.is_staff_or_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = payments.order_id
      and o.customer_id = auth.uid()
  )
);

drop policy if exists payments_staff_all on public.payments;
create policy payments_staff_all
on public.payments for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists payment_events_admin_select on public.payment_events;
create policy payment_events_admin_select
on public.payment_events for select
to authenticated
using (public.is_admin());

drop policy if exists shipping_rate_quotes_select_owner_or_staff on public.shipping_rate_quotes;
create policy shipping_rate_quotes_select_owner_or_staff
on public.shipping_rate_quotes for select
to authenticated
using (
  public.is_staff_or_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = shipping_rate_quotes.order_id
      and o.customer_id = auth.uid()
  )
);

drop policy if exists shipping_rate_quotes_staff_all on public.shipping_rate_quotes;
create policy shipping_rate_quotes_staff_all
on public.shipping_rate_quotes for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists shipments_select_owner_or_staff on public.shipments;
create policy shipments_select_owner_or_staff
on public.shipments for select
to authenticated
using (
  public.is_staff_or_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = shipments.order_id
      and o.customer_id = auth.uid()
  )
);

drop policy if exists shipments_staff_all on public.shipments;
create policy shipments_staff_all
on public.shipments for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists tracking_events_select_owner_or_staff on public.tracking_events;
create policy tracking_events_select_owner_or_staff
on public.tracking_events for select
to authenticated
using (
  public.is_staff_or_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = tracking_events.order_id
      and o.customer_id = auth.uid()
  )
);

drop policy if exists tracking_events_staff_all on public.tracking_events;
create policy tracking_events_staff_all
on public.tracking_events for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists notifications_select_own_or_staff_role on public.notifications;
create policy notifications_select_own_or_staff_role
on public.notifications for select
to authenticated
using (
  user_id = auth.uid()
  or (role = public.current_profile_role())
  or public.is_admin()
);

drop policy if exists notifications_update_own_read on public.notifications;
create policy notifications_update_own_read
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists notifications_staff_all on public.notifications;
create policy notifications_staff_all
on public.notifications for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists notification_deliveries_admin_select on public.notification_deliveries;
create policy notification_deliveries_admin_select
on public.notification_deliveries for select
to authenticated
using (public.is_admin());

drop policy if exists audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select
on public.audit_logs for select
to authenticated
using (public.is_admin());

drop policy if exists integration_events_admin_select on public.integration_events;
create policy integration_events_admin_select
on public.integration_events for select
to authenticated
using (public.is_admin());

drop policy if exists service_countries_public_select_enabled on public.service_countries;
create policy service_countries_public_select_enabled
on public.service_countries for select
to anon, authenticated
using (checkout_enabled = true);

drop policy if exists service_countries_admin_all on public.service_countries;
create policy service_countries_admin_all
on public.service_countries for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
