-- Manual backfill: 이윤우 고객 결제완료 반영
-- Supabase SQL Editor에서 실행하기 전에 아래 값을 실제 데이터에 맞게 확인하세요.

-- 1) 상담신청 건 확인 (이름·연락처로 조회)
-- select id, lead_name, phone, status, payment_status, created_at
-- from public.consultation_leads
-- where lead_name like '%이윤우%' or phone like '%이윤우%연락처%';

-- 2) 결제 신청 건 확인
-- select id, name, phone, status, payment_status, amount, created_at
-- from public.payment_requests
-- where name like '%이윤우%';

-- 3) 아래 UUID/연락처를 실제 값으로 바꾼 뒤 실행
do $$
declare
  v_lead_id uuid;
  v_request_id uuid;
  v_phone text := '01000000000'; -- TODO: 이윤우 고객 실제 연락처로 변경
  v_name text := '이윤우';
  v_amount integer := 499000;
  v_product text := '런웨이 SNS 광고관리 베이직';
  v_paid_at timestamptz := now();
  v_history_id uuid;
begin
  select id into v_lead_id
  from public.consultation_leads
  where (lead_name = v_name or lead_name like v_name || '%')
    and regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = regexp_replace(v_phone, '[^0-9]', '', 'g')
  order by created_at desc
  limit 1;

  select id into v_request_id
  from public.payment_requests
  where name = v_name
    and regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(v_phone, '[^0-9]', '', 'g')
  order by created_at desc
  limit 1;

  if v_lead_id is not null then
    update public.consultation_leads
    set
      status = '결제완료',
      payment_status = 'paid',
      paid_at = v_paid_at,
      payment_method = 'kakao_pay',
      payment_amount = v_amount,
      kakao_payment_id = coalesce(kakao_payment_id, 'manual-backfill-' || v_lead_id::text),
      updated_at = now()
    where id = v_lead_id;
  end if;

  if v_request_id is not null then
    update public.payment_requests
    set
      status = '결제완료',
      payment_status = 'paid',
      paid_at = v_paid_at,
      payment_amount = v_amount,
      kakao_tid = coalesce(kakao_tid, 'manual-backfill-' || v_request_id::text),
      consultation_lead_id = coalesce(consultation_lead_id, v_lead_id),
      updated_at = now()
    where id = v_request_id;
  end if;

  insert into public.payment_history (
    customer_name,
    customer_phone,
    company_name,
    product_name,
    amount,
    payment_method,
    payment_status,
    paid_at,
    consultation_id,
    payment_request_id,
    kakao_tid,
    partner_order_id
  )
  select
    v_name,
    v_phone,
    pr.company,
    v_product,
    v_amount,
    'kakao_pay',
    'paid',
    v_paid_at,
    v_lead_id,
    v_request_id,
    'manual-backfill-' || coalesce(v_request_id::text, v_lead_id::text, gen_random_uuid()::text),
    v_request_id::text
  from (select 1) x
  left join public.payment_requests pr on pr.id = v_request_id
  where not exists (
    select 1 from public.payment_history ph
    where ph.customer_name = v_name
      and regexp_replace(ph.customer_phone, '[^0-9]', '', 'g') = regexp_replace(v_phone, '[^0-9]', '', 'g')
      and ph.payment_status = 'paid'
      and ph.amount = v_amount
  )
  returning id into v_history_id;

  raise notice 'lead_id=%, request_id=%, history_id=%', v_lead_id, v_request_id, v_history_id;
end $$;
