import { getAdminClient } from "../../lib/supabase-admin";
import type { UserSettings } from "./fields";

export type { UserSettings };

function assertNoError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export async function getSettings(userId: string): Promise<UserSettings> {
  const supabase = getAdminClient();
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", userId)
    .maybeSingle();
  assertNoError(userError);
  if (!user) {
    throw new Error("User not found");
  }

  const { data: settings, error: settingsError } = await supabase
    .from("user_settings")
    .select("timezone, week_starts_on, currency_code")
    .eq("user_id", userId)
    .maybeSingle();
  assertNoError(settingsError);

  return {
    name: user.name,
    email: user.email,
    timezone: settings?.timezone ?? "Asia/Karachi",
    weekStartsOn: settings?.week_starts_on ?? 1,
    currencyCode: String(settings?.currency_code ?? "USD").trim(),
  };
}
