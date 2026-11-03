import { readCivilDate } from "../../lib/dates";
import { getAdminClient } from "../../lib/supabase-admin";

export const WORK_STATUSES = ["active", "paused", "completed", "archived"] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];

export type GoalInput = {
  title: string;
  description: string;
  targetDate: string | null;
  lifeAreaId: number | null;
};

export type GoalWriteResult = { ok: true; id: string } | { ok: false; message: string };

export async function createGoal(userId: string, input: GoalInput): Promise<GoalWriteResult> {
  const invalid = validateGoal(input);
  if (invalid) {
    return { ok: false, message: invalid };
  }
  const { data, error } = await getAdminClient()
    .from("goals")
    .insert(goalRow(userId, input))
    .select("id")
    .single();
  if (error) {
    return constraintMessage(error);
  }
  return { ok: true, id: data.id };
}

export async function updateGoal(userId: string, goalId: string, input: GoalInput): Promise<GoalWriteResult> {
  const invalid = validateGoal(input);
  if (invalid) {
    return { ok: false, message: invalid };
  }
  const { data, error } = await getAdminClient()
    .from("goals")
    .update({ ...goalRow(userId, input), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", goalId)
    .select("id")
    .maybeSingle();
  if (error) {
    return constraintMessage(error);
  }
  if (!data) {
    return { ok: false, message: "This goal is not available." };
  }
  return { ok: true, id: data.id };
}

export async function setGoalStatus(userId: string, goalId: string, status: WorkStatus): Promise<GoalWriteResult> {
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
    .from("goals")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", goalId)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return { ok: false, message: "This goal is not available." };
  }
  return { ok: true, id: data.id };
}

export async function linkGoalToProject(userId: string, projectId: string, goalId: string): Promise<GoalWriteResult> {
  const owned = await projectOwned(userId, projectId);
  if (!owned) {
    return { ok: false, message: "This project is not available." };
  }
  const goal = await getAdminClient().from("goals").select("id").eq("user_id", userId).eq("id", goalId).maybeSingle();
  if (goal.error) {
    throw new Error(goal.error.message);
  }
  if (!goal.data) {
    return { ok: false, message: "This goal is not available." };
  }
  const { error } = await getAdminClient().from("project_goals").upsert(
    { project_id: projectId, goal_id: goalId },
    { onConflict: "project_id,goal_id", ignoreDuplicates: true },
  );
  if (error) {
    return constraintMessage(error);
  }
  return { ok: true, id: goalId };
}

function goalRow(userId: string, input: GoalInput) {
  return {
    user_id: userId,
    title: input.title.trim(),
    description: input.description,
    target_date: input.targetDate,
    life_area_id: input.lifeAreaId,
  };
}

function validateGoal(input: GoalInput): string | null {
  if (!input.title.trim()) {
    return "Title is required.";
  }
  if (input.targetDate) {
    try {
      readCivilDate(input.targetDate);
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

function constraintMessage(error: { code?: string; message: string }): GoalWriteResult {
  if (error.code === "23514" || error.code === "23503" || error.code === "23505") {
    return { ok: false, message: "This goal could not be saved." };
  }
  throw new Error(error.message);
}
