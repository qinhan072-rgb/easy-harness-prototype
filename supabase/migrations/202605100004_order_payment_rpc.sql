-- Customer checkout payment recording RPC.
-- Real Stripe/PayPal/bank integrations will call stricter Edge Functions and
-- webhooks later; this keeps the current checkout payment state in Postgres.

create or replace function public.record_order_payment(
  p_order_id uuid,
  p_provider text,
  p_method text,
  p_status text,
  p_order_status text,
  p_order_payment_status text,
  p_provider_session_id text,
  p_provider_reference text,
  p_bank_reference text,
  p_raw_payload jsonb default '{}'::jsonb
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_confirmed_at timestamptz;
begin
  if p_provider not in ('stripe', 'paypal', 'bank_transfer') then
    raise exception 'Unsupported payment provider';
  end if;

  if p_status not in ('created', 'pending', 'requires_action', 'paid', 'failed', 'canceled', 'refunded') then
    raise exception 'Unsupported payment status';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
    and customer_id = auth.uid()
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.status not in ('checkout', 'awaiting_bank_transfer', 'scheduled') then
    raise exception 'Order is not in checkout';
  end if;

  v_confirmed_at := case when p_status = 'paid' then now() else null end;

  insert into public.payments (
    order_id,
    provider,
    method,
    status,
    amount,
    currency,
    provider_session_id,
    provider_reference,
    bank_reference,
    raw_payload,
    confirmed_at
  )
  values (
    p_order_id,
    p_provider,
    coalesce(p_method, ''),
    p_status,
    v_order.total_due,
    v_order.currency,
    nullif(p_provider_session_id, ''),
    nullif(p_provider_reference, ''),
    nullif(p_bank_reference, ''),
    coalesce(p_raw_payload, '{}'::jsonb),
    v_confirmed_at
  )
  returning * into v_payment;

  update public.orders
  set
    status = coalesce(nullif(p_order_status, ''), status),
    payment_status = coalesce(nullif(p_order_payment_status, ''), payment_status),
    production_status = case when p_status = 'paid' then 'scheduled' else production_status end,
    updated_at = now()
  where id = p_order_id;

  insert into public.payment_events (
    payment_id,
    order_id,
    provider,
    event_type,
    provider_event_id,
    payload
  )
  values (
    v_payment.id,
    p_order_id,
    p_provider,
    p_status,
    nullif(p_provider_reference, ''),
    coalesce(p_raw_payload, '{}'::jsonb)
  );

  return v_payment;
end;
$$;

grant execute on function public.record_order_payment(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to authenticated;
