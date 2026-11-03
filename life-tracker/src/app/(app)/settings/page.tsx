import { logoutAction } from "../../../modules/auth/actions";
import { requireUser } from "../../../lib/current-user";
import { DashboardForm, PasswordForm, ProfileForm } from "../../../components/settings/settings-forms";
import { readDashboardConfig } from "../../../modules/dashboard/queries";
import { listGoalChoices } from "../../../modules/goals/queries";
import { getSettings } from "../../../modules/settings/queries";

// Settings reads the signed-in user, so this page cannot navigate instantly.
export const instant = false;

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getSettings(user.id);
  const dashboard = await readDashboardConfig(user.id);
  const goals = await listGoalChoices(user.id);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <ProfileForm settings={settings} />
      <DashboardForm config={dashboard} goals={goals} />
      <PasswordForm />
      <section className="mt-10 border-t border-neutral-200 pt-6">
        <h2 className="text-lg font-semibold">Sign out</h2>
        <form action={logoutAction} className="mt-4">
          <button type="submit" className="rounded border border-neutral-300 px-3 py-2">
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
