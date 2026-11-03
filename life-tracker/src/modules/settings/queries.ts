import { cache } from "react";
import { getAdminClient } from "../../lib/supabase-admin";
import type { UserSettings } from "./fields";

export type { UserSettings };

function assertNoError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export const getSettings = cache(async (userId: string): Promise<UserSettings> => {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("timezone, week_starts_on, currency_code, users(name, email)")
    .eq("user_id", userId)
    .maybeSingle();
  assertNoError(error);
  const account = profileFrom(data?.users);
  if (account) {
    return settingsFrom(account, data);
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", userId)
    .maybeSingle();
  assertNoError(userError);
  if (!user) {
    throw new Error("User not found");
  }
  return settingsFrom(user, data);
});

function settingsFrom(
  account: { name: string; email: string },
  settings: { timezone?: string; week_starts_on?: number; currency_code?: string } | null,
): UserSettings {
  return {
    name: account.name,
    email: account.email,
    timezone: settings?.timezone ?? "Asia/Karachi",
    weekStartsOn: settings?.week_starts_on ?? 1,
    currencyCode: String(settings?.currency_code ?? "USD").trim(),
  };
}

function profileFrom(value: unknown): { name: string; email: string } | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") {
    return null;
  }
  const record = row as { name?: unknown; email?: unknown };
  if (typeof record.name !== "string" || typeof record.email !== "string") {
    return null;
  }
  return { name: record.name, email: record.email };
}
