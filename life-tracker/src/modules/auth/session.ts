import { createHash, randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "./password";
import { getAdminClient } from "../../lib/supabase-admin";

export const INVALID_LOGIN_MESSAGE = "Email or password is incorrect";
export const FAILURE_LIMIT = 5;
export const FAILURE_WINDOW_MS = 15 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const sessionCookie = {
  name: "__Host-session",
  options: {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  },
};

type LoginResult =
  | { ok: true; token: string }
  | { ok: false; error: typeof INVALID_LOGIN_MESSAGE };

type UserRecord = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
};

let dummyHash: Promise<string> | undefined;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function assertNoError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

async function recentFailureCount(email: string): Promise<number> {
  const since = new Date(Date.now() - FAILURE_WINDOW_MS).toISOString();
  const { count, error } = await getAdminClient()
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .eq("succeeded", false)
    .gte("attempted_at", since);
  assertNoError(error);
  return count ?? 0;
}

async function recordAttempt(email: string, succeeded: boolean): Promise<void> {
  const { error } = await getAdminClient()
    .from("login_attempts")
    .insert({ email, succeeded });
  assertNoError(error);
}

async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const { data, error } = await getAdminClient()
    .from("users")
    .select("id, email, name, password_hash")
    .eq("email", email)
    .maybeSingle();
  assertNoError(error);
  return data;
}

async function verifyAgainstDummy(password: string): Promise<boolean> {
  dummyHash ??= hashPassword("missing-user-timing-pad");
  await verifyPassword(await dummyHash, password);
  return false;
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<LoginResult> {
  const normalized = normalizeEmail(email);
  const failures = await recentFailureCount(normalized);

  if (failures >= FAILURE_LIMIT) {
    await recordAttempt(normalized, false);
    return { ok: false, error: INVALID_LOGIN_MESSAGE };
  }

  const user = await findUserByEmail(normalized);
  const passwordMatches = user
    ? await verifyPassword(user.password_hash, password)
    : await verifyAgainstDummy(password);

  if (!user || !passwordMatches) {
    await recordAttempt(normalized, false);
    return { ok: false, error: INVALID_LOGIN_MESSAGE };
  }

  const token = randomBytes(32).toString("base64url");
  const { error } = await getAdminClient()
    .from("sessions")
    .insert({
      user_id: user.id,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    });
  assertNoError(error);
  await recordAttempt(normalized, true);
  return { ok: true, token };
}

export async function logout(token: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("sessions")
    .delete()
    .eq("token_hash", hashToken(token));
  assertNoError(error);
}

const seenSlideMs = 15 * 60 * 1000;

export async function findValidSession(
  token: string,
): Promise<{ id: string; email: string; name: string } | null> {
  const { data, error } = await getAdminClient()
    .from("sessions")
    .select("id, last_seen_at, users(id, email, name)")
    .eq("token_hash", hashToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  assertNoError(error);
  const user = accountFrom(data?.users);
  if (!data || !user) {
    return null;
  }

  const seenAt = new Date(data.last_seen_at).getTime();
  if (!Number.isFinite(seenAt) || Date.now() - seenAt >= seenSlideMs) {
    const { error: seenError } = await getAdminClient()
      .from("sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", data.id);
    assertNoError(seenError);
  }

  return user;
}

function accountFrom(value: unknown): { id: string; email: string; name: string } | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") {
    return null;
  }
  const record = row as { id?: unknown; email?: unknown; name?: unknown };
  if (typeof record.id !== "string" || typeof record.email !== "string" || typeof record.name !== "string") {
    return null;
  }
  return { id: record.id, email: record.email, name: record.name };
}
