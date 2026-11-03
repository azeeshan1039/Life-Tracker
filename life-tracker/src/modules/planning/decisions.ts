import { getAdminClient } from "../../lib/supabase-admin";
import { ownedPlan, parseDecisionDate, type PlanWriteResult } from "./mutations";

export async function recordDecision(
  userId: string,
  planId: string,
  input: { title: string; rationale: string; decidedOn: string; chosenOptionId: string | null },
): Promise<PlanWriteResult> {
  if (!(await ownedPlan(userId, planId))) {
    return { ok: false, message: "This plan is not available." };
  }
  const title = input.title.trim();
  if (!title) {
    return { ok: false, message: "Title is required." };
  }
  const decidedOn = parseDecisionDate(input.decidedOn);
  if (!decidedOn) {
    return { ok: false, message: "Dates must be calendar days." };
  }
  if (input.chosenOptionId) {
    const option = await getAdminClient()
      .from("plan_options")
      .select("id")
      .eq("id", input.chosenOptionId)
      .eq("plan_id", planId)
      .maybeSingle();
    if (option.error) {
      throw new Error(option.error.message);
    }
    if (!option.data) {
      return { ok: false, message: "That option is not available." };
    }
  }
  const { data, error } = await getAdminClient()
    .from("plan_decisions")
    .insert({
      plan_id: planId,
      title,
      rationale_markdown: input.rationale,
      decided_on: decidedOn,
      chosen_option_id: input.chosenOptionId,
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  const status = await getAdminClient().from("plans").select("status").eq("id", planId).eq("user_id", userId).single();
  if (status.error) {
    throw new Error(status.error.message);
  }
  return { ok: true, id: data.id };
}

export async function addAction(
  userId: string,
  planId: string,
  input: { title: string; notes: string; dueOn: string | null },
): Promise<PlanWriteResult> {
  if (!(await ownedPlan(userId, planId))) {
    return { ok: false, message: "This plan is not available." };
  }
  const title = input.title.trim();
  if (!title) {
    return { ok: false, message: "Title is required." };
  }
  if (input.dueOn && !parseDecisionDate(input.dueOn)) {
    return { ok: false, message: "Dates must be calendar days." };
  }
  const { data, error } = await getAdminClient()
    .from("plan_actions")
    .insert({ plan_id: planId, title, notes: input.notes, due_on: input.dueOn, status: "proposed" })
    .select("id")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return { ok: true, id: data.id };
}

export async function dismissAction(userId: string, planId: string, actionId: string): Promise<PlanWriteResult> {
  if (!(await ownedPlan(userId, planId))) {
    return { ok: false, message: "This plan is not available." };
  }
  const { data, error } = await getAdminClient()
    .from("plan_actions")
    .update({ status: "dismissed" })
    .eq("id", actionId)
    .eq("plan_id", planId)
    .eq("status", "proposed")
    .is("task_id", null)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return { ok: false, message: "This action is not available." };
  }
  return { ok: true, id: actionId };
}
