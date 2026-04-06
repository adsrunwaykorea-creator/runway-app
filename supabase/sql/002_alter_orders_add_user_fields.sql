alter table if exists public.orders
  add column if not exists user_id uuid,
  add column if not exists email text;
