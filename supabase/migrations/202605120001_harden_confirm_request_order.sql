-- Harden quote confirmation so customer confirmation is an all-or-nothing
-- database operation. If the same request/quote is confirmed again, return the
-- existing order instead of leaving the frontend to create a local-only order.

create or replace function public.confirm_request_order(
  p_request_id uuid,
  p_quote_id uuid,
  p_order_number text,
  p_title text,
  p_harness_price numeric,
  p_shipping_price numeric,
  p_total_due numeric,
  p_currency char(3),
  p_address jsonb,
  p_snapshot jsonb,
  p_package_estimate jsonb,
  p_production_lead_time text,
  p_estimated_production_complete date
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.requests%rowtype;
  v_quote public.quotes%rowtype;
  v_order public.orders%rowtype;
begin
  select *
  into v_request
  from public.requests
  where id = p_request_id
    and customer_id = auth.uid()
  for update;

  if not found then
    raise exception 'Request not found';
  end if;

  select *
  into v_quote
  from public.quotes
  where id = p_quote_id
    and request_id = p_request_id
    and status in ('released', 'confirmed')
  for update;

  if not found then
    raise exception 'Released quote not found';
  end if;

  if v_request.active_quote_id is distinct from p_quote_id
     and v_request.confirmed_quote_id is distinct from p_quote_id then
    raise exception 'Quote is not active';
  end if;

  select *
  into v_order
  from public.orders
  where request_id = p_request_id
    and quote_id = p_quote_id
  order by created_at desc
  limit 1;

  if found then
    update public.requests
    set
      status = 'confirmed',
      confirmed_quote_id = p_quote_id,
      updated_at = now()
    where id = p_request_id;

    update public.quotes
    set status = 'confirmed'
    where id = p_quote_id;

    return v_order;
  end if;

  if v_request.status not in ('ready_to_confirm', 'confirmed') then
    raise exception 'Request is not ready to confirm';
  end if;

  update public.quotes
  set status = 'confirmed'
  where id = p_quote_id;

  update public.requests
  set
    status = 'confirmed',
    confirmed_quote_id = p_quote_id,
    updated_at = now()
  where id = p_request_id;

  insert into public.orders (
    order_number,
    request_id,
    customer_id,
    quote_id,
    title,
    status,
    payment_status,
    fulfillment_status,
    production_status,
    harness_price,
    shipping_price,
    total_due,
    currency,
    incoterm,
    address,
    snapshot,
    package_estimate,
    production_lead_time,
    estimated_production_complete
  )
  values (
    p_order_number,
    p_request_id,
    v_request.customer_id,
    p_quote_id,
    coalesce(nullif(p_title, ''), v_request.title),
    'checkout',
    'unpaid',
    'not_shipped',
    'checkout',
    coalesce(p_harness_price, v_quote.amount),
    coalesce(p_shipping_price, 0),
    coalesce(p_total_due, coalesce(p_harness_price, v_quote.amount) + coalesce(p_shipping_price, 0)),
    coalesce(p_currency, v_quote.currency),
    'DAP',
    coalesce(p_address, '{}'::jsonb),
    coalesce(p_snapshot, '{}'::jsonb),
    coalesce(p_package_estimate, '{}'::jsonb),
    coalesce(p_production_lead_time, ''),
    p_estimated_production_complete
  )
  on conflict (order_number) do update
  set
    updated_at = now()
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.confirm_request_order(
  uuid,
  uuid,
  text,
  text,
  numeric,
  numeric,
  numeric,
  char(3),
  jsonb,
  jsonb,
  jsonb,
  text,
  date
) to authenticated;
