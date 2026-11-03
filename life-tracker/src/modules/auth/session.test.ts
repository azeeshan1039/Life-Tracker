import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getAdminClient } from "../../lib/supabase-admin";
import { requireUserFromToken, UnauthorizedError } from "../../lib/current-user";
import { hashPassword } from "./password";
import {
  findValidSession,
  hashToken,
  INVALID_LOGIN_MESSAGE,
  loginWithPassword,
  logout,
  sessionCookie,
} from "./session";

test("session cookie is host-only", () => {
  assert.equal(sessionCookie.name, "__Host-session");
  assert.equal(sessionCookie.options.httpOnly, true);
  assert.equal(sessionCookie.options.secure, true);
  assert.equal(sessionCookie.options.sameSite, "lax");
  assert.equal(sessionCookie.options.path, "/");
  assert.equal("domain" in sessionCookie.options, false);
});

test("wrong password and missing user return the same error", async () => {
  const email = uniqueEmail();
  const missingEmail = uniqueEmail();
  const password = "correct-horse-battery";
  try {
    await insertUser(email, password);
    const missing = await loginWithPassword(missingEmail, password);
    const wrong = await loginWithPassword(email, "not-the-password");
    assert.deepEqual(missing, { ok: false, error: INVALID_LOGIN_MESSAGE });
    assert.deepEqual(wrong, missing);
  } finally {
    await removeUser(email);
    await removeUser(missingEmail);
  }
});

test("sixth failure inside 15 minutes does not accept the real password", async () => {
  const email = uniqueEmail();
  const password = "correct-horse-battery";
  try {
    await insertUser(email, password);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await loginWithPassword(email, "not-the-password");
      assert.deepEqual(result, { ok: false, error: INVALID_LOGIN_MESSAGE });
    }

    const locked = await loginWithPassword(email, password);
    assert.deepEqual(locked, { ok: false, error: INVALID_LOGIN_MESSAGE });

    const { count, error } = await getAdminClient()
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", await userId(email));
    assert.equal(error, null);
    assert.equal(count, 0);
  } finally {
    await removeUser(email);
  }
});

test("logout deletes the session row", async () => {
  const email = uniqueEmail();
  const password = "correct-horse-battery";
  try {
    await insertUser(email, password);
    const result = await loginWithPassword(email, password);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    const user = await findValidSession(result.token);
    assert.equal(user?.email, email);

    await logout(result.token);
    assert.equal(await findValidSession(result.token), null);

    const { count, error } = await getAdminClient()
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("token_hash", hashToken(result.token));
    assert.equal(error, null);
    assert.equal(count, 0);
  } finally {
    await removeUser(email);
  }
});

test("an expired session is rejected", async () => {
  const email = uniqueEmail();
  const token = randomBytes(32).toString("base64url");
  try {
    await insertUser(email, "correct-horse-battery");
    const id = await userId(email);
    const { error } = await getAdminClient().from("sessions").insert({
      user_id: id,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
    assert.equal(error, null);

    await assert.rejects(
      () => requireUserFromToken(token),
      (caught: unknown) => caught instanceof UnauthorizedError,
    );
    await assert.rejects(() => requireUserFromToken(undefined), UnauthorizedError);
  } finally {
    await removeUser(email);
  }
});

function uniqueEmail(): string {
  return `lt007-${randomBytes(8).toString("hex")}@example.com`;
}

async function insertUser(email: string, password: string): Promise<void> {
  const { error } = await getAdminClient().from("users").insert({
    email,
    name: "LT007",
    password_hash: await hashPassword(password),
  });
  if (error) {
    throw new Error(error.message);
  }
}

async function userId(email: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .select("id")
    .eq("email", email)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data.id;
}

async function removeUser(email: string): Promise<void> {
  const supabase = getAdminClient();
  await supabase.from("login_attempts").delete().eq("email", email);
  await supabase.from("users").delete().eq("email", email);
}
