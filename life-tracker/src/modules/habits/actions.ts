"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UnauthorizedError, requireUser } from "../../lib/current-user";
import { createHabit, saveHabitLog, setHabitStatus, updateHabit, type HabitInput } from "./mutations";

export type HabitFormState = {
  error: string;
  title: string;
  unit: string;
  targetValue: string;
  weeklyTarget: string;
  trackingType: string;
  scheduleKind: string;
  weekdays: string[];
  lifeAreaId: string;
  goalId: string;
  saved: boolean;
  attempt: number;
};

export type LogFormState = {
  error: string;
  value: string;
  hours: string;
  minutes: string;
  attempt: number;
};

async function currentUser() {
  try {
    return await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    throw error;
  }
}

export async function createHabitAction(previous: HabitFormState, formData: FormData): Promise<HabitFormState> {
  const user = await currentUser();
  const fields = readHabitForm(formData, previous);
  const result = await createHabit(user.id, fields.input);
  if (!result.ok) {
    return { ...fields.state, error: result.message };
  }
  revalidatePath("/habits");
  redirect(`/habits/${result.id}`);
}

export async function updateHabitAction(previous: HabitFormState, formData: FormData): Promise<HabitFormState> {
  const user = await currentUser();
  const habitId = String(formData.get("habitId") ?? "");
  const fields = readHabitForm(formData, previous);
  const result = await updateHabit(user.id, habitId, fields.input);
  if (!result.ok) {
    return { ...fields.state, error: result.message };
  }
  revalidatePath("/habits");
  revalidatePath(`/habits/${habitId}`);
  revalidatePath("/today");
  return { ...fields.state, error: "", saved: true };
}

export async function pauseHabitAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  const habitId = String(formData.get("habitId") ?? "");
  await setHabitStatus(user.id, habitId, "paused");
  revalidatePath("/habits");
  revalidatePath(`/habits/${habitId}`);
  revalidatePath("/today");
  redirect("/habits");
}

export async function resumeHabitAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  const habitId = String(formData.get("habitId") ?? "");
  await setHabitStatus(user.id, habitId, "active");
  revalidatePath("/habits");
  revalidatePath(`/habits/${habitId}`);
  revalidatePath("/today");
  redirect(`/habits/${habitId}`);
}

export async function archiveHabitAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  const habitId = String(formData.get("habitId") ?? "");
  await setHabitStatus(user.id, habitId, "archived");
  revalidatePath("/habits");
  revalidatePath(`/habits/${habitId}`);
  revalidatePath("/today");
  redirect("/habits");
}

export async function saveHabitLogAction(previous: LogFormState, formData: FormData): Promise<LogFormState> {
  const value = String(formData.get("value") ?? "");
  const hours = String(formData.get("hours") ?? "");
  const minutes = String(formData.get("minutes") ?? "");
  const kept = { value, hours, minutes, attempt: previous.attempt + 1 };
  const intent = String(formData.get("intent") ?? "");
  const logStatus = intent === "skipped" || intent === "rest" ? intent : "logged";
  const user = await currentUser();
  const habitId = String(formData.get("habitId") ?? "");
  const loggedOn = String(formData.get("loggedOn") ?? "");
  const numeric = value.trim() === "" ? null : Number(value);
  const result = await saveHabitLog(user.id, habitId, {
    loggedOn,
    logStatus,
    value: numeric !== null && Number.isFinite(numeric) ? numeric : null,
    hours: hours.trim() === "" ? null : Number(hours),
    minutes: minutes.trim() === "" ? null : Number(minutes),
  });
  if (!result.ok) {
    return { ...kept, error: result.message };
  }
  revalidatePath("/today");
  revalidatePath("/");
  revalidatePath("/habits");
  revalidatePath(`/habits/${habitId}`);
  return { ...kept, error: "" };
}

function readHabitForm(formData: FormData, previous: HabitFormState): { input: HabitInput; state: HabitFormState } {
  const title = String(formData.get("title") ?? "");
  const unit = String(formData.get("unit") ?? "");
  const targetValue = String(formData.get("targetValue") ?? "");
  const weeklyTarget = String(formData.get("weeklyTarget") ?? "");
  const trackingType = String(formData.get("trackingType") ?? "boolean");
  const scheduleKind = String(formData.get("scheduleKind") ?? "fixed_days");
  const weekdays = formData.getAll("weekday").map(String);
  const lifeAreaId = String(formData.get("lifeAreaId") ?? "");
  const goalId = String(formData.get("goalId") ?? "");
  const state: HabitFormState = {
    error: "",
    title,
    unit,
    targetValue,
    weeklyTarget,
    trackingType,
    scheduleKind,
    weekdays,
    lifeAreaId,
    goalId,
    saved: false,
    attempt: previous.attempt + 1,
  };
  const measured = trackingType === "numeric" || trackingType === "duration";
  const target = targetValue.trim() === "" ? null : Number(targetValue);
  const weekly = weeklyTarget.trim() === "" ? null : Number(weeklyTarget);
  const area = lifeAreaId.trim() === "" ? null : Number(lifeAreaId);
  return {
    state,
    input: {
      title,
      trackingType: trackingType === "numeric" || trackingType === "duration" ? trackingType : "boolean",
      unit: measured ? (unit.trim() !== "" ? unit.trim() : trackingType === "duration" ? "minutes" : null) : null,
      targetValue: measured && target !== null && Number.isFinite(target) ? target : null,
      scheduleKind: scheduleKind === "weekly_quota" ? "weekly_quota" : "fixed_days",
      weekdays: weekdays.map(Number),
      weeklyTarget: scheduleKind === "weekly_quota" && weekly !== null && Number.isFinite(weekly) ? weekly : null,
      lifeAreaId: area !== null && Number.isFinite(area) ? area : null,
      goalId: goalId.trim() === "" ? null : goalId.trim(),
    },
  };
}
