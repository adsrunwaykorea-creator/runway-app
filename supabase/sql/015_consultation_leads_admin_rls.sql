-- Run in Supabase SQL Editor if admin page cannot read consultation_leads.
-- Allows admin/manager accounts to view and update leads from /admin.

drop policy if exists consultation_leads_admin_select on public.consultation_leads;
drop policy if exists consultation_leads_admin_update on public.consultation_leads;

create policy consultation_leads_admin_select
  on public.consultation_leads
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and lower(profiles.role) in ('admin', 'manager')
    )
  );

create policy consultation_leads_admin_update
  on public.consultation_leads
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and lower(profiles.role) in ('admin', 'manager')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and lower(profiles.role) in ('admin', 'manager')
    )
  );
