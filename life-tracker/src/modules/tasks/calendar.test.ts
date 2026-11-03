import assert from "node:assert/strict";
import test from "node:test";
import { entriesForMilestones, entriesForTasks, type CalendarTask } from "./calendar.ts";
test("a milestone with a target date is a labeled calendar item", () => {
  const [entry] = entriesForMilestones([
    { id: "milestone-1", projectId: "project-1", title: "Draft", targetDate: "2026-06-16" },
  ]);
  assert.equal(entry?.date, "2026-06-16");
  assert.equal(entry?.role, "milestone");
  assert.equal(entry?.kind, "all-day");
  assert.equal(entry?.href, "/projects/project-1");
});

test("a due date with no time is an all-day item", () => {
  const task: CalendarTask = {
    id: "due",
    title: "Pay the bill",
    dueOn: "2026-06-16",
    scheduledFor: null,
    scheduledStart: null,
  };
  const [entry] = entriesForTasks([task], "Asia/Karachi");
  assert.equal(entry?.date, "2026-06-16");
  assert.equal(entry?.kind, "all-day");
  assert.equal(entry?.role, "due");
  assert.equal(entry?.timeLabel, null);
});

test("a scheduled start uses the clock time in the user zone", () => {
  const task: CalendarTask = {
    id: "timed",
    title: "Call",
    dueOn: null,
    scheduledFor: null,
    scheduledStart: "2026-06-16T02:30:00.000Z",
  };
  const karachi = entriesForTasks([task], "Asia/Karachi")[0];
  assert.equal(karachi?.date, "2026-06-16");
  assert.equal(karachi?.kind, "timed");
  assert.match(karachi?.timeLabel ?? "", /07:30/);

  const honolulu = entriesForTasks([task], "Pacific/Honolulu")[0];
  assert.equal(honolulu?.date, "2026-06-15");
  assert.match(honolulu?.timeLabel ?? "", /16:30/);
});
