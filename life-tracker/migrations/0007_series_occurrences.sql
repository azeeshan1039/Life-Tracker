create function public.insert_series_occurrences(
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
  inserted_count integer;
begin
  if not exists (
    select 1 from public.recurrence_series
    where id = p_series_id and user_id = p_user_id and is_active
  ) then
    return 0;
  end if;

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
  on conflict do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create function public.apply_series_template(
  p_user_id uuid,
  p_series_id uuid,
  p_today date,
  p_title text,
  p_notes text,
  p_priority smallint,
  p_estimated_minutes integer,
  p_life_area_id smallint
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  found_id uuid;
begin
  update public.recurrence_series set
    title = p_title,
    notes = p_notes,
    priority = p_priority,
    estimated_minutes = p_estimated_minutes,
    life_area_id = p_life_area_id,
    updated_at = now()
  where id = p_series_id
    and user_id = p_user_id
  returning id into found_id;

  if found_id is null then
    return null;
  end if;

  update public.tasks set
    title = p_title,
    notes = p_notes,
    priority = p_priority,
    estimated_minutes = p_estimated_minutes,
    life_area_id = p_life_area_id,
    updated_at = now()
  where user_id = p_user_id
    and series_id = p_series_id
    and detached = false
    and status in ('inbox', 'todo', 'in_progress')
    and occurrence_on >= p_today;

  return found_id;
end;
$$;

create function public.deactivate_series(
  p_user_id uuid,
  p_series_id uuid,
  p_today date
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  found_id uuid;
begin
  update public.recurrence_series set
    is_active = false,
    updated_at = now()
  where id = p_series_id
    and user_id = p_user_id
  returning id into found_id;

  if found_id is null then
    return null;
  end if;

  with targets as (
    select id, status
    from public.tasks
    where user_id = p_user_id
      and series_id = p_series_id
      and detached = false
      and status in ('inbox', 'todo', 'in_progress')
      and occurrence_on >= p_today
  ),
  updated as (
    update public.tasks as task
    set status = 'cancelled',
        cancelled_at = now(),
        updated_at = now()
    from targets
    where task.id = targets.id
    returning task.id, targets.status as from_status
  )
  insert into public.task_activity (
    task_id,
    user_id,
    event,
    from_status,
    to_status,
    detail
  )
  select id, p_user_id, 'cancelled', from_status, 'cancelled', '{}'::jsonb
  from updated;

  return found_id;
end;
$$;

revoke all on function public.insert_series_occurrences(
  uuid, uuid, date[], text, text, smallint, integer, smallint, uuid
) from public, anon, authenticated;

revoke all on function public.apply_series_template(
  uuid, uuid, date, text, text, smallint, integer, smallint
) from public, anon, authenticated;

revoke all on function public.deactivate_series(uuid, uuid, date)
  from public, anon, authenticated;

grant execute on function public.insert_series_occurrences(
  uuid, uuid, date[], text, text, smallint, integer, smallint, uuid
) to service_role;

grant execute on function public.apply_series_template(
  uuid, uuid, date, text, text, smallint, integer, smallint
) to service_role;

grant execute on function public.deactivate_series(uuid, uuid, date) to service_role;

notify pgrst, 'reload schema';
