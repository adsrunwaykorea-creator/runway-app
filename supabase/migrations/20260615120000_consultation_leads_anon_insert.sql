-- Allow lead form API to insert via anon key fallback (insert-only; no public read).

alter table if exists public.consultation_leads enable row level security;

drop policy if exists consultation_leads_anon_insert on public.consultation_leads;

create policy consultation_leads_anon_insert
  on public.consultation_leads
  for insert
  to anon, authenticated
  with check (source in ('contact_us', 'chatbot'));
