import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";

test("habit checks reject a boolean target, a numeric habit without a unit, and a second log", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const supabase = getAdminClient();

    const booleanTarget = await supabase.from("habits").insert({
      user_id: userId,
      title: "Pray",
      tracking_type: "boolean",
      target_value: 1,
      schedule_kind: "fixed_days",
      weekdays: [1],
    });
    assert.equal(booleanTarget.error?.code, "23514");
    assert.match(booleanTarget.error?.message ?? "", /habits_shape_check/);

    const numericWithoutUnit = await supabase.from("habits").insert({
      user_id: userId,
      title: "Walk",
      tracking_type: "numeric",
      target_value: 5,
      schedule_kind: "fixed_days",
      weekdays: [1],
    });
    assert.equal(numericWithoutUnit.error?.code, "23514");
    assert.match(numericWithoutUnit.error?.message ?? "", /habits_shape_check/);

    const habit = await supabase
      .from("habits")
      .insert({
        user_id: userId,
        title: "Pray",
        tracking_type: "boolean",
        schedule_kind: "fixed_days",
        weekdays: [1],
      })
      .select("id, goal_id, target_value, unit")
      .single();
    assert.equal(habit.error, null);
    assert.equal(habit.data?.goal_id, null);
    assert.equal(habit.data?.target_value, null);
    assert.equal(habit.data?.unit, null);

    const first = await supabase.from("habit_logs").insert({
      habit_id: habit.data?.id,
      user_id: userId,
      logged_on: "2026-06-16",
      value: 1,
      log_status: "logged",
    });
    assert.equal(first.error, null);

    const second = await supabase.from("habit_logs").insert({
      habit_id: habit.data?.id,
      user_id: userId,
      logged_on: "2026-06-16",
      value: 1,
      log_status: "logged",
    });
    assert.equal(second.error?.code, "23505");
    assert.match(second.error?.message ?? "", /habit_logs_day_key/);
  } finally {
    await removeUser(email);
  }
});

function uniqueEmail(): string {
  return `lt022-${randomBytes(8).toString("hex")}@example.com`;
}

async function insertUser(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({
      email,
      name: "LT022",
      password_hash: "schema-test-not-a-login",
    })
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
