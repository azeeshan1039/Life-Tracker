"use client";

import { useActionState } from "react";
import { addMilestoneAction, type MilestoneFormState } from "../../modules/projects/actions";

const initial: MilestoneFormState = { error: "", title: "", targetDate: "", attempt: 0 };

export function MilestoneForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(addMilestoneAction, initial);
  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="projectId" value={projectId} />
      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        Milestone
        <input
          name="title"
          required
          key={`title-${state.attempt}`}
          defaultValue={state.title}
          className="min-h-11 rounded border border-neutral-300 px-3 py-2"
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
      <button type="submit" disabled={pending} className="min-h-11 w-fit rounded border border-neutral-300 px-3 py-2 disabled:opacity-60">
        {pending ? "Adding…" : "Add milestone"}
      </button>
    </form>
  );
}
