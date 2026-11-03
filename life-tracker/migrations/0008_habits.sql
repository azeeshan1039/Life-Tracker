create type public.habit_tracking as enum ('boolean', 'numeric', 'duration');
create type public.habit_schedule_kind as enum ('fixed_days', 'weekly_quota');
create type public.habit_status as enum ('active', 'paused', 'archived');
create type public.habit_log_status as enum ('logged', 'skipped', 'rest');

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  life_area_id smallint references public.life_areas (id),
  -- goal_id stays a plain uuid until goals exist.
  goal_id uuid,
  title text not null,
  description text not null default '',
  tracking_type public.habit_tracking not null,
  unit text,
  target_value numeric(18, 4),
  schedule_kind public.habit_schedule_kind not null,
  weekdays smallint[] not null default '{}',
  weekly_target integer,
  status public.habit_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint habits_shape_check check (
    (
      tracking_type = 'boolean'
      and target_value is null
      and unit is null
    )
    or (
      tracking_type in ('numeric', 'duration')
      and target_value > 0
      and unit is not null
      and btrim(unit) <> ''
    )
  ),
  constraint habits_schedule_check check (
    (
      schedule_kind = 'fixed_days'
      and cardinality(weekdays) > 0
      and weekly_target is null
    )
    or (
      schedule_kind = 'weekly_quota'
      and cardinality(weekdays) = 0
      and weekly_target between 1 and 7
    )
  )
);

create index habits_user_status_idx on public.habits (user_id, status);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  logged_on date not null,
  value numeric(18, 4),
  log_status public.habit_log_status not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habit_logs_day_key unique (habit_id, logged_on),
  constraint habit_logs_value_check check (
    (log_status = 'logged' and value is not null)
    or (log_status in ('skipped', 'rest') and value is null)
  )
);

create index habit_logs_user_logged_on_idx on public.habit_logs (user_id, logged_on);

create function public.enforce_habit_log_value()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  tracking public.habit_tracking;
begin
  if new.log_status = 'logged' then
    select habits.tracking_type into tracking
    from public.habits
    where habits.id = new.habit_id;
    if tracking = 'boolean' and new.value is distinct from 1 then
      raise exception 'boolean habit logs store 1' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger habit_logs_value_trigger
before insert or update on public.habit_logs
for each row execute function public.enforce_habit_log_value();

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

revoke all on table public.habits from anon, authenticated;
revoke all on table public.habit_logs from anon, authenticated;
revoke all on type public.habit_tracking from anon, authenticated;
revoke all on type public.habit_schedule_kind from anon, authenticated;
revoke all on type public.habit_status from anon, authenticated;
revoke all on type public.habit_log_status from anon, authenticated;

revoke all on function public.enforce_habit_log_value() from public, anon, authenticated;
grant execute on function public.enforce_habit_log_value() to service_role;

notify pgrst, 'reload schema';
