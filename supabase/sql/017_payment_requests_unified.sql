-- Run once in Supabase SQL Editor.
-- Unified payment_requests schema for /checkout (Kakao Pay review).

drop table if exists public.payment_requests cascade;

create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  company text,
  business_type text,
  message text,
  product_name text not null,
  amount integer not null,
  vat_included boolean not null default true,
  service_period text,
  payment_method text not null default 'kakaopay',
  privacy_agreed boolean not null default false,
  terms_agreed boolean not null default false,
  status text not null default '결제요청',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payment_requests_created_at_idx on public.payment_requests (created_at desc);

alter table public.payment_requests enable row level security;

create policy payment_requests_anon_insert
  on public.payment_requests
  for insert
  to anon, authenticated
  with check (
    privacy_agreed = true
    and terms_agreed = true
    and payment_method = 'kakaopay'
  );

comment on table public.payment_requests is '카카오페이 결제 신청(심사·사전접수)';
