import assert from "node:assert/strict";
import test from "node:test";
import { civilDateInZone } from "../../lib/dates.ts";
import { expandRecurrence, type RecurrenceRule } from "./recurrence.ts";

test("daily steps stay on the interval and inside the window", () => {
  const dates = expandRecurrence(rule("daily", 3, "2026-01-01"), "2026-01-05", "2026-01-12");
  assert.deepEqual(dates, ["2026-01-07", "2026-01-10"]);
});

test("weekly dates use ISO-week distance and the chosen weekdays", () => {
  const dates = expandRecurrence(
    { ...rule("weekly", 2, "2026-01-05"), byWeekdays: [1, 3] },
    "2026-01-01",
    "2026-01-21",
  );
  assert.deepEqual(dates, ["2026-01-05", "2026-01-07", "2026-01-19", "2026-01-21"]);
});

test("a 31 January series clamps February in a leap year and a non-leap year", () => {
  const leap = expandRecurrence(
    { ...rule("monthly", 1, "2024-01-31"), byMonthday: 31 },
    "2024-01-01",
    "2024-03-31",
  );
  assert.deepEqual(leap, ["2024-01-31", "2024-02-29", "2024-03-31"]);

  const common = expandRecurrence(
    { ...rule("monthly", 1, "2026-01-31"), byMonthday: 31 },
    "2026-01-01",
    "2026-10-31",
  );
  assert.ok(common.includes("2026-02-28"));
  assert.ok(common.includes("2026-04-30"));
  assert.ok(common.includes("2026-10-31"));
  assert.equal(common.includes("2026-02-31"), false);
});

test("until_on is inclusive and dates stay on or after starts_on", () => {
  const daily = expandRecurrence(
    { ...rule("daily", 1, "2026-01-01"), untilOn: "2026-01-03" },
    "2025-12-01",
    "2026-01-10",
  );
  assert.deepEqual(daily, ["2026-01-01", "2026-01-02", "2026-01-03"]);

  const weekly = expandRecurrence(
    { ...rule("weekly", 2, "2026-01-05"), byWeekdays: [1, 3], untilOn: "2026-01-07" },
    "2026-01-01",
    "2026-01-31",
  );
  assert.deepEqual(weekly, ["2026-01-05", "2026-01-07"]);
});

test("a date-only string stays on that civil date in each zone", () => {
  for (const zone of ["Asia/Karachi", "Pacific/Kiritimati", "Pacific/Honolulu"]) {
    assert.equal(civilDateInZone("2026-06-16", zone), "2026-06-16");
  }
});

function rule(freq: RecurrenceRule["freq"], intervalCount: number, startsOn: string): RecurrenceRule {
  return {
    freq,
    intervalCount,
    byWeekdays: [],
    byMonthday: null,
    startsOn,
    untilOn: null,
  };
}
