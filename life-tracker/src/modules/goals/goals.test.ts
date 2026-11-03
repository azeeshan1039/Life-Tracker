import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";
import { setGoalStatus } from "./goal-mutations";
import { listGoals } from "./queries";

test("archiving a goal hides it from the active list and keeps the linked task", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const supabase = getAdminClient();
    const goal = await supabase.from("goals").insert({ user_id: userId, title: "Run" }).select("id").single();
    assert.equal(goal.error, null);
    const task = await supabase.from("tasks").insert({ user_id: userId, title: "Shoes", priority: 0 }).select("id").single();
    assert.equal(task.error, null);
    const link = await supabase.from("task_goals").insert({ task_id: task.data?.id, goal_id: goal.data?.id });
    assert.equal(link.error, null);

    const archived = await setGoalStatus(userId, goal.data?.id ?? "", "archived");
    assert.equal(archived.ok, true);
    const active = await listGoals(userId, "active");
    assert.equal(active.some((item) => item.id === goal.data?.id), false);

    const stillThere = await supabase.from("tasks").select("id").eq("id", task.data?.id ?? "").maybeSingle();
    assert.equal(stillThere.data?.id, task.data?.id);
    const stillLinked = await supabase.from("task_goals").select("goal_id").eq("task_id", task.data?.id ?? "");
    assert.equal(stillLinked.data?.length, 1);
  } finally {
    await removeUser(email);
  }
});

function uniqueEmail(): string {
  return `lt028-${randomBytes(8).toString("hex")}@example.com`;
}

async function insertUser(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({ email, name: "LT028", password_hash: "schema-test-not-a-login" })
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
