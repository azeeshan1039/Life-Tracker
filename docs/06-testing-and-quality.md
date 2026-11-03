# Testing and quality strategy

Status: planning decision, 27 October 2026. No tests have been run, because the application has not been created.

Tests are prioritized by what a failure would do to the owner. A duplicated recurring task, a vanished completion, a wrong balance, or another session reading a private note outrank a misaligned card.

## 1. Priority

| Priority | If it fails | Coverage |
| --- | --- | --- |
| P0 | Private data leaks, rows duplicate, money or dates lie, a completed review changes under the user | Authorization, recurrence, habit classification, numeric metrics, review snapshots, migration from empty |
| P1 | The daily loop or the planning boundary is wrong | Task activity, My Day grouping, plan promotion, export contents |
| P2 | The owner cannot recover or cannot complete the main path in a browser | Restore drill, Playwright smoke, phone and desktop pass on the screens a phase touches |
| P3 | The product is harder to use than it should be | Accessibility spot checks, a quick look at slow queries on My Day |

P0 and P1 are automated in Vitest. P2 restore is a script that writes a scratch schema in the one Supabase database. Playwright is one smoke file, not a replica of the unit tests. P3 is a checklist at the end of a phase, not a gate on every task.

## 2. Unit tests

Runner: Vitest. Location: beside the module, named `*.test.ts`. No database.

These functions stay pure so the tests stay pure:

| Module | Cases |
| --- | --- |
| `tasks/recurrence.ts` | Daily step, weekly ISO interval, weekdays, monthly clamp from 31 January across February in a leap year and a non-leap year, `until_on` inclusive, start date not before `starts_on` |
| `lib/dates.ts` | "Today" in `Asia/Karachi` and in `America/Los_Angeles` for an instant near UTC midnight. Date-only strings are not parsed with `new Date(dateOnly)` |
| `habits/classify.ts` | Every row of the classification tables in the data model, including pause, weekly quota mid-week and after the week, below-target, skip, and rest |
| `measurements/derive.ts` | Future entry does not become current. Period sum. Net worth refused for mixed units and for a missing side. Percent suppressed when the goal has no primary metric |
| `reviews/periods.ts` | Week start Sunday versus Monday. Month length. A zone where local midnight is the previous UTC date |
| `reviews/stats.ts` | Completion counted from activity. A later reopen does not add a second completion. It also does not remove the first one from a snapshot already built |
| `planning/score.ts` | Mean ignores blank cells. Empty scores return unscored. The function has no output that selects an option |
| `lib/decimal.ts` | String in, string out. A sum done with the helper matches a known `numeric` result, including fractional money |

Domain tests do not render React and do not mock PostgreSQL.

## 3. Integration tests

Runner: Vitest, against schema `app_test` in the single Supabase database from `DATABASE_URL`. They are skipped with a clear message if that variable is unset. The harness sets `search_path` to `app_test` and aborts before any truncate or delete when the current schema is `public`. CI, when it exists later, uses the same rule. A silent skip on a developer laptop is acceptable only when the message says the database was not configured. The pre-merge habit is to run them.

Harness:

- Apply all migrations to the empty test database at startup.
- Truncate domain and user rows between tests.
- Re-seed life areas if a truncate removed them, or leave them in place by truncating only user-owned tables.
- Create two users, A and B, in tests that touch ownership.

Each test uses the module functions, not the HTTP layer, except where a route handler is the product surface (export and health).

Required integration cases, owned by the backlog task that introduces the behavior:

- Login success, bad password, sixth failure inside the window, session revocation.
- User B cannot select, update, or delete user A's task, habit log, metric entry, plan, or review.
- Materialize twice, then assert one row. Concurrent materialize is simulated with two sequential calls and, if practical, two overlapping transactions. The unique index is the assertion that matters.
- Habit log upsert on the same date.
- Metric entry upsert on the same date.
- Review unique period.
- Promote action inserts one task inside the same transaction. A forced failure after the task insert rolls the action back. This can be tested by calling the transaction helper with a thrown error.
- Export omits `password_hash`, `sessions`, and `login_attempts`.

Database errors for unique violations are asserted as behavior, not only as exceptions the UI will hopefully catch.

## 4. End-to-end tests

Runner: Playwright. File: `tests/e2e/daily.spec.ts`. One browser is enough for automation. The phone layout is also checked manually in phase 11, because a single desktop Playwright run does not prove the bottom bar.

Scripted path:

1. Sign in as the seeded test user.
2. Capture "Pay the electricity bill".
3. Confirm it is in the inbox and not in today's scheduled group.
4. Set it scheduled for today and complete it.
5. Create a boolean habit and log it.
6. Create a plan titled "Test plan" and stop.
7. Assert the open task count did not gain a row from that plan.
8. Sign out and confirm `/today` redirects to `/login`.

A second test requests `/today` with no storage state and expects the login page.

E2E does not repeat recurrence mathematics. If the smoke path is flaky, fix the wait for the server render. Do not add sleeps as the steady state.

## 5. Migration tests

- One test or script migrates a fresh database and checks that all six life areas exist and the partial unique indexes exist.
- During later phases, a dump of the previous phase's schema is not required. Applying the whole chain to empty is the MVP bar.
- Generating a migration is a human or agent review of the SQL file. The test does not auto-approve destructive SQL. Dropping a column in the MVP migrations is a reason to stop and re-read the data model.

## 6. Authentication and authorization tests

P0. Specified in sections 3 and 4.

Additional assertions:

- A mutated server action with another user's task id returns not found and does not change the row.
- The session cookie is named `__Host-session` and is marked HttpOnly, Secure, SameSite=Lax, and Path `/`, with no Domain attribute. Secure stays on in local development. Browsers treat `localhost` as a secure context, so the cookie still works there. A non-local `http://` host will refuse the cookie, which is the intended result.
- Password hashes in the database do not equal the password. Argon2id parameters are the ones set in the auth module, not a fast test hash used in production code. Tests may use lower memory parameters through a test-only constructor if the suite would otherwise be too slow, and production code must not read that constructor.

## 7. Recurrence and timezone tests

P0. Listed under unit tests. Integration adds the unique index and the "cancel then materialize" path.

At least one case uses a user timezone of `Pacific/Kiritimati` (UTC+14) and one uses `Pacific/Honolulu` (UTC-10), with a fixed clock, to prove "today" does not follow the server's UTC date. `Asia/Karachi` is included because it is the default setting.

Habit dates and task due dates in those tests are sent as `YYYY-MM-DD` and read back unchanged.

## 8. Responsive UI testing

There is no automated screenshot suite in the MVP. Each phase that adds a screen records a manual check at about 390px and about 1280px:

- The primary action is visible without the bottom bar covering it.
- The new form can be submitted.
- The empty state is readable.
- A forced validation error is readable.

Phase 11 adds one Playwright viewport at 390px for the smoke path, in addition to the default viewport. That is the automated floor. It does not replace the manual look at calendar and comparison grid.

Browser tools, when available in the implementation environment, are the way to do this check. If they are not available, the implementer uses a local browser and says so in the task notes. This planning phase did not have an application to open.

## 9. Offline and synchronization tests

Synchronization tests are not applicable. There is no sync.

Required offline-related checks in phase 11:

- The service worker precache list contains static assets and `/offline` only. A test can read the generated worker manifest and fail if it contains `/today`, `/`, or a plan route.
- `/offline` renders its explanation without a session and without personal fields.
- Manual: in a browser, switch to offline, reload `/today`, and confirm the offline page appears rather than a stored copy of the day.

## 10. Backup and restoration tests

P2, blocking for the end of phase 11.

Scripted drill, inside the one database:

1. Insert one known task in schema `app_test`.
2. `pg_dump` that schema through `DIRECT_URL`.
3. Restore into schema `restore_drill`.
4. Assert the task title is present and the row count matches.
5. Drop `restore_drill`.

Do not replace schema `public`. Do not create a second Supabase project for the drill.

The operations document records the same steps with `age` encryption, including where the key lives. The key is stored outside the app host and outside the Supabase account. The automated drill may skip encryption if the encrypted path is run once manually and the result is noted in `LT-052`. At least one of the two, script or manual note, must cover decrypt-then-restore before real financial data is entered. The task acceptance requires the manual encrypted restore once, because that is the path the owner will actually need.

The application does not ship a "restore" button. Restoration is an operator procedure so a stolen session cannot overwrite the database.

## 11. Accessibility and performance checks

Accessibility, at phase end, on the screens that phase added:

- Every input has a visible label.
- The status control and habit result are understandable without color.
- Focus is visible on the capture field and the primary button.
- Icon-only sidebar controls have accessible names.
- Dialogs trap focus and return it on close. This is provided by the UI primitive; verify once when the primitive is added, then spot-check one dialog per later phase.

Performance:

- My Day and Dashboard use a bounded set of queries. During `LT-037`, enable query logging once and confirm the page is not querying per row.
- Completed task lists use a limit of 50.
- No performance budget tool is required. If a page is obviously slow with a year of generated occurrences, fix the query before adding a cache.

## 12. What is intentionally not tested in the MVP

- Visual regression images.
- Load tests. One user cannot produce the traffic those tests simulate.
- Native device farms.
- Prayer-time correctness. The feature does not exist.
- AI output. The feature does not exist.
- Offline merge conflicts. The feature does not exist.

## 13. Bug handling during implementation

A failing test is fixed before the task is marked done. A failing test that reveals a wrong product rule is a documentation change first: update document 01 or 03, then change the code. Do not "fix" the test to match an accidental behavior when the document is clear.

Security failures skip the phase order, as the roadmap says.
