"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  INVALID_LOGIN_MESSAGE,
  loginWithPassword,
  logout,
  sessionCookie,
} from "./session";

export type LoginFormState = {
  error: string;
  email: string;
  attempt: number;
};

export async function loginAction(
  previous: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await loginWithPassword(email, password);
  if (!result.ok) {
    return {
      error: INVALID_LOGIN_MESSAGE,
      email,
      attempt: previous.attempt + 1,
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookie.name, result.token, sessionCookie.options);
  redirect("/today");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie.name)?.value;
  if (token) {
    await logout(token);
  }
  cookieStore.set(sessionCookie.name, "", {
    ...sessionCookie.options,
    maxAge: 0,
  });
  redirect("/login");
}
