import { getAdminClient } from "../../lib/supabase-admin";
import type { PlanStatus } from "./mutations";

export type PlanCard = {
  id: string;
  title: string;
  status: PlanStatus;
  updatedAt: string;
  areas: { id: number; name: string }[];
};

export type PlanDetail = {
  id: string;
  title: string;
  status: PlanStatus;
  summary: string;
  body: string;
  updatedAt: string;
  areas: { id: number; name: string; key: string }[];
  goals: { id: string; title: string }[];
  projects: { id: string; title: string }[];
  questions: { id: string; question: string; status: string; answer: string; sortOrder: number }[];
  links: { id: string; url: string; title: string; note: string }[];
  options: { id: string; name: string; isChosen: boolean; sortOrder: number }[];
  criteria: { id: string; name: string; sortOrder: number }[];
  scores: { optionId: string; criterionId: string; score: number | null; note: string }[];
  decisions: { id: string; title: string; rationale: string; decidedOn: string; chosenOptionId: string | null; createdAt: string }[];
  actions: {
    id: string;
    title: string;
    notes: string;
    dueOn: string | null;
    status: string;
    taskId: string | null;
    taskTitle: string | null;
    taskStatus: string | null;
  }[];
};

export async function listPlans(userId: string): Promise<PlanCard[]> {
  const { data, error } = await getAdminClient()
    .from("plans")
    .select("id, title, status, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  const plans = data ?? [];
  const ids = plans.map((plan) => plan.id);
  const areaNames = await areasForPlans(ids);
  return plans.map((plan) => ({
    id: plan.id,
    title: plan.title,
    status: plan.status,
    updatedAt: plan.updated_at,
    areas: areaNames.get(plan.id) ?? [],
  }));
}

export async function loadPlan(userId: string, planId: string): Promise<PlanDetail | null> {
  const plan = await getAdminClient()
    .from("plans")
    .select("id, title, status, summary, body_markdown, updated_at")
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();
  if (plan.error) {
    throw new Error(plan.error.message);
  }
  if (!plan.data) {
    return null;
  }
  const [areas, goals, projects, questions, links, options, criteria, scores, decisions, actions] = await Promise.all([
    linkedAreas(planId),
    linkedGoals(planId),
    linkedProjects(planId),
    listQuestions(planId),
    listLinks(planId),
    listOptions(planId),
    listCriteria(planId),
    listScores(planId),
    listDecisions(planId),
    listActions(planId),
  ]);
  return {
    id: plan.data.id,
    title: plan.data.title,
    status: plan.data.status,
    summary: plan.data.summary,
    body: plan.data.body_markdown,
    updatedAt: plan.data.updated_at,
    areas,
    goals,
    projects,
    questions,
    links,
    options,
    criteria,
    scores,
    decisions,
    actions,
  };
}

async function areasForPlans(planIds: string[]): Promise<Map<string, { id: number; name: string }[]>> {
  const grouped = new Map<string, { id: number; name: string }[]>();
  if (planIds.length === 0) {
    return grouped;
  }
  const links = await getAdminClient().from("plan_life_areas").select("plan_id, life_area_id").in("plan_id", planIds);
  if (links.error) {
    throw new Error(links.error.message);
  }
  const areas = await getAdminClient().from("life_areas").select("id, name");
  if (areas.error) {
    throw new Error(areas.error.message);
  }
  const names = new Map((areas.data ?? []).map((area) => [area.id, area.name]));
  for (const link of links.data ?? []) {
    const name = names.get(link.life_area_id);
    if (!name) {
      continue;
    }
    const list = grouped.get(link.plan_id) ?? [];
    list.push({ id: link.life_area_id, name });
    grouped.set(link.plan_id, list);
  }
  return grouped;
}

async function linkedAreas(planId: string): Promise<{ id: number; name: string; key: string }[]> {
  const links = await getAdminClient().from("plan_life_areas").select("life_area_id").eq("plan_id", planId);
  if (links.error) {
    throw new Error(links.error.message);
  }
  const ids = (links.data ?? []).map((row) => row.life_area_id);
  if (ids.length === 0) {
    return [];
  }
  const areas = await getAdminClient().from("life_areas").select("id, key, name").in("id", ids).order("sort_order");
  if (areas.error) {
    throw new Error(areas.error.message);
  }
  return (areas.data ?? []).map((area) => ({ id: area.id, key: area.key, name: area.name }));
}

async function linkedGoals(planId: string): Promise<{ id: string; title: string }[]> {
  return titledLinks("plan_goals", "goal_id", "goals", planId);
}

async function linkedProjects(planId: string): Promise<{ id: string; title: string }[]> {
  return titledLinks("plan_projects", "project_id", "projects", planId);
}

async function titledLinks(
  linkTable: "plan_goals" | "plan_projects",
  column: "goal_id" | "project_id",
  table: "goals" | "projects",
  planId: string,
): Promise<{ id: string; title: string }[]> {
  const links = await getAdminClient().from(linkTable).select(column).eq("plan_id", planId);
  if (links.error) {
    throw new Error(links.error.message);
  }
  const ids = (links.data ?? [])
    .map((row) => ("goal_id" in row ? row.goal_id : row.project_id))
    .filter((id): id is string => typeof id === "string");
  if (ids.length === 0) {
    return [];
  }
  const rows = await getAdminClient().from(table).select("id, title").in("id", ids).order("title");
  if (rows.error) {
    throw new Error(rows.error.message);
  }
  return rows.data ?? [];
}

async function listQuestions(planId: string) {
  const { data, error } = await getAdminClient()
    .from("plan_questions")
    .select("id, question, status, answer, sort_order")
    .eq("plan_id", planId)
    .order("sort_order");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    question: row.question,
    status: row.status,
    answer: row.answer,
    sortOrder: row.sort_order,
  }));
}

async function listLinks(planId: string) {
  const { data, error } = await getAdminClient()
    .from("plan_links")
    .select("id, url, title, note")
    .eq("plan_id", planId)
    .order("created_at");
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

async function listOptions(planId: string) {
  const { data, error } = await getAdminClient()
    .from("plan_options")
    .select("id, name, is_chosen, sort_order")
    .eq("plan_id", planId)
    .order("sort_order");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    isChosen: row.is_chosen,
    sortOrder: row.sort_order,
  }));
}

async function listCriteria(planId: string) {
  const { data, error } = await getAdminClient()
    .from("plan_criteria")
    .select("id, name, sort_order")
    .eq("plan_id", planId)
    .order("sort_order");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, sortOrder: row.sort_order }));
}

async function listScores(planId: string) {
  const options = await listOptions(planId);
  const optionIds = options.map((option) => option.id);
  if (optionIds.length === 0) {
    return [];
  }
  const { data, error } = await getAdminClient()
    .from("plan_option_scores")
    .select("option_id, criterion_id, score, note")
    .in("option_id", optionIds);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    optionId: row.option_id,
    criterionId: row.criterion_id,
    score: row.score,
    note: row.note,
  }));
}

async function listDecisions(planId: string) {
  const { data, error } = await getAdminClient()
    .from("plan_decisions")
    .select("id, title, rationale_markdown, decided_on, chosen_option_id, created_at")
    .eq("plan_id", planId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    rationale: row.rationale_markdown,
    decidedOn: row.decided_on,
    chosenOptionId: row.chosen_option_id,
    createdAt: row.created_at,
  }));
}

async function listActions(planId: string) {
  const { data, error } = await getAdminClient()
    .from("plan_actions")
    .select("id, title, notes, due_on, status, task_id")
    .eq("plan_id", planId)
    .order("created_at");
  if (error) {
    throw new Error(error.message);
  }
  const rows = data ?? [];
  const taskIds = rows.map((row) => row.task_id).filter((id): id is string => typeof id === "string");
  const tasks = new Map<string, { title: string; status: string }>();
  if (taskIds.length > 0) {
    const found = await getAdminClient().from("tasks").select("id, title, status").in("id", taskIds);
    if (found.error) {
      throw new Error(found.error.message);
    }
    for (const task of found.data ?? []) {
      tasks.set(task.id, { title: task.title, status: task.status });
    }
  }
  return rows.map((row) => {
    const task = row.task_id ? tasks.get(row.task_id) : undefined;
    return {
      id: row.id,
      title: row.title,
      notes: row.notes,
      dueOn: row.due_on,
      status: row.status,
      taskId: row.task_id,
      taskTitle: task?.title ?? null,
      taskStatus: task?.status ?? null,
    };
  });
}
