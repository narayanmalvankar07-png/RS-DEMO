-- ==============================================================================
-- RS DEMO COMPLETE SUPABASE SQL SCHEMA
-- Run this entire script in your Supabase SQL Editor.
-- It will safely create all missing tables for the Colab and User profiles.
-- ==============================================================================

-- 1. USER PROFILES
CREATE TABLE IF NOT EXISTS rs_user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  handle text,
  bio text,
  avatar text,
  avatar_url text,
  verified boolean DEFAULT false,
  social_links jsonb DEFAULT '{}',
  updated_at timestamp with time zone,
  website text,
  ref_code text unique,
  referred_by uuid references auth.users(id),
  -- Role & onboarding fields
  role text,                         -- display role label e.g. "Founder"
  who text,                          -- onboarding persona id e.g. "founder"
  interests jsonb DEFAULT '[]',      -- list of interest ids
  is_admin boolean DEFAULT false,
  system_role text DEFAULT 'user'    -- user, admin, growth_catalyst, management
);

-- ==============================================================================
-- 2. STARTUPS & COLAB BASE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS rs_startups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo text,
  description text,
  website text,
  github_link text,
  social_links jsonb default '{}',
  created_by uuid references auth.users(id),
  founders uuid[] default '{}',
  referral_code text unique,
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS rs_startup_updates (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  content text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS rs_startup_feedback (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  user_id uuid references auth.users(id),
  content text,
  created_at timestamp with time zone default now()
);

-- ==============================================================================
-- 3. STARTUP PAGES & ACCESS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS rs_startup_pages (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  name text not null,
  description text,
  type_id text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS rs_page_access_requests (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  page_id uuid references rs_startup_pages(id) on delete cascade,
  user_id uuid references auth.users(id),
  selected_roles text[] default '{}',
  message text,
  status text default 'pending', -- pending, approved, rejected
  page_name text,
  page_type_id text,
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS rs_page_access (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  page_id uuid references rs_startup_pages(id) on delete cascade,
  user_id uuid references auth.users(id),
  status text default 'approved',
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS rs_startup_member_roles (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role_id text not null, -- developer, designer, marketer, investor, advisor, cofounder
  created_at timestamp with time zone default now(),
  unique(startup_id, user_id, role_id)
);

CREATE TABLE IF NOT EXISTS rs_saved_startups (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(startup_id, user_id)
);

CREATE TABLE IF NOT EXISTS rs_page_members (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  page_id uuid references rs_startup_pages(id) on delete cascade,
  user_id uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now(),
  unique(page_id, user_id)
);

CREATE TABLE IF NOT EXISTS rs_page_member_roles (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  page_id uuid references rs_startup_pages(id) on delete cascade,
  user_id uuid references auth.users(id),
  role_id text, -- admin, moderator, member
  created_at timestamp with time zone default now(),
  unique(page_id, user_id)
);

CREATE TABLE IF NOT EXISTS rs_page_settings (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  page_id uuid references rs_startup_pages(id) on delete cascade,
  calendly_url text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now(),
  unique(page_id)
);

-- ==============================================================================
-- 4. PAGE FEATURES (Chat, Tasks, Files, Meetings)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS rs_page_messages (
  id text primary key default gen_random_uuid()::text,
  startup_id uuid references rs_startups(id) on delete cascade,
  page_id uuid references rs_startup_pages(id) on delete cascade,
  user_id uuid references auth.users(id),
  content text not null,
  reply_to_id text,
  reply_to_content text,
  reply_to_user uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS rs_page_tasks (
  id text primary key,
  page_id uuid references rs_startup_pages(id) on delete cascade,
  title text not null,
  assignee_id text,
  priority text default 'medium',
  status text default 'todo', -- todo, in_progress, done
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS rs_page_files (
  id text primary key default gen_random_uuid()::text,
  startup_id uuid references rs_startups(id) on delete cascade,
  page_id uuid references rs_startup_pages(id) on delete cascade,
  name text not null,
  size bigint,
  type text,
  uploaded_by uuid references auth.users(id),
  data_url text,
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS rs_page_meetings (
  id text primary key default gen_random_uuid()::text,
  startup_id uuid references rs_startups(id) on delete cascade,
  page_id uuid references rs_startup_pages(id) on delete cascade,
  title text not null,
  meeting_date text,
  meeting_time text,
  platform text default 'google_meet',
  link text,
  agenda text,
  with_note text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

-- ==============================================================================
-- 5. FEED & SOCIAL FEATURES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS rs_posts (
  id text primary key, -- Text because the frontend uses genId() which is a small string
  uid uuid references auth.users(id) on delete cascade,
  text text,
  media jsonb default '[]',
  location text,
  hashtags jsonb default '[]',
  like_count integer default 0,
  repost_count integer default 0,
  reposted_by uuid references auth.users(id),
  quote_text text,
  original_post_id text references rs_posts(id) on delete set null,
  is_sponsored boolean default false,
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS rs_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id text references rs_posts(id) on delete cascade,
  uid uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(post_id, uid)
);

CREATE TABLE IF NOT EXISTS rs_comments (
  id text primary key, -- Assume generated ID by genId() for frontend compat
  post_id text references rs_posts(id) on delete cascade,
  uid uuid references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS rs_notifications (
  id text primary key,
  uid uuid references auth.users(id) on delete cascade,
  type text not null, -- like, repost, quote, comment
  msg text not null,
  post_id text references rs_posts(id) on delete cascade,
  comment_id text,
  comment_text text,
  profile_id uuid references auth.users(id) on delete cascade,
  read boolean default false,
  created_at timestamp with time zone default now()
);

-- ==============================================================================
-- 6. WALLET & REFERRALS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS rs_token_balances (
  uid uuid primary key references auth.users(id) on delete cascade,
  balance integer default 0,
  updated_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS rs_token_txns (
  id uuid primary key default gen_random_uuid(),
  uid uuid references auth.users(id) on delete cascade,
  type text not null, -- earn, spend
  amount integer not null,
  description text,
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS rs_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_uid uuid references auth.users(id) on delete cascade,
  referee_uid uuid references auth.users(id) on delete cascade,
  code_used text,
  created_at timestamp with time zone default now(),
  unique(referee_uid)
);

-- ==============================================================================
-- 7. SANDBOX
-- ==============================================================================

CREATE TABLE IF NOT EXISTS rs_sandbox (
  id uuid primary key default gen_random_uuid(),
  uid uuid references auth.users(id) on delete cascade,
  title text not null,
  problem text not null,
  solution text,
  audience text,
  status text default 'submitted',
  score_w1 numeric,
  score_w2 numeric,
  score_w3 numeric,
  created_at timestamp with time zone default now()
);

-- ==============================================================================
-- 8. EVENTS & CONTRIBUTIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS rs_events (
  id uuid primary key default gen_random_uuid(),
  category text,
  is_free boolean default true,
  title text not null,
  description text,
  event_date timestamp with time zone,
  timezone text,
  popularity integer default 0,
  url text,
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS rs_contributions (
  id uuid primary key default gen_random_uuid(),
  uid uuid references auth.users(id) on delete cascade,
  type text not null, -- idea, article, tool
  title text not null,
  body text,
  upvotes integer default 0,
  downvotes integer default 0,
  created_at timestamp with time zone default now()
);

-- ==============================================================================
-- 9. MESSAGING & ALIGNMENT
-- ==============================================================================

CREATE TABLE IF NOT EXISTS rs_conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean default false,
  name text,
  last_message text,
  last_message_at timestamp with time zone,
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS rs_conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references rs_conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  last_read_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS rs_conversation_messages (
  id text primary key, -- Text because frontend uses client-side crypto.randomUUID()
  conversation_id uuid references rs_conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  content text,
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS rs_align_requests (
  id uuid primary key default gen_random_uuid(),
  requester_uid uuid references auth.users(id) on delete cascade,
  target_uid uuid references auth.users(id) on delete cascade,
  status text default 'pending', -- pending, accepted, rejected
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS rs_alignments (
  id uuid primary key default gen_random_uuid(),
  follower_uid uuid references auth.users(id) on delete cascade,
  following_uid uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(follower_uid, following_uid)
);

-- Optional: Enable RLS (Row Level Security) and add basic open policies for testing. 
-- You might want to lock this down later for production.
