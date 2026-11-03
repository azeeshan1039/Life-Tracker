import Link from "next/link";
import { formatCivilDate } from "../../../../lib/dates";
import { requireUser } from "../../../../lib/current-user";
import { MarkdownBody } from "../../../../components/planning/markdown-body";
import { listGoalChoices } from "../../../../modules/goals/queries";
import {
  addActionAction,
  addOptionAction,
  addPlanLinkAction,
  addQuestionAction,
  answerQuestionAction,
  deletePlanLinkAction,
  dismissActionAction,
  dropQuestionAction,
  moveQuestionAction,
  promoteActionAction,
  recordDecisionAction,
  replacePlanLinksAction,
  setPlanStatusAction,
  updatePlanDetailsAction,
} from "../../../../modules/planning/actions";
import { canChangeStatus, PLAN_STATUSES, type PlanStatus } from "../../../../modules/planning/mutations";
import { loadPlan } from "../../../../modules/planning/queries";
import { listProjectChoices } from "../../../../modules/projects/queries";
import { listLifeAreas } from "../../../../modules/tasks/views";

export const instant = false;

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const { id } = await params;
  const plan = await loadPlan(user.id, id);
  if (!plan) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6 text-neutral-900">
        <h1 className="text-2xl font-semibold">Plan</h1>
        <p className="mt-4">This plan is not available.</p>
      </div>
    );
  }
  const [areas, goals, projects] = await Promise.all([
    listLifeAreas(),
    listGoalChoices(user.id),
    listProjectChoices(user.id),
  ]);
  const linkedAreas = new Set(plan.areas.map((area) => area.id));
  const linkedGoals = new Set(plan.goals.map((goal) => goal.id));
  const linkedProjects = new Set(plan.projects.map((project) => project.id));
  const choices = PLAN_STATUSES.filter((status) => canChangeStatus(plan.status, status));

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-6 text-neutral-900">
      <div>
        <h1 className="text-2xl font-semibold">{plan.title}</h1>
        <p className="mt-1 text-sm text-neutral-700">{labelStatus(plan.status)}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Status and summary</h2>
        <form action={setPlanStatusAction} className="flex items-end gap-2">
          <input type="hidden" name="planId" value={plan.id} />
          <label className="flex flex-col gap-1 text-sm">
            Status
            <select name="status" defaultValue={plan.status} className="min-h-11 rounded border border-neutral-300 px-3 py-2">
              {choices.map((status) => (
                <option key={status} value={status}>
                  {labelStatus(status)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
            Update status
          </button>
        </form>
        <form action={updatePlanDetailsAction} className="flex flex-col gap-3">
          <input type="hidden" name="planId" value={plan.id} />
          <label className="flex flex-col gap-1 text-sm">
            Summary
            <input name="summary" defaultValue={plan.summary} className="min-h-11 rounded border border-neutral-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Notes
            <textarea name="body" defaultValue={plan.body} rows={8} className="rounded border border-neutral-300 px-3 py-2" />
          </label>
          <button type="submit" className="min-h-11 rounded bg-neutral-900 px-3 py-2 text-white">
            Save notes
          </button>
        </form>
        {plan.body.trim() === "" ? (
          <p>Write freely. Nothing on this page becomes a task unless you use Create task.</p>
        ) : (
          <div className="rounded border border-neutral-200 px-3 py-3">
            <MarkdownBody source={plan.body} />
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Links</h2>
        <form action={replacePlanLinksAction} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="planId" value={plan.id} />
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-medium">Life areas</legend>
            {areas.map((area) => (
              <label key={area.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="lifeAreaId" value={area.id} defaultChecked={linkedAreas.has(area.id)} />
                {area.name}
              </label>
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-medium">Goals</legend>
            {goals.length === 0 ? <p className="text-sm">No goals yet.</p> : null}
            {goals.map((goal) => (
              <label key={goal.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="goalId" value={goal.id} defaultChecked={linkedGoals.has(goal.id)} />
                {goal.title}
              </label>
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-medium">Projects</legend>
            {projects.length === 0 ? <p className="text-sm">No projects yet.</p> : null}
            {projects.map((project) => (
              <label key={project.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="projectId" value={project.id} defaultChecked={linkedProjects.has(project.id)} />
                {project.title}
              </label>
            ))}
          </fieldset>
          <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
            Save links
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Questions</h2>
        <form action={addQuestionAction} className="flex items-center gap-2">
          <input type="hidden" name="planId" value={plan.id} />
          <input name="question" required placeholder="Question" className="min-h-11 min-w-0 flex-1 rounded border border-neutral-300 px-3 py-2" />
          <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
            Add
          </button>
        </form>
        <ul className="flex flex-col gap-3">
          {plan.questions.map((question) => (
            <li key={question.id} className="rounded border border-neutral-200 px-3 py-3">
              <p className="font-medium">{question.question}</p>
              <p className="text-sm text-neutral-700">{labelStatus(question.status as PlanStatus)}</p>
              {question.answer ? <p className="mt-1 text-sm">{question.answer}</p> : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <form action={moveQuestionAction}>
                  <input type="hidden" name="planId" value={plan.id} />
                  <input type="hidden" name="questionId" value={question.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
                    Up
                  </button>
                </form>
                <form action={moveQuestionAction}>
                  <input type="hidden" name="planId" value={plan.id} />
                  <input type="hidden" name="questionId" value={question.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
                    Down
                  </button>
                </form>
                {question.status === "open" ? (
                  <form action={dropQuestionAction}>
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="questionId" value={question.id} />
                    <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
                      Drop
                    </button>
                  </form>
                ) : null}
              </div>
              {question.status === "open" ? (
                <form action={answerQuestionAction} className="mt-2 flex flex-col gap-2">
                  <input type="hidden" name="planId" value={plan.id} />
                  <input type="hidden" name="questionId" value={question.id} />
                  <textarea name="answer" rows={2} className="rounded border border-neutral-300 px-3 py-2" />
                  <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
                    Mark answered
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Reference links</h2>
        <form action={addPlanLinkAction} className="flex flex-col gap-2">
          <input type="hidden" name="planId" value={plan.id} />
          <input name="url" required placeholder="https://" className="min-h-11 rounded border border-neutral-300 px-3 py-2" />
          <input name="title" placeholder="Title" className="min-h-11 rounded border border-neutral-300 px-3 py-2" />
          <input name="note" placeholder="Note" className="min-h-11 rounded border border-neutral-300 px-3 py-2" />
          <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
            Add link
          </button>
        </form>
        <ul className="flex flex-col gap-2">
          {plan.links.map((link) => (
            <li key={link.id} className="rounded border border-neutral-200 px-3 py-3">
              <a href={link.url} rel="noreferrer" target="_blank" className="underline">
                {link.title || link.url}
              </a>
              {link.note ? <p className="text-sm">{link.note}</p> : null}
              <form action={deletePlanLinkAction} className="mt-2">
                <input type="hidden" name="planId" value={plan.id} />
                <input type="hidden" name="linkId" value={link.id} />
                <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Options</h2>
        <p>
          <Link href={`/plans/${plan.id}/compare`} className="underline">
            Open comparison
          </Link>
        </p>
        <form action={addOptionAction} className="flex items-center gap-2">
          <input type="hidden" name="planId" value={plan.id} />
          <input name="name" required placeholder="Option" className="min-h-11 min-w-0 flex-1 rounded border border-neutral-300 px-3 py-2" />
          <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
            Add
          </button>
        </form>
        <ul className="flex flex-col gap-1">
          {plan.options.map((option) => (
            <li key={option.id}>
              {option.name}
              {option.isChosen ? " · Chosen" : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Decisions</h2>
        {plan.decisions.length === 0 ? <p>No decisions yet.</p> : null}
        <ul className="flex flex-col gap-3">
          {plan.decisions.map((decision) => (
            <li key={decision.id} className="rounded border border-neutral-200 px-3 py-3">
              <p className="font-medium">{decision.title}</p>
              <p className="text-sm text-neutral-700">{formatCivilDate(decision.decidedOn)}</p>
              {decision.rationale.trim() === "" ? null : <MarkdownBody source={decision.rationale} />}
            </li>
          ))}
        </ul>
        <form action={recordDecisionAction} className="flex flex-col gap-2">
          <input type="hidden" name="planId" value={plan.id} />
          <input name="title" required placeholder="Decision" className="min-h-11 rounded border border-neutral-300 px-3 py-2" />
          <input name="decidedOn" required type="date" className="min-h-11 rounded border border-neutral-300 px-3 py-2" />
          <label className="flex flex-col gap-1 text-sm">
            Chosen option
            <select name="chosenOptionId" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
              <option value="">None</option>
              {plan.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <textarea name="rationale" rows={4} placeholder="Rationale" className="rounded border border-neutral-300 px-3 py-2" />
          <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
            Record decision
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Actions</h2>
        <form action={addActionAction} className="flex flex-col gap-2">
          <input type="hidden" name="planId" value={plan.id} />
          <input name="title" required placeholder="Action" className="min-h-11 rounded border border-neutral-300 px-3 py-2" />
          <textarea name="notes" rows={2} placeholder="Notes" className="rounded border border-neutral-300 px-3 py-2" />
          <input name="dueOn" type="date" className="min-h-11 rounded border border-neutral-300 px-3 py-2" />
          <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
            Add action
          </button>
        </form>
        <ul className="flex flex-col gap-3">
          {plan.actions.map((action) => (
            <li key={action.id} className="rounded border border-neutral-200 px-3 py-3">
              <p className="font-medium">{action.title}</p>
              <p className="text-sm text-neutral-700">{labelStatus(action.status as PlanStatus)}</p>
              {action.taskId ? (
                <p className="text-sm">
                  <Link href={`/tasks/${action.taskId}`} className="underline">
                    {action.taskTitle}
                  </Link>
                  {action.taskStatus ? ` · ${action.taskStatus}` : ""}
                </p>
              ) : null}
              {action.status === "proposed" ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <form action={promoteActionAction}>
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="actionId" value={action.id} />
                    <button type="submit" className="min-h-11 rounded bg-neutral-900 px-3 py-2 text-white">
                      Create task
                    </button>
                  </form>
                  <form action={dismissActionAction}>
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="actionId" value={action.id} />
                    <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
                      Dismiss
                    </button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {plan.status !== "archived" ? (
        <section>
          <h2 className="text-lg font-semibold">Archive</h2>
          <p className="mt-2">Linked tasks stay in your task list.</p>
          <form action={setPlanStatusAction} className="mt-3">
            <input type="hidden" name="planId" value={plan.id} />
            <input type="hidden" name="status" value="archived" />
            <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
              Archive plan
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function labelStatus(status: string): string {
  return status.slice(0, 1).toUpperCase() + status.slice(1);
}
