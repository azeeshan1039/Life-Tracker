import { calendarMonthBounds } from "../../lib/dates";
import { decimalString } from "../../lib/decimal";
import { getAdminClient } from "../../lib/supabase-admin";
import { decideNetWorth, goalProgress, type GoalProgress, type MetricDirection, type WorthMetric } from "./derive";

export type MetricStatus = "active" | "archived";

export type MetricRecord = {
  id: string;
  name: string;
  description: string;
  kind: WorthMetric["kind"];
  unit: string;
  aggregation: "latest" | "period_sum";
  direction: MetricDirection;
  target: string | null;
  status: MetricStatus;
  lifeAreaId: number | null;
  goalId: string | null;
  isPrimary: boolean;
  current: string | null;
  currentOn: string | null;
};

export type MetricEntry = {
  id: string;
  recordedOn: string;
  value: string;
  note: string;
};

export type MetricListItem = {
  id: string;
  name: string;
  kind: WorthMetric["kind"];
  unit: string;
  aggregation: "latest" | "period_sum";
  status: MetricStatus;
  lifeAreaId: number | null;
  displayValue: string | null;
  displayOn: string | null;
};

export type NetWorthRow = {
  id: string;
  name: string;
  kind: "asset" | "liability";
  unit: string;
  value: string;
  recordedOn: string;
};

export type NetWorthView =
  | { outcome: "total"; unit: string; total: string; rows: NetWorthRow[] }
  | { outcome: "missing_assets" | "missing_liabilities" | "mixed_units"; rows: NetWorthRow[] };

export type AreaCashFlow =
  | { computed: false }
  | { computed: true; unit: string; income: string; expense: string; net: string };

export type GoalMeasurementSummary = {
  goalId: string;
  metricId: string;
  name: string;
  unit: string;
  direction: MetricDirection;
  target: string | null;
  current: string | null;
  currentOn: string | null;
  progress: GoalProgress;
};

export type GoalMeasurement = {
  metric: {
    id: string;
    name: string;
    unit: string;
    direction: MetricDirection;
    target: string | null;
    current: string | null;
    currentOn: string | null;
  } | null;
  progress: GoalProgress;
  recent: MetricEntry[];
};

const listColumns = "id, name, kind, unit, aggregation, status, life_area_id";

export async function listMetrics(userId: string, status: MetricStatus, today: string): Promise<MetricListItem[]> {
  const { data, error } = await getAdminClient()
    .from("metrics")
    .select(listColumns)
    .eq("user_id", userId)
    .eq("status", status)
    .order("name");
  if (error) {
    throw new Error(error.message);
  }
  const displays = await displayValues(userId, today);
  return (data ?? []).map((row) => {
    const display = displays.get(row.id);
    return {
      id: row.id,
      name: row.name,
      kind: row.kind,
      unit: row.unit,
      aggregation: row.aggregation,
      status: row.status,
      lifeAreaId: typeof row.life_area_id === "number" ? row.life_area_id : null,
      displayValue: display?.displayValue ?? null,
      displayOn: display?.displayOn ?? null,
    };
  });
}

export async function listMetricChoices(userId: string): Promise<{ id: string; name: string; unit: string; goalId: string | null }[]> {
  const { data, error } = await getAdminClient()
    .from("metrics")
    .select("id, name, unit, goal_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("name");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    unit: row.unit,
    goalId: row.goal_id,
  }));
}

export async function getMetric(userId: string, metricId: string, today: string): Promise<MetricRecord | null> {
  const bounds = calendarMonthBounds(today);
  const { data, error } = await getAdminClient().rpc("read_metric", {
    p_user_id: userId,
    p_metric_id: metricId,
    p_today: today,
    p_month_start: bounds.start,
    p_month_end: bounds.end,
  });
  if (error) {
    throw new Error(error.message);
  }
  const row = asRecord(data);
  if (!row) {
    return null;
  }
  return {
    id: stringField(row, "id"),
    name: stringField(row, "name"),
    description: stringField(row, "description"),
    kind: stringField(row, "kind") as WorthMetric["kind"],
    unit: stringField(row, "unit"),
    aggregation: stringField(row, "aggregation") as MetricRecord["aggregation"],
    direction: stringField(row, "direction") as MetricDirection,
    target: textOrNull(row.target),
    status: stringField(row, "status") as MetricStatus,
    lifeAreaId: typeof row.lifeAreaId === "number" ? row.lifeAreaId : null,
    goalId: textOrNull(row.goalId),
    isPrimary: row.isPrimary === true,
    current: textOrNull(row.current),
    currentOn: textOrNull(row.currentOn),
  };
}

export async function listEntries(userId: string, metricId: string): Promise<MetricEntry[] | null> {
  const { data, error } = await getAdminClient().rpc("list_metric_entries", {
    p_user_id: userId,
    p_metric_id: metricId,
  });
  if (error) {
    throw new Error(error.message);
  }
  if (data === null) {
    return null;
  }
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map((entry) => {
    const row = asRecord(entry);
    return {
      id: stringField(row ?? {}, "id"),
      recordedOn: stringField(row ?? {}, "recordedOn"),
      value: stringField(row ?? {}, "value"),
      note: stringField(row ?? {}, "note"),
    };
  });
}

export async function loadNetWorth(userId: string, today: string): Promise<NetWorthView> {
  const { data, error } = await getAdminClient().rpc("user_net_worth", {
    p_user_id: userId,
    p_today: today,
  });
  if (error) {
    throw new Error(error.message);
  }
  const row = asRecord(data);
  const outcome = row?.outcome;
  const rows = Array.isArray(row?.rows) ? row.rows.flatMap(toNetWorthRow) : [];
  if (outcome === "total" && typeof row?.total === "string" && typeof row.unit === "string") {
    return { outcome: "total", unit: row.unit, total: decimalString(row.total), rows };
  }
  if (outcome === "missing_assets" || outcome === "missing_liabilities" || outcome === "mixed_units") {
    return { outcome, rows };
  }
  return { outcome: "missing_assets", rows };
}

export async function loadAreaCashFlow(
  userId: string,
  lifeAreaId: number,
  today: string,
): Promise<AreaCashFlow> {
  const bounds = calendarMonthBounds(today);
  const { data, error } = await getAdminClient().rpc("area_cash_flow", {
    p_user_id: userId,
    p_life_area_id: lifeAreaId,
    p_start: bounds.start,
    p_end: bounds.end,
  });
  if (error) {
    throw new Error(error.message);
  }
  const row = asRecord(data);
  if (
    row?.computed === true &&
    typeof row.unit === "string" &&
    typeof row.income === "string" &&
    typeof row.expense === "string" &&
    typeof row.net === "string"
  ) {
    return {
      computed: true,
      unit: row.unit,
      income: decimalString(row.income),
      expense: decimalString(row.expense),
      net: decimalString(row.net),
    };
  }
  return { computed: false };
}

export async function listGoalMeasurements(userId: string, today: string): Promise<GoalMeasurementSummary[]> {
  const bounds = calendarMonthBounds(today);
  const { data, error } = await getAdminClient().rpc("goal_measurements", {
    p_user_id: userId,
    p_today: today,
    p_month_start: bounds.start,
    p_month_end: bounds.end,
  });
  if (error) {
    throw new Error(error.message);
  }
  if (!Array.isArray(data)) {
    return [];
  }
  return data.flatMap((item) => {
    const row = asRecord(item);
    if (!row) {
      return [];
    }
    const direction = stringField(row, "direction") as MetricDirection;
    const current = textOrNull(row.current);
    const target = textOrNull(row.target);
    return [
      {
        goalId: stringField(row, "goalId"),
        metricId: stringField(row, "metricId"),
        name: stringField(row, "name"),
        unit: stringField(row, "unit"),
        direction,
        target,
        current,
        currentOn: textOrNull(row.currentOn),
        progress: goalProgress({ current, target, direction }),
      },
    ];
  });
}

export async function getGoalMeasurement(userId: string, goalId: string, today: string): Promise<GoalMeasurement> {
  const summary = (await listGoalMeasurements(userId, today)).find((item) => item.goalId === goalId) ?? null;
  if (!summary) {
    return { metric: null, progress: goalProgress({ current: null, target: null, direction: null }), recent: [] };
  }
  const entries = await listEntries(userId, summary.metricId);
  return {
    metric: {
      id: summary.metricId,
      name: summary.name,
      unit: summary.unit,
      direction: summary.direction,
      target: summary.target,
      current: summary.current,
      currentOn: summary.currentOn,
    },
    progress: summary.progress,
    recent: (entries ?? []).slice(0, 5),
  };
}

async function displayValues(userId: string, today: string): Promise<Map<string, { displayValue: string | null; displayOn: string | null }>> {
  const bounds = calendarMonthBounds(today);
  const { data, error } = await getAdminClient().rpc("metric_display_values", {
    p_user_id: userId,
    p_today: today,
    p_month_start: bounds.start,
    p_month_end: bounds.end,
  });
  if (error) {
    throw new Error(error.message);
  }
  const values = new Map<string, { displayValue: string | null; displayOn: string | null }>();
  if (!Array.isArray(data)) {
    return values;
  }
  for (const item of data) {
    const row = asRecord(item);
    if (!row) {
      continue;
    }
    values.set(stringField(row, "metric_id"), {
      displayValue: textOrNull(row.display_value),
      displayOn: textOrNull(row.display_on),
    });
  }
  return values;
}

function toNetWorthRow(value: unknown): NetWorthRow[] {
  const row = asRecord(value);
  if (!row || (row.kind !== "asset" && row.kind !== "liability")) {
    return [];
  }
  return [
    {
      id: stringField(row, "id"),
      name: stringField(row, "name"),
      kind: row.kind,
      unit: stringField(row, "unit"),
      value: stringField(row, "value"),
      recordedOn: stringField(row, "recordedOn"),
    },
  ];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function stringField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
