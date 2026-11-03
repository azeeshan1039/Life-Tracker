"use client";

import { useActionState } from "react";
import {
  loginAction,
  type LoginFormState,
} from "../../modules/auth/actions";

const initialState: LoginFormState = {
  error: "",
  email: "",
  attempt: 0,
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          key={`email-${state.attempt}`}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          key={`password-${state.attempt}`}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-1 min-h-11 rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
