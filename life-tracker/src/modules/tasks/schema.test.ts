import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";

test("a valid task inserts and an inverted time range is rejected", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        title: "Write the note",
        priority: 1,
        due_on: null,
        scheduled_for: null,
        scheduled_start: "2026-06-16T09:00:00.000Z",
        scheduled_end: "2026-06-16T10:00:00.000Z",
      })
      .select("id, status, priority")
      .single();
    assert.equal(error, null);
    assert.equal(data?.status, "todo");
    assert.equal(data?.priority, 1);

    const inverted = await supabase.from("tasks").insert({
      user_id: userId,
      title: "Backwards",
      priority: 1,
      scheduled_start: "2026-06-16T10:00:00.000Z",
      scheduled_end: "2026-06-16T09:00:00.000Z",
    });
    assert.equal(inverted.error?.code, "23514");
    assert.match(inverted.error?.message ?? "", /tasks_scheduled_range_check/);
  } finally {
    await removeUser(email);
  }
});

test("priority outside 0-3 is rejected", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const { error } = await getAdminClient().from("tasks").insert({
      user_id: userId,
      title: "Too high",
      priority: 4,
    });
    assert.equal(error?.code, "23514");
    assert.match(error?.message ?? "", /tasks_priority_check/);
  } finally {
    await removeUser(email);
  }
});

test("open-task indexes exist", () => {
  const names = psql(
    "select indexname from pg_indexes where schemaname = 'public' and tablename = 'tasks' order by 1",
  );
  assert.match(names, /tasks_user_open_due_idx/);
  assert.match(names, /tasks_user_scheduled_idx/);
});

function uniqueEmail(): string {
  return `lt012-${randomBytes(8).toString("hex")}@example.com`;
}

async function insertUser(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({
      email,
      name: "LT012",
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

function psql(sql: string): string {
  const databaseUrl = process.env.DIRECT_URL;
  if (!databaseUrl) {
    throw new Error("DIRECT_URL is missing");
  }
  const result = spawnSync("psql", [databaseUrl, "-At", "-c", sql], { encoding: "utf8" });
  if (result.status !== 0) {
    const message = `${result.stderr ?? ""}${result.stdout ?? ""}`.replaceAll(databaseUrl, "[redacted]");
    throw new Error(message.trim() || "psql failed");
  }
  return result.stdout ?? "";
}
