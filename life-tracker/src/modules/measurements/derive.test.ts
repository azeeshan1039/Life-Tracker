import assert from "node:assert/strict";
import test from "node:test";
import { decideAreaCashFlow, decideNetWorth, goalProgress, latestOnOrBefore, periodSum, progressLines } from "./derive.ts";

test("a future entry does not become current, and a period sum stays inside the range", () => {
  const entries = [
    { recordedOn: "2026-06-01", value: "0.10" },
    { recordedOn: "2026-06-20", value: "9" },
    { recordedOn: "2026-07-01", value: "4" },
  ];
  assert.deepEqual(latestOnOrBefore(entries, "2026-06-16"), { recordedOn: "2026-06-01", value: "0.10" });
  assert.equal(periodSum(entries, "2026-06-01", "2026-06-30"), "9.1000");
  assert.equal(periodSum(entries, "2026-05-01", "2026-05-31"), null);
});

test("net worth is refused for mixed units, a missing side, and period sums", () => {
  const mixed = decideNetWorth([
    { kind: "asset", unit: "PKR", aggregation: "latest", value: "100" },
    { kind: "liability", unit: "USD", aggregation: "latest", value: "5" },
  ]);
  assert.equal(mixed.outcome, "mixed_units");
  assert.equal("total" in mixed, false);

  const missing = decideNetWorth([{ kind: "asset", unit: "USD", aggregation: "latest", value: "0.30" }]);
  assert.equal(missing.outcome, "missing_liabilities");
  assert.equal("total" in missing, false);

  const ignoredPeriod = decideNetWorth([
    { kind: "asset", unit: "USD", aggregation: "period_sum", value: "50" },
    { kind: "liability", unit: "USD", aggregation: "latest", value: "5" },
  ]);
  assert.equal(ignoredPeriod.outcome, "missing_assets");

  const total = decideNetWorth([
    { kind: "asset", unit: "USD", aggregation: "latest", value: "0.10" },
    { kind: "asset", unit: "USD", aggregation: "latest", value: "0.20" },
    { kind: "liability", unit: "USD", aggregation: "latest", value: "0.10" },
  ]);
  assert.deepEqual(total, { outcome: "total", unit: "USD", total: "0.2000" });
});

test("a percentage is absent unless the progress rule has every input", () => {
  const missing = goalProgress({ current: "10", target: null, direction: "increase" });
  assert.equal(missing.mode, "missing");
  assert.equal("percentText" in missing, false);
  assert.deepEqual(progressLines(missing, "kg"), ["No measurement yet"]);
  assert.equal(progressLines(missing, "kg").some((line) => line.includes("%")), false);

  const noMetric = goalProgress({ current: null, target: null, direction: null });
  assert.deepEqual(progressLines(noMetric, "kg"), ["No measurement yet"]);

  const maintain = goalProgress({ current: "10", target: "8", direction: "maintain" });
  assert.equal(maintain.mode, "values");
  assert.equal(progressLines(maintain, "kg").some((line) => line.includes("%")), false);
  assert.equal(progressLines(maintain, "kg").includes("Gap 2 kg"), true);

  const decreaseToZero = goalProgress({ current: "5", target: "0", direction: "decrease" });
  assert.equal(decreaseToZero.mode, "values");
  assert.equal(progressLines(decreaseToZero, "USD").some((line) => line.includes("%")), false);

  const increase = goalProgress({ current: "1", target: "2", direction: "increase" });
  assert.equal(increase.mode, "bar");
  if (increase.mode === "bar") {
    assert.equal(increase.percentText, "50");
    assert.equal(increase.barPercent, 50);
  }
  const over = goalProgress({ current: "3", target: "2", direction: "increase" });
  if (over.mode === "bar") {
    assert.equal(over.percentText, "150");
    assert.equal(over.barPercent, 100);
  }
});

test("area cash flow needs one income metric and one expense metric in one unit", () => {
  const suppressed = decideAreaCashFlow([
    { kind: "income", unit: "USD", aggregation: "period_sum", active: true, monthSum: "10" },
    { kind: "income", unit: "USD", aggregation: "period_sum", active: true, monthSum: "4" },
    { kind: "expense", unit: "USD", aggregation: "period_sum", active: true, monthSum: "3" },
  ]);
  assert.deepEqual(suppressed, { computed: false });

  const flow = decideAreaCashFlow([
    { kind: "income", unit: "USD", aggregation: "period_sum", active: true, monthSum: "0.30" },
    { kind: "expense", unit: "USD", aggregation: "period_sum", active: true, monthSum: "0.10" },
  ]);
  assert.deepEqual(flow, { computed: true, unit: "USD", income: "0.3000", expense: "0.1000", net: "0.2000" });
});
