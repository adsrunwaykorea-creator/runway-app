-- Optional: backfill subscribers from consultation_leads marked 가입자등록완료/가입완료
-- Run once in Supabase SQL Editor after 023_subscribers_and_ended.sql and 025_add_subscriber_registered_status.sql
-- Safe to re-run: skips consultations that already have a subscriber row.
-- Note: 결제완료는 결제 상태일 뿐 가입자 등록 완료가 아니므로 backfill 대상에서 제외합니다.

insert into public.subscribers (
  consultation_id,
  name,
  phone,
  company,
  business_type,
  product_name,
  payment_method,
  payment_amount,
  paid_at,
  service_start_date,
  service_end_date,
  service_status,
  admin_memo,
  updated_at
)
select
  cl.id,
  coalesce(nullif(trim(cl.lead_name), ''), nullif(trim(cl.phone), ''), '고객'),
  coalesce(nullif(trim(cl.phone), ''), '-'),
  coalesce(nullif(trim(cl.company_name), ''), nullif(trim(cl.company), '')),
  cl.business_type,
  coalesce(nullif(trim(cl.service_type), ''), '런웨이 SNS 광고관리 베이직'),
  'bank_transfer',
  0,
  coalesce(cl.updated_at, cl.created_at),
  coalesce(cl.updated_at, cl.created_at),
  coalesce(cl.updated_at, cl.created_at) + interval '30 days',
  '보류',
  coalesce(cl.admin_memo, '가입자 데이터 복구 (SQL)'),
  now()
from public.consultation_leads cl
where cl.status in ('가입자등록완료', '가입완료')
  and not exists (
    select 1
    from public.subscribers s
    where s.consultation_id = cl.id
  );
