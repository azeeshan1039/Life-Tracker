import assert from "node:assert/strict";
import test from "node:test";
import { habitsForToday } from "./today.ts";
import type { HabitDefinition, HabitLog } from "./classify.ts";

const monday = "2026-01-05";
const tuesday = "2026-01-06";

test("a Monday-only habit is absent on Tuesday and present on Monday", () => {
  const habit = input(fixed([1]), []);
  assert.deepEqual(habitsForToday([habit], tuesday).due.map((item) => item.id), []);
  assert.deepEqual(habitsForToday([habit], monday).due.map((item) => item.id), ["habit-1"]);
});

test("a weekly quota leaves the list once the week is met", () => {
  const open = input(quota(2), [logged(monday)]);
  const openResult = habitsForToday([open], tuesday);
  assert.deepEqual(openResult.due.map((item) => item.id), ["habit-1"]);
  assert.deepEqual(openResult.weeklyMet, []);

  const done = input(quota(1), [logged(monday)]);
  const doneResult = habitsForToday([done], tuesday);
  assert.deepEqual(doneResult.due, []);
  assert.equal(doneResult.weeklyMet[0]?.title, "Walk");
});

function input(habit: HabitDefinition, logs: HabitLog[]) {
  return { ...habit, id: "habit-1", title: "Walk", unit: null, logs };
}

function fixed(weekdays: number[]): HabitDefinition {
  return {
    status: "active",
    trackingType: "boolean",
    targetValue: null,
    scheduleKind: "fixed_days",
    weekdays,
    weeklyTarget: null,
  };
}

function quota(weeklyTarget: number): HabitDefinition {
  return {
    status: "active",
    trackingType: "boolean",
    targetValue: null,
    scheduleKind: "weekly_quota",
    weekdays: [],
    weeklyTarget,
  };
}

function logged(loggedOn: string): HabitLog {
  return { loggedOn, logStatus: "logged", value: 1 };
}
