import { addCivilDays, formatClockTime, startOfWeek, todayInTimezone } from "../../lib/dates";

export type CalendarTask = {
  id: string;
  title: string;
  dueOn: string | null;
  scheduledFor: string | null;
  scheduledStart: string | null;
};

export type CalendarMilestone = {
  id: string;
  projectId: string;
  title: string;
  targetDate: string;
};

export type CalendarEntry = {
  taskId: string;
  title: string;
  date: string;
  kind: "all-day" | "timed";
  role: "due" | "scheduled" | "milestone";
  timeLabel: string | null;
  href?: string;
};

export function entriesForTasks(tasks: CalendarTask[], timeZone: string): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  for (const task of tasks) {
    if (task.scheduledStart) {
      const instant = new Date(task.scheduledStart);
      if (Number.isNaN(instant.getTime())) {
        continue;
      }
      entries.push({
        taskId: task.id,
        title: task.title,
        date: todayInTimezone(instant, timeZone),
        kind: "timed",
        role: "scheduled",
        timeLabel: formatClockTime(instant, timeZone),
      });
      continue;
    }
    if (task.scheduledFor) {
      entries.push(allDay(task, task.scheduledFor, "scheduled"));
    }
    if (task.dueOn && task.dueOn !== task.scheduledFor) {
      entries.push(allDay(task, task.dueOn, "due"));
    }
  }
  return entries;
}

export function entriesForMilestones(milestones: CalendarMilestone[]): CalendarEntry[] {
  return milestones.map((milestone) => ({
    taskId: milestone.id,
    title: milestone.title,
    date: milestone.targetDate,
    kind: "all-day" as const,
    role: "milestone" as const,
    timeLabel: null,
    href: `/projects/${milestone.projectId}`,
  }));
}

export function entriesOn(entries: CalendarEntry[], date: string): CalendarEntry[] {
  return entries.filter((entry) => entry.date === date);
}

export function buildWeek(anchor: string, weekStartsOn: number): string[] {
  const start = startOfWeek(anchor, weekStartsOn);
  return Array.from({ length: 7 }, (_, index) => addCivilDays(start, index));
}

export function buildMonthWeeks(month: string, weekStartsOn: number): string[][] {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    throw new Error(`Could not read month ${month}`);
  }
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  const first = `${match[1]}-${match[2]}-01`;
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const last = `${match[1]}-${match[2]}-${String(lastDay).padStart(2, "0")}`;
  const weeks: string[][] = [];
  let cursor = startOfWeek(first, weekStartsOn);
  const finalWeek = startOfWeek(last, weekStartsOn);
  while (cursor <= addCivilDays(finalWeek, 6)) {
    const week: string[] = [];
    for (let index = 0; index < 7; index += 1) {
      week.push(cursor);
      cursor = addCivilDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function allDay(task: CalendarTask, date: string, role: "due" | "scheduled"): CalendarEntry {
  return {
    taskId: task.id,
    title: task.title,
    date,
    kind: "all-day",
    role,
    timeLabel: null,
  };
}
