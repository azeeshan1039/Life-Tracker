import { getAdminClient } from "../../lib/supabase-admin";
import { expandRecurrence, occurrenceWindow, type RecurrenceRule } from "./recurrence";

type SeriesRow = {
  id: string;
  freq: RecurrenceRule["freq"];
  interval_count: number;
  by_weekdays: number[] | null;
  by_monthday: number | null;
  starts_on: string;
  until_on: string | null;
  title: string;
  notes: string;
  priority: number;
  estimated_minutes: number | null;
  life_area_id: number | null;
  project_id: string | null;
};

export async function materializeActiveSeries(userId: string, today: string): Promise<void> {
  const { data, error } = await getAdminClient()
    .from("recurrence_series")
    .select(
      "id, freq, interval_count, by_weekdays, by_monthday, starts_on, until_on, title, notes, priority, estimated_minutes, life_area_id, project_id",
    )
    .eq("user_id", userId)
    .eq("is_active", true);
  if (error) {
    throw new Error(error.message);
  }

  await Promise.all((data ?? []).map((series) => insertMissing(userId, series, today)));
}

async function insertMissing(userId: string, series: SeriesRow, today: string): Promise<void> {
  const window = occurrenceWindow(today, series.starts_on, series.until_on);
  if (!window) {
    return;
  }
  const dates = [...new Set(expandRecurrence(
    {
      freq: series.freq,
      intervalCount: series.interval_count,
      byWeekdays: series.by_weekdays ?? [],
      byMonthday: series.by_monthday,
      startsOn: series.starts_on,
      untilOn: series.until_on,
    },
    window.start,
    window.end,
  ))];
  if (dates.length === 0) {
    return;
  }
  // The database function copies series_goals onto the rows this insert actually creates.
  const { error } = await getAdminClient().rpc("insert_series_occurrences", {
    p_user_id: userId,
    p_series_id: series.id,
    p_dates: dates,
    p_title: series.title,
    p_notes: series.notes,
    p_priority: series.priority,
    p_estimated_minutes: series.estimated_minutes,
    p_life_area_id: series.life_area_id,
    p_project_id: series.project_id,
  });
  if (error) {
    throw new Error(error.message);
  }
}
