import { getAdminClient } from "../../lib/supabase-admin";
import { getTask } from "./queries";
import {
  isOpenStatus,
  isOptionalCivilDate,
  validateTaskInput,
  type OpenTaskStatus,
  type TaskInput,
  type TaskRecord,
  type TaskStatus,
} from "./schema";

export const TASK_NOT_FOUND = "This task is not available.";

export type TaskResult =
  | { ok: true; task: TaskRecord }
  | { ok: false; error: "not_found" | "invalid"; message: string };

type SaveInput = {
  taskId: string | null;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: number;
  dueOn: string | null;
  scheduledFor: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  estimatedMinutes: number | null;
  lifeAreaId: number | null;
  parentTaskId: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  event: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  detail: Record<string, unknown>;
  writeActivity: boolean;
};

export async function createTask(userId: string, input: TaskInput): Promise<TaskResult> {
  const invalid = validateTaskInput(input);
  if (invalid) {
    return { ok: false, error: "invalid", message: invalid };
  }
  return commit(userId, {
    taskId: null,
    ...fields(input),
    completedAt: null,
    cancelledAt: null,
    event: "created",
    fromStatus: null,
    toStatus: input.status,
    detail: {},
    writeActivity: true,
    parentTaskId: null,
  });
}

export async function editTask(userId: string, taskId: string, input: TaskInput): Promise<TaskResult> {
  const invalid = validateTaskInput(input);
  if (invalid) {
    return { ok: false, error: "invalid", message: invalid };
  }
  const existing = await getTask(userId, taskId);
  if (!existing) {
    return notFound();
  }
  if (!isOpenStatus(existing.status)) {
    return { ok: false, error: "invalid", message: "Reopen the task before editing it." };
  }
  if (existing.seriesId) {
    const { error } = await getAdminClient()
      .from("tasks")
      .update({ detached: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", taskId);
    if (error) {
      throw new Error(error.message);
    }
  }
  return commit(userId, {
    taskId,
    ...fields(input),
    completedAt: existing.completedAt,
    cancelledAt: existing.cancelledAt,
    event: "created",
    fromStatus: existing.status,
    toStatus: input.status,
    detail: {},
    writeActivity: false,
    parentTaskId: existing.parentTaskId,
  });
}

export async function completeTask(userId: string, taskId: string): Promise<TaskResult> {
  const existing = await getTask(userId, taskId);
  if (!existing) {
    return notFound();
  }
  if (!isOpenStatus(existing.status)) {
    return { ok: false, error: "invalid", message: "Only an open task can be completed." };
  }
  return commit(userId, {
    ...snapshot(existing),
    status: "done",
    completedAt: new Date().toISOString(),
    cancelledAt: null,
    event: "completed",
    fromStatus: existing.status,
    toStatus: "done",
    detail: {},
    writeActivity: true,
  });
}

export async function reopenTask(userId: string, taskId: string): Promise<TaskResult> {
  const existing = await getTask(userId, taskId);
  if (!existing) {
    return notFound();
  }
  if (existing.status !== "done" && existing.status !== "cancelled") {
    return { ok: false, error: "invalid", message: "Only a finished task can be reopened." };
  }
  return commit(userId, {
    ...snapshot(existing),
    status: "todo",
    completedAt: null,
    cancelledAt: null,
    event: "reopened",
    fromStatus: existing.status,
    toStatus: "todo",
    detail: {},
    writeActivity: true,
  });
}

export async function cancelTask(userId: string, taskId: string): Promise<TaskResult> {
  const existing = await getTask(userId, taskId);
  if (!existing) {
    return notFound();
  }
  if (!isOpenStatus(existing.status)) {
    return { ok: false, error: "invalid", message: "Only an open task can be cancelled." };
  }
  return commit(userId, {
    ...snapshot(existing),
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
    event: "cancelled",
    fromStatus: existing.status,
    toStatus: "cancelled",
    detail: {},
    writeActivity: true,
  });
}

export async function rescheduleTask(
  userId: string,
  taskId: string,
  dates: { scheduledFor: string | null; dueOn: string | null },
): Promise<TaskResult> {
  if (!isOptionalCivilDate(dates.scheduledFor) || !isOptionalCivilDate(dates.dueOn)) {
    return { ok: false, error: "invalid", message: "Dates must be calendar days." };
  }
  const existing = await getTask(userId, taskId);
  if (!existing) {
    return notFound();
  }
  const nextStatus: OpenTaskStatus | TaskStatus =
    existing.status === "inbox" && dates.scheduledFor ? "todo" : existing.status;
  return commit(userId, {
    ...snapshot(existing),
    status: nextStatus,
    scheduledFor: dates.scheduledFor,
    dueOn: dates.dueOn,
    event: "rescheduled",
    fromStatus: existing.status,
    toStatus: nextStatus,
    detail: {
      scheduled_for: { previous: existing.scheduledFor, next: dates.scheduledFor },
      due_on: { previous: existing.dueOn, next: dates.dueOn },
    },
    writeActivity: true,
  });
}

export async function addSubtask(
  userId: string,
  parentId: string,
  input: { title: string; dueOn: string | null },
): Promise<TaskResult> {
  const title = input.title.trim();
  if (!title) {
    return { ok: false, error: "invalid", message: "Title is required." };
  }
  if (!isOptionalCivilDate(input.dueOn)) {
    return { ok: false, error: "invalid", message: "Dates must be calendar days." };
  }
  const parent = await getTask(userId, parentId);
  if (!parent) {
    return notFound();
  }
  if (parent.parentTaskId) {
    return { ok: false, error: "invalid", message: "A subtask cannot have its own subtask." };
  }
  return commit(userId, {
    taskId: null,
    title,
    notes: "",
    status: "todo",
    priority: 0,
    dueOn: input.dueOn,
    scheduledFor: null,
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes: null,
    lifeAreaId: null,
    parentTaskId: parent.id,
    completedAt: null,
    cancelledAt: null,
    event: "created",
    fromStatus: null,
    toStatus: "todo",
    detail: {},
    writeActivity: true,
  });
}

function fields(input: TaskInput) {
  return {
    title: input.title.trim(),
    notes: input.notes,
    status: input.status,
    priority: input.priority,
    dueOn: input.dueOn,
    scheduledFor: input.scheduledFor,
    scheduledStart: input.scheduledStart,
    scheduledEnd: input.scheduledEnd,
    estimatedMinutes: input.estimatedMinutes,
    lifeAreaId: input.lifeAreaId,
  };
}

function snapshot(task: TaskRecord) {
  return {
    taskId: task.id,
    title: task.title,
    notes: task.notes,
    status: task.status,
    priority: task.priority,
    dueOn: task.dueOn,
    scheduledFor: task.scheduledFor,
    scheduledStart: task.scheduledStart,
    scheduledEnd: task.scheduledEnd,
    estimatedMinutes: task.estimatedMinutes,
    lifeAreaId: task.lifeAreaId,
    parentTaskId: task.parentTaskId,
    completedAt: task.completedAt,
    cancelledAt: task.cancelledAt,
  };
}

function notFound(): TaskResult {
  return { ok: false, error: "not_found", message: TASK_NOT_FOUND };
}

async function commit(userId: string, input: SaveInput): Promise<TaskResult> {
  const { data, error } = await getAdminClient().rpc("save_task_and_activity", {
    p_user_id: userId,
    p_task_id: input.taskId,
    p_title: input.title,
    p_notes: input.notes,
    p_status: input.status,
    p_priority: input.priority,
    p_due_on: input.dueOn,
    p_scheduled_for: input.scheduledFor,
    p_scheduled_start: input.scheduledStart,
    p_scheduled_end: input.scheduledEnd,
    p_estimated_minutes: input.estimatedMinutes,
    p_life_area_id: input.lifeAreaId,
    p_completed_at: input.completedAt,
    p_cancelled_at: input.cancelledAt,
    p_event: input.event,
    p_from_status: input.fromStatus,
    p_to_status: input.toStatus,
    p_detail: input.detail,
    p_write_activity: input.writeActivity,
    p_parent_task_id: input.parentTaskId,
  });
  if (error) {
    if (error.code === "23514" || error.code === "23503") {
      return { ok: false, error: "invalid", message: "This task could not be saved." };
    }
    throw new Error(error.message);
  }
  if (!data) {
    return notFound();
  }
  const task = await getTask(userId, data);
  if (!task) {
    return notFound();
  }
  return { ok: true, task };
}
