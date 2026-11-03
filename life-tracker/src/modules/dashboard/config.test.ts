import assert from "node:assert/strict";
import test from "node:test";
import { parseDashboardConfig, visibleWidgets } from "./config.ts";

test("unknown widget ids are ignored and a corrupt value falls back to defaults", () => {
  assert.deepEqual(parseDashboardConfig("corrupt"), { pinnedGoalIds: [], hiddenWidgets: [] });
  assert.deepEqual(parseDashboardConfig(null), { pinnedGoalIds: [], hiddenWidgets: [] });
  assert.deepEqual(parseDashboardConfig([]), { pinnedGoalIds: [], hiddenWidgets: [] });
  assert.deepEqual(
    parseDashboardConfig({
      pinnedGoalIds: { bad: true },
      hiddenWidgets: "today",
    }),
    { pinnedGoalIds: [], hiddenWidgets: [] },
  );

  const parsed = parseDashboardConfig({
    pinnedGoalIds: ["goal-1", "goal-2", "goal-3", "goal-4", 5, "goal-1"],
    hiddenWidgets: ["today", "life_score", "inbox", "today"],
    extra: true,
  });
  assert.deepEqual(parsed.pinnedGoalIds, ["goal-1", "goal-2", "goal-3"]);
  assert.deepEqual(parsed.hiddenWidgets, ["today", "inbox"]);
  assert.equal(visibleWidgets(parsed).includes("today"), false);
  assert.equal(visibleWidgets(parsed).includes("habits"), true);
  assert.equal(JSON.stringify(parsed).includes("life_score"), false);
});
