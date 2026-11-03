import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";
import { createGoal, setGoalStatus } from "../goals/goal-mutations";
import { createMetric } from "../measurements/mutations";
import { completeTask, createTask } from "../tasks/mutations";
import type { TaskInput } from "../tasks/schema";
import { listAreaCards, loadArea } from "./queries";
import { acceptSuggestion } from "./suggestions";

const today = "2026-06-16";

test("area counts stay zero until a record exists, and an archived goal is left out", async () => {
  const email = uniqueEmail("counts");
  try {
    const userId = await insertUser(email);
    const empty = await listAreaCards(userId);
    assert.deepEqual(
      empty.map((area) => area.key),
      ["business", "career", "health", "deen", "wealth", "relationships"],
    );
    assert.equal(empty.every((area) => area.goals === 0 && area.projects === 0 && area.tasks === 0 && area.habits === 0), true);
    assert.equal(JSON.stringify(empty).toLowerCase().includes("score"), false);

    const relationships = empty.find((area) => area.key === "relationships");
    assert.ok(relationships);
    const active = await createGoal(userId, { title: "Call home", description: "", targetDate: null, lifeAreaId: relationships.id });
    const archived = await createGoal(userId, { title: "Old", description: "", targetDate: null, lifeAreaId: relationships.id });
    assert.equal(active.ok && archived.ok, true);
    if (!active.ok || !archived.ok) return;
    assert.equal((await setGoalStatus(userId, archived.id, "archived")).ok, true);
    const open = await createTask(userId, task("Fix the hinge", relationships.id));
    assert.equal(open.ok, true);
    if (!open.ok) return;
    const done = await createTask(userId, task("Done already", relationships.id));
    assert.equal(done.ok, true);
    if (!done.ok) return;
    assert.equal((await completeTask(userId, done.task.id)).ok, true);

    const cards = await listAreaCards(userId);
    assert.deepEqual(
      cards.map((area) => area.key),
      ["business", "career", "health", "deen", "wealth", "relationships"],
    );
    assert.equal(cards[0]?.goals, 0);
    const home = cards.find((area) => area.key === "relationships");
    assert.equal(home?.goals, 1);
    assert.equal(home?.tasks, 1);
    const missing = await loadArea(userId, "not-an-area", today);
    assert.equal(missing, null);
  } finally {
    await removeUser(email);
  }
});

test("opening an area creates nothing, a suggestion creates one row, and a second income hides the month line", async () => {
  const email = uniqueEmail("suggest");
  try {
    const userId = await insertUser(email);
    const before = await loadArea(userId, "wealth", today);
    assert.ok(before);
    assert.equal(before.metrics, 0);
    assert.equal(before.cashFlow, null);
    assert.equal(await countTable("metrics", userId), 0);

    const savings = await acceptSuggestion(userId, "wealth", "wealth-savings", "USD", today);
    assert.equal(savings.ok, true);
    const wealth = await loadArea(userId, "wealth", today);
    assert.equal(wealth?.metrics, 1);
    assert.equal(wealth?.metricsList[0]?.title, "Savings");
    assert.equal(await countTable("metrics", userId), 1);
    const wrongArea = await acceptSuggestion(userId, "wealth", "business-revenue", "USD", today);
    assert.equal(wrongArea.ok, false);

    const revenue = await acceptSuggestion(userId, "business", "business-revenue", "USD", today);
    assert.equal(revenue.ok, true);
    const business = await findBusiness(userId);
    const expense = await createMetric(userId, {
      name: "Costs",
      description: "",
      kind: "expense",
      unit: "USD",
      aggregation: "period_sum",
      direction: "decrease",
      target: null,
      lifeAreaId: business,
      goalId: null,
      primary: false,
    });
    assert.equal(expense.ok, true);
    const flowing = await loadArea(userId, "business", today);
    assert.ok(flowing?.cashFlow);
    assert.equal(JSON.stringify(flowing).toLowerCase().includes("profit"), false);

    const second = await acceptSuggestion(userId, "business", "business-revenue", "USD", today);
    assert.equal(second.ok, true);
    const suppressed = await loadArea(userId, "business", today);
    assert.equal(suppressed?.cashFlow, null);
    assert.equal(suppressed?.metrics, 3);

    const household = await acceptSuggestion(userId, "relationships", "relationships-household", "USD", today);
    assert.equal(household.ok, true);
    assert.equal(await countTable("recurrence_series", userId), 1);
    assert.equal(await countTable("tasks", userId), 0);
    const home = await loadArea(userId, "relationships", today);
    assert.equal(home?.tasks, 0);
    assert.equal(home?.projects, 0);
    assert.equal(home?.habits, 0);
  } finally {
    await removeUser(email);
  }
});

function task(title: string, lifeAreaId: number): TaskInput {
  return {
    title,
    notes: "",
    status: "todo",
    priority: 1,
    dueOn: null,
    scheduledFor: null,
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes: null,
    lifeAreaId,
  };
}

async function findBusiness(userId: string): Promise<number> {
  const cards = await listAreaCards(userId);
  const business = cards.find((area) => area.key === "business");
  if (!business) {
    throw new Error("missing business area");
  }
  return business.id;
}

function uniqueEmail(label: string): string {
  return `lt039-${label}-${randomBytes(6).toString("hex")}@example.com`;
}

async function insertUser(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({ email, name: "LT039", password_hash: "schema-test-not-a-login" })
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

async function countTable(table: "metrics" | "recurrence_series" | "tasks", userId: string): Promise<number> {
  const { count, error } = await getAdminClient().from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}
