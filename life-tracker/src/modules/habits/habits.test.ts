import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";
import { createHabit, saveHabitLog, setHabitStatus } from "./mutations";

test("a 1 hour 30 minute entry stores 90, a second save updates it, and archive keeps the log", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const created = await createHabit(userId, {
      title: "Stretch",
      trackingType: "duration",
      unit: "minutes",
      targetValue: 30,
      scheduleKind: "fixed_days",
      weekdays: [1],
      weeklyTarget: null,
      lifeAreaId: null,
    });
    assert.equal(created.ok, true);
    if (!created.ok) {
      return;
    }

    const first = await saveHabitLog(userId, created.id, {
      loggedOn: "2026-06-16",
      logStatus: "logged",
      value: null,
      hours: 1,
      minutes: 30,
    });
    assert.equal(first.ok, true);
    assert.equal(await logValue(created.id), 90);

    const second = await saveHabitLog(userId, created.id, {
      loggedOn: "2026-06-16",
      logStatus: "logged",
      value: null,
      hours: 2,
      minutes: 0,
    });
    assert.equal(second.ok, true);
    const rows = await logRows(created.id);
    assert.equal(rows.length, 1);
    assert.equal(Number(rows[0]?.value), 120);

    const archived = await setHabitStatus(userId, created.id, "archived");
    assert.equal(archived.ok, true);
    assert.equal((await logRows(created.id)).length, 1);
  } finally {
    await removeUser(email);
  }
});

function uniqueEmail(): string {
  return `lt024-${randomBytes(8).toString("hex")}@example.com`;
}

async function insertUser(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({ email, name: "LT024", password_hash: "schema-test-not-a-login" })
    .select("id")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data.id;
}

async function removeUser(email: string): Promise<void> {
  await getAdminClient().from("users").delete().eq("email", email);
}

async function logValue(habitId: string): Promise<number> {
  const rows = await logRows(habitId);
  return Number(rows[0]?.value);
}

async function logRows(habitId: string): Promise<{ value: string | number | null }[]> {
  const { data, error } = await getAdminClient().from("habit_logs").select("value").eq("habit_id", habitId);
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}
