import assert from "node:assert/strict";
import test from "node:test";
import { classify, type HabitDefinition, type HabitLog } from "./classify.ts";

const monday = "2026-01-05";
const tuesday = "2026-01-06";
const wednesday = "2026-01-07";
const sunday = "2026-01-11";
const nextMonday = "2026-01-12";

test("fixed days cover every class in the table", () => {
  const habit = fixed([1]);

  assert.equal(classify(habit, tuesday, monday).day, "unscheduled");
  assert.equal(classify(habit, monday, monday, [logged(monday, "logged", 1)]).day, "met");
  assert.equal(classify(measured(), monday, monday, [logged(monday, "logged", 5)]).day, "met");
  assert.equal(classify(measured("duration"), monday, monday, [logged(monday, "logged", 90)]).day, "met");
  assert.equal(classify(measured(), monday, monday, [logged(monday, "logged", 4)]).day, "below_target");
  assert.equal(classify(habit, monday, monday, [logged(monday, "skipped", null)]).day, "skipped");
  assert.equal(classify(habit, monday, monday, [logged(monday, "rest", null)]).day, "rest");
  assert.equal(classify(habit, monday, monday).day, "due");
  assert.equal(classify(habit, monday, tuesday).day, "missed");
  assert.equal(classify(habit, monday, "2026-01-04").day, "upcoming");
  assert.equal(classify(habit, tuesday, "2026-01-04").day, "unscheduled");
});

test("a weekly quota stays in progress until the ISO week ends", () => {
  const habit = quota(3);
  const logs: HabitLog[] = [logged(monday, "logged", 1), logged(tuesday, "skipped", null)];

  const midweek = classify(habit, wednesday, wednesday, logs);
  assert.equal(midweek.day, "unscheduled");
  assert.deepEqual(midweek.week, { class: "in_progress", metCount: 1, weeklyTarget: 3 });

  const skipped = classify(habit, tuesday, wednesday, logs);
  assert.equal(skipped.day, "skipped");
  assert.equal(skipped.week?.metCount, 1);

  const short = classify(measuredQuota(), wednesday, wednesday, [logged(wednesday, "logged", 1)]);
  assert.equal(short.day, "below_target");
  assert.equal(short.week?.metCount, 0);
  assert.equal(short.week?.class, "in_progress");
});

test("a finished ISO week is met or missed and empty days stay empty", () => {
  const habit = quota(2);
  const metLogs = [logged(monday, "logged", 1), logged(tuesday, "logged", 1)];
  const done = classify(habit, wednesday, nextMonday, metLogs);
  assert.equal(done.day, "unscheduled");
  assert.deepEqual(done.week, { class: "met", metCount: 2, weeklyTarget: 2 });

  const missed = classify(habit, wednesday, nextMonday, [logged(monday, "logged", 1)]);
  assert.equal(missed.day, "unscheduled");
  assert.equal(missed.week?.class, "missed");
  assert.equal(missed.week?.metCount, 1);

  const rest = classify(habit, sunday, nextMonday, [logged(sunday, "rest", null)]);
  assert.equal(rest.day, "rest");
  assert.equal(rest.week?.class, "missed");
});

test("a paused day is paused rather than missed", () => {
  const habit = fixed([1]);
  habit.status = "paused";
  const result = classify(habit, monday, nextMonday);
  assert.equal(result.day, "paused");

  const loggedDay = classify(habit, monday, nextMonday, [logged(monday, "logged", 1)]);
  assert.equal(loggedDay.day, "met");
});

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

function measured(trackingType: "numeric" | "duration" = "numeric"): HabitDefinition {
  return { ...fixed([1]), trackingType, targetValue: trackingType === "duration" ? 60 : 5 };
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

function measuredQuota(): HabitDefinition {
  return { ...quota(3), trackingType: "numeric", targetValue: 5 };
}

function logged(loggedOn: string, logStatus: HabitLog["logStatus"], value: number | null): HabitLog {
  return { loggedOn, logStatus, value };
}
