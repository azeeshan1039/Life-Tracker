import Link from "next/link";
import { formatCivilDate } from "../../lib/dates";
import { TodayHabits } from "../habits/today-habits";
import { CaptureForm } from "../tasks/capture-form";
import { TaskLine } from "../tasks/task-line";
import { inboxLabel } from "../../modules/tasks/day-summary";
import type { DashboardData, WidgetId } from "../../modules/dashboard/queries";

const widgetLinks: Record<WidgetId, { href: string; label: string }> = {
  today: { href: "/today", label: "Today" },
  habits: { href: "/habits", label: "Habits" },
  upcoming: { href: "/calendar", label: "Upcoming" },
  pinned_goals: { href: "/goals", label: "Pinned goals" },
  inbox: { href: "/tasks?view=inbox", label: "Inbox" },
};

export function DashboardBoard({ data }: { data: DashboardData }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 text-neutral-900 sm:px-6">
      <div>
        <p className="eyebrow">Overview</p>
        <h1 className="mt-1 text-3xl font-semibold">Dashboard</h1>
      </div>
      <div className="dashboard-grid">
        {data.visible.map((widget) => {
          if (widget === "today") return <TodayWidget key={widget} data={data} />;
          if (widget === "habits") return <HabitsWidget key={widget} data={data} />;
          if (widget === "upcoming") return <UpcomingWidget key={widget} data={data} />;
          if (widget === "pinned_goals") return <PinnedWidget key={widget} data={data} />;
          return <InboxWidget key={widget} data={data} />;
        })}
      </div>
    </div>
  );
}

function WidgetHeading({ id }: { id: WidgetId }) {
  const link = widgetLinks[id];
  return (
    <h2 className="text-lg font-semibold">
      <Link href={link.href} className="underline">
        {link.label}
      </Link>
    </h2>
  );
}

function TodayWidget({ data }: { data: DashboardData }) {
  const counts = [
    [data.today.scheduled, "scheduled"],
    [data.today.due, "due"],
    [data.today.overdue, "overdue"],
    [data.today.habitsOpen, data.today.habitsOpen === 1 ? "habit still open" : "habits still open"],
  ] as const;
  return (
    <section className="widget">
      <WidgetHeading id="today" />
      <ul className="stat-grid">
        {counts.map(([count, label]) => (
          <li key={label}>
            <span className="stat-value">{count}</span>
            <span className="stat-label">{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HabitsWidget({ data }: { data: DashboardData }) {
  const empty = data.habits.due.length === 0 && data.habits.weeklyMet.length === 0;
  return (
    <section className="widget widget-wide">
      <WidgetHeading id="habits" />
      {empty ? <p className="mt-2">No habits due today.</p> : null}
      <TodayHabits today={data.civilDate} due={data.habits.due} weeklyMet={data.habits.weeklyMet} heading={false} />
    </section>
  );
}

function UpcomingWidget({ data }: { data: DashboardData }) {
  const empty = data.upcoming.tasks.length === 0 && data.upcoming.milestones.length === 0;
  const rows = [
    ...data.upcoming.tasks.map((item) => ({ kind: "task" as const, date: item.date, task: item.task })),
    ...data.upcoming.milestones.map((item) => ({ kind: "milestone" as const, date: item.targetDate, milestone: item })),
  ].sort((left, right) => left.date.localeCompare(right.date));
  return (
    <section className="widget stack">
      <WidgetHeading id="upcoming" />
      {empty ? <p className="mt-2">Nothing dated in the next seven days.</p> : null}
      <ul className="mt-2 flex flex-col gap-2">
        {rows.map((row) =>
          row.kind === "task" ? (
            <TaskLine key={row.task.id} task={row.task} />
          ) : (
            <li key={row.milestone.id} className="rounded border border-neutral-200 px-3 py-3">
              <p className="font-medium">
                <Link href={`/projects/${row.milestone.projectId}`} className="underline">
                  {row.milestone.title}
                </Link>
              </p>
              <p className="text-sm text-neutral-700">
                Milestone · {row.milestone.projectTitle} · {formatCivilDate(row.milestone.targetDate)}
              </p>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

function PinnedWidget({ data }: { data: DashboardData }) {
  return (
    <section className="widget">
      <WidgetHeading id="pinned_goals" />
      {data.pinMessage ? <p className="mt-2">{data.pinMessage}</p> : null}
      <ul className="mt-2 flex flex-col gap-3">
        {data.pins.map((goal) => (
          <li key={goal.id} className="rounded border border-neutral-200 px-3 py-3">
            <p className="font-medium">
              <Link href={`/goals/${goal.id}`} className="underline">
                {goal.title}
              </Link>
            </p>
            <p className="text-sm text-neutral-700">
              {labelStatus(goal.status)}
              {goal.targetDate ? ` · ${formatCivilDate(goal.targetDate)}` : ""}
            </p>
            {goal.lines.map((line) => (
              <p key={line} className="text-sm">
                {line}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}

function InboxWidget({ data }: { data: DashboardData }) {
  return (
    <section className="widget">
      <WidgetHeading id="inbox" />
      <p className="mt-2">
        <Link href="/tasks?view=inbox" className="underline">
          {inboxLabel(data.inbox)}
        </Link>
      </p>
      <div className="mt-3">
        <CaptureForm />
      </div>
    </section>
  );
}

function labelStatus(status: string): string {
  return status.slice(0, 1).toUpperCase() + status.slice(1);
}
