-- Temporary checking completion RPC.
-- This keeps customers from writing Easy Harness/system messages directly while
-- allowing the current local checking adapter to persist its result. A real
-- checking Edge Function can replace this RPC later.

create or replace function public.complete_request_check(
  p_request_id uuid,
  p_status text,
  p_check_status text,
  p_check_result jsonb,
  p_messages jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('needs_info', 'not_supported', 'in_review') then
    raise exception 'Unsupported request status';
  end if;

  if p_check_status not in ('accepted', 'needs_info', 'rejected') then
    raise exception 'Unsupported check status';
  end if;

  update public.requests
  set
    status = p_status,
    check_status = p_check_status,
    check_result = coalesce(p_check_result, '{}'::jsonb),
    updated_at = now()
  where id = p_request_id
    and customer_id = auth.uid()
    and status in ('draft_saved', 'checking', 'needs_info');

  if not found then
    raise exception 'Request not found or cannot be updated';
  end if;

  insert into public.request_messages (
    request_id,
    author_id,
    author_role,
    body,
    blocks,
    visibility
  )
  select
    p_request_id,
    null,
    item.author_role,
    coalesce(item.body, ''),
    coalesce(item.blocks, '[]'::jsonb),
    'thread'
  from jsonb_to_recordset(p_messages) as item(
    author_role text,
    body text,
    blocks jsonb
  )
  where item.author_role in ('easy_harness', 'event', 'system');
end;
$$;

grant execute on function public.complete_request_check(uuid, text, text, jsonb, jsonb) to authenticated;
