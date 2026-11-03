import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";
import { createHabit } from "../habits/mutations";
import { createGoal } from "../goals/goal-mutations";
import { createProject, addMilestone } from "../projects/mutations";
import { listOpenTasksForGoal } from "../goals/queries";
import { createTask } from "./mutations";
import { setTaskLinks } from "./links";

test("a task saves with no goal, shows on each selected goal and one project, and survives milestone delete", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const created = await createTask(userId, {
      title: "Write",
      notes: "",
      status: "todo",
      priority: 0,
      dueOn: null,
      scheduledFor: null,
      scheduledStart: null,
      scheduledEnd: null,
      estimatedMinutes: null,
      lifeAreaId: null,
    });
    assert.equal(created.ok, true);
    if (!created.ok) {
      return;
    }
    const unlinked = await setTaskLinks(userId, created.task.id, { projectId: null, milestoneId: null, goalIds: [] });
    assert.equal(unlinked.ok, true);

    const goalA = await createGoal(userId, { title: "Ship", description: "", targetDate: null, lifeAreaId: null });
    const goalB = await createGoal(userId, { title: "Learn", description: "", targetDate: null, lifeAreaId: null });
    const project = await createProject(userId, {
      title: "Site",
      description: "",
      startDate: null,
      targetDate: null,
      lifeAreaId: null,
    });
    assert.equal(goalA.ok && goalB.ok && project.ok, true);
    if (!goalA.ok || !goalB.ok || !project.ok) {
      return;
    }
    const milestone = await addMilestone(userId, project.id, { title: "Beta", targetDate: null });
    assert.equal(milestone.ok, true);
    if (!milestone.ok) {
      return;
    }

    const linked = await setTaskLinks(userId, created.task.id, {
      projectId: project.id,
      milestoneId: milestone.id,
      goalIds: [goalA.id, goalB.id],
    });
    assert.equal(linked.ok, true);
    const onA = await listOpenTasksForGoal(userId, goalA.id);
    const onB = await listOpenTasksForGoal(userId, goalB.id);
    assert.equal(onA.some((task) => task.id === created.task.id), true);
    assert.equal(onB.some((task) => task.id === created.task.id), true);

    const row = await getAdminClient().from("tasks").select("id, project_id, milestone_id").eq("id", created.task.id).single();
    assert.equal(row.data?.project_id, project.id);
    assert.equal(row.data?.milestone_id, milestone.id);

    const habit = await createHabit(userId, {
      title: "Stretch",
      trackingType: "boolean",
      unit: null,
      targetValue: null,
      scheduleKind: "fixed_days",
      weekdays: [1],
      weeklyTarget: null,
      lifeAreaId: null,
      goalId: goalA.id,
    });
    assert.equal(habit.ok, true);

    const removed = await getAdminClient().from("milestones").delete().eq("id", milestone.id);
    assert.equal(removed.error, null);
    const after = await getAdminClient().from("tasks").select("id, project_id, milestone_id").eq("id", created.task.id).single();
    assert.equal(after.data?.id, created.task.id);
    assert.equal(after.data?.project_id, project.id);
    assert.equal(after.data?.milestone_id, null);
  } finally {
    await removeUser(email);
  }
});

function uniqueEmail(): string {
  return `lt030-${randomBytes(8).toString("hex")}@example.com`;
}

async function insertUser(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({ email, name: "LT030", password_hash: "schema-test-not-a-login" })
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
