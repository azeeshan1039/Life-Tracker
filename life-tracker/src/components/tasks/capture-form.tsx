"use client";

import { useActionState } from "react";
import { captureTaskAction, type CaptureFormState } from "../../modules/tasks/actions";

const initialState: CaptureFormState = { error: "", title: "", attempt: 0 };

export function CaptureForm({ dock = false }: { dock?: boolean }) {
  const [state, formAction, pending] = useActionState(captureTaskAction, initialState);

  return (
    <form action={formAction} className={dock ? "capture-dock flex flex-col gap-2" : "flex flex-col gap-2"}>
      <label htmlFor="capture-title" className="text-sm font-medium">
        Capture
      </label>
      <div className="flex items-center gap-2">
        <input
          id="capture-title"
          name="title"
          type="text"
          key={state.attempt}
          defaultValue={state.title}
          autoComplete="off"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "capture-error" : undefined}
          className="min-h-11 min-w-0 flex-1 rounded border border-neutral-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded bg-neutral-900 px-3 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      {state.error ? (
        <p id="capture-error" role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
