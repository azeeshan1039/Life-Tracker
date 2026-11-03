"use client";

import { useActionState } from "react";
import { setPrimaryMetricAction, type PrimaryFormState } from "../../modules/measurements/actions";

export function PrimaryMetricForm({
  goalId,
  metricId,
  metrics,
}: {
  goalId: string;
  metricId: string | null;
  metrics: { id: string; name: string; unit: string }[];
}) {
  const [state, formAction, pending] = useActionState(setPrimaryMetricAction, { error: "" } satisfies PrimaryFormState);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="goalId" value={goalId} />
      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        Main measurement
        <select name="metricId" defaultValue={metricId ?? ""} className="min-h-11 rounded border border-neutral-300 px-3 py-2">
          <option value="">None</option>
          {metrics.map((metric) => (
            <option key={metric.id} value={metric.id}>
              {metric.name} ({metric.unit})
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-fit rounded border border-neutral-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save measurement"}
      </button>
    </form>
  );
}
