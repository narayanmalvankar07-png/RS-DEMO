-- RightSignal Colab Section — Run this in your Supabase SQL Editor

-- Startups table
create table if not exists rs_startups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo text default '🚀',
  description text,
  website text default '',
  github_link text default '',
  social_links jsonb default '{}',
  created_by text not null,
  founders text[] default '{}',
  referral_code text unique,
  created_at timestamptz default now()
);

-- Startup pages (community, product, tech, investment, etc.)
create table if not exists rs_startup_pages (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  name text not null,
  description text default '',
  type_id text default 'community',
  created_at timestamptz default now()
);

-- Join / access requests
create table if not exists rs_page_access_requests (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  user_id text not null,
  selected_roles text[] default '{}',
  message text default '',
  status text default 'pending',
  created_at timestamptz default now()
);

-- Approved member access
create table if not exists rs_page_access (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  user_id text not null,
  status text default 'approved',
  created_at timestamptz default now(),
  unique(startup_id, user_id)
);

-- Founder updates / announcements
create table if not exists rs_startup_updates (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  content text not null,
  created_by text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security (open read, auth write — adjust as needed)
alter table rs_startups enable row level security;
alter table rs_startup_pages enable row level security;
alter table rs_page_access_requests enable row level security;
alter table rs_page_access enable row level security;
alter table rs_startup_updates enable row level security;

-- Policies: allow all for now (tighten per your auth setup)
create policy "allow_all_startups" on rs_startups for all using (true) with check (true);
create policy "allow_all_pages" on rs_startup_pages for all using (true) with check (true);
create policy "allow_all_requests" on rs_page_access_requests for all using (true) with check (true);
create policy "allow_all_access" on rs_page_access for all using (true) with check (true);
create policy "allow_all_updates" on rs_startup_updates for all using (true) with check (true);
