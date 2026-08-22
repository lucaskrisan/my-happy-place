-- Fixes "infinite recursion detected in policy for relation profiles": the admin-check subquery inside
-- each policy selected from public.profiles, which re-triggered the same policy on itself. A
-- security-definer helper function breaks the cycle (it runs as the function owner, which bypasses RLS
-- on profiles since FORCE ROW LEVEL SECURITY was never enabled on it).

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "products_all_own_or_admin" on public.products;
create policy "products_all_own_or_admin" on public.products for all
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "funnels_all_own_or_admin" on public.funnels;
create policy "funnels_all_own_or_admin" on public.funnels for all
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
