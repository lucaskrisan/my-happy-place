-- Funnel Studio — initial schema (accounts/roles + products/funnels as JSON, mirroring the existing
-- StudioProduct / FunnelDefinition shapes so the app's business logic doesn't need to change yet — only
-- the persistence layer swaps from localStorage to these tables).
--
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query > paste > Run).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'client' check (role in ('admin', 'client')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.funnels (
  id text primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_owner_id_idx on public.products(owner_id);
create index if not exists funnels_owner_id_idx on public.funnels(owner_id);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.funnels enable row level security;

-- A user can always see their own profile; an admin can see everyone's (needed for the super admin panel).
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select
  using (
    id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "products_all_own_or_admin" on public.products;
create policy "products_all_own_or_admin" on public.products for all
  using (
    owner_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    owner_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "funnels_all_own_or_admin" on public.funnels;
create policy "funnels_all_own_or_admin" on public.funnels for all
  using (
    owner_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    owner_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Every new signup gets a profile row automatically. The one email below becomes admin on signup —
-- everyone else defaults to 'client'. Change or add emails here before running if needed.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when new.email = 'trafegocomkrisan@gmail.com' then 'admin' else 'client' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
