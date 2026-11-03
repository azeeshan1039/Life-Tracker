import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";
import { addCriterion, addOption, deleteOption, saveComparison } from "./compare";
import { addAction, dismissAction, recordDecision } from "./decisions";
import { createPlan, setPlanStatus } from "./mutations";
import { promoteAction, promoteActionForcingFailure } from "./promote";
import { loadPlan } from "./queries";

test("two chosen options are rejected and an unknown action status is rejected", async () => {
  const email = uniqueEmail("schema");
  try {
    const userId = await insertUser(email);
    const plan = await createPlan(userId, "Schema", null);
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    const supabase = getAdminClient();
    const first = await supabase.from("plan_options").insert({ plan_id: plan.id, name: "A", is_chosen: true }).select("id").single();
    const second = await supabase.from("plan_options").insert({ plan_id: plan.id, name: "B" }).select("id").single();
    assert.equal(first.error, null);
    assert.equal(second.error, null);
    const clash = await supabase.from("plan_options").update({ is_chosen: true }).eq("id", second.data?.id ?? "");
    assert.notEqual(clash.error, null);
    const bad = await supabase.from("plan_actions").insert({ plan_id: plan.id, title: "Nope", status: "later" });
    assert.notEqual(bad.error, null);
  } finally {
    await removeUser(email);
  }
});

test("a new idea creates no task, and an area link stays on the idea", async () => {
  const email = uniqueEmail("idea");
  try {
    const userId = await insertUser(email);
    const plan = await createPlan(userId, "Move", "career");
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    const loaded = await loadPlan(userId, plan.id);
    assert.equal(loaded?.status, "idea");
    assert.deepEqual(loaded?.areas.map((area) => area.key), ["career"]);
    assert.equal(await countTasks(userId), 0);
  } finally {
    await removeUser(email);
  }
});

test("choosing a second option clears the first, and the mean is not what chooses it", async () => {
  const email = uniqueEmail("choose");
  try {
    const userId = await insertUser(email);
    const plan = await createPlan(userId, "Cities", null);
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    const first = await addOption(userId, plan.id, "High score");
    const second = await addOption(userId, plan.id, "Low score");
    const criterion = await addCriterion(userId, plan.id, "Fit");
    assert.equal(first.ok && second.ok && criterion.ok, true);
    if (!first.ok || !second.ok || !criterion.ok) return;
    const saved = await saveComparison(userId, plan.id, {
      cells: [
        { optionId: first.id, criterionId: criterion.id, score: 5, note: "" },
        { optionId: second.id, criterionId: criterion.id, score: 1, note: "" },
      ],
      chosenOptionId: second.id,
    });
    assert.equal(saved.ok, true);
    const loaded = await loadPlan(userId, plan.id);
    const chosen = loaded?.options.filter((option) => option.isChosen).map((option) => option.name);
    assert.deepEqual(chosen, ["Low score"]);
    const again = await loadPlan(userId, plan.id);
    assert.equal(again?.scores.find((cell) => cell.optionId === first.id)?.score, 5);
  } finally {
    await removeUser(email);
  }
});

test("decisions stay newest first, and deleting an option keeps the rationale", async () => {
  const email = uniqueEmail("decide");
  try {
    const userId = await insertUser(email);
    const plan = await createPlan(userId, "Notes", null);
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    const option = await addOption(userId, plan.id, "Stay");
    assert.equal(option.ok, true);
    if (!option.ok) return;
    const older = await recordDecision(userId, plan.id, {
      title: "First",
      rationale: "Earlier note",
      decidedOn: "2026-06-01",
      chosenOptionId: option.id,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    const newer = await recordDecision(userId, plan.id, {
      title: "Second",
      rationale: "Later note",
      decidedOn: "2026-06-02",
      chosenOptionId: null,
    });
    assert.equal(older.ok && newer.ok, true);
    const before = await loadPlan(userId, plan.id);
    assert.equal(before?.status, "idea");
    assert.equal(await countTasks(userId), 0);
    assert.deepEqual(
      before?.decisions.map((decision) => decision.title),
      ["Second", "First"],
    );
    assert.equal((await deleteOption(userId, plan.id, option.id)).ok, true);
    const after = await loadPlan(userId, plan.id);
    const kept = after?.decisions.find((decision) => decision.title === "First");
    assert.equal(kept?.rationale, "Earlier note");
    assert.equal(kept?.chosenOptionId, null);
  } finally {
    await removeUser(email);
  }
});

test("promote creates one task, a second click does not, dismiss creates none, and a forced error rolls back", async () => {
  const email = uniqueEmail("promote");
  try {
    const userId = await insertUser(email);
    const plan = await createPlan(userId, "Commit", "health");
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    const career = await getAdminClient().from("life_areas").select("id").eq("key", "career").single();
    assert.equal(career.error, null);
    await getAdminClient().from("plan_life_areas").insert({ plan_id: plan.id, life_area_id: career.data?.id });

    const several = await addAction(userId, plan.id, { title: "Several areas", notes: "n", dueOn: null });
    assert.equal(several.ok, true);
    if (!several.ok) return;
    const promotedSeveral = await promoteAction(userId, plan.id, several.id);
    assert.equal(promotedSeveral.ok, true);
    if (!promotedSeveral.ok) return;
    const severalTask = await getAdminClient().from("tasks").select("life_area_id").eq("id", promotedSeveral.id).single();
    assert.equal(severalTask.data?.life_area_id, null);

    const oneArea = await createPlan(userId, "One area", "wealth");
    assert.equal(oneArea.ok, true);
    if (!oneArea.ok) return;
    const action = await addAction(userId, oneArea.id, { title: "Open the account", notes: "Bring id", dueOn: "2026-07-01" });
    assert.equal(action.ok, true);
    if (!action.ok) return;
    const forced = await promoteActionForcingFailure(userId, action.id);
    assert.equal(forced.ok, false);
    assert.equal(await countTasks(userId), 1);
    const still = await loadPlan(userId, oneArea.id);
    assert.equal(still?.actions[0]?.status, "proposed");
    assert.equal(still?.actions[0]?.taskId, null);

    const first = await promoteAction(userId, oneArea.id, action.id);
    const second = await promoteAction(userId, oneArea.id, action.id);
    assert.equal(first.ok && second.ok, true);
    if (!first.ok || !second.ok) return;
    assert.equal(first.id, second.id);
    assert.equal(await countTasks(userId), 2);
    const task = await getAdminClient().from("tasks").select("title, notes, due_on, status, life_area_id").eq("id", first.id).single();
    const wealth = await loadPlan(userId, oneArea.id);
    assert.equal(task.data?.title, "Open the account");
    assert.equal(task.data?.notes, "Bring id");
    assert.equal(task.data?.due_on, "2026-07-01");
    assert.equal(task.data?.status, "todo");
    assert.equal(task.data?.life_area_id, wealth?.areas[0]?.id);

    const dismissed = await addAction(userId, oneArea.id, { title: "Skip", notes: "", dueOn: null });
    assert.equal(dismissed.ok, true);
    if (!dismissed.ok) return;
    assert.equal((await dismissAction(userId, oneArea.id, dismissed.id)).ok, true);
    assert.equal(await countTasks(userId), 2);

    assert.equal((await setPlanStatus(userId, oneArea.id, "archived")).ok, true);
    const archived = await loadPlan(userId, oneArea.id);
    assert.equal(archived?.status, "archived");
    const remaining = await getAdminClient().from("tasks").select("id").eq("id", first.id).maybeSingle();
    assert.equal(remaining.data?.id, first.id);
  } finally {
    await removeUser(email);
  }
});

function uniqueEmail(label: string): string {
  return `lt041-${label}-${randomBytes(6).toString("hex")}@example.com`;
}

async function insertUser(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({ email, name: "LT041", password_hash: "schema-test-not-a-login" })
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

async function countTasks(userId: string): Promise<number> {
  const { count, error } = await getAdminClient().from("tasks").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}
