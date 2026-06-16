-- Admin dashboard fields for consultation leads.

alter table if exists public.consultation_leads
  add column if not exists message text,
  add column if not exists ad_channel text,
  add column if not exists privacy_agreed boolean not null default false,
  add column if not exists page_source text,
  add column if not exists referrer text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists status text not null default '신규',
  add column if not exists admin_memo text,
  add column if not exists updated_at timestamptz not null default now();

update public.consultation_leads
set
  ad_channel = coalesce(ad_channel, service_type),
  message = coalesce(message, nullif(goal, '')),
  page_source = coalesce(page_source, raw_payload->>'source', source),
  status = coalesce(nullif(status, ''), '신규')
where ad_channel is null
   or message is null
   or page_source is null
   or status is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'consultation_leads_status_check'
  ) then
    alter table public.consultation_leads
      add constraint consultation_leads_status_check
      check (status in ('신규', '연락완료', '상담완료', '계약완료', '보류', '부재'));
  end if;
end $$;

create index if not exists consultation_leads_status_idx
  on public.consultation_leads (status, created_at desc);

create index if not exists consultation_leads_created_month_idx
  on public.consultation_leads (created_at desc);
