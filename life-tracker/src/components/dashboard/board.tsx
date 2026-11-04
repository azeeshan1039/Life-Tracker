import Link from "next/link";
import { formatCivilDate } from "../../lib/dates";
import { TodayHabits } from "../habits/today-habits";
import { TaskLine } from "../tasks/task-line";
import { EmptyState } from "../ui/empty-state";
import type { DashboardData, WidgetId } from "../../modules/dashboard/queries";

const widgetLinks: Record<WidgetId, { href: string; label: string }> = {
  today: { href: "/today", label: "Today" },
  habits: { href: "/habits", label: "Habits" },
  upcoming: { href: "/calendar", label: "Upcoming" },
  pinned_goals: { href: "/goals", label: "Pinned goals" },
  inbox: { href: "/tasks?view=inbox", label: "Inbox" },
};

export function DashboardBoard({ data }: { data: DashboardData }) {
  const activeCount =
    data.today.scheduled + data.today.due + data.today.overdue + data.today.habitsOpen + data.upcoming.tasks.length;
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 text-neutral-900 sm:px-6">
      <header className="page-hero progress-hero">
        <div>
          <p className="eyebrow">Progress</p>
          <h1 className="mt-1 text-3xl font-semibold">Your week at a glance</h1>
          <p className="mt-2 text-sm text-neutral-700">Keep momentum visible without turning every day into a score.</p>
        </div>
        <div className="progress-signal">
          <span className="stat-value">{activeCount}</span>
          <span className="stat-label">active items in view</span>
        </div>
      </header>
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
  const counts: Array<[number, string]> = [
    [data.today.scheduled, "scheduled"],
    [data.today.due, "due"],
    [data.today.overdue, "overdue"],
    [data.today.habitsOpen, data.today.habitsOpen === 1 ? "habit still open" : "habits still open"],
  ];
  const visibleCounts = counts.filter(([count]) => count > 0);
  return (
    <section className="widget">
      <WidgetHeading id="today" />
      {visibleCounts.length > 0 ? (
        <ul className="stat-grid">
          {visibleCounts.map(([count, label]) => (
            <li key={label}>
              <span className="stat-value">{count}</span>
              <span className="stat-label">{label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3">
          <EmptyState
            title="Nothing needs attention today"
            description="Your day is clear. Plan something meaningful or leave the space open."
            href="/today"
            action="Open Today"
          />
        </div>
      )}
    </section>
  );
}

function HabitsWidget({ data }: { data: DashboardData }) {
  const empty = data.habits.due.length === 0 && data.habits.weeklyMet.length === 0;
  return (
    <section className="widget widget-wide">
      <WidgetHeading id="habits" />
      {empty ? (
        <div className="mt-3">
          <EmptyState
            title="No habit check-ins due"
            description="Create a small repeatable action when you are ready to build consistency."
            href="/habits"
            action="Explore habits"
          />
        </div>
      ) : (
        <TodayHabits today={data.civilDate} due={data.habits.due} weeklyMet={data.habits.weeklyMet} heading={false} />
      )}
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
      {empty ? (
        <div className="mt-3">
          <EmptyState
            title="The next seven days are open"
            description="Schedule a task or add a project milestone when a commitment becomes real."
            href="/calendar"
            action="Open calendar"
          />
        </div>
      ) : null}
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
      {data.pinMessage ? (
        <div className="mt-3">
          <EmptyState
            title="Choose a goal to keep visible"
            description="Pin up to three active goals from settings, or keep this space intentionally quiet."
            href="/settings"
            action="Choose goals"
          />
        </div>
      ) : null}
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
      <p className="mt-3 text-3xl font-semibold">{data.inbox}</p>
      <p className="mt-1 text-sm text-neutral-700">
        {data.inbox === 1 ? "idea waiting to be planned" : "ideas waiting to be planned"}
      </p>
      <Link href="/tasks?view=inbox" className="mt-3 inline-flex underline">
        Review inbox
      </Link>
    </section>
  );
}

function labelStatus(status: string): string {
  return status.slice(0, 1).toUpperCase() + status.slice(1);
}
