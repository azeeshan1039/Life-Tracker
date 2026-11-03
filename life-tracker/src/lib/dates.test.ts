import assert from "node:assert/strict";
import test from "node:test";
import { civilDateInZone, todayInTimezone } from "./dates.ts";

const beforeUtcMidnight = new Date("2026-06-15T23:30:00.000Z");
const afterUtcMidnight = new Date("2026-06-16T00:30:00.000Z");

test("todayInTimezone differs across zones around UTC midnight", () => {
  assert.equal(todayInTimezone(beforeUtcMidnight, "Asia/Karachi"), "2026-06-16");
  assert.equal(todayInTimezone(beforeUtcMidnight, "Pacific/Kiritimati"), "2026-06-16");
  assert.equal(todayInTimezone(beforeUtcMidnight, "Pacific/Honolulu"), "2026-06-15");

  assert.equal(todayInTimezone(afterUtcMidnight, "Asia/Karachi"), "2026-06-16");
  assert.equal(todayInTimezone(afterUtcMidnight, "Pacific/Kiritimati"), "2026-06-16");
  assert.equal(todayInTimezone(afterUtcMidnight, "Pacific/Honolulu"), "2026-06-15");
});

test("a date-only string stays on the same civil date in each zone", () => {
  for (const zone of ["Asia/Karachi", "Pacific/Kiritimati", "Pacific/Honolulu"]) {
    assert.equal(civilDateInZone("2026-01-31", zone), "2026-01-31");
  }
});
