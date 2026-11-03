import { hashPassword } from "../src/modules/auth/password";
import { getAdminClient } from "../src/lib/supabase-admin";

const OWNER_NAME = "Owner";
const DEFAULT_TIMEZONE = "Asia/Karachi";
const DEFAULT_WEEK_START = 1;
const DEFAULT_CURRENCY = "USD";

export async function seedOwner(
  email: string,
  password: string,
): Promise<{ created: boolean }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) {
    throw new Error("SEED_USER_EMAIL and SEED_USER_PASSWORD are required.");
  }

  const existing = await userCount();
  if (existing > 0) {
    return { created: false };
  }

  const passwordHash = await hashPassword(password);
  const supabase = getAdminClient();
  const { data: user, error: userError } = await supabase
    .from("users")
    .insert({
      email: normalized,
      name: OWNER_NAME,
      password_hash: passwordHash,
    })
    .select("id")
    .single();

  if (userError) {
    throw new Error(withoutSecret(userError.message, password));
  }

  const { error: settingsError } = await supabase.from("user_settings").insert({
    user_id: user.id,
    timezone: DEFAULT_TIMEZONE,
    week_starts_on: DEFAULT_WEEK_START,
    currency_code: DEFAULT_CURRENCY,
  });

  if (settingsError) {
    await supabase.from("users").delete().eq("id", user.id);
    throw new Error(withoutSecret(settingsError.message, password));
  }

  return { created: true };
}

async function userCount(): Promise<number> {
  const { count, error } = await getAdminClient()
    .from("users")
    .select("id", { count: "exact", head: true });
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

function withoutSecret(message: string, password: string): string {
  return message.replaceAll(password, "[redacted]");
}

async function main(): Promise<void> {
  const email = process.env.SEED_USER_EMAIL ?? "";
  const password = process.env.SEED_USER_PASSWORD ?? "";
  if (!email.trim() || !password) {
    console.error("SEED_USER_EMAIL and SEED_USER_PASSWORD are required.");
    process.exit(1);
  }

  const result = await seedOwner(email, password);
  if (result.created) {
    console.log("Created the owner.");
    return;
  }
  console.log("An owner already exists. Nothing changed.");
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("seed.ts")) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Seed failed.";
    console.error(message);
    process.exit(1);
  });
}
