"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UnauthorizedError, requireUser } from "../../lib/current-user";
import { getAdminClient } from "../../lib/supabase-admin";
import { getSettings } from "../settings/queries";
import {
  createMetric,
  createSuggestedMetric,
  saveMetricEntry,
  setMetricStatus,
  setPrimaryMetric,
  updateMetric,
  type MetricAggregation,
  type MetricInput,
  type MetricKind,
} from "./mutations";
import type { MetricDirection } from "./derive";

export type MetricFormState = {
  error: string;
  name: string;
  description: string;
  kind: string;
  unit: string;
  aggregation: string;
  direction: string;
  target: string;
  lifeAreaId: string;
  goalId: string;
  primary: boolean;
  saved: boolean;
  attempt: number;
};

export type EntryFormState = {
  error: string;
  recordedOn: string;
  value: string;
  note: string;
  saved: boolean;
  attempt: number;
};

export type PrimaryFormState = {
  error: string;
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

export async function createMetricAction(previous: MetricFormState, formData: FormData): Promise<MetricFormState> {
  const user = await currentUser();
  const fields = readMetricForm(formData, previous);
  const result = await createMetric(user.id, fields.input);
  if (!result.ok) {
    return { ...fields.state, error: result.message };
  }
  revalidatePath("/measurements");
  revalidatePath("/goals");
  redirect(`/measurements/${result.id}`);
}

export async function updateMetricAction(previous: MetricFormState, formData: FormData): Promise<MetricFormState> {
  const user = await currentUser();
  const metricId = String(formData.get("metricId") ?? "");
  const fields = readMetricForm(formData, previous);
  const result = await updateMetric(user.id, metricId, fields.input);
  if (!result.ok) {
    return { ...fields.state, error: result.message };
  }
  revalidatePath("/measurements");
  revalidatePath(`/measurements/${metricId}`);
  revalidatePath("/goals");
  return { ...fields.state, error: "", saved: true };
}

export async function archiveMetricAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  const metricId = String(formData.get("metricId") ?? "");
  await setMetricStatus(user.id, metricId, "archived");
  revalidatePath("/measurements");
  revalidatePath(`/measurements/${metricId}`);
  redirect("/measurements");
}

export async function resumeMetricAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  const metricId = String(formData.get("metricId") ?? "");
  await setMetricStatus(user.id, metricId, "active");
  revalidatePath("/measurements");
  revalidatePath(`/measurements/${metricId}`);
  redirect(`/measurements/${metricId}`);
}

export async function saveEntryAction(previous: EntryFormState, formData: FormData): Promise<EntryFormState> {
  const user = await currentUser();
  const metricId = String(formData.get("metricId") ?? "");
  const recordedOn = String(formData.get("recordedOn") ?? "");
  const value = String(formData.get("value") ?? "");
  const note = String(formData.get("note") ?? "");
  const kept = { recordedOn, value, note, attempt: previous.attempt + 1, saved: false };
  const result = await saveMetricEntry(user.id, metricId, { recordedOn, value, note });
  if (!result.ok) {
    return { ...kept, error: result.message };
  }
  revalidatePath("/measurements");
  revalidatePath(`/measurements/${metricId}`);
  revalidatePath("/goals");
  return { error: "", recordedOn, value: "", note: "", saved: true, attempt: previous.attempt + 1 };
}

export async function createSuggestionAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  const settings = await getSettings(user.id);
  const area = await getAdminClient().from("life_areas").select("id").eq("key", "wealth").maybeSingle();
  if (area.error) {
    throw new Error(area.error.message);
  }
  const result = await createSuggestedMetric(user.id, String(formData.get("suggestion") ?? ""), settings.currencyCode, area.data?.id ?? null);
  if (!result.ok) {
    redirect("/measurements");
  }
  revalidatePath("/measurements");
  redirect(`/measurements/${result.id}`);
}

export async function setPrimaryMetricAction(previous: PrimaryFormState, formData: FormData): Promise<PrimaryFormState> {
  const user = await currentUser();
  const goalId = String(formData.get("goalId") ?? "");
  const metricId = String(formData.get("metricId") ?? "");
  const result = await setPrimaryMetric(user.id, goalId, metricId || null);
  if (!result.ok) {
    return { error: result.message };
  }
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/measurements");
  return { error: "" };
}

function readMetricForm(formData: FormData, previous: MetricFormState): { input: MetricInput; state: MetricFormState } {
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "");
  const kind = String(formData.get("kind") ?? "general");
  const unit = String(formData.get("unit") ?? "");
  const aggregation = String(formData.get("aggregation") ?? "latest");
  const direction = String(formData.get("direction") ?? "increase");
  const target = String(formData.get("target") ?? "");
  const lifeAreaId = String(formData.get("lifeAreaId") ?? "");
  const goalId = String(formData.get("goalId") ?? "");
  const primary = formData.get("primary") === "yes";
  const state: MetricFormState = {
    error: "",
    name,
    description,
    kind,
    unit,
    aggregation,
    direction,
    target,
    lifeAreaId,
    goalId,
    primary,
    saved: false,
    attempt: previous.attempt + 1,
  };
  return {
    state,
    input: {
      name,
      description,
      kind: kind as MetricKind,
      unit,
      aggregation: aggregation as MetricAggregation,
      direction: direction as MetricDirection,
      target: target.trim() === "" ? null : target.trim(),
      lifeAreaId: lifeAreaId ? Number(lifeAreaId) : null,
      goalId: goalId || null,
      primary,
    },
  };
}
