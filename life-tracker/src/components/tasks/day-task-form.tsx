"use client";

import { useActionState } from "react";
import { createDayTaskAction, type DayTaskState } from "../../modules/tasks/actions";

const initialState: DayTaskState = { error: "", title: "", attempt: 0 };

export function DayTaskForm({ day }: { day: string }) {
  const [state, formAction, pending] = useActionState(createDayTaskAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="scheduledFor" value={day} />
      <label htmlFor="day-task-title" className="text-sm font-medium">
        Add a task on this day
      </label>
      <div className="flex items-center gap-2">
        <input
          id="day-task-title"
          name="title"
          key={state.attempt}
          defaultValue={state.title}
          className="min-h-11 min-w-0 flex-1 rounded border border-neutral-300 px-3 py-2"
        />
        <button type="submit" disabled={pending} className="min-h-11 rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-60">
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
