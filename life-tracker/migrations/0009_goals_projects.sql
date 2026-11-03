create type public.goal_status as enum ('active', 'paused', 'completed', 'archived');
create type public.work_status as enum ('active', 'paused', 'completed', 'archived');
create type public.milestone_status as enum ('open', 'done');

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  life_area_id smallint references public.life_areas (id),
  title text not null,
  description text not null default '',
  status public.goal_status not null default 'active',
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  archived_at timestamptz
);

create index goals_user_status_idx on public.goals (user_id, status);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  life_area_id smallint references public.life_areas (id),
  title text not null,
  description text not null default '',
  status public.work_status not null default 'active',
  start_date date,
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  archived_at timestamptz
);

create index projects_user_status_idx on public.projects (user_id, status);

create table public.project_goals (
  project_id uuid not null references public.projects (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  primary key (project_id, goal_id)
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  target_date date,
  status public.milestone_status not null default 'open',
  completed_at timestamptz,
  sort_order integer not null default 0
);

create index milestones_project_sort_idx on public.milestones (project_id, sort_order);

create table public.task_goals (
  task_id uuid not null references public.tasks (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  primary key (task_id, goal_id)
);

create table public.series_goals (
  series_id uuid not null references public.recurrence_series (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  primary key (series_id, goal_id)
);

alter table public.tasks
  add constraint tasks_project_id_fkey
  foreign key (project_id) references public.projects (id) on delete set null;

alter table public.tasks
  add constraint tasks_milestone_id_fkey
  foreign key (milestone_id) references public.milestones (id) on delete set null;

alter table public.recurrence_series
  add constraint recurrence_series_project_id_fkey
  foreign key (project_id) references public.projects (id) on delete set null;

alter table public.habits
  add constraint habits_goal_id_fkey
  foreign key (goal_id) references public.goals (id) on delete set null;

create or replace function public.insert_series_occurrences(
  p_user_id uuid,
  p_series_id uuid,
  p_dates date[],
  p_title text,
  p_notes text,
  p_priority smallint,
  p_estimated_minutes integer,
  p_life_area_id smallint,
  p_project_id uuid
) returns integer
language plpgsql
set search_path = public
as $$
declare
  inserted_count integer := 0;
  new_task_id uuid;
begin
  if not exists (
    select 1 from public.recurrence_series
    where id = p_series_id and user_id = p_user_id and is_active
  ) then
    return 0;
  end if;

  for new_task_id in
    insert into public.tasks (
      user_id,
      series_id,
      occurrence_on,
      detached,
      title,
      notes,
      status,
      priority,
      scheduled_for,
      estimated_minutes,
      life_area_id,
      project_id
    )
    select
      p_user_id,
      p_series_id,
      occurrence,
      false,
      p_title,
      p_notes,
      'todo',
      p_priority,
      occurrence,
      p_estimated_minutes,
      p_life_area_id,
      p_project_id
    from unnest(p_dates) as occurrence
    on conflict do nothing
    returning id
  loop
    inserted_count := inserted_count + 1;
    insert into public.task_goals (task_id, goal_id)
    select new_task_id, series_goals.goal_id
    from public.series_goals
    where series_goals.series_id = p_series_id;
  end loop;

  return inserted_count;
end;
$$;

create function public.replace_series_goals(
  p_user_id uuid,
  p_series_id uuid,
  p_today date,
  p_goal_ids uuid[]
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  found_id uuid;
begin
  select id into found_id
  from public.recurrence_series
  where id = p_series_id and user_id = p_user_id;

  if found_id is null then
    return null;
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_goal_ids, '{}'::uuid[])) as goal_id
    where not exists (
      select 1 from public.goals
      where goals.id = goal_id and goals.user_id = p_user_id
    )
  ) then
    raise exception 'goal is not available' using errcode = '23503';
  end if;

  delete from public.series_goals where series_id = p_series_id;

  insert into public.series_goals (series_id, goal_id)
  select distinct p_series_id, goal_id
  from unnest(coalesce(p_goal_ids, '{}'::uuid[])) as goal_id;

  delete from public.task_goals
  where task_id in (
    select id from public.tasks
    where user_id = p_user_id
      and series_id = p_series_id
      and detached = false
      and status in ('inbox', 'todo', 'in_progress')
      and occurrence_on >= p_today
  );

  insert into public.task_goals (task_id, goal_id)
  select tasks.id, series_goals.goal_id
  from public.tasks
  join public.series_goals on series_goals.series_id = tasks.series_id
  where tasks.user_id = p_user_id
    and tasks.series_id = p_series_id
    and tasks.detached = false
    and tasks.status in ('inbox', 'todo', 'in_progress')
    and tasks.occurrence_on >= p_today;

  return found_id;
end;
$$;

alter table public.goals enable row level security;
alter table public.projects enable row level security;
alter table public.project_goals enable row level security;
alter table public.milestones enable row level security;
alter table public.task_goals enable row level security;
alter table public.series_goals enable row level security;

revoke all on table public.goals from anon, authenticated;
revoke all on table public.projects from anon, authenticated;
revoke all on table public.project_goals from anon, authenticated;
revoke all on table public.milestones from anon, authenticated;
revoke all on table public.task_goals from anon, authenticated;
revoke all on table public.series_goals from anon, authenticated;

revoke all on type public.goal_status from anon, authenticated;
revoke all on type public.work_status from anon, authenticated;
revoke all on type public.milestone_status from anon, authenticated;

revoke all on function public.replace_series_goals(uuid, uuid, date, uuid[]) from public, anon, authenticated;
grant execute on function public.replace_series_goals(uuid, uuid, date, uuid[]) to service_role;

notify pgrst, 'reload schema';
