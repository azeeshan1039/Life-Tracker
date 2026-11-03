import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";

test("one series date can be saved once, and a subtask cannot belong to a series", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const supabase = getAdminClient();
    const series = await supabase
      .from("recurrence_series")
      .insert({
        user_id: userId,
        freq: "daily",
        starts_on: "2026-06-01",
        title: "Replace the filter",
        priority: 0,
      })
      .select("id")
      .single();
    assert.equal(series.error, null);
    const seriesId = series.data?.id;
    assert.ok(seriesId);

    const first = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        series_id: seriesId,
        occurrence_on: "2026-06-01",
        title: "Replace the filter",
        priority: 0,
      })
      .select("id, detached, occurrence_on")
      .single();
    assert.equal(first.error, null);
    assert.equal(first.data?.detached, false);
    assert.equal(first.data?.occurrence_on, "2026-06-01");

    const duplicate = await supabase.from("tasks").insert({
      user_id: userId,
      series_id: seriesId,
      occurrence_on: "2026-06-01",
      title: "Replace the filter again",
      priority: 0,
    });
    assert.equal(duplicate.error?.code, "23505");
    assert.match(duplicate.error?.message ?? "", /tasks_series_occurrence_uidx/);

    const parent = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        title: "Parent",
        priority: 0,
      })
      .select("id")
      .single();
    assert.equal(parent.error, null);

    const subtask = await supabase.from("tasks").insert({
      user_id: userId,
      parent_task_id: parent.data?.id,
      series_id: seriesId,
      occurrence_on: "2026-06-02",
      title: "Child of a series",
      priority: 0,
    });
    assert.equal(subtask.error?.code, "23514");
    assert.match(subtask.error?.message ?? "", /tasks_not_subtask_and_series_check/);
  } finally {
    await removeUser(email);
  }
});

function uniqueEmail(): string {
  return `lt017-${randomBytes(8).toString("hex")}@example.com`;
}

async function insertUser(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({
      email,
      name: "LT017",
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
