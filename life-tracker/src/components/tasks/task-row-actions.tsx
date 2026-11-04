"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { inlineTaskAction, type InlineTaskActionState } from "../../modules/tasks/actions";

const initialState: InlineTaskActionState = { error: "", attempt: 0 };

export function TaskRowActions({ taskId, dueOn }: { taskId: string; dueOn: string | null }) {
  const [state, formAction] = useActionState(inlineTaskAction, initialState);

  return (
    <form action={formAction} className="task-row-actions">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="dueOn" value={dueOn ?? ""} />
      <ActionButton intent="complete" label="Complete" compact />
      <details className="task-schedule-menu">
        <summary aria-label="Schedule task">Plan</summary>
        <div>
          <ActionButton intent="today" label="Today" />
          <ActionButton intent="tomorrow" label="Tomorrow" />
        </div>
      </details>
      {state.error ? (
        <span role="alert" className="task-row-error">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

function ActionButton({
  intent,
  label,
  compact = false,
}: {
  intent: "complete" | "today" | "tomorrow";
  label: string;
  compact?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      className={compact ? "task-complete-button" : ""}
      aria-label={compact ? "Mark task complete" : `Schedule for ${label.toLowerCase()}`}
    >
      {compact ? <span aria-hidden="true">✓</span> : label}
    </button>
  );
}
