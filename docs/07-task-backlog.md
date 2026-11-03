# Initial task backlog

Status: planning artifact, 27 October 2026. Every task is `not_started`. This file is the progress source of truth during implementation. When a task is finished, change its status to `done` and leave the text in place.

Dependencies are other task ids. Do not start a task until its dependencies are `done`. Paths are the expected shape from the architecture document; an implementer may rename a file if the module boundary stays the same and this task's expected-changes line is updated.

No application code is implied to exist yet.

## Phase 0 — Foundation

### LT-001 — Scaffold the Next.js application

- Status: `not_started`
- Depends on: none
- Description: Create the git repository and a TypeScript Next.js 16 app using the App Router. Pin the latest Next.js 16.4 patch and React 19. Set the Node engine to 24. Enable strict TypeScript. Add Tailwind. Add a root README that points to `docs/` and states that product behavior is specified there.
- Expected changes: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx` as a temporary public placeholder, `README.md`, `.gitignore`.
- Acceptance criteria: The app compiles in production mode. The engine field rejects the idea that Node 23 is the target runtime. The placeholder page does not claim that tasks or login exist. `LT-010` removes this placeholder so it does not collide with the authenticated `/` route.
- Tests: `npx tsc --noEmit` succeeds. No product test yet.

### LT-002 — Connect Supabase PostgreSQL

- Status: `done`
- Depends on: `LT-001`
- Description: Use one Supabase project. Put `DATABASE_URL` and `DIRECT_URL` in `.env`, and publish only blank placeholders in `.env.example`. Ignore `.env`. Do not add a Postgres container and do not add a second Supabase project. Turn the Data API off. Do not put the anon key or the service-role key in the environment. Session-mode pooler or direct TLS URLs are allowed. Transaction-mode port 6543 is not the runtime URL for this long-running server. The app schema is `public`. Tests will later use schema `app_test` in this same database.
- Completed: 27 October 2026. The owner kept the Data API on and dropped Drizzle. `life-tracker/.env` holds `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `DIRECT_URL`. `DIRECT_URL` is the session-mode pooler on port 5432 with `sslmode=require`, because the direct host is IPv6-only and unreachable from this network. Project ref `hvxbufrlrwaplwqbwgpu`. `select 1` succeeded over TLS 1.3. The Data API returned 200. `.env.example` has blank placeholders.
- Expected changes: `.env.example`, `.gitignore` update, a short connection note in the root README that points at the architecture document.
- Acceptance criteria: `psql` or a one-line script runs `select 1` against the project over TLS. `.env` is not committed. There is no `TEST_DATABASE_URL` or `PROD_DATABASE_URL`.
- Tests: The connectivity check. Record the project refs used, not the passwords.

### LT-003 — Add the SQL migration runner

- Status: `done`
- Depends on: `LT-002`
- Description: Do not add Drizzle. Add a script that applies SQL files in filename order through `DIRECT_URL`, with `sslmode=require`. Record each applied filename in `public.schema_migrations`. An empty baseline migration is acceptable. Prefer waiting for tables until `LT-006`. The script must not create or truncate `app_test`.
- Expected changes: `life-tracker/scripts/migrate.ts` or `life-tracker/src/db/migrate.ts`, a `db:migrate` npm script, and a migrations directory.
- Acceptance criteria: `npm run db:migrate` applies pending SQL to schema `public` and exits 0. A second run is a no-op. The migrate script does not create or truncate `app_test`.
- Tests: Run the migrate command twice.

### LT-004 — Add Vitest and ESLint

- Status: `not_started`
- Depends on: `LT-001`
- Description: Add Vitest and the Next.js ESLint setup. Add a test database helper that reads `DATABASE_URL`, fails with an explicit message when it is missing, creates or reuses schema `app_test`, sets `search_path` to that schema, and aborts before any truncate or delete if the current schema is `public`.
- Expected changes: `vitest.config.ts`, `eslint.config.mjs` or the current Next equivalent, `src/lib/smoke.test.ts`.
- Acceptance criteria: `npm test` runs the unit smoke test. Lint runs.
- Tests: The smoke test asserts a trivial pure function so the runner is proven.

### LT-005 — Add logging and baseline security headers

- Status: `done`
- Depends on: `LT-001`
- Completed: 27 October 2026. Pino redacts `password`, `cookie`, `authorization`, and `token`. Next sends `nosniff`, `strict-origin-when-cross-origin`, and `DENY`. The authenticated-layout comment is in `life-tracker/src/app/(app)/layout.tsx`.
- Description: Add Pino with redaction for `password`, `cookie`, `authorization`, and `token`. Add baseline security headers in the Next config. Leave a code comment on the future authenticated layout location stating that those routes stay dynamic and must not use the shared cache for user rows.
- Expected changes: `src/lib/logger.ts`, `src/lib/logger.test.ts`, `next.config.ts`.
- Acceptance criteria: A log call that includes a password field emits a redacted value. Headers include `nosniff`, a referrer policy, and frame denial.
- Tests: Unit test the redaction.

## Phase 1 — Identity, shell, and life areas

### LT-006 — Identity and life-area schema

- Status: `done`
- Depends on: `LT-003`
- Description: Add `users`, `sessions`, `login_attempts`, `user_settings`, and `life_areas`, including checks from the data model. Seed the six life areas in the migration.
- Completed: 27 October 2026. Applied `life-tracker/migrations/0002_identity_and_life_areas.sql`. The six keys are `business`, `career`, `health`, `deen`, `wealth`, and `relationships`. `week_starts_on` rejects 7 and accepts 0 and 6. No Drizzle `schema.ts`; SQL is the schema source.
- Expected changes: `src/db/schema.ts`, a new SQL migration.
- Acceptance criteria: Migrating an empty database inserts exactly the six areas with the keys in the data model. Enum and check constraints reject a week start outside 0–6.
- Tests: Integration test queries the six keys.

### LT-007 — Sessions, passwords, and requireUser

- Status: `done`
- Depends on: `LT-006`, `LT-005`
- Completed: 27 October 2026. Argon2id login, logout, 30-day sessions, and `requireUser()` are in `life-tracker/src/modules/auth` and `life-tracker/src/lib/current-user.ts`. The sixth failure inside 15 minutes rejects the real password. There is no registration function.
- Description: Implement Argon2id hashing, login, logout, session creation, cookie flags, expiry, and the failure counter. Implement `requireUser()` that loads the session from the hashed token. Do not add a registration function.
- Expected changes: `src/modules/auth/password.ts`, `src/modules/auth/session.ts`, `src/modules/auth/actions.ts`, `src/lib/current-user.ts`.
- Acceptance criteria: A wrong password and a missing user return the same error. The sixth failure inside 15 minutes does not check the password again. Logout deletes the session row. An expired session is rejected.
- Tests: Integration tests for those cases. Unit test that the hash is not the raw password.

### LT-008 — Seed the owner

- Status: `done`
- Depends on: `LT-007`
- Completed: 27 October 2026. `npm run db:seed` creates one owner from `SEED_USER_EMAIL` and `SEED_USER_PASSWORD`, with timezone `Asia/Karachi`, week start Monday, and currency `USD`. A second run leaves that user in place. The password is not printed.
- Description: Add a seed command that creates the owner and a settings row from `SEED_USER_EMAIL` and `SEED_USER_PASSWORD` when no user exists. If a user exists, it does nothing. Default timezone `Asia/Karachi`, week start Monday, currency `USD`.
- Expected changes: `scripts/seed.ts`, npm script `db:seed`.
- Acceptance criteria: Running twice still leaves one user. The password is not printed.
- Tests: Integration test runs the seed function against the test database.

### LT-009 — Login screen

- Status: `done`
- Depends on: `LT-007`
- Completed: 27 October 2026. `/login` has email, password, and Sign in. Errors use "Email or password is incorrect". There is no signup or password-reset link. Success redirects to `/today`.
- Description: Build `/login` with email and password. Generic error text. No signup link.
- Expected changes: `src/app/(public)/login/page.tsx`, a small form component.
- Acceptance criteria: Successful login lands on `/today`. Failed login keeps the email and clears the password. The page has labels and a submit control.
- Tests: Covered more deeply by `LT-053`. Here, the action tests from `LT-007` remain the automated gate. Manually submit once if a browser is available.

### LT-010 — Authenticated shell

- Status: `done`
- Depends on: `LT-009`, `LT-004`
- Completed: 27 October 2026. The signed-in layout reads the session cookie and redirects a missing session to `/login`. `src/middleware.ts` lets `/login`, `/offline`, and `/health` through and sends other document requests without a cookie to `/login`. Next 16 still loads that file and warns that the name is deprecated. The home route redirects to `/today`. The starter `src/app/page.tsx` is gone. `cacheComponents` rejects `export const dynamic`, so the cookie read is the dynamic boundary. The anonymous today-loader test passed.
- Description: Add the authenticated layout with desktop sidebar and phone bottom navigation as specified in the UX document. Delete the temporary `src/app/page.tsx` from `LT-001`. Put a placeholder home at `src/app/(app)/page.tsx` that redirects to `/today` until `LT-037`. Middleware sends anonymous document requests to `/login` and allows `/login`, `/offline`, `/health`, and static assets. The layout and the `/today` loader also call `requireUser()`. Mark the authenticated segment dynamic.
- Expected changes: `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`, `src/app/(app)/today/page.tsx`, `src/components/shell/nav.tsx`, `src/middleware.ts`. Removal of the root `src/app/page.tsx`.
- Acceptance criteria: `/today` without a cookie redirects to login. `/health` is not redirected to login once it exists; until `LT-051`, the middleware matcher simply must not require a session for that path. The phone nav contains Today, Tasks, Plan, Areas, and More. Desktop nav contains the full list from the UX document. Tasks and other routes may be placeholder links until their phases. There is only one page module for `/`.
- Tests: Integration or request test that an anonymous call to the today loader is rejected even if middleware is bypassed.

### LT-011 — Settings for time and password

- Status: `done`
- Depends on: `LT-010`, `LT-008`
- Completed: 27 October 2026. Settings edits the display name, timezone, week start, and currency code. Email stays read-only. A wrong current password leaves the hash and other sessions unchanged. A correct change re-hashes the password and deletes the other sessions. There is no account-deletion control. `todayInTimezone` returns the local civil date for `Asia/Karachi`, `Pacific/Kiritimati`, and `Pacific/Honolulu` around UTC midnight. The three database checks passed.
- Description: Settings page edits display name, timezone, week start, and currency code, and changes the password when the current password is correct. Password change deletes other sessions. Add `src/lib/dates.ts` with a `todayInTimezone` helper that takes an instant and an IANA zone and returns a civil date. Do not implement that helper with `new Date('YYYY-MM-DD')`.
- Expected changes: `src/modules/settings/*`, `src/app/(app)/settings/page.tsx`, `src/lib/dates.ts`, `src/lib/dates.test.ts`.
- Acceptance criteria: A saved timezone is the value later date helpers will read. A wrong current password does not change the hash. There is still no account-deletion control. `todayInTimezone` returns the local civil date for `Asia/Karachi`, `Pacific/Kiritimati`, and `Pacific/Honolulu` around UTC midnight.
- Tests: Integration tests for update and rejected password change. Unit tests for the three zones.

## Phase 2 — Tasks

### LT-012 — Task schema

- Status: `done`
- Depends on: `LT-006`
- Completed: 27 October 2026. Applied `life-tracker/migrations/0003_tasks.sql`. `tasks` and `task_activity` include the statuses, checks, and indexes from the data model. `series_id`, `project_id`, and `milestone_id` are nullable and have no foreign keys yet. A valid task inserted. An inverted time range and priority 4 were rejected. `tasks_user_open_due_idx` and `tasks_user_scheduled_idx` exist.
- Description: Add `tasks` and `task_activity` with the checks, statuses, and indexes from the data model, except goal and project foreign keys, which arrive in phase 5. Include nullable date and time columns.
- Expected changes: schema and migration.
- Acceptance criteria: An inverted time range is rejected. Priority outside 0–3 is rejected. Open-task indexes exist.
- Tests: Integration test inserts a valid task and expects rejection for `scheduled_end` before `scheduled_start`.

### LT-013 — Task mutations and activity

- Status: `done`
- Depends on: `LT-012`, `LT-007`
- Completed: 27 October 2026. Create, edit, complete, reopen, cancel, and reschedule live in `life-tracker/src/modules/tasks`. Each status change and reschedule writes `task_activity` in the same database function as the task row. Completing sets `done` and `completed_at`. Reopening returns the task to `todo`, clears `completed_at`, and leaves the completed event in place. Reschedule stores previous and next `scheduled_for` and `due_on` and does not copy note text. Another user's id returns "This task is not available." Queries take `userId`.
- Description: Implement create, edit, complete, reopen, cancel, and reschedule. Each status change and reschedule appends `task_activity` in the same transaction. Queries always take `userId`.
- Expected changes: `src/modules/tasks/schema.ts`, `queries.ts`, `mutations.ts`.
- Acceptance criteria: Completing sets `done` and `completed_at` and writes `completed`. Reopening writes `reopened` and nulls `completed_at` while the completed event remains. Reschedule stores previous and next dates in `detail` and does not copy note text into `detail`.
- Tests: Integration tests for that sequence and for user B receiving not found on user A's task id.

### LT-014 — Task list

- Status: `done`
- Depends on: `LT-013`, `LT-010`
- Completed: 27 October 2026. `/tasks` has Upcoming, Overdue, Inbox, and Completed, with area and priority filters. Completed reads `completed` activity from the last 30 days and stops at 50 rows. `/today` groups scheduled, due today, and overdue. A task scheduled for today and due in three days stays in scheduled only. The next day it is overdue. Inbox tasks stay out of those groups. The grouping tests passed. Phone and desktop widths were not clicked through in a browser.
- Description: Build `/tasks` with upcoming, overdue, inbox, and completed views, plus area and priority filters. Completed uses activity in the last 30 days and pages 50 rows. Include a basic `/today` grouping of scheduled, due today, and overdue.
- Expected changes: `src/app/(app)/tasks/page.tsx`, `src/modules/tasks/views.ts`, update `today/page.tsx`.
- Acceptance criteria: A task scheduled for today and due in three days appears in the scheduled group and not also in due-today. The day after the due date, while still open, it is overdue. Inbox tasks do not appear in those groups.
- Tests: Integration tests for the three groupings with a fixed today. Manual check at 390px and 1280px.

### LT-015 — Task detail and subtasks

- Status: `done`
- Depends on: `LT-014`
- Completed: 27 October 2026. `/tasks/[id]` edits an open task, lists activity, and adds one level of subtasks. A subtask of a subtask is rejected. Parent and child can have different due dates. Completing a parent leaves children open, and the page says "This does not complete the subtasks" when any child is still open. Another user's id shows "This task is not available."
- Description: Build `/tasks/[id]` with edit, activity, and one-level subtasks. Reject a grandchild. Completing a parent does not complete children, and the UI says so when children are open.
- Expected changes: `src/app/(app)/tasks/[id]/page.tsx`, subtask functions in the tasks module.
- Acceptance criteria: A subtask of a subtask fails validation. Parent and child can have different due dates. Another user's id shows "This task is not available."
- Tests: Integration tests for depth and for parent completion.

### LT-016 — Quick capture

- Status: `done`
- Depends on: `LT-014`
- Completed: 27 October 2026. The capture field on `/today` and `/tasks` calls `captureInboxTask`, which saves an inbox task with a title only. Dates, life area, and estimate stay null. The field clears after a save and keeps the typed title when the save fails.
- Description: Add the capture field on `/today` and `/tasks`. It inserts an inbox task with only a title.
- Expected changes: `src/modules/tasks/capture.ts`, form on the two pages.
- Acceptance criteria: The new task has null dates and status `inbox`. The field clears on success. A failed submit keeps the text.
- Tests: Integration test for the inserted shape. The today grouping test still excludes it.

## Phase 3 — Recurrence and calendar

### LT-017 — Recurrence schema

- Status: `done`
- Depends on: `LT-012`
- Completed: 27 October 2026. Applied `life-tracker/migrations/0006_recurrence_series.sql`. `series_id`, `occurrence_on`, `detached`, the subtask check, and `tasks_series_occurrence_uidx` were already in `0003_tasks.sql`; this migration adds `recurrence_series` and the `on delete set null` foreign key. `series_goals` and the project foreign key wait. A second task on the same series and occurrence date is rejected, and a subtask cannot also have a series.
- Description: Add `recurrence_series` and the task columns `series_id`, `occurrence_on`, and `detached`, plus the partial unique index. Defer `series_goals` to phase 5.
- Expected changes: schema and migration.
- Acceptance criteria: Two tasks with the same series and occurrence date cannot both commit. A subtask cannot also have a series.
- Tests: Integration test for the unique violation and the subtask check.

### LT-018 — Recurrence expansion

- Status: `done`
- Depends on: `LT-011`
- Completed: 27 October 2026. `expandRecurrence` covers daily steps, ISO-week intervals, and the 31 January clamp. February is 29 February 2024 and 28 February 2026. `until_on` is inclusive. `civilDateInZone` keeps a date-only string on the same civil date in `Asia/Karachi`, `Pacific/Kiritimati`, and `Pacific/Honolulu`. The unit checks passed.
- Description: Implement pure date expansion for daily, weekly, and monthly rules, including the February clamp and ISO-week intervals. Extend `src/lib/dates.ts` from `LT-011` rather than parsing date-only strings with `new Date`.
- Expected changes: `src/modules/tasks/recurrence.ts`, `recurrence.test.ts`, additions to `src/lib/dates.ts`.
- Acceptance criteria: The cases in the testing document pass, including leap-year and non-leap-year 31 January series, and a date-only string that stays on the same civil date in `Asia/Karachi`, `Pacific/Kiritimati`, and `Pacific/Honolulu`.
- Tests: The unit tests themselves.

### LT-019 — Materialize occurrences

- Status: `done`
- Depends on: `LT-017`, `LT-018`, `LT-013`
- Completed: 27 October 2026. `materializeActiveSeries` expands each active series from seven days before today through 60 days after today, clipped by the series bounds. `insert_series_occurrences` inserts with `on conflict do nothing` and copies the template title, notes, priority, estimate, and area. `scheduled_for` is the occurrence date. `/today`, `/tasks`, and `/calendar` call it before loading tasks. A cancelled row stays, so the same date is not inserted again.
- Description: Implement `materializeActiveSeries` for the window from seven days before today through 60 days after today, clipped by the series bounds. Use insert-on-conflict-do-nothing. Call it from the loaders for `/today` and `/tasks`.
- Expected changes: `src/modules/tasks/materialize.ts`.
- Acceptance criteria: Two runs create one row per date. A cancelled occurrence is not reinserted. Occurrences copy title and priority from the template.
- Tests: Integration tests for double run and cancel.

### LT-020 — Edit a series, detach, and deactivate

- Status: `done`
- Depends on: `LT-019`, `LT-015`
- Completed: 27 October 2026. A series occurrence shows the banner on task detail. Saving that occurrence sets `detached` before the edit. Saving the template updates open, attached occurrences on or after today, so a detached row and a completed row keep their titles. Stop the series sets `is_active` false and cancels future open attached occurrences. A past completed row is left alone.
- Description: Add the series banner actions on the task detail. Template edits update open, attached occurrences on or after today. An occurrence edit sets `detached`. Deactivate cancels future open attached occurrences and leaves history.
- Expected changes: series mutation functions and detail UI.
- Acceptance criteria: A detached occurrence keeps its title when the template title changes. A completed occurrence keeps its title. A future open attached occurrence takes the new title. Deactivate does not cancel a past completed row.
- Tests: Integration tests for those three rows.

### LT-021 — Calendar view

- Status: `done`
- Depends on: `LT-019`, `LT-010`
- Completed: 27 October 2026. `/calendar` shows a week agenda, and a month grid from the `md` breakpoint up, so a phone opens on the agenda. Items are tasks only. A due date with no time is all-day. A `scheduled_start` is shown at that clock time in the user zone. Adding from a day inserts a task with `scheduled_for` set. There is no `events` table and no drag and drop.
- Description: Build `/calendar` with a week agenda and a month grid over tasks and, later, milestones. Until milestones exist, render tasks only. Adding from a day creates a task with `scheduled_for` set. No drag and drop.
- Expected changes: `src/app/(app)/calendar/page.tsx`, `src/modules/tasks/calendar.ts`.
- Acceptance criteria: A due date with no time appears as an all-day item. A `scheduled_start` appears at that time in the user zone. No `events` table exists.
- Tests: Integration test for the day query. Manual check that the phone defaults to the agenda.

## Phase 4 — Habits

### LT-022 — Habit schema

- Status: `done`
- Depends on: `LT-006`
- Completed: 2 November 2026. Applied `life-tracker/migrations/0008_habits.sql`. A boolean habit with a target is rejected, a numeric habit without a unit is rejected, and a second log for the same day is rejected. `goal_id` is nullable and has no foreign key until goals exist. A boolean log must store 1.
- Description: Add `habits` and `habit_logs` with the checks and unique `(habit_id, logged_on)`. Include nullable `goal_id` for later, unused by the form until phase 5.
- Expected changes: schema and migration.
- Acceptance criteria: A boolean habit with a target is rejected. A numeric habit without a unit is rejected. A second log for the same day is rejected at the database.
- Tests: Integration tests for those constraints.

### LT-023 — Habit classification

- Status: `done`
- Depends on: `LT-022`, `LT-011`
- Completed: 2 November 2026. `classify` covers fixed-day classes, including below target, skip, and rest. A weekly quota stays `in_progress` with a met count until the ISO week ends, then the week is met or missed while empty days stay empty. A paused day with no log is `paused`, not missed. The unit checks passed.
- Description: Implement `classify` for fixed days, weekly quotas, and paused habits, as specified in the data model. Use `src/lib/dates.ts`. This task does not depend on recurrence.
- Expected changes: `src/modules/habits/classify.ts`, `classify.test.ts`.
- Acceptance criteria: Every class in the data-model tables is covered, including mid-week quota and paused days labeled paused rather than missed.
- Tests: The unit file.

### LT-024 — Habit screens

- Status: `done`
- Depends on: `LT-023`, `LT-010`
- Completed: 2 November 2026. `/habits` lists active habits and creates one. The detail form edits it. A duration log of 1 hour 30 minutes stores 90. Times-per-week habits say the count resets on Monday. Archiving keeps the log.
- Description: Build the habit index, create form, and detail form. Duration entry accepts hours and minutes and stores minutes.
- Expected changes: `src/app/(app)/habits/page.tsx`, `src/app/(app)/habits/[id]/page.tsx`, `src/modules/habits/mutations.ts`.
- Acceptance criteria: A 1 hour 30 minute entry stores `90`. Weekly quota copy states that the count resets on Monday. Archive keeps logs.
- Tests: Integration test for the minute conversion and for archive not deleting logs.

### LT-025 — Habit history and logging

- Status: `done`
- Depends on: `LT-024`
- Completed: 2 November 2026. Habit detail shows 12 weeks. Each cell names met, below target, missed, skipped, rest, or unscheduled. Logging, skipping, or resting a day writes one row, and saving that day again updates it.
- Description: On the habit detail, show 12 weeks and let the user log, skip, or rest a selected date. Saving the same date updates the row.
- Expected changes: history component and upsert action.
- Acceptance criteria: Cells expose an accessible name for met, missed, skipped, rest, and unscheduled. A below-target numeric log is distinguishable from met.
- Tests: Integration upsert test. Manual keyboard check of the form.

### LT-026 — Habits on My Day

- Status: `done`
- Depends on: `LT-025`, `LT-014`
- Completed: 2 November 2026. My Day lists habits that are due today and logs them with the same save as the habit page. A Monday-only habit is absent on Tuesday. A weekly quota that has already been met is omitted behind "Weekly habits met".
- Description: Add the habit region to `/today` using the classifier. Hide unscheduled habits. Hide a weekly-quota habit once its week is met, behind a short disclosure.
- Expected changes: `src/app/(app)/today/page.tsx`, a habit query for today.
- Acceptance criteria: A Monday-only habit is absent on Tuesday. Logging from My Day creates the same unique log as the habit page.
- Tests: Integration test for the Monday/Tuesday case and the quota-met case.

## Phase 5 — Goals and projects

### LT-027 — Goal and project schema

- Status: `done`
- Depends on: `LT-012`
- Completed: 2 November 2026. Migration `0009_goals_projects.sql` adds goals, projects, milestones, and the link tables. Task and series project ids, task milestone ids, and habit goal ids now reference those tables and clear when the parent is deleted. A task can exist with no project and no goal links. A milestone requires one project.
- Description: Add `goals`, `projects`, `project_goals`, `milestones`, `task_goals`, and `series_goals`. Add nullable `project_id` and `milestone_id` on tasks. Follow on-delete behavior from the data model.
- Expected changes: schema and migration.
- Acceptance criteria: A task can exist with null project and no goal links. A milestone belongs to one project.
- Tests: Integration test inserts an unlinked task and a project with two goals.

### LT-028 — Goal screens

- Status: `done`
- Depends on: `LT-027`, `LT-010`
- Completed: 2 November 2026. `/goals` lists goals by status and area, and the detail page edits title, description, target date, and area. There is no percentage. Archiving removes the goal from the active list and leaves linked tasks in place.
- Description: Build the goal index and detail with status, target date, description, and area. Do not show a percentage. The primary metric control waits for phase 6.
- Expected changes: `src/app/(app)/goals/page.tsx`, `src/app/(app)/goals/[id]/page.tsx`, `src/modules/goals/goal-mutations.ts`.
- Acceptance criteria: Archive hides the goal from the active list and does not delete linked tasks once those links exist.
- Tests: Integration test for archive.

### LT-029 — Project screens and milestones

- Status: `done`
- Depends on: `LT-028`
- Completed: 2 November 2026. `/projects` lists projects, and the detail page adds, reorders, and completes milestones. Empty projects say "Milestones are optional checkpoints." A milestone with a target date shows on the calendar as Milestone. Existing goals can be linked, and a new goal created here returns to the project.
- Description: Build project index and detail. Milestones can be added, reordered with up and down controls, and marked done. Goals can be linked from existing goals.
- Expected changes: `src/app/(app)/projects/page.tsx`, `src/app/(app)/projects/[id]/page.tsx`.
- Acceptance criteria: Milestone order persists. Marking done sets `completed_at`. The empty milestone state is the sentence in the UX document. A milestone with a target date appears on `/calendar` once this task is done.
- Tests: Integration test for order and done.

### LT-030 — Link tasks to projects and goals

- Status: `done`
- Depends on: `LT-029`, `LT-015`
- Completed: 2 November 2026. The task form can save with no project, milestone, or goal. A task can sit on several goals and on one project. Open tasks show on the goal page and are grouped by milestone on the project page. Deleting a milestone clears that field and keeps the task. The habit form has an optional goal.
- Description: Add optional project, milestone, and goal multi-select to the task form. A task still saves with none of them. Show linked tasks on the goal and project pages. Group project tasks by milestone. Add an optional goal field to the habit form, using the nullable `goal_id` from `LT-022`.
- Expected changes: task form and goal/project queries.
- Acceptance criteria: Saving without a goal succeeds. A task appears on each selected goal's page and on at most one project. Deleting a milestone nulls the task's milestone and keeps the task.
- Tests: Integration tests for the unlinked save and the milestone delete.

### LT-031 — Copy series goals onto new occurrences

- Status: `done`
- Depends on: `LT-030`, `LT-019`
- Completed: 2 November 2026. New occurrences receive the repeating template's goals. Changing those goals from the task banner updates open attached occurrences from today forward. A detached occurrence keeps its previous goals.
- Description: When materializing, copy `series_goals` onto new tasks. Template goal changes update open attached future occurrences only.
- Expected changes: `materialize.ts`, series form if a series is edited from the task banner.
- Acceptance criteria: A new occurrence has the template's goals. A detached occurrence does not gain a goal added to the template later.
- Tests: Integration test with two occurrences, one detached.

## Phase 6 — Measurements

### LT-032 — Metric schema

- Status: `done`
- Depends on: `LT-027`
- Completed: 2 November 2026. Applied `life-tracker/migrations/0010_metrics.sql`. Two primary metrics for one goal are rejected by `metrics_one_primary_goal_uidx`. Two entries on the same date are rejected by `metric_entries_day_key`.
- Description: Add `metrics` and `metric_entries` with kinds, aggregations, the unique day, and the partial unique primary-metric index.
- Expected changes: schema and migration.
- Acceptance criteria: Two primary metrics for one goal cannot both be true. Two entries on the same date cannot both exist.
- Tests: Integration tests for both unique rules.

### LT-033 — Derived metric queries

- Status: `done`
- Depends on: `LT-032`, `LT-005`
- Completed: 2 November 2026. Current value, period sum, net worth, and area cash flow run in SQL and return decimal strings. A future entry is not current. Mixed `PKR` and `USD`, and a missing liability, do not produce a total. `0.10` is stored and read as `0.1000`. A goal percentage is omitted when the target or the current value is missing.
- Description: Implement current value, period sum, net worth, and area cash flow in SQL, with decimal values kept as strings in TypeScript. Implement the goal progress rule that suppresses a percentage when inputs are missing.
- Expected changes: `src/modules/measurements/derive.ts`, `src/lib/decimal.ts`, tests.
- Acceptance criteria: The net worth cases in the data model pass, including mixed `PKR` and `USD` and a missing liability side. A future-dated latest entry is not current. `0.10` survives as a decimal string.
- Tests: Integration tests run the SQL. Unit tests cover percentage suppression.

### LT-034 — Measurement screens

- Status: `done`
- Depends on: `LT-033`, `LT-010`
- Completed: 2 November 2026. `/measurements` groups metrics by kind and shows the net-worth block. Detail has a chart and a history table. Saving an existing date updates that one row. The empty page explains snapshots and offers wealth suggestions as buttons. Opening the page does not insert metrics. Phone and desktop widths were not clicked through in a browser. A signed-in request rendered the empty index, including the net-worth explanation.
- Description: Build the index, including the honest net-worth block, and the detail page with a history table, a simple chart, and an entry form that updates the same date after a warning.
- Expected changes: `src/app/(app)/measurements/page.tsx`, `src/app/(app)/measurements/[id]/page.tsx`.
- Acceptance criteria: The chart is not the only way to read history. Replacing a date changes one row. Empty copy does not create metrics.
- Tests: Integration test for replace. Manual check of the mixed-unit message.

### LT-035 — Primary metric on a goal

- Status: `done`
- Depends on: `LT-034`, `LT-028`
- Completed: 2 November 2026. Choosing a metric as a goal's main measurement clears the previous primary inside `set_primary_metric`. A goal with no metric, and a primary metric with no target, show "No measurement yet" and no percentage.
- Description: Allow choosing a metric as the goal's primary measurement. Show current, target, and a bar only when the progress rule allows it.
- Expected changes: goal detail and a mutation that clears the previous primary inside a transaction.
- Acceptance criteria: A goal with no metric shows "No measurement yet" and no zero percent. Setting a second primary moves the flag.
- Tests: Integration test for the flag move and a render-level or query-level assertion that percentage is absent without a target.

## Phase 7 — Dashboard and My Day polish

### LT-036 — Finish My Day task presentation

- Status: `done`
- Depends on: `LT-026`, `LT-016`
- Completed: 2 November 2026. My Day shows the civil date and timezone, the scheduled-group estimate sentence, and an inbox count that links to `/tasks?view=inbox`. Missing estimates stay out of the total, and a group with no estimates shows no sentence. Inbox titles stay out of the day groups.
- Description: Add the estimate sentence, the inbox count, and the date plus timezone line. Confirm scheduled and due groups stay disjoint.
- Expected changes: `src/app/(app)/today/page.tsx`.
- Acceptance criteria: The estimate sentence matches the UX document when some tasks lack estimates. Inbox items are counted and not listed.
- Tests: Integration test for the estimate totals and the inbox count.

### LT-037 — Dashboard

- Status: `done`
- Depends on: `LT-036`, `LT-035`
- Completed: 2 November 2026. `/` renders the five widgets. Upcoming uses today through today plus six days for open tasks and open milestones on active projects. A pin without a metric shows status and date and no percentage. One `dashboard load` log lists the query steps.
- Description: Replace the placeholder home with the widgets from the UX document. Upcoming lists tasks and milestones for seven days. Pinned goals use the progress rule. Log SQL once and remove per-row query loops if any appear.
- Expected changes: `src/app/(app)/page.tsx`, `src/modules/dashboard/queries.ts`.
- Acceptance criteria: Each widget links to the relevant working screen. No life score is rendered. A goal pin without a metric has no percentage.
- Tests: Integration test for the seven-day window and the pin query.

### LT-038 — Dashboard settings

- Status: `done`
- Depends on: `LT-037`, `LT-011`
- Completed: 2 November 2026. Settings can hide widgets and pin up to three of the user's goals. A fourth pin is rejected and left unwritten. Unknown widget ids are dropped. A non-object `dashboard_config` reads as the default and the page still renders.
- Description: Let Settings hide widgets and pin up to three goals. Persist `dashboard_config` in the documented shape. Ignore unknown widget ids.
- Expected changes: settings form and a parser for the JSON.
- Acceptance criteria: A hidden widget is absent after reload. A fourth pin is rejected. A corrupt JSON value falls back to defaults rather than crashing the page.
- Tests: Unit test the parser. Integration test saves and reads the config.

## Phase 8 — Life area pages

### LT-039 — Life area index

- Status: `done`
- Depends on: `LT-030`, `LT-024`
- Completed: 2 November 2026. `/areas` lists the six areas in catalog order with purpose and counts. Zeros stay visible. Archived goals and completed tasks are not counted.
- Description: Build `/areas` with six cards and counts of active goals, active projects, open tasks, and active habits.
- Expected changes: `src/app/(app)/areas/page.tsx`.
- Acceptance criteria: Counts are zero on an empty account. Archived goals are not counted. The page does not rank the areas.
- Tests: Integration test for the counts after one active and one archived goal.

### LT-040 — Life area detail and suggestions

- Status: `done`
- Depends on: `LT-039`, `LT-034`
- Completed: 2 November 2026. `/areas/[key]` lists up to five items per section and links to the filtered index. Suggestion buttons create one ordinary row. Deen and wealth use the fixed sentences. Two income metrics in an area leave the month line off. An unknown key says the area is not available. Add plan links to `/plans/new?area=` for the planning phase.
- Description: Build `/areas/[key]` sections and the suggestion buttons. Opening the page creates nothing. Accepting a suggestion creates one ordinary record in that area. Include the deen and wealth sentences from the UX document. Show month cash flow only when the single-income single-expense rule matches.
- Expected changes: `src/app/(app)/areas/[key]/page.tsx`, `src/modules/life-areas/suggestions.ts`.
- Acceptance criteria: An unknown key shows not available. A suggestion creates one row of the promised type. Two income metrics in an area suppress the profit line.
- Tests: Integration tests for suggestion creation and for the profit suppression.

## Phase 9 — Planning

### LT-041 — Planning schema

- Status: `done`
- Depends on: `LT-027`, `LT-012`
- Completed: 2 November 2026. Planning tables, the one-chosen-option index, and the action status check are in `0011_planning.sql`. A second chosen flag is rejected. An unknown action status is rejected.
- Description: Add the planning tables, checks, and partial unique chosen-option index from the data model.
- Expected changes: schema and migration.
- Acceptance criteria: Two chosen options in one plan cannot both be true. Action status rejects unknown values.
- Tests: Integration test for the chosen-option index.

### LT-042 — Plan notes, links, and questions

- Status: `done`
- Depends on: `LT-041`, `LT-040`
- Completed: 2 November 2026. `/plans` groups ideas by status. `/plans/new?area=` creates an idea linked to that area and no task. Notes render through Markdown with raw HTML left as text. Archive says linked tasks stay in the task list.
- Description: Build the plan index and detail sections for status, summary, Markdown, area and record links, questions, and reference links. Render Markdown with raw HTML disabled. Creating a plan from an area pre-links that area and leaves status `idea`.
- Expected changes: `src/app/(app)/plans/page.tsx`, `src/app/(app)/plans/[id]/page.tsx`, `src/modules/planning/mutations.ts`.
- Acceptance criteria: A new plan creates zero tasks. HTML in the body is shown as text. Archive confirmation states that tasks will remain.
- Tests: Integration test that plan insert does not insert a task. Unit or component test that a `<script>` in Markdown is not an element.

### LT-043 — Comparison grid

- Status: `done`
- Depends on: `LT-042`
- Completed: 2 November 2026. `/plans/[id]/compare` saves scores and one chosen option. Blank scores stay out of the mean. The mean does not set `is_chosen`. The caption says the average is a prompt, not a recommendation.
- Description: Build `/plans/[id]/compare` with options, criteria, scores, notes, mean, and an explicit chosen radio. Persist so a reload keeps scores. The mean never sets `is_chosen`.
- Expected changes: compare page and score helper.
- Acceptance criteria: Blank scores are excluded from the mean. The caption that the average is not a recommendation is visible. Choosing a second option clears the first.
- Tests: Unit tests for the mean. Integration test for the unique chosen option.

### LT-044 — Decisions

- Status: `done`
- Depends on: `LT-043`
- Completed: 2 November 2026. Recording a decision leaves status and tasks unchanged. Decisions list newest first. Deleting an option clears `chosen_option_id` and keeps the rationale.
- Description: Add the decision form and history on the plan page. Recording a decision does not change status unless the user also changes status. It does not create tasks.
- Expected changes: decision mutation and the plan page section.
- Acceptance criteria: Multiple decisions remain listed, newest first. A deleted option nulls `chosen_option_id` on old decisions rather than deleting the rationale.
- Tests: Integration test for two decisions and for option delete.

### LT-045 — Promote or dismiss an action

- Status: `done`
- Depends on: `LT-044`, `LT-013`
- Completed: 2 November 2026. Create task promotes one action in `promote_plan_action`. A second click returns the same task. Dismiss creates nothing. A forced error rolls the insert back. Archive leaves the task. The task gets a life area only when the plan has exactly one.
- Description: Add proposed actions, dismiss, and per-action "Create task". Promotion inserts the task and points the action at it in one transaction. A second click does not create another task. The task receives the plan's life area only when the plan has exactly one.
- Expected changes: `src/modules/planning/promote.ts`.
- Acceptance criteria: The product story for think-then-commit passes. Dismiss creates no task. Archive after promotion leaves the task.
- Tests: Integration tests for promote, double promote, dismiss, rollback on a forced throw, and archive.

## Phase 10 — Reviews

### LT-046 — Review schema and stats

- Status: `not_started`
- Depends on: `LT-013`, `LT-023`, `LT-033`, `LT-028`
- Description: Add `reviews` and implement stat generation into the version 1 JSON shape. Count completions from `task_activity`. Copy titles into the snapshot.
- Expected changes: schema, migration, `src/modules/reviews/stats.ts`.
- Acceptance criteria: A completion event in range is counted. A task whose `completed_at` was cleared by a reopen is still counted if the event remains. Metric rows store strings.
- Tests: Integration test builds stats from fixture rows.

### LT-047 — Review screens

- Status: `not_started`
- Depends on: `LT-046`, `LT-010`
- Description: Build the review index and detail. Start creates or reopens the draft. Refresh replaces stats only while draft. Complete freezes them. Reflection fields save without completing.
- Expected changes: `src/app/(app)/reviews/page.tsx`, `src/app/(app)/reviews/[id]/page.tsx`.
- Acceptance criteria: Completing a review and then deleting a listed task leaves the stored snapshot, including the copied title. The empty-period sentence is shown when stats are empty. The page does not label the week a success or a failure.
- Tests: Integration test for freeze versus refresh.

### LT-048 — Review period boundaries

- Status: `not_started`
- Depends on: `LT-047`, `LT-018`
- Description: Compute weekly bounds from `week_starts_on` and monthly bounds as calendar months, both in the user timezone.
- Expected changes: `src/modules/reviews/periods.ts` and its use when creating a review.
- Acceptance criteria: A Sunday week start and a Monday week start produce the ranges in the unit tests. A fixed instant near UTC midnight maps to the local month in `Pacific/Kiritimati` and `Pacific/Honolulu`.
- Tests: Unit tests with a fixed clock.

## Phase 11 — Export, PWA, backup, and hardening

### LT-049 — Export

- Status: `not_started`
- Depends on: `LT-045`, `LT-047`
- Description: Add authenticated JSON export of domain data and CSV downloads for tasks, habit logs, and metric entries. Exclude password hashes, sessions, and login attempts.
- Expected changes: `src/modules/export/build.ts`, download route handlers, settings buttons.
- Acceptance criteria: An anonymous request is rejected. The JSON contains a known task and omits secrets. CSV has a header row and the numeric values as plain text.
- Tests: Integration test against the route or the builder plus an auth check on the route.

### LT-050 — PWA shell and offline page

- Status: `not_started`
- Depends on: `LT-010`
- Description: Add a manifest, icons, and a service worker that caches static assets and `/offline` only. Add the offline page copy from the UX document. Do not cache document navigations or server-action responses.
- Expected changes: `public/manifest.webmanifest`, icons, service worker config, `src/app/offline/page.tsx`.
- Acceptance criteria: The precache list does not include `/today` or `/`. The offline page renders signed out and shows no personal fields. The app is installable from a desktop Chromium-based browser during the manual check.
- Tests: A test reads the generated precache list. Manual offline reload of `/today`.

### LT-051 — Production runtime

- Status: `not_started`
- Depends on: `LT-003`, `LT-007`
- Description: Add a Dockerfile for the Next.js process on Node 24, with no database service. The process migrates schema `public` using `DIRECT_URL`, then starts. Add `/health`. Document the private-network recommendation and the rule that a public URL requires TOTP before real sensitive data, without implementing TOTP. Document that the Supabase project should be on a paid plan if a week of inactivity must not pause it. Document that the phone install is Add to Home Screen, as described in the architecture document.
- Expected changes: `Dockerfile`, `src/app/health/route.ts`, a short comment in the root README pointing at operations.
- Acceptance criteria: Health returns success without personal data and without a session. The process applies migrations before it is marked healthy. The image does not contain a Postgres server, a database password, or a Supabase service-role key.
- Tests: Request `/health`. Review the Dockerfile for a database service or copied `.env`.

### LT-052 — Backup and restore

- Status: `not_started`
- Depends on: `LT-051`, `LT-049`
- Description: Write `docs/operations/backup-and-restore.md` covering Supabase's managed backups, `pg_dump` through `DIRECT_URL`, `age` encryption, and key storage outside the app host and outside Supabase. Add a scripted unencrypted drill that restores into schema `restore_drill` and then drops it. Perform one manual encrypted restore into that schema. Never replace schema `public` as part of the drill.
- Expected changes: the operations document and `scripts/restore-drill.ts` or a shell script.
- Acceptance criteria: The drill restores a known task into `restore_drill` and drops that schema afterward. Rows in `public` are unchanged. The manual encrypted path is noted with the date it was run. The document tells the owner not to keep the only key inside the Supabase account.
- Tests: The drill script. The manual note is the encrypted-path evidence.

### LT-053 — Browser smoke and authorization sweep

- Status: `not_started`
- Depends on: `LT-050`, `LT-049`, `LT-036`
- Description: Add the Playwright path from the testing document, including a 390px run. Add any missing user-B denial tests for habits, metrics, plans, and reviews.
- Expected changes: `tests/e2e/daily.spec.ts`, integration tests that are still absent.
- Acceptance criteria: The scripted path passes. User B cannot read user A's rows in each domain. Anonymous `/today` ends on login.
- Tests: Those files.

### LT-054 — Security pass before real data

- Status: `not_started`
- Depends on: `LT-053`, `LT-052`
- Description: Walk the security control table in the architecture document and tick each control that is actually present. Run `npm audit` and record unfixed advisories. Confirm production cookie flags, dynamic authenticated routes, and log redaction still hold. Stop. Do not start post-MVP work.
- Expected changes: a short `docs/operations/security-checklist.md` written from the real code, not copied as wishful ticks. Backlog statuses updated for completed tasks.
- Acceptance criteria: Every architecture control is marked present or given a dated exception. No `.env` or dump is in git. The owner can sign in, capture a task, log a habit, and export.
- Tests: Re-run `npm test` and the Playwright smoke. Manual phone and desktop pass on My Day, task create, and plan create.

## Status summary

| Status | Count |
| --- | --- |
| `not_started` | 11 |
| `done` | 43 |

Done as of 2 November 2026: `LT-002`, `LT-003`, and `LT-005` through `LT-045`. That covers the database connection, migrations, auth, settings, tasks, quick capture, recurrence, the calendar, habits through My Day, goals and projects, measurements, the dashboard, life area pages, and planning. `LT-001` and `LT-004` are still open. Next is `LT-046`.

Update this table when statuses change.
