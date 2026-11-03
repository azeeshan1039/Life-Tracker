"use client";

import { useState } from "react";
import { setGoalStatusAction } from "../../modules/goals/actions";

export function ArchiveGoal({ goalId, title }: { goalId: string; title: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className="min-h-11 rounded border border-neutral-300 px-3 py-2" onClick={() => setOpen(true)}>
        Archive
      </button>
    );
  }
  return (
    <form action={setGoalStatusAction} className="flex flex-col gap-2">
      <p>Archive {title}? Projects and tasks will remain.</p>
      <input type="hidden" name="goalId" value={goalId} />
      <input type="hidden" name="status" value="archived" />
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
