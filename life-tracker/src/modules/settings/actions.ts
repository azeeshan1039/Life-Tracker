"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UnauthorizedError, requireUser } from "../../lib/current-user";
import { saveDashboardConfig } from "../dashboard/queries";
import { sessionCookie } from "../auth/session";
import { parseProfile } from "./fields";
import { changePassword, updateSettings } from "./mutations";

export type ProfileFormState = {
  error: string;
  saved: boolean;
  attempt: number;
  name: string;
  timezone: string;
  weekStartsOn: string;
  currencyCode: string;
};

export type PasswordFormState = {
  error: string;
  saved: boolean;
  attempt: number;
};

export type DashboardFormState = {
  error: string;
  saved: boolean;
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

export async function updateSettingsAction(
  previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = parseProfile(formData);
  const user = await currentUser();
  if (!parsed.ok) {
    return {
      error: parsed.error,
      saved: false,
      attempt: previous.attempt + 1,
      name: String(formData.get("name") ?? ""),
      timezone: String(formData.get("timezone") ?? ""),
      weekStartsOn: String(formData.get("weekStartsOn") ?? ""),
      currencyCode: String(formData.get("currencyCode") ?? ""),
    };
  }

  const result = await updateSettings(user.id, parsed.value);
  if (!result.ok) {
    return {
      error: result.error,
      saved: false,
      attempt: previous.attempt + 1,
      name: parsed.value.name,
      timezone: parsed.value.timezone,
      weekStartsOn: String(parsed.value.weekStartsOn),
      currencyCode: parsed.value.currencyCode,
    };
  }

  return {
    error: "",
    saved: true,
    attempt: previous.attempt + 1,
    name: result.settings.name,
    timezone: result.settings.timezone,
    weekStartsOn: String(result.settings.weekStartsOn),
    currencyCode: result.settings.currencyCode,
  };
}

export async function changePasswordAction(
  previous: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (newPassword !== confirmPassword) {
    return {
      error: "New password and confirmation do not match.",
      saved: false,
      attempt: previous.attempt + 1,
    };
  }

  const user = await currentUser();
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie.name)?.value ?? "";
  const result = await changePassword({
    userId: user.id,
    currentToken: token,
    currentPassword,
    newPassword,
  });
  if (!result.ok) {
    return { error: result.error, saved: false, attempt: previous.attempt + 1 };
  }
  return { error: "", saved: true, attempt: previous.attempt + 1 };
}

export async function saveDashboardAction(
  previous: DashboardFormState,
  formData: FormData,
): Promise<DashboardFormState> {
  const user = await currentUser();
  const result = await saveDashboardConfig(user.id, {
    pinnedGoalIds: formData.getAll("pinnedGoalIds").map(String),
    hiddenWidgets: formData.getAll("hiddenWidgets").map(String),
  });
  if (!result.ok) {
    return { error: result.error, saved: false, attempt: previous.attempt + 1 };
  }
  revalidatePath("/");
  revalidatePath("/settings");
  return { error: "", saved: true, attempt: previous.attempt + 1 };
}
