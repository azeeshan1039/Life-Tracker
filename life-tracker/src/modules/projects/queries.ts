import { getAdminClient } from "../../lib/supabase-admin";
import type { CalendarMilestone } from "../tasks/calendar";
import type { WorkStatus } from "../goals/goal-mutations";

export type ProjectRecord = {
  id: string;
  title: string;
  description: string;
  status: WorkStatus;
  startDate: string | null;
  targetDate: string | null;
  lifeAreaId: number | null;
};

export type MilestoneRecord = {
  id: string;
  projectId: string;
  title: string;
  targetDate: string | null;
  status: "open" | "done";
  completedAt: string | null;
  sortOrder: number;
};

const projectColumns = "id, title, description, status, start_date, target_date, life_area_id";

export async function listProjects(userId: string, status: WorkStatus, lifeAreaId?: number | null): Promise<ProjectRecord[]> {
  let query = getAdminClient().from("projects").select(projectColumns).eq("user_id", userId).eq("status", status).order("title");
  if (lifeAreaId) {
    query = query.eq("life_area_id", lifeAreaId);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(toProject);
}

export async function listProjectChoices(userId: string): Promise<{ id: string; title: string }[]> {
  const { data, error } = await getAdminClient().from("projects").select("id, title").eq("user_id", userId).order("title");
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getProject(userId: string, projectId: string): Promise<ProjectRecord | null> {
  const { data, error } = await getAdminClient()
    .from("projects")
    .select(projectColumns)
    .eq("user_id", userId)
    .eq("id", projectId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? toProject(data) : null;
}

export async function listMilestones(userId: string, projectId: string): Promise<MilestoneRecord[]> {
  const project = await getProject(userId, projectId);
  if (!project) {
    return [];
  }
  const { data, error } = await getAdminClient()
    .from("milestones")
    .select("id, project_id, title, target_date, status, completed_at, sort_order")
    .eq("project_id", projectId)
    .order("sort_order")
    .order("id");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(toMilestone);
}

export async function listMilestonesForUser(userId: string): Promise<MilestoneRecord[]> {
  const projects = await getAdminClient().from("projects").select("id").eq("user_id", userId);
  if (projects.error) {
    throw new Error(projects.error.message);
  }
  const ids = (projects.data ?? []).map((row) => row.id);
  if (ids.length === 0) {
    return [];
  }
  const { data, error } = await getAdminClient()
    .from("milestones")
    .select("id, project_id, title, target_date, status, completed_at, sort_order")
    .in("project_id", ids)
    .order("sort_order");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(toMilestone);
}

export async function listCalendarMilestones(userId: string): Promise<CalendarMilestone[]> {
  const milestones = await listMilestonesForUser(userId);
  return milestones
    .filter((milestone): milestone is MilestoneRecord & { targetDate: string } => milestone.targetDate !== null)
    .map((milestone) => ({
      id: milestone.id,
      projectId: milestone.projectId,
      title: milestone.title,
      targetDate: milestone.targetDate,
    }));
}

export async function listProjectGoalIds(userId: string, projectId: string): Promise<string[]> {
  const project = await getProject(userId, projectId);
  if (!project) {
    return [];
  }
  const { data, error } = await getAdminClient().from("project_goals").select("goal_id").eq("project_id", projectId);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => row.goal_id);
}

export async function listProjectTasks(
  userId: string,
  projectId: string,
): Promise<{ id: string; title: string; milestoneId: string | null; status: string }[]> {
  const { data, error } = await getAdminClient()
    .from("tasks")
    .select("id, title, milestone_id, status")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .in("status", ["inbox", "todo", "in_progress"])
    .order("title");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    milestoneId: row.milestone_id,
    status: row.status,
  }));
}

function toProject(row: {
  id: string;
  title: string;
  description: string;
  status: WorkStatus;
  start_date: string | null;
  target_date: string | null;
  life_area_id: number | null;
}): ProjectRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    startDate: row.start_date,
    targetDate: row.target_date,
    lifeAreaId: row.life_area_id,
  };
}

function toMilestone(row: {
  id: string;
  project_id: string;
  title: string;
  target_date: string | null;
  status: "open" | "done";
  completed_at: string | null;
  sort_order: number;
}): MilestoneRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    targetDate: row.target_date,
    status: row.status,
    completedAt: row.completed_at,
    sortOrder: row.sort_order,
  };
}
