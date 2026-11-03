import Link from "next/link";
import { formatCivilDate, todayInTimezone } from "../../../lib/dates";
import { displayDecimal } from "../../../lib/decimal";
import { requireUser } from "../../../lib/current-user";
import { ArchiveGoal } from "../../../components/goals/archive-goal";
import { GoalForm } from "../../../components/goals/goal-form";
import { listGoals } from "../../../modules/goals/queries";
import type { WorkStatus } from "../../../modules/goals/goal-mutations";
import { listGoalMeasurements, type GoalMeasurementSummary } from "../../../modules/measurements/queries";
import { getSettings } from "../../../modules/settings/queries";
import { listLifeAreas } from "../../../modules/tasks/views";

export const instant = false;

const filters = ["active", "paused", "completed", "archived"] as const;

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const params = await searchParams;
  const status = parseStatus(first(params.status));
  const area = parseArea(first(params.area));
  const areas = await listLifeAreas();
  const goals = await listGoals(user.id, status, area);
  const settings = await getSettings(user.id);
  const today = todayInTimezone(new Date(), settings.timezone);
  const measurements = new Map((await listGoalMeasurements(user.id, today)).map((item) => [item.goalId, item]));
  const areaName = new Map(areas.map((item) => [item.id, item.name]));

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6 text-neutral-900">
      <h1 className="text-2xl font-semibold">Goals</h1>
      <nav aria-label="Goal status" className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <Link
            key={item}
            href={statusHref(item, area)}
            aria-current={item === status ? "page" : undefined}
            className={`min-h-11 rounded border border-neutral-300 px-3 py-2 ${item === status ? "font-semibold" : ""}`}
          >
            {labelFor(item)}
          </Link>
        ))}
      </nav>
      <form method="get" className="flex flex-wrap items-end gap-2">
        {status !== "active" ? <input type="hidden" name="status" value={status} /> : null}
        <label className="flex flex-col gap-1 text-sm">
          Area
          <select name="area" defaultValue={area === null ? "" : String(area)} className="min-h-11 rounded border border-neutral-300 px-3 py-2">
            <option value="">All areas</option>
            {areas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
          Filter
        </button>
      </form>
      {status === "active" ? (
        <section>
          <h2 className="text-lg font-semibold">New goal</h2>
          <div className="mt-3">
            <GoalForm goal={null} areas={areas} presetAreaId={area} />
          </div>
        </section>
      ) : null}
      {goals.length === 0 ? <p>No goals yet.</p> : null}
      <ul className="flex flex-col gap-3">
        {goals.map((goal) => (
          <li key={goal.id} className="rounded border border-neutral-200 px-3 py-3">
            <p className="font-medium">
              <Link href={`/goals/${goal.id}`} className="underline">
                {goal.title}
              </Link>
            </p>
            <p className="text-sm text-neutral-700">
              {goal.lifeAreaId ? areaName.get(goal.lifeAreaId) : "No area"}
              {goal.targetDate ? ` · ${formatCivilDate(goal.targetDate)}` : ""}
            </p>
            <p className="text-sm">{measurementLabel(measurements.get(goal.id))}</p>
            {goal.status === "active" ? (
              <div className="mt-2">
                <ArchiveGoal goalId={goal.id} title={goal.title} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function statusHref(status: WorkStatus, area: number | null): string {
  const params = new URLSearchParams();
  if (status !== "active") {
    params.set("status", status);
  }
  if (area !== null) {
    params.set("area", String(area));
  }
  const query = params.toString();
  return query ? `/goals?${query}` : "/goals";
}

function parseStatus(value: string | undefined): WorkStatus {
  if (value === "paused" || value === "completed" || value === "archived") {
    return value;
  }
  return "active";
}

function parseArea(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }
  return Number(value);
}

function labelFor(status: WorkStatus): string {
  return status.slice(0, 1).toUpperCase() + status.slice(1);
}

function measurementLabel(summary: GoalMeasurementSummary | undefined): string {
  if (!summary?.current) {
    return "No measurement";
  }
  return `${displayDecimal(summary.current)} ${summary.unit}`;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
