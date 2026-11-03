import Link from "next/link";
import { formatCivilDate, todayInTimezone } from "../../../../lib/dates";
import { displayDecimal } from "../../../../lib/decimal";
import { requireUser } from "../../../../lib/current-user";
import { ArchiveMetric } from "../../../../components/measurements/archive-metric";
import { EntryForm } from "../../../../components/measurements/entry-form";
import { HistoryChart } from "../../../../components/measurements/history-chart";
import { MetricForm } from "../../../../components/measurements/metric-form";
import { resumeMetricAction } from "../../../../modules/measurements/actions";
import { getMetric, listEntries } from "../../../../modules/measurements/queries";
import { listGoalChoices } from "../../../../modules/goals/queries";
import { getSettings } from "../../../../modules/settings/queries";
import { listLifeAreas } from "../../../../modules/tasks/views";

export const instant = false;

export default async function MeasurementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const { id } = await params;
  const settings = await getSettings(user.id);
  const today = todayInTimezone(new Date(), settings.timezone);
  const metric = await getMetric(user.id, id, today);
  if (!metric) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <p>This measurement is not available.</p>
      </div>
    );
  }
  const entries = (await listEntries(user.id, metric.id)) ?? [];
  const areas = await listLifeAreas();
  const goals = await listGoalChoices(user.id);
  const valueLabel = metric.aggregation === "latest" ? "Current" : "This month";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-6 text-neutral-900">
      <p>
        <Link href="/measurements" className="underline">
          Measurements
        </Link>
      </p>
      <h1 className="text-2xl font-semibold">{metric.name}</h1>
      <p>
        {valueLabel}{" "}
        {metric.current ? `${displayDecimal(metric.current)} ${metric.unit}` : "No entries yet"}
        {metric.currentOn ? ` · ${formatCivilDate(metric.currentOn)}` : ""}
      </p>
      {metric.target ? (
        <p>
          Target {displayDecimal(metric.target)} {metric.unit}
        </p>
      ) : null}
      {metric.status === "archived" ? (
        <form action={resumeMetricAction}>
          <input type="hidden" name="metricId" value={metric.id} />
          <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
            Resume
          </button>
        </form>
      ) : (
        <ArchiveMetric metricId={metric.id} name={metric.name} />
      )}
      <section>
        <h2 className="text-lg font-semibold">Entry</h2>
        <div className="mt-3">
          <EntryForm metricId={metric.id} today={today} existingDates={entries.map((entry) => entry.recordedOn)} />
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold">History</h2>
        {entries.length === 0 ? <p className="mt-2">No entries yet.</p> : null}
        {entries.length > 0 ? (
          <>
            <div className="mt-3">
              <HistoryChart points={entries.map((entry) => ({ recordedOn: entry.recordedOn, value: entry.value }))} />
            </div>
            <p className="mt-2 text-sm text-neutral-700">The chart is a sketch. The table is the record.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="mb-2 text-left font-medium">History</caption>
                <thead>
                  <tr>
                    <th scope="col" className="py-2 pr-3">Date</th>
                    <th scope="col" className="py-2 pr-3">Value</th>
                    <th scope="col" className="py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-t border-neutral-200">
                      <td className="py-2 pr-3">{formatCivilDate(entry.recordedOn)}</td>
                      <td className="py-2 pr-3">
                        {displayDecimal(entry.value)} {metric.unit}
                      </td>
                      <td className="py-2">{entry.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
      <section>
        <h2 className="text-lg font-semibold">Definition</h2>
        <div className="mt-3">
          <MetricForm metric={metric} areas={areas} goals={goals} currencyCode={settings.currencyCode} />
        </div>
      </section>
    </div>
  );
}
