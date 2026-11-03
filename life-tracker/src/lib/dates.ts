export function todayInTimezone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error(`Could not resolve a civil date for ${timeZone}`);
  }
  return `${year}-${month}-${day}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatCivilDate(value: string): string {
  const parts = readCivilDate(value);
  const monthName = MONTHS[parts.month - 1];
  if (!monthName) {
    throw new Error(`Could not format civil date ${value}`);
  }
  return `${parts.day} ${monthName} ${parts.year}`;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function readCivilDate(value: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Could not read civil date ${value}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    throw new Error(`Could not read civil date ${value}`);
  }
  return { year, month, day };
}

export function civilDateInZone(value: string, timeZone: string): string {
  const parts = readCivilDate(value);
  new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(Date.UTC(2020, 0, 1, 12)));
  return formatParts(parts);
}

export function addCivilDays(value: string, days: number): string {
  const parts = readCivilDate(value);
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return formatParts({
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  });
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isoWeekday(value: string): number {
  const parts = readCivilDate(value);
  const jsDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

export function weekdayLabel(value: string): string {
  return WEEKDAYS[isoWeekday(value) - 1] ?? "";
}

export function startOfWeek(value: string, weekStartsOn: number): string {
  if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
    throw new Error("Week start must be from 0 to 6.");
  }
  const parts = readCivilDate(value);
  const jsDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  const delta = (jsDay - weekStartsOn + 7) % 7;
  return addCivilDays(value, -delta);
}

export function isoWeekDistance(from: string, to: string): number {
  const fromMonday = addCivilDays(from, 1 - isoWeekday(from));
  const toMonday = addCivilDays(to, 1 - isoWeekday(to));
  return (dayNumber(toMonday) - dayNumber(fromMonday)) / 7;
}

export function shiftMonth(month: string, delta: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    throw new Error(`Could not read month ${month}`);
  }
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + delta, 1));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function calendarMonthBounds(civilDate: string): { start: string; end: string } {
  const parts = readCivilDate(civilDate);
  const month = String(parts.month).padStart(2, "0");
  const last = String(daysInMonth(parts.year, parts.month)).padStart(2, "0");
  return {
    start: `${parts.year}-${month}-01`,
    end: `${parts.year}-${month}-${last}`,
  };
}

export function formatMonth(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    throw new Error(`Could not read month ${month}`);
  }
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1, 12)));
}

export function formatClockTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).format(instant);
}

function formatParts(parts: { year: number; month: number; day: number }): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function dayNumber(value: string): number {
  const parts = readCivilDate(value);
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000);
}
