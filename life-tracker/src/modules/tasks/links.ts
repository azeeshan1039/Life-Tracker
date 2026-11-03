import { getAdminClient } from "../../lib/supabase-admin";
import { TASK_NOT_FOUND } from "./mutations";
import { getTask } from "./queries";

export type TaskLinkInput = {
  projectId: string | null;
  milestoneId: string | null;
  goalIds: string[];
};

export type TaskLinks = TaskLinkInput;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getTaskLinks(userId: string, taskId: string): Promise<TaskLinks | null> {
  const task = await getAdminClient()
    .from("tasks")
    .select("id, project_id, milestone_id")
    .eq("user_id", userId)
    .eq("id", taskId)
    .maybeSingle();
  if (task.error) {
    throw new Error(task.error.message);
  }
  if (!task.data) {
    return null;
  }
  const goals = await getAdminClient().from("task_goals").select("goal_id").eq("task_id", taskId);
  if (goals.error) {
    throw new Error(goals.error.message);
  }
  return {
    projectId: task.data.project_id,
    milestoneId: task.data.milestone_id,
    goalIds: (goals.data ?? []).map((row) => row.goal_id),
  };
}

export async function setTaskLinks(
  userId: string,
  taskId: string,
  input: TaskLinkInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const task = await getTask(userId, taskId);
  if (!task) {
    return { ok: false, message: TASK_NOT_FOUND };
  }
  const goalIds = [...new Set(input.goalIds)];
  if (input.projectId !== null && !uuidPattern.test(input.projectId)) {
    return { ok: false, message: "This project is not available." };
  }
  if (input.milestoneId !== null && !uuidPattern.test(input.milestoneId)) {
    return { ok: false, message: "This milestone is not available." };
  }
  if (goalIds.some((goalId) => !uuidPattern.test(goalId))) {
    return { ok: false, message: "This goal is not available." };
  }
  if (input.projectId) {
    const project = await getAdminClient().from("projects").select("id").eq("user_id", userId).eq("id", input.projectId).maybeSingle();
    if (project.error) {
      throw new Error(project.error.message);
    }
    if (!project.data) {
      return { ok: false, message: "This project is not available." };
    }
  }
  if (input.milestoneId) {
    const milestone = await getAdminClient().from("milestones").select("id, project_id").eq("id", input.milestoneId).maybeSingle();
    if (milestone.error) {
      throw new Error(milestone.error.message);
    }
    if (!milestone.data || milestone.data.project_id !== input.projectId) {
      return { ok: false, message: "This milestone is not available." };
    }
  }
  if (goalIds.length > 0) {
    const goals = await getAdminClient().from("goals").select("id").eq("user_id", userId).in("id", goalIds);
    if (goals.error) {
      throw new Error(goals.error.message);
    }
    if ((goals.data ?? []).length !== goalIds.length) {
      return { ok: false, message: "This goal is not available." };
    }
  }

  const updated = await getAdminClient()
    .from("tasks")
    .update({
      project_id: input.projectId,
      milestone_id: input.milestoneId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", taskId)
    .select("id")
    .maybeSingle();
  if (updated.error) {
    if (updated.error.code === "23503" || updated.error.code === "23514") {
      return { ok: false, message: "This task could not be saved." };
    }
    throw new Error(updated.error.message);
  }
  if (!updated.data) {
    return { ok: false, message: TASK_NOT_FOUND };
  }

  const removed = await getAdminClient().from("task_goals").delete().eq("task_id", taskId);
  if (removed.error) {
    throw new Error(removed.error.message);
  }
  if (goalIds.length > 0) {
    const inserted = await getAdminClient().from("task_goals").insert(goalIds.map((goalId) => ({ task_id: taskId, goal_id: goalId })));
    if (inserted.error) {
      throw new Error(inserted.error.message);
    }
  }
  return { ok: true };
}
