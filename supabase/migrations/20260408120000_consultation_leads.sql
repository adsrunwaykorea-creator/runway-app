-- Run in Supabase SQL editor or via CLI.
-- MVP: consultation_leads for chatbot 상담 신청.

create table if not exists public.consultation_leads (
  id uuid primary key default gen_random_uuid(),
  session_key text not null,
  business_type text not null,
  region text not null,
  monthly_budget text not null,
  goal text not null,
  contact text not null,
  created_at timestamptz not null default now()
);

comment on table public.consultation_leads is '런웨이 챗봇 맞춤 상담 리드 (MVP)';

create index if not exists consultation_leads_created_at_idx on public.consultation_leads (created_at desc);

-- Optional: chatbot_messages for future analytics (not written by app yet)
create table if not exists public.chatbot_messages (
  id uuid primary key default gen_random_uuid(),
  session_key text not null,
  role text not null,
  message text not null,
  category text,
  created_at timestamptz not null default now()
);

comment on table public.chatbot_messages is '챗봇 대화 로그 (선택, 앱에서 미사용 시 비워 둠)';
