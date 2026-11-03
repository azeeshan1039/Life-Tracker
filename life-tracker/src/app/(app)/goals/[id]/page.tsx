import Link from "next/link";
import { formatCivilDate, todayInTimezone } from "../../../../lib/dates";
import { requireUser } from "../../../../lib/current-user";
import { ArchiveGoal } from "../../../../components/goals/archive-goal";
import { GoalForm } from "../../../../components/goals/goal-form";
import { GoalProgressView } from "../../../../components/measurements/goal-progress";
import { PrimaryMetricForm } from "../../../../components/measurements/primary-metric-form";
import { StatusSelect } from "../../../../components/records/status-select";
import { setGoalStatusAction } from "../../../../modules/goals/actions";
import { getGoal, listOpenTasksForGoal, listProjectsForGoal } from "../../../../modules/goals/queries";
import { getGoalMeasurement, listMetricChoices } from "../../../../modules/measurements/queries";
import { getSettings } from "../../../../modules/settings/queries";
import { listLifeAreas } from "../../../../modules/tasks/views";

export const instant = false;

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const { id } = await params;
  const goal = await getGoal(user.id, id);
  if (!goal) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <p>This goal is not available.</p>
      </div>
    );
  }

  const areas = await listLifeAreas();
  const projects = await listProjectsForGoal(user.id, goal.id);
  const tasks = await listOpenTasksForGoal(user.id, goal.id);
  const settings = await getSettings(user.id);
  const today = todayInTimezone(new Date(), settings.timezone);
  const measurement = await getGoalMeasurement(user.id, goal.id, today);
  const metricChoices = (await listMetricChoices(user.id)).filter(
    (metric) => metric.goalId === null || metric.goalId === goal.id || metric.id === measurement.metric?.id,
  );

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-6 text-neutral-900">
      <p>
        <Link href="/goals" className="underline">
          Goals
        </Link>
      </p>
      <h1 className="text-2xl font-semibold">{goal.title}</h1>
      {goal.status === "archived" ? (
        <form action={setGoalStatusAction}>
          <input type="hidden" name="goalId" value={goal.id} />
          <input type="hidden" name="status" value="active" />
          <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
            Resume
          </button>
        </form>
      ) : (
        <StatusSelect action={setGoalStatusAction} idName="goalId" id={goal.id} status={goal.status} />
      )}
      <GoalForm goal={goal} areas={areas} />
      {goal.status !== "archived" ? <ArchiveGoal goalId={goal.id} title={goal.title} /> : null}
      <GoalProgressView measurement={measurement} goalId={goal.id}>
        <PrimaryMetricForm goalId={goal.id} metricId={measurement.metric?.id ?? null} metrics={metricChoices} />
      </GoalProgressView>
      <section>
        <h2 className="text-lg font-semibold">Projects</h2>
        {projects.length === 0 ? <p className="mt-2">No linked projects.</p> : null}
        <ul className="mt-2 flex flex-col gap-2">
          {projects.map((project) => (
            <li key={project.id}>
              <Link href={`/projects/${project.id}`} className="underline">
                {project.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Open tasks</h2>
        {tasks.length === 0 ? <p className="mt-2">No open tasks.</p> : null}
        <ul className="mt-2 flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link href={`/tasks/${task.id}`} className="underline">
                {task.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      {goal.targetDate ? <p className="text-sm">Target {formatCivilDate(goal.targetDate)}</p> : null}
    </div>
  );
}
