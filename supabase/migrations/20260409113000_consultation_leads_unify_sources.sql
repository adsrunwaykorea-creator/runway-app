-- Unify Contact Us + Chatbot lead storage into consultation_leads.

alter table if exists public.consultation_leads
  add column if not exists source text not null default 'chatbot',
  add column if not exists lead_name text,
  add column if not exists company text,
  add column if not exists phone text,
  add column if not exists service_type text,
  add column if not exists raw_payload jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'consultation_leads_source_check'
  ) then
    alter table public.consultation_leads
      add constraint consultation_leads_source_check
      check (source in ('contact_us', 'chatbot'));
  end if;
end $$;

create index if not exists consultation_leads_source_idx
  on public.consultation_leads (source, created_at desc);
