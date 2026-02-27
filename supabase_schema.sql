-- Enable the pgvector extension first!
create extension if not exists vector with schema public;

-- Drop tables if they exist to allow clean recreation
drop table if exists feedback cascade;
drop table if exists health_scores cascade;
drop table if exists contributions cascade;
drop table if exists chats cascade;
drop table if exists onboarding_plans cascade;
drop table if exists embeddings cascade;
drop table if exists repositories cascade;
drop table if exists community_insights cascade;
drop table if exists achievements cascade;
drop table if exists prompts cascade;
drop table if exists usage cascade;
drop table if exists team_members cascade;
drop table if exists organizations cascade;
drop table if exists profiles cascade;

-- Profiles
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  user_id text unique, -- for NextAuth alignment or custom user_id string
  guest_id text unique,
  name text,
  email text,
  image text,
  created_at timestamptz default now()
);

-- Organizations
create table organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

-- Team Members
create table team_members (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  role text default 'member',
  created_at timestamptz default now(),
  unique(organization_id, profile_id)
);

-- Usage tracking for usage limits
create table usage (
  id uuid default gen_random_uuid() primary key,
  identifier text not null, -- user_id or guest_id
  endpoint text not null,
  count int default 0,
  date date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(identifier, endpoint, date)
);

-- Prompts
create table prompts (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade,
  guest_id text,
  content text not null,
  response text,
  created_at timestamptz default now()
);

-- Achievements
create table achievements (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  earned_at timestamptz default now()
);

-- Community Insights
create table community_insights (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  author_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Repositories
create table repositories (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  url text not null,
  summary text,
  created_at timestamptz default now()
);

-- Embeddings
create table embeddings (
  id uuid default gen_random_uuid() primary key,
  repository_id uuid references repositories(id) on delete cascade not null,
  content text not null,
  file_path text,
  embedding vector(768), -- Gemini text-embedding-004 outputs 768 dimensions
  created_at timestamptz default now()
);

-- Onboarding Plans
create table onboarding_plans (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade,
  guest_id text,
  plan_data jsonb not null,
  created_at timestamptz default now()
);

-- Chats
create table chats (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade,
  guest_id text,
  title text,
  created_at timestamptz default now()
);

-- Contributions
create table contributions (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  repository_id uuid references repositories(id) on delete cascade not null,
  pr_url text,
  status text,
  created_at timestamptz default now()
);

-- Health Scores
create table health_scores (
  id uuid default gen_random_uuid() primary key,
  repository_id uuid references repositories(id) on delete cascade not null,
  score int not null,
  metrics jsonb,
  created_at timestamptz default now()
);

-- Feedback
create table feedback (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete set null,
  guest_id text,
  message text not null,
  created_at timestamptz default now()
);

-- Indexes for performance
create index idx_usage_identifier_date on usage(identifier, date);
create index idx_prompts_profile_id on prompts(profile_id);
create index idx_prompts_guest_id on prompts(guest_id);
create index idx_onboarding_plans_profile_id on onboarding_plans(profile_id);
create index idx_onboarding_plans_guest_id on onboarding_plans(guest_id);
create index idx_chats_profile_id on chats(profile_id);
create index idx_chats_guest_id on chats(guest_id);
create index idx_team_members_profile_id on team_members(profile_id);

-- Enable RLS across all tables
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table team_members enable row level security;
alter table usage enable row level security;
alter table prompts enable row level security;
alter table achievements enable row level security;
alter table community_insights enable row level security;
alter table repositories enable row level security;
alter table embeddings enable row level security;
alter table onboarding_plans enable row level security;
alter table chats enable row level security;
alter table contributions enable row level security;
alter table health_scores enable row level security;
alter table feedback enable row level security;

-- Example: RLS Policies for Profiles
create policy "Users can view their own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = id);

-- Example: RLS Policies for Prompts (Handling guest vs authenticated)
create policy "Users and guests can view their own prompts" on prompts
  for select using (
    profile_id = auth.uid()
    or (guest_id is not null and guest_id = current_setting('request.jwt.claims', true)::json->>'guest_id')
  );

create policy "Users and guests can insert their own prompts" on prompts
  for insert with check (
    profile_id = auth.uid()
    or (guest_id is not null and guest_id = current_setting('request.jwt.claims', true)::json->>'guest_id')
  );

-- For organizations and team members, checking membership
create policy "Members can view their organizations" on organizations
  for select using (
    exists (
      select 1 from team_members
      where team_members.organization_id = organizations.id
      and team_members.profile_id = auth.uid()
    )
  );

-- Usage tracking policy: admin inserts via service role, select for users
create policy "Users can view their own usage" on usage
  for select using (
    identifier = auth.uid()::text
    or identifier = current_setting('request.jwt.claims', true)::json->>'guest_id'
  );

-- ============================================
-- GAMIFICATION EXTENSIONS
-- ============================================

-- Add gamification columns to profiles
alter table profiles
  add column if not exists xp_total integer default 0,
  add column if not exists level text default 'Beginner',
  add column if not exists streak_days integer default 0,
  add column if not exists last_contribution_date date;

-- Add extra columns to contributions
alter table contributions
  add column if not exists challenge_id uuid,
  add column if not exists xp_earned integer default 0,
  add column if not exists pr_title text,
  add column if not exists pr_body text,
  add column if not exists branch_name text,
  add column if not exists fork_owner text;

-- Challenges table
create table challenges (
  id uuid default gen_random_uuid() primary key,
  repository_id uuid references repositories(id) on delete cascade not null,
  title text not null,
  description text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  category text not null check (category in ('docs', 'tests', 'bugfix', 'feature', 'refactor')),
  xp_reward integer not null default 50,
  target_files text[] default '{}',
  steps text[] default '{}',
  status text default 'open',
  created_at timestamptz default now()
);

-- Dry run results table
create table dry_run_results (
  id uuid default gen_random_uuid() primary key,
  challenge_id uuid references challenges(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  repository_id uuid references repositories(id) on delete cascade not null,
  original_content text,
  new_content text,
  prediction jsonb not null,
  risk_score integer not null check (risk_score between 1 and 10),
  created_at timestamptz default now()
);

-- Foreign key for challenge_id in contributions
alter table contributions
  add constraint fk_contributions_challenge
  foreign key (challenge_id) references challenges(id) on delete set null;

-- Indexes
create index idx_challenges_repository_id on challenges(repository_id);
create index idx_challenges_difficulty on challenges(difficulty);
create index idx_dry_run_results_challenge_id on dry_run_results(challenge_id);
create index idx_dry_run_results_profile_id on dry_run_results(profile_id);
create index idx_contributions_challenge_id on contributions(challenge_id);

-- RLS
alter table challenges enable row level security;
alter table dry_run_results enable row level security;

create policy "Anyone can view challenges" on challenges for select using (true);
create policy "Users can view their own dry runs" on dry_run_results
  for select using (profile_id = auth.uid());
create policy "Users can insert their own dry runs" on dry_run_results
  for insert with check (profile_id = auth.uid());

-- ============================================
-- USER TESTS TABLE (per-user test storage)
-- ============================================

create table user_tests (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade,
  guest_id text,
  repository_id uuid references repositories(id) on delete cascade not null,
  test_name text not null,
  test_code text not null,
  test_result jsonb,
  language text default 'javascript',
  status text default 'pending' check (status in ('pending', 'running', 'passed', 'failed', 'error')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_user_tests_profile_id on user_tests(profile_id);
create index idx_user_tests_guest_id on user_tests(guest_id);
create index idx_user_tests_repository_id on user_tests(repository_id);

alter table user_tests enable row level security;

create policy "Users can view their own tests" on user_tests
  for select using (
    profile_id = auth.uid()
    or (guest_id is not null and guest_id = current_setting('request.jwt.claims', true)::json->>'guest_id')
  );

create policy "Users can insert their own tests" on user_tests
  for insert with check (
    profile_id = auth.uid()
    or guest_id is not null
  );

create policy "Users can update their own tests" on user_tests
  for update using (
    profile_id = auth.uid()
    or (guest_id is not null and guest_id = current_setting('request.jwt.claims', true)::json->>'guest_id')
  );

-- ============================================
-- COMPREHENSIVE RLS POLICIES (defense in depth)
-- ============================================

-- achievements: users see only their own
create policy "Users can view their own achievements" on achievements
  for select using (profile_id = auth.uid());

-- contributions: users see only their own
create policy "Users can view their own contributions" on contributions
  for select using (profile_id = auth.uid());

create policy "Users can insert their own contributions" on contributions
  for insert with check (profile_id = auth.uid());

-- repositories: anyone can read, owners can insert
create policy "Anyone can view repositories" on repositories
  for select using (true);

create policy "Owners can insert repositories" on repositories
  for insert with check (profile_id = auth.uid());

-- embeddings: read access for all
create policy "Anyone can view embeddings" on embeddings
  for select using (true);

-- health_scores: read access for all
create policy "Anyone can view health scores" on health_scores
  for select using (true);

-- community_insights: anyone can read
create policy "Anyone can view insights" on community_insights
  for select using (true);

create policy "Users can insert insights" on community_insights
  for insert with check (author_id = auth.uid() or author_id is null);

-- onboarding_plans: users see only their own
create policy "Users can view their own plans" on onboarding_plans
  for select using (
    profile_id = auth.uid()
    or (guest_id is not null and guest_id = current_setting('request.jwt.claims', true)::json->>'guest_id')
  );

create policy "Users can insert their own plans" on onboarding_plans
  for insert with check (
    profile_id = auth.uid()
    or guest_id is not null
  );

-- chats: users see only their own
create policy "Users can view their own chats" on chats
  for select using (
    profile_id = auth.uid()
    or (guest_id is not null and guest_id = current_setting('request.jwt.claims', true)::json->>'guest_id')
  );

create policy "Users can insert their own chats" on chats
  for insert with check (
    profile_id = auth.uid()
    or guest_id is not null
  );

-- feedback: users can insert, see their own
create policy "Users can view their own feedback" on feedback
  for select using (
    profile_id = auth.uid()
    or (guest_id is not null and guest_id = current_setting('request.jwt.claims', true)::json->>'guest_id')
  );

create policy "Users can insert feedback" on feedback
  for insert with check (
    profile_id = auth.uid()
    or guest_id is not null
  );

-- team_members: members can view their own
create policy "Members can view their memberships" on team_members
  for select using (profile_id = auth.uid());
