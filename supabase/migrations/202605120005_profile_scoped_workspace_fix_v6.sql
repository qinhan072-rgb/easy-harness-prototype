-- Easy Harness v6: profile-scoped workspace read/write repair.
-- This keeps request/order visibility independent from browser-local state and
-- from profiles.verified. It is intended for the current prototype staging flow.

create or replace function public.create_request_with_number_for_profile(
  p_customer_id uuid,
  p_customer_label text,
  p_title text,
  p_customer_summary text,
  p_status text,
  p_check_status text,
  p_check_result jsonb,
  p_files_count integer
)
returns public.requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_next integer;
  v_number text;
  v_request public.requests%rowtype;
  v_profile public.profiles%rowtype;
begin
  select * into v_profile
  from public.profiles as pr
  where pr.id = p_customer_id
    and pr.status = 'active';

  if not found then
    raise exception 'Active profile not found';
  end if;

  perform pg_advisory_xact_lock(hashtext('easy_harness_request_number_' || v_year));

  select coalesce(
    max((regexp_match(r.request_number, '^HD-' || v_year || '-([0-9]+)-A$'))[1]::integer),
    1049
  ) + 1
  into v_next
  from public.requests as r
  where r.request_number ~ ('^HD-' || v_year || '-[0-9]+-A$');

  v_number := 'HD-' || v_year || '-' || v_next::text || '-A';

  insert into public.requests (
    request_number,
    customer_id,
    customer_label,
    title,
    status,
    customer_summary,
    check_status,
    check_result,
    files_count
  ) values (
    v_number,
    p_customer_id,
    coalesce(nullif(p_customer_label, ''), coalesce(v_profile.display_name, 'Customer')),
    coalesce(nullif(p_title, ''), 'Uploaded Harness Design Request'),
    coalesce(nullif(p_status, ''), 'checking'),
    coalesce(p_customer_summary, ''),
    coalesce(nullif(p_check_status, ''), 'pending'),
    coalesce(p_check_result, '{}'::jsonb),
    coalesce(p_files_count, 0)
  ) returning * into v_request;

  return v_request;
end;
$$;

grant execute on function public.create_request_with_number_for_profile(uuid,text,text,text,text,text,jsonb,integer) to authenticated;

create or replace function public.list_workspace_requests_for_profile(p_profile_id uuid)
returns table (
  id uuid,
  request_number text,
  customer_id uuid,
  customer_label text,
  title text,
  status text,
  customer_summary text,
  check_status text,
  check_result jsonb,
  files_count integer,
  active_quote_id uuid,
  confirmed_quote_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  request_messages jsonb,
  attachments jsonb,
  quotes jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_staff boolean := false;
begin
  if p_profile_id is null then
    return;
  end if;

  select coalesce((pr.role in ('staff', 'admin') and pr.status = 'active'), false)
  into v_is_staff
  from public.profiles as pr
  where pr.id = p_profile_id;

  return query
  select
    r.id,
    r.request_number,
    r.customer_id,
    r.customer_label,
    r.title,
    r.status,
    r.customer_summary,
    r.check_status,
    r.check_result,
    r.files_count,
    r.active_quote_id,
    r.confirmed_quote_id,
    r.created_at,
    r.updated_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', rm.id,
        'author_id', rm.author_id,
        'author_role', rm.author_role,
        'body', rm.body,
        'blocks', rm.blocks,
        'created_at', rm.created_at
      ) order by rm.created_at)
      from public.request_messages as rm
      where rm.request_id = r.id
    ), '[]'::jsonb) as request_messages,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'owner_id', a.owner_id,
        'request_id', a.request_id,
        'request_message_id', a.request_message_id,
        'name', a.name,
        'mime_type', a.mime_type,
        'size_bytes', a.size_bytes,
        'purpose', a.purpose,
        'created_at', a.created_at
      ) order by a.created_at)
      from public.attachments as a
      where a.request_id = r.id
    ), '[]'::jsonb) as attachments,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id,
        'request_id', q.request_id,
        'version', q.version,
        'amount', q.amount,
        'currency', q.currency,
        'basis_message_ids', q.basis_message_ids,
        'status', q.status,
        'released_by', q.released_by,
        'released_at', q.released_at,
        'valid_until', q.valid_until
      ) order by q.version)
      from public.quotes as q
      where q.request_id = r.id
    ), '[]'::jsonb) as quotes
  from public.requests as r
  where v_is_staff or r.customer_id = p_profile_id
  order by r.updated_at desc nulls last, r.created_at desc nulls last;
end;
$$;

grant execute on function public.list_workspace_requests_for_profile(uuid) to authenticated;

create or replace function public.list_workspace_orders_for_profile(p_profile_id uuid)
returns table (
  id uuid,
  order_number text,
  request_id uuid,
  customer_id uuid,
  quote_id uuid,
  title text,
  status text,
  payment_status text,
  fulfillment_status text,
  production_status text,
  harness_price numeric,
  shipping_price numeric,
  total_due numeric,
  currency char(3),
  incoterm text,
  address jsonb,
  snapshot jsonb,
  package_estimate jsonb,
  production_lead_time text,
  estimated_production_complete date,
  created_at timestamptz,
  updated_at timestamptz,
  requests jsonb,
  order_messages jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_staff boolean := false;
begin
  if p_profile_id is null then
    return;
  end if;

  select coalesce((pr.role in ('staff', 'admin') and pr.status = 'active'), false)
  into v_is_staff
  from public.profiles as pr
  where pr.id = p_profile_id;

  return query
  select
    o.id,
    o.order_number,
    o.request_id,
    o.customer_id,
    o.quote_id,
    o.title,
    o.status,
    o.payment_status,
    o.fulfillment_status,
    o.production_status,
    o.harness_price,
    o.shipping_price,
    o.total_due,
    o.currency,
    o.incoterm,
    o.address,
    o.snapshot,
    o.package_estimate,
    o.production_lead_time,
    o.estimated_production_complete,
    o.created_at,
    o.updated_at,
    jsonb_build_object(
      'request_number', r.request_number,
      'customer_label', r.customer_label,
      'title', r.title,
      'status', r.status
    ) as requests,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', om.id,
        'author_id', om.author_id,
        'author_role', om.author_role,
        'body', om.body,
        'visibility', om.visibility,
        'created_at', om.created_at
      ) order by om.created_at)
      from public.order_messages as om
      where om.order_id = o.id
    ), '[]'::jsonb) as order_messages
  from public.orders as o
  left join public.requests as r on r.id = o.request_id
  where v_is_staff or o.customer_id = p_profile_id
  order by o.updated_at desc nulls last, o.created_at desc nulls last;
end;
$$;

grant execute on function public.list_workspace_orders_for_profile(uuid) to authenticated;

create or replace function public.confirm_request_order_for_profile(
  p_customer_id uuid,
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
  select * into v_request
  from public.requests as r
  where r.id = p_request_id
    and r.customer_id = p_customer_id
  for update;

  if not found then
    raise exception 'Request not found';
  end if;

  select * into v_quote
  from public.quotes as q
  where q.id = p_quote_id
    and q.request_id = p_request_id
    and q.status in ('released', 'confirmed')
  for update;

  if not found then
    raise exception 'Released quote not found';
  end if;

  if v_request.active_quote_id is distinct from p_quote_id
     and v_request.confirmed_quote_id is distinct from p_quote_id then
    raise exception 'Quote is not active';
  end if;

  select * into v_order
  from public.orders as o
  where o.request_id = p_request_id
    and o.quote_id = p_quote_id
  order by o.created_at desc
  limit 1;

  if found then
    update public.requests
    set status = 'confirmed', confirmed_quote_id = p_quote_id, updated_at = now()
    where id = p_request_id;
    update public.quotes set status = 'confirmed' where id = p_quote_id;
    return v_order;
  end if;

  if v_request.status not in ('ready_to_confirm', 'confirmed') then
    raise exception 'Request is not ready to confirm';
  end if;

  update public.quotes set status = 'confirmed' where id = p_quote_id;
  update public.requests
  set status = 'confirmed', confirmed_quote_id = p_quote_id, updated_at = now()
  where id = p_request_id;

  insert into public.orders (
    order_number, request_id, customer_id, quote_id, title, status,
    payment_status, fulfillment_status, production_status,
    harness_price, shipping_price, total_due, currency, incoterm,
    address, snapshot, package_estimate, production_lead_time,
    estimated_production_complete
  ) values (
    p_order_number, p_request_id, v_request.customer_id, p_quote_id,
    coalesce(nullif(p_title, ''), v_request.title),
    'checkout', 'unpaid', 'not_shipped', 'checkout',
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
  on conflict (order_number) do update set updated_at = now()
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.confirm_request_order_for_profile(uuid,uuid,uuid,text,text,numeric,numeric,numeric,char,jsonb,jsonb,jsonb,text,date) to authenticated;
