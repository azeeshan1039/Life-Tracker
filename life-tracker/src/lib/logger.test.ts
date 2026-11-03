import assert from "node:assert/strict";
import { Writable } from "node:stream";
import test from "node:test";
import { createLogger } from "./logger.ts";

function captureLog(fields: Record<string, unknown>): string {
  let line = "";
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      line += chunk.toString();
      callback();
    },
  });
  const logger = createLogger(stream);
  logger.info(fields, "auth");
  return line;
}

test("redacts a password field", () => {
  const line = captureLog({ password: "secret-value" });
  assert.equal(line.includes("secret-value"), false);
  assert.match(line, /\[Redacted\]/);
});

test("redacts cookie, authorization, and token fields", () => {
  const line = captureLog({
    cookie: "session=raw-cookie",
    authorization: "Bearer raw-token",
    token: "raw-session-token",
    headers: {
      cookie: "session=nested-cookie",
      authorization: "Bearer nested-token",
    },
  });

  for (const secret of [
    "session=raw-cookie",
    "Bearer raw-token",
    "raw-session-token",
    "session=nested-cookie",
    "Bearer nested-token",
  ]) {
    assert.equal(line.includes(secret), false);
  }
});
