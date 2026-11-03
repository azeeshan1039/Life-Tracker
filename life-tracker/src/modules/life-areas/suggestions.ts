import { getAdminClient } from "../../lib/supabase-admin";
import { createHabit } from "../habits/mutations";
import { createSuggestedMetric, createMetric } from "../measurements/mutations";
import { createProject } from "../projects/mutations";
import { findArea } from "./queries";

export type AreaSuggestion = {
  key: string;
  areaKey: string;
  label: string;
  hint: string | null;
};

const suggestions: AreaSuggestion[] = [
  { key: "business-project", areaKey: "business", label: "Delivery project", hint: null },
  { key: "business-revenue", areaKey: "business", label: "Revenue metric", hint: "Manual figures." },
  { key: "career-project", areaKey: "career", label: "Learning project", hint: null },
  { key: "career-practice", areaKey: "career", label: "Practice habit", hint: "Duration, in minutes." },
  { key: "health-walking", areaKey: "health", label: "Walking habit", hint: null },
  { key: "deen-fajr", areaKey: "deen", label: "Fajr on time", hint: null },
  { key: "deen-quran", areaKey: "deen", label: "Quran reading", hint: null },
  { key: "wealth-savings", areaKey: "wealth", label: "Savings", hint: null },
  { key: "wealth-income", areaKey: "wealth", label: "Income", hint: null },
  { key: "wealth-expenses", areaKey: "wealth", label: "Expenses", hint: null },
  { key: "wealth-liabilities", areaKey: "wealth", label: "Liabilities", hint: null },
  { key: "relationships-household", areaKey: "relationships", label: "Household task", hint: "Repeats every week." },
];

const wealthKeys: Record<string, "savings" | "income" | "expenses" | "liabilities"> = {
  "wealth-savings": "savings",
  "wealth-income": "income",
  "wealth-expenses": "expenses",
  "wealth-liabilities": "liabilities",
};

export function areaNotice(areaKey: string): string | null {
  if (areaKey === "deen") {
    return "These are private reminders. They are not a measure of faith.";
  }
  if (areaKey === "wealth") {
    return "Nothing here is a forecast.";
  }
  return null;
}

export function suggestionsFor(areaKey: string): AreaSuggestion[] {
  return suggestions.filter((item) => item.areaKey === areaKey);
}

export async function acceptSuggestion(
  userId: string,
  areaKey: string,
  suggestionKey: string,
  currencyCode: string,
  today: string,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const suggestion = suggestions.find((item) => item.key === suggestionKey && item.areaKey === areaKey);
  const area = await findArea(areaKey);
  if (!suggestion || !area) {
    return { ok: false, message: "That suggestion is not available." };
  }
  const wealthKey = wealthKeys[suggestion.key];
  if (wealthKey) {
    return createSuggestedMetric(userId, wealthKey, currencyCode, area.id);
  }
  if (suggestion.key === "business-revenue") {
    return createMetric(userId, {
      name: "Revenue",
      description: "Manual figures.",
      kind: "income",
      unit: currencyCode.trim() || "USD",
      aggregation: "period_sum",
      direction: "increase",
      target: null,
      lifeAreaId: area.id,
      goalId: null,
      primary: false,
    });
  }
  if (suggestion.key === "business-project" || suggestion.key === "career-project") {
    return createProject(userId, {
      title: suggestion.label,
      description: "",
      startDate: null,
      targetDate: null,
      lifeAreaId: area.id,
    });
  }
  if (suggestion.key === "career-practice") {
    return createHabit(userId, {
      title: "Practice",
      trackingType: "duration",
      unit: "minutes",
      targetValue: 30,
      scheduleKind: "weekly_quota",
      weekdays: [],
      weeklyTarget: 3,
      lifeAreaId: area.id,
    });
  }
  if (suggestion.key === "health-walking" || suggestion.key === "deen-fajr" || suggestion.key === "deen-quran") {
    return createHabit(userId, {
      title: suggestion.label,
      trackingType: "boolean",
      unit: null,
      targetValue: null,
      scheduleKind: "fixed_days",
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      weeklyTarget: null,
      lifeAreaId: area.id,
    });
  }
  if (suggestion.key === "relationships-household") {
    const { data, error } = await getAdminClient()
      .from("recurrence_series")
      .insert({
        user_id: userId,
        freq: "weekly",
        interval_count: 1,
        by_weekdays: [1],
        starts_on: today,
        title: "Household task",
        notes: "",
        priority: 1,
        life_area_id: area.id,
      })
      .select("id")
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return { ok: true, id: data.id };
  }
  return { ok: false, message: "That suggestion is not available." };
}
