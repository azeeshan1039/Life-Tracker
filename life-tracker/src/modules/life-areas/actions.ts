"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UnauthorizedError, requireUser } from "../../lib/current-user";
import { todayInTimezone } from "../../lib/dates";
import { getSettings } from "../settings/queries";
import { createTask } from "../tasks/mutations";
import { findArea } from "./queries";
import { acceptSuggestion } from "./suggestions";

export type AreaTaskState = {
  error: string;
  title: string;
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

export async function acceptSuggestionAction(formData: FormData): Promise<void> {
  const areaKey = String(formData.get("area") ?? "");
  const suggestionKey = String(formData.get("suggestion") ?? "");
  const user = await currentUser();
  const settings = await getSettings(user.id);
  const today = todayInTimezone(new Date(), settings.timezone);
  const result = await acceptSuggestion(user.id, areaKey, suggestionKey, settings.currencyCode, today);
  if (!result.ok) {
    redirect(`/areas/${areaKey}?error=suggestion`);
  }
  revalidatePath("/areas");
  revalidatePath(`/areas/${areaKey}`);
  revalidatePath("/goals");
  revalidatePath("/projects");
  revalidatePath("/habits");
  revalidatePath("/measurements");
  revalidatePath("/tasks");
  revalidatePath("/today");
  redirect(`/areas/${areaKey}`);
}

export async function createAreaTaskAction(previous: AreaTaskState, formData: FormData): Promise<AreaTaskState> {
  const title = String(formData.get("title") ?? "");
  const areaKey = String(formData.get("area") ?? "");
  const user = await currentUser();
  const area = await findArea(areaKey);
  if (!area) {
    return { error: "This area is not available.", title, attempt: previous.attempt + 1 };
  }
  const result = await createTask(user.id, {
    title,
    notes: "",
    status: "todo",
    priority: 1,
    dueOn: null,
    scheduledFor: null,
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes: null,
    lifeAreaId: area.id,
  });
  if (!result.ok) {
    return { error: result.message, title, attempt: previous.attempt + 1 };
  }
  revalidatePath("/areas");
  revalidatePath(`/areas/${areaKey}`);
  revalidatePath("/tasks");
  revalidatePath("/today");
  return { error: "", title: "", attempt: previous.attempt + 1 };
}
