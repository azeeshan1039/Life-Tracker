import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";
import { replaceSeriesGoals } from "./series";

test("new occurrences copy series goals, and a detached occurrence does not gain a later goal", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const supabase = getAdminClient();
    const series = await supabase
      .from("recurrence_series")
      .insert({
        user_id: userId,
        freq: "daily",
        starts_on: "2026-01-05",
        until_on: "2026-01-07",
        title: "Review",
        priority: 0,
      })
      .select("id")
      .single();
    assert.equal(series.error, null);
    const seriesId = series.data?.id ?? "";
    const goalA = await supabase.from("goals").insert({ user_id: userId, title: "Focus" }).select("id").single();
    const goalB = await supabase.from("goals").insert({ user_id: userId, title: "Health" }).select("id").single();
    assert.equal(goalA.error, null);
    assert.equal(goalB.error, null);
    const seeded = await supabase.from("series_goals").insert({ series_id: seriesId, goal_id: goalA.data?.id });
    assert.equal(seeded.error, null);

    const inserted = await supabase.rpc("insert_series_occurrences", {
      p_user_id: userId,
      p_series_id: seriesId,
      p_dates: ["2026-01-05", "2026-01-06"],
      p_title: "Review",
      p_notes: "",
      p_priority: 0,
      p_estimated_minutes: null,
      p_life_area_id: null,
      p_project_id: null,
    });
    assert.equal(inserted.error, null);
    assert.equal(inserted.data, 2);

    const firstDay = await taskOn(seriesId, "2026-01-05");
    const secondDay = await taskOn(seriesId, "2026-01-06");
    assert.deepEqual(await goalIds(firstDay), [goalA.data?.id]);
    assert.deepEqual(await goalIds(secondDay), [goalA.data?.id]);

    const detached = await supabase.from("tasks").update({ detached: true }).eq("id", firstDay);
    assert.equal(detached.error, null);

    const replaced = await replaceSeriesGoals(userId, seriesId, "2026-01-05", [goalA.data?.id ?? "", goalB.data?.id ?? ""]);
    assert.equal(replaced.ok, true);
    assert.deepEqual(await goalIds(firstDay), [goalA.data?.id]);
    assert.deepEqual((await goalIds(secondDay)).sort(), [goalA.data?.id, goalB.data?.id].sort());

    const later = await supabase.rpc("insert_series_occurrences", {
      p_user_id: userId,
      p_series_id: seriesId,
      p_dates: ["2026-01-07"],
      p_title: "Review",
      p_notes: "",
      p_priority: 0,
      p_estimated_minutes: null,
      p_life_area_id: null,
      p_project_id: null,
    });
    assert.equal(later.error, null);
    const thirdDay = await taskOn(seriesId, "2026-01-07");
    assert.deepEqual((await goalIds(thirdDay)).sort(), [goalA.data?.id, goalB.data?.id].sort());
  } finally {
    await removeUser(email);
  }
});

async function taskOn(seriesId: string, date: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("tasks")
    .select("id")
    .eq("series_id", seriesId)
    .eq("occurrence_on", date)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data.id;
}

async function goalIds(taskId: string): Promise<string[]> {
  const { data, error } = await getAdminClient().from("task_goals").select("goal_id").eq("task_id", taskId);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => row.goal_id);
}

function uniqueEmail(): string {
  return `lt031-${randomBytes(8).toString("hex")}@example.com`;
}

async function insertUser(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({ email, name: "LT031", password_hash: "schema-test-not-a-login" })
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
