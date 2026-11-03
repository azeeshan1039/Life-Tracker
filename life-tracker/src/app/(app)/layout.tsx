import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ShellNav } from "../../components/shell/nav";
import { requireUser, UnauthorizedError } from "../../lib/current-user";

// Authenticated routes stay dynamic and must not use the shared cache for user rows.
// requireUser() waits for the request, then reads the session cookie.
// cacheComponents rejects `export const dynamic`. `instant = false` allows this
// layout to block on that wait instead of prerendering the signed-in shell.
export const instant = false;

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    throw error;
  }

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[auto_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <ShellNav />
      <div id="main" className="pb-24 md:col-start-2 md:row-start-1 md:pb-10">
        {children}
      </div>
    </div>
  );
}
