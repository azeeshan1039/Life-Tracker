"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UnauthorizedError, requireUser } from "../../lib/current-user";
import { saveComparison } from "./compare";
import { addAction, dismissAction, recordDecision } from "./decisions";
import {
  addPlanLink,
  addQuestion,
  createPlan,
  deletePlanLink,
  moveQuestion,
  replacePlanLinks,
  setPlanStatus,
  setQuestionState,
  updatePlanDetails,
  PLAN_STATUSES,
  type PlanStatus,
} from "./mutations";
import { addCriterion, addOption, deleteOption } from "./compare";
import { promoteAction } from "./promote";

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

function refresh(planId: string) {
  revalidatePath("/plans");
  revalidatePath(`/plans/${planId}`);
  revalidatePath(`/plans/${planId}/compare`);
}

export async function createPlanAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  const area = String(formData.get("area") ?? "").trim();
  const result = await createPlan(user.id, String(formData.get("title") ?? ""), area === "" ? null : area);
  if (!result.ok) {
    const target = area === "" ? "/plans" : `/plans/new?area=${encodeURIComponent(area)}`;
    redirect(`${target}${target.includes("?") ? "&" : "?"}error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath("/plans");
  redirect(`/plans/${result.id}`);
}

export async function updatePlanDetailsAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const user = await currentUser();
  await updatePlanDetails(user.id, planId, {
    summary: String(formData.get("summary") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  refresh(planId);
}

export async function setPlanStatusAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!PLAN_STATUSES.includes(status as PlanStatus)) {
    return;
  }
  const user = await currentUser();
  await setPlanStatus(user.id, planId, status as PlanStatus);
  refresh(planId);
}

export async function replacePlanLinksAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const user = await currentUser();
  await replacePlanLinks(user.id, planId, {
    lifeAreaIds: formData.getAll("lifeAreaId").map(Number).filter((id) => Number.isInteger(id) && id > 0),
    goalIds: formData.getAll("goalId").map(String),
    projectIds: formData.getAll("projectId").map(String),
  });
  refresh(planId);
}

export async function addQuestionAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const user = await currentUser();
  await addQuestion(user.id, planId, String(formData.get("question") ?? ""));
  refresh(planId);
}

export async function answerQuestionAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const user = await currentUser();
  await setQuestionState(user.id, planId, String(formData.get("questionId") ?? ""), {
    status: "answered",
    answer: String(formData.get("answer") ?? ""),
  });
  refresh(planId);
}

export async function dropQuestionAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const user = await currentUser();
  await setQuestionState(user.id, planId, String(formData.get("questionId") ?? ""), { status: "dropped", answer: "" });
  refresh(planId);
}

export async function moveQuestionAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (direction !== "up" && direction !== "down") {
    return;
  }
  const user = await currentUser();
  await moveQuestion(user.id, planId, String(formData.get("questionId") ?? ""), direction);
  refresh(planId);
}

export async function addPlanLinkAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const user = await currentUser();
  await addPlanLink(user.id, planId, {
    url: String(formData.get("url") ?? ""),
    title: String(formData.get("title") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  refresh(planId);
}

export async function deletePlanLinkAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const user = await currentUser();
  await deletePlanLink(user.id, planId, String(formData.get("linkId") ?? ""));
  refresh(planId);
}

export async function addOptionAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const user = await currentUser();
  await addOption(user.id, planId, String(formData.get("name") ?? ""));
  refresh(planId);
}

export async function addCriterionAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const user = await currentUser();
  await addCriterion(user.id, planId, String(formData.get("name") ?? ""));
  refresh(planId);
}

export async function deleteOptionAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const user = await currentUser();
  await deleteOption(user.id, planId, String(formData.get("optionId") ?? ""));
  refresh(planId);
}

export async function saveComparisonAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const user = await currentUser();
  const cells = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("score:")) {
      continue;
    }
    const [, optionId, criterionId] = key.split(":");
    if (!optionId || !criterionId) {
      continue;
    }
    const raw = String(value).trim();
    const score = raw === "" ? null : Number(raw);
    const note = String(formData.get(`note:${optionId}:${criterionId}`) ?? "");
    cells.push({ optionId, criterionId, score, note });
  }
  const chosen = String(formData.get("chosenOptionId") ?? "").trim();
  await saveComparison(user.id, planId, { cells, chosenOptionId: chosen === "" ? null : chosen });
  refresh(planId);
}

export async function recordDecisionAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const user = await currentUser();
  const chosen = String(formData.get("chosenOptionId") ?? "").trim();
  await recordDecision(user.id, planId, {
    title: String(formData.get("title") ?? ""),
    rationale: String(formData.get("rationale") ?? ""),
    decidedOn: String(formData.get("decidedOn") ?? ""),
    chosenOptionId: chosen === "" ? null : chosen,
  });
  refresh(planId);
}

export async function addActionAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const due = String(formData.get("dueOn") ?? "").trim();
  const user = await currentUser();
  await addAction(user.id, planId, {
    title: String(formData.get("title") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    dueOn: due === "" ? null : due,
  });
  refresh(planId);
}

export async function dismissActionAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const user = await currentUser();
  await dismissAction(user.id, planId, String(formData.get("actionId") ?? ""));
  refresh(planId);
}

export async function promoteActionAction(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const user = await currentUser();
  await promoteAction(user.id, planId, String(formData.get("actionId") ?? ""));
  refresh(planId);
  revalidatePath("/tasks");
  revalidatePath("/today");
}
