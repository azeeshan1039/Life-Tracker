import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "migrations");
const databaseUrl = process.env.DIRECT_URL;

if (!databaseUrl) {
  console.error("DIRECT_URL is missing. Run npm run db:migrate from life-tracker.");
  process.exit(1);
}

if (databaseUrl.includes("app_test")) {
  console.error("DIRECT_URL mentions app_test. Refusing to run.");
  process.exit(1);
}

function psql(args, input) {
  const result = spawnSync(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", ...args],
    { encoding: "utf8", input },
  );

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    const message = `${result.stderr ?? ""}${result.stdout ?? ""}`.replaceAll(
      databaseUrl,
      "[redacted]",
    );
    console.error(message.trim() || "psql failed");
    process.exit(result.status ?? 1);
  }

  return (result.stdout ?? "").trim();
}

psql([
  "-c",
  `create table if not exists public.schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )`,
]);

const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

for (const filename of files) {
  if (!/^[A-Za-z0-9._-]+\.sql$/.test(filename)) {
    console.error(`Refusing to run migration with an unsafe filename: ${filename}`);
    process.exit(1);
  }
}

const applied = new Set(
  psql([
    "-At",
    "-c",
    "select filename from public.schema_migrations order by filename",
  ])
    .split("\n")
    .filter(Boolean),
);

let appliedCount = 0;

for (const filename of files) {
  if (applied.has(filename)) {
    continue;
  }

  const sql = readFileSync(path.join(migrationsDir, filename), "utf8");
  if (/\bapp_test\b/i.test(sql)) {
    console.error(`${filename} mentions app_test. Refusing to run.`);
    process.exit(1);
  }

  const wrapped = `begin;
set search_path to public;
${sql}
insert into public.schema_migrations (filename) values (:'filename');
commit;
`;

  psql(["-v", `filename=${filename}`, "-f", "-"], wrapped);
  appliedCount += 1;
  console.log(`applied ${filename}`);
}

if (appliedCount === 0) {
  console.log("nothing pending");
}
