import { readCivilDate } from "../../lib/dates";
import { decimalString } from "../../lib/decimal";
import { getAdminClient } from "../../lib/supabase-admin";
import type { MetricDirection } from "./derive";

export const METRIC_KINDS = ["general", "asset", "liability", "income", "expense"] as const;
export const METRIC_AGGREGATIONS = ["latest", "period_sum"] as const;
export const METRIC_DIRECTIONS = ["increase", "decrease", "maintain"] as const;
export const WEALTH_SUGGESTIONS = [
  { key: "savings", name: "Savings", kind: "asset", aggregation: "latest", direction: "increase" },
  { key: "income", name: "Income", kind: "income", aggregation: "period_sum", direction: "increase" },
  { key: "expenses", name: "Expenses", kind: "expense", aggregation: "period_sum", direction: "decrease" },
  { key: "liabilities", name: "Liabilities", kind: "liability", aggregation: "latest", direction: "decrease" },
] as const;

export type MetricKind = (typeof METRIC_KINDS)[number];
export type MetricAggregation = (typeof METRIC_AGGREGATIONS)[number];
export type WealthSuggestionKey = (typeof WEALTH_SUGGESTIONS)[number]["key"];

export type MetricInput = {
  name: string;
  description: string;
  kind: MetricKind;
  unit: string;
  aggregation: MetricAggregation;
  direction: MetricDirection;
  target: string | null;
  lifeAreaId: number | null;
  goalId: string | null;
  primary: boolean;
};

export type MetricWriteResult = { ok: true; id: string } | { ok: false; message: string };

const MONEY_KINDS = new Set<MetricKind>(["asset", "liability", "income", "expense"]);

export function isMoneyKind(kind: string): boolean {
  return MONEY_KINDS.has(kind as MetricKind);
}

export async function createMetric(userId: string, input: MetricInput): Promise<MetricWriteResult> {
  const invalid = validateMetric(input);
  if (invalid) {
    return { ok: false, message: invalid };
  }
  const goalError = await ownedGoal(userId, input.goalId);
  if (goalError) {
    return { ok: false, message: goalError };
  }
  const { data, error } = await getAdminClient().from("metrics").insert(metricRow(userId, input)).select("id").single();
  if (error) {
    return constraintMessage(error);
  }
  if (input.primary && input.goalId) {
    const primary = await setPrimaryMetric(userId, input.goalId, data.id);
    if (!primary.ok) {
      return primary;
    }
  }
  return { ok: true, id: data.id };
}

export async function updateMetric(userId: string, metricId: string, input: MetricInput): Promise<MetricWriteResult> {
  const invalid = validateMetric(input);
  if (invalid) {
    return { ok: false, message: invalid };
  }
  const goalError = await ownedGoal(userId, input.goalId);
  if (goalError) {
    return { ok: false, message: goalError };
  }
  const { data, error } = await getAdminClient()
    .from("metrics")
    .update({ ...metricRow(userId, input), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", metricId)
    .select("id")
    .maybeSingle();
  if (error) {
    return constraintMessage(error);
  }
  if (!data) {
    return { ok: false, message: "This measurement is not available." };
  }
  if (input.primary && input.goalId) {
    return setPrimaryMetric(userId, input.goalId, metricId);
  }
  return { ok: true, id: data.id };
}

export async function setMetricStatus(
  userId: string,
  metricId: string,
  status: "active" | "archived",
): Promise<MetricWriteResult> {
  const { data, error } = await getAdminClient()
    .from("metrics")
    .update({
      status,
      archived_at: status === "archived" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", metricId)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return { ok: false, message: "This measurement is not available." };
  }
  return { ok: true, id: data.id };
}

export async function saveMetricEntry(
  userId: string,
  metricId: string,
  input: { recordedOn: string; value: string; note: string },
): Promise<MetricWriteResult> {
  try {
    readCivilDate(input.recordedOn);
  } catch {
    return { ok: false, message: "Dates must be calendar days." };
  }
  let value: string;
  try {
    value = decimalString(input.value);
  } catch {
    return { ok: false, message: "Enter a number." };
  }
  const { data, error } = await getAdminClient().rpc("save_metric_entry", {
    p_user_id: userId,
    p_metric_id: metricId,
    p_recorded_on: input.recordedOn,
    p_value: value,
    p_note: input.note,
  });
  if (error) {
    if (error.code === "23514") {
      return { ok: false, message: "Enter a number." };
    }
    throw new Error(error.message);
  }
  if (!data) {
    return { ok: false, message: "This measurement is not available." };
  }
  return { ok: true, id: data };
}

export async function setPrimaryMetric(
  userId: string,
  goalId: string,
  metricId: string | null,
): Promise<MetricWriteResult> {
  const { data, error } = await getAdminClient().rpc("set_primary_metric", {
    p_user_id: userId,
    p_goal_id: goalId,
    p_metric_id: metricId,
  });
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return { ok: false, message: "This measurement is not available." };
  }
  return { ok: true, id: metricId ?? goalId };
}

export async function createSuggestedMetric(
  userId: string,
  key: string,
  currencyCode: string,
  lifeAreaId: number | null,
): Promise<MetricWriteResult> {
  const suggestion = WEALTH_SUGGESTIONS.find((item) => item.key === key);
  if (!suggestion) {
    return { ok: false, message: "That suggestion is not available." };
  }
  return createMetric(userId, {
    name: suggestion.name,
    description: "",
    kind: suggestion.kind,
    unit: currencyCode.trim() || "USD",
    aggregation: suggestion.aggregation,
    direction: suggestion.direction,
    target: null,
    lifeAreaId,
    goalId: null,
    primary: false,
  });
}

function metricRow(userId: string, input: MetricInput) {
  return {
    user_id: userId,
    name: input.name.trim(),
    description: input.description,
    kind: input.kind,
    unit: input.unit.trim(),
    aggregation: input.aggregation,
    direction: input.direction,
    target_value: input.target === null ? null : decimalString(input.target),
    life_area_id: input.lifeAreaId,
    goal_id: input.goalId,
    is_primary_for_goal: false,
  };
}

function validateMetric(input: MetricInput): string | null {
  if (!input.name.trim()) {
    return "Name is required.";
  }
  if (!METRIC_KINDS.includes(input.kind)) {
    return "Kind is not available.";
  }
  if (!input.unit.trim()) {
    return "Unit is required.";
  }
  if (!METRIC_AGGREGATIONS.includes(input.aggregation)) {
    return "Choose a snapshot or an amount in a period.";
  }
  if (!METRIC_DIRECTIONS.includes(input.direction)) {
    return "Direction is not available.";
  }
  if (input.target !== null) {
    try {
      decimalString(input.target);
    } catch {
      return "Enter a target number.";
    }
  }
  if (input.lifeAreaId !== null && (!Number.isInteger(input.lifeAreaId) || input.lifeAreaId <= 0)) {
    return "Life area is not available.";
  }
  if (input.primary && !input.goalId) {
    return "Choose a goal to use this as its main measurement.";
  }
  return null;
}

async function ownedGoal(userId: string, goalId: string | null): Promise<string | null> {
  if (!goalId) {
    return null;
  }
  const { data, error } = await getAdminClient().from("goals").select("id").eq("user_id", userId).eq("id", goalId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return "This goal is not available.";
  }
  return null;
}

function constraintMessage(error: { code?: string; message: string }): MetricWriteResult {
  if (error.code === "23514" || error.code === "23503" || error.code === "23505") {
    return { ok: false, message: "This measurement could not be saved." };
  }
  throw new Error(error.message);
}
