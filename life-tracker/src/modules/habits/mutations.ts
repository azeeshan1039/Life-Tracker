import { getAdminClient } from "../../lib/supabase-admin";
import { readCivilDate } from "../../lib/dates";
import type { HabitDefinition } from "./classify";

export type HabitInput = {
  title: string;
  trackingType: HabitDefinition["trackingType"];
  unit: string | null;
  targetValue: number | null;
  scheduleKind: HabitDefinition["scheduleKind"];
  weekdays: number[];
  weeklyTarget: number | null;
  lifeAreaId: number | null;
  goalId?: string | null;
};

export type HabitLogInput = {
  loggedOn: string;
  logStatus: "logged" | "skipped" | "rest";
  value: number | null;
  hours: number | null;
  minutes: number | null;
};

export type HabitWriteResult = { ok: true; id: string } | { ok: false; message: string };

export function durationMinutes(hours: number, minutes: number): number | null {
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || minutes < 0 || minutes > 59) {
    return null;
  }
  const total = hours * 60 + minutes;
  return total > 0 ? total : null;
}

export async function createHabit(userId: string, input: HabitInput): Promise<HabitWriteResult> {
  const invalid = validateHabit(input);
  if (invalid) {
    return { ok: false, message: invalid };
  }
  const goalError = await ownedGoal(userId, input.goalId ?? null);
  if (goalError) {
    return { ok: false, message: goalError };
  }
  const { data, error } = await getAdminClient()
    .from("habits")
    .insert(habitRow(userId, input))
    .select("id")
    .single();
  if (error) {
    return constraintMessage(error);
  }
  return { ok: true, id: data.id };
}

export async function updateHabit(userId: string, habitId: string, input: HabitInput): Promise<HabitWriteResult> {
  const invalid = validateHabit(input);
  if (invalid) {
    return { ok: false, message: invalid };
  }
  const goalError = await ownedGoal(userId, input.goalId ?? null);
  if (goalError) {
    return { ok: false, message: goalError };
  }
  const { data, error } = await getAdminClient()
    .from("habits")
    .update({ ...habitRow(userId, input), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", habitId)
    .select("id")
    .maybeSingle();
  if (error) {
    return constraintMessage(error);
  }
  if (!data) {
    return { ok: false, message: "This habit is not available." };
  }
  return { ok: true, id: data.id };
}

export async function setHabitStatus(
  userId: string,
  habitId: string,
  status: "active" | "paused" | "archived",
): Promise<HabitWriteResult> {
  const { data, error } = await getAdminClient()
    .from("habits")
    .update({
      status,
      archived_at: status === "archived" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", habitId)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return { ok: false, message: "This habit is not available." };
  }
  return { ok: true, id: data.id };
}

export async function saveHabitLog(
  userId: string,
  habitId: string,
  input: HabitLogInput,
): Promise<HabitWriteResult & { value?: number | null }> {
  try {
    readCivilDate(input.loggedOn);
  } catch {
    return { ok: false, message: "Dates must be calendar days." };
  }
  const habit = await getAdminClient()
    .from("habits")
    .select("id, tracking_type")
    .eq("user_id", userId)
    .eq("id", habitId)
    .maybeSingle();
  if (habit.error) {
    throw new Error(habit.error.message);
  }
  if (!habit.data) {
    return { ok: false, message: "This habit is not available." };
  }

  const stored = storedValue(habit.data.tracking_type, input);
  if (!stored.ok) {
    return stored;
  }
  const { data, error } = await getAdminClient()
    .from("habit_logs")
    .upsert(
      {
        habit_id: habitId,
        user_id: userId,
        logged_on: input.loggedOn,
        value: stored.value,
        log_status: input.logStatus,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "habit_id,logged_on" },
    )
    .select("id")
    .single();
  if (error) {
    return constraintMessage(error);
  }
  return { ok: true, id: data.id, value: stored.value };
}

function storedValue(
  trackingType: string,
  input: HabitLogInput,
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (input.logStatus === "skipped" || input.logStatus === "rest") {
    return { ok: true, value: null };
  }
  if (trackingType === "boolean") {
    return { ok: true, value: 1 };
  }
  if (trackingType === "duration") {
    const minutes = durationMinutes(input.hours ?? -1, input.minutes ?? -1);
    if (minutes === null) {
      return { ok: false, message: "Enter hours and minutes." };
    }
    return { ok: true, value: minutes };
  }
  if (input.value === null || !Number.isFinite(input.value) || input.value < 0) {
    return { ok: false, message: "Enter a number." };
  }
  return { ok: true, value: input.value };
}

function validateHabit(input: HabitInput): string | null {
  if (!input.title.trim()) {
    return "Title is required.";
  }
  if (input.trackingType === "boolean") {
    if (input.targetValue !== null || input.unit !== null) {
      return "A done habit has no target.";
    }
  } else if (!input.unit?.trim() || input.targetValue === null || !(input.targetValue > 0)) {
    return "Enter a unit and a target greater than zero.";
  }
  if (input.scheduleKind === "fixed_days") {
    const days = uniqueWeekdays(input.weekdays);
    if (days.length === 0) {
      return "Choose at least one day.";
    }
  } else if (
    !Number.isInteger(input.weeklyTarget) ||
    input.weeklyTarget === null ||
    input.weeklyTarget < 1 ||
    input.weeklyTarget > 7
  ) {
    return "Times per week must be from 1 to 7.";
  }
  if (input.lifeAreaId !== null && (!Number.isInteger(input.lifeAreaId) || input.lifeAreaId <= 0)) {
    return "Life area is not available.";
  }
  return null;
}

function habitRow(userId: string, input: HabitInput) {
  const measured = input.trackingType !== "boolean";
  const weekly = input.scheduleKind === "weekly_quota";
  return {
    user_id: userId,
    life_area_id: input.lifeAreaId,
    goal_id: input.goalId ?? null,
    title: input.title.trim(),
    description: "",
    tracking_type: input.trackingType,
    unit: measured ? input.unit?.trim() : null,
    target_value: measured ? input.targetValue : null,
    schedule_kind: input.scheduleKind,
    weekdays: weekly ? [] : uniqueWeekdays(input.weekdays),
    weekly_target: weekly ? input.weeklyTarget : null,
  };
}

async function ownedGoal(userId: string, goalId: string | null): Promise<string | null> {
  if (!goalId) {
    return null;
  }
  const { data, error } = await getAdminClient().from("goals").select("id").eq("user_id", userId).eq("id", goalId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return "This goal is not available.";
  }
  return null;
}

function uniqueWeekdays(days: number[]): number[] {
  return [...new Set(days.filter((day) => Number.isInteger(day) && day >= 1 && day <= 7))].sort();
}

function constraintMessage(error: { code?: string; message: string }): HabitWriteResult {
  if (error.code === "23514" || error.code === "23503" || error.code === "23505") {
    return { ok: false, message: "This habit could not be saved." };
  }
  throw new Error(error.message);
}
