import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { todayInTimezone } from "../../lib/dates.ts";
import { getAdminClient } from "../../lib/supabase-admin";
import { hashPassword, verifyPassword } from "../auth/password";
import { hashToken } from "../auth/session";
import { changePassword, updateSettings } from "./mutations";
import { getSettings } from "./queries";

test("saved timezone is the value date helpers read", async () => {
  const email = uniqueEmail();
  try {
    const userId = await insertUser(email, "correct-horse-battery");
    const saved = await updateSettings(userId, {
      name: "Owner renamed",
      timezone: "Pacific/Honolulu",
      weekStartsOn: 0,
      currencyCode: "eur",
    });
    assert.equal(saved.ok, true);
    if (!saved.ok) {
      return;
    }

    const stored = await getSettings(userId);
    assert.equal(stored.timezone, "Pacific/Honolulu");
    assert.equal(stored.name, "Owner renamed");
    assert.equal(stored.weekStartsOn, 0);
    assert.equal(stored.currencyCode, "EUR");
    assert.equal(
      todayInTimezone(new Date("2026-06-16T00:30:00.000Z"), stored.timezone),
      "2026-06-15",
    );
  } finally {
    await removeUser(email);
  }
});

test("wrong current password does not change the hash or other sessions", async () => {
  const email = uniqueEmail();
  const password = "correct-horse-battery";
  const currentToken = randomBytes(32).toString("base64url");
  const otherToken = randomBytes(32).toString("base64url");
  try {
    const userId = await insertUser(email, password);
    await insertSession(userId, currentToken);
    await insertSession(userId, otherToken);
    const before = await passwordHash(userId);

    const result = await changePassword({
      userId,
      currentToken,
      currentPassword: "not-the-password",
      newPassword: "a-different-password",
    });
    assert.deepEqual(result, { ok: false, error: "Current password is incorrect." });
    assert.equal(await passwordHash(userId), before);
    assert.equal(await verifyPassword(before, password), true);
    assert.equal(await sessionCount(userId), 2);
  } finally {
    await removeUser(email);
  }
});

test("password change keeps this session and deletes the others", async () => {
  const email = uniqueEmail();
  const password = "correct-horse-battery";
  const nextPassword = "a-different-password";
  const currentToken = randomBytes(32).toString("base64url");
  const otherToken = randomBytes(32).toString("base64url");
  try {
    const userId = await insertUser(email, password);
    await insertSession(userId, currentToken);
    await insertSession(userId, otherToken);

    const result = await changePassword({
      userId,
      currentToken,
      currentPassword: password,
      newPassword: nextPassword,
    });
    assert.deepEqual(result, { ok: true });

    const nextHash = await passwordHash(userId);
    assert.equal(await verifyPassword(nextHash, nextPassword), true);
    assert.equal(await verifyPassword(nextHash, password), false);
    assert.equal(await sessionCount(userId, hashToken(currentToken)), 1);
    assert.equal(await sessionCount(userId, hashToken(otherToken)), 0);
  } finally {
    await removeUser(email);
  }
});

function uniqueEmail(): string {
  return `lt011-${randomBytes(8).toString("hex")}@example.com`;
}

async function insertUser(email: string, password: string): Promise<string> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("users")
    .insert({
      email,
      name: "LT011",
      password_hash: await hashPassword(password),
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  const { error: settingsError } = await supabase.from("user_settings").insert({
    user_id: data.id,
  });
  if (settingsError) {
    throw new Error(settingsError.message);
  }
  return data.id;
}

async function insertSession(userId: string, token: string): Promise<void> {
  const { error } = await getAdminClient().from("sessions").insert({
    user_id: userId,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  });
  if (error) {
    throw new Error(error.message);
  }
}

async function passwordHash(userId: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .select("password_hash")
    .eq("id", userId)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data.password_hash;
}

async function sessionCount(userId: string, tokenHash?: string): Promise<number> {
  let query = getAdminClient()
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (tokenHash) {
    query = query.eq("token_hash", tokenHash);
  }
  const { count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

async function removeUser(email: string): Promise<void> {
  const supabase = getAdminClient();
  await supabase.from("login_attempts").delete().eq("email", email);
  await supabase.from("users").delete().eq("email", email);
}
