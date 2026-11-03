import { requireUser } from "../../../../lib/current-user";
import { createPlanAction } from "../../../../modules/planning/actions";
import { findArea } from "../../../../modules/life-areas/queries";

export const instant = false;

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { connection } = await import("next/server");
  await connection();
  await requireUser();
  const params = await searchParams;
  const areaKey = first(params.area) ?? "";
  const area = areaKey ? await findArea(areaKey) : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6 text-neutral-900">
      <h1 className="text-2xl font-semibold">New plan</h1>
      {area ? <p>This plan starts as an idea linked to {area.name}.</p> : null}
      {first(params.error) ? <p className="text-sm text-red-700">{first(params.error)}</p> : null}
      <form action={createPlanAction} className="flex flex-col gap-3">
        {area ? <input type="hidden" name="area" value={area.key} /> : null}
        <label className="flex flex-col gap-1 text-sm">
          Title
          <input name="title" required className="min-h-11 rounded border border-neutral-300 px-3 py-2" />
        </label>
        <button type="submit" className="min-h-11 rounded bg-neutral-900 px-3 py-2 text-white">
          Create idea
        </button>
      </form>
    </div>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
