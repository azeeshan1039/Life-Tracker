import { hashPassword, verifyPassword } from "../auth/password";
import { hashToken } from "../auth/session";
import { getAdminClient } from "../../lib/supabase-admin";
import { isIanaTimeZone, type ProfileInput, type UserSettings } from "./fields";
import { getSettings } from "./queries";

export type SettingsResult =
  | { ok: true; settings: UserSettings }
  | { ok: false; error: string };

export type PasswordResult = { ok: true } | { ok: false; error: string };

function assertNoError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateSettings(userId: string, input: ProfileInput): Promise<SettingsResult> {
  if (!input.name.trim()) {
    return { ok: false, error: "Name is required." };
  }
  if (!isIanaTimeZone(input.timezone)) {
    return { ok: false, error: "Choose a valid timezone." };
  }
  if (!Number.isInteger(input.weekStartsOn) || input.weekStartsOn < 0 || input.weekStartsOn > 6) {
    return { ok: false, error: "Week start must be a day from Sunday through Saturday." };
  }
  const currencyCode = input.currencyCode.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    return { ok: false, error: "Currency code must be three letters." };
  }

  const supabase = getAdminClient();
  const now = new Date().toISOString();
  const { error: settingsError } = await supabase.from("user_settings").upsert({
    user_id: userId,
    timezone: input.timezone,
    week_starts_on: input.weekStartsOn,
    currency_code: currencyCode,
    updated_at: now,
  });
  assertNoError(settingsError);

  const { error: userError } = await supabase
    .from("users")
    .update({ name: input.name.trim(), updated_at: now })
    .eq("id", userId);
  assertNoError(userError);

  return { ok: true, settings: await getSettings(userId) };
}

export async function changePassword(input: {
  userId: string;
  currentToken: string;
  currentPassword: string;
  newPassword: string;
}): Promise<PasswordResult> {
  if (!input.newPassword) {
    return { ok: false, error: "Enter a new password." };
  }
  if (!input.currentToken) {
    return { ok: false, error: "Current session is missing." };
  }

  const supabase = getAdminClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("password_hash")
    .eq("id", input.userId)
    .maybeSingle();
  assertNoError(error);
  if (!user) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const matches = await verifyPassword(user.password_hash, input.currentPassword);
  if (!matches) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      password_hash: await hashPassword(input.newPassword),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.userId);
  assertNoError(updateError);

  const { error: sessionError } = await supabase
    .from("sessions")
    .delete()
    .eq("user_id", input.userId)
    .neq("token_hash", hashToken(input.currentToken));
  assertNoError(sessionError);

  return { ok: true };
}
