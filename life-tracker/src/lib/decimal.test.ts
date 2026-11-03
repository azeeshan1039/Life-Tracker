import assert from "node:assert/strict";
import test from "node:test";
import { addDecimals, decimalString, sumDecimals } from "./decimal.ts";

test("decimal strings round-trip without binary fractions", () => {
  assert.equal(decimalString("0.10"), "0.1000");
  assert.equal(decimalString("0.1"), "0.1000");
  assert.equal(decimalString("12345678901234.5000"), "12345678901234.5000");
  assert.equal(addDecimals("0.10", "0.20"), "0.3000");
  assert.equal(addDecimals("0.1", "0.2"), "0.3000");
  assert.notEqual(addDecimals("0.1", "0.2"), String(0.1 + 0.2));
});

test("a decimal sum matches the numeric result", () => {
  assert.equal(sumDecimals(["10.00", "0.10", "0.20"]), "10.3000");
  assert.equal(sumDecimals([]), "0.0000");
});
