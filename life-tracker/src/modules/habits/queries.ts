import { addCivilDays, isoWeekday } from "../../lib/dates";
import { getAdminClient } from "../../lib/supabase-admin";
import { classify, type DayClass, type HabitDefinition, type HabitLog } from "./classify";
import { habitsForToday, type TodayHabit } from "./today";

export type HabitRecord = HabitDefinition & {
  id: string;
  userId: string;
  lifeAreaId: number | null;
  goalId: string | null;
  title: string;
  unit: string | null;
};

type HabitRow = {
  id: string;
  user_id: string;
  life_area_id: number | null;
  goal_id: string | null;
  title: string;
  tracking_type: HabitDefinition["trackingType"];
  unit: string | null;
  target_value: string | number | null;
  schedule_kind: HabitDefinition["scheduleKind"];
  weekdays: number[] | null;
  weekly_target: number | null;
  status: HabitDefinition["status"];
};

const habitColumns =
  "id, user_id, life_area_id, goal_id, title, tracking_type, unit, target_value, schedule_kind, weekdays, weekly_target, status";

export async function listHabits(userId: string, status: HabitDefinition["status"]): Promise<HabitRecord[]> {
  const { data, error } = await getAdminClient()
    .from("habits")
    .select(habitColumns)
    .eq("user_id", userId)
    .eq("status", status)
    .order("title", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(toHabit);
}

export async function getHabit(userId: string, habitId: string): Promise<HabitRecord | null> {
  const { data, error } = await getAdminClient()
    .from("habits")
    .select(habitColumns)
    .eq("user_id", userId)
    .eq("id", habitId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? toHabit(data) : null;
}

export async function listLogsSince(userId: string, since: string, habitId?: string): Promise<(HabitLog & { habitId: string })[]> {
  let query = getAdminClient()
    .from("habit_logs")
    .select("habit_id, logged_on, value, log_status")
    .eq("user_id", userId)
    .gte("logged_on", since);
  if (habitId) {
    query = query.eq("habit_id", habitId);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    habitId: row.habit_id,
    loggedOn: row.logged_on,
    value: row.value === null ? null : Number(row.value),
    logStatus: row.log_status,
  }));
}

export function historyDays(today: string): string[] {
  const monday = addCivilDays(today, 1 - isoWeekday(today));
  const start = addCivilDays(monday, -77);
  return Array.from({ length: 84 }, (_, index) => addCivilDays(start, index));
}

export async function loadHabitsForToday(userId: string, today: string): Promise<{
  due: TodayHabit[];
  weeklyMet: TodayHabit[];
}> {
  const monday = addCivilDays(today, 1 - isoWeekday(today));
  const [habits, logs] = await Promise.all([listHabits(userId, "active"), listLogsSince(userId, monday)]);
  return habitsForToday(
    habits.map((habit) => ({
      ...habit,
      logs: logs.filter((log) => log.habitId === habit.id),
    })),
    today,
  );
}

export function classesForHistory(habit: HabitRecord, today: string, logs: HabitLog[]): { date: string; day: DayClass }[] {
  return historyDays(today).map((date) => ({
    date,
    day: classify(habit, date, today, logs).day,
  }));
}

function toHabit(row: HabitRow): HabitRecord {
  return {
    id: row.id,
    userId: row.user_id,
    lifeAreaId: row.life_area_id,
    goalId: row.goal_id,
    title: row.title,
    unit: row.unit,
    status: row.status,
    trackingType: row.tracking_type,
    targetValue: row.target_value === null ? null : Number(row.target_value),
    scheduleKind: row.schedule_kind,
    weekdays: row.weekdays ?? [],
    weeklyTarget: row.weekly_target,
  };
}
