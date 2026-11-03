import Link from "next/link";
import { formatCivilDate, readCivilDate, todayInTimezone } from "../../../../lib/dates";
import { requireUser } from "../../../../lib/current-user";
import { ArchiveHabit } from "../../../../components/habits/archive-habit";
import { HabitForm } from "../../../../components/habits/habit-form";
import { HabitHistory } from "../../../../components/habits/habit-history";
import { HabitLogForm } from "../../../../components/habits/habit-log-form";
import { pauseHabitAction, resumeHabitAction } from "../../../../modules/habits/actions";
import { classesForHistory, getHabit, historyDays, listLogsSince } from "../../../../modules/habits/queries";
import { getSettings } from "../../../../modules/settings/queries";
import { listGoalChoices } from "../../../../modules/goals/queries";
import { listLifeAreas } from "../../../../modules/tasks/views";

export const instant = false;

export default async function HabitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const { id } = await params;
  const habit = await getHabit(user.id, id);
  if (!habit) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <p>This habit is not available.</p>
      </div>
    );
  }

  const query = await searchParams;
  const settings = await getSettings(user.id);
  const today = todayInTimezone(new Date(), settings.timezone);
  const selected = parseDay(first(query.day), today);
  const areas = await listLifeAreas();
  const goals = await listGoalChoices(user.id);
  const since = historyDays(today)[0] ?? today;
  const logs = await listLogsSince(user.id, since, habit.id);
  const history = classesForHistory(habit, today, logs);
  const existing = logs.find((log) => log.loggedOn === selected);
  const duration = splitDuration(habit.trackingType === "duration" ? existing?.value ?? null : null);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-6 text-neutral-900">
      <p>
        <Link href="/habits" className="underline">
          Habits
        </Link>
      </p>
      <h1 className="text-2xl font-semibold">{habit.title}</h1>
      {habit.status !== "active" ? <p>This habit is {habit.status}.</p> : null}
      {habit.scheduleKind === "weekly_quota" ? <p className="text-sm">Times-per-week habits reset on Monday.</p> : null}
      <HabitForm habit={habit} areas={areas} goals={goals} />
      <div className="flex flex-wrap gap-2">
        {habit.status === "active" ? (
          <form action={pauseHabitAction}>
            <input type="hidden" name="habitId" value={habit.id} />
            <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
              Pause
            </button>
          </form>
        ) : (
          <form action={resumeHabitAction}>
            <input type="hidden" name="habitId" value={habit.id} />
            <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
              Resume
            </button>
          </form>
        )}
        {habit.status !== "archived" ? <ArchiveHabit habitId={habit.id} title={habit.title} /> : null}
      </div>
      <section>
        <h2 className="text-lg font-semibold">History</h2>
        {logs.length === 0 ? <p className="mt-2">No days logged yet.</p> : null}
        <div className="mt-3">
          <HabitHistory habitId={habit.id} days={history} selected={selected} />
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold">{formatCivilDate(selected)}</h2>
        <div className="mt-3">
          <HabitLogForm
            key={selected}
            habitId={habit.id}
            day={selected}
            trackingType={habit.trackingType}
            value={habit.trackingType === "numeric" && existing?.value !== null && existing?.value !== undefined ? String(existing.value) : ""}
            hours={duration.hours}
            minutes={duration.minutes}
          />
        </div>
      </section>
    </div>
  );
}

function splitDuration(value: number | null): { hours: string; minutes: string } {
  if (value === null || !Number.isFinite(value)) {
    return { hours: "", minutes: "" };
  }
  return { hours: String(Math.floor(value / 60)), minutes: String(value % 60) };
}

function parseDay(value: string | undefined, today: string): string {
  if (!value) {
    return today;
  }
  try {
    readCivilDate(value);
    return value;
  } catch {
    return today;
  }
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
