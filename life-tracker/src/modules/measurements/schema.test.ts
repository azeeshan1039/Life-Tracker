import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";

test("two primary metrics for one goal cannot both be true", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const supabase = getAdminClient();
    const goal = await supabase.from("goals").insert({ user_id: userId, title: "Save" }).select("id").single();
    assert.equal(goal.error, null);
    const first = await supabase.from("metrics").insert({
      user_id: userId,
      goal_id: goal.data?.id,
      is_primary_for_goal: true,
      name: "Savings",
      kind: "asset",
      unit: "USD",
      aggregation: "latest",
      direction: "increase",
    });
    assert.equal(first.error, null);
    const second = await supabase.from("metrics").insert({
      user_id: userId,
      goal_id: goal.data?.id,
      is_primary_for_goal: true,
      name: "Other",
      kind: "asset",
      unit: "USD",
      aggregation: "latest",
      direction: "increase",
    });
    assert.equal(second.error?.code, "23505");
    assert.match(second.error?.message ?? "", /metrics_one_primary_goal_uidx/);
  } finally {
    await removeUser(email);
  }
});

test("two entries on the same date cannot both exist", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const supabase = getAdminClient();
    const metric = await supabase
      .from("metrics")
      .insert({
        user_id: userId,
        name: "Weight",
        kind: "general",
        unit: "kg",
        aggregation: "latest",
        direction: "decrease",
      })
      .select("id")
      .single();
    assert.equal(metric.error, null);
    const first = await supabase.from("metric_entries").insert({
      metric_id: metric.data?.id,
      user_id: userId,
      recorded_on: "2026-06-01",
      value: "70.0000",
    });
    assert.equal(first.error, null);
    const second = await supabase.from("metric_entries").insert({
      metric_id: metric.data?.id,
      user_id: userId,
      recorded_on: "2026-06-01",
      value: "71.0000",
    });
    assert.equal(second.error?.code, "23505");
    assert.match(second.error?.message ?? "", /metric_entries_day_key/);
  } finally {
    await removeUser(email);
  }
});

function uniqueEmail(): string {
  return `lt032-${randomBytes(8).toString("hex")}@example.com`;
}

async function insertUser(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({ email, name: "LT032", password_hash: "schema-test-not-a-login" })
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
