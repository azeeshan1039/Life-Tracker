export const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

export type ProfileInput = {
  name: string;
  timezone: string;
  weekStartsOn: number;
  currencyCode: string;
};

export type UserSettings = ProfileInput & {
  email: string;
};

export function isIanaTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function parseProfile(formData: FormData): { ok: true; value: ProfileInput } | { ok: false; error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const weekRaw = String(formData.get("weekStartsOn") ?? "");
  const weekStartsOn = Number(weekRaw);
  const currencyCode = String(formData.get("currencyCode") ?? "").trim().toUpperCase();

  if (!name) {
    return { ok: false, error: "Name is required." };
  }
  if (!isIanaTimeZone(timezone)) {
    return { ok: false, error: "Choose a valid timezone." };
  }
  if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
    return { ok: false, error: "Week start must be a day from Sunday through Saturday." };
  }
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    return { ok: false, error: "Currency code must be three letters." };
  }

  return { ok: true, value: { name, timezone, weekStartsOn, currencyCode } };
}
