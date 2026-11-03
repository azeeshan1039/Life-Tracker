import Link from "next/link";
import { formatCivilDate, weekdayLabel } from "../../lib/dates";
import type { DayClass } from "../../modules/habits/classify";

const labels: Record<DayClass, string> = {
  met: "Met",
  below_target: "Below target",
  missed: "Missed",
  skipped: "Skipped",
  rest: "Rest",
  unscheduled: "Unscheduled",
  due: "Due",
  upcoming: "Upcoming",
  paused: "Paused",
};

export function dayLabel(day: DayClass): string {
  return labels[day];
}

export function HabitHistory({
  habitId,
  days,
  selected,
}: {
  habitId: string;
  days: { date: string; day: DayClass }[];
  selected: string;
}) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((item) => (
        <Link
          key={item.date}
          href={`/habits/${habitId}?day=${item.date}`}
          aria-current={item.date === selected ? "date" : undefined}
          aria-label={`${formatCivilDate(item.date)}, ${labels[item.day]}`}
          className={`flex min-h-11 flex-col justify-center rounded border px-1 py-1 text-center text-xs ${item.date === selected ? "border-neutral-900" : "border-neutral-200"}`}
        >
          <span>{weekdayLabel(item.date)}</span>
          <span>{labels[item.day]}</span>
        </Link>
      ))}
    </div>
  );
}
