import { compareDecimals, decimalString, percentRatio, subtractDecimals, sumDecimals } from "../../lib/decimal";

export type MetricDirection = "increase" | "decrease" | "maintain";

export type DatedValue = {
  recordedOn: string;
  value: string;
};

export type GoalProgress =
  | { mode: "missing" }
  | { mode: "values"; current: string; target: string; gap: string | null }
  | { mode: "bar"; current: string; target: string; percentText: string; barPercent: number };

export type WorthMetric = {
  kind: "general" | "asset" | "liability" | "income" | "expense";
  unit: string;
  aggregation: "latest" | "period_sum";
  value: string | null;
};

export type NetWorthDecision =
  | { outcome: "total"; unit: string; total: string }
  | { outcome: "missing_assets" | "missing_liabilities" | "mixed_units" };

export type CashFlowMetric = {
  kind: WorthMetric["kind"];
  unit: string;
  aggregation: "latest" | "period_sum";
  active: boolean;
  monthSum: string | null;
};

export type CashFlowDecision =
  | { computed: false }
  | { computed: true; unit: string; income: string; expense: string; net: string };

export function latestOnOrBefore(entries: DatedValue[], today: string): DatedValue | null {
  let chosen: DatedValue | null = null;
  for (const entry of entries) {
    if (entry.recordedOn > today) {
      continue;
    }
    if (!chosen || entry.recordedOn > chosen.recordedOn) {
      chosen = entry;
    }
  }
  return chosen;
}

export function periodSum(entries: DatedValue[], start: string, end: string): string | null {
  const inside = entries.filter((entry) => entry.recordedOn >= start && entry.recordedOn <= end);
  if (inside.length === 0) {
    return null;
  }
  return sumDecimals(inside.map((entry) => entry.value));
}

export function goalProgress(input: {
  current: string | null;
  target: string | null;
  direction: MetricDirection | null;
}): GoalProgress {
  if (!input.current || !input.target || !input.direction) {
    return { mode: "missing" };
  }
  const current = decimalString(input.current);
  const target = decimalString(input.target);
  if (input.direction === "maintain") {
    return { mode: "values", current, target, gap: subtractDecimals(current, target) };
  }
  if (input.direction === "decrease" && compareDecimals(target, "0") === 0) {
    return { mode: "values", current, target, gap: null };
  }
  if (input.direction === "increase" && compareDecimals(target, "0") <= 0) {
    return { mode: "values", current, target, gap: null };
  }
  if (input.direction === "decrease" && compareDecimals(target, "0") < 0) {
    return { mode: "values", current, target, gap: null };
  }
  const ratio =
    input.direction === "increase"
      ? percentRatio(current, target)
      : compareDecimals(current, target) <= 0
        ? { text: "100", bar: 100 }
        : percentRatio(target, current);
  if (!ratio || ratio.text.startsWith("-")) {
    return { mode: "values", current, target, gap: null };
  }
  return {
    mode: "bar",
    current,
    target,
    percentText: ratio.text,
    barPercent: ratio.bar,
  };
}

export function progressLines(progress: GoalProgress, unit: string): string[] {
  if (progress.mode === "missing") {
    return ["No measurement yet"];
  }
  const suffix = unit ? ` ${unit}` : "";
  const lines = [
    `Current ${trimDecimal(progress.current)}${suffix}`,
    `Target ${trimDecimal(progress.target)}${suffix}`,
  ];
  if (progress.mode === "values" && progress.gap !== null) {
    lines.push(`Gap ${trimDecimal(progress.gap)}${suffix}`);
  }
  if (progress.mode === "bar") {
    lines.push(`${progress.percentText}%`);
  }
  return lines;
}

export function decideNetWorth(metrics: WorthMetric[]): NetWorthDecision {
  const included = metrics.filter(
    (metric): metric is WorthMetric & { value: string } =>
      metric.value !== null && metric.aggregation === "latest" && (metric.kind === "asset" || metric.kind === "liability"),
  );
  const assets = included.filter((metric) => metric.kind === "asset");
  const liabilities = included.filter((metric) => metric.kind === "liability");
  if (assets.length === 0) {
    return { outcome: "missing_assets" };
  }
  if (liabilities.length === 0) {
    return { outcome: "missing_liabilities" };
  }
  const units = new Set(included.map((metric) => metric.unit));
  if (units.size !== 1) {
    return { outcome: "mixed_units" };
  }
  return {
    outcome: "total",
    unit: assets[0]?.unit ?? "",
    total: subtractDecimals(
      sumDecimals(assets.map((metric) => metric.value)),
      sumDecimals(liabilities.map((metric) => metric.value)),
    ),
  };
}

export function decideAreaCashFlow(metrics: CashFlowMetric[]): CashFlowDecision {
  const income = metrics.filter((metric) => metric.active && metric.kind === "income" && metric.aggregation === "period_sum");
  const expense = metrics.filter((metric) => metric.active && metric.kind === "expense" && metric.aggregation === "period_sum");
  const incomeMetric = income[0];
  const expenseMetric = expense[0];
  if (income.length !== 1 || expense.length !== 1 || !incomeMetric || !expenseMetric || incomeMetric.unit !== expenseMetric.unit) {
    return { computed: false };
  }
  const incomeSum = incomeMetric.monthSum ?? "0";
  const expenseSum = expenseMetric.monthSum ?? "0";
  return {
    computed: true,
    unit: incomeMetric.unit,
    income: decimalString(incomeSum),
    expense: decimalString(expenseSum),
    net: subtractDecimals(incomeSum, expenseSum),
  };
}

function trimDecimal(value: string): string {
  const [whole, fraction] = decimalString(value).split(".");
  const trimmed = (fraction ?? "").replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole ?? "0";
}
