import { getAdminClient } from "../../lib/supabase-admin";
import type { WorkStatus } from "./goal-mutations";

export type GoalRecord = {
  id: string;
  title: string;
  description: string;
  status: WorkStatus;
  targetDate: string | null;
  lifeAreaId: number | null;
};

const goalColumns = "id, title, description, status, target_date, life_area_id";

export async function listGoals(userId: string, status: WorkStatus, lifeAreaId?: number | null): Promise<GoalRecord[]> {
  let query = getAdminClient().from("goals").select(goalColumns).eq("user_id", userId).eq("status", status).order("title");
  if (lifeAreaId) {
    query = query.eq("life_area_id", lifeAreaId);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(toGoal);
}

export async function listGoalChoices(userId: string): Promise<{ id: string; title: string }[]> {
  const { data, error } = await getAdminClient()
    .from("goals")
    .select("id, title")
    .eq("user_id", userId)
    .order("title");
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getGoal(userId: string, goalId: string): Promise<GoalRecord | null> {
  const { data, error } = await getAdminClient()
    .from("goals")
    .select(goalColumns)
    .eq("user_id", userId)
    .eq("id", goalId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? toGoal(data) : null;
}

export async function listProjectsForGoal(userId: string, goalId: string): Promise<{ id: string; title: string }[]> {
  const links = await getAdminClient().from("project_goals").select("project_id").eq("goal_id", goalId);
  if (links.error) {
    throw new Error(links.error.message);
  }
  const ids = (links.data ?? []).map((row) => row.project_id);
  if (ids.length === 0) {
    return [];
  }
  const { data, error } = await getAdminClient()
    .from("projects")
    .select("id, title")
    .eq("user_id", userId)
    .in("id", ids)
    .order("title");
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function listOpenTasksForGoal(userId: string, goalId: string): Promise<{ id: string; title: string }[]> {
  const links = await getAdminClient().from("task_goals").select("task_id").eq("goal_id", goalId);
  if (links.error) {
    throw new Error(links.error.message);
  }
  const ids = (links.data ?? []).map((row) => row.task_id);
  if (ids.length === 0) {
    return [];
  }
  const { data, error } = await getAdminClient()
    .from("tasks")
    .select("id, title")
    .eq("user_id", userId)
    .in("id", ids)
    .in("status", ["inbox", "todo", "in_progress"])
    .order("title");
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

function toGoal(row: {
  id: string;
  title: string;
  description: string;
  status: WorkStatus;
  target_date: string | null;
  life_area_id: number | null;
}): GoalRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    targetDate: row.target_date,
    lifeAreaId: row.life_area_id,
  };
}
