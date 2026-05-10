-- Allow authenticated users to evaluate RLS helper functions used by policies.
-- These functions do not expose data directly; they return the caller's role
-- or role checks so row-level policies can decide access correctly.

grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff_or_admin() to authenticated;
