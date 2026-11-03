import { getAdminClient } from "../../lib/supabase-admin";
import { ownedPlan, type PlanWriteResult } from "./mutations";

export async function promoteAction(userId: string, planId: string, actionId: string): Promise<PlanWriteResult> {
  if (!(await ownedPlan(userId, planId))) {
    return { ok: false, message: "This plan is not available." };
  }
  const { data, error } = await getAdminClient().rpc("promote_plan_action", {
    p_user_id: userId,
    p_action_id: actionId,
  });
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return { ok: false, message: "This action is not available." };
  }
  return { ok: true, id: data };
}

export async function promoteActionForcingFailure(userId: string, actionId: string): Promise<{ ok: false; message: string }> {
  const { error } = await getAdminClient().rpc("promote_plan_action", {
    p_user_id: userId,
    p_action_id: actionId,
    p_force_error: true,
  });
  return { ok: false, message: error?.message ?? "forced promote failure" };
}
