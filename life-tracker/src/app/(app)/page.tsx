import { todayInTimezone } from "../../lib/dates";
import { requireUser } from "../../lib/current-user";
import { DashboardBoard } from "../../components/dashboard/board";
import { loadDashboard, readDashboardBootstrap } from "../../modules/dashboard/queries";

export const instant = false;

export default async function DashboardPage() {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const bootstrap = await readDashboardBootstrap(user.id);
  const today = todayInTimezone(new Date(), bootstrap.timezone);
  const data = await loadDashboard(user.id, today, bootstrap.config);
  return <DashboardBoard data={data} />;
}
