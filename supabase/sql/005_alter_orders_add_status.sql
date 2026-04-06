alter table if exists public.orders
  add column if not exists status text not null default 'pending';
