create type public.task_status as enum (
  'inbox',
  'todo',
  'in_progress',
  'done',
  'cancelled'
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  parent_task_id uuid references public.tasks (id) on delete cascade,
  -- series_id, project_id, and milestone_id stay plain uuids until those tables exist.
  series_id uuid,
  occurrence_on date,
  detached boolean not null default false,
  title text not null,
  notes text not null default '',
  status public.task_status not null default 'todo',
  priority smallint not null,
  due_on date,
  scheduled_for date,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  estimated_minutes integer,
  life_area_id smallint references public.life_areas (id),
  project_id uuid,
  milestone_id uuid,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_priority_check check (priority between 0 and 3),
  constraint tasks_scheduled_range_check check (
    scheduled_end is null
    or (scheduled_start is not null and scheduled_end > scheduled_start)
  ),
  constraint tasks_not_subtask_and_series_check check (
    parent_task_id is null or series_id is null
  ),
  constraint tasks_series_has_occurrence_check check (
    series_id is null or occurrence_on is not null
  ),
  constraint tasks_estimated_minutes_check check (
    estimated_minutes is null or estimated_minutes > 0
  )
);

create unique index tasks_series_occurrence_uidx
  on public.tasks (series_id, occurrence_on)
  where series_id is not null and occurrence_on is not null;

create index tasks_user_open_due_idx
  on public.tasks (user_id, due_on)
  where status in (
    'inbox'::public.task_status,
    'todo'::public.task_status,
    'in_progress'::public.task_status
  );

create index tasks_user_scheduled_idx
  on public.tasks (user_id, scheduled_for)
  where status in (
    'inbox'::public.task_status,
    'todo'::public.task_status,
    'in_progress'::public.task_status
  );

create index tasks_parent_idx on public.tasks (parent_task_id);

create index tasks_project_idx
  on public.tasks (project_id)
  where project_id is not null;

create table public.task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  event text not null,
  from_status public.task_status,
  to_status public.task_status,
  occurred_at timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb,
  constraint task_activity_event_check check (
    event in ('created', 'completed', 'reopened', 'cancelled', 'rescheduled')
  )
);

create index task_activity_user_occurred_idx
  on public.task_activity (user_id, occurred_at);

create index task_activity_task_occurred_idx
  on public.task_activity (task_id, occurred_at);

alter table public.tasks enable row level security;
alter table public.task_activity enable row level security;

revoke all on table public.tasks from anon, authenticated;
revoke all on table public.task_activity from anon, authenticated;
revoke all on type public.task_status from anon, authenticated;

notify pgrst, 'reload schema';
