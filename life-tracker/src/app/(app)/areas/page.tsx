import Link from "next/link";
import { requireUser } from "../../../lib/current-user";
import { listAreaCards } from "../../../modules/life-areas/queries";

export const instant = false;

export default async function AreasPage() {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const areas = await listAreaCards(user.id);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 text-neutral-900 sm:px-6">
      <div>
        <p className="eyebrow">Six areas</p>
        <h1 className="mt-1 text-3xl font-semibold">Life areas</h1>
        <p className="mt-2 max-w-xl text-sm text-neutral-700">
          Open an area to see what is active. Zeros stay visible so a quiet area is easy to notice.
        </p>
      </div>
      <ul className="area-grid">
        {areas.map((area) => (
          <li key={area.id}>
            <Link href={`/areas/${area.key}`} className="area-card">
              <span className="area-title">{area.name}</span>
              <span className="area-purpose">{area.purpose}</span>
              <span className="area-stats">
                <span>
                  <strong>{area.goals}</strong> active goals
                </span>
                <span>
                  <strong>{area.projects}</strong> active projects
                </span>
                <span>
                  <strong>{area.tasks}</strong> open tasks
                </span>
                <span>
                  <strong>{area.habits}</strong> active habits
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
