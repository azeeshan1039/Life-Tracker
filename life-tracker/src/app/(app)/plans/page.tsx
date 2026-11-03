import Link from "next/link";
import { formatCivilDate, todayInTimezone } from "../../../lib/dates";
import { requireUser } from "../../../lib/current-user";
import { createPlanAction } from "../../../modules/planning/actions";
import { PLAN_STATUSES, type PlanStatus } from "../../../modules/planning/mutations";
import { listPlans } from "../../../modules/planning/queries";
import { getSettings } from "../../../modules/settings/queries";
import { listLifeAreas } from "../../../modules/tasks/views";

export const instant = false;

export default async function PlansPage({
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
  const settings = await getSettings(user.id);
  const areas = await listLifeAreas();
  const plans = (await listPlans(user.id)).filter((plan) => {
    if (status && plan.status !== status) {
      return false;
    }
    if (area !== null && !plan.areas.some((item) => item.id === area)) {
      return false;
    }
    return true;
  });

  return (
    <div className="has-capture-dock mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8 text-neutral-900 sm:px-6">
      <h1 className="text-3xl font-semibold">Planning</h1>
      {first(params.error) ? <p className="text-sm text-red-700">{first(params.error)}</p> : null}
      <form action={createPlanAction} className="capture-dock flex flex-col gap-2">
        <label htmlFor="plan-title" className="text-sm font-medium">
          New idea
        </label>
        <div className="flex items-center gap-2">
          <input id="plan-title" name="title" required className="min-h-11 min-w-0 flex-1 rounded border border-neutral-300 px-3 py-2" />
          <button type="submit" className="min-h-11 rounded bg-neutral-900 px-3 py-2 text-white">
            Add
          </button>
        </div>
      </form>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select name="status" defaultValue={status ?? ""} className="min-h-11 rounded border border-neutral-300 px-3 py-2">
            <option value="">All</option>
            {PLAN_STATUSES.map((item) => (
              <option key={item} value={item}>
                {labelStatus(item)}
              </option>
            ))}
          </select>
        </label>
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
      {plans.length === 0 ? <p>No plans yet.</p> : null}
      {PLAN_STATUSES.map((item) => {
        const group = plans.filter((plan) => plan.status === item);
        if (group.length === 0) {
          return null;
        }
        return (
          <section key={item}>
            <h2 className="text-lg font-semibold">{labelStatus(item)}</h2>
            <ul className="mt-2 flex flex-col gap-3">
              {group.map((plan) => (
                <li key={plan.id} className="rounded border border-neutral-200 px-3 py-3">
                  <p className="font-medium">
                    <Link href={`/plans/${plan.id}`} className="underline">
                      {plan.title}
                    </Link>
                  </p>
                  <p className="text-sm text-neutral-700">
                    {labelStatus(plan.status)}
                    {plan.areas.length > 0 ? ` · ${plan.areas.map((areaItem) => areaItem.name).join(", ")}` : ""}
                    {` · ${formatCivilDate(todayInTimezone(new Date(plan.updatedAt), settings.timezone))}`}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function parseStatus(value: string | undefined): PlanStatus | null {
  if (value && PLAN_STATUSES.includes(value as PlanStatus)) {
    return value as PlanStatus;
  }
  return null;
}

function parseArea(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const area = Number(value);
  return Number.isInteger(area) && area > 0 ? area : null;
}

function labelStatus(status: PlanStatus): string {
  return status.slice(0, 1).toUpperCase() + status.slice(1);
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
