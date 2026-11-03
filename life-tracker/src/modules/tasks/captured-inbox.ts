import { inboxTasks, type TaskListItem } from "./views";

export type CapturedInboxTask = {
  id: string;
  title: string;
};

export function acceptsCapturedInbox(lifeAreaId: number | null, priority: number | null): boolean {
  return lifeAreaId === null && (priority === null || priority === 0);
}

export function withCapturedInbox(tasks: TaskListItem[], captured: readonly CapturedInboxTask[]): TaskListItem[] {
  const seen = new Set(tasks.map((task) => task.id));
  const added: TaskListItem[] = [];
  for (const task of captured) {
    if (seen.has(task.id)) {
      continue;
    }
    seen.add(task.id);
    added.push(toInboxItem(task));
  }
  return inboxTasks([...added, ...tasks]);
}

function toInboxItem(task: CapturedInboxTask): TaskListItem {
  return {
    id: task.id,
    title: task.title,
    status: "inbox",
    priority: 0,
    dueOn: null,
    scheduledFor: null,
    lifeAreaId: null,
    areaName: null,
    estimatedMinutes: null,
  };
}
