export const WIDGET_IDS = ["today", "habits", "upcoming", "pinned_goals", "inbox"] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

export type DashboardConfig = {
  pinnedGoalIds: string[];
  hiddenWidgets: WidgetId[];
};

export const emptyDashboardConfig: DashboardConfig = {
  pinnedGoalIds: [],
  hiddenWidgets: [],
};

export function parseDashboardConfig(value: unknown): DashboardConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyDashboardConfig;
  }
  const record = value as Record<string, unknown>;
  return {
    pinnedGoalIds: stringList(record.pinnedGoalIds).slice(0, 3),
    hiddenWidgets: stringList(record.hiddenWidgets).filter(isWidgetId),
  };
}

export function visibleWidgets(config: DashboardConfig): WidgetId[] {
  const hidden = new Set(config.hiddenWidgets);
  return WIDGET_IDS.filter((id) => !hidden.has(id));
}

export function isWidgetId(value: string): value is WidgetId {
  return WIDGET_IDS.some((id) => id === value);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0 || seen.has(item)) {
      continue;
    }
    seen.add(item);
    ids.push(item);
  }
  return ids;
}
