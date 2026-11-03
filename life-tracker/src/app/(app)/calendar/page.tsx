import Link from "next/link";
import { CaptureForm } from "../../../components/tasks/capture-form";
import { DayTaskForm } from "../../../components/tasks/day-task-form";
import { addCivilDays, formatCivilDate, formatMonth, readCivilDate, shiftMonth, todayInTimezone, weekdayLabel } from "../../../lib/dates";
import { requireUser } from "../../../lib/current-user";
import { getSettings } from "../../../modules/settings/queries";
import { buildMonthWeeks, buildWeek, entriesForMilestones, entriesForTasks, entriesOn } from "../../../modules/tasks/calendar";
import { materializeActiveSeries } from "../../../modules/tasks/materialize";
import { listCalendarTasks } from "../../../modules/tasks/queries";
import { listCalendarMilestones } from "../../../modules/projects/queries";

export const instant = false;

const visibleTitles = 3;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const params = await searchParams;
  const settings = await getSettings(user.id);
  const today = todayInTimezone(new Date(), settings.timezone);
  await materializeActiveSeries(user.id, today);
  const month = parseMonth(first(params.month), today);
  const weekAnchor = parseDate(first(params.week), today);
  const selected = parseDate(first(params.day), "");
  const entries = [
    ...entriesForTasks(await listCalendarTasks(user.id), settings.timezone),
    ...entriesForMilestones(await listCalendarMilestones(user.id)),
  ];
  const weeks = buildMonthWeeks(month, settings.weekStartsOn);
  const agenda = buildWeek(weekAnchor, settings.weekStartsOn);
  const weekdayNames = agenda.map((date) => weekdayLabel(date));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 text-neutral-900">
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <CaptureForm />
      <section className="hidden md:block">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{formatMonth(month)}</h2>
          <div className="flex gap-2">
            <Link className="rounded border border-neutral-300 px-3 py-2" href={href({ month: shiftMonth(month, -1), week: weekAnchor, day: selected })}>
              Previous
            </Link>
            <Link className="rounded border border-neutral-300 px-3 py-2" href={href({ month: shiftMonth(month, 1), week: weekAnchor, day: selected })}>
              Next
            </Link>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-sm">
          {weekdayNames.map((name) => (
            <div key={name} className="px-1 py-1 font-medium">
              {name}
            </div>
          ))}
          {weeks.flat().map((date) => {
            const items = entriesOn(entries, date);
            const outside = !date.startsWith(month);
            return (
              <div key={date} className={`min-h-24 rounded border border-neutral-200 p-1 ${outside ? "text-neutral-400" : ""}`}>
                <Link href={href({ month, week: date, day: date })} className="font-medium underline">
                  {Number(date.slice(8))}
                </Link>
                <ul className="mt-1 flex flex-col gap-1">
                  {items.slice(0, visibleTitles).map((item) => (
                    <li key={`${item.role}-${item.taskId}`}>
                      <Link href={item.href ?? `/tasks/${item.taskId}`} className="underline">
                        {item.kind === "timed" ? item.timeLabel : item.role === "due" ? "Due" : item.role === "milestone" ? "Milestone" : "Scheduled"} {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                {items.length > visibleTitles ? (
                  <Link href={href({ month, week: date, day: date })} className="underline">
                    {items.length - visibleTitles} more
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Week of {formatCivilDate(agenda[0] ?? today)}</h2>
          <div className="flex gap-2">
            <Link className="min-h-11 rounded border border-neutral-300 px-3 py-2" href={href({ month, week: addCivilDays(weekAnchor, -7), day: selected })}>
              Previous
            </Link>
            <Link className="min-h-11 rounded border border-neutral-300 px-3 py-2" href={href({ month, week: addCivilDays(weekAnchor, 7), day: selected })}>
              Next
            </Link>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-4">
          {agenda.map((date) => {
            const items = entriesOn(entries, date);
            return (
              <section key={date}>
                <h3 className="font-medium">
                  <Link href={href({ month, week: date, day: date })} className="underline">
                    {weekdayLabel(date)} {formatCivilDate(date)}
                  </Link>
                </h3>
                {items.length === 0 ? null : (
                  <ul className="mt-2 flex flex-col gap-2">
                    {items.map((item) => (
                      <li key={`${item.role}-${item.taskId}`} className="rounded border border-neutral-200 px-3 py-3">
                        <Link href={item.href ?? `/tasks/${item.taskId}`} className="underline">
                          {item.title}
                        </Link>
                        <p className="text-sm text-neutral-700">
                          {item.kind === "timed" ? item.timeLabel : item.role === "due" ? "Due" : item.role === "milestone" ? "Milestone" : "Scheduled"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </section>
      {selected ? (
        <section>
          <h2 className="text-lg font-semibold">{formatCivilDate(selected)}</h2>
          <div className="mt-3">
            <DayTaskForm day={selected} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function href(input: { month: string; week: string; day: string }): string {
  const params = new URLSearchParams({ month: input.month, week: input.week });
  if (input.day) {
    params.set("day", input.day);
  }
  return `/calendar?${params.toString()}`;
}

function parseMonth(value: string | undefined, today: string): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }
  return today.slice(0, 7);
}

function parseDate(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }
  try {
    readCivilDate(value);
    return value;
  } catch {
    return fallback;
  }
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
