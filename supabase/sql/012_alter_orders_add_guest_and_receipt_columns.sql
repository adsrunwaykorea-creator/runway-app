-- 비회원 결제/확인서 발송 추적 컬럼
alter table if exists public.orders
  add column if not exists is_guest boolean not null default false,
  add column if not exists guest_name text,
  add column if not exists guest_phone text,
  add column if not exists receipt_channel text,
  add column if not exists receipt_sent boolean not null default false,
  add column if not exists receipt_sent_at timestamptz,
  add column if not exists receipt_last_error text;

update public.orders
set is_guest = case
  when user_id is null then true
  else false
end
where is_guest is distinct from (user_id is null);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_receipt_channel_check'
  ) then
    alter table public.orders
      add constraint orders_receipt_channel_check
      check (
        receipt_channel is null
        or receipt_channel in ('kakao', 'sms')
      );
  end if;
end $$;
