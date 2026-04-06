alter table if exists public.orders
  add column if not exists status text not null default 'paid';

alter table public.orders
  alter column status set default 'paid';

update public.orders
set status = case
  when status = 'working' then 'working'
  when status = 'done' then 'done'
  when status = 'active' then 'working'
  when status = 'pending' then 'paid'
  when status = 'paid' then 'paid'
  else 'paid'
end;
