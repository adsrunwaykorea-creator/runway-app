alter table if exists public.orders
  add column if not exists expires_at timestamptz;

update public.orders
set expires_at = case
  when period = 'monthly' then created_at + interval '1 month'
  when period = 'quarterly' then created_at + interval '3 months'
  else expires_at
end
where expires_at is null;

create or replace function public.set_order_expires_at()
returns trigger
language plpgsql
as $$
begin
  if new.period = 'monthly' then
    new.expires_at := coalesce(new.created_at, now()) + interval '1 month';
  elsif new.period = 'quarterly' then
    new.expires_at := coalesce(new.created_at, now()) + interval '3 months';
  elsif new.expires_at is null then
    new.expires_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_order_expires_at on public.orders;
create trigger trg_set_order_expires_at
before insert or update of period, created_at
on public.orders
for each row
execute function public.set_order_expires_at();
