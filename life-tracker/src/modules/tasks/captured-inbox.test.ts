import assert from "node:assert/strict";
import test from "node:test";
import { acceptsCapturedInbox, withCapturedInbox } from "./captured-inbox";
import type { TaskListItem } from "./views";

test("a captured inbox task is added once and kept in title order", () => {
  const existing = [item("b", "Beta")];
  const merged = withCapturedInbox(existing, [
    { id: "a", title: "Alpha" },
    { id: "a", title: "Alpha" },
    { id: "b", title: "Beta" },
  ]);
  assert.deepEqual(merged.map((task) => task.id), ["a", "b"]);
  assert.equal(merged[0]?.status, "inbox");
  assert.equal(merged[0]?.scheduledFor, null);
});

test("a blank inbox task matches an unfiltered list and the none priority", () => {
  assert.equal(acceptsCapturedInbox(null, null), true);
  assert.equal(acceptsCapturedInbox(null, 0), true);
  assert.equal(acceptsCapturedInbox(1, null), false);
  assert.equal(acceptsCapturedInbox(null, 2), false);
});

function item(id: string, title: string): TaskListItem {
  return {
    id,
    title,
    status: "inbox",
    priority: 0,
    dueOn: null,
    scheduledFor: null,
    lifeAreaId: null,
    areaName: null,
    estimatedMinutes: null,
  };
}
