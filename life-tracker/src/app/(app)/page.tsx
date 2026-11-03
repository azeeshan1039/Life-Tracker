import { todayInTimezone } from "../../lib/dates";
import { requireUser } from "../../lib/current-user";
import { DashboardBoard } from "../../components/dashboard/board";
import { loadDashboard } from "../../modules/dashboard/queries";
import { getSettings } from "../../modules/settings/queries";

export const instant = false;

export default async function DashboardPage() {
  const { connection } = await import("next/server");
  await connection();
  const user = await requireUser();
  const settings = await getSettings(user.id);
  const today = todayInTimezone(new Date(), settings.timezone);
  const data = await loadDashboard(user.id, today);
  return <DashboardBoard data={data} />;
}
