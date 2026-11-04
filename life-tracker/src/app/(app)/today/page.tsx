import Link from "next/link";
import { formatCivilDate, todayInTimezone } from "../../../lib/dates";
import { requireUser } from "../../../lib/current-user";
import { getSettings } from "../../../modules/settings/queries";
import { TodayHabits } from "../../../components/habits/today-habits";
import { InboxCount } from "../../../components/tasks/captured-inbox";
import { TaskLine } from "../../../components/tasks/task-line";
import { EmptyState } from "../../../components/ui/empty-state";
import { loadHabitsForToday } from "../../../modules/habits/queries";
import { estimateSentence, inboxCount } from "../../../modules/tasks/day-summary";
import { materializeActiveSeries } from "../../../modules/tasks/materialize";
import { groupForToday, listTasksForUser } from "../../../modules/tasks/views";

// The session check waits for the request, so this page cannot navigate instantly.
export const instant = false;

export default async function TodayPage() {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const settings = await getSettings(user.id);
  const today = todayInTimezone(new Date(), settings.timezone);
  const [habits] = await Promise.all([
    loadHabitsForToday(user.id, today),
    materializeActiveSeries(user.id, today),
  ]);
  const tasks = await listTasksForUser(user.id);
  const groups = groupForToday(tasks, today);
  const estimate = estimateSentence(groups.scheduled);
  const hasAttention = groups.dueToday.length > 0 || groups.overdue.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-8 text-neutral-900 sm:px-6">
      <header className="page-hero">
        <p className="eyebrow">Today</p>
        <h1 className="mt-1 text-3xl font-semibold">What deserves your attention?</h1>
        <p className="mt-2 text-sm text-neutral-700">{formatCivilDate(today)}</p>
      </header>
      {hasAttention ? (
        <section>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Needs attention</p>
              <h2 className="mt-1 text-lg font-semibold">Deadlines</h2>
            </div>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {[...groups.overdue, ...groups.dueToday].map((task) => (
              <TaskLine key={task.id} task={task} />
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Planned today</p>
            <h2 className="mt-1 text-lg font-semibold">Your focus</h2>
          </div>
          {estimate ? <p className="text-sm text-neutral-700">{estimate}</p> : null}
        </div>
        {groups.scheduled.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="Your day is open"
              description="Schedule a task from your inbox, or use Quick add and plan it for today."
              href="/tasks?view=inbox"
              action="Plan from inbox"
            />
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {groups.scheduled.map((task) => (
              <TaskLine key={task.id} task={task} />
            ))}
          </ul>
        )}
      </section>
      <TodayHabits today={today} due={habits.due} weeklyMet={habits.weeklyMet} />
      <section className="inbox-strip">
        <div>
          <p className="text-sm text-neutral-700">Unplanned ideas and tasks</p>
          <InboxCount initial={inboxCount(tasks)} className="mt-1 font-semibold" />
        </div>
        <p>
          <Link href="/tasks" className="underline">
            Review inbox
          </Link>
        </p>
      </section>
    </div>
  );
}
