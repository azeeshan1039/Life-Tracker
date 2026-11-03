import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { decimalString } from "../../lib/decimal";
import { getAdminClient } from "../../lib/supabase-admin";
import { decideNetWorth, progressLines } from "./derive";
import { createMetric, createSuggestedMetric, saveMetricEntry, setMetricStatus, setPrimaryMetric } from "./mutations";
import { getGoalMeasurement, getMetric, listEntries, listMetrics, loadAreaCashFlow, loadNetWorth } from "./queries";

const today = "2026-06-16";

test("decimal values stay strings, a future entry is not current, and replacing a date updates one row", async () => {
  const email = uniqueEmail("values");
  try {
    const userId = await insertUser(email, "Values");
    const created = await createMetric(userId, metricInput({ name: "Cash", aggregation: "latest" }));
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const small = await saveMetricEntry(userId, created.id, { recordedOn: "2026-06-01", value: "0.10", note: "" });
    assert.equal(small.ok, true);
    const large = await saveMetricEntry(userId, created.id, {
      recordedOn: "2026-06-02",
      value: "12345678901234.5",
      note: "",
    });
    assert.equal(large.ok, true);
    const future = await saveMetricEntry(userId, created.id, { recordedOn: "2026-06-20", value: "9", note: "" });
    assert.equal(future.ok, true);
    const replaced = await saveMetricEntry(userId, created.id, { recordedOn: "2026-06-02", value: "12345678901234.5", note: "corrected" });
    assert.equal(replaced.ok, true);

    const entries = await listEntries(userId, created.id);
    assert.equal(entries?.length, 3);
    const juneFirst = entries?.find((entry) => entry.recordedOn === "2026-06-01");
    const balance = entries?.find((entry) => entry.recordedOn === "2026-06-02");
    assert.equal(typeof juneFirst?.value, "string");
    assert.equal(juneFirst?.value, "0.1000");
    assert.equal(balance?.value, "12345678901234.5000");
    assert.equal(balance?.note, "corrected");

    const metric = await getMetric(userId, created.id, today);
    assert.equal(metric?.current, "12345678901234.5000");
    assert.equal(metric?.currentOn, "2026-06-02");
  } finally {
    await removeUser(email);
  }
});

test("period sum, net worth, and area cash flow are calculated in SQL", async () => {
  const email = uniqueEmail("worth");
  try {
    const userId = await insertUser(email, "Worth");
    const cash = await createMetric(userId, metricInput({ name: "Cash", kind: "asset", unit: "USD" }));
    const savings = await createMetric(userId, metricInput({ name: "Savings", kind: "asset", unit: "USD" }));
    const card = await createMetric(userId, metricInput({ name: "Card", kind: "liability", unit: "USD" }));
    const income = await createMetric(userId, metricInput({
      name: "Pay",
      kind: "income",
      aggregation: "period_sum",
      lifeAreaId: 5,
    }));
    const rent = await createMetric(userId, metricInput({
      name: "Rent",
      kind: "expense",
      aggregation: "period_sum",
      direction: "decrease",
      lifeAreaId: 5,
    }));
    assert.equal(cash.ok && savings.ok && card.ok && income.ok && rent.ok, true);
    if (!cash.ok || !savings.ok || !card.ok || !income.ok || !rent.ok) return;

    await saveMetricEntry(userId, cash.id, { recordedOn: "2026-06-01", value: "0.10", note: "" });
    await saveMetricEntry(userId, savings.id, { recordedOn: "2026-06-01", value: "0.20", note: "" });
    await saveMetricEntry(userId, card.id, { recordedOn: "2026-06-01", value: "0.10", note: "" });
    await saveMetricEntry(userId, income.id, { recordedOn: "2026-06-03", value: "0.10", note: "" });
    await saveMetricEntry(userId, income.id, { recordedOn: "2026-06-04", value: "0.20", note: "" });
    await saveMetricEntry(userId, income.id, { recordedOn: "2026-07-01", value: "4", note: "" });
    await saveMetricEntry(userId, rent.id, { recordedOn: "2026-06-05", value: "0.10", note: "" });

    const listed = await listMetrics(userId, "active", today);
    assert.equal(decimalString(listed.find((item) => item.id === income.id)?.displayValue ?? ""), "0.3000");

    const worth = await loadNetWorth(userId, today);
    const decision = decideNetWorth([
      { kind: "asset", unit: "USD", aggregation: "latest", value: "0.10" },
      { kind: "asset", unit: "USD", aggregation: "latest", value: "0.20" },
      { kind: "liability", unit: "USD", aggregation: "latest", value: "0.10" },
    ]);
    assert.equal(worth.outcome, "total");
    if (worth.outcome === "total" && decision.outcome === "total") {
      assert.equal(worth.total, decision.total);
      assert.equal(worth.total, "0.2000");
    }

    const flow = await loadAreaCashFlow(userId, 5, today);
    assert.deepEqual(flow, { computed: true, unit: "USD", income: "0.3000", expense: "0.1000", net: "0.2000" });

    const extraIncome = await createMetric(userId, metricInput({
      name: "Bonus",
      kind: "income",
      aggregation: "period_sum",
      lifeAreaId: 5,
    }));
    assert.equal(extraIncome.ok, true);
    const suppressed = await loadAreaCashFlow(userId, 5, today);
    assert.deepEqual(suppressed, { computed: false });
  } finally {
    await removeUser(email);
  }
});

test("mixed units and a missing liability do not become a net worth total", async () => {
  const mixedEmail = uniqueEmail("mixed");
  const missingEmail = uniqueEmail("missing");
  try {
    const mixedUser = await insertUser(mixedEmail, "Mixed");
    const pkr = await createMetric(mixedUser, metricInput({ name: "Cash", kind: "asset", unit: "PKR" }));
    const usd = await createMetric(mixedUser, metricInput({ name: "Card", kind: "liability", unit: "USD" }));
    assert.equal(pkr.ok && usd.ok, true);
    if (!pkr.ok || !usd.ok) return;
    await saveMetricEntry(mixedUser, pkr.id, { recordedOn: "2026-06-01", value: "100", note: "" });
    await saveMetricEntry(mixedUser, usd.id, { recordedOn: "2026-06-01", value: "5", note: "" });
    const mixed = await loadNetWorth(mixedUser, today);
    assert.equal(mixed.outcome, "mixed_units");
    assert.equal("total" in mixed, false);

    const missingUser = await insertUser(missingEmail, "Missing");
    const onlyAsset = await createMetric(missingUser, metricInput({ name: "Cash", kind: "asset", unit: "USD" }));
    assert.equal(onlyAsset.ok, true);
    if (!onlyAsset.ok) return;
    await saveMetricEntry(missingUser, onlyAsset.id, { recordedOn: "2026-06-01", value: "0.30", note: "" });
    const missing = await loadNetWorth(missingUser, today);
    assert.equal(missing.outcome, "missing_liabilities");
    assert.equal("total" in missing, false);
  } finally {
    await removeUser(mixedEmail);
    await removeUser(missingEmail);
  }
});

test("setting a second primary moves the flag, and a goal without a target has no percentage", async () => {
  const email = uniqueEmail("primary");
  try {
    const userId = await insertUser(email, "Primary");
    const supabase = getAdminClient();
    const goal = await supabase.from("goals").insert({ user_id: userId, title: "Save" }).select("id").single();
    assert.equal(goal.error, null);
    const goalId = goal.data?.id ?? "";
    const first = await createMetric(userId, metricInput({ name: "Savings", goalId, primary: true, target: "10" }));
    const second = await createMetric(userId, metricInput({ name: "Cash", goalId, target: null }));
    assert.equal(first.ok && second.ok, true);
    if (!first.ok || !second.ok) return;
    await saveMetricEntry(userId, second.id, { recordedOn: "2026-06-01", value: "4", note: "" });

    const moved = await setPrimaryMetric(userId, goalId, second.id);
    assert.equal(moved.ok, true);
    const flags = await supabase.from("metrics").select("id, is_primary_for_goal").eq("user_id", userId);
    const primaryRows = (flags.data ?? []).filter((row) => row.is_primary_for_goal);
    assert.equal(primaryRows.length, 1);
    assert.equal(primaryRows[0]?.id, second.id);

    const measurement = await getGoalMeasurement(userId, goalId, today);
    assert.equal(measurement.progress.mode, "missing");
    assert.equal("percentText" in measurement.progress, false);
    assert.equal(progressLines(measurement.progress, "USD").some((line) => line.includes("%")), false);
  } finally {
    await removeUser(email);
  }
});

test("listing measurements does not create wealth rows, and another user cannot read them", async () => {
  const ownerEmail = uniqueEmail("owner");
  const otherEmail = uniqueEmail("other");
  try {
    const owner = await insertUser(ownerEmail, "Owner");
    const other = await insertUser(otherEmail, "Other");
    const before = await listMetrics(owner, "active", today);
    assert.equal(before.length, 0);
    const count = await getAdminClient().from("metrics").select("id").eq("user_id", owner);
    assert.equal(count.data?.length, 0);

    const created = await createSuggestedMetric(owner, "savings", "USD", 5);
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const rows = await getAdminClient().from("metrics").select("id, name, kind").eq("user_id", owner);
    assert.equal(rows.data?.length, 1);
    assert.equal(rows.data?.[0]?.name, "Savings");
    assert.equal(rows.data?.[0]?.kind, "asset");

    await saveMetricEntry(owner, created.id, { recordedOn: "2026-06-01", value: "8", note: "private" });
    assert.equal(await getMetric(other, created.id, today), null);
    assert.equal(await listEntries(other, created.id), null);
    const denied = await saveMetricEntry(other, created.id, { recordedOn: "2026-06-02", value: "1", note: "" });
    assert.equal(denied.ok, false);

    const archived = await setMetricStatus(owner, created.id, "archived");
    assert.equal(archived.ok, true);
    const history = await listEntries(owner, created.id);
    assert.equal(history?.length, 1);
  } finally {
    await removeUser(ownerEmail);
    await removeUser(otherEmail);
  }
});

function metricInput(overrides: Partial<{
  name: string;
  kind: "general" | "asset" | "liability" | "income" | "expense";
  unit: string;
  aggregation: "latest" | "period_sum";
  direction: "increase" | "decrease" | "maintain";
  target: string | null;
  lifeAreaId: number | null;
  goalId: string | null;
  primary: boolean;
}> = {}) {
  return {
    name: overrides.name ?? "Metric",
    description: "",
    kind: overrides.kind ?? "general",
    unit: overrides.unit ?? "USD",
    aggregation: overrides.aggregation ?? "latest",
    direction: overrides.direction ?? "increase",
    target: overrides.target === undefined ? null : overrides.target,
    lifeAreaId: overrides.lifeAreaId ?? null,
    goalId: overrides.goalId ?? null,
    primary: overrides.primary ?? false,
  };
}

function uniqueEmail(label: string): string {
  return `lt033-${label}-${randomBytes(6).toString("hex")}@example.com`;
}

async function insertUser(email: string, name: string): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({ email, name, password_hash: "schema-test-not-a-login" })
    .select("id")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data.id;
}

async function removeUser(email: string): Promise<void> {
  await getAdminClient().from("users").delete().eq("email", email);
}
