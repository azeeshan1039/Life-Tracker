import Link from "next/link";
import { formatCivilDate } from "../../../../lib/dates";
import { requireUser } from "../../../../lib/current-user";
import { GoalForm } from "../../../../components/goals/goal-form";
import { ArchiveProject } from "../../../../components/projects/archive-project";
import { MilestoneForm } from "../../../../components/projects/milestone-form";
import { ProjectForm } from "../../../../components/projects/project-form";
import { StatusSelect } from "../../../../components/records/status-select";
import { listGoalChoices } from "../../../../modules/goals/queries";
import {
  markMilestoneDoneAction,
  moveMilestoneAction,
  reopenMilestoneAction,
  setProjectGoalsAction,
  setProjectStatusAction,
} from "../../../../modules/projects/actions";
import { getProject, listMilestones, listProjectGoalIds, listProjectTasks } from "../../../../modules/projects/queries";
import { listLifeAreas } from "../../../../modules/tasks/views";

export const instant = false;

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const { id } = await params;
  const project = await getProject(user.id, id);
  if (!project) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <p>This project is not available.</p>
      </div>
    );
  }

  const areas = await listLifeAreas();
  const milestones = await listMilestones(user.id, project.id);
  const tasks = await listProjectTasks(user.id, project.id);
  const goals = await listGoalChoices(user.id);
  const linkedGoalIds = new Set(await listProjectGoalIds(user.id, project.id));
  const groups = [
    ...milestones.map((milestone) => ({
      key: milestone.id,
      title: milestone.title,
      tasks: tasks.filter((task) => task.milestoneId === milestone.id),
    })),
    { key: "none", title: "No milestone", tasks: tasks.filter((task) => task.milestoneId === null) },
  ];

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-6 text-neutral-900">
      <p>
        <Link href="/projects" className="underline">
          Projects
        </Link>
      </p>
      <h1 className="text-2xl font-semibold">{project.title}</h1>
      {project.status === "archived" ? (
        <form action={setProjectStatusAction}>
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="status" value="active" />
          <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
            Resume
          </button>
        </form>
      ) : (
        <StatusSelect action={setProjectStatusAction} idName="projectId" id={project.id} status={project.status} />
      )}
      <ProjectForm project={project} areas={areas} />
      {project.status !== "archived" ? <ArchiveProject projectId={project.id} title={project.title} /> : null}
      <section>
        <h2 className="text-lg font-semibold">Milestones</h2>
        {milestones.length === 0 ? <p className="mt-2">Milestones are optional checkpoints.</p> : null}
        <ul className="mt-3 flex flex-col gap-3">
          {milestones.map((milestone, index) => (
            <li key={milestone.id} className="rounded border border-neutral-200 px-3 py-3">
              <p className="font-medium">{milestone.title}</p>
              {milestone.targetDate ? <p className="text-sm">{formatCivilDate(milestone.targetDate)}</p> : null}
              <p className="text-sm">{milestone.status === "done" ? "Done" : "Open"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {index > 0 ? (
                  <form action={moveMilestoneAction}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="milestoneId" value={milestone.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
                      Up
                    </button>
                  </form>
                ) : null}
                {index < milestones.length - 1 ? (
                  <form action={moveMilestoneAction}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="milestoneId" value={milestone.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
                      Down
                    </button>
                  </form>
                ) : null}
                {milestone.status === "done" ? (
                  <form action={reopenMilestoneAction}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="milestoneId" value={milestone.id} />
                    <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
                      Reopen
                    </button>
                  </form>
                ) : (
                  <form action={markMilestoneDoneAction}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="milestoneId" value={milestone.id} />
                    <button type="submit" className="min-h-11 rounded bg-neutral-900 px-3 py-2 text-white">
                      Mark done
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
        <MilestoneForm projectId={project.id} />
      </section>
      <section>
        <h2 className="text-lg font-semibold">Goals</h2>
        <form action={setProjectGoalsAction} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="projectId" value={project.id} />
          {goals.length === 0 ? <p className="text-sm">No goals yet.</p> : null}
          {goals.map((goal) => (
            <label key={goal.id} className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="goalId" value={goal.id} defaultChecked={linkedGoalIds.has(goal.id)} />
              {goal.title}
            </label>
          ))}
          <button type="submit" className="min-h-11 w-fit rounded border border-neutral-300 px-3 py-2">
            Save goal links
          </button>
        </form>
        <div className="mt-6">
          <h3 className="font-medium">New goal</h3>
          <div className="mt-3">
            <GoalForm goal={null} areas={areas} projectId={project.id} />
          </div>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Tasks</h2>
        {tasks.length === 0 ? <p className="mt-2">No open tasks.</p> : null}
        {groups.map((group) =>
          group.tasks.length === 0 ? null : (
            <div key={group.key} className="mt-3">
              <h3 className="font-medium">{group.title}</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {group.tasks.map((task) => (
                  <li key={task.id}>
                    <Link href={`/tasks/${task.id}`} className="underline">
                      {task.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ),
        )}
      </section>
    </div>
  );
}
