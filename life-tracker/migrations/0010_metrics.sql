create type public.metric_kind as enum ('general', 'asset', 'liability', 'income', 'expense');
create type public.metric_aggregation as enum ('latest', 'period_sum');
create type public.metric_direction as enum ('increase', 'decrease', 'maintain');

create table public.metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  life_area_id smallint references public.life_areas (id),
  goal_id uuid references public.goals (id) on delete set null,
  is_primary_for_goal boolean not null default false,
  name text not null,
  description text not null default '',
  kind public.metric_kind not null,
  unit text not null,
  aggregation public.metric_aggregation not null,
  direction public.metric_direction not null,
  target_value numeric(18, 4),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint metrics_name_check check (btrim(name) <> ''),
  constraint metrics_unit_check check (btrim(unit) <> ''),
  constraint metrics_status_check check (status in ('active', 'archived')),
  constraint metrics_primary_goal_check check ((not is_primary_for_goal) or goal_id is not null)
);

create unique index metrics_one_primary_goal_uidx
  on public.metrics (goal_id)
  where is_primary_for_goal and goal_id is not null;

create index metrics_user_status_idx on public.metrics (user_id, status);

create table public.metric_entries (
  id uuid primary key default gen_random_uuid(),
  metric_id uuid not null references public.metrics (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  recorded_on date not null,
  value numeric(18, 4) not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint metric_entries_day_key unique (metric_id, recorded_on)
);

create index metric_entries_metric_recorded_idx on public.metric_entries (metric_id, recorded_on desc);

create function public.user_net_worth(p_user_id uuid, p_today date)
returns jsonb
language sql
stable
set search_path = public
as $$
  with current_rows as (
    select
      m.id,
      m.name,
      m.kind::text as kind,
      m.unit,
      e.value,
      e.recorded_on
    from public.metrics m
    join lateral (
      select value, recorded_on
      from public.metric_entries
      where metric_id = m.id
        and recorded_on <= p_today
      order by recorded_on desc
      limit 1
    ) e on true
    where m.user_id = p_user_id
      and m.status in ('active', 'archived')
      and m.kind in ('asset', 'liability')
      and m.aggregation = 'latest'
  ),
  sides as (
    select
      count(*) filter (where kind = 'asset') as asset_count,
      count(*) filter (where kind = 'liability') as liability_count,
      count(distinct unit) as unit_count
    from current_rows
  ),
  totals as (
    select
      coalesce(sum(value) filter (where kind = 'asset'), 0)
        - coalesce(sum(value) filter (where kind = 'liability'), 0) as total,
      min(unit) as unit
    from current_rows
  )
  select jsonb_build_object(
    'outcome',
    case
      when sides.asset_count = 0 then 'missing_assets'
      when sides.liability_count = 0 then 'missing_liabilities'
      when sides.unit_count <> 1 then 'mixed_units'
      else 'total'
    end,
    'unit',
    case
      when sides.asset_count > 0 and sides.liability_count > 0 and sides.unit_count = 1 then totals.unit
      else null
    end,
    'total',
    case
      when sides.asset_count > 0 and sides.liability_count > 0 and sides.unit_count = 1 then totals.total::text
      else null
    end,
    'rows',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'kind', kind,
          'unit', unit,
          'value', value::text,
          'recordedOn', recorded_on
        )
        order by kind, name
      )
      from current_rows
    ), '[]'::jsonb)
  )
  from sides
  cross join totals;
$$;

create function public.area_cash_flow(
  p_user_id uuid,
  p_life_area_id smallint,
  p_start date,
  p_end date
) returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  income_count integer;
  expense_count integer;
  income_unit text;
  expense_unit text;
  income_sum numeric;
  expense_sum numeric;
begin
  select count(*), min(unit)
  into income_count, income_unit
  from public.metrics
  where user_id = p_user_id
    and life_area_id = p_life_area_id
    and status = 'active'
    and kind = 'income'
    and aggregation = 'period_sum';

  select count(*), min(unit)
  into expense_count, expense_unit
  from public.metrics
  where user_id = p_user_id
    and life_area_id = p_life_area_id
    and status = 'active'
    and kind = 'expense'
    and aggregation = 'period_sum';

  if income_count <> 1 or expense_count <> 1 or income_unit is distinct from expense_unit then
    return jsonb_build_object('computed', false);
  end if;

  select coalesce(sum(metric_entries.value), 0)
  into income_sum
  from public.metric_entries
  join public.metrics on metrics.id = metric_entries.metric_id
  where metrics.user_id = p_user_id
    and metrics.life_area_id = p_life_area_id
    and metrics.status = 'active'
    and metrics.kind = 'income'
    and metrics.aggregation = 'period_sum'
    and metric_entries.recorded_on between p_start and p_end;

  select coalesce(sum(metric_entries.value), 0)
  into expense_sum
  from public.metric_entries
  join public.metrics on metrics.id = metric_entries.metric_id
  where metrics.user_id = p_user_id
    and metrics.life_area_id = p_life_area_id
    and metrics.status = 'active'
    and metrics.kind = 'expense'
    and metrics.aggregation = 'period_sum'
    and metric_entries.recorded_on between p_start and p_end;

  return jsonb_build_object(
    'computed', true,
    'unit', income_unit,
    'income', income_sum::text,
    'expense', expense_sum::text,
    'net', (income_sum - expense_sum)::text
  );
end;
$$;

create function public.metric_display_values(
  p_user_id uuid,
  p_today date,
  p_month_start date,
  p_month_end date
) returns table (
  metric_id uuid,
  display_value text,
  display_on date
)
language sql
stable
set search_path = public
as $$
  select
    m.id,
    case
      when m.aggregation = 'latest' then current_entry.value::text
      else month_sum.total::text
    end,
    case
      when m.aggregation = 'latest' then current_entry.recorded_on
      else month_sum.latest_on
    end
  from public.metrics m
  left join lateral (
    select value, recorded_on
    from public.metric_entries
    where metric_id = m.id
      and recorded_on <= p_today
    order by recorded_on desc
    limit 1
  ) current_entry on m.aggregation = 'latest'
  left join lateral (
    select sum(value) as total, max(recorded_on) as latest_on
    from public.metric_entries
    where metric_id = m.id
      and recorded_on between p_month_start and p_month_end
  ) month_sum on m.aggregation = 'period_sum'
  where m.user_id = p_user_id;
$$;

create function public.goal_measurements(
  p_user_id uuid,
  p_today date,
  p_month_start date,
  p_month_end date
) returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'goalId', m.goal_id,
    'metricId', m.id,
    'name', m.name,
    'unit', m.unit,
    'direction', m.direction::text,
    'target', m.target_value::text,
    'aggregation', m.aggregation::text,
    'current', case
      when m.aggregation = 'latest' then current_entry.value::text
      else month_sum.total::text
    end,
    'currentOn', case
      when m.aggregation = 'latest' then current_entry.recorded_on
      else month_sum.latest_on
    end
  )), '[]'::jsonb)
  from public.metrics m
  left join lateral (
    select value, recorded_on
    from public.metric_entries
    where metric_id = m.id
      and recorded_on <= p_today
    order by recorded_on desc
    limit 1
  ) current_entry on m.aggregation = 'latest'
  left join lateral (
    select sum(value) as total, max(recorded_on) as latest_on
    from public.metric_entries
    where metric_id = m.id
      and recorded_on between p_month_start and p_month_end
  ) month_sum on m.aggregation = 'period_sum'
  where m.user_id = p_user_id
    and m.is_primary_for_goal
    and m.goal_id is not null;
$$;

create function public.read_metric(
  p_user_id uuid,
  p_metric_id uuid,
  p_today date,
  p_month_start date,
  p_month_end date
) returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', m.id,
    'lifeAreaId', m.life_area_id,
    'goalId', m.goal_id,
    'isPrimary', m.is_primary_for_goal,
    'name', m.name,
    'description', m.description,
    'kind', m.kind::text,
    'unit', m.unit,
    'aggregation', m.aggregation::text,
    'direction', m.direction::text,
    'target', m.target_value::text,
    'status', m.status,
    'current', case
      when m.aggregation = 'latest' then current_entry.value::text
      else month_sum.total::text
    end,
    'currentOn', case
      when m.aggregation = 'latest' then current_entry.recorded_on
      else month_sum.latest_on
    end
  )
  from public.metrics m
  left join lateral (
    select value, recorded_on
    from public.metric_entries
    where metric_id = m.id
      and recorded_on <= p_today
    order by recorded_on desc
    limit 1
  ) current_entry on true
  left join lateral (
    select sum(value) as total, max(recorded_on) as latest_on
    from public.metric_entries
    where metric_id = m.id
      and recorded_on between p_month_start and p_month_end
  ) month_sum on true
  where m.id = p_metric_id
    and m.user_id = p_user_id;
$$;

create function public.list_metric_entries(p_user_id uuid, p_metric_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select case
    when not exists (
      select 1 from public.metrics
      where id = p_metric_id and user_id = p_user_id
    ) then null
    else coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', metric_entries.id,
          'recordedOn', metric_entries.recorded_on,
          'value', metric_entries.value::text,
          'note', metric_entries.note
        )
        order by metric_entries.recorded_on desc
      )
      from public.metric_entries
      where metric_entries.metric_id = p_metric_id
        and metric_entries.user_id = p_user_id
    ), '[]'::jsonb)
  end;
$$;

create function public.save_metric_entry(
  p_user_id uuid,
  p_metric_id uuid,
  p_recorded_on date,
  p_value text,
  p_note text
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  saved_id uuid;
begin
  if not exists (
    select 1 from public.metrics
    where id = p_metric_id and user_id = p_user_id
  ) then
    return null;
  end if;
  if p_value !~ '^-?[0-9]{1,14}(\.[0-9]{1,4})?$' then
    raise exception 'Enter a number.' using errcode = '23514';
  end if;

  insert into public.metric_entries (metric_id, user_id, recorded_on, value, note)
  values (p_metric_id, p_user_id, p_recorded_on, p_value::numeric(18, 4), coalesce(p_note, ''))
  on conflict (metric_id, recorded_on)
  do update set
    value = excluded.value,
    note = excluded.note,
    updated_at = now()
  returning id into saved_id;

  return saved_id;
end;
$$;

create function public.set_primary_metric(
  p_user_id uuid,
  p_goal_id uuid,
  p_metric_id uuid
) returns boolean
language plpgsql
set search_path = public
as $$
declare
  existing_goal uuid;
begin
  if not exists (
    select 1 from public.goals
    where id = p_goal_id and user_id = p_user_id
  ) then
    return false;
  end if;

  if p_metric_id is null then
    update public.metrics
    set is_primary_for_goal = false, updated_at = now()
    where user_id = p_user_id
      and goal_id = p_goal_id
      and is_primary_for_goal;
    return true;
  end if;

  select goal_id into existing_goal
  from public.metrics
  where id = p_metric_id and user_id = p_user_id;
  if not found then
    return false;
  end if;
  if existing_goal is not null and existing_goal <> p_goal_id then
    return false;
  end if;

  update public.metrics
  set is_primary_for_goal = false, updated_at = now()
  where user_id = p_user_id
    and goal_id = p_goal_id
    and is_primary_for_goal
    and id <> p_metric_id;

  update public.metrics
  set goal_id = p_goal_id,
      is_primary_for_goal = true,
      updated_at = now()
  where id = p_metric_id
    and user_id = p_user_id;

  return true;
end;
$$;

alter table public.metrics enable row level security;
alter table public.metric_entries enable row level security;

revoke all on table public.metrics from anon, authenticated;
revoke all on table public.metric_entries from anon, authenticated;

revoke all on type public.metric_kind from anon, authenticated;
revoke all on type public.metric_aggregation from anon, authenticated;
revoke all on type public.metric_direction from anon, authenticated;

revoke all on function public.user_net_worth(uuid, date) from public, anon, authenticated;
revoke all on function public.area_cash_flow(uuid, smallint, date, date) from public, anon, authenticated;
revoke all on function public.metric_display_values(uuid, date, date, date) from public, anon, authenticated;
revoke all on function public.goal_measurements(uuid, date, date, date) from public, anon, authenticated;
revoke all on function public.read_metric(uuid, uuid, date, date, date) from public, anon, authenticated;
revoke all on function public.list_metric_entries(uuid, uuid) from public, anon, authenticated;
revoke all on function public.save_metric_entry(uuid, uuid, date, text, text) from public, anon, authenticated;
revoke all on function public.set_primary_metric(uuid, uuid, uuid) from public, anon, authenticated;

grant execute on function public.user_net_worth(uuid, date) to service_role;
grant execute on function public.area_cash_flow(uuid, smallint, date, date) to service_role;
grant execute on function public.metric_display_values(uuid, date, date, date) to service_role;
grant execute on function public.goal_measurements(uuid, date, date, date) to service_role;
grant execute on function public.read_metric(uuid, uuid, date, date, date) to service_role;
grant execute on function public.list_metric_entries(uuid, uuid) to service_role;
grant execute on function public.save_metric_entry(uuid, uuid, date, text, text) to service_role;
grant execute on function public.set_primary_metric(uuid, uuid, uuid) to service_role;

notify pgrst, 'reload schema';
