-- Run once in Supabase SQL Editor (Dashboard → SQL → New query)
-- Creates consultation_leads table with all fields required by the contact form + admin dashboard.

create table if not exists public.consultation_leads (
  id uuid primary key default gen_random_uuid(),
  session_key text not null,
  business_type text not null,
  region text not null,
  monthly_budget text not null,
  goal text not null,
  contact text not null,
  created_at timestamptz not null default now(),
  source text not null default 'chatbot',
  lead_name text,
  company text,
  phone text,
  service_type text,
  raw_payload jsonb,
  message text,
  ad_channel text,
  privacy_agreed boolean not null default false,
  page_source text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  status text not null default '신규',
  admin_memo text,
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'consultation_leads_source_check'
  ) then
    alter table public.consultation_leads
      add constraint consultation_leads_source_check
      check (source in ('contact_us', 'chatbot'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'consultation_leads_status_check'
  ) then
    alter table public.consultation_leads
      add constraint consultation_leads_status_check
      check (status in ('신규', '연락완료', '상담완료', '계약완료', '보류', '부재'));
  end if;
end $$;

create index if not exists consultation_leads_created_at_idx
  on public.consultation_leads (created_at desc);

create index if not exists consultation_leads_source_idx
  on public.consultation_leads (source, created_at desc);

create index if not exists consultation_leads_status_idx
  on public.consultation_leads (status, created_at desc);

alter table public.consultation_leads enable row level security;

drop policy if exists consultation_leads_anon_insert on public.consultation_leads;

create policy consultation_leads_anon_insert
  on public.consultation_leads
  for insert
  to anon, authenticated
  with check (source in ('contact_us', 'chatbot'));

comment on table public.consultation_leads is '런웨이 상담신청/챗봇 리드';
