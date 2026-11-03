import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../src/lib/supabase-admin";
import { seedOwner } from "./seed";

test("seed creates one owner and does nothing the second time", async () => {
  const before = await userCount();
  if (before > 0) {
    const result = await seedOwner("someone-else@example.com", "not-the-owner");
    assert.equal(result.created, false);
    assert.equal(await userCount(), before);
    return;
  }

  const email = `lt008-${randomBytes(8).toString("hex")}@example.com`;
  const password = "seed-test-password";
  try {
    const first = await seedOwner(email, password);
    const second = await seedOwner("other@example.com", "another-password");
    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(await userCount(), 1);

    const { data, error } = await getAdminClient()
      .from("users")
      .select("email, password_hash, user_settings(timezone, week_starts_on, currency_code)")
      .eq("email", email)
      .single();
    assert.equal(error, null);
    assert.notEqual(data.password_hash, password);
    assert.match(data.password_hash, /^\$argon2id\$/);
    const settings = Array.isArray(data.user_settings)
      ? data.user_settings[0]
      : data.user_settings;
    assert.equal(settings.timezone, "Asia/Karachi");
    assert.equal(settings.week_starts_on, 1);
    assert.equal(settings.currency_code, "USD");
  } finally {
    await getAdminClient().from("users").delete().eq("email", email);
  }
});

async function userCount(): Promise<number> {
  const { count, error } = await getAdminClient()
    .from("users")
    .select("id", { count: "exact", head: true });
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}
