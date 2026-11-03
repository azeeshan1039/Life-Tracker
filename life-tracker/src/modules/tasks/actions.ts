"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { UnauthorizedError, requireUser } from "../../lib/current-user";
import { todayInTimezone } from "../../lib/dates";
import { getSettings } from "../settings/queries";
import { captureInboxTask } from "./capture";
import { createTask, addSubtask, cancelTask, completeTask, editTask, reopenTask } from "./mutations";
import { setTaskLinks } from "./links";
import { isCivilDate, isOptionalCivilDate, type OpenTaskStatus, type TaskInput } from "./schema";
import { deactivateSeries, replaceSeriesGoals, updateSeriesTemplate } from "./series";

export type TaskFormState = {
  error: string;
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

export async function updateTaskAction(
  _previous: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const taskId = String(formData.get("taskId") ?? "");
  const parsed = parseTaskForm(formData);
  if (!parsed.ok) {
  return { error: parsed.error, saved: false, attempt: 0 };
}
  const user = await currentUser();
  const result = await editTask(user.id, taskId, parsed.value);
  if (!result.ok) {
    return { error: result.message, saved: false, attempt: 0 };
  }
  const links = await setTaskLinks(user.id, taskId, {
    projectId: emptyToNull(formData.get("projectId")),
    milestoneId: emptyToNull(formData.get("milestoneId")),
    goalIds: formData.getAll("goalId").map(String).filter(Boolean),
  });
  if (!links.ok) {
    return { error: links.message, saved: false, attempt: 0 };
  }
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/goals");
  revalidatePath("/projects");
  return { error: "", saved: true, attempt: 0 };
}

export async function addSubtaskAction(
  previous: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const parentId = String(formData.get("parentId") ?? "");
  const dueRaw = String(formData.get("dueOn") ?? "").trim();
  const dueOn = dueRaw === "" ? null : dueRaw;
  const user = await currentUser();
  const result = await addSubtask(user.id, parentId, {
    title: String(formData.get("title") ?? ""),
    dueOn,
  });
  if (!result.ok) {
    return { error: result.message, saved: false, attempt: previous.attempt + 1 };
  }
  revalidatePath(`/tasks/${parentId}`);
  return { error: "", saved: true, attempt: previous.attempt + 1 };
}

export type CaptureFormState = {
  error: string;
  title: string;
  attempt: number;
  captured: { id: string; title: string } | null;
};

export async function captureTaskAction(
  previous: CaptureFormState,
  formData: FormData,
): Promise<CaptureFormState> {
  const title = String(formData.get("title") ?? "");
  const user = await currentUser();
  try {
    const result = await captureInboxTask(user.id, title);
    if (!result.ok) {
      return { error: result.message, title, attempt: previous.attempt + 1, captured: null };
    }
    // revalidatePath during the action makes Next re-render the current page
    // before this response is sent. Do it after the response so the save stays
    // a single write, and the open page updates the inbox itself.
    after(() => {
      revalidatePath("/today");
      revalidatePath("/tasks");
      revalidatePath("/");
    });
    return {
      error: "",
      title: "",
      attempt: previous.attempt + 1,
      captured: { id: result.task.id, title: result.task.title },
    };
  } catch {
    return {
      error: "Something went wrong saving this. Your text is still on the page.",
      title,
      attempt: previous.attempt + 1,
      captured: null,
    };
  }
}

export type SeriesFormState = {
  error: string;
  title: string;
  notes: string;
  priority: string;
  estimatedMinutes: string;
  lifeAreaId: string;
  goalIds: string[];
  saved: boolean;
  attempt: number;
};

export async function updateSeriesAction(
  previous: SeriesFormState,
  formData: FormData,
): Promise<SeriesFormState> {
  const title = String(formData.get("title") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const priority = String(formData.get("priority") ?? "");
  const estimatedMinutes = String(formData.get("estimatedMinutes") ?? "");
  const lifeAreaId = String(formData.get("lifeAreaId") ?? "");
  const goalIds = formData.getAll("goalId").map(String).filter(Boolean);
  const seriesId = String(formData.get("seriesId") ?? "");
  const kept = {
    title,
    notes,
    priority,
    estimatedMinutes,
    lifeAreaId,
    goalIds,
    saved: false,
    attempt: previous.attempt + 1,
  };
  const minutesRaw = estimatedMinutes.trim();
  const minutes = minutesRaw === "" ? null : Number(minutesRaw);
  const areaRaw = lifeAreaId.trim();
  const area = areaRaw === "" ? null : Number(areaRaw);
  const user = await currentUser();
  const settings = await getSettings(user.id);
  const result = await updateSeriesTemplate(user.id, seriesId, todayInTimezone(new Date(), settings.timezone), {
    title,
    notes,
    priority: Number(priority),
    estimatedMinutes: minutes,
    lifeAreaId: area,
  });
  if (!result.ok) {
    return { ...kept, error: result.message };
  }
  const goals = await replaceSeriesGoals(user.id, seriesId, todayInTimezone(new Date(), settings.timezone), goalIds);
  if (!goals.ok) {
    return { ...kept, error: goals.message };
  }
  revalidatePath("/today");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/goals");
  revalidatePath(`/tasks/${String(formData.get("taskId") ?? "")}`);
  return { ...kept, error: "", saved: true };
}

export async function deactivateSeriesAction(formData: FormData): Promise<void> {
  const seriesId = String(formData.get("seriesId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const user = await currentUser();
  const settings = await getSettings(user.id);
  await deactivateSeries(user.id, seriesId, todayInTimezone(new Date(), settings.timezone));
  revalidatePath("/today");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath(`/tasks/${taskId}`);
  redirect(`/tasks/${taskId}`);
}

export async function cancelTaskAction(formData: FormData): Promise<void> {
  const taskId = String(formData.get("taskId") ?? "");
  const user = await currentUser();
  await cancelTask(user.id, taskId);
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/today");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  redirect(`/tasks/${taskId}`);
}

export type DayTaskState = {
  error: string;
  title: string;
  attempt: number;
};

export async function createDayTaskAction(
  previous: DayTaskState,
  formData: FormData,
): Promise<DayTaskState> {
  const title = String(formData.get("title") ?? "");
  const scheduledFor = String(formData.get("scheduledFor") ?? "");
  if (!isCivilDate(scheduledFor)) {
    return { error: "Dates must be calendar days.", title, attempt: previous.attempt + 1 };
  }
  const user = await currentUser();
  const result = await createTask(user.id, {
    title,
    notes: "",
    status: "todo",
    priority: 0,
    dueOn: null,
    scheduledFor,
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes: null,
    lifeAreaId: null,
  });
  if (!result.ok) {
    return { error: result.message, title, attempt: previous.attempt + 1 };
  }
  revalidatePath("/calendar");
  revalidatePath("/today");
  revalidatePath("/tasks");
  redirect(`/tasks/${result.task.id}`);
}

export async function completeTaskAction(formData: FormData): Promise<void> {
  const taskId = String(formData.get("taskId") ?? "");
  const user = await currentUser();
  const result = await completeTask(user.id, taskId);
  if (!result.ok && result.error === "not_found") {
    redirect("/tasks");
  }
  revalidatePath(`/tasks/${taskId}`);
  redirect(`/tasks/${taskId}`);
}

export async function reopenTaskAction(formData: FormData): Promise<void> {
  const taskId = String(formData.get("taskId") ?? "");
  const user = await currentUser();
  await reopenTask(user.id, taskId);
  revalidatePath(`/tasks/${taskId}`);
  redirect(`/tasks/${taskId}`);
}

function parseTaskForm(formData: FormData): { ok: true; value: TaskInput } | { ok: false; error: string } {
  const status = String(formData.get("status") ?? "");
  if (status !== "inbox" && status !== "todo" && status !== "in_progress") {
    return { ok: false, error: "Choose an open status." };
  }
  const dueOn = emptyToNull(formData.get("dueOn"));
  const scheduledFor = emptyToNull(formData.get("scheduledFor"));
  if (!isOptionalCivilDate(dueOn) || !isOptionalCivilDate(scheduledFor)) {
    return { ok: false, error: "Dates must be calendar days." };
  }
  const minutesRaw = String(formData.get("estimatedMinutes") ?? "").trim();
  const estimatedMinutes = minutesRaw === "" ? null : Number(minutesRaw);
  const areaRaw = String(formData.get("lifeAreaId") ?? "").trim();
  const lifeAreaId = areaRaw === "" ? null : Number(areaRaw);
  const priority = Number(formData.get("priority"));
  return {
    ok: true,
    value: {
      title: String(formData.get("title") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      status: status as OpenTaskStatus,
      priority,
      dueOn,
      scheduledFor,
      scheduledStart: emptyToNull(formData.get("scheduledStart")),
      scheduledEnd: emptyToNull(formData.get("scheduledEnd")),
      estimatedMinutes,
      lifeAreaId,
    },
  };
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
}
