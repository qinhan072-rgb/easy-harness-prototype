-- Include storage object paths in workspace request reads so the client can
-- create short-lived signed preview URLs for private uploaded files.

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
  v_profile_id uuid := auth.uid();
  v_is_staff boolean := false;
begin
  if v_profile_id is null then
    return;
  end if;

  select coalesce((pr.role in ('staff', 'admin') and pr.status = 'active'), false)
  into v_is_staff
  from public.profiles as pr
  where pr.id = v_profile_id;

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
        'storage_object_id', a.storage_object_id,
        'bucket', coalesce(so.bucket, 'request-attachments'),
        'object_path', so.object_path,
        'storage_status', so.status,
        'name', a.name,
        'mime_type', coalesce(a.mime_type, so.content_type, 'application/octet-stream'),
        'size_bytes', coalesce(a.size_bytes, so.size_bytes, 0),
        'purpose', a.purpose,
        'created_at', a.created_at
      ) order by a.created_at)
      from public.attachments as a
      left join public.storage_objects as so on so.id = a.storage_object_id
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
  where v_is_staff or r.customer_id = v_profile_id
  order by r.updated_at desc nulls last, r.created_at desc nulls last;
end;
$$;

grant execute on function public.list_workspace_requests() to authenticated;

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
begin
  if p_profile_id is distinct from auth.uid() then
    raise exception 'Profile id does not match authenticated user';
  end if;

  return query select * from public.list_workspace_requests();
end;
$$;

grant execute on function public.list_workspace_requests_for_profile(uuid) to authenticated;
