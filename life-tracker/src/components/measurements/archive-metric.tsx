"use client";

import { useState } from "react";
import { archiveMetricAction } from "../../modules/measurements/actions";

export function ArchiveMetric({ metricId, name }: { metricId: string; name: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className="min-h-11 rounded border border-neutral-300 px-3 py-2" onClick={() => setOpen(true)}>
        Archive
      </button>
    );
  }
  return (
    <form action={archiveMetricAction} className="flex flex-col gap-2">
      <p>Archive {name}? Entries stay in the history.</p>
      <input type="hidden" name="metricId" value={metricId} />
      <div className="flex gap-2">
        <button type="submit" className="min-h-11 rounded bg-neutral-900 px-3 py-2 text-white">
          Archive
        </button>
        <button type="button" className="min-h-11 rounded border border-neutral-300 px-3 py-2" onClick={() => setOpen(false)}>
          Keep it
        </button>
      </div>
    </form>
  );
}
