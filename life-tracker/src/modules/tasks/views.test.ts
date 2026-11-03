import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";
import { completeTask, createTask } from "./mutations";
import type { TaskInput } from "./schema";
import { groupForToday, listRecentCompletions, listTasksForUser } from "./views";

const today = "2026-06-16";

test("today groups keep scheduled, due, and overdue apart and skip the inbox", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    await createTask(userId, task("Scheduled Tuesday", "todo", "2026-06-16", "2026-06-19"));
    await createTask(userId, task("Due Tuesday", "todo", null, "2026-06-16"));
    await createTask(userId, task("Late from Monday", "in_progress", null, "2026-06-15"));
    await createTask(userId, task("Inbox today", "inbox", "2026-06-16", "2026-06-16"));

    const groups = groupForToday(await listTasksForUser(userId), today);
    assert.deepEqual(titles(groups.scheduled), ["Scheduled Tuesday"]);
    assert.deepEqual(titles(groups.dueToday), ["Due Tuesday"]);
    assert.deepEqual(titles(groups.overdue), ["Late from Monday"]);
  } finally {
    await removeUser(email);
  }
});

test("completed view uses activity inside the window", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const created = await createTask(userId, task("Finished", "todo", null, null));
    assert.equal(created.ok, true);
    if (!created.ok) {
      return;
    }
    const { error } = await getAdminClient().from("task_activity").insert({
      task_id: created.task.id,
      user_id: userId,
      event: "completed",
      occurred_at: "2020-01-01T00:00:00.000Z",
      detail: {},
    });
    if (error) {
      throw new Error(error.message);
    }
    await completeTask(userId, created.task.id);

    const recent = await listRecentCompletions(userId, "2026-01-01T00:00:00.000Z");
    assert.equal(recent.length, 1);
    assert.equal(recent[0]?.title, "Finished");
    const ancient = await listRecentCompletions(userId, "2030-01-01T00:00:00.000Z");
    assert.equal(ancient.length, 0);
  } finally {
    await removeUser(email);
  }
});

function titles(tasks: { title: string }[]): string[] {
  return tasks.map((task) => task.title);
}

function task(
  title: string,
  status: TaskInput["status"],
  scheduledFor: string | null,
  dueOn: string | null,
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
    estimatedMinutes: null,
    lifeAreaId: null,
  };
}

function uniqueEmail(): string {
  return `lt014-${randomBytes(8).toString("hex")}@example.com`;
}

async function insertUser(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({
      email,
      name: "LT014",
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
