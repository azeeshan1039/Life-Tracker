export const TASK_STATUSES = ["inbox", "todo", "in_progress", "done", "cancelled"] as const;
export const OPEN_TASK_STATUSES = ["inbox", "todo", "in_progress"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type OpenTaskStatus = (typeof OPEN_TASK_STATUSES)[number];

export type TaskInput = {
  title: string;
  notes: string;
  status: OpenTaskStatus;
  priority: number;
  dueOn: string | null;
  scheduledFor: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  estimatedMinutes: number | null;
  lifeAreaId: number | null;
};

export type TaskRecord = Omit<TaskInput, "status"> & {
  id: string;
  userId: string;
  parentTaskId: string | null;
  seriesId: string | null;
  occurrenceOn: string | null;
  detached: boolean;
  status: TaskStatus;
  completedAt: string | null;
  cancelledAt: string | null;
};

export type TaskActivityRecord = {
  id: string;
  taskId: string;
  userId: string;
  event: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  occurredAt: string;
  detail: Record<string, unknown>;
};

export function isOpenStatus(status: TaskStatus): status is OpenTaskStatus {
  return status === "inbox" || status === "todo" || status === "in_progress";
}

export function isCivilDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

export function validateTaskInput(input: TaskInput): string | null {
  if (!input.title.trim()) {
    return "Title is required.";
  }
  if (!isOpenStatus(input.status)) {
    return "Choose an open status.";
  }
  if (!Number.isInteger(input.priority) || input.priority < 0 || input.priority > 3) {
    return "Priority must be from 0 to 3.";
  }
  if (!isOptionalCivilDate(input.dueOn) || !isOptionalCivilDate(input.scheduledFor)) {
    return "Dates must be calendar days.";
  }
  if (input.estimatedMinutes !== null && (!Number.isInteger(input.estimatedMinutes) || input.estimatedMinutes <= 0)) {
    return "Estimated minutes must be empty or greater than zero.";
  }
  if (input.lifeAreaId !== null && (!Number.isInteger(input.lifeAreaId) || input.lifeAreaId <= 0)) {
    return "Life area is not available.";
  }
  if (input.scheduledEnd && !input.scheduledStart) {
    return "A scheduled end needs a start.";
  }
  if (input.scheduledStart && input.scheduledEnd) {
    const start = Date.parse(input.scheduledStart);
    const end = Date.parse(input.scheduledEnd);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return "The scheduled end must be after the start.";
    }
  }
  return null;
}

export function isOptionalCivilDate(value: string | null): boolean {
  return value === null || isCivilDate(value);
}
