import type { Metadata } from "next";
import { LoginForm } from "../../../components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="login-card">
        <p className="eyebrow">Life Tracker</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-[#6f675f]">Pick up today&apos;s habits, tasks, and notes.</p>
        <LoginForm />
      </div>
    </main>
  );
}
