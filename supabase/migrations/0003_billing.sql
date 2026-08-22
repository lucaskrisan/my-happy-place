-- Tracks each account's Stripe subscription so the webhook can activate/deactivate access without
-- needing a separate table (one paid subscription per account for now).
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists subscription_status text not null default 'none' check (subscription_status in ('none', 'active', 'canceled', 'past_due'));

create unique index if not exists profiles_stripe_customer_id_idx on public.profiles (stripe_customer_id) where stripe_customer_id is not null;
