-- Run once in Supabase SQL Editor.
-- Kakao Pay completion tracking + payment history for admin dashboard.

-- ---------------------------------------------------------------------------
-- consultation_leads: payment fields + 결제완료 status
-- ---------------------------------------------------------------------------
alter table public.consultation_leads
  add column if not exists payment_status text,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_method text,
  add column if not exists payment_amount integer,
  add column if not exists kakao_payment_id text;

alter table public.consultation_leads drop constraint if exists consultation_leads_status_check;

alter table public.consultation_leads
  add constraint consultation_leads_status_check
  check (status in ('신규', '연락완료', '상담완료', '계약완료', '보류', '부재', '결제완료'));

-- ---------------------------------------------------------------------------
-- payment_requests: Kakao Pay session + completion fields
-- ---------------------------------------------------------------------------
alter table public.payment_requests
  add column if not exists payment_status text not null default 'pending',
  add column if not exists paid_at timestamptz,
  add column if not exists payment_amount integer,
  add column if not exists kakao_tid text,
  add column if not exists partner_order_id text,
  add column if not exists partner_user_id text,
  add column if not exists consultation_lead_id uuid references public.consultation_leads (id) on delete set null;

create index if not exists payment_requests_kakao_tid_idx on public.payment_requests (kakao_tid);
create index if not exists payment_requests_partner_order_id_idx on public.payment_requests (partner_order_id);
create index if not exists payment_requests_payment_status_idx on public.payment_requests (payment_status, created_at desc);

-- ---------------------------------------------------------------------------
-- payment_history: completed payments for admin revenue / orders
-- ---------------------------------------------------------------------------
create table if not exists public.payment_history (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  company_name text,
  product_name text not null,
  amount integer not null,
  payment_method text not null default 'kakao_pay',
  payment_status text not null default 'paid',
  paid_at timestamptz not null default now(),
  consultation_id uuid references public.consultation_leads (id) on delete set null,
  payment_request_id uuid references public.payment_requests (id) on delete set null,
  kakao_tid text,
  partner_order_id text,
  partner_user_id text,
  created_at timestamptz not null default now()
);

create unique index if not exists payment_history_kakao_tid_uidx
  on public.payment_history (kakao_tid)
  where kakao_tid is not null;

create index if not exists payment_history_paid_at_idx
  on public.payment_history (paid_at desc);

create index if not exists payment_history_payment_status_idx
  on public.payment_history (payment_status, paid_at desc);

alter table public.payment_history enable row level security;

comment on table public.payment_history is '카카오페이 등 실제 결제 완료 내역 (관리자 매출 집계)';
