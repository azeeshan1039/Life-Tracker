import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";
import { addSubtask, completeTask, createTask } from "./mutations";
import { getTask, loadTaskDetail } from "./queries";
import type { TaskInput } from "./schema";

test("a subtask of a subtask is rejected and due dates stay independent", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const parent = await createTask(userId, task("Parent", "2026-06-01"));
    assert.equal(parent.ok, true);
    if (!parent.ok) {
      return;
    }
    const child = await addSubtask(userId, parent.task.id, {
      title: "Child",
      dueOn: "2026-06-20",
    });
    assert.equal(child.ok, true);
    if (!child.ok) {
      return;
    }
    assert.equal(child.task.parentTaskId, parent.task.id);
    assert.equal(child.task.dueOn, "2026-06-20");
    assert.equal((await getTask(userId, parent.task.id))?.dueOn, "2026-06-01");

    const grandchild = await addSubtask(userId, child.task.id, {
      title: "Grandchild",
      dueOn: null,
    });
    assert.deepEqual(grandchild, {
      ok: false,
      error: "invalid",
      message: "A subtask cannot have its own subtask.",
    });
  } finally {
    await removeUser(email);
  }
});

test("completing a parent leaves its subtask open", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const parent = await createTask(userId, task("Parent", null));
    assert.equal(parent.ok, true);
    if (!parent.ok) {
      return;
    }
    const child = await addSubtask(userId, parent.task.id, { title: "Child", dueOn: null });
    assert.equal(child.ok, true);
    if (!child.ok) {
      return;
    }

    const completed = await completeTask(userId, parent.task.id);
    assert.equal(completed.ok, true);
    if (!completed.ok) {
      return;
    }
    assert.equal(completed.task.status, "done");
    assert.equal((await getTask(userId, child.task.id))?.status, "todo");
  } finally {
    await removeUser(email);
  }
});

test("another user is told the task is not available", async () => {
  const ownerEmail = uniqueEmail();
  const otherEmail = uniqueEmail();
  try {
    const ownerId = await insertUser(ownerEmail);
    const otherId = await insertUser(otherEmail);
    const parent = await createTask(ownerId, task("Parent", null));
    assert.equal(parent.ok, true);
    if (!parent.ok) {
      return;
    }
    assert.deepEqual(await loadTaskDetail(otherId, parent.task.id), {
      ok: false,
      message: "This task is not available.",
    });
  } finally {
    await removeUser(ownerEmail);
    await removeUser(otherEmail);
  }
});

function task(title: string, dueOn: string | null): TaskInput {
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

function uniqueEmail(): string {
  return `lt015-${randomBytes(8).toString("hex")}@example.com`;
}

async function insertUser(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({
      email,
      name: "LT015",
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
