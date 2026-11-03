"use client";

import { useActionState } from "react";
import { saveHabitLogAction, type LogFormState } from "../../modules/habits/actions";
import type { HabitDefinition } from "../../modules/habits/classify";

const initialState: LogFormState = { error: "", value: "", hours: "", minutes: "", attempt: 0 };

export function HabitLogForm({
  habitId,
  day,
  trackingType,
  value,
  hours,
  minutes,
}: {
  habitId: string;
  day: string;
  trackingType: HabitDefinition["trackingType"];
  value?: string;
  hours?: string;
  minutes?: string;
}) {
  const [state, formAction, pending] = useActionState(saveHabitLogAction, {
    ...initialState,
    value: value ?? "",
    hours: hours ?? "",
    minutes: minutes ?? "",
  });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="habitId" value={habitId} />
      <input type="hidden" name="loggedOn" value={day} />
      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {trackingType === "numeric" ? (
        <label className="flex flex-col gap-1 text-sm">
          Number
          <input
            name="value"
            type="number"
            min="0"
            step="any"
            key={`value-${state.attempt}`}
            defaultValue={state.value}
            className="min-h-11 rounded border border-neutral-300 px-3 py-2"
          />
        </label>
      ) : null}
      {trackingType === "duration" ? (
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Hours
            <input
              name="hours"
              type="number"
              min="0"
              key={`hours-${state.attempt}`}
              defaultValue={state.hours}
              className="min-h-11 w-24 rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Minutes
            <input
              name="minutes"
              type="number"
              min="0"
              max="59"
              key={`minutes-${state.attempt}`}
              defaultValue={state.minutes}
              className="min-h-11 w-24 rounded border border-neutral-300 px-3 py-2"
            />
          </label>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button name="intent" value="logged" disabled={pending} className="min-h-11 rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-60">
          {trackingType === "boolean" ? "Done" : "Log"}
        </button>
        <button name="intent" value="skipped" disabled={pending} className="min-h-11 rounded border border-neutral-300 px-3 py-2">
          Skip
        </button>
        <button name="intent" value="rest" disabled={pending} className="min-h-11 rounded border border-neutral-300 px-3 py-2">
          Rest
        </button>
      </div>
    </form>
  );
}
