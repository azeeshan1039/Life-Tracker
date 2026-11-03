import { addCivilDays } from "../../lib/dates";
import { logger } from "../../lib/logger";
import { getAdminClient } from "../../lib/supabase-admin";
import { progressLines } from "../measurements/derive";
import { listGoalMeasurements } from "../measurements/queries";
import { loadHabitsForToday } from "../habits/queries";
import type { TodayHabit } from "../habits/today";
import { materializeActiveSeries } from "../tasks/materialize";
import { inboxCount } from "../tasks/day-summary";
import { groupForToday, listTasksForUser, type TaskListItem } from "../tasks/views";
import { parseDashboardConfig, visibleWidgets, isWidgetId, type DashboardConfig, type WidgetId } from "./config";

export type UpcomingMilestone = {
  id: string;
  projectId: string;
  title: string;
  projectTitle: string;
  targetDate: string;
};

export type PinnedGoal = {
  id: string;
  title: string;
  status: string;
  targetDate: string | null;
  lines: string[];
};

export type DashboardData = {
  civilDate: string;
  visible: WidgetId[];
  today: { scheduled: number; due: number; overdue: number; habitsOpen: number };
  habits: { due: TodayHabit[]; weeklyMet: TodayHabit[] };
  upcoming: { tasks: { task: TaskListItem; date: string }[]; milestones: UpcomingMilestone[] };
  pins: PinnedGoal[];
  pinMessage: string | null;
  inbox: number;
  querySteps: string[];
};

const working = new Set(["todo", "in_progress"]);

export function dashboardQuerySteps(pinCount: number): string[] {
  const steps = ["materialize", "tasks", "milestones", "habits", "goals"];
  if (pinCount > 0) {
    steps.push("goal_measurements");
  }
  return steps;
}

export function sevenDayEnd(today: string): string {
  return addCivilDays(today, 6);
}

export async function readDashboardConfig(userId: string): Promise<DashboardConfig> {
  const { data, error } = await getAdminClient()
    .from("user_settings")
    .select("dashboard_config")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return parseDashboardConfig(data?.dashboard_config);
}

export async function saveDashboardConfig(
  userId: string,
  input: { pinnedGoalIds: string[]; hiddenWidgets: string[] },
): Promise<{ ok: true; config: DashboardConfig } | { ok: false; error: string }> {
  const hiddenWidgets = [...new Set(input.hiddenWidgets.filter(isWidgetId))];
  const pinnedGoalIds = [...new Set(input.pinnedGoalIds.map((id) => id.trim()).filter((id) => id.length > 0))];
  if (pinnedGoalIds.length > 3) {
    return { ok: false, error: "Pin up to three goals." };
  }
  if (pinnedGoalIds.length > 0) {
    const { data, error } = await getAdminClient().from("goals").select("id").eq("user_id", userId).in("id", pinnedGoalIds);
    if (error) {
      throw new Error(error.message);
    }
    if ((data ?? []).length !== pinnedGoalIds.length) {
      return { ok: false, error: "This goal is not available." };
    }
  }
  const config: DashboardConfig = { pinnedGoalIds, hiddenWidgets };
  const { error } = await getAdminClient().from("user_settings").upsert({
    user_id: userId,
    dashboard_config: config,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(error.message);
  }
  return { ok: true, config };
}

export async function loadDashboard(userId: string, today: string): Promise<DashboardData> {
  const config = await readDashboardConfig(userId);
  await materializeActiveSeries(userId, today);
  const tasks = await listTasksForUser(userId);
  const milestones = await listUpcomingMilestones(userId, today, sevenDayEnd(today));
  const habits = await loadHabitsForToday(userId, today);
  const goals = await listGoalRows(userId);
  const measurements = config.pinnedGoalIds.length > 0 ? await listGoalMeasurements(userId, today) : [];
  const groups = groupForToday(tasks, today);
  const steps = dashboardQuerySteps(config.pinnedGoalIds.length);
  logger.info({ steps }, "dashboard load");

  const pins = config.pinnedGoalIds.flatMap((goalId) => {
    const goal = goals.find((item) => item.id === goalId);
    if (!goal) {
      return [];
    }
    const measurement = measurements.find((item) => item.goalId === goalId);
    const lines =
      measurement && measurement.progress.mode !== "missing" ? progressLines(measurement.progress, measurement.unit) : [];
    return [
      {
        id: goal.id,
        title: goal.title,
        status: goal.status,
        targetDate: goal.targetDate,
        lines,
      },
    ];
  });

  return {
    civilDate: today,
    visible: visibleWidgets(config),
    today: {
      scheduled: groups.scheduled.length,
      due: groups.dueToday.length,
      overdue: groups.overdue.length,
      habitsOpen: habits.due.length,
    },
    habits,
    upcoming: {
      tasks: upcomingTasks(tasks, today),
      milestones,
    },
    pins,
    pinMessage: pins.length > 0 ? null : goals.length > 0 ? "Pin a goal in Settings" : "Goals are optional. Tasks do not need one.",
    inbox: inboxCount(tasks),
    querySteps: steps,
  };
}

function upcomingTasks(tasks: TaskListItem[], today: string): { task: TaskListItem; date: string }[] {
  const end = sevenDayEnd(today);
  return tasks
    .flatMap((task) => {
      if (!working.has(task.status)) {
        return [];
      }
      const dates = [task.scheduledFor, task.dueOn].filter((date): date is string => date !== null && date >= today && date <= end);
      const date = dates.sort()[0];
      return date ? [{ task, date }] : [];
    })
    .sort((left, right) => left.date.localeCompare(right.date) || left.task.title.localeCompare(right.task.title));
}

async function listUpcomingMilestones(userId: string, today: string, end: string): Promise<UpcomingMilestone[]> {
  const projects = await getAdminClient().from("projects").select("id, title").eq("user_id", userId).eq("status", "active");
  if (projects.error) {
    throw new Error(projects.error.message);
  }
  const rows = projects.data ?? [];
  if (rows.length === 0) {
    return [];
  }
  const titles = new Map(rows.map((project) => [project.id, project.title]));
  const milestones = await getAdminClient()
    .from("milestones")
    .select("id, project_id, title, target_date")
    .in("project_id", rows.map((project) => project.id))
    .eq("status", "open")
    .gte("target_date", today)
    .lte("target_date", end)
    .order("target_date");
  if (milestones.error) {
    throw new Error(milestones.error.message);
  }
  return (milestones.data ?? []).flatMap((row) => {
    if (!row.target_date) {
      return [];
    }
    return [
      {
        id: row.id,
        projectId: row.project_id,
        title: row.title,
        projectTitle: titles.get(row.project_id) ?? "",
        targetDate: row.target_date,
      },
    ];
  });
}

async function listGoalRows(userId: string): Promise<{ id: string; title: string; status: string; targetDate: string | null }[]> {
  const { data, error } = await getAdminClient()
    .from("goals")
    .select("id, title, status, target_date")
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    targetDate: row.target_date,
  }));
}
