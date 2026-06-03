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

-- 6. Granular, Secure RLS Policies

-- rs_conversations
create policy "rs_conversations_select" on rs_conversations for select
  using (auth.uid()::text = created_by or id in (
    select conversation_id from rs_conversation_participants where user_id = auth.uid()::text
  ));
create policy "rs_conversations_insert" on rs_conversations for insert
  with check (auth.uid()::text = created_by);
create policy "rs_conversations_update" on rs_conversations for update
  using (auth.uid()::text = created_by);
create policy "rs_conversations_delete" on rs_conversations for delete
  using (auth.uid()::text = created_by);

-- rs_conversation_participants
create policy "rs_participants_select" on rs_conversation_participants for select
  using (conversation_id in (
    select conversation_id from rs_conversation_participants where user_id = auth.uid()::text
  ) or user_id = auth.uid()::text);
create policy "rs_participants_insert" on rs_conversation_participants for insert
  with check (auth.uid()::text = user_id or conversation_id in (
    select id from rs_conversations where created_by = auth.uid()::text
  ));
create policy "rs_participants_update" on rs_conversation_participants for update
  using (auth.uid()::text = user_id);
create policy "rs_participants_delete" on rs_conversation_participants for delete
  using (auth.uid()::text = user_id);

-- rs_conversation_messages
create policy "rs_messages_select" on rs_conversation_messages for select
  using (conversation_id in (
    select conversation_id from rs_conversation_participants where user_id = auth.uid()::text
  ));
create policy "rs_messages_insert" on rs_conversation_messages for insert
  with check (auth.uid()::text = user_id and conversation_id in (
    select conversation_id from rs_conversation_participants where user_id = auth.uid()::text
  ));
create policy "rs_messages_update" on rs_conversation_messages for update
  using (auth.uid()::text = user_id);
create policy "rs_messages_delete" on rs_conversation_messages for delete
  using (auth.uid()::text = user_id);

-- rs_notifications
create policy "rs_notifications_select" on rs_notifications for select
  using (auth.uid()::text = uid);
create policy "rs_notifications_insert" on rs_notifications for insert
  with check (true);
create policy "rs_notifications_update" on rs_notifications for update
  using (auth.uid()::text = uid);
create policy "rs_notifications_delete" on rs_notifications for delete
  using (auth.uid()::text = uid);

-- rs_align_requests
create policy "rs_align_requests_select" on rs_align_requests for select
  using (auth.uid()::text = requester_uid or auth.uid()::text = target_uid);
create policy "rs_align_requests_insert" on rs_align_requests for insert
  with check (auth.uid()::text = requester_uid);
create policy "rs_align_requests_update" on rs_align_requests for update
  using (auth.uid()::text = requester_uid or auth.uid()::text = target_uid);
create policy "rs_align_requests_delete" on rs_align_requests for delete
  using (auth.uid()::text = requester_uid or auth.uid()::text = target_uid);

-- rs_alignments
create policy "rs_alignments_select" on rs_alignments for select
  using (true);
create policy "rs_alignments_insert" on rs_alignments for insert
  with check (auth.uid()::text = follower_uid);
create policy "rs_alignments_delete" on rs_alignments for delete
  using (auth.uid()::text = follower_uid);
