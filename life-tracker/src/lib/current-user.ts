import { cache } from "react";
import { getAdminClient } from "./supabase-admin";
import { findValidSession } from "../modules/auth/session";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export const requireUserFromToken = cache(async (token: string | undefined) => {
  if (!token) {
    throw new UnauthorizedError();
  }
  const user = await findValidSession(token);
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
});

export async function requireUser() {
  ownerPromise ??= loadConfiguredOwner();
  return ownerPromise;
}

let ownerPromise: Promise<{ id: string; email: string; name: string }> | undefined;

async function loadConfiguredOwner() {
  const email = (process.env.LIFE_TRACKER_OWNER_EMAIL ?? process.env.SEED_USER_EMAIL)?.trim().toLowerCase();
  if (!email) {
    throw new Error("LIFE_TRACKER_OWNER_EMAIL is required in trusted single-user mode.");
  }
  const { data, error } = await getAdminClient()
    .from("users")
    .select("id, email, name")
    .eq("email", email)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("The configured owner email does not match a user.");
  }
  return data;
}
