-- Run once in Supabase SQL Editor.
-- Adds Meta ads attribution columns to consultation_leads without changing existing rows.

alter table public.consultation_leads
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists fbclid text,
  add column if not exists landing_page text,
  add column if not exists first_utm_source text,
  add column if not exists first_utm_medium text,
  add column if not exists first_utm_campaign text,
  add column if not exists first_utm_content text,
  add column if not exists first_utm_term text,
  add column if not exists first_fbclid text,
  add column if not exists first_landing_page text,
  add column if not exists first_referrer text,
  add column if not exists first_visited_at timestamptz,
  add column if not exists last_utm_source text,
  add column if not exists last_utm_medium text,
  add column if not exists last_utm_campaign text,
  add column if not exists last_utm_content text,
  add column if not exists last_utm_term text,
  add column if not exists last_fbclid text,
  add column if not exists last_landing_page text,
  add column if not exists last_referrer text,
  add column if not exists last_visited_at timestamptz;

comment on column public.consultation_leads.utm_content is '최근(또는 대표) UTM content';
comment on column public.consultation_leads.utm_term is '최근(또는 대표) UTM term';
comment on column public.consultation_leads.fbclid is '최근(또는 대표) Meta click id';
comment on column public.consultation_leads.landing_page is '최초 랜딩 페이지 URL';
comment on column public.consultation_leads.first_visited_at is '최초 방문 시각';
comment on column public.consultation_leads.last_visited_at is '최근 광고 유입 시각';
