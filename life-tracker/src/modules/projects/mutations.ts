import { readCivilDate } from "../../lib/dates";
import { getAdminClient } from "../../lib/supabase-admin";
import type { WorkStatus } from "../goals/goal-mutations";

export type ProjectInput = {
  title: string;
  description: string;
  startDate: string | null;
  targetDate: string | null;
  lifeAreaId: number | null;
};

export type ProjectWriteResult = { ok: true; id: string } | { ok: false; message: string };

export async function createProject(userId: string, input: ProjectInput): Promise<ProjectWriteResult> {
  const invalid = validateProject(input);
  if (invalid) {
    return { ok: false, message: invalid };
  }
  const { data, error } = await getAdminClient().from("projects").insert(projectRow(userId, input)).select("id").single();
  if (error) {
    return constraintMessage(error);
  }
  return { ok: true, id: data.id };
}

export async function updateProject(userId: string, projectId: string, input: ProjectInput): Promise<ProjectWriteResult> {
  const invalid = validateProject(input);
  if (invalid) {
    return { ok: false, message: invalid };
  }
  const { data, error } = await getAdminClient()
    .from("projects")
    .update({ ...projectRow(userId, input), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", projectId)
    .select("id")
    .maybeSingle();
  if (error) {
    return constraintMessage(error);
  }
  if (!data) {
    return { ok: false, message: "This project is not available." };
  }
  return { ok: true, id: data.id };
}

export async function setProjectStatus(userId: string, projectId: string, status: WorkStatus): Promise<ProjectWriteResult> {
  const now = new Date().toISOString();
  const patch: {
    status: WorkStatus;
    updated_at: string;
    archived_at?: string | null;
    completed_at?: string | null;
  } = { status, updated_at: now };
  if (status === "archived") {
    patch.archived_at = now;
  } else if (status === "completed") {
    patch.completed_at = now;
    patch.archived_at = null;
  } else {
    patch.completed_at = null;
    patch.archived_at = null;
  }
  const { data, error } = await getAdminClient()
    .from("projects")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", projectId)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return { ok: false, message: "This project is not available." };
  }
  return { ok: true, id: data.id };
}

export async function addMilestone(
  userId: string,
  projectId: string,
  input: { title: string; targetDate: string | null },
): Promise<ProjectWriteResult> {
  if (!input.title.trim()) {
    return { ok: false, message: "Title is required." };
  }
  if (!(await projectOwned(userId, projectId))) {
    return { ok: false, message: "This project is not available." };
  }
  if (input.targetDate) {
    try {
      readCivilDate(input.targetDate);
    } catch {
      return { ok: false, message: "Dates must be calendar days." };
    }
  }
  const existing = await getAdminClient().from("milestones").select("sort_order").eq("project_id", projectId);
  if (existing.error) {
    throw new Error(existing.error.message);
  }
  const nextOrder = (existing.data ?? []).reduce((max, row) => Math.max(max, row.sort_order), -1) + 1;
  const { data, error } = await getAdminClient()
    .from("milestones")
    .insert({
      project_id: projectId,
      title: input.title.trim(),
      target_date: input.targetDate,
      sort_order: nextOrder,
    })
    .select("id")
    .single();
  if (error) {
    return constraintMessage(error);
  }
  return { ok: true, id: data.id };
}

export async function moveMilestone(
  userId: string,
  projectId: string,
  milestoneId: string,
  direction: "up" | "down",
): Promise<ProjectWriteResult> {
  if (!(await projectOwned(userId, projectId))) {
    return { ok: false, message: "This project is not available." };
  }
  const { data, error } = await getAdminClient()
    .from("milestones")
    .select("id, sort_order")
    .eq("project_id", projectId)
    .order("sort_order")
    .order("id");
  if (error) {
    throw new Error(error.message);
  }
  const ordered = data ?? [];
  const index = ordered.findIndex((row) => row.id === milestoneId);
  if (index < 0) {
    return { ok: false, message: "This milestone is not available." };
  }
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= ordered.length) {
    return { ok: true, id: milestoneId };
  }
  const next = ordered.slice();
  const [item] = next.splice(index, 1);
  if (!item) {
    return { ok: false, message: "This milestone is not available." };
  }
  next.splice(target, 0, item);
  for (let order = 0; order < next.length; order += 1) {
    const row = next[order];
    if (!row) {
      continue;
    }
    const update = await getAdminClient().from("milestones").update({ sort_order: order }).eq("id", row.id).eq("project_id", projectId);
    if (update.error) {
      throw new Error(update.error.message);
    }
  }
  return { ok: true, id: milestoneId };
}

export async function markMilestoneDone(userId: string, projectId: string, milestoneId: string): Promise<ProjectWriteResult> {
  if (!(await projectOwned(userId, projectId))) {
    return { ok: false, message: "This project is not available." };
  }
  const { data, error } = await getAdminClient()
    .from("milestones")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("id", milestoneId)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return { ok: false, message: "This milestone is not available." };
  }
  return { ok: true, id: data.id };
}

export async function reopenMilestone(userId: string, projectId: string, milestoneId: string): Promise<ProjectWriteResult> {
  if (!(await projectOwned(userId, projectId))) {
    return { ok: false, message: "This project is not available." };
  }
  const { data, error } = await getAdminClient()
    .from("milestones")
    .update({ status: "open", completed_at: null })
    .eq("project_id", projectId)
    .eq("id", milestoneId)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return { ok: false, message: "This milestone is not available." };
  }
  return { ok: true, id: data.id };
}

export async function setProjectGoals(userId: string, projectId: string, goalIds: string[]): Promise<ProjectWriteResult> {
  if (!(await projectOwned(userId, projectId))) {
    return { ok: false, message: "This project is not available." };
  }
  const unique = [...new Set(goalIds)];
  if (unique.length > 0) {
    const goals = await getAdminClient().from("goals").select("id").eq("user_id", userId).in("id", unique);
    if (goals.error) {
      throw new Error(goals.error.message);
    }
    if ((goals.data ?? []).length !== unique.length) {
      return { ok: false, message: "This goal is not available." };
    }
  }
  const removed = await getAdminClient().from("project_goals").delete().eq("project_id", projectId);
  if (removed.error) {
    throw new Error(removed.error.message);
  }
  if (unique.length > 0) {
    const inserted = await getAdminClient()
      .from("project_goals")
      .insert(unique.map((goalId) => ({ project_id: projectId, goal_id: goalId })));
    if (inserted.error) {
      return constraintMessage(inserted.error);
    }
  }
  return { ok: true, id: projectId };
}

function projectRow(userId: string, input: ProjectInput) {
  return {
    user_id: userId,
    title: input.title.trim(),
    description: input.description,
    start_date: input.startDate,
    target_date: input.targetDate,
    life_area_id: input.lifeAreaId,
  };
}

function validateProject(input: ProjectInput): string | null {
  if (!input.title.trim()) {
    return "Title is required.";
  }
  for (const value of [input.startDate, input.targetDate]) {
    if (!value) {
      continue;
    }
    try {
      readCivilDate(value);
    } catch {
      return "Dates must be calendar days.";
    }
  }
  if (input.lifeAreaId !== null && (!Number.isInteger(input.lifeAreaId) || input.lifeAreaId <= 0)) {
    return "Life area is not available.";
  }
  return null;
}

async function projectOwned(userId: string, projectId: string): Promise<boolean> {
  const { data, error } = await getAdminClient()
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("id", projectId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return Boolean(data);
}

function constraintMessage(error: { code?: string; message: string }): ProjectWriteResult {
  if (error.code === "23514" || error.code === "23503" || error.code === "23505") {
    return { ok: false, message: "This project could not be saved." };
  }
  throw new Error(error.message);
}
