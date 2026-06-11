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
  location text,
  phone text,
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

-- ==============================================================================
-- 10. FUNDING & INVESTOR PORTAL
-- ==============================================================================

CREATE TABLE IF NOT EXISTS rs_funding_applications (
  id uuid primary key default gen_random_uuid(),
  uid uuid references auth.users(id) on delete cascade,
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS rs_investors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo text,
  stage text,
  check_size text,
  location text default 'Global',
  sectors jsonb default '[]'::jsonb,
  description text,
  type text default 'VCs',
  created_at timestamp with time zone default now()
);

-- Ensure type and location columns exist if table was already created
ALTER TABLE rs_investors ADD COLUMN IF NOT EXISTS type text DEFAULT 'VCs';
ALTER TABLE rs_investors ADD COLUMN IF NOT EXISTS location text DEFAULT 'Global';

-- Seed diverse funding sources if table is empty
INSERT INTO rs_investors (name, logo, stage, check_size, location, sectors, description, type)
VALUES 
('Peak XV Partners', '🏔️', 'Seed to Series C', '$1M - $8M', 'India', '["SaaS", "AI", "Fintech", "Consumer"]'::jsonb, 'Peak XV Partners is a leading venture capital firm investing across India, South East Asia and beyond. We partner with founders to build legendary companies.', 'VCs'),
('Accel Partners', '⚡', 'Pre-seed to Series B', '$500K - $4M', 'Global', '["SaaS", "AI", "Enterprise Software", "HealthTech"]'::jsonb, 'Accel is a global venture capital firm that acts as the first partner to exceptional teams, from inception through all phases of growth.', 'VCs'),
('Y Combinator', '🍊', 'Pre-seed / Seed', '$500K (Standard Terms)', 'Global', '["All Sectors", "AI", "SaaS", "Web3", "ClimateTech"]'::jsonb, 'Y Combinator is a startup accelerator that launches twice a year. We invest $500k in a large number of startups and work with them for three months.', 'Accelerators'),
('Naval Ravikant', '🦅', 'Pre-seed / Seed', '$50K - $250K', 'United States', '["AI", "SaaS", "Web3", "DeepTech"]'::jsonb, 'Prolific angel investor and co-founder of AngelList. Investing in early-stage startups with strong technical leverage.', 'Angels'),
('Premji Invest', '🏢', 'Series A to Growth', '$5M - $20M', 'India', '["AI", "SaaS", "Consumer", "Healthcare"]'::jsonb, 'The investment office of Azim Premji, partnering with exceptional entrepreneurs to build long-term value.', 'Family Offices'),
('National Science Foundation', '🎓', 'Pre-seed / R&D', '$250K - $1M', 'United States', '["Biotech", "DeepTech", "ClimateTech"]'::jsonb, 'Government research grants supporting commercialization of highly innovative, high-impact scientific and engineering technologies.', 'Grants'),
('Svea Funding', '💳', 'Post-revenue', '$100K - $2M', 'Europe', '["SaaS", "E-commerce", "Marketplace"]'::jsonb, 'Non-dilutive venture debt and revenue-based financing for scaling subscription and recurring revenue startups.', 'Debt'),
('Kickstarter Campaign', '📢', 'Idea to Prototype', '$10K - $500K', 'Global', '["Consumer", "Hardware", "Design", "Software"]'::jsonb, 'Community-backed reward crowdfunding platform to launch creative and consumer product ideas directly to backers.', 'Crowdfunding'),
('Founders Fund', '🦅', 'Seed to Growth', '$1M - $15M', 'United States', '["AI", "Aerospace", "DeepTech", "Enterprise Software"]'::jsonb, 'Venture capital firm investing in science and technology companies solving difficult problems.', 'VCs'),
('Kalaari Capital', '🎨', 'Seed to Series A', '$500K - $2.5M', 'India', '["SaaS", "Fintech", "E-commerce", "Consumer"]'::jsonb, 'Kalaari Capital is an early-stage, technology-focused venture capital firm with a strong commitment to partnering with outstanding entrepreneurs.', 'VCs'),
('Tata Trusts', '🦁', 'Idea to Series A', '$100K - $1M', 'India', '["HealthTech", "ClimateTech", "Biotech", "Agritech"]'::jsonb, 'Philanthropic family office and grant provider backing technology that solves critical social problems.', 'Family Offices'),
('Sequoia Capital (US)', '🌲', 'Seed to Series C', '$2M - $15M', 'United States', '["AI", "SaaS", "Fintech", "Web3"]'::jsonb, 'Leading venture capital firm helping bold founders build legendary companies from idea to IPO.', 'VCs'),
('Lishana Angels', '🌟', 'Idea to Pre-seed', '$25K - $150K', 'Europe', '["AI", "SaaS", "Fintech", "Marketplace"]'::jsonb, 'An angel network backing early-stage developers, designers and technical founders across Europe.', 'Angels'),
('Antler Global', '🦌', 'Idea / Pre-seed', '$100K - $250K', 'Global', '["SaaS", "Fintech", "AI", "Marketplace"]'::jsonb, 'Global startup generator and early-stage VC enabling extraordinary people to build defining companies.', 'Accelerators'),
('VentureSouq', '🌴', 'Seed to Series B', '$250K - $2M', 'Europe', '["Fintech", "Web3", "SaaS"]'::jsonb, 'A venture capital firm focused on early-stage technology companies with global scalability.', 'VCs'),
('Indie.vc', '🎸', 'MVP to Post-revenue', '$100K - $500K', 'United States', '["SaaS", "E-commerce", "Consumer Tech"]'::jsonb, 'A pilot program designed to fund revenue-generating startups focusing on profitability over VC scale.', 'Debt')
ON CONFLICT (name) DO NOTHING;

-- Optional: Enable RLS (Row Level Security) and add basic open policies for testing. 
-- You might want to lock this down later for production.

-- Ensure startup location and phone columns exist
ALTER TABLE rs_startups ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE rs_startups ADD COLUMN IF NOT EXISTS phone text;

