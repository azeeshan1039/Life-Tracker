import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";
import { completeTask, createTask, reopenTask, rescheduleTask } from "./mutations";
import { getTask, listTaskActivity } from "./queries";
import type { TaskInput } from "./schema";

const note = "private note that must stay out of activity";

test("complete, reopen, and reschedule keep history without note text", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const created = await createTask(userId, sampleInput());
    assert.equal(created.ok, true);
    if (!created.ok) {
      return;
    }

    const completed = await completeTask(userId, created.task.id);
    assert.equal(completed.ok, true);
    if (!completed.ok) {
      return;
    }
    assert.equal(completed.task.status, "done");
    assert.ok(completed.task.completedAt);

    const reopened = await reopenTask(userId, created.task.id);
    assert.equal(reopened.ok, true);
    if (!reopened.ok) {
      return;
    }
    assert.equal(reopened.task.status, "todo");
    assert.equal(reopened.task.completedAt, null);

    const moved = await rescheduleTask(userId, created.task.id, {
      scheduledFor: "2026-06-21",
      dueOn: "2026-06-22",
    });
    assert.equal(moved.ok, true);
    if (!moved.ok) {
      return;
    }

    const activity = await listTaskActivity(userId, created.task.id);
    assert.deepEqual(
      activity.map((row) => row.event),
      ["created", "completed", "reopened", "rescheduled"],
    );
    const detail = activity.at(-1)?.detail;
    assert.deepEqual(detail, {
      scheduled_for: { previous: "2026-06-18", next: "2026-06-21" },
      due_on: { previous: "2026-06-20", next: "2026-06-22" },
    });
    assert.equal(JSON.stringify(detail).includes(note), false);
  } finally {
    await removeUser(email);
  }
});

test("scheduling an inbox task promotes it without detaching its dates", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const created = await createTask(userId, {
      ...sampleInput(),
      status: "inbox",
      scheduledFor: null,
      dueOn: "2026-06-24",
    });
    assert.equal(created.ok, true);
    if (!created.ok) {
      return;
    }

    const scheduled = await rescheduleTask(userId, created.task.id, {
      scheduledFor: "2026-06-23",
      dueOn: created.task.dueOn,
    });
    assert.equal(scheduled.ok, true);
    if (!scheduled.ok) {
      return;
    }
    assert.equal(scheduled.task.status, "todo");
    assert.equal(scheduled.task.scheduledFor, "2026-06-23");
    assert.equal(scheduled.task.dueOn, "2026-06-24");
  } finally {
    await removeUser(email);
  }
});

test("another user receives not found for a task they do not own", async () => {
  const ownerEmail = uniqueEmail();
  const otherEmail = uniqueEmail();
  try {
    const ownerId = await insertUser(ownerEmail);
    const otherId = await insertUser(otherEmail);
    const created = await createTask(ownerId, sampleInput());
    assert.equal(created.ok, true);
    if (!created.ok) {
      return;
    }

    assert.equal(await getTask(otherId, created.task.id), null);
    const completed = await completeTask(otherId, created.task.id);
    assert.deepEqual(completed, {
      ok: false,
      error: "not_found",
      message: "This task is not available.",
    });

    const unchanged = await getTask(ownerId, created.task.id);
    assert.equal(unchanged?.status, "todo");
    assert.equal(unchanged?.completedAt, null);
  } finally {
    await removeUser(ownerEmail);
    await removeUser(otherEmail);
  }
});

test("a failed activity write does not keep the task change", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const created = await createTask(userId, sampleInput());
    assert.equal(created.ok, true);
    if (!created.ok) {
      return;
    }

    const { error } = await getAdminClient().rpc("save_task_and_activity", {
      p_user_id: userId,
      p_task_id: created.task.id,
      p_title: "Changed title",
      p_notes: created.task.notes,
      p_status: "todo",
      p_priority: created.task.priority,
      p_due_on: created.task.dueOn,
      p_scheduled_for: created.task.scheduledFor,
      p_scheduled_start: created.task.scheduledStart,
      p_scheduled_end: created.task.scheduledEnd,
      p_estimated_minutes: created.task.estimatedMinutes,
      p_life_area_id: created.task.lifeAreaId,
      p_completed_at: null,
      p_cancelled_at: null,
      p_event: "not-an-event",
      p_from_status: "todo",
      p_to_status: "todo",
      p_detail: { notes: created.task.notes },
      p_write_activity: true,
    });
    assert.ok(error);

    const stored = await getTask(userId, created.task.id);
    assert.equal(stored?.title, "Ship the note");
  } finally {
    await removeUser(email);
  }
});

function sampleInput(): TaskInput {
  return {
    title: "Ship the note",
    notes: note,
    status: "todo",
    priority: 2,
    dueOn: "2026-06-20",
    scheduledFor: "2026-06-18",
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes: null,
    lifeAreaId: null,
  };
}

function uniqueEmail(): string {
  return `lt013-${randomBytes(8).toString("hex")}@example.com`;
}

async function insertUser(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({
      email,
      name: "LT013",
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
