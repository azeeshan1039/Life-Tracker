import Link from "next/link";
import { displayDecimal } from "../../../../lib/decimal";
import { todayInTimezone } from "../../../../lib/dates";
import { requireUser } from "../../../../lib/current-user";
import { AreaTaskForm } from "../../../../components/life-areas/area-task-form";
import { acceptSuggestionAction } from "../../../../modules/life-areas/actions";
import { loadArea, type AreaPreview } from "../../../../modules/life-areas/queries";
import { areaNotice, suggestionsFor } from "../../../../modules/life-areas/suggestions";
import { getSettings } from "../../../../modules/settings/queries";
import { materializeActiveSeries } from "../../../../modules/tasks/materialize";

export const instant = false;

export default async function AreaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const { key } = await params;
  const query = await searchParams;
  const settings = await getSettings(user.id);
  const today = todayInTimezone(new Date(), settings.timezone);
  await materializeActiveSeries(user.id, today);
  const area = await loadArea(user.id, key, today);
  if (!area) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6 text-neutral-900">
        <h1 className="text-2xl font-semibold">Life area</h1>
        <p className="mt-4">This area is not available.</p>
      </div>
    );
  }
  const notice = areaNotice(area.key);
  const suggestions = suggestionsFor(area.key);
  const failed = first(query.error) === "suggestion";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-6 text-neutral-900">
      <div>
        <h1 className="text-2xl font-semibold">{area.name}</h1>
        <p className="mt-2 text-sm text-neutral-700">{area.purpose}</p>
      </div>
      {area.cashFlow ? (
        <p>
          This month&apos;s income minus expense is {displayDecimal(area.cashFlow.net)} {area.cashFlow.unit}. Income{" "}
          {displayDecimal(area.cashFlow.income)} {area.cashFlow.unit}, expense {displayDecimal(area.cashFlow.expense)}{" "}
          {area.cashFlow.unit}.
        </p>
      ) : null}
      <Section title="Active goals" empty="No active goals." items={area.goalsList} href={`/goals?area=${area.id}`} itemHref={(id) => `/goals/${id}`} allLabel="All goals" />
      <Section title="Active projects" empty="No active projects." items={area.projectsList} href={`/projects?area=${area.id}`} itemHref={(id) => `/projects/${id}`} allLabel="All projects" />
      <Section title="Open tasks" empty="No open tasks." items={area.tasksList} href={`/tasks?area=${area.id}`} itemHref={(id) => `/tasks/${id}`} allLabel="All tasks" />
      <Section title="Active habits" empty="No active habits." items={area.habitsList} href={`/habits?area=${area.id}`} itemHref={(id) => `/habits/${id}`} allLabel="All habits" />
      <Section title="Active metrics" empty="No active measurements." items={area.metricsList} href={`/measurements?area=${area.id}`} itemHref={(id) => `/measurements/${id}`} allLabel="All measurements" />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Add</h2>
        <AreaTaskForm areaKey={area.key} />
        <p className="flex flex-wrap gap-2 text-sm">
          <Link href={`/goals?area=${area.id}`} className="inline-flex min-h-11 items-center rounded border border-neutral-300 px-3 py-2">Add goal</Link>
          <Link href={`/projects?area=${area.id}`} className="inline-flex min-h-11 items-center rounded border border-neutral-300 px-3 py-2">Add project</Link>
          <Link href={`/habits?area=${area.id}`} className="inline-flex min-h-11 items-center rounded border border-neutral-300 px-3 py-2">Add habit</Link>
          <Link href={`/measurements?area=${area.id}`} className="inline-flex min-h-11 items-center rounded border border-neutral-300 px-3 py-2">Add metric</Link>
          <Link href={`/plans/new?area=${area.key}`} className="inline-flex min-h-11 items-center rounded border border-neutral-300 px-3 py-2">Add plan</Link>
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Suggestions</h2>
        {notice ? <p className="mt-2">{notice}</p> : null}
        {failed ? <p className="mt-2 text-sm text-red-700">That suggestion is not available.</p> : null}
        <form action={acceptSuggestionAction} className="mt-3 flex flex-col items-start gap-2">
          <input type="hidden" name="area" value={area.key} />
          {suggestions.map((suggestion) => (
            <div key={suggestion.key}>
              <button type="submit" name="suggestion" value={suggestion.key} className="min-h-11 rounded border border-neutral-300 px-3 py-2">
                {suggestion.label}
              </button>
              {suggestion.hint ? <p className="text-sm text-neutral-700">{suggestion.hint}</p> : null}
            </div>
          ))}
        </form>
      </section>
    </div>
  );
}

function Section({
  title,
  empty,
  items,
  href,
  itemHref,
  allLabel,
}: {
  title: string;
  empty: string;
  items: AreaPreview[];
  href: string;
  itemHref: (id: string) => string;
  allLabel: string;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length === 0 ? <p className="mt-2">{empty}</p> : null}
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="rounded border border-neutral-200 px-3 py-3">
            <Link href={itemHref(item.id)} className="underline">
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm">
        <Link href={href} className="underline">
          {allLabel}
        </Link>
      </p>
    </section>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
