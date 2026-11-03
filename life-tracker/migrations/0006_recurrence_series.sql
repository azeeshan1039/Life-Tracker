create type public.recurrence_freq as enum ('daily', 'weekly', 'monthly');

create table public.recurrence_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  freq public.recurrence_freq not null,
  interval_count integer not null default 1,
  by_weekdays smallint[] not null default '{}',
  by_monthday smallint,
  starts_on date not null,
  until_on date,
  is_active boolean not null default true,
  title text not null,
  notes text not null default '',
  priority smallint not null,
  estimated_minutes integer,
  life_area_id smallint references public.life_areas (id),
  -- project_id stays a plain uuid until projects exist.
  project_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurrence_series_interval_check check (interval_count between 1 and 99),
  constraint recurrence_series_priority_check check (priority between 0 and 3),
  constraint recurrence_series_monthday_check check (by_monthday is null or by_monthday between 1 and 31),
  constraint recurrence_series_estimate_check check (
    estimated_minutes is null or estimated_minutes > 0
  ),
  constraint recurrence_series_until_check check (until_on is null or until_on >= starts_on),
  constraint recurrence_series_freq_shape_check check (
    (
      freq = 'daily'
      and cardinality(by_weekdays) = 0
      and by_monthday is null
    )
    or (
      freq = 'weekly'
      and cardinality(by_weekdays) > 0
    )
    or (
      freq = 'monthly'
      and by_monthday is not null
    )
  )
);

alter table public.tasks
  add constraint tasks_series_id_fkey
  foreign key (series_id) references public.recurrence_series (id) on delete set null;

alter table public.recurrence_series enable row level security;

revoke all on table public.recurrence_series from anon, authenticated;
revoke all on type public.recurrence_freq from anon, authenticated;

notify pgrst, 'reload schema';
