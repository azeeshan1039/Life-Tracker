export function estimateSentence(tasks: { estimatedMinutes: number | null }[]): string | null {
  const estimated = tasks.filter((task) => task.estimatedMinutes !== null && task.estimatedMinutes > 0);
  if (estimated.length === 0) {
    return null;
  }
  const total = estimated.reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);
  const missing = tasks.length - estimated.length;
  if (missing === 0) {
    return `About ${total} minutes estimated.`;
  }
  const missingText = missing === 1 ? "1 task has no estimate" : `${missing} tasks have no estimate`;
  return `About ${total} minutes estimated, ${missingText}.`;
}

export function inboxCount(tasks: { status: string }[]): number {
  return tasks.filter((task) => task.status === "inbox").length;
}

export function inboxLabel(count: number): string {
  return count === 1 ? "1 in the inbox" : `${count} in the inbox`;
}
