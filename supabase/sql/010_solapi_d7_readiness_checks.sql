-- Solapi D-7 만료 알림 준비 상태 점검 SQL
-- 목적:
-- 1) profiles.name / profiles.phone 누락 여부 점검
-- 2) orders.user_id / expires_at / period null 및 이상치 점검
-- 3) 실제 D-7 발송 대상 미리보기

-- ------------------------------------------------------------
-- A. profiles.name / profiles.phone 누락 요약
-- ------------------------------------------------------------
select
  count(*) as profile_count,
  count(*) filter (where coalesce(trim(name), '') = '') as missing_name_count,
  count(*) filter (where coalesce(trim(phone), '') = '') as missing_phone_count,
  count(*) filter (where coalesce(trim(name), '') = '' or coalesce(trim(phone), '') = '') as missing_any_count
from public.profiles;

-- 누락 상세 목록 (최근 orders 기준으로 우선 확인)
select
  o.id as order_id,
  o.user_id,
  o.service,
  o.period,
  o.status,
  o.expires_at,
  p.name,
  p.phone
from public.orders o
left join public.profiles p
  on p.id = o.user_id
where
  p.id is null
  or coalesce(trim(p.name), '') = ''
  or coalesce(trim(p.phone), '') = ''
order by o.created_at desc nulls last;

-- ------------------------------------------------------------
-- B. orders 핵심 컬럼 null / 이상치 점검
-- ------------------------------------------------------------
select
  count(*) as order_count,
  count(*) filter (where user_id is null) as missing_user_id_count,
  count(*) filter (where expires_at is null) as missing_expires_at_count,
  count(*) filter (where period is null) as missing_period_count,
  count(*) filter (where period is not null and period not in ('monthly', 'quarterly')) as invalid_period_count,
  count(*) filter (where status is null) as missing_status_count,
  count(*) filter (where payment_status is null) as missing_payment_status_count
from public.orders;

-- 이상치 상세 목록
select
  id as order_id,
  user_id,
  email,
  service,
  service_key,
  period,
  status,
  payment_status,
  price,
  created_at,
  expires_at,
  notify_7d,
  notify_3d,
  notify_1d,
  mypage_url
from public.orders
where
  user_id is null
  or expires_at is null
  or period is null
  or period not in ('monthly', 'quarterly')
  or status is null
order by created_at desc nulls last;

-- ------------------------------------------------------------
-- C. D-7 발송 대상 미리보기
-- 기준: expires_at <= now() + 7 days, expires_at > now() + 3 days, notify_7d = false
-- ------------------------------------------------------------
select
  o.id as order_id,
  o.user_id,
  p.name as customer_name,
  p.phone as phone,
  o.service,
  o.period,
  o.status,
  o.payment_status,
  o.expires_at,
  o.notify_7d,
  o.mypage_url
from public.orders o
left join public.profiles p
  on p.id = o.user_id
where
  o.notify_7d = false
  and o.expires_at is not null
  and o.expires_at > now() + interval '3 days'
  and o.expires_at <= now() + interval '7 days'
order by o.expires_at asc;

-- ------------------------------------------------------------
-- D. 실제 발송 불가 대상 미리보기
-- D-7 범위에 들어오지만 이름/전화번호/profile/user_id 누락으로 실패할 건들
-- ------------------------------------------------------------
select
  o.id as order_id,
  o.user_id,
  p.name as customer_name,
  p.phone,
  o.service,
  o.period,
  o.expires_at,
  case
    when o.user_id is null then 'missing_user_id'
    when p.id is null then 'missing_profile'
    when coalesce(trim(p.name), '') = '' then 'missing_name'
    when coalesce(trim(p.phone), '') = '' then 'missing_phone'
    else 'unknown'
  end as blocking_reason
from public.orders o
left join public.profiles p
  on p.id = o.user_id
where
  o.notify_7d = false
  and o.expires_at is not null
  and o.expires_at > now() + interval '3 days'
  and o.expires_at <= now() + interval '7 days'
  and (
    o.user_id is null
    or p.id is null
    or coalesce(trim(p.name), '') = ''
    or coalesce(trim(p.phone), '') = ''
  )
order by o.expires_at asc;
