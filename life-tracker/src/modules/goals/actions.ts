"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UnauthorizedError, requireUser } from "../../lib/current-user";
import { createGoal, linkGoalToProject, setGoalStatus, updateGoal, type GoalInput, type WorkStatus } from "./goal-mutations";

export type GoalFormState = {
  error: string;
  title: string;
  description: string;
  targetDate: string;
  lifeAreaId: string;
  saved: boolean;
  attempt: number;
};

async function currentUser() {
  try {
    return await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    throw error;
  }
}

export async function createGoalAction(previous: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const user = await currentUser();
  const fields = readGoalForm(formData, previous);
  const result = await createGoal(user.id, fields.input);
  if (!result.ok) {
    return { ...fields.state, error: result.message };
  }
  const projectId = String(formData.get("projectId") ?? "");
  if (projectId) {
    const linked = await linkGoalToProject(user.id, projectId, result.id);
    if (!linked.ok) {
      return { ...fields.state, error: linked.message };
    }
    revalidatePath(`/projects/${projectId}`);
    redirect(`/projects/${projectId}`);
  }
  revalidatePath("/goals");
  redirect(`/goals/${result.id}`);
}

export async function updateGoalAction(previous: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const user = await currentUser();
  const goalId = String(formData.get("goalId") ?? "");
  const fields = readGoalForm(formData, previous);
  const result = await updateGoal(user.id, goalId, fields.input);
  if (!result.ok) {
    return { ...fields.state, error: result.message };
  }
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  return { ...fields.state, error: "", saved: true };
}

export async function setGoalStatusAction(formData: FormData): Promise<void> {
  const goalId = String(formData.get("goalId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!isWorkStatus(status)) {
    return;
  }
  const user = await currentUser();
  await setGoalStatus(user.id, goalId, status);
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/projects");
}

function readGoalForm(formData: FormData, previous: GoalFormState): { input: GoalInput; state: GoalFormState } {
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const targetDate = String(formData.get("targetDate") ?? "");
  const lifeAreaId = String(formData.get("lifeAreaId") ?? "");
  const state: GoalFormState = {
    error: "",
    title,
    description,
    targetDate,
    lifeAreaId,
    saved: false,
    attempt: previous.attempt + 1,
  };
  const area = lifeAreaId.trim() === "" ? null : Number(lifeAreaId);
  return {
    state,
    input: {
      title,
      description,
      targetDate: targetDate.trim() === "" ? null : targetDate.trim(),
      lifeAreaId: area !== null && Number.isFinite(area) ? area : null,
    },
  };
}

function isWorkStatus(value: string): value is WorkStatus {
  return value === "active" || value === "paused" || value === "completed" || value === "archived";
}
