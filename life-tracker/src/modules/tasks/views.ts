import { getAdminClient } from "../../lib/supabase-admin";
import type { TaskStatus } from "./schema";

export type TaskListItem = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: number;
  dueOn: string | null;
  scheduledFor: string | null;
  lifeAreaId: number | null;
  areaName: string | null;
  estimatedMinutes: number | null;
};

export type CompletionItem = TaskListItem & {
  completedAt: string;
};

export type DayGroups = {
  scheduled: TaskListItem[];
  dueToday: TaskListItem[];
  overdue: TaskListItem[];
};

const workingStatuses = new Set<TaskStatus>(["todo", "in_progress"]);

export function groupForToday(tasks: TaskListItem[], today: string): DayGroups {
  const working = tasks.filter((task) => workingStatuses.has(task.status));
  const scheduled = sortTasks(working.filter((task) => task.scheduledFor === today));
  const scheduledIds = new Set(scheduled.map((task) => task.id));
  const dueToday = sortTasks(
    working.filter((task) => task.dueOn === today && !scheduledIds.has(task.id)),
  );
  const overdue = sortTasks(
    working.filter((task) => task.dueOn !== null && task.dueOn < today),
  );
  return { scheduled, dueToday, overdue };
}

export function upcomingTasks(tasks: TaskListItem[], today: string): {
  dated: TaskListItem[];
  undated: TaskListItem[];
} {
  const working = tasks.filter((task) => workingStatuses.has(task.status));
  const dated = working.filter((task) => hasUpcomingDate(task, today));
  const undated = working.filter((task) => task.scheduledFor === null && task.dueOn === null);
  dated.sort(compareUpcoming(today));
  undated.sort(compareTitle);
  return { dated, undated };
}

export function overdueTasks(tasks: TaskListItem[], today: string): TaskListItem[] {
  return sortTasks(
    tasks.filter(
      (task) => workingStatuses.has(task.status) && task.dueOn !== null && task.dueOn < today,
    ),
  );
}

export function inboxTasks(tasks: TaskListItem[]): TaskListItem[] {
  return tasks
    .filter((task) => task.status === "inbox")
    .sort(compareTitle);
}

export function filterTasks<T extends TaskListItem>(
  tasks: T[],
  filter: { lifeAreaId: number | null; priority: number | null },
): T[] {
  return tasks.filter((task) => {
    if (filter.lifeAreaId !== null && task.lifeAreaId !== filter.lifeAreaId) {
      return false;
    }
    if (filter.priority !== null && task.priority !== filter.priority) {
      return false;
    }
    return true;
  });
}

export function priorityLabel(priority: number): string {
  if (priority === 1) {
    return "Low";
  }
  if (priority === 2) {
    return "Medium";
  }
  if (priority === 3) {
    return "High";
  }
  return "None";
}

export async function listLifeAreas(): Promise<{ id: number; name: string }[]> {
  const { data, error } = await getAdminClient()
    .from("life_areas")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function listTasksForUser(userId: string): Promise<TaskListItem[]> {
  const [areas, result] = await Promise.all([
    listLifeAreas(),
    getAdminClient()
      .from("tasks")
      .select("id, title, status, priority, due_on, scheduled_for, life_area_id, estimated_minutes")
      .eq("user_id", userId),
  ]);
  if (result.error) {
    throw new Error(result.error.message);
  }
  const names = new Map(areas.map((area) => [area.id, area.name]));
  return (result.data ?? []).map((row) => toItem(row, names));
}

export async function listRecentCompletions(userId: string, since: string): Promise<CompletionItem[]> {
  const { data: events, error } = await getAdminClient()
    .from("task_activity")
    .select("task_id, occurred_at")
    .eq("user_id", userId)
    .eq("event", "completed")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(50);
  if (error) {
    throw new Error(error.message);
  }
  const rows = events ?? [];
  if (rows.length === 0) {
    return [];
  }

  const areas = await listLifeAreas();
  const names = new Map(areas.map((area) => [area.id, area.name]));
  const ids = [...new Set(rows.map((row) => row.task_id))];
  const { data: tasks, error: taskError } = await getAdminClient()
    .from("tasks")
    .select("id, title, status, priority, due_on, scheduled_for, life_area_id")
    .eq("user_id", userId)
    .in("id", ids);
  if (taskError) {
    throw new Error(taskError.message);
  }
  const byId = new Map((tasks ?? []).map((row) => [row.id, toItem(row, names)]));
  return rows.flatMap((row) => {
    const task = byId.get(row.task_id);
    return task ? [{ ...task, completedAt: row.occurred_at }] : [];
  });
}

function toItem(
  row: {
    id: string;
    title: string;
    status: TaskStatus;
    priority: number;
    due_on: string | null;
    scheduled_for: string | null;
    life_area_id: number | null;
    estimated_minutes?: number | null;
  },
  names: Map<number, string>,
): TaskListItem {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueOn: row.due_on,
    scheduledFor: row.scheduled_for,
    lifeAreaId: row.life_area_id,
    areaName: row.life_area_id === null ? null : (names.get(row.life_area_id) ?? null),
    estimatedMinutes: row.estimated_minutes ?? null,
  };
}

function hasUpcomingDate(task: TaskListItem, today: string): boolean {
  return (
    (task.scheduledFor !== null && task.scheduledFor >= today) ||
    (task.dueOn !== null && task.dueOn >= today)
  );
}

function nearestDate(task: TaskListItem, today: string): string {
  const dates = [task.scheduledFor, task.dueOn].filter(
    (date): date is string => date !== null && date >= today,
  );
  return dates.sort()[0] ?? "9999-12-31";
}

function compareUpcoming(today: string) {
  return (left: TaskListItem, right: TaskListItem) => {
    if (left.priority !== right.priority) {
      return right.priority - left.priority;
    }
    const leftDate = nearestDate(left, today);
    const rightDate = nearestDate(right, today);
    if (leftDate !== rightDate) {
      return leftDate < rightDate ? -1 : 1;
    }
    return left.title.localeCompare(right.title);
  };
}

function compareTitle(left: TaskListItem, right: TaskListItem): number {
  return left.title.localeCompare(right.title);
}

function sortTasks(tasks: TaskListItem[]): TaskListItem[] {
  return [...tasks].sort((left, right) => {
    if (left.priority !== right.priority) {
      return right.priority - left.priority;
    }
    return left.title.localeCompare(right.title);
  });
}
