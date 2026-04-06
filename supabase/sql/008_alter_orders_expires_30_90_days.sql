-- 이용 만료: monthly = 생성 시점 + 30일, quarterly = + 90일 (결제 API·운영 정책과 동일)
create or replace function public.set_order_expires_at()
returns trigger
language plpgsql
as $$
begin
  if new.period = 'monthly' then
    new.expires_at := coalesce(new.created_at, now()) + interval '30 days';
  elsif new.period = 'quarterly' then
    new.expires_at := coalesce(new.created_at, now()) + interval '90 days';
  elsif new.expires_at is null then
    new.expires_at := null;
  end if;
  return new;
end;
$$;
