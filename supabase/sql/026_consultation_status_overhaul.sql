-- Run once in Supabase SQL Editor after 023/025 migrations.
-- New consultation_leads status model:
--   신규, 상담중, 연락완료, 결제완료, 상담종료, 가입자등록완료

-- Migrate legacy statuses
update public.consultation_leads
set status = '상담중', updated_at = now()
where status in ('상담완료', '부재', '보류');

update public.consultation_leads
set status = '상담종료', updated_at = now()
where status = '계약완료';

update public.consultation_leads
set status = '가입자등록완료', updated_at = now()
where status = '가입완료';

alter table public.consultation_leads drop constraint if exists consultation_leads_status_check;

alter table public.consultation_leads
  add constraint consultation_leads_status_check
  check (status in (
    '신규', '상담중', '연락완료', '결제완료', '상담종료', '가입자등록완료'
  ));
