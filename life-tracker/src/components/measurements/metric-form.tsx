"use client";

import { useActionState, useState } from "react";
import { createMetricAction, updateMetricAction, type MetricFormState } from "../../modules/measurements/actions";
import { isMoneyKind } from "../../modules/measurements/mutations";
import type { MetricRecord } from "../../modules/measurements/queries";

export function MetricForm({
  metric,
  areas,
  goals,
  currencyCode,
  presetGoalId = "",
  presetAreaId = null,
}: {
  metric: MetricRecord | null;
  areas: { id: number; name: string }[];
  goals: { id: string; title: string }[];
  currencyCode: string;
  presetGoalId?: string;
  presetAreaId?: number | null;
}) {
  const initial: MetricFormState = {
    error: "",
    name: metric?.name ?? "",
    description: metric?.description ?? "",
    kind: metric?.kind ?? "general",
    unit: metric?.unit ?? "",
    aggregation: metric?.aggregation ?? "latest",
    direction: metric?.direction ?? "increase",
    target: metric?.target ?? "",
    lifeAreaId: metric?.lifeAreaId === null || metric?.lifeAreaId === undefined ? (presetAreaId === null ? "" : String(presetAreaId)) : String(metric.lifeAreaId),
    goalId: metric?.goalId ?? presetGoalId,
    primary: metric?.isPrimary ?? false,
    saved: false,
    attempt: 0,
  };
  const [state, formAction, pending] = useActionState(metric ? updateMetricAction : createMetricAction, initial);
  const [kind, setKind] = useState(state.kind);
  const [unit, setUnit] = useState(state.unit);
  const [aggregation, setAggregation] = useState(state.aggregation);
  const [aggregationTouched, setAggregationTouched] = useState(Boolean(metric));
  const [seenAttempt, setSeenAttempt] = useState(state.attempt);
  if (state.attempt !== seenAttempt) {
    setSeenAttempt(state.attempt);
    setKind(state.kind);
    setUnit(state.unit);
    setAggregation(state.aggregation);
  }

  function changeKind(next: string) {
    setKind(next);
    if (isMoneyKind(next) && unit.trim() === "") {
      setUnit(currencyCode);
    }
    if (!aggregationTouched) {
      setAggregation(next === "income" || next === "expense" ? "period_sum" : "latest");
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {metric ? <input type="hidden" name="metricId" value={metric.id} /> : null}
      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.saved ? <p className="text-sm">Saved.</p> : null}
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input
          name="name"
          required
          key={`name-${state.attempt}`}
          defaultValue={state.name}
          className="min-h-11 rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea
          name="description"
          key={`description-${state.attempt}`}
          defaultValue={state.description}
          rows={3}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Kind
        <select name="kind" value={kind} onChange={(event) => changeKind(event.target.value)} className="min-h-11 rounded border border-neutral-300 px-3 py-2">
          <option value="general">General</option>
          <option value="asset">Asset</option>
          <option value="liability">Liability</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Unit
        <input
          name="unit"
          required
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
          className="min-h-11 rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        How values combine
        <select
          name="aggregation"
          value={aggregation}
          onChange={(event) => {
            setAggregationTouched(true);
            setAggregation(event.target.value);
          }}
          className="min-h-11 rounded border border-neutral-300 px-3 py-2"
        >
          <option value="latest">Snapshot</option>
          <option value="period_sum">Amount in a period</option>
        </select>
      </label>
      <p className="text-sm text-neutral-700">
        A snapshot keeps the latest value on or before today, such as a balance or a weight. An amount in a period adds the entries whose dates fall in that month, such as income or spending.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Direction
        <select
          name="direction"
          key={`direction-${state.attempt}`}
          defaultValue={state.direction}
          className="min-h-11 rounded border border-neutral-300 px-3 py-2"
        >
          <option value="increase">Increase</option>
          <option value="decrease">Decrease</option>
          <option value="maintain">Maintain</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Target
        <input
          name="target"
          inputMode="decimal"
          key={`target-${state.attempt}`}
          defaultValue={state.target}
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
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="primary" value="yes" key={`primary-${state.attempt}`} defaultChecked={state.primary} className="size-4" />
        Use as this goal&apos;s main measurement
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-fit rounded bg-neutral-900 px-3 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
      >
        {pending ? "Saving…" : metric ? "Save" : "Add measurement"}
      </button>
    </form>
  );
}
