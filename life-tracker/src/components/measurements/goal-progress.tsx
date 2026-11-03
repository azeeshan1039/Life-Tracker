import Link from "next/link";
import type { ReactNode } from "react";
import { formatCivilDate } from "../../lib/dates";
import { displayDecimal } from "../../lib/decimal";
import { progressLines } from "../../modules/measurements/derive";
import type { GoalMeasurement } from "../../modules/measurements/queries";

export function GoalProgressView({
  measurement,
  goalId,
  children,
}: {
  measurement: GoalMeasurement;
  goalId: string;
  children?: ReactNode;
}) {
  const unit = measurement.metric?.unit ?? "";
  const showCurrentOnly = measurement.progress.mode === "missing" && Boolean(measurement.metric?.current);
  const lines = showCurrentOnly ? [] : progressLines(measurement.progress, unit);

  return (
    <section>
      <h2 className="text-lg font-semibold">Measurement</h2>
      {measurement.metric ? <p className="mt-2">{measurement.metric.name}</p> : null}
      {showCurrentOnly && measurement.metric?.current ? (
        <p className="mt-2">
          Current {displayDecimal(measurement.metric.current)} {unit}
          {measurement.metric.currentOn ? ` on ${formatCivilDate(measurement.metric.currentOn)}` : ""}
        </p>
      ) : null}
      {lines.map((line, index) => (
        <p key={`${index}-${line}`} className="mt-2">
          {line}
        </p>
      ))}
      {measurement.progress.mode === "bar" ? (
        <div
          className="mt-3 h-2 w-full bg-neutral-200"
          role="img"
          aria-label={`${measurement.progress.percentText} percent`}
        >
          <div className="h-2 bg-neutral-900" style={{ width: `${measurement.progress.barPercent}%` }} />
        </div>
      ) : null}
      {measurement.metric ? (
        <p className="mt-2">
          <Link href={`/measurements/${measurement.metric.id}`} className="underline">
            Open measurement
          </Link>
        </p>
      ) : (
        <p className="mt-2">
          <Link href={`/measurements?goal=${goalId}`} className="underline">
            Add a measurement
          </Link>
        </p>
      )}
      {children}
      {measurement.metric ? (
        <div className="mt-4">
          <h3 className="font-medium">Recent entries</h3>
          {measurement.recent.length === 0 ? <p className="mt-2">No entries yet.</p> : null}
          <ul className="mt-2 flex flex-col gap-2">
            {measurement.recent.map((entry) => (
              <li key={entry.id}>
                {formatCivilDate(entry.recordedOn)} · {displayDecimal(entry.value)} {unit}
                {entry.note ? ` · ${entry.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
