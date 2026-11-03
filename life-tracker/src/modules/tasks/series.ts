import { getAdminClient } from "../../lib/supabase-admin";

export type SeriesTemplateInput = {
  title: string;
  notes: string;
  priority: number;
  estimatedMinutes: number | null;
  lifeAreaId: number | null;
};

export async function updateSeriesTemplate(
  userId: string,
  seriesId: string,
  today: string,
  input: SeriesTemplateInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const invalid = validateTemplate(input);
  if (invalid) {
    return { ok: false, message: invalid };
  }
  const { data, error } = await getAdminClient().rpc("apply_series_template", {
    p_user_id: userId,
    p_series_id: seriesId,
    p_today: today,
    p_title: input.title.trim(),
    p_notes: input.notes,
    p_priority: input.priority,
    p_estimated_minutes: input.estimatedMinutes,
    p_life_area_id: input.lifeAreaId,
  });
  if (error) {
    if (error.code === "23514") {
      return { ok: false, message: "This repeating task could not be saved." };
    }
    throw new Error(error.message);
  }
  if (!data) {
    return { ok: false, message: "This task is not available." };
  }
  return { ok: true };
}

export async function replaceSeriesGoals(
  userId: string,
  seriesId: string,
  today: string,
  goalIds: string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await getAdminClient().rpc("replace_series_goals", {
    p_user_id: userId,
    p_series_id: seriesId,
    p_today: today,
    p_goal_ids: goalIds,
  });
  if (error) {
    if (error.code === "23503") {
      return { ok: false, message: "This goal is not available." };
    }
    throw new Error(error.message);
  }
  if (!data) {
    return { ok: false, message: "This task is not available." };
  }
  return { ok: true };
}

export async function deactivateSeries(
  userId: string,
  seriesId: string,
  today: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await getAdminClient().rpc("deactivate_series", {
    p_user_id: userId,
    p_series_id: seriesId,
    p_today: today,
  });
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return { ok: false, message: "This task is not available." };
  }
  return { ok: true };
}

function validateTemplate(input: SeriesTemplateInput): string | null {
  if (!input.title.trim()) {
    return "Title is required.";
  }
  if (!Number.isInteger(input.priority) || input.priority < 0 || input.priority > 3) {
    return "Priority must be from 0 to 3.";
  }
  if (input.estimatedMinutes !== null && (!Number.isInteger(input.estimatedMinutes) || input.estimatedMinutes <= 0)) {
    return "Estimated minutes must be empty or greater than zero.";
  }
  if (input.lifeAreaId !== null && (!Number.isInteger(input.lifeAreaId) || input.lifeAreaId <= 0)) {
    return "Life area is not available.";
  }
  return null;
}
