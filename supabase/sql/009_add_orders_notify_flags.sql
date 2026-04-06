-- 만료 알림 발송 여부 (크론 renew-notify)
alter table if exists public.orders
  add column if not exists notify_7d boolean not null default false,
  add column if not exists notify_3d boolean not null default false,
  add column if not exists notify_1d boolean not null default false;
