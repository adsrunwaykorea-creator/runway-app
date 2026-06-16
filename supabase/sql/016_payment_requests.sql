-- Kakao Pay review / pre-payment checkout requests

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id text not null,
  product_name text not null,
  amount integer not null,
  vat_included boolean not null default true,
  service_period_days integer not null default 30,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  business_name text,
  business_type text,
  message text,
  payment_method text not null default 'kakao_pay',
  status text not null default 'pending',
  privacy_agreed boolean not null default false,
  terms_agreed boolean not null default false
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payment_requests_status_check'
  ) then
    alter table public.payment_requests
      add constraint payment_requests_status_check
      check (status in ('pending', 'contacted', 'paid', 'cancelled'));
  end if;
end $$;

create index if not exists payment_requests_created_at_idx
  on public.payment_requests (created_at desc);

alter table public.payment_requests enable row level security;

drop policy if exists payment_requests_anon_insert on public.payment_requests;

create policy payment_requests_anon_insert
  on public.payment_requests
  for insert
  to anon, authenticated
  with check (
    privacy_agreed = true
    and terms_agreed = true
    and payment_method = 'kakao_pay'
  );

comment on table public.payment_requests is '카카오페이 등 결제 신청(심사·사전접수)';
