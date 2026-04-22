-- Solapi 운영 추적용 orders 추가 컬럼
-- D-7 먼저 적용하되, D-3 / D-1 확장을 고려해 공통 컬럼을 함께 추가.

alter table if exists public.orders
  add column if not exists payment_status text,
  add column if not exists notify_7d_sent_at timestamptz,
  add column if not exists notify_3d_sent_at timestamptz,
  add column if not exists notify_1d_sent_at timestamptz,
  add column if not exists last_notify_error text,
  add column if not exists mypage_url text;

comment on column public.orders.payment_status is '결제사 기준 결제 상태값. 예: DONE, CANCELED';
comment on column public.orders.notify_7d_sent_at is 'D-7 알림톡 실제 발송 성공 시각';
comment on column public.orders.notify_3d_sent_at is 'D-3 알림톡 실제 발송 성공 시각';
comment on column public.orders.notify_1d_sent_at is 'D-1 알림톡 실제 발송 성공 시각';
comment on column public.orders.last_notify_error is '최근 알림톡 발송 실패 사유';
comment on column public.orders.mypage_url is '알림톡 CTA로 사용할 마이페이지 링크';

-- 기존 paid/working/done 주문은 우선 정상 결제로 간주하여 DONE으로 백필
update public.orders
set payment_status = 'DONE'
where payment_status is null
  and status in ('paid', 'working', 'done');

-- 운영상 최소 링크는 마이페이지로 통일
update public.orders
set mypage_url = '/mypage'
where coalesce(trim(mypage_url), '') = '';
