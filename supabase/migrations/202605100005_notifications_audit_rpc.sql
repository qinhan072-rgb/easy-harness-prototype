-- Controlled notification and audit write paths for client-visible actions.
-- This does not send email/WhatsApp yet; it records the in-app notification and
-- delivery queue rows that future notification functions can consume.

create or replace function public.record_platform_notification(
  p_user_id uuid,
  p_role text,
  p_request_id uuid,
  p_order_id uuid,
  p_title text,
  p_body text
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification public.notifications%rowtype;
  v_allowed boolean;
begin
  if p_role is not null and p_role not in ('customer', 'staff', 'admin') then
    raise exception 'Unsupported notification role';
  end if;

  v_allowed := public.is_staff_or_admin();

  if not v_allowed and p_request_id is not null then
    select exists (
      select 1 from public.requests
      where id = p_request_id and customer_id = auth.uid()
    ) into v_allowed;
  end if;

  if not v_allowed and p_order_id is not null then
    select exists (
      select 1 from public.orders
      where id = p_order_id and customer_id = auth.uid()
    ) into v_allowed;
  end if;

  if not v_allowed and p_user_id is not null then
    v_allowed := p_user_id = auth.uid();
  end if;

  if not v_allowed then
    raise exception 'Notification target is not allowed';
  end if;

  insert into public.notifications (
    user_id,
    role,
    request_id,
    order_id,
    title,
    body
  )
  values (
    p_user_id,
    p_role,
    p_request_id,
    p_order_id,
    p_title,
    p_body
  )
  returning * into v_notification;

  insert into public.notification_deliveries (
    notification_id,
    channel,
    status,
    provider,
    last_attempt_at
  )
  values
    (v_notification.id, 'in_app', 'delivered', 'easy_harness', now()),
    (v_notification.id, 'email', 'queued', null, null),
    (v_notification.id, 'whatsapp', 'queued', null, null),
    (v_notification.id, 'sms', 'skipped', null, null);

  return v_notification;
end;
$$;

grant execute on function public.record_platform_notification(
  uuid,
  text,
  uuid,
  uuid,
  text,
  text
) to authenticated;

create or replace function public.record_platform_audit(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_detail text,
  p_metadata jsonb default '{}'::jsonb
)
returns public.audit_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_audit public.audit_logs%rowtype;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  insert into public.audit_logs (
    actor_id,
    actor_email,
    action,
    target_type,
    target_id,
    detail,
    metadata
  )
  values (
    auth.uid(),
    v_profile.email,
    p_action,
    p_target_type,
    p_target_id,
    coalesce(p_detail, ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_audit;

  return v_audit;
end;
$$;

grant execute on function public.record_platform_audit(
  text,
  text,
  text,
  text,
  jsonb
) to authenticated;
