import Link from "next/link";
import { HabitLogForm } from "./habit-log-form";
import { dayLabel } from "./habit-history";
import type { TodayHabit } from "../../modules/habits/today";

export function TodayHabits({
  today,
  due,
  weeklyMet,
  heading = true,
}: {
  today: string;
  due: TodayHabit[];
  weeklyMet: TodayHabit[];
  heading?: boolean;
}) {
  if (due.length === 0 && weeklyMet.length === 0) {
    return null;
  }
  return (
    <section>
      {heading ? <h2 className="text-lg font-semibold">Habits</h2> : null}
      {due.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-3">
          {due.map((habit) => (
            <li key={habit.id} className="rounded border border-neutral-200 px-3 py-3">
              <p className="font-medium">
                <Link href={`/habits/${habit.id}`} className="underline">
                  {habit.title}
                </Link>
              </p>
              <p className="text-sm text-neutral-700">{progress(habit)}</p>
              <div className="mt-2">
                <HabitLogForm habitId={habit.id} day={today} trackingType={habit.trackingType} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {weeklyMet.length > 0 ? (
        <details className="mt-3">
          <summary>Weekly habits met</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {weeklyMet.map((habit) => (
              <li key={habit.id}>
                <Link href={`/habits/${habit.id}`} className="underline">
                  {habit.title}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function progress(habit: TodayHabit): string {
  if (habit.weeklyTarget !== null) {
    return `${habit.metCount ?? 0} of ${habit.weeklyTarget}`;
  }
  return dayLabel(habit.day);
}
