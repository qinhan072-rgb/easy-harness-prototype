-- Easy Harness v5 RPC repair.
-- Fixes 400 errors from list_workspace_requests/list_workspace_orders caused by
-- ambiguous PL/pgSQL output parameter names such as "status".
-- Also keeps verified out of request/order visibility. Authenticated customers
-- see their own workspace. Active staff/admin users see the ops workspace.

create or replace function public.list_workspace_requests()
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
  if auth.uid() is null then
    return;
  end if;

  select coalesce(pr.role in ('staff', 'admin') and pr.status = 'active', false)
  into v_is_staff
  from public.profiles as pr
  where pr.id = auth.uid();

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
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', rm.id,
            'author_id', rm.author_id,
            'author_role', rm.author_role,
            'body', rm.body,
            'blocks', rm.blocks,
            'created_at', rm.created_at
          )
          order by rm.created_at
        )
        from public.request_messages as rm
        where rm.request_id = r.id
      ),
      '[]'::jsonb
    ) as request_messages,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'owner_id', a.owner_id,
            'request_id', a.request_id,
            'request_message_id', a.request_message_id,
            'name', a.name,
            'mime_type', a.mime_type,
            'size_bytes', a.size_bytes,
            'purpose', a.purpose,
            'created_at', a.created_at
          )
          order by a.created_at
        )
        from public.attachments as a
        where a.request_id = r.id
      ),
      '[]'::jsonb
    ) as attachments,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
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
          )
          order by q.version
        )
        from public.quotes as q
        where q.request_id = r.id
      ),
      '[]'::jsonb
    ) as quotes
  from public.requests as r
  where v_is_staff or r.customer_id = auth.uid()
  order by r.updated_at desc, r.created_at desc;
end;
$$;

grant execute on function public.list_workspace_requests() to authenticated;

create or replace function public.list_workspace_orders()
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
  if auth.uid() is null then
    return;
  end if;

  select coalesce(pr.role in ('staff', 'admin') and pr.status = 'active', false)
  into v_is_staff
  from public.profiles as pr
  where pr.id = auth.uid();

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
      'customer_label', r.customer_label
    ) as requests,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', om.id,
            'author_id', om.author_id,
            'author_role', om.author_role,
            'body', om.body,
            'visibility', om.visibility,
            'created_at', om.created_at
          )
          order by om.created_at
        )
        from public.order_messages as om
        where om.order_id = o.id
      ),
      '[]'::jsonb
    ) as order_messages
  from public.orders as o
  left join public.requests as r on r.id = o.request_id
  where v_is_staff or o.customer_id = auth.uid()
  order by o.updated_at desc, o.created_at desc;
end;
$$;

grant execute on function public.list_workspace_orders() to authenticated;
