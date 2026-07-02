-- Run once in Supabase SQL Editor.
-- Multi-channel payment management fields for admin dashboard.

-- ---------------------------------------------------------------------------
-- payment_requests: admin workflow fields
-- ---------------------------------------------------------------------------
alter table public.payment_requests
  add column if not exists payment_channel text default 'kakao_pay',
  add column if not exists depositor_name text,
  add column if not exists tax_invoice_required boolean not null default false,
  add column if not exists admin_memo text;

comment on column public.payment_requests.payment_channel is 'bank_transfer | kakao_pay | card | cash | other';

-- ---------------------------------------------------------------------------
-- payment_history: paid customer management fields
-- ---------------------------------------------------------------------------
alter table public.payment_history
  add column if not exists business_type text,
  add column if not exists depositor_name text,
  add column if not exists tax_invoice_required boolean not null default false,
  add column if not exists service_start_date timestamptz,
  add column if not exists service_end_date timestamptz,
  add column if not exists next_payment_due_date timestamptz,
  add column if not exists management_status text not null default '서비스중',
  add column if not exists admin_memo text;

create index if not exists payment_history_management_status_idx
  on public.payment_history (management_status, paid_at desc);

create index if not exists payment_history_next_payment_due_idx
  on public.payment_history (next_payment_due_date)
  where next_payment_due_date is not null;
