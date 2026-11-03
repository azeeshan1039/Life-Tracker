import { addCivilDays, daysInMonth, isoWeekday, isoWeekDistance, readCivilDate } from "../../lib/dates";

export type RecurrenceRule = {
  freq: "daily" | "weekly" | "monthly";
  intervalCount: number;
  byWeekdays: number[];
  byMonthday: number | null;
  startsOn: string;
  untilOn: string | null;
};

export function occurrenceWindow(
  today: string,
  startsOn: string,
  untilOn: string | null,
): { start: string; end: string } | null {
  const start = startsOn > addCivilDays(today, -7) ? startsOn : addCivilDays(today, -7);
  const horizon = addCivilDays(today, 60);
  const end = untilOn && untilOn < horizon ? untilOn : horizon;
  if (start > end) {
    return null;
  }
  return { start, end };
}

export function expandRecurrence(rule: RecurrenceRule, windowStart: string, windowEnd: string): string[] {
  if (!Number.isInteger(rule.intervalCount) || rule.intervalCount < 1 || windowStart > windowEnd) {
    return [];
  }
  const end = rule.untilOn && rule.untilOn < windowEnd ? rule.untilOn : windowEnd;
  if (rule.startsOn > end) {
    return [];
  }
  if (rule.freq === "daily") {
    return expandDaily(rule.startsOn, rule.intervalCount, windowStart, end);
  }
  if (rule.freq === "weekly") {
    return expandWeekly(rule, windowStart, end);
  }
  return expandMonthly(rule, windowStart, end);
}

function expandDaily(startsOn: string, intervalCount: number, windowStart: string, end: string): string[] {
  let cursor = startsOn;
  if (cursor < windowStart) {
    const span = daySpan(startsOn, windowStart);
    const steps = Math.ceil(span / intervalCount);
    cursor = addCivilDays(startsOn, steps * intervalCount);
  }
  const dates: string[] = [];
  while (cursor <= end) {
    if (cursor >= windowStart) {
      dates.push(cursor);
    }
    cursor = addCivilDays(cursor, intervalCount);
  }
  return dates;
}

function expandWeekly(rule: RecurrenceRule, windowStart: string, end: string): string[] {
  const weekdays = new Set(rule.byWeekdays.filter((day) => day >= 1 && day <= 7));
  if (weekdays.size === 0) {
    return [];
  }
  const dates: string[] = [];
  let cursor = windowStart > rule.startsOn ? windowStart : rule.startsOn;
  while (cursor <= end) {
    const distance = isoWeekDistance(rule.startsOn, cursor);
    if (distance >= 0 && distance % rule.intervalCount === 0 && weekdays.has(isoWeekday(cursor))) {
      dates.push(cursor);
    }
    cursor = addCivilDays(cursor, 1);
  }
  return dates;
}

function expandMonthly(rule: RecurrenceRule, windowStart: string, end: string): string[] {
  if (rule.byMonthday === null || rule.byMonthday < 1 || rule.byMonthday > 31) {
    return [];
  }
  const start = readCivilDate(rule.startsOn);
  const last = readCivilDate(end);
  const startIndex = start.year * 12 + (start.month - 1);
  const lastIndex = last.year * 12 + (last.month - 1);
  const dates: string[] = [];
  for (let index = startIndex; index <= lastIndex; index += rule.intervalCount) {
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    const day = Math.min(rule.byMonthday, daysInMonth(year, month));
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (date < rule.startsOn || date < windowStart || date > end) {
      continue;
    }
    dates.push(date);
  }
  return dates;
}

function daySpan(from: string, to: string): number {
  const start = readCivilDate(from);
  const end = readCivilDate(to);
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);
  return Math.round((endUtc - startUtc) / 86_400_000);
}
