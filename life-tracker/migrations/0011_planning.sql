create type public.plan_status as enum ('idea', 'exploring', 'decided', 'active', 'completed', 'archived');
create type public.plan_question_status as enum ('open', 'answered', 'dropped');

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  status public.plan_status not null default 'idea',
  summary text not null default '',
  body_markdown text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz,
  completed_at timestamptz,
  archived_at timestamptz
);

create index plans_user_status_idx on public.plans (user_id, status);

create table public.plan_life_areas (
  plan_id uuid not null references public.plans (id) on delete cascade,
  life_area_id smallint not null references public.life_areas (id) on delete cascade,
  primary key (plan_id, life_area_id)
);

create table public.plan_goals (
  plan_id uuid not null references public.plans (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  primary key (plan_id, goal_id)
);

create table public.plan_projects (
  plan_id uuid not null references public.plans (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  primary key (plan_id, project_id)
);

create table public.plan_links (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  url text not null,
  title text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create table public.plan_questions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  question text not null,
  status public.plan_question_status not null default 'open',
  answer text not null default '',
  sort_order integer not null default 0
);

create table public.plan_options (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  name text not null,
  description text not null default '',
  is_chosen boolean not null default false,
  sort_order integer not null default 0
);

create unique index plan_options_one_chosen_uidx on public.plan_options (plan_id) where is_chosen;

create table public.plan_criteria (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

create table public.plan_option_scores (
  option_id uuid not null references public.plan_options (id) on delete cascade,
  criterion_id uuid not null references public.plan_criteria (id) on delete cascade,
  score smallint,
  note text not null default '',
  primary key (option_id, criterion_id),
  constraint plan_option_scores_score_check check (score is null or score between 1 and 5)
);

create table public.plan_decisions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  title text not null,
  rationale_markdown text not null default '',
  decided_on date not null,
  chosen_option_id uuid references public.plan_options (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.plan_actions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  title text not null,
  notes text not null default '',
  due_on date,
  status text not null default 'proposed',
  task_id uuid unique references public.tasks (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint plan_actions_status_check check (status in ('proposed', 'accepted', 'dismissed', 'done'))
);

create index plan_actions_plan_idx on public.plan_actions (plan_id);

create function public.choose_plan_option(
  p_user_id uuid,
  p_plan_id uuid,
  p_option_id uuid
) returns boolean
language plpgsql
set search_path = public
as $$
declare
  owned uuid;
begin
  select id into owned from public.plans where id = p_plan_id and user_id = p_user_id;
  if owned is null then
    return false;
  end if;

  if p_option_id is not null and not exists (
    select 1 from public.plan_options where id = p_option_id and plan_id = p_plan_id
  ) then
    return false;
  end if;

  update public.plan_options set is_chosen = false where plan_id = p_plan_id and is_chosen;
  if p_option_id is not null then
    update public.plan_options set is_chosen = true where id = p_option_id and plan_id = p_plan_id;
  end if;
  return true;
end;
$$;

create function public.promote_plan_action(
  p_user_id uuid,
  p_action_id uuid,
  p_force_error boolean default false
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  action_row public.plan_actions%rowtype;
  area_count integer;
  area_id smallint;
  saved_task uuid;
begin
  select plan_actions.*
  into action_row
  from public.plan_actions
  join public.plans on plans.id = plan_actions.plan_id
  where plan_actions.id = p_action_id
    and plans.user_id = p_user_id
  for update;

  if not found then
    return null;
  end if;

  if action_row.task_id is not null then
    return action_row.task_id;
  end if;

  if action_row.status <> 'proposed' then
    return null;
  end if;

  select count(*) into area_count from public.plan_life_areas where plan_id = action_row.plan_id;
  if area_count = 1 then
    select life_area_id into area_id from public.plan_life_areas where plan_id = action_row.plan_id;
  end if;

  saved_task := public.save_task_and_activity(
    p_user_id,
    null::uuid,
    action_row.title,
    action_row.notes,
    'todo'::public.task_status,
    0::smallint,
    action_row.due_on,
    null::date,
    null::timestamptz,
    null::timestamptz,
    null::integer,
    area_id,
    null::timestamptz,
    null::timestamptz,
    'created',
    null::public.task_status,
    'todo'::public.task_status,
    '{}'::jsonb,
    true
  );

  update public.plan_actions
  set status = 'accepted', task_id = saved_task
  where id = action_row.id;

  if p_force_error then
    raise exception 'forced promote failure';
  end if;

  return saved_task;
end;
$$;

alter table public.plans enable row level security;
alter table public.plan_life_areas enable row level security;
alter table public.plan_goals enable row level security;
alter table public.plan_projects enable row level security;
alter table public.plan_links enable row level security;
alter table public.plan_questions enable row level security;
alter table public.plan_options enable row level security;
alter table public.plan_criteria enable row level security;
alter table public.plan_option_scores enable row level security;
alter table public.plan_decisions enable row level security;
alter table public.plan_actions enable row level security;

revoke all on table public.plans from anon, authenticated;
revoke all on table public.plan_life_areas from anon, authenticated;
revoke all on table public.plan_goals from anon, authenticated;
revoke all on table public.plan_projects from anon, authenticated;
revoke all on table public.plan_links from anon, authenticated;
revoke all on table public.plan_questions from anon, authenticated;
revoke all on table public.plan_options from anon, authenticated;
revoke all on table public.plan_criteria from anon, authenticated;
revoke all on table public.plan_option_scores from anon, authenticated;
revoke all on table public.plan_decisions from anon, authenticated;
revoke all on table public.plan_actions from anon, authenticated;

revoke all on type public.plan_status from anon, authenticated;
revoke all on type public.plan_question_status from anon, authenticated;

revoke all on function public.choose_plan_option(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.promote_plan_action(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.choose_plan_option(uuid, uuid, uuid) to service_role;
grant execute on function public.promote_plan_action(uuid, uuid, boolean) to service_role;

notify pgrst, 'reload schema';
