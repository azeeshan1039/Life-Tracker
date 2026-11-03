"use client";

import { useActionState } from "react";
import { createGoalAction, updateGoalAction, type GoalFormState } from "../../modules/goals/actions";
import type { GoalRecord } from "../../modules/goals/queries";

export function GoalForm({
  goal,
  areas,
  projectId,
  presetAreaId = null,
}: {
  goal: GoalRecord | null;
  areas: { id: number; name: string }[];
  projectId?: string;
  presetAreaId?: number | null;
}) {
  const initial: GoalFormState = {
    error: "",
    title: goal?.title ?? "",
    description: goal?.description ?? "",
    targetDate: goal?.targetDate ?? "",
    lifeAreaId: goal?.lifeAreaId === null || goal?.lifeAreaId === undefined ? (presetAreaId === null ? "" : String(presetAreaId)) : String(goal.lifeAreaId),
    saved: false,
    attempt: 0,
  };
  const [state, formAction, pending] = useActionState(goal ? updateGoalAction : createGoalAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {goal ? <input type="hidden" name="goalId" value={goal.id} /> : null}
      {projectId ? <input type="hidden" name="projectId" value={projectId} /> : null}
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
          required
          key={`title-${state.attempt}`}
          defaultValue={state.title}
          className="min-h-11 rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea
          name="description"
          key={`description-${state.attempt}`}
          defaultValue={state.description}
          rows={4}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Target date
        <input
          name="targetDate"
          type="date"
          key={`date-${state.attempt}`}
          defaultValue={state.targetDate}
          className="min-h-11 rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Area
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
      <button type="submit" disabled={pending} className="min-h-11 w-fit rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-60">
        {pending ? "Saving…" : goal ? "Save" : "Create goal"}
      </button>
    </form>
  );
}
