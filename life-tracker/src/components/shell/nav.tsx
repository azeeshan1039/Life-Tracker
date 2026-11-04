"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./icons";

const mainLinks = [
  { href: "/today", label: "Today", icon: "today" },
  { href: "/tasks", label: "Tasks", icon: "tasks" },
  { href: "/plans", label: "Planning", icon: "plans" },
  { href: "/progress", label: "Progress", icon: "progress" },
];

const moreLinks = [
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/areas", label: "Life areas", icon: "areas" },
  { href: "/habits", label: "Habits", icon: "habits" },
  { href: "/goals", label: "Goals", icon: "goals" },
  { href: "/projects", label: "Projects", icon: "projects" },
  { href: "/measurements", label: "Measurements", icon: "measurements" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

const phoneLinks = [
  { href: "/today", label: "Today", icon: "today" },
  { href: "/tasks", label: "Tasks", icon: "tasks" },
  { href: "/plans", label: "Plan", icon: "plans" },
  { href: "/progress", label: "Progress", icon: "progress" },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon,
  showLabel,
}: {
  href: string;
  label: string;
  icon?: string;
  showLabel: boolean;
}) {
  const pathname = usePathname();
  const current = isCurrent(pathname, href);
  return (
    <Link href={href} aria-current={current ? "page" : undefined} className="shell-link" title={label}>
      {icon ? <Icon name={icon} /> : <span className="ml-5 size-1.5 rounded-full bg-current opacity-50" />}
      <span className={showLabel ? "inline" : "sr-only lg:not-sr-only lg:inline"}>{label}</span>
    </Link>
  );
}

export function ShellNav() {
  const [showLabels, setShowLabels] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const moreCurrent = moreLinks.some((link) => isCurrent(pathname, link.href));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-dvh flex-col border-r border-[#e5dfd4] bg-[#f7f4ef]/95 text-[#1c1915] backdrop-blur md:col-start-1 md:row-start-1 md:flex ${showLabels ? "md:w-72" : "md:w-[4.6rem] lg:w-72"}`}
      >
        <div className="flex items-center gap-2 px-3 py-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#0f6e56] text-sm font-bold text-white">L</span>
          <div className={showLabels ? "min-w-0" : "sr-only lg:not-sr-only lg:block lg:min-w-0"}>
            <p className="truncate text-sm font-bold tracking-tight">Life Tracker</p>
            <p className="truncate text-xs text-[#6f675f]">Today, plans, and records</p>
          </div>
        </div>
        <nav aria-label="Primary" className="flex min-h-0 flex-1 flex-col px-2">
          <button
            type="button"
            className="mb-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-[#6f675f] hover:bg-white md:inline lg:hidden"
            aria-pressed={showLabels}
            onClick={() => setShowLabels((open) => !open)}
          >
            {showLabels ? "Hide labels" : "Show labels"}
          </button>
          <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pb-3">
            {mainLinks.map((link) => (
              <li key={link.href}>
                <NavLink href={link.href} label={link.label} icon={link.icon} showLabel={showLabels} />
              </li>
            ))}
            <li>
              <button
                type="button"
                className="shell-link w-full text-left"
                aria-expanded={moreOpen}
                aria-current={moreCurrent ? "page" : undefined}
                onClick={() => setMoreOpen((open) => !open)}
              >
                <Icon name="more" />
                <span className={showLabels ? "inline" : "sr-only lg:not-sr-only lg:inline"}>More</span>
              </button>
              {moreOpen || moreCurrent ? (
                <ul className={`shell-sub mt-1 space-y-0.5 pl-2 ${showLabels ? "" : "hidden lg:block"}`}>
                  {moreLinks.map((link) => (
                    <li key={link.href}>
                      <NavLink href={link.href} label={link.label} icon={link.icon} showLabel={showLabels} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          </ul>
        </nav>
      </aside>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-[#e5dfd4] bg-[#f3f0ea]/90 px-4 py-3 backdrop-blur md:hidden">
        <span className="grid size-8 place-items-center rounded-lg bg-[#0f6e56] text-sm font-bold text-white">L</span>
        <p className="text-sm font-bold tracking-tight">Life Tracker</p>
      </header>
      {moreOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-10 bg-[#1c1915]/30 md:hidden"
          aria-label="Close menu"
          onClick={() => setMoreOpen(false)}
        />
      ) : null}
      <nav
        aria-label="Primary mobile"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e5dfd4] bg-[#fffcf8]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {moreOpen ? (
          <ul className="max-h-[60dvh] overflow-y-auto border-b border-[#e5dfd4] p-2">
            {moreLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
                  className="shell-link"
                  onClick={() => setMoreOpen(false)}
                >
                  <Icon name={link.icon} />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <ul className="grid grid-cols-5">
          {phoneLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
                className="tab-link"
              >
                <Icon name={link.icon} />
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="tab-link w-full"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((open) => !open)}
            >
              <Icon name="more" />
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
