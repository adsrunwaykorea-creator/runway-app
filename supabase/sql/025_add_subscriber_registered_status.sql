-- Run once in Supabase SQL Editor after 023_subscribers_and_ended.sql
-- Adds 가입자등록완료 status (distinct from 결제완료 payment status)

alter table public.consultation_leads drop constraint if exists consultation_leads_status_check;

alter table public.consultation_leads
  add constraint consultation_leads_status_check
  check (status in (
    '신규', '연락완료', '상담완료', '계약완료', '보류', '부재',
    '결제완료', '가입완료', '가입자등록완료'
  ));

-- Optional: migrate legacy 가입완료 rows that already have a subscriber row
update public.consultation_leads cl
set status = '가입자등록완료', updated_at = now()
where cl.status = '가입완료'
  and exists (
    select 1 from public.subscribers s where s.consultation_id = cl.id
  );
