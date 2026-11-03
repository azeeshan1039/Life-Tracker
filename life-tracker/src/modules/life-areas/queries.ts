import { getAdminClient } from "../../lib/supabase-admin";
import { loadAreaCashFlow } from "../measurements/queries";

export type LifeArea = {
  id: number;
  key: string;
  name: string;
  purpose: string;
};

export type AreaCounts = {
  goals: number;
  projects: number;
  tasks: number;
  habits: number;
  metrics: number;
};

export type AreaPreview = {
  id: string;
  title: string;
};

export type AreaCard = LifeArea & AreaCounts;

export type AreaCashLine = {
  unit: string;
  income: string;
  expense: string;
  net: string;
};

export type AreaDetail = AreaCard & {
  goalsList: AreaPreview[];
  projectsList: AreaPreview[];
  tasksList: AreaPreview[];
  habitsList: AreaPreview[];
  metricsList: AreaPreview[];
  cashFlow: AreaCashLine | null;
};

const openTaskStatuses = ["inbox", "todo", "in_progress"];
const previewLimit = 5;

export async function listAreas(): Promise<LifeArea[]> {
  const { data, error } = await getAdminClient()
    .from("life_areas")
    .select("id, key, name, purpose, sort_order")
    .order("sort_order", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    purpose: row.purpose,
  }));
}

export async function findArea(key: string): Promise<LifeArea | null> {
  const areas = await listAreas();
  return areas.find((area) => area.key === key) ?? null;
}

export async function listAreaCards(userId: string): Promise<AreaCard[]> {
  const areas = await listAreas();
  const counts = await countRows(userId);
  return areas.map((area) => ({
    ...area,
    goals: counts.goals.get(area.id) ?? 0,
    projects: counts.projects.get(area.id) ?? 0,
    tasks: counts.tasks.get(area.id) ?? 0,
    habits: counts.habits.get(area.id) ?? 0,
    metrics: counts.metrics.get(area.id) ?? 0,
  }));
}

export async function loadArea(userId: string, key: string, today: string): Promise<AreaDetail | null> {
  const area = await findArea(key);
  if (!area) {
    return null;
  }
  const [cards, goalsList, projectsList, tasksList, habitsList, metricsList, flow] = await Promise.all([
    listAreaCards(userId),
    preview("goals", userId, area.id, { status: "active" }),
    preview("projects", userId, area.id, { status: "active" }),
    preview("tasks", userId, area.id, { statuses: openTaskStatuses }),
    preview("habits", userId, area.id, { status: "active" }),
    preview("metrics", userId, area.id, { status: "active" }),
    loadAreaCashFlow(userId, area.id, today),
  ]);
  const card = cards.find((item) => item.id === area.id);
  if (!card) {
    return null;
  }
  return {
    ...card,
    goalsList,
    projectsList,
    tasksList,
    habitsList,
    metricsList,
    cashFlow: flow.computed
      ? { unit: flow.unit, income: flow.income, expense: flow.expense, net: flow.net }
      : null,
  };
}

async function countRows(userId: string): Promise<Record<keyof AreaCounts, Map<number, number>>> {
  const [goals, projects, tasks, habits, metrics] = await Promise.all([
    idsFor("goals", userId, { status: "active" }),
    idsFor("projects", userId, { status: "active" }),
    idsFor("tasks", userId, { statuses: openTaskStatuses }),
    idsFor("habits", userId, { status: "active" }),
    idsFor("metrics", userId, { status: "active" }),
  ]);
  return { goals, projects, tasks, habits, metrics };
}

async function idsFor(
  table: "goals" | "projects" | "tasks" | "habits" | "metrics",
  userId: string,
  filter: { status?: string; statuses?: string[] },
): Promise<Map<number, number>> {
  let query = getAdminClient().from(table).select("life_area_id").eq("user_id", userId);
  if (filter.statuses) {
    query = query.in("status", filter.statuses);
  } else if (filter.status) {
    query = query.eq("status", filter.status);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  const counts = new Map<number, number>();
  for (const row of data ?? []) {
    if (typeof row.life_area_id !== "number") {
      continue;
    }
    counts.set(row.life_area_id, (counts.get(row.life_area_id) ?? 0) + 1);
  }
  return counts;
}

async function preview(
  table: "goals" | "projects" | "tasks" | "habits" | "metrics",
  userId: string,
  lifeAreaId: number,
  filter: { status?: string; statuses?: string[] },
): Promise<AreaPreview[]> {
  const titleColumn = table === "metrics" ? "name" : "title";
  let query = getAdminClient()
    .from(table)
    .select(`id, ${titleColumn}`)
    .eq("user_id", userId)
    .eq("life_area_id", lifeAreaId)
    .order(titleColumn)
    .limit(previewLimit);
  if (filter.statuses) {
    query = query.in("status", filter.statuses);
  } else if (filter.status) {
    query = query.eq("status", filter.status);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row[titleColumn],
  }));
}
