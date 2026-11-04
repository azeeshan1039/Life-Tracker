import type { ReactNode } from "react";
import { ShellNav } from "../../components/shell/nav";

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
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
