import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";
import { addMilestone, createProject } from "../projects/mutations";
import { createTask } from "../tasks/mutations";
import type { TaskInput } from "../tasks/schema";
import { dashboardQuerySteps, loadDashboard, readDashboardConfig, saveDashboardConfig, sevenDayEnd } from "./queries";

const today = "2026-06-16";

test("the seven-day window includes a near task and milestone and leaves out the day after", async () => {
  const email = uniqueEmail("window");
  try {
    const userId = await insertUser(email);
    await createTask(userId, task("Inside", "2026-06-22"));
    await createTask(userId, task("Outside", "2026-06-23"));
    await createTask(userId, task("Overdue", "2026-06-15"));
    const project = await createProject(userId, {
      title: "Launch",
      description: "",
      startDate: null,
      targetDate: null,
      lifeAreaId: null,
    });
    assert.equal(project.ok, true);
    if (!project.ok) return;
    const near = await addMilestone(userId, project.id, { title: "Beta", targetDate: "2026-06-17" });
    const far = await addMilestone(userId, project.id, { title: "Later", targetDate: "2026-06-23" });
    assert.equal(near.ok && far.ok, true);

    const dashboard = await loadDashboard(userId, today);
    assert.equal(sevenDayEnd(today), "2026-06-22");
    assert.deepEqual(
      dashboard.upcoming.tasks.map((item) => item.task.title),
      ["Inside"],
    );
    assert.deepEqual(
      dashboard.upcoming.milestones.map((item) => item.title),
      ["Beta"],
    );
    assert.equal(dashboard.today.overdue, 1);
    assert.deepEqual(dashboard.querySteps, dashboardQuerySteps(0));
    assert.equal(dashboard.querySteps.length <= 6, true);
    assert.equal(JSON.stringify(dashboard).toLowerCase().includes("life score"), false);
  } finally {
    await removeUser(email);
  }
});

test("a pinned goal without a metric has no percentage, a hidden widget stays hidden, and a fourth pin is rejected", async () => {
  const email = uniqueEmail("pins");
  try {
    const userId = await insertUser(email);
    const supabase = getAdminClient();
    const goals = await supabase
      .from("goals")
      .insert([
        { user_id: userId, title: "Run", target_date: "2026-12-01" },
        { user_id: userId, title: "Read" },
        { user_id: userId, title: "Save" },
        { user_id: userId, title: "Extra" },
      ])
      .select("id, title");
    assert.equal(goals.error, null);
    const ids = (goals.data ?? []).map((goal) => goal.id);
    const run = (goals.data ?? []).find((goal) => goal.title === "Run");
    assert.ok(run);

    const pinned = await saveDashboardConfig(userId, { pinnedGoalIds: [run.id], hiddenWidgets: ["today", "life_score"] });
    assert.equal(pinned.ok, true);
    const dashboard = await loadDashboard(userId, today);
    assert.equal(dashboard.visible.includes("today"), false);
    assert.equal(dashboard.visible.includes("inbox"), true);
    assert.equal(dashboard.pins.length, 1);
    assert.equal(dashboard.pins[0]?.title, "Run");
    assert.equal(dashboard.pins[0]?.targetDate, "2026-12-01");
    assert.equal(dashboard.pins[0]?.lines.some((line) => line.includes("%")), false);
    assert.equal(JSON.stringify(dashboard.pins).includes("%"), false);

    const foreign = await saveDashboardConfig(userId, {
      pinnedGoalIds: ["00000000-0000-4000-8000-000000000099"],
      hiddenWidgets: [],
    });
    assert.equal(foreign.ok, false);
    if (!foreign.ok) {
      assert.equal(foreign.error, "This goal is not available.");
    }

    const fourth = await saveDashboardConfig(userId, { pinnedGoalIds: ids, hiddenWidgets: [] });
    assert.equal(fourth.ok, false);
    if (!fourth.ok) {
      assert.equal(fourth.error, "Pin up to three goals.");
    }
    const stored = await readDashboardConfig(userId);
    assert.deepEqual(stored.pinnedGoalIds, [run.id]);

    const { error } = await supabase.from("user_settings").update({ dashboard_config: "corrupt" }).eq("user_id", userId);
    assert.equal(error, null);
    const fallback = await readDashboardConfig(userId);
    assert.deepEqual(fallback, { pinnedGoalIds: [], hiddenWidgets: [] });
    const reloaded = await loadDashboard(userId, today);
    assert.equal(reloaded.pinMessage, "Pin a goal in Settings");
    assert.equal(reloaded.visible.length, 5);
  } finally {
    await removeUser(email);
  }
});

function task(title: string, dueOn: string): TaskInput {
  return {
    title,
    notes: "",
    status: "todo",
    priority: 1,
    dueOn,
    scheduledFor: null,
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes: null,
    lifeAreaId: null,
  };
}

function uniqueEmail(label: string): string {
  return `lt037-${label}-${randomBytes(6).toString("hex")}@example.com`;
}

async function insertUser(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({ email, name: "LT037", password_hash: "schema-test-not-a-login" })
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
