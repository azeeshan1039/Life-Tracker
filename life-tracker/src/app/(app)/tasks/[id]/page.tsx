import Link from "next/link";
import { formatCivilDate, todayInTimezone } from "../../../../lib/dates";
import { requireUser } from "../../../../lib/current-user";
import { SeriesBanner } from "../../../../components/tasks/series-banner";
import { AddSubtaskForm, TaskEditor } from "../../../../components/tasks/task-editor";
import { completeTaskAction, reopenTaskAction } from "../../../../modules/tasks/actions";
import { getTaskLinks } from "../../../../modules/tasks/links";
import { getSeries, loadTaskDetail } from "../../../../modules/tasks/queries";
import { isOpenStatus } from "../../../../modules/tasks/schema";
import { listLifeAreas } from "../../../../modules/tasks/views";
import { listGoalChoices } from "../../../../modules/goals/queries";
import { listMilestonesForUser, listProjectChoices } from "../../../../modules/projects/queries";
import { getSettings } from "../../../../modules/settings/queries";

export const instant = false;

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const { id } = await params;
  const detail = await loadTaskDetail(user.id, id);
  if (!detail.ok) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <p>This task is not available.</p>
      </div>
    );
  }

  const { task, subtasks, activity } = detail;
  const [settings, areas, projects, milestones, goals, foundLinks, series] = await Promise.all([
    getSettings(user.id),
    listLifeAreas(),
    listProjectChoices(user.id),
    listMilestonesForUser(user.id),
    listGoalChoices(user.id),
    getTaskLinks(user.id, task.id),
    task.seriesId ? getSeries(user.id, task.seriesId) : Promise.resolve(null),
  ]);
  const links = foundLinks ?? { projectId: null, milestoneId: null, goalIds: [] };
  const openChildren = subtasks.filter((item) => isOpenStatus(item.status));

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-6 text-neutral-900">
      <p>
        <Link href="/tasks" className="underline">
          Tasks
        </Link>
      </p>
      <h1 className="text-2xl font-semibold">{task.title}</h1>
      {task.parentTaskId ? (
        <p>
          Subtask of{" "}
          <Link href={`/tasks/${task.parentTaskId}`} className="underline">
            the parent task
          </Link>
        </p>
      ) : null}
      {series ? (
        <SeriesBanner series={series} taskId={task.id} open={isOpenStatus(task.status)} areas={areas} goals={goals} />
      ) : null}
      {isOpenStatus(task.status) ? (
        <TaskEditor task={task} areas={areas} projects={projects} milestones={milestones} goals={goals} links={links} />
      ) : (
        <p>This task is {task.status}.</p>
      )}
      <section>
        {openChildren.length > 0 ? <p>This does not complete the subtasks</p> : null}
        {isOpenStatus(task.status) ? (
          <form action={completeTaskAction} className="mt-3">
            <input type="hidden" name="taskId" value={task.id} />
            <button type="submit" className="rounded bg-neutral-900 px-3 py-2 text-white">
              {openChildren.length > 0 ? "Complete anyway" : "Complete"}
            </button>
          </form>
        ) : (
          <form action={reopenTaskAction} className="mt-3">
            <input type="hidden" name="taskId" value={task.id} />
            <button type="submit" className="rounded border border-neutral-300 px-3 py-2">
              Reopen
            </button>
          </form>
        )}
      </section>
      {task.parentTaskId ? null : (
        <section>
          <h2 className="text-lg font-semibold">Subtasks</h2>
          {subtasks.length === 0 ? <p className="mt-2">No subtasks.</p> : null}
          <ul className="mt-2 flex flex-col gap-2">
            {subtasks.map((item) => (
              <li key={item.id} className="rounded border border-neutral-200 px-3 py-3">
                <Link href={`/tasks/${item.id}`} className="font-medium underline">
                  {item.title}
                </Link>
                <p className="text-sm text-neutral-700">
                  {item.dueOn ? `Due ${formatCivilDate(item.dueOn)}` : "No due date"} · {item.status}
                </p>
              </li>
            ))}
          </ul>
          <AddSubtaskForm parentId={task.id} />
        </section>
      )}
      <section>
        <h2 className="text-lg font-semibold">Activity</h2>
        {activity.length === 0 ? <p className="mt-2">No activity yet.</p> : null}
        <ul className="mt-2 flex flex-col gap-2">
          {activity.map((item) => (
            <li key={item.id} className="text-sm">
              {item.event} · {formatCivilDate(todayInTimezone(new Date(item.occurredAt), settings.timezone))}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
