"use client";

import { useActionState, useState } from "react";
import { createHabitAction, updateHabitAction, type HabitFormState } from "../../modules/habits/actions";
import type { HabitRecord } from "../../modules/habits/queries";

const weekdays = [
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
  { value: "7", label: "Sun" },
];

export function HabitForm({
  habit,
  areas,
  goals = [],
  presetAreaId = null,
}: {
  habit: HabitRecord | null;
  areas: { id: number; name: string }[];
  goals?: { id: string; title: string }[];
  presetAreaId?: number | null;
}) {
  const initial: HabitFormState = {
    error: "",
    title: habit?.title ?? "",
    unit: habit?.unit ?? (habit?.trackingType === "duration" ? "minutes" : ""),
    targetValue: habit?.targetValue === null || habit?.targetValue === undefined ? "" : String(habit.targetValue),
    weeklyTarget: habit?.weeklyTarget === null || habit?.weeklyTarget === undefined ? "" : String(habit.weeklyTarget),
    trackingType: habit?.trackingType ?? "boolean",
    scheduleKind: habit?.scheduleKind ?? "fixed_days",
    weekdays: (habit?.weekdays ?? []).map(String),
    lifeAreaId: habit?.lifeAreaId === null || habit?.lifeAreaId === undefined ? (presetAreaId === null ? "" : String(presetAreaId)) : String(habit.lifeAreaId),
    goalId: habit?.goalId ?? "",
    saved: false,
    attempt: 0,
  };
  const [state, formAction, pending] = useActionState(habit ? updateHabitAction : createHabitAction, initial);
  const [tracking, setTracking] = useState(state.trackingType);
  const [schedule, setSchedule] = useState(state.scheduleKind);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {habit ? <input type="hidden" name="habitId" value={habit.id} /> : null}
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
        Tracking
        <select
          name="trackingType"
          value={tracking}
          onChange={(event) => setTracking(event.target.value)}
          className="min-h-11 rounded border border-neutral-300 px-3 py-2"
        >
          <option value="boolean">Done</option>
          <option value="numeric">Number</option>
          <option value="duration">Duration</option>
        </select>
      </label>
      {tracking === "duration" ? <p className="text-sm">Duration is stored in minutes.</p> : null}
      {tracking !== "boolean" ? (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Unit
            <input
              name="unit"
              key={`unit-${state.attempt}`}
              defaultValue={state.unit}
              className="min-h-11 rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {tracking === "duration" ? "Target minutes" : "Target"}
            <input
              name="targetValue"
              type="number"
              min="0"
              step="any"
              key={`target-${state.attempt}`}
              defaultValue={state.targetValue}
              className="min-h-11 rounded border border-neutral-300 px-3 py-2"
            />
          </label>
        </>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        Schedule
        <select
          name="scheduleKind"
          value={schedule}
          onChange={(event) => setSchedule(event.target.value)}
          className="min-h-11 rounded border border-neutral-300 px-3 py-2"
        >
          <option value="fixed_days">Specific days</option>
          <option value="weekly_quota">Times per week</option>
        </select>
      </label>
      {schedule === "weekly_quota" ? (
        <>
          <p className="text-sm">Times-per-week habits reset on Monday.</p>
          <label className="flex flex-col gap-1 text-sm">
            Times per week
            <input
              name="weeklyTarget"
              type="number"
              min="1"
              max="7"
              key={`weekly-${state.attempt}`}
              defaultValue={state.weeklyTarget}
              className="min-h-11 rounded border border-neutral-300 px-3 py-2"
            />
          </label>
        </>
      ) : (
        <fieldset className="flex flex-wrap gap-3">
          <legend className="text-sm">Days</legend>
          {weekdays.map((day) => (
            <label key={day.value} className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="weekday" value={day.value} defaultChecked={state.weekdays.includes(day.value)} />
              {day.label}
            </label>
          ))}
        </fieldset>
      )}
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
      <label className="flex flex-col gap-1 text-sm">
        Goal
        <select
          name="goalId"
          key={`goal-${state.attempt}`}
          defaultValue={state.goalId}
          className="min-h-11 rounded border border-neutral-300 px-3 py-2"
        >
          <option value="">None</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.title}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className="min-h-11 w-fit rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-60">
        {pending ? "Saving…" : habit ? "Save" : "Create habit"}
      </button>
    </form>
  );
}
