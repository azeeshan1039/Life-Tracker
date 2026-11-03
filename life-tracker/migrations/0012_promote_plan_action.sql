create or replace function public.promote_plan_action(
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

revoke all on function public.promote_plan_action(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.promote_plan_action(uuid, uuid, boolean) to service_role;

notify pgrst, 'reload schema';
