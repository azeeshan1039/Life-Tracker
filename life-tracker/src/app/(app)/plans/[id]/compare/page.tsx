import Link from "next/link";
import { requireUser } from "../../../../../lib/current-user";
import {
  addCriterionAction,
  addOptionAction,
  deleteOptionAction,
  saveComparisonAction,
} from "../../../../../modules/planning/actions";
import { loadPlan } from "../../../../../modules/planning/queries";
import { MEAN_CAPTION, meanText } from "../../../../../modules/planning/score";

export const instant = false;

export default async function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const { id } = await params;
  const plan = await loadPlan(user.id, id);
  if (!plan) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6 text-neutral-900">
        <h1 className="text-2xl font-semibold">Comparison</h1>
        <p className="mt-4">This plan is not available.</p>
      </div>
    );
  }
  const scores = new Map(plan.scores.map((cell) => [`${cell.optionId}:${cell.criterionId}`, cell]));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 text-neutral-900">
      <div>
        <p className="text-sm">
          <Link href={`/plans/${plan.id}`} className="underline">
            {plan.title}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Comparison</h1>
      </div>
      {plan.options.length < 2 ? (
        <p>Add at least two options if you want a comparison. One option is enough if you are only taking notes.</p>
      ) : null}
      <div className="flex flex-wrap gap-4">
        <form action={addOptionAction} className="flex items-center gap-2">
          <input type="hidden" name="planId" value={plan.id} />
          <input name="name" required placeholder="Option" className="min-h-11 rounded border border-neutral-300 px-3 py-2" />
          <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
            Add option
          </button>
        </form>
        <form action={addCriterionAction} className="flex items-center gap-2">
          <input type="hidden" name="planId" value={plan.id} />
          <input name="name" required placeholder="Criterion" className="min-h-11 rounded border border-neutral-300 px-3 py-2" />
          <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
            Add criterion
          </button>
        </form>
      </div>
      <ul className="flex flex-wrap gap-2">
        {plan.options.map((option) => (
          <li key={option.id}>
            <form action={deleteOptionAction}>
              <input type="hidden" name="planId" value={plan.id} />
              <input type="hidden" name="optionId" value={option.id} />
              <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
                Remove {option.name}
              </button>
            </form>
          </li>
        ))}
      </ul>
      <form action={saveComparisonAction} className="flex flex-col gap-4">
        <input type="hidden" name="planId" value={plan.id} />
        <p>{MEAN_CAPTION}</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-neutral-200 px-2 py-2 text-left">Criterion</th>
                {plan.options.map((option) => (
                  <th key={option.id} className="border border-neutral-200 px-2 py-2 text-left">
                    {option.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.criteria.map((criterion) => (
                <tr key={criterion.id}>
                  <th className="border border-neutral-200 px-2 py-2 text-left font-medium">{criterion.name}</th>
                  {plan.options.map((option) => {
                    const cell = scores.get(`${option.id}:${criterion.id}`);
                    return (
                      <td key={option.id} className="border border-neutral-200 px-2 py-2">
                        <input
                          name={`score:${option.id}:${criterion.id}`}
                          inputMode="numeric"
                          defaultValue={cell?.score ?? ""}
                          className="w-16 rounded border border-neutral-300 px-2 py-1"
                        />
                        <input
                          name={`note:${option.id}:${criterion.id}`}
                          defaultValue={cell?.note ?? ""}
                          placeholder="Note"
                          className="mt-1 w-full rounded border border-neutral-300 px-2 py-1"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <th className="border border-neutral-200 px-2 py-2 text-left">Mean</th>
                {plan.options.map((option) => (
                  <td key={option.id} className="border border-neutral-200 px-2 py-2">
                    {meanText(plan.criteria.map((criterion) => scores.get(`${option.id}:${criterion.id}`)?.score ?? null))}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="border border-neutral-200 px-2 py-2 text-left">Chosen</th>
                {plan.options.map((option) => (
                  <td key={option.id} className="border border-neutral-200 px-2 py-2">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="chosenOptionId" value={option.id} defaultChecked={option.isChosen} />
                      Chosen
                    </label>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="chosenOptionId" value="" defaultChecked={!plan.options.some((option) => option.isChosen)} />
          None chosen
        </label>
        <button type="submit" className="min-h-11 rounded bg-neutral-900 px-3 py-2 text-white">
          Save comparison
        </button>
      </form>
    </div>
  );
}
