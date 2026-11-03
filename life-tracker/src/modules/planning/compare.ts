import { getAdminClient } from "../../lib/supabase-admin";
import { ownedPlan, type PlanWriteResult } from "./mutations";

export type ScoreCell = {
  optionId: string;
  criterionId: string;
  score: number | null;
  note: string;
};

export async function addOption(userId: string, planId: string, name: string): Promise<PlanWriteResult> {
  if (!(await ownedPlan(userId, planId))) {
    return { ok: false, message: "This plan is not available." };
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, message: "Name is required." };
  }
  const sort = await nextSort("plan_options", planId);
  const { data, error } = await getAdminClient()
    .from("plan_options")
    .insert({ plan_id: planId, name: trimmed, sort_order: sort })
    .select("id")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return { ok: true, id: data.id };
}

export async function addCriterion(userId: string, planId: string, name: string): Promise<PlanWriteResult> {
  if (!(await ownedPlan(userId, planId))) {
    return { ok: false, message: "This plan is not available." };
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, message: "Name is required." };
  }
  const sort = await nextSort("plan_criteria", planId);
  const { data, error } = await getAdminClient()
    .from("plan_criteria")
    .insert({ plan_id: planId, name: trimmed, sort_order: sort })
    .select("id")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return { ok: true, id: data.id };
}

export async function deleteOption(userId: string, planId: string, optionId: string): Promise<PlanWriteResult> {
  if (!(await ownedPlan(userId, planId))) {
    return { ok: false, message: "This plan is not available." };
  }
  const { error } = await getAdminClient().from("plan_options").delete().eq("id", optionId).eq("plan_id", planId);
  if (error) {
    throw new Error(error.message);
  }
  return { ok: true, id: optionId };
}

export async function saveComparison(
  userId: string,
  planId: string,
  input: { cells: ScoreCell[]; chosenOptionId: string | null },
): Promise<PlanWriteResult> {
  if (!(await ownedPlan(userId, planId))) {
    return { ok: false, message: "This plan is not available." };
  }
  for (const cell of input.cells) {
    if (cell.score !== null && (!Number.isInteger(cell.score) || cell.score < 1 || cell.score > 5)) {
      return { ok: false, message: "Scores are from 1 to 5, or blank." };
    }
  }
  const options = await idsFor("plan_options", planId);
  const criteria = await idsFor("plan_criteria", planId);
  for (const cell of input.cells) {
    if (!options.has(cell.optionId) || !criteria.has(cell.criterionId)) {
      return { ok: false, message: "That score is not available." };
    }
  }
  if (input.chosenOptionId && !options.has(input.chosenOptionId)) {
    return { ok: false, message: "That option is not available." };
  }
  for (const cell of input.cells) {
    const { error } = await getAdminClient().from("plan_option_scores").upsert({
      option_id: cell.optionId,
      criterion_id: cell.criterionId,
      score: cell.score,
      note: cell.note,
    });
    if (error) {
      throw new Error(error.message);
    }
  }
  const chosen = await getAdminClient().rpc("choose_plan_option", {
    p_user_id: userId,
    p_plan_id: planId,
    p_option_id: input.chosenOptionId,
  });
  if (chosen.error) {
    throw new Error(chosen.error.message);
  }
  if (!chosen.data) {
    return { ok: false, message: "This plan is not available." };
  }
  return { ok: true, id: planId };
}

async function nextSort(table: "plan_options" | "plan_criteria", planId: string): Promise<number> {
  const { data, error } = await getAdminClient().from(table).select("sort_order").eq("plan_id", planId);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).reduce((max, row) => Math.max(max, row.sort_order), -1) + 1;
}

async function idsFor(table: "plan_options" | "plan_criteria", planId: string): Promise<Set<string>> {
  const { data, error } = await getAdminClient().from(table).select("id").eq("plan_id", planId);
  if (error) {
    throw new Error(error.message);
  }
  return new Set((data ?? []).map((row) => row.id));
}
