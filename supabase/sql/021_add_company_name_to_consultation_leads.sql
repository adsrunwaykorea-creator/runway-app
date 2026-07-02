-- Run once in Supabase SQL Editor.
-- Add company_name column for simplified consultation lead form.

alter table public.consultation_leads
  add column if not exists company_name text;

update public.consultation_leads
set company_name = company
where company_name is null
  and company is not null;
