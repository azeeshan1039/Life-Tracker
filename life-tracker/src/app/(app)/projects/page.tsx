import Link from "next/link";
import { formatCivilDate } from "../../../lib/dates";
import { requireUser } from "../../../lib/current-user";
import { ArchiveProject } from "../../../components/projects/archive-project";
import { ProjectForm } from "../../../components/projects/project-form";
import { listProjects } from "../../../modules/projects/queries";
import type { WorkStatus } from "../../../modules/goals/goal-mutations";
import { listLifeAreas } from "../../../modules/tasks/views";

export const instant = false;

const filters = ["active", "paused", "completed", "archived"] as const;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const params = await searchParams;
  const status = parseStatus(first(params.status));
  const area = parseArea(first(params.area));
  const areas = await listLifeAreas();
  const projects = await listProjects(user.id, status, area);
  const areaName = new Map(areas.map((item) => [item.id, item.name]));

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6 text-neutral-900">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <nav aria-label="Project status" className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <Link
            key={item}
            href={statusHref(item, area)}
            aria-current={item === status ? "page" : undefined}
            className={`min-h-11 rounded border border-neutral-300 px-3 py-2 ${item === status ? "font-semibold" : ""}`}
          >
            {item.slice(0, 1).toUpperCase() + item.slice(1)}
          </Link>
        ))}
      </nav>
      <form method="get" className="flex flex-wrap items-end gap-2">
        {status !== "active" ? <input type="hidden" name="status" value={status} /> : null}
        <label className="flex flex-col gap-1 text-sm">
          Area
          <select name="area" defaultValue={area === null ? "" : String(area)} className="min-h-11 rounded border border-neutral-300 px-3 py-2">
            <option value="">All areas</option>
            {areas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="min-h-11 rounded border border-neutral-300 px-3 py-2">
          Filter
        </button>
      </form>
      {status === "active" ? (
        <section>
          <h2 className="text-lg font-semibold">New project</h2>
          <div className="mt-3">
            <ProjectForm project={null} areas={areas} presetAreaId={area} />
          </div>
        </section>
      ) : null}
      {projects.length === 0 ? <p>No projects yet.</p> : null}
      <ul className="flex flex-col gap-3">
        {projects.map((project) => (
          <li key={project.id} className="rounded border border-neutral-200 px-3 py-3">
            <p className="font-medium">
              <Link href={`/projects/${project.id}`} className="underline">
                {project.title}
              </Link>
            </p>
            <p className="text-sm text-neutral-700">
              {project.lifeAreaId ? areaName.get(project.lifeAreaId) : "No area"}
              {project.targetDate ? ` · ${formatCivilDate(project.targetDate)}` : ""}
            </p>
            {project.status === "active" ? (
              <div className="mt-2">
                <ArchiveProject projectId={project.id} title={project.title} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function statusHref(status: WorkStatus, area: number | null): string {
  const params = new URLSearchParams();
  if (status !== "active") {
    params.set("status", status);
  }
  if (area !== null) {
    params.set("area", String(area));
  }
  const query = params.toString();
  return query ? `/projects?${query}` : "/projects";
}

function parseStatus(value: string | undefined): WorkStatus {
  if (value === "paused" || value === "completed" || value === "archived") {
    return value;
  }
  return "active";
}

function parseArea(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }
  return Number(value);
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
