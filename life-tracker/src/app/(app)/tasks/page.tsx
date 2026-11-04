import Link from "next/link";
import { requireUser } from "../../../lib/current-user";
import { getSettings } from "../../../modules/settings/queries";
import { InboxTaskList } from "../../../components/tasks/captured-inbox";
import { CompletionLine, TaskLine } from "../../../components/tasks/task-line";
import { EmptyState } from "../../../components/ui/empty-state";
import {
  filterTasks,
  inboxTasks,
  listLifeAreas,
  listRecentCompletions,
  listTasksForUser,
  overdueTasks,
  upcomingTasks,
  type TaskListItem,
} from "../../../modules/tasks/views";
import { todayInTimezone } from "../../../lib/dates";
import { acceptsCapturedInbox } from "../../../modules/tasks/captured-inbox";
import { materializeActiveSeries } from "../../../modules/tasks/materialize";

export const instant = false;

const views = ["upcoming", "overdue", "inbox", "completed"] as const;
type TaskView = (typeof views)[number];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const params = await searchParams;
  const view = parseView(first(params.view));
  const area = first(params.area) ?? "";
  const priority = first(params.priority) ?? "";
  const lifeAreaId = area === "" ? null : Number(area);
  const priorityFilter = priority === "" ? null : Number(priority);
  const settings = await getSettings(user.id);
  const today = todayInTimezone(new Date(), settings.timezone);
  const areasPromise = listLifeAreas();
  await materializeActiveSeries(user.id, today);
  const [areas, taskRows] = await Promise.all([areasPromise, listTasksForUser(user.id, areasPromise)]);
  const tasks = filterTasks(taskRows, {
    lifeAreaId: Number.isInteger(lifeAreaId) ? lifeAreaId : null,
    priority: Number.isInteger(priorityFilter) ? priorityFilter : null,
  });

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8 text-neutral-900 sm:px-6">
      <h1 className="text-3xl font-semibold">Tasks</h1>
      <nav aria-label="Task views" className="flex flex-wrap gap-2">
        {views.map((item) => (
          <Link
            key={item}
            href={viewHref(item, area, priority)}
            aria-current={item === view ? "page" : undefined}
            className={`rounded border border-neutral-300 px-3 py-2 ${item === view ? "font-semibold" : "font-normal"}`}
          >
            {labelFor(item)}
          </Link>
        ))}
      </nav>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="view" value={view} />
        <label className="flex flex-col gap-1 text-sm">
          Area
          <select name="area" defaultValue={area} className="rounded border border-neutral-300 px-3 py-2">
            <option value="">All areas</option>
            {areas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Priority
          <select name="priority" defaultValue={priority} className="rounded border border-neutral-300 px-3 py-2">
            <option value="">Any</option>
            <option value="0">None</option>
            <option value="1">Low</option>
            <option value="2">Medium</option>
            <option value="3">High</option>
          </select>
        </label>
        <button type="submit" className="rounded border border-neutral-300 px-3 py-2">
          Apply
        </button>
      </form>
      {view === "completed" ? (
        <CompletedView
          userId={user.id}
          timeZone={settings.timezone}
          lifeAreaId={Number.isInteger(lifeAreaId) ? lifeAreaId : null}
          priority={Number.isInteger(priorityFilter) ? priorityFilter : null}
        />
      ) : (
        <OpenView
          view={view}
          tasks={tasks}
          today={today}
          acceptCapture={acceptsCapturedInbox(
            Number.isInteger(lifeAreaId) ? lifeAreaId : null,
            Number.isInteger(priorityFilter) ? priorityFilter : null,
          )}
        />
      )}
    </div>
  );
}

function OpenView({
  view,
  tasks,
  today,
  acceptCapture,
}: {
  view: Exclude<TaskView, "completed">;
  tasks: TaskListItem[];
  today: string;
  acceptCapture: boolean;
}) {
  if (view === "inbox") {
    return <InboxTaskList tasks={inboxTasks(tasks)} acceptCapture={acceptCapture} />;
  }
  if (view === "overdue") {
    const overdue = overdueTasks(tasks, today);
    if (overdue.length === 0) {
      return <EmptyState title="Nothing is overdue" description="You are caught up. Keep your attention on what is planned next." />;
    }
    return <TaskItems tasks={overdue} />;
  }
  const upcoming = upcomingTasks(tasks, today);
  if (upcoming.dated.length === 0 && upcoming.undated.length === 0) {
    return (
      <EmptyState
        title="Nothing is coming up"
        description="Use Quick add when something becomes worth remembering. It will wait safely in your inbox."
      />
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <TaskItems tasks={upcoming.dated} />
      {upcoming.undated.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">Undated</h2>
          <div className="mt-2">
            <TaskItems tasks={upcoming.undated} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

async function CompletedView({
  userId,
  timeZone,
  lifeAreaId,
  priority,
}: {
  userId: string;
  timeZone: string;
  lifeAreaId: number | null;
  priority: number | null;
}) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const completions = filterTasks(await listRecentCompletions(userId, since), { lifeAreaId, priority });
  if (completions.length === 0) {
    return <EmptyState title="No recent completions" description="Completed work from the last 30 days will appear here." />;
  }
  return (
    <ul className="flex flex-col gap-2">
      {completions.map((item) => (
        <CompletionLine
          key={`${item.id}-${item.completedAt}`}
          item={item}
          completedOn={todayInTimezone(new Date(item.completedAt), timeZone)}
        />
      ))}
    </ul>
  );
}

function TaskItems({ tasks }: { tasks: TaskListItem[] }) {
  if (tasks.length === 0) {
    return null;
  }
  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskLine key={task.id} task={task} />
      ))}
    </ul>
  );
}

function parseView(value: string | undefined): TaskView {
  if (value === "overdue" || value === "inbox" || value === "completed") {
    return value;
  }
  return "upcoming";
}

function labelFor(view: TaskView): string {
  if (view === "upcoming") {
    return "Upcoming";
  }
  if (view === "overdue") {
    return "Overdue";
  }
  if (view === "inbox") {
    return "Inbox";
  }
  return "Completed";
}

function viewHref(view: TaskView, area: string, priority: string): string {
  const params = new URLSearchParams({ view });
  if (area) {
    params.set("area", area);
  }
  if (priority) {
    params.set("priority", priority);
  }
  return `/tasks?${params.toString()}`;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
