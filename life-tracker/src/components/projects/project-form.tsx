"use client";

import { useActionState } from "react";
import { createProjectAction, updateProjectAction, type ProjectFormState } from "../../modules/projects/actions";
import type { ProjectRecord } from "../../modules/projects/queries";

export function ProjectForm({
  project,
  areas,
  presetAreaId = null,
}: {
  project: ProjectRecord | null;
  areas: { id: number; name: string }[];
  presetAreaId?: number | null;
}) {
  const initial: ProjectFormState = {
    error: "",
    title: project?.title ?? "",
    description: project?.description ?? "",
    startDate: project?.startDate ?? "",
    targetDate: project?.targetDate ?? "",
    lifeAreaId: project?.lifeAreaId === null || project?.lifeAreaId === undefined ? (presetAreaId === null ? "" : String(presetAreaId)) : String(project.lifeAreaId),
    saved: false,
    attempt: 0,
  };
  const [state, formAction, pending] = useActionState(project ? updateProjectAction : createProjectAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {project ? <input type="hidden" name="projectId" value={project.id} /> : null}
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
        Start date
        <input
          name="startDate"
          type="date"
          key={`start-${state.attempt}`}
          defaultValue={state.startDate}
          className="min-h-11 rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Target date
        <input
          name="targetDate"
          type="date"
          key={`target-${state.attempt}`}
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
        {pending ? "Saving…" : project ? "Save" : "Create project"}
      </button>
    </form>
  );
}
