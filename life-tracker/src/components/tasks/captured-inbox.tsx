"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { inboxLabel } from "../../modules/tasks/day-summary";
import {
  withCapturedInbox,
  type CapturedInboxTask,
} from "../../modules/tasks/captured-inbox";
import type { TaskListItem } from "../../modules/tasks/views";
import { TaskLine } from "./task-line";

const capturedEvent = "life-tracker:inbox-captured";
const publishedIds = new Set<string>();

export function publishCapturedInboxTask(task: CapturedInboxTask): void {
  if (publishedIds.has(task.id)) {
    return;
  }
  publishedIds.add(task.id);
  window.dispatchEvent(new CustomEvent<CapturedInboxTask>(capturedEvent, { detail: task }));
}

export function InboxCount({ initial, className }: { initial: number; className?: string }) {
  const [baseline, setBaseline] = useState(initial);
  const [extra, setExtra] = useState(0);
  if (initial !== baseline) {
    setBaseline(initial);
    setExtra(0);
  }
  useEffect(() => subscribe(() => setExtra((count) => count + 1)), []);
  const count = initial === baseline ? initial + extra : initial;

  return (
    <p className={className}>
      <Link href="/tasks?view=inbox" className="underline">
        {inboxLabel(count)}
      </Link>
    </p>
  );
}

export function InboxTaskList({
  tasks,
  acceptCapture,
}: {
  tasks: TaskListItem[];
  acceptCapture: boolean;
}) {
  const [captured, setCaptured] = useState<CapturedInboxTask[]>([]);
  const signature = tasks.map((task) => task.id).join("\n");
  const [seen, setSeen] = useState(signature);
  if (signature !== seen) {
    setSeen(signature);
    setCaptured([]);
  }
  useEffect(() => {
    if (!acceptCapture) {
      return;
    }
    return subscribe((task) => {
      setCaptured((current) => (current.some((item) => item.id === task.id) ? current : [task, ...current]));
    });
  }, [acceptCapture]);
  const visible = acceptCapture && signature === seen ? withCapturedInbox(tasks, captured) : tasks;
  if (visible.length === 0) {
    return <p>Inbox is empty.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {visible.map((task) => (
        <TaskLine key={task.id} task={task} />
      ))}
    </ul>
  );
}

function subscribe(onCaptured: (task: CapturedInboxTask) => void): () => void {
  function handle(event: Event) {
    onCaptured((event as CustomEvent<CapturedInboxTask>).detail);
  }
  window.addEventListener(capturedEvent, handle);
  return () => window.removeEventListener(capturedEvent, handle);
}
