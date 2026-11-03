import assert from "node:assert/strict";
import test from "node:test";
import { areaNotice, suggestionsFor } from "./suggestions.ts";

test("deen and wealth keep their fixed sentences and suggestions stay ordinary labels", () => {
  assert.equal(areaNotice("deen"), "These are private reminders. They are not a measure of faith.");
  assert.equal(areaNotice("wealth"), "Nothing here is a forecast.");
  assert.equal(areaNotice("health"), null);
  const wealth = suggestionsFor("wealth").map((item) => item.label);
  assert.deepEqual(wealth, ["Savings", "Income", "Expenses", "Liabilities"]);
  const business = suggestionsFor("business").find((item) => item.key === "business-revenue");
  assert.equal(business?.hint, "Manual figures.");
  assert.equal(JSON.stringify(suggestionsFor("deen")).toLowerCase().includes("score"), false);
  assert.equal(JSON.stringify(suggestionsFor("wealth")).toLowerCase().includes("forecast"), false);
});
