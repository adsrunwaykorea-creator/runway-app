-- Run once in Supabase SQL Editor.
-- Checkout no longer collects email; message is optional.

alter table public.payment_requests
  alter column email drop not null;

alter table public.payment_requests
  alter column message drop not null;

comment on column public.payment_requests.email is 'Optional; checkout no longer collects email';
comment on column public.payment_requests.message is 'Optional inquiry text from checkout';
