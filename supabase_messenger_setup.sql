-- RightSignal Messenger Setup — Run this in your Supabase SQL Editor

-- 1. Conversations table
create table if not exists rs_conversations (
  id uuid primary key default gen_random_uuid(),
  name text,
  is_group boolean default false,
  created_by text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists rs_conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references rs_conversations(id) on delete cascade,
  user_id text not null,
  created_at timestamptz default now(),
  last_read_at timestamptz,
  unique(conversation_id, user_id)
);

alter table rs_conversation_participants add column if not exists last_read_at timestamptz;

-- 3. Conversation messages
create table if not exists rs_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references rs_conversations(id) on delete cascade,
  user_id text not null,
  content text not null,
  created_at timestamptz default now()
);

-- 4. User notifications
create table if not exists rs_notifications (
  id uuid primary key default gen_random_uuid(),
  uid text not null,
  type text not null,
  msg text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- 5. Align requests and alignments
create table if not exists rs_align_requests (
  id uuid primary key default gen_random_uuid(),
  requester_uid text not null,
  target_uid text not null,
  status text default 'pending',
  created_at timestamptz default now(),
  unique(requester_uid, target_uid)
);

create table if not exists rs_alignments (
  id uuid primary key default gen_random_uuid(),
  follower_uid text not null,
  following_uid text not null,
  created_at timestamptz default now(),
  unique(follower_uid, following_uid)
);

-- Enable Row Level Security (RLS)
alter table rs_conversations enable row level security;
alter table rs_conversation_participants enable row level security;
alter table rs_conversation_messages enable row level security;
alter table rs_notifications enable row level security;
alter table rs_align_requests enable row level security;
alter table rs_alignments enable row level security;

-- Policies: allow all operations for public-facing sandbox
drop policy if exists "allow_all_conversations" on rs_conversations;
drop policy if exists "allow_all_participants" on rs_conversation_participants;
drop policy if exists "allow_all_messages" on rs_conversation_messages;
drop policy if exists "allow_all_notifications" on rs_notifications;
drop policy if exists "allow_all_align_requests" on rs_align_requests;
drop policy if exists "allow_all_alignments" on rs_alignments;

create policy "allow_all_conversations" on rs_conversations for all using (true) with check (true);
create policy "allow_all_participants" on rs_conversation_participants for all using (true) with check (true);
create policy "allow_all_messages" on rs_conversation_messages for all using (true) with check (true);
create policy "allow_all_notifications" on rs_notifications for all using (true) with check (true);
create policy "allow_all_align_requests" on rs_align_requests for all using (true) with check (true);
create policy "allow_all_alignments" on rs_alignments for all using (true) with check (true);
