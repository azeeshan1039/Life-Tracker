import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";

test("a task can omit a project and goals, and a milestone belongs to one project", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const supabase = getAdminClient();
    const task = await supabase
      .from("tasks")
      .insert({ user_id: userId, title: "Loose task", priority: 0 })
      .select("id, project_id, milestone_id")
      .single();
    assert.equal(task.error, null);
    assert.equal(task.data?.project_id, null);
    assert.equal(task.data?.milestone_id, null);

    const links = await supabase.from("task_goals").select("goal_id").eq("task_id", task.data?.id ?? "");
    assert.equal(links.error, null);
    assert.equal(links.data?.length, 0);

    const project = await supabase.from("projects").insert({ user_id: userId, title: "Launch" }).select("id").single();
    assert.equal(project.error, null);
    const first = await supabase.from("goals").insert({ user_id: userId, title: "Ship" }).select("id").single();
    const second = await supabase.from("goals").insert({ user_id: userId, title: "Learn" }).select("id").single();
    assert.equal(first.error, null);
    assert.equal(second.error, null);

    const joined = await supabase.from("project_goals").insert([
      { project_id: project.data?.id, goal_id: first.data?.id },
      { project_id: project.data?.id, goal_id: second.data?.id },
    ]);
    assert.equal(joined.error, null);

    const milestone = await supabase
      .from("milestones")
      .insert({ project_id: project.data?.id, title: "Beta" })
      .select("id, project_id")
      .single();
    assert.equal(milestone.error, null);
    assert.equal(milestone.data?.project_id, project.data?.id);

    const missingProject = await supabase.from("milestones").insert({ title: "Orphan" });
    assert.equal(missingProject.error?.code, "23502");
  } finally {
    await removeUser(email);
  }
});

function uniqueEmail(): string {
  return `lt027-${randomBytes(8).toString("hex")}@example.com`;
}

async function insertUser(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({ email, name: "LT027", password_hash: "schema-test-not-a-login" })
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
