import type { ReactNode } from "react";

export function Icon({ name }: { name: string }) {
  const path = paths[name] ?? paths.dot;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {path}
    </svg>
  );
}

const paths: Record<string, ReactNode> = {
  today: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" strokeLinecap="round" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
  tasks: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m8 12 2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" strokeLinecap="round" />
    </>
  ),
  areas: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4c2 2.2 3 4.8 3 8s-1 5.8-3 8c-2-2.2-3-4.8-3-8s1-5.8 3-8ZM4 12h16" strokeLinecap="round" />
    </>
  ),
  goals: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  projects: (
    <>
      <path d="M3.5 8.5h6l2 2h9v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-8.5a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
    </>
  ),
  habits: (
    <>
      <path d="M4 12a8 8 0 0 1 13.5-5.8M20 12a8 8 0 0 1-13.5 5.8" strokeLinecap="round" />
      <path d="M16 4h3.5V7.5M8 20H4.5V16.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  measurements: (
    <>
      <path d="M4 16.5 9 8l4 6 2.5-3.5L20 16.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 19.5h16" strokeLinecap="round" />
    </>
  ),
  plans: (
    <>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3 11c.4.5.8 1.1 1 2h4c.2-.9.6-1.5 1-2A6 6 0 0 0 12 3Z" strokeLinejoin="round" />
    </>
  ),
  reviews: (
    <>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5Z" strokeLinejoin="round" />
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 8H19" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" strokeLinecap="round" />
    </>
  ),
  more: (
    <>
      <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  logout: <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h7A1.5 1.5 0 0 1 19 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 9 18.5V17M4 12h10M11 9l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />,
  dot: <circle cx="12" cy="12" r="3" />,
};
