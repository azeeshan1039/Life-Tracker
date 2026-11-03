import { cache } from "react";
import { cookies } from "next/headers";
import { findValidSession, sessionCookie } from "../modules/auth/session";

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
  // cacheComponents prerenders this layout. The session expiry check reads the
  // clock, which Next rejects until rendering waits for the real request.
  const { connection } = await import("next/server");
  await connection();
  const cookieStore = await cookies();
  return requireUserFromToken(cookieStore.get(sessionCookie.name)?.value);
}
