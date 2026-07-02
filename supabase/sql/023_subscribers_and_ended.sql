-- Run once in Supabase SQL Editor.
-- Subscriber management: active subscribers + ended subscribers archive.
-- consultation_leads is used as the consultations table.

-- ---------------------------------------------------------------------------
-- consultation_leads: add 가입완료 status
-- ---------------------------------------------------------------------------
alter table public.consultation_leads drop constraint if exists consultation_leads_status_check;

alter table public.consultation_leads
  add constraint consultation_leads_status_check
  check (status in (
    '신규', '연락완료', '상담완료', '계약완료', '보류', '부재',
    '결제완료', '가입완료'
  ));

-- ---------------------------------------------------------------------------
-- subscribers: active service customers
-- ---------------------------------------------------------------------------
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid references public.consultation_leads (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  company text,
  business_type text,
  product_name text not null,
  payment_method text not null default 'bank_transfer',
  payment_amount integer not null default 0,
  paid_at timestamptz not null default now(),
  service_start_date timestamptz,
  service_end_date timestamptz,
  service_status text not null default '진행중',
  admin_memo text
);

create index if not exists subscribers_created_at_idx
  on public.subscribers (created_at desc);

create index if not exists subscribers_service_status_idx
  on public.subscribers (service_status, service_end_date);

create index if not exists subscribers_consultation_id_idx
  on public.subscribers (consultation_id);

comment on table public.subscribers is '런웨이 가입자(서비스 이용 중) 명단';
comment on column public.subscribers.payment_method is 'bank_transfer | kakao_pay | card | cash | other';

-- ---------------------------------------------------------------------------
-- ended_subscribers: archived after service end (for re-marketing)
-- ---------------------------------------------------------------------------
create table if not exists public.ended_subscribers (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references public.subscribers (id) on delete set null,
  consultation_id uuid references public.consultation_leads (id) on delete set null,
  name text not null,
  phone text not null,
  company text,
  business_type text,
  product_name text not null,
  payment_amount integer not null default 0,
  service_start_date timestamptz,
  service_end_date timestamptz,
  ended_at timestamptz not null default now(),
  end_reason text,
  admin_memo text,
  created_at timestamptz not null default now()
);

create index if not exists ended_subscribers_ended_at_idx
  on public.ended_subscribers (ended_at desc);

alter table public.subscribers enable row level security;
alter table public.ended_subscribers enable row level security;
