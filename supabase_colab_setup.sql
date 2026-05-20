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
  created_by text,
  created_at timestamptz default now()
);

-- Join / access requests
create table if not exists rs_page_access_requests (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  user_id text not null,
  page_id uuid references rs_startup_pages(id) on delete cascade,
  page_name text default '',
  page_type_id text default '',
  selected_roles text[] default '{}',
  message text default '',
  status text default 'pending',
  created_at timestamptz default now()
);

alter table rs_page_access_requests add column if not exists page_id uuid references rs_startup_pages(id) on delete cascade;
alter table rs_page_access_requests add column if not exists page_name text default '';
alter table rs_page_access_requests add column if not exists page_type_id text default '';

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

-- Startup feedback (visible to all, writable by all logged-in users)
create table if not exists rs_startup_feedback (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  user_id text not null,
  content text not null,
  created_at timestamptz default now()
);

-- Page members (page-level access)
create table if not exists rs_page_members (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  page_id uuid references rs_startup_pages(id) on delete cascade,
  user_id text not null,
  created_by text,
  created_at timestamptz default now(),
  unique(page_id, user_id)
);

-- Page member roles
create table if not exists rs_page_member_roles (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  page_id uuid references rs_startup_pages(id) on delete cascade,
  user_id text not null,
  role_id text not null,
  created_at timestamptz default now(),
  unique(page_id, user_id)
);

-- Startup member roles
create table if not exists rs_startup_member_roles (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  user_id text not null,
  role_id text not null,
  created_at timestamptz default now(),
  unique(startup_id, user_id, role_id)
);

-- Page tasks
create table if not exists rs_page_tasks (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  page_id uuid references rs_startup_pages(id) on delete cascade,
  title text not null,
  assignee_id text default '',
  priority text default 'medium',
  status text default 'todo',
  created_by text not null,
  created_at timestamptz default now()
);

-- Page files
create table if not exists rs_page_files (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  page_id uuid references rs_startup_pages(id) on delete cascade,
  name text not null,
  size bigint default 0,
  type text default '',
  uploaded_by text not null,
  data_url text default '',
  created_at timestamptz default now()
);

-- Page settings
create table if not exists rs_page_settings (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  page_id uuid references rs_startup_pages(id) on delete cascade unique,
  calendly_url text default '',
  created_by text,
  updated_at timestamptz default now()
);

-- Saved startups
create table if not exists rs_saved_startups (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references rs_startups(id) on delete cascade,
  user_id text not null,
  created_at timestamptz default now(),
  unique(startup_id, user_id)
);

-- Enable Row Level Security (open read, auth write — adjust as needed)
alter table rs_startups enable row level security;
alter table rs_startup_pages enable row level security;
alter table rs_page_access_requests enable row level security;
alter table rs_page_access enable row level security;
alter table rs_startup_updates enable row level security;
alter table rs_startup_feedback enable row level security;
alter table rs_page_members enable row level security;
alter table rs_page_member_roles enable row level security;
alter table rs_startup_member_roles enable row level security;
alter table rs_page_tasks enable row level security;
alter table rs_page_files enable row level security;
alter table rs_page_settings enable row level security;
alter table rs_saved_startups enable row level security;

-- Policies: allow all for now (tighten per your auth setup)
drop policy if exists "allow_all_startups" on rs_startups;
drop policy if exists "allow_all_pages" on rs_startup_pages;
drop policy if exists "allow_all_requests" on rs_page_access_requests;
drop policy if exists "allow_all_access" on rs_page_access;
drop policy if exists "allow_all_updates" on rs_startup_updates;
drop policy if exists "allow_all_feedback" on rs_startup_feedback;
drop policy if exists "allow_all_page_members" on rs_page_members;
drop policy if exists "allow_all_page_member_roles" on rs_page_member_roles;
drop policy if exists "allow_all_startup_member_roles" on rs_startup_member_roles;
drop policy if exists "allow_all_page_tasks" on rs_page_tasks;
drop policy if exists "allow_all_page_files" on rs_page_files;
drop policy if exists "allow_all_page_settings" on rs_page_settings;
drop policy if exists "allow_all_saved_startups" on rs_saved_startups;

create policy "allow_all_startups" on rs_startups for all using (true) with check (true);
create policy "allow_all_pages" on rs_startup_pages for all using (true) with check (true);
create policy "allow_all_requests" on rs_page_access_requests for all using (true) with check (true);
create policy "allow_all_access" on rs_page_access for all using (true) with check (true);
create policy "allow_all_updates" on rs_startup_updates for all using (true) with check (true);
create policy "allow_all_feedback" on rs_startup_feedback for all using (true) with check (true);
create policy "allow_all_page_members" on rs_page_members for all using (true) with check (true);
create policy "allow_all_page_member_roles" on rs_page_member_roles for all using (true) with check (true);
create policy "allow_all_startup_member_roles" on rs_startup_member_roles for all using (true) with check (true);
create policy "allow_all_page_tasks" on rs_page_tasks for all using (true) with check (true);
create policy "allow_all_page_files" on rs_page_files for all using (true) with check (true);
create policy "allow_all_page_settings" on rs_page_settings for all using (true) with check (true);
create policy "allow_all_saved_startups" on rs_saved_startups for all using (true) with check (true);

-- Page meetings table
create table if not exists rs_page_meetings (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references rs_startup_pages(id) on delete cascade,
  startup_id uuid references rs_startups(id) on delete cascade,
  created_by text not null,
  title text not null,
  meeting_date text not null,
  meeting_time text not null,
  platform text default 'google_meet',
  link text default '',
  agenda text default '',
  with_note text default '',
  created_at timestamptz default now()
);

alter table rs_page_meetings add column if not exists page_id uuid references rs_startup_pages(id) on delete cascade;
alter table rs_page_meetings add column if not exists startup_id uuid references rs_startups(id) on delete cascade;
alter table rs_page_meetings add column if not exists created_by text;
alter table rs_page_meetings add column if not exists title text;
alter table rs_page_meetings add column if not exists meeting_date text;
alter table rs_page_meetings add column if not exists meeting_time text;
alter table rs_page_meetings add column if not exists platform text default 'google_meet';
alter table rs_page_meetings add column if not exists link text default '';
alter table rs_page_meetings add column if not exists agenda text default '';
alter table rs_page_meetings add column if not exists with_note text default '';
alter table rs_page_meetings add column if not exists created_at timestamptz default now();

-- Page messages table
create table if not exists rs_page_messages (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references rs_startup_pages(id) on delete cascade,
  startup_id uuid references rs_startups(id) on delete cascade,
  user_id text not null,
  content text not null,
  reply_to_id text default null,
  reply_to_content text default null,
  reply_to_user text default null,
  created_at timestamptz default now()
);

alter table rs_page_messages add column if not exists page_id uuid references rs_startup_pages(id) on delete cascade;
alter table rs_page_messages add column if not exists startup_id uuid references rs_startups(id) on delete cascade;
alter table rs_page_messages add column if not exists user_id text;
alter table rs_page_messages add column if not exists content text;
alter table rs_page_messages add column if not exists reply_to_id text default null;
alter table rs_page_messages add column if not exists reply_to_content text default null;
alter table rs_page_messages add column if not exists reply_to_user text default null;
alter table rs_page_messages add column if not exists created_at timestamptz default now();

-- Enable RLS and add policies
alter table rs_page_meetings enable row level security;
alter table rs_page_messages enable row level security;

drop policy if exists "allow_all_meetings" on rs_page_meetings;
drop policy if exists "allow_all_page_messages" on rs_page_messages;

create policy "allow_all_meetings" on rs_page_meetings for all using (true) with check (true);
create policy "allow_all_page_messages" on rs_page_messages for all using (true) with check (true);

