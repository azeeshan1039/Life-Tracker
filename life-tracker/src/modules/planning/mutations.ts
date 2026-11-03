import { readCivilDate } from "../../lib/dates";
import { getAdminClient } from "../../lib/supabase-admin";

export const PLAN_STATUSES = ["idea", "exploring", "decided", "active", "completed", "archived"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export type PlanWriteResult = { ok: true; id: string } | { ok: false; message: string };

const forward = new Set<PlanStatus>(["idea", "exploring", "decided", "active", "completed"]);

export function canChangeStatus(from: PlanStatus, to: PlanStatus): boolean {
  if (from === to) {
    return true;
  }
  if (to === "archived") {
    return true;
  }
  if (from === "archived") {
    return to === "exploring";
  }
  return forward.has(from) && forward.has(to);
}

export async function createPlan(userId: string, title: string, areaKey: string | null): Promise<PlanWriteResult> {
  const trimmed = title.trim();
  if (!trimmed) {
    return { ok: false, message: "Title is required." };
  }
  const areaId = areaKey ? await areaIdForKey(areaKey) : null;
  if (areaKey && areaId === null) {
    return { ok: false, message: "This area is not available." };
  }
  const { data, error } = await getAdminClient()
    .from("plans")
    .insert({ user_id: userId, title: trimmed, status: "idea" })
    .select("id")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  if (areaId !== null) {
    const link = await getAdminClient().from("plan_life_areas").insert({ plan_id: data.id, life_area_id: areaId });
    if (link.error) {
      throw new Error(link.error.message);
    }
  }
  return { ok: true, id: data.id };
}

export async function updatePlanDetails(
  userId: string,
  planId: string,
  input: { summary: string; body: string },
): Promise<PlanWriteResult> {
  const plan = await ownedPlan(userId, planId);
  if (!plan) {
    return { ok: false, message: "This plan is not available." };
  }
  const { error } = await getAdminClient()
    .from("plans")
    .update({
      summary: input.summary,
      body_markdown: input.body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  return { ok: true, id: planId };
}

export async function setPlanStatus(userId: string, planId: string, status: PlanStatus): Promise<PlanWriteResult> {
  const plan = await ownedPlan(userId, planId);
  if (!plan) {
    return { ok: false, message: "This plan is not available." };
  }
  if (!canChangeStatus(plan.status, status)) {
    return { ok: false, message: "That status change is not available." };
  }
  const now = new Date().toISOString();
  const patch: Record<string, string | null> = { status, updated_at: now };
  if (status === "decided" && !plan.decided_at) {
    patch.decided_at = now;
  }
  if (status === "completed") {
    patch.completed_at = now;
  } else {
    patch.completed_at = null;
  }
  if (status === "archived") {
    patch.archived_at = now;
  } else {
    patch.archived_at = null;
  }
  const { error } = await getAdminClient().from("plans").update(patch).eq("id", planId).eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  return { ok: true, id: planId };
}

export async function replacePlanLinks(
  userId: string,
  planId: string,
  input: { lifeAreaIds: number[]; goalIds: string[]; projectIds: string[] },
): Promise<PlanWriteResult> {
  const plan = await ownedPlan(userId, planId);
  if (!plan) {
    return { ok: false, message: "This plan is not available." };
  }
  const areas = [...new Set(input.lifeAreaIds)];
  const goals = [...new Set(input.goalIds.filter(Boolean))];
  const projects = [...new Set(input.projectIds.filter(Boolean))];
  if (!(await areasExist(areas)) || !(await rowsOwned("goals", userId, goals)) || !(await rowsOwned("projects", userId, projects))) {
    return { ok: false, message: "One of those links is not available." };
  }
  const supabase = getAdminClient();
  const cleared = await Promise.all([
    supabase.from("plan_life_areas").delete().eq("plan_id", planId),
    supabase.from("plan_goals").delete().eq("plan_id", planId),
    supabase.from("plan_projects").delete().eq("plan_id", planId),
  ]);
  for (const result of cleared) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }
  if (areas.length > 0) {
    const inserted = await supabase.from("plan_life_areas").insert(areas.map((lifeAreaId) => ({ plan_id: planId, life_area_id: lifeAreaId })));
    if (inserted.error) {
      throw new Error(inserted.error.message);
    }
  }
  if (goals.length > 0) {
    const inserted = await supabase.from("plan_goals").insert(goals.map((goalId) => ({ plan_id: planId, goal_id: goalId })));
    if (inserted.error) {
      throw new Error(inserted.error.message);
    }
  }
  if (projects.length > 0) {
    const inserted = await supabase.from("plan_projects").insert(projects.map((projectId) => ({ plan_id: planId, project_id: projectId })));
    if (inserted.error) {
      throw new Error(inserted.error.message);
    }
  }
  await touchPlan(userId, planId);
  return { ok: true, id: planId };
}

export async function addQuestion(userId: string, planId: string, question: string): Promise<PlanWriteResult> {
  if (!(await ownedPlan(userId, planId))) {
    return { ok: false, message: "This plan is not available." };
  }
  const text = question.trim();
  if (!text) {
    return { ok: false, message: "Question is required." };
  }
  const existing = await getAdminClient().from("plan_questions").select("sort_order").eq("plan_id", planId);
  if (existing.error) {
    throw new Error(existing.error.message);
  }
  const next = (existing.data ?? []).reduce((max, row) => Math.max(max, row.sort_order), -1) + 1;
  const { data, error } = await getAdminClient()
    .from("plan_questions")
    .insert({ plan_id: planId, question: text, sort_order: next })
    .select("id")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  await touchPlan(userId, planId);
  return { ok: true, id: data.id };
}

export async function setQuestionState(
  userId: string,
  planId: string,
  questionId: string,
  input: { status: "open" | "answered" | "dropped"; answer: string },
): Promise<PlanWriteResult> {
  if (!(await ownedPlan(userId, planId))) {
    return { ok: false, message: "This plan is not available." };
  }
  const { data, error } = await getAdminClient()
    .from("plan_questions")
    .update({ status: input.status, answer: input.answer })
    .eq("id", questionId)
    .eq("plan_id", planId)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return { ok: false, message: "This question is not available." };
  }
  await touchPlan(userId, planId);
  return { ok: true, id: questionId };
}

export async function moveQuestion(userId: string, planId: string, questionId: string, direction: "up" | "down"): Promise<PlanWriteResult> {
  if (!(await ownedPlan(userId, planId))) {
    return { ok: false, message: "This plan is not available." };
  }
  const { data, error } = await getAdminClient()
    .from("plan_questions")
    .select("id, sort_order")
    .eq("plan_id", planId)
    .order("sort_order");
  if (error) {
    throw new Error(error.message);
  }
  const rows = data ?? [];
  const index = rows.findIndex((row) => row.id === questionId);
  const swap = direction === "up" ? index - 1 : index + 1;
  const current = rows[index];
  const neighbor = rows[swap];
  if (!current || !neighbor) {
    return { ok: true, id: questionId };
  }
  const supabase = getAdminClient();
  const first = await supabase.from("plan_questions").update({ sort_order: neighbor.sort_order }).eq("id", current.id);
  const second = await supabase.from("plan_questions").update({ sort_order: current.sort_order }).eq("id", neighbor.id);
  if (first.error || second.error) {
    throw new Error(first.error?.message ?? second.error?.message ?? "Could not reorder.");
  }
  return { ok: true, id: questionId };
}

export async function addPlanLink(
  userId: string,
  planId: string,
  input: { url: string; title: string; note: string },
): Promise<PlanWriteResult> {
  if (!(await ownedPlan(userId, planId))) {
    return { ok: false, message: "This plan is not available." };
  }
  const url = parseHttpUrl(input.url);
  if (!url) {
    return { ok: false, message: "Link must be an http or https URL." };
  }
  const { data, error } = await getAdminClient()
    .from("plan_links")
    .insert({ plan_id: planId, url, title: input.title.trim(), note: input.note })
    .select("id")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  await touchPlan(userId, planId);
  return { ok: true, id: data.id };
}

export async function deletePlanLink(userId: string, planId: string, linkId: string): Promise<PlanWriteResult> {
  if (!(await ownedPlan(userId, planId))) {
    return { ok: false, message: "This plan is not available." };
  }
  const { error } = await getAdminClient().from("plan_links").delete().eq("id", linkId).eq("plan_id", planId);
  if (error) {
    throw new Error(error.message);
  }
  return { ok: true, id: linkId };
}

export async function ownedPlan(
  userId: string,
  planId: string,
): Promise<{ id: string; status: PlanStatus; decided_at: string | null } | null> {
  const { data, error } = await getAdminClient()
    .from("plans")
    .select("id, status, decided_at")
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  return { id: data.id, status: data.status, decided_at: data.decided_at };
}

export function parseHttpUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function parseDecisionDate(value: string): string | null {
  try {
    readCivilDate(value);
    return value;
  } catch {
    return null;
  }
}

async function areaIdForKey(key: string): Promise<number | null> {
  const { data, error } = await getAdminClient().from("life_areas").select("id").eq("key", key).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data?.id ?? null;
}

async function areasExist(ids: number[]): Promise<boolean> {
  if (ids.length === 0) {
    return true;
  }
  const { data, error } = await getAdminClient().from("life_areas").select("id").in("id", ids);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).length === ids.length;
}

async function rowsOwned(table: "goals" | "projects", userId: string, ids: string[]): Promise<boolean> {
  if (ids.length === 0) {
    return true;
  }
  const { data, error } = await getAdminClient().from(table).select("id").eq("user_id", userId).in("id", ids);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).length === ids.length;
}

async function touchPlan(userId: string, planId: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("plans")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", planId)
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
}
