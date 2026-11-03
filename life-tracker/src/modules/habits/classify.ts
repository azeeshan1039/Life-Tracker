import { addCivilDays, isoWeekday } from "../../lib/dates";

export type HabitDefinition = {
  status: "active" | "paused" | "archived";
  trackingType: "boolean" | "numeric" | "duration";
  targetValue: number | null;
  scheduleKind: "fixed_days" | "weekly_quota";
  weekdays: number[];
  weeklyTarget: number | null;
};

export type HabitLog = {
  loggedOn: string;
  value: number | null;
  logStatus: "logged" | "skipped" | "rest";
};

export type DayClass =
  | "unscheduled"
  | "met"
  | "below_target"
  | "skipped"
  | "rest"
  | "due"
  | "missed"
  | "upcoming"
  | "paused";

export type WeekClass = "in_progress" | "met" | "missed";

export type Classification = {
  day: DayClass;
  week: null | {
    class: WeekClass;
    metCount: number;
    weeklyTarget: number;
  };
};

export function classify(
  habit: HabitDefinition,
  date: string,
  today: string,
  logs: readonly HabitLog[] = [],
): Classification {
  const log = logs.find((item) => item.loggedOn === date) ?? null;
  const week = habit.scheduleKind === "weekly_quota" && habit.status === "active" ? classifyWeek(habit, date, today, logs) : null;

  if (log) {
    return { day: classForLog(habit, log), week };
  }
  if (habit.status === "paused") {
    return { day: "paused", week: null };
  }
  if (habit.status !== "active") {
    return { day: "unscheduled", week: null };
  }
  if (habit.scheduleKind === "weekly_quota") {
    return { day: "unscheduled", week };
  }
  return { day: classForFixedDay(habit, date, today), week: null };
}

function classForLog(habit: HabitDefinition, log: HabitLog): DayClass {
  if (log.logStatus === "skipped" || log.logStatus === "rest") {
    return log.logStatus;
  }
  if (habit.trackingType === "boolean") {
    return "met";
  }
  const target = habit.targetValue ?? 0;
  return (log.value ?? 0) >= target ? "met" : "below_target";
}

function classForFixedDay(habit: HabitDefinition, date: string, today: string): DayClass {
  const scheduled = habit.weekdays.includes(isoWeekday(date));
  if (date > today) {
    return scheduled ? "upcoming" : "unscheduled";
  }
  if (!scheduled) {
    return "unscheduled";
  }
  return date === today ? "due" : "missed";
}

function classifyWeek(
  habit: HabitDefinition,
  date: string,
  today: string,
  logs: readonly HabitLog[],
): Classification["week"] {
  const monday = addCivilDays(date, 1 - isoWeekday(date));
  const sunday = addCivilDays(monday, 6);
  const weeklyTarget = habit.weeklyTarget ?? 0;
  const metCount = logs.filter((log) => {
    return log.loggedOn >= monday && log.loggedOn <= sunday && classForLog(habit, log) === "met";
  }).length;
  const finished = today > sunday;
  return {
    class: !finished ? "in_progress" : metCount >= weeklyTarget && weeklyTarget > 0 ? "met" : "missed",
    metCount,
    weeklyTarget,
  };
}
