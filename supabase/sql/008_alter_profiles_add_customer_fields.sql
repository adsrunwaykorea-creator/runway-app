alter table if exists public.profiles
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists company_name text;
