import assert from "node:assert/strict";
import test from "node:test";
import { meanText } from "./score.ts";

test("the mean ignores blank scores and does not invent a choice", () => {
  assert.equal(meanText([]), "Unscored");
  assert.equal(meanText([null, null]), "Unscored");
  assert.equal(meanText([1, null, 5]), "3");
  assert.equal(meanText([1, 2, null]), "1.5");
  assert.equal(meanText([4]), "4");
  assert.equal("is_chosen" in { text: meanText([5, 1]) }, false);
});
