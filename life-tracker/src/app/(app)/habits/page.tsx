import Link from "next/link";
import { addCivilDays, isoWeekday, todayInTimezone } from "../../../lib/dates";
import { requireUser } from "../../../lib/current-user";
import { ArchiveHabit } from "../../../components/habits/archive-habit";
import { HabitForm } from "../../../components/habits/habit-form";
import { dayLabel } from "../../../components/habits/habit-history";
import { pauseHabitAction } from "../../../modules/habits/actions";
import { classify } from "../../../modules/habits/classify";
import { listHabits, listLogsSince } from "../../../modules/habits/queries";
import { getSettings } from "../../../modules/settings/queries";
import { listGoalChoices } from "../../../modules/goals/queries";
import { listLifeAreas } from "../../../modules/tasks/views";

export const instant = false;

const filters = ["active", "paused", "archived"] as const;

export default async function HabitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const params = await searchParams;
  const status = parseStatus(first(params.status));
  const area = parseArea(first(params.area));
  const settings = await getSettings(user.id);
  const today = todayInTimezone(new Date(), settings.timezone);
  const areas = await listLifeAreas();
  const goals = await listGoalChoices(user.id);
  const habits = (await listHabits(user.id, status)).filter((habit) => area === null || habit.lifeAreaId === area);
  const monday = addCivilDays(today, 1 - isoWeekday(today));
  const logs = status === "active" ? await listLogsSince(user.id, monday) : [];

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6 text-neutral-900">
      <h1 className="text-2xl font-semibold">Habits</h1>
      <nav aria-label="Habit status" className="flex gap-2">
        {filters.map((item) => (
          <Link
            key={item}
            href={habitHref(item, area)}
            aria-current={item === status ? "page" : undefined}
            className={`rounded border border-neutral-300 px-3 py-2 ${item === status ? "font-semibold" : ""}`}
          >
            {labelFor(item)}
          </Link>
        ))}
      </nav>
      {status === "active" ? (
        <section>
          <h2 className="text-lg font-semibold">New habit</h2>
          <div className="mt-3">
            <HabitForm habit={null} areas={areas} goals={goals} presetAreaId={area} />
          </div>
        </section>
      ) : null}
      {habits.length === 0 ? <p>No habits yet.</p> : null}
      <ul className="flex flex-col gap-3">
        {habits.map((habit) => {
          const result = classify(
            habit,
            today,
            today,
            logs.filter((log) => log.habitId === habit.id),
          );
          return (
            <li key={habit.id} className="rounded border border-neutral-200 px-3 py-3">
              <p className="font-medium">
                <Link href={`/habits/${habit.id}`} className="underline">
                  {habit.title}
                </Link>
              </p>
              {status === "active" ? (
                <p className="text-sm text-neutral-700">
                  {habit.scheduleKind === "weekly_quota"
                    ? `${result.week?.metCount ?? 0} of ${result.week?.weeklyTarget ?? habit.weeklyTarget}`
                    : dayLabel(result.day)}
                </p>
              ) : (
                <p className="text-sm text-neutral-700">{labelFor(habit.status)}</p>
              )}
              {habit.status === "active" ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <form action={pauseHabitAction}>
                    <input type="hidden" name="habitId" value={habit.id} />
                    <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
                      Pause
                    </button>
                  </form>
                  <ArchiveHabit habitId={habit.id} title={habit.title} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function habitHref(status: "active" | "paused" | "archived", area: number | null): string {
  const params = new URLSearchParams();
  if (status !== "active") {
    params.set("status", status);
  }
  if (area !== null) {
    params.set("area", String(area));
  }
  const query = params.toString();
  return query === "" ? "/habits" : `/habits?${query}`;
}

function parseArea(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const area = Number(value);
  return Number.isInteger(area) && area > 0 ? area : null;
}

function parseStatus(value: string | undefined): "active" | "paused" | "archived" {
  if (value === "paused" || value === "archived") {
    return value;
  }
  return "active";
}

function labelFor(status: "active" | "paused" | "archived"): string {
  if (status === "paused") {
    return "Paused";
  }
  if (status === "archived") {
    return "Archived";
  }
  return "Active";
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
