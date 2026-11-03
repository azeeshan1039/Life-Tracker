"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UnauthorizedError, requireUser } from "../../lib/current-user";
import type { WorkStatus } from "../goals/goal-mutations";
import {
  addMilestone,
  createProject,
  markMilestoneDone,
  moveMilestone,
  reopenMilestone,
  setProjectGoals,
  setProjectStatus,
  updateProject,
  type ProjectInput,
} from "./mutations";

export type ProjectFormState = {
  error: string;
  title: string;
  description: string;
  startDate: string;
  targetDate: string;
  lifeAreaId: string;
  saved: boolean;
  attempt: number;
};

export type MilestoneFormState = {
  error: string;
  title: string;
  targetDate: string;
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

export async function createProjectAction(previous: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const user = await currentUser();
  const fields = readProjectForm(formData, previous);
  const result = await createProject(user.id, fields.input);
  if (!result.ok) {
    return { ...fields.state, error: result.message };
  }
  revalidatePath("/projects");
  redirect(`/projects/${result.id}`);
}

export async function updateProjectAction(previous: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const user = await currentUser();
  const projectId = String(formData.get("projectId") ?? "");
  const fields = readProjectForm(formData, previous);
  const result = await updateProject(user.id, projectId, fields.input);
  if (!result.ok) {
    return { ...fields.state, error: result.message };
  }
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { ...fields.state, error: "", saved: true };
}

export async function setProjectStatusAction(formData: FormData): Promise<void> {
  const projectId = String(formData.get("projectId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!isWorkStatus(status)) {
    return;
  }
  const user = await currentUser();
  await setProjectStatus(user.id, projectId, status);
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function addMilestoneAction(previous: MilestoneFormState, formData: FormData): Promise<MilestoneFormState> {
  const title = String(formData.get("title") ?? "");
  const targetDate = String(formData.get("targetDate") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const kept = { title, targetDate, attempt: previous.attempt + 1 };
  const user = await currentUser();
  const result = await addMilestone(user.id, projectId, {
    title,
    targetDate: targetDate.trim() === "" ? null : targetDate.trim(),
  });
  if (!result.ok) {
    return { ...kept, error: result.message };
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/calendar");
  return { error: "", title: "", targetDate: "", attempt: kept.attempt };
}

export async function moveMilestoneAction(formData: FormData): Promise<void> {
  const projectId = String(formData.get("projectId") ?? "");
  const milestoneId = String(formData.get("milestoneId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (direction !== "up" && direction !== "down") {
    return;
  }
  const user = await currentUser();
  await moveMilestone(user.id, projectId, milestoneId, direction);
  revalidatePath(`/projects/${projectId}`);
}

export async function markMilestoneDoneAction(formData: FormData): Promise<void> {
  const projectId = String(formData.get("projectId") ?? "");
  const milestoneId = String(formData.get("milestoneId") ?? "");
  const user = await currentUser();
  await markMilestoneDone(user.id, projectId, milestoneId);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/calendar");
}

export async function reopenMilestoneAction(formData: FormData): Promise<void> {
  const projectId = String(formData.get("projectId") ?? "");
  const milestoneId = String(formData.get("milestoneId") ?? "");
  const user = await currentUser();
  await reopenMilestone(user.id, projectId, milestoneId);
  revalidatePath(`/projects/${projectId}`);
}

export async function setProjectGoalsAction(formData: FormData): Promise<void> {
  const projectId = String(formData.get("projectId") ?? "");
  const goalIds = formData.getAll("goalId").map(String).filter(Boolean);
  const user = await currentUser();
  await setProjectGoals(user.id, projectId, goalIds);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/goals");
}

function readProjectForm(formData: FormData, previous: ProjectFormState): { input: ProjectInput; state: ProjectFormState } {
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const targetDate = String(formData.get("targetDate") ?? "");
  const lifeAreaId = String(formData.get("lifeAreaId") ?? "");
  const state: ProjectFormState = {
    error: "",
    title,
    description,
    startDate,
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
      startDate: startDate.trim() === "" ? null : startDate.trim(),
      targetDate: targetDate.trim() === "" ? null : targetDate.trim(),
      lifeAreaId: area !== null && Number.isFinite(area) ? area : null,
    },
  };
}

function isWorkStatus(value: string): value is WorkStatus {
  return value === "active" || value === "paused" || value === "completed" || value === "archived";
}
