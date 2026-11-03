"use client";

import { useActionState, useState } from "react";
import { saveEntryAction, type EntryFormState } from "../../modules/measurements/actions";

export function EntryForm({
  metricId,
  today,
  existingDates,
}: {
  metricId: string;
  today: string;
  existingDates: string[];
}) {
  const initial: EntryFormState = {
    error: "",
    recordedOn: today,
    value: "",
    note: "",
    saved: false,
    attempt: 0,
  };
  const [state, formAction, pending] = useActionState(saveEntryAction, initial);
  const [recordedOn, setRecordedOn] = useState(state.recordedOn);
  const [seenAttempt, setSeenAttempt] = useState(state.attempt);
  if (state.attempt !== seenAttempt) {
    setSeenAttempt(state.attempt);
    setRecordedOn(state.recordedOn);
  }
  const replacing = existingDates.includes(recordedOn);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="metricId" value={metricId} />
      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.saved ? <p className="text-sm">Saved.</p> : null}
      <label className="flex flex-col gap-1 text-sm">
        Date
        <input
          name="recordedOn"
          type="date"
          required
          value={recordedOn}
          onChange={(event) => setRecordedOn(event.target.value)}
          className="min-h-11 rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      {replacing ? <p role="status">This replaces the value for that date</p> : null}
      <label className="flex flex-col gap-1 text-sm">
        Value
        <input
          name="value"
          required
          inputMode="decimal"
          key={`value-${state.attempt}`}
          defaultValue={state.value}
          className="min-h-11 rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Note
        <input
          name="note"
          key={`note-${state.attempt}`}
          defaultValue={state.note}
          className="min-h-11 rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-fit rounded bg-neutral-900 px-3 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
      >
        {pending ? "Saving…" : replacing ? "Replace value" : "Save entry"}
      </button>
    </form>
  );
}
