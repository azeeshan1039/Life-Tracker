import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";
import { entriesForMilestones } from "../tasks/calendar";
import { addMilestone, createProject, markMilestoneDone, moveMilestone } from "./mutations";
import { listCalendarMilestones, listMilestones } from "./queries";

test("milestone order persists, done sets completed_at, and a dated milestone is on the calendar", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email);
    const project = await createProject(userId, {
      title: "Site",
      description: "",
      startDate: null,
      targetDate: null,
      lifeAreaId: null,
    });
    assert.equal(project.ok, true);
    if (!project.ok) {
      return;
    }
    const first = await addMilestone(userId, project.id, { title: "Alpha", targetDate: null });
    const second = await addMilestone(userId, project.id, { title: "Beta", targetDate: "2026-06-16" });
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (!first.ok || !second.ok) {
      return;
    }

    const moved = await moveMilestone(userId, project.id, first.id, "down");
    assert.equal(moved.ok, true);
    const ordered = await listMilestones(userId, project.id);
    assert.deepEqual(ordered.map((item) => item.title), ["Beta", "Alpha"]);

    const done = await markMilestoneDone(userId, project.id, second.id);
    assert.equal(done.ok, true);
    const beta = (await listMilestones(userId, project.id)).find((item) => item.id === second.id);
    assert.equal(beta?.status, "done");
    assert.ok(beta?.completedAt);

    const calendar = await listCalendarMilestones(userId);
    assert.equal(calendar.some((item) => item.id === second.id), true);
    assert.equal(calendar.some((item) => item.id === first.id), false);
    const entry = entriesForMilestones(calendar.filter((item) => item.id === second.id))[0];
    assert.equal(entry?.date, "2026-06-16");
    assert.equal(entry?.role, "milestone");
  } finally {
    await removeUser(email);
  }
});

function uniqueEmail(): string {
  return `lt029-${randomBytes(8).toString("hex")}@example.com`;
}

async function insertUser(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({ email, name: "LT029", password_hash: "schema-test-not-a-login" })
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
