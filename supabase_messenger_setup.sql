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

-- 2. Conversation participants
create table if not exists rs_conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references rs_conversations(id) on delete cascade,
  user_id text not null,
  created_at timestamptz default now(),
  unique(conversation_id, user_id)
);

-- 3. Conversation messages
create table if not exists rs_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references rs_conversations(id) on delete cascade,
  user_id text not null,
  content text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table rs_conversations enable row level security;
alter table rs_conversation_participants enable row level security;
alter table rs_conversation_messages enable row level security;

-- Policies: allow all operations for public-facing sandbox
create policy "allow_all_conversations" on rs_conversations for all using (true) with check (true);
create policy "allow_all_participants" on rs_conversation_participants for all using (true) with check (true);
create policy "allow_all_messages" on rs_conversation_messages for all using (true) with check (true);
