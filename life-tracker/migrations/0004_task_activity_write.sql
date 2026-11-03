-- One task change and its activity row commit together.

create or replace function public.save_task_and_activity(
  p_user_id uuid,
  p_task_id uuid,
  p_title text,
  p_notes text,
  p_status public.task_status,
  p_priority smallint,
  p_due_on date,
  p_scheduled_for date,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz,
  p_estimated_minutes integer,
  p_life_area_id smallint,
  p_completed_at timestamptz,
  p_cancelled_at timestamptz,
  p_event text,
  p_from_status public.task_status,
  p_to_status public.task_status,
  p_detail jsonb,
  p_write_activity boolean
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  saved_id uuid;
begin
  if p_task_id is null then
    insert into public.tasks (
      user_id,
      title,
      notes,
      status,
      priority,
      due_on,
      scheduled_for,
      scheduled_start,
      scheduled_end,
      estimated_minutes,
      life_area_id,
      completed_at,
      cancelled_at
    ) values (
      p_user_id,
      p_title,
      p_notes,
      p_status,
      p_priority,
      p_due_on,
      p_scheduled_for,
      p_scheduled_start,
      p_scheduled_end,
      p_estimated_minutes,
      p_life_area_id,
      p_completed_at,
      p_cancelled_at
    )
    returning id into saved_id;
  else
    update public.tasks set
      title = p_title,
      notes = p_notes,
      status = p_status,
      priority = p_priority,
      due_on = p_due_on,
      scheduled_for = p_scheduled_for,
      scheduled_start = p_scheduled_start,
      scheduled_end = p_scheduled_end,
      estimated_minutes = p_estimated_minutes,
      life_area_id = p_life_area_id,
      completed_at = p_completed_at,
      cancelled_at = p_cancelled_at,
      updated_at = now()
    where id = p_task_id
      and user_id = p_user_id
    returning id into saved_id;

    if saved_id is null then
      return null;
    end if;
  end if;

  if p_write_activity then
    insert into public.task_activity (
      task_id,
      user_id,
      event,
      from_status,
      to_status,
      detail
    ) values (
      saved_id,
      p_user_id,
      p_event,
      p_from_status,
      p_to_status,
      coalesce(p_detail, '{}'::jsonb)
    );
  end if;

  return saved_id;
end;
$$;

revoke all on function public.save_task_and_activity(
  uuid,
  uuid,
  text,
  text,
  public.task_status,
  smallint,
  date,
  date,
  timestamptz,
  timestamptz,
  integer,
  smallint,
  timestamptz,
  timestamptz,
  text,
  public.task_status,
  public.task_status,
  jsonb,
  boolean
) from public, anon, authenticated;

grant execute on function public.save_task_and_activity(
  uuid,
  uuid,
  text,
  text,
  public.task_status,
  smallint,
  date,
  date,
  timestamptz,
  timestamptz,
  integer,
  smallint,
  timestamptz,
  timestamptz,
  text,
  public.task_status,
  public.task_status,
  jsonb,
  boolean
) to service_role;

notify pgrst, 'reload schema';
