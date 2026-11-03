"use client";

import { useActionState, useState } from "react";
import { addSubtaskAction, updateTaskAction, type TaskFormState } from "../../modules/tasks/actions";
import type { TaskLinks } from "../../modules/tasks/links";
import type { TaskRecord } from "../../modules/tasks/schema";

const initialState: TaskFormState = { error: "", saved: false, attempt: 0 };

export function TaskEditor({
  task,
  areas,
  projects,
  milestones,
  goals,
  links,
}: {
  task: TaskRecord;
  areas: { id: number; name: string }[];
  projects: { id: string; title: string }[];
  milestones: { id: string; projectId: string; title: string }[];
  goals: { id: string; title: string }[];
  links: TaskLinks;
}) {
  const [state, formAction, pending] = useActionState(updateTaskAction, initialState);
  const [projectId, setProjectId] = useState(links.projectId ?? "");
  const [milestoneId, setMilestoneId] = useState(links.milestoneId ?? "");
  const milestoneChoices = milestones.filter((milestone) => milestone.projectId === projectId);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="taskId" value={task.id} />
      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.saved ? <p className="text-sm">Saved.</p> : null}
      <Field label="Title" name="title" defaultValue={task.title} required />
      <label className="flex flex-col gap-1 text-sm">
        Notes
        <textarea
          name="notes"
          defaultValue={task.notes}
          rows={4}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Status
        <select name="status" defaultValue={task.status} className="min-h-11 rounded border border-neutral-300 px-3 py-2">
          <option value="inbox">Inbox</option>
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Priority
        <select name="priority" defaultValue={String(task.priority)} className="min-h-11 rounded border border-neutral-300 px-3 py-2">
          <option value="0">None</option>
          <option value="1">Low</option>
          <option value="2">Medium</option>
          <option value="3">High</option>
        </select>
      </label>
      <p className="text-sm">Scheduled is when you will do it. Due is the deadline.</p>
      <Field label="Scheduled for" name="scheduledFor" type="date" defaultValue={task.scheduledFor ?? ""} />
      <Field label="Due" name="dueOn" type="date" defaultValue={task.dueOn ?? ""} />
      <Field label="Starts" name="scheduledStart" type="datetime-local" defaultValue={toLocalInput(task.scheduledStart)} />
      <Field label="Ends" name="scheduledEnd" type="datetime-local" defaultValue={toLocalInput(task.scheduledEnd)} />
      <Field
        label="Estimated minutes"
        name="estimatedMinutes"
        type="number"
        defaultValue={task.estimatedMinutes === null ? "" : String(task.estimatedMinutes)}
      />
      <label className="flex flex-col gap-1 text-sm">
        Life area
        <select name="lifeAreaId" defaultValue={task.lifeAreaId === null ? "" : String(task.lifeAreaId)} className="min-h-11 rounded border border-neutral-300 px-3 py-2">
          <option value="">None</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Project
        <select
          name="projectId"
          value={projectId}
          onChange={(event) => {
            const next = event.target.value;
            setProjectId(next);
            setMilestoneId((current) => (milestones.some((milestone) => milestone.id === current && milestone.projectId === next) ? current : ""));
          }}
          className="min-h-11 rounded border border-neutral-300 px-3 py-2"
        >
          <option value="">None</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Milestone
        <select
          name="milestoneId"
          value={milestoneId}
          onChange={(event) => setMilestoneId(event.target.value)}
          className="min-h-11 rounded border border-neutral-300 px-3 py-2"
        >
          <option value="">None</option>
          {milestoneChoices.map((milestone) => (
            <option key={milestone.id} value={milestone.id}>
              {milestone.title}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm">Goals</legend>
        {goals.length === 0 ? <p className="text-sm">No goals yet.</p> : null}
        {goals.map((goal) => (
          <label key={goal.id} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="goalId" value={goal.id} defaultChecked={links.goalIds.includes(goal.id)} />
            {goal.title}
          </label>
        ))}
      </fieldset>
      <button type="submit" disabled={pending} className="min-h-11 rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

export function AddSubtaskForm({ parentId }: { parentId: string }) {
  const [state, formAction, pending] = useActionState(addSubtaskAction, initialState);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <input type="hidden" name="parentId" value={parentId} />
      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      <Field key={`title-${state.attempt}`} label="Subtask title" name="title" required />
      <Field key={`due-${state.attempt}`} label="Due" name="dueOn" type="date" />
      <button type="submit" disabled={pending} className="rounded border border-neutral-300 px-3 py-2 disabled:opacity-60">
        {pending ? "Adding…" : "Add subtask"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="rounded border border-neutral-300 px-3 py-2"
      />
    </label>
  );
}

function toLocalInput(value: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
