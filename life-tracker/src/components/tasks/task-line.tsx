import Link from "next/link";
import { formatCivilDate } from "../../lib/dates";
import { priorityLabel, type CompletionItem, type TaskListItem } from "../../modules/tasks/views";
import { TaskRowActions } from "./task-row-actions";

export function TaskLine({ task }: { task: TaskListItem }) {
  const dates = [
    task.scheduledFor ? `Scheduled ${formatCivilDate(task.scheduledFor)}` : null,
    task.dueOn ? `Due ${formatCivilDate(task.dueOn)}` : null,
  ].filter((part): part is string => part !== null);

  return (
    <li className="task-row rounded border border-neutral-200 px-3 py-3">
      <div className="min-w-0">
        <p className="font-medium">
          <Link href={`/tasks/${task.id}`} className="underline">
            {task.title}
          </Link>
        </p>
        <p className="text-sm text-neutral-700">
          {[...dates, task.areaName, priorityLabel(task.priority)].filter(Boolean).join(" · ")}
        </p>
      </div>
      <TaskRowActions taskId={task.id} dueOn={task.dueOn} />
    </li>
  );
}

export function CompletionLine({ item, completedOn }: { item: CompletionItem; completedOn: string }) {
  return (
    <li className="rounded border border-neutral-200 px-3 py-3">
      <p className="font-medium">
        <Link href={`/tasks/${item.id}`} className="underline">
          {item.title}
        </Link>
      </p>
      <p className="text-sm text-neutral-700">Completed {formatCivilDate(completedOn)}</p>
    </li>
  );
}
