import { getAdminClient } from "../../lib/supabase-admin";
import type { CalendarTask } from "./calendar";
import type { TaskActivityRecord, TaskRecord, TaskStatus } from "./schema";

const taskColumns =
  "id, user_id, parent_task_id, series_id, occurrence_on, detached, title, notes, status, priority, due_on, scheduled_for, scheduled_start, scheduled_end, estimated_minutes, life_area_id, completed_at, cancelled_at";

type TaskRow = {
  id: string;
  user_id: string;
  parent_task_id: string | null;
  series_id: string | null;
  occurrence_on: string | null;
  detached: boolean;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: number;
  due_on: string | null;
  scheduled_for: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  estimated_minutes: number | null;
  life_area_id: number | null;
  completed_at: string | null;
  cancelled_at: string | null;
};

type ActivityRow = {
  id: string;
  task_id: string;
  user_id: string;
  event: string;
  from_status: TaskStatus | null;
  to_status: TaskStatus | null;
  occurred_at: string;
  detail: Record<string, unknown> | null;
};

function assertNoError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export async function getTask(userId: string, taskId: string): Promise<TaskRecord | null> {
  const { data, error } = await getAdminClient()
    .from("tasks")
    .select(taskColumns)
    .eq("user_id", userId)
    .eq("id", taskId)
    .maybeSingle();
  assertNoError(error);
  return data ? toTask(data) : null;
}

export async function listTaskActivity(userId: string, taskId: string): Promise<TaskActivityRecord[]> {
  const { data, error } = await getAdminClient()
    .from("task_activity")
    .select("id, task_id, user_id, event, from_status, to_status, occurred_at, detail")
    .eq("user_id", userId)
    .eq("task_id", taskId)
    .order("occurred_at", { ascending: true });
  assertNoError(error);
  return (data ?? []).map(toActivity);
}

export async function listSubtasks(userId: string, parentId: string): Promise<TaskRecord[]> {
  const { data, error } = await getAdminClient()
    .from("tasks")
    .select(taskColumns)
    .eq("user_id", userId)
    .eq("parent_task_id", parentId)
    .order("title", { ascending: true });
  assertNoError(error);
  return (data ?? []).map(toTask);
}

export async function loadTaskDetail(userId: string, taskId: string): Promise<
  | { ok: true; task: TaskRecord; subtasks: TaskRecord[]; activity: TaskActivityRecord[] }
  | { ok: false; message: string }
> {
  const task = await getTask(userId, taskId);
  if (!task) {
    return { ok: false, message: "This task is not available." };
  }
  const [subtasks, activity] = await Promise.all([
    listSubtasks(userId, taskId),
    listTaskActivity(userId, taskId),
  ]);
  return { ok: true, task, subtasks, activity };
}

export type SeriesTemplate = {
  id: string;
  isActive: boolean;
  title: string;
  notes: string;
  priority: number;
  estimatedMinutes: number | null;
  lifeAreaId: number | null;
  goalIds: string[];
};

export async function getSeries(userId: string, seriesId: string): Promise<SeriesTemplate | null> {
  const { data, error } = await getAdminClient()
    .from("recurrence_series")
    .select("id, is_active, title, notes, priority, estimated_minutes, life_area_id")
    .eq("user_id", userId)
    .eq("id", seriesId)
    .maybeSingle();
  assertNoError(error);
  if (!data) {
    return null;
  }
  const goals = await getAdminClient().from("series_goals").select("goal_id").eq("series_id", seriesId);
  assertNoError(goals.error);
  return {
    id: data.id,
    isActive: data.is_active,
    title: data.title,
    notes: data.notes,
    priority: data.priority,
    estimatedMinutes: data.estimated_minutes,
    lifeAreaId: data.life_area_id,
    goalIds: (goals.data ?? []).map((row) => row.goal_id),
  };
}

export async function listCalendarTasks(userId: string): Promise<CalendarTask[]> {
  const { data, error } = await getAdminClient()
    .from("tasks")
    .select("id, title, due_on, scheduled_for, scheduled_start, status")
    .eq("user_id", userId)
    .in("status", ["inbox", "todo", "in_progress"]);
  assertNoError(error);
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    dueOn: row.due_on,
    scheduledFor: row.scheduled_for,
    scheduledStart: row.scheduled_start,
  }));
}

function toTask(row: TaskRow): TaskRecord {
  return {
    id: row.id,
    userId: row.user_id,
    parentTaskId: row.parent_task_id,
    seriesId: row.series_id,
    occurrenceOn: row.occurrence_on,
    detached: row.detached,
    title: row.title,
    notes: row.notes,
    status: row.status,
    priority: row.priority,
    dueOn: row.due_on,
    scheduledFor: row.scheduled_for,
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    estimatedMinutes: row.estimated_minutes,
    lifeAreaId: row.life_area_id,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
  };
}

function toActivity(row: ActivityRow): TaskActivityRecord {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    event: row.event,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    occurredAt: row.occurred_at,
    detail: row.detail ?? {},
  };
}
