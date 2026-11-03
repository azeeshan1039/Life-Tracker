import { classify, type DayClass, type HabitDefinition, type HabitLog } from "./classify";

export type TodayHabit = {
  id: string;
  title: string;
  trackingType: HabitDefinition["trackingType"];
  unit: string | null;
  day: DayClass;
  metCount: number | null;
  weeklyTarget: number | null;
};

type TodayInput = HabitDefinition & {
  id: string;
  title: string;
  unit: string | null;
  logs: readonly HabitLog[];
};

export function habitsForToday(habits: TodayInput[], today: string): { due: TodayHabit[]; weeklyMet: TodayHabit[] } {
  const due: TodayHabit[] = [];
  const weeklyMet: TodayHabit[] = [];
  for (const habit of habits) {
    if (habit.status !== "active") {
      continue;
    }
    const result = classify(habit, today, today, habit.logs);
    const item: TodayHabit = {
      id: habit.id,
      title: habit.title,
      trackingType: habit.trackingType,
      unit: habit.unit,
      day: result.day,
      metCount: result.week?.metCount ?? null,
      weeklyTarget: result.week?.weeklyTarget ?? null,
    };
    if (habit.scheduleKind === "weekly_quota") {
      const target = result.week?.weeklyTarget ?? 0;
      const met = result.week?.metCount ?? 0;
      if (target > 0 && met >= target) {
        weeklyMet.push(item);
      } else {
        due.push(item);
      }
      continue;
    }
    if (result.day === "unscheduled" || result.day === "paused" || result.day === "upcoming") {
      continue;
    }
    due.push(item);
  }
  due.sort(byTitle);
  weeklyMet.sort(byTitle);
  return { due, weeklyMet };
}

function byTitle(left: TodayHabit, right: TodayHabit): number {
  return left.title.localeCompare(right.title);
}
