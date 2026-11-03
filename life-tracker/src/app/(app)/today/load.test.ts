import assert from "node:assert/strict";
import test from "node:test";
import { UnauthorizedError } from "../../../lib/current-user";
import { loadToday } from "./page";

test("anonymous today loader is rejected without middleware", async () => {
  await assert.rejects(() => loadToday(undefined), UnauthorizedError);
});
