create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_lowercase check (email = lower(email))
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  user_agent text,
  ip_address text
);

create index sessions_user_id_idx on public.sessions (user_id);

create table public.login_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  succeeded boolean not null,
  attempted_at timestamptz not null default now(),
  ip_address text
);

create index login_attempts_email_attempted_at_idx
  on public.login_attempts (email, attempted_at desc);

create table public.user_settings (
  user_id uuid primary key references public.users (id) on delete cascade,
  timezone text not null default 'Asia/Karachi',
  week_starts_on smallint not null default 1,
  currency_code char(3) not null default 'USD',
  dashboard_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_settings_week_starts_on_check check (week_starts_on between 0 and 6)
);

create table public.life_areas (
  id smallint primary key,
  key text not null unique,
  name text not null,
  purpose text not null,
  sort_order smallint not null
);

insert into public.life_areas (id, key, name, purpose, sort_order) values
  (1, 'business', 'Business & Entrepreneurship', 'Goals, projects, tasks for delivery and follow-up, and manual metrics for revenue and expenses.', 1),
  (2, 'career', 'Career & Market-Relevant Skills', 'Goals, learning projects, tasks, duration habits, and skill milestones.', 2),
  (3, 'health', 'Health & Fitness', 'Training and movement habits, and body or performance metrics you choose to enter.', 3),
  (4, 'deen', 'Deen & Character', 'Optional habits for worship and character, private notes, and reflective review text.', 4),
  (5, 'wealth', 'Wealth & Financial Independence', 'Manual balances and period amounts, and a target you date yourself.', 5),
  (6, 'relationships', 'Relationships, Family & Home', 'Tasks and recurring tasks for responsibilities, maintenance, and home admin.', 6);

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.login_attempts enable row level security;
alter table public.user_settings enable row level security;
alter table public.life_areas enable row level security;

revoke all on table public.users from anon, authenticated;
revoke all on table public.sessions from anon, authenticated;
revoke all on table public.login_attempts from anon, authenticated;
revoke all on table public.user_settings from anon, authenticated;
revoke all on table public.life_areas from anon, authenticated;
