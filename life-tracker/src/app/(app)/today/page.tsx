import { cookies } from "next/headers";
import Link from "next/link";
import { formatCivilDate, todayInTimezone } from "../../../lib/dates";
import { requireUserFromToken } from "../../../lib/current-user";
import { sessionCookie } from "../../../modules/auth/session";
import { getSettings } from "../../../modules/settings/queries";
import { TodayHabits } from "../../../components/habits/today-habits";
import { CaptureForm } from "../../../components/tasks/capture-form";
import { InboxCount } from "../../../components/tasks/captured-inbox";
import { TaskLine } from "../../../components/tasks/task-line";
import { loadHabitsForToday } from "../../../modules/habits/queries";
import { estimateSentence, inboxCount } from "../../../modules/tasks/day-summary";
import { materializeActiveSeries } from "../../../modules/tasks/materialize";
import { groupForToday, listTasksForUser } from "../../../modules/tasks/views";

// The session check waits for the request, so this page cannot navigate instantly.
export const instant = false;

export async function loadToday(token: string | undefined) {
  return requireUserFromToken(token);
}

export default async function TodayPage() {
  const { connection } = await import("next/server");
  await connection();
  const cookieStore = await cookies();
  const user = await loadToday(cookieStore.get(sessionCookie.name)?.value);
  const settings = await getSettings(user.id);
  const today = todayInTimezone(new Date(), settings.timezone);
  const [habits] = await Promise.all([
    loadHabitsForToday(user.id, today),
    materializeActiveSeries(user.id, today),
  ]);
  const tasks = await listTasksForUser(user.id);
  const groups = groupForToday(tasks, today);
  const estimate = estimateSentence(groups.scheduled);
  const empty = groups.scheduled.length === 0 && groups.dueToday.length === 0 && groups.overdue.length === 0;

  return (
    <div className="has-capture-dock mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-8 text-neutral-900 sm:px-6">
      <div>
        <p className="eyebrow">Today</p>
        <h1 className="mt-1 text-3xl font-semibold">My Day</h1>
        <p className="mt-1 text-sm text-neutral-700">
          {formatCivilDate(today)} · {settings.timezone}
        </p>
      </div>
      <TodayHabits today={today} due={habits.due} weeklyMet={habits.weeklyMet} />
      <section>
        <h2 className="text-lg font-semibold">Scheduled</h2>
        {estimate ? <p className="mt-2">{estimate}</p> : null}
        {groups.scheduled.length === 0 ? (
          <p className="mt-2">Nothing scheduled today</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {groups.scheduled.map((task) => (
              <TaskLine key={task.id} task={task} />
            ))}
          </ul>
        )}
      </section>
      {groups.dueToday.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">Due today</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {groups.dueToday.map((task) => (
              <TaskLine key={task.id} task={task} />
            ))}
          </ul>
        </section>
      ) : null}
      {groups.overdue.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">Overdue</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {groups.overdue.map((task) => (
              <TaskLine key={task.id} task={task} />
            ))}
          </ul>
        </section>
      ) : null}
      {empty ? (
        <p>
          Scheduled is when you will do it. Due is the deadline.{" "}
          <Link href="/tasks" className="underline">
            Open tasks
          </Link>
        </p>
      ) : null}
      <InboxCount initial={inboxCount(tasks)} />
      <CaptureForm dock />
    </div>
  );
}
