"use client";

import { useActionState, useState } from "react";
import {
  cancelTaskAction,
  deactivateSeriesAction,
  updateSeriesAction,
  type SeriesFormState,
} from "../../modules/tasks/actions";
import type { SeriesTemplate } from "../../modules/tasks/queries";

export function SeriesBanner({
  series,
  taskId,
  open,
  areas,
  goals,
}: {
  series: SeriesTemplate;
  taskId: string;
  open: boolean;
  areas: { id: number; name: string }[];
  goals: { id: string; title: string }[];
}) {
  const initialState: SeriesFormState = {
    error: "",
    title: series.title,
    notes: series.notes,
    priority: String(series.priority),
    estimatedMinutes: series.estimatedMinutes === null ? "" : String(series.estimatedMinutes),
    lifeAreaId: series.lifeAreaId === null ? "" : String(series.lifeAreaId),
    goalIds: series.goalIds,
    saved: false,
    attempt: 0,
  };
  const [state, formAction, pending] = useActionState(updateSeriesAction, initialState);
  const [confirmStop, setConfirmStop] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <section className="flex flex-col gap-4 rounded border border-neutral-300 p-4">
      <div>
        <p>This occurrence is part of a repeating task.</p>
        <p className="mt-1 text-sm text-neutral-700">
          Editing only this one detaches it from future template updates.
        </p>
      </div>
      {open ? (
        confirmCancel ? (
          <form action={cancelTaskAction} className="flex flex-col gap-2">
            <p>Cancel {series.title}? This occurrence stays on its date and is not created again.</p>
            <input type="hidden" name="taskId" value={taskId} />
            <div className="flex gap-2">
              <button type="submit" className="min-h-11 rounded bg-neutral-900 px-3 py-2 text-white">
                Cancel this one
              </button>
              <button type="button" className="min-h-11 rounded border border-neutral-300 px-3 py-2" onClick={() => setConfirmCancel(false)}>
                Keep it
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="min-h-11 w-fit rounded border border-neutral-300 px-3 py-2" onClick={() => setConfirmCancel(true)}>
            Cancel this one
          </button>
        )
      ) : null}
      {series.isActive ? (
        confirmStop ? (
          <form action={deactivateSeriesAction} className="flex flex-col gap-2">
            <p>Stop {series.title}? This cancels future open occurrences and leaves completed history.</p>
            <input type="hidden" name="seriesId" value={series.id} />
            <input type="hidden" name="taskId" value={taskId} />
            <div className="flex gap-2">
              <button type="submit" className="min-h-11 rounded bg-neutral-900 px-3 py-2 text-white">
                Stop the series
              </button>
              <button type="button" className="min-h-11 rounded border border-neutral-300 px-3 py-2" onClick={() => setConfirmStop(false)}>
                Keep it
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="min-h-11 w-fit rounded border border-neutral-300 px-3 py-2" onClick={() => setConfirmStop(true)}>
            Stop the series
          </button>
        )
      ) : (
        <p className="text-sm">This repeating task is stopped.</p>
      )}
      <form action={formAction} className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Edit the repeating template</h2>
        <input type="hidden" name="seriesId" value={series.id} />
        <input type="hidden" name="taskId" value={taskId} />
        {state.error ? (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
        {state.saved ? <p className="text-sm">Saved.</p> : null}
        <label className="flex flex-col gap-1 text-sm">
          Title
          <input
            name="title"
            key={`title-${state.attempt}`}
            defaultValue={state.title}
            required
            className="min-h-11 rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Notes
          <textarea
            name="notes"
            key={`notes-${state.attempt}`}
            defaultValue={state.notes}
            rows={3}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Priority
          <select
            name="priority"
            key={`priority-${state.attempt}`}
            defaultValue={state.priority}
            className="min-h-11 rounded border border-neutral-300 px-3 py-2"
          >
            <option value="0">None</option>
            <option value="1">Low</option>
            <option value="2">Medium</option>
            <option value="3">High</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Estimated minutes
          <input
            name="estimatedMinutes"
            type="number"
            key={`minutes-${state.attempt}`}
            defaultValue={state.estimatedMinutes}
            className="min-h-11 rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Life area
          <select
            name="lifeAreaId"
            key={`area-${state.attempt}`}
            defaultValue={state.lifeAreaId}
            className="min-h-11 rounded border border-neutral-300 px-3 py-2"
          >
            <option value="">None</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset key={`goals-${state.attempt}`} className="flex flex-col gap-2">
          <legend className="text-sm">Goals</legend>
          {goals.length === 0 ? <p className="text-sm">No goals yet.</p> : null}
          {goals.map((goal) => (
            <label key={goal.id} className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="goalId" value={goal.id} defaultChecked={state.goalIds.includes(goal.id)} />
              {goal.title}
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={pending} className="min-h-11 w-fit rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save template"}
        </button>
      </form>
    </section>
  );
}
