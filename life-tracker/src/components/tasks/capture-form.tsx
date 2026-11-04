"use client";

import { useActionState, useEffect, useState } from "react";
import { captureTaskAction, type CaptureFormState } from "../../modules/tasks/actions";
import { publishCapturedInboxTask } from "./captured-inbox";

const initialState: CaptureFormState = { error: "", title: "", attempt: 0, captured: null };

export function CaptureForm() {
  const [state, formAction, pending] = useActionState(captureTaskAction, initialState);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.captured) {
      publishCapturedInboxTask(state.captured);
      setOpen(false);
    }
  }, [state.captured]);

  return (
    <div className="quick-add">
      {open ? (
        <div className="quick-add-panel" role="dialog" aria-modal="false" aria-labelledby="quick-add-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Quick add</p>
              <h2 id="quick-add-title" className="mt-1 font-semibold">
                Capture what is on your mind
              </h2>
            </div>
            <button type="button" className="icon-button" aria-label="Close quick add" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          <form action={formAction} className="mt-3 flex flex-col gap-2">
            <label htmlFor="capture-title" className="sr-only">
              Task title
            </label>
            <div className="flex items-center gap-2">
              <input
                id="capture-title"
                name="title"
                type="text"
                key={state.attempt}
                defaultValue={state.title}
                autoComplete="off"
                autoFocus
                placeholder="Add a task or idea"
                aria-invalid={state.error ? true : undefined}
                aria-describedby={state.error ? "capture-error" : undefined}
                className="min-h-11 min-w-0 flex-1 rounded border border-neutral-300 px-3 py-2"
              />
              <button type="submit" disabled={pending} className="min-h-11 rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-60">
                {pending ? "Adding…" : "Add"}
              </button>
            </div>
            <p className="text-xs text-neutral-700">Saved to your inbox so you can plan it later.</p>
            {state.error ? (
              <p id="capture-error" role="alert" className="text-sm text-red-700">
                {state.error}
              </p>
            ) : null}
          </form>
        </div>
      ) : null}
      <button
        type="button"
        className="quick-add-trigger"
        aria-expanded={open}
        aria-controls="quick-add-title"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">+</span>
        <span>Quick add</span>
      </button>
    </div>
  );
}
