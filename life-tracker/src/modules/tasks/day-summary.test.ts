import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";
import { createTask } from "./mutations";
import type { TaskInput } from "./schema";
import { estimateSentence, inboxCount } from "./day-summary";
import { groupForToday, listTasksForUser } from "./views";

const today = "2026-06-16";

test("an estimate sentence counts only tasks that have one", () => {
  assert.equal(estimateSentence([]), null);
  assert.equal(estimateSentence([{ estimatedMinutes: null }]), null);
  assert.equal(estimateSentence([{ estimatedMinutes: 90 }]), "About 90 minutes estimated.");
  assert.equal(
    estimateSentence([{ estimatedMinutes: 40 }, { estimatedMinutes: null }, { estimatedMinutes: null }]),
    "About 40 minutes estimated, 2 tasks have no estimate.",
  );
  assert.equal(inboxCount([{ status: "inbox" }, { status: "todo" }, { status: "inbox" }]), 2);
});

test("scheduled estimates add up, missing estimates stay out of the total, and inbox tasks are counted but not listed", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    await createTask(userId, task("Long", "todo", today, "2026-06-20", 60));
    await createTask(userId, task("Short", "todo", today, null, 30));
    await createTask(userId, task("Unestimated", "todo", today, null, null));
    await createTask(userId, task("Only due", "todo", null, today, null));
    await createTask(userId, task("Inbox item", "inbox", today, today, 15));

    const tasks = await listTasksForUser(userId);
    const groups = groupForToday(tasks, today);
    assert.deepEqual(
      groups.scheduled.map((item) => item.title),
      ["Long", "Short", "Unestimated"].sort(),
    );
    assert.equal(groups.scheduled.some((item) => item.title === "Inbox item"), false);
    assert.equal(groups.dueToday.some((item) => item.title === "Inbox item"), false);
    assert.equal(estimateSentence(groups.scheduled), "About 90 minutes estimated, 1 task has no estimate.");
    assert.equal(inboxCount(tasks), 1);
    assert.equal(estimateSentence([{ estimatedMinutes: null }, { estimatedMinutes: null }]), null);
  } finally {
    await removeUser(email);
  }
});

function task(
  title: string,
  status: TaskInput["status"],
  scheduledFor: string | null,
  dueOn: string | null,
  estimatedMinutes: number | null,
): TaskInput {
  return {
    title,
    notes: "",
    status,
    priority: 1,
    dueOn,
    scheduledFor,
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes,
    lifeAreaId: null,
  };
}

function uniqueEmail(): string {
  return `lt036-${randomBytes(8).toString("hex")}@example.com`;
}

async function insertUser(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({ email, name: "LT036", password_hash: "schema-test-not-a-login" })
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
