"use client";

import { useActionState } from "react";
import { WIDGET_IDS, type DashboardConfig } from "../../modules/dashboard/config";
import {
  changePasswordAction,
  saveDashboardAction,
  updateSettingsAction,
  type DashboardFormState,
  type PasswordFormState,
  type ProfileFormState,
} from "../../modules/settings/actions";
import { WEEKDAYS, type UserSettings } from "../../modules/settings/fields";

const timeZones = Intl.supportedValuesOf("timeZone");

export function ProfileForm({ settings }: { settings: UserSettings }) {
  const initialState: ProfileFormState = {
    error: "",
    saved: false,
    attempt: 0,
    name: settings.name,
    timezone: settings.timezone,
    weekStartsOn: String(settings.weekStartsOn),
    currencyCode: settings.currencyCode,
  };
  const [state, formAction, pending] = useActionState(updateSettingsAction, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Profile</h2>
      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.saved ? <p className="text-sm">Saved.</p> : null}
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          autoComplete="name"
          required
          defaultValue={state.name}
          key={`name-${state.attempt}`}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          value={settings.email}
          readOnly
          className="rounded border border-neutral-300 bg-neutral-50 px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="timezone" className="text-sm font-medium">
          Timezone
        </label>
        <input
          id="timezone"
          name="timezone"
          list="timezones"
          required
          defaultValue={state.timezone}
          key={`timezone-${state.attempt}`}
          className="rounded border border-neutral-300 px-3 py-2"
        />
        <datalist id="timezones">
          {timeZones.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="weekStartsOn" className="text-sm font-medium">
          Week starts on
        </label>
        <select
          id="weekStartsOn"
          name="weekStartsOn"
          defaultValue={state.weekStartsOn}
          key={`week-${state.attempt}`}
          className="rounded border border-neutral-300 px-3 py-2"
        >
          {WEEKDAYS.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="currencyCode" className="text-sm font-medium">
          Currency code
        </label>
        <input
          id="currencyCode"
          name="currencyCode"
          required
          maxLength={3}
          defaultValue={state.currencyCode}
          key={`currency-${state.attempt}`}
          className="rounded border border-neutral-300 px-3 py-2 uppercase"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const initialState: PasswordFormState = { error: "", saved: false, attempt: 0 };
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="mt-10 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Password</h2>
      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.saved ? <p className="text-sm">Password changed. Other sessions were signed out.</p> : null}
      <div className="flex flex-col gap-1">
        <label htmlFor="currentPassword" className="text-sm font-medium">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          key={`current-${state.attempt}`}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="newPassword" className="text-sm font-medium">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          key={`new-${state.attempt}`}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          key={`confirm-${state.attempt}`}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-60"
      >
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}

const widgetLabels: Record<(typeof WIDGET_IDS)[number], string> = {
  today: "Today",
  habits: "Habits",
  upcoming: "Upcoming",
  pinned_goals: "Pinned goals",
  inbox: "Inbox",
};

export function DashboardForm({
  config,
  goals,
}: {
  config: DashboardConfig;
  goals: { id: string; title: string }[];
}) {
  const initialState: DashboardFormState = { error: "", saved: false, attempt: 0 };
  const [state, formAction, pending] = useActionState(saveDashboardAction, initialState);
  const hidden = new Set(config.hiddenWidgets);
  const pinned = new Set(config.pinnedGoalIds);

  return (
    <form action={formAction} className="mt-10 flex flex-col gap-4 border-t border-neutral-200 pt-6">
      <h2 className="text-lg font-semibold">Dashboard</h2>
      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.saved ? <p className="text-sm">Saved.</p> : null}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Hidden widgets</legend>
        {WIDGET_IDS.map((id) => (
          <label key={`${id}-${state.attempt}`} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="hiddenWidgets" value={id} defaultChecked={hidden.has(id)} />
            {widgetLabels[id]}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Pinned goals</legend>
        {goals.length === 0 ? <p className="text-sm">Goals are optional. Tasks do not need one.</p> : null}
        {goals.map((goal) => (
          <label key={`${goal.id}-${state.attempt}`} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="pinnedGoalIds" value={goal.id} defaultChecked={pinned.has(goal.id)} />
            {goal.title}
          </label>
        ))}
      </fieldset>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save dashboard"}
      </button>
    </form>
  );
}
