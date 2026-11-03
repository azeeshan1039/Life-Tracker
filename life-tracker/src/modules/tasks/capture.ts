import { createTask, type TaskResult } from "./mutations";

export function captureInboxTask(userId: string, title: string): Promise<TaskResult> {
  return createTask(userId, {
    title,
    notes: "",
    status: "inbox",
    priority: 0,
    dueOn: null,
    scheduledFor: null,
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes: null,
    lifeAreaId: null,
  });
}
