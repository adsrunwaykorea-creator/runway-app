alter table if exists public.orders
  add column if not exists created_at timestamptz not null default now();
