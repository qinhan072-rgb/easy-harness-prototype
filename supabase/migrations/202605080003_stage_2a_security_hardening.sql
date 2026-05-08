-- Stage 2A security hardening after Supabase advisors.

create schema if not exists extensions;

alter extension citext set schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.current_profile_role() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon, authenticated;
revoke execute on function public.is_staff_or_admin() from public, anon, authenticated;
revoke execute on function public.guard_profile_privilege_fields() from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
