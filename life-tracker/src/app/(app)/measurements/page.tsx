import Link from "next/link";
import { formatCivilDate, todayInTimezone } from "../../../lib/dates";
import { displayDecimal } from "../../../lib/decimal";
import { requireUser } from "../../../lib/current-user";
import { MetricForm } from "../../../components/measurements/metric-form";
import { createSuggestionAction } from "../../../modules/measurements/actions";
import { WEALTH_SUGGESTIONS } from "../../../modules/measurements/mutations";
import { listMetrics, loadNetWorth, type MetricListItem, type NetWorthRow, type NetWorthView } from "../../../modules/measurements/queries";
import { listGoalChoices } from "../../../modules/goals/queries";
import { getSettings } from "../../../modules/settings/queries";
import { listLifeAreas } from "../../../modules/tasks/views";

export const instant = false;

const filters = ["active", "archived"] as const;
const kindOrder = ["asset", "liability", "income", "expense", "general"] as const;

export default async function MeasurementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const params = await searchParams;
  const status = first(params.status) === "archived" ? "archived" : "active";
  const area = parseArea(first(params.area));
  const presetGoalId = first(params.goal) ?? "";
  const settings = await getSettings(user.id);
  const today = todayInTimezone(new Date(), settings.timezone);
  const [metricRows, netWorth, areas, goals] = await Promise.all([
    listMetrics(user.id, status, today),
    status === "active"
      ? loadNetWorth(user.id, today)
      : Promise.resolve<NetWorthView>({ outcome: "missing_assets", rows: [] }),
    listLifeAreas(),
    listGoalChoices(user.id),
  ]);
  const metrics = metricRows.filter((metric) => area === null || metric.lifeAreaId === area);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6 text-neutral-900">
      <h1 className="text-2xl font-semibold">Measurements</h1>
      <nav aria-label="Measurement status" className="flex gap-2">
        {filters.map((item) => (
          <Link
            key={item}
            href={measurementHref(item, area)}
            aria-current={item === status ? "page" : undefined}
            className={`min-h-11 rounded border border-neutral-300 px-3 py-2 ${item === status ? "font-semibold" : ""}`}
          >
            {item === "active" ? "Active" : "Archived"}
          </Link>
        ))}
      </nav>
      {status === "active" ? <NetWorthBlock netWorth={netWorth} /> : null}
      {status === "active" && metrics.length === 0 && area === null ? <EmptyMeasurements /> : null}
      {status === "active" && metrics.length === 0 && area !== null ? <p>No measurements in this area.</p> : null}
      {status === "active" ? (
        <section>
          <h2 className="text-lg font-semibold">New measurement</h2>
          <div className="mt-3">
            <MetricForm
              metric={null}
              areas={areas}
              goals={goals}
              currencyCode={settings.currencyCode}
              presetGoalId={presetGoalId}
              presetAreaId={area}
            />
          </div>
        </section>
      ) : null}
      {metrics.length === 0 && status === "archived" ? <p>No archived measurements.</p> : null}
      {kindOrder.map((kind) => {
        const group = metrics.filter((metric) => metric.kind === kind);
        if (group.length === 0) {
          return null;
        }
        return (
          <section key={kind}>
            <h2 className="text-lg font-semibold">{kindLabel(kind)}</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {group.map((metric) => (
                <li key={metric.id} className="rounded border border-neutral-200 px-3 py-3">
                  <MetricRow metric={metric} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function EmptyMeasurements() {
  return (
    <section className="flex flex-col gap-3">
      <p>
        A snapshot is one number for a date, such as a balance or a weight. The current value is the latest date on or before today. An amount in a period, such as income or spending, adds the entries you type. Nothing is created until you add a measurement.
      </p>
      <p>Nothing here is a forecast.</p>
      <div className="flex flex-wrap gap-2">
        {WEALTH_SUGGESTIONS.map((suggestion) => (
          <form key={suggestion.key} action={createSuggestionAction}>
            <input type="hidden" name="suggestion" value={suggestion.key} />
            <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
              {suggestion.name}
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}

function NetWorthBlock({ netWorth }: { netWorth: NetWorthView }) {
  const groups = new Map<string, NetWorthRow[]>();
  for (const row of netWorth.rows) {
    const list = groups.get(row.unit) ?? [];
    list.push(row);
    groups.set(row.unit, list);
  }

  return (
    <section className="rounded border border-neutral-200 px-3 py-3">
      <h2 className="text-lg font-semibold">Net worth</h2>
      <p className="mt-2">{netWorthMessage(netWorth)}</p>
      {netWorth.outcome === "total" ? (
        <p className="mt-2 font-medium">
          {displayDecimal(netWorth.total)} {netWorth.unit}
        </p>
      ) : null}
      {netWorth.outcome === "mixed_units"
        ? [...groups.entries()].map(([unit, rows]) => (
            <div key={unit} className="mt-3">
              <h3 className="font-medium">{unit}</h3>
              <BalanceList rows={rows} />
            </div>
          ))
        : <BalanceList rows={netWorth.rows} />}
    </section>
  );
}

function BalanceList({ rows }: { rows: NetWorthRow[] }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <ul className="mt-2 flex flex-col gap-1 text-sm">
      {rows.map((row) => (
        <li key={row.id}>
          {row.name}: {displayDecimal(row.value)} {row.unit} ({row.kind})
        </li>
      ))}
    </ul>
  );
}

function MetricRow({ metric }: { metric: MetricListItem }) {
  const label = metric.aggregation === "latest" ? "Current" : "This month";
  return (
    <>
      <p className="font-medium">
        <Link href={`/measurements/${metric.id}`} className="underline">
          {metric.name}
        </Link>
      </p>
      <p className="text-sm text-neutral-700">
        {label}{" "}
        {metric.displayValue ? `${displayDecimal(metric.displayValue)} ${metric.unit}` : "No entries yet"}
      </p>
      {metric.displayOn ? <p className="text-sm">{formatCivilDate(metric.displayOn)}</p> : null}
    </>
  );
}

function netWorthMessage(netWorth: NetWorthView): string {
  if (netWorth.outcome === "total") {
    return "Assets minus liabilities, in one unit.";
  }
  if (netWorth.outcome === "mixed_units") {
    return "These balances use more than one unit, so they are not combined.";
  }
  if (netWorth.outcome === "missing_liabilities") {
    return "Liabilities are missing, so there is no net worth total. A missing liability is not zero.";
  }
  if (netWorth.rows.length === 0) {
    return "Assets and liabilities are missing, so there is no net worth total.";
  }
  return "Assets are missing, so there is no net worth total.";
}

function measurementHref(status: "active" | "archived", area: number | null): string {
  const params = new URLSearchParams();
  if (status !== "active") {
    params.set("status", status);
  }
  if (area !== null) {
    params.set("area", String(area));
  }
  const query = params.toString();
  return query === "" ? "/measurements" : `/measurements?${query}`;
}

function parseArea(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const area = Number(value);
  return Number.isInteger(area) && area > 0 ? area : null;
}

function kindLabel(kind: (typeof kindOrder)[number]): string {
  if (kind === "asset") return "Assets";
  if (kind === "liability") return "Liabilities";
  if (kind === "income") return "Income";
  if (kind === "expense") return "Expenses";
  return "General";
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
