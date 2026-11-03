# Product requirements

Status: planning decision, 27 October 2026. Implementation has not started.

## 1. Product vision

Life Tracker is a private system for running one person's life as a connected whole. Long-term outcomes, active projects, daily tasks, repeated habits, numeric measurements, open-ended plans, and periodic reviews live in one database and one application.

It is a personal tool. It is not a public product, a team workspace, or a service sold to other people.

The product has two loops:

- An execution loop for today: capture work, do what is scheduled, log habits, and record measurements.
- A direction loop for later: explore options without committing, decide deliberately, turn only the chosen next steps into tasks, and review what actually happened.

A task list alone cannot do the second loop. A notes app alone cannot do the first. The product exists to keep both loops on the same records.

## 2. Target user

One software engineer, using a desktop browser and a phone browser against the same account.

The user already works in React, Next.js, Vue, Python, Node.js, Django, Flask, and FastAPI. Familiarity influenced maintainability, not the product shape. The product must stay understandable to that person six months later, including its backup and its failure modes.

There is no second user, administrator, or collaborator in the MVP.

## 3. Problems being solved

| Problem | What "solved" means in daily use |
| --- | --- |
| Work, health, faith, money, and home compete for the same days without a shared picture | Today's list can show items from any life area, and each item can still be opened in its area |
| Goals detach from the work that is supposed to achieve them | A goal can show its projects, tasks, and primary measurement, while ordinary tasks stay allowed to have no goal |
| Habits are forced into yes/no checkboxes | A habit declares whether it tracks completion, a number, or a duration, and stores a dated log |
| Thinking about a life change immediately creates commitments | A plan can remain an idea, with notes and compared options, and creates tasks only when the user promotes an action |
| Reviews rely on memory | A weekly or monthly review opens with counts and lists taken from stored records, then leaves room to write |
| Phone and desktop diverge | Both clients read and write the same server database |
| Sensitive records live in scattered consumer apps | Finances, faith, health, relationships, and plans stay in a system the user hosts and can export |

## 4. Language

These words are reserved. Later documents use them in this sense.

| Term | Meaning |
| --- | --- |
| Life area | One of six fixed domains of life. Planning is not a life area |
| Goal | A desired outcome. It may be qualitative, dated, or tied to one primary measurement |
| Project | An organized effort. It can support one or more goals and contains milestones |
| Milestone | A checkpoint inside a project |
| Task | A single piece of work with its own completion state |
| Subtask | A task whose parent is another task. Depth is one level |
| Series | The rule that generates dated task occurrences. Completing one occurrence does not complete the series |
| Habit | A repeated practice. The definition, the schedule, and the daily log are different things |
| Metric | A named numeric measurement, such as a balance, a weight, or monthly revenue |
| Entry | One dated value for a metric |
| Plan | A planning workspace item. It can be freeform, structured, or both. Status starts at idea |
| Action | A proposed next step inside a plan. It is not a task until the user promotes it |
| Review | A weekly or monthly reflection bound to a date range, with a stored snapshot of stats |
| My Day | The working list for today |
| Dashboard | A short overview. It is not a second place to edit every record |

## 5. The six life areas

Life areas are fixed reference data. The user cannot add a seventh area or delete these six. Items point at an area optionally. An uncategorized task is valid.

| Key | Name | MVP use | Kept out of this product |
| --- | --- | --- | --- |
| `business` | Business & Entrepreneurship | Goals, projects, tasks for delivery and follow-up, and manual metrics for revenue and expenses | CRM, proposals, invoicing, payroll, a client portal |
| `career` | Career & Market-Relevant Skills | Goals, learning projects, tasks, duration habits, and skill milestones recorded as metrics or project milestones | A course platform, interview scheduling with employers, a public portfolio site |
| `health` | Health & Fitness | Training and movement habits, duration or distance logs, and body or performance metrics the user chooses to enter | Medical records, symptoms, diagnoses, medications, advice |
| `deen` | Deen & Character | Optional habits for worship and character, private notes, and reflective review text | Scores of faith or character, prayer-time calculation, religious rulings |
| `wealth` | Wealth & Financial Independence | Manual balances and period amounts, a target goal dated by the user, net worth only when the records support it | Banking sync, brokerage sync, tax filing, return projections, permissibility rulings |
| `relationships` | Relationships, Family & Home | Tasks and recurring tasks for responsibilities, maintenance, and admin | A contact CRM, shared family accounts, a full home inventory |

Suggested starters may appear as buttons on an empty area. Nothing is tracked until the user accepts a suggestion. Accepting a suggestion creates an ordinary habit, metric, or task. The user can edit or delete it afterward.

Deen suggestions, if shown, are separate practices such as "Fajr on time" or "Quran reading". They are private reminders. The application never combines them into a piety score.

Wealth suggestions, if shown, are neutral names such as savings balance, monthly income, monthly expenses, investment value, and liabilities. The application does not recommend instruments and does not treat any return as expected.

The 2036 comfort goal is user content. The date 2036 is not hardcoded into product logic. The user creates a goal and, if they want a number, a metric with a target.

## 6. Planning workspace

Planning cuts across areas. A plan about moving abroad can link to career, wealth, relationships, health, and deen without becoming any of them.

A plan has one of these states:

`idea` → `exploring` → `decided` → `active` → `completed`, and `archived` from any state.

An idea holds notes and links. Exploring adds open questions and options. Decided records a rationale. Active holds an action list. Completed and archived stay readable.

Moving forward is a user action. Reaching `decided` or `active` does not create goals, projects, or tasks. The only bridge is an explicit action: promote this action to a task. The new task stores the link back to the action. Dismissing an action leaves no task behind.

Comparison is a thinking aid. Options receive a 1–5 score against criteria the user names. The total is the average of scored cells. The highest total is not selected for the user. The user marks a chosen option separately, or records a decision with no chosen option.

Freeform notes are Markdown text. They are not a block editor in the MVP.

## 7. Main workflows

### 7.1 Capture and do today's work

1. The user opens My Day.
2. Habits that are scheduled today appear with the right input: done, a number, or a duration. Unscheduled habits do not appear as failures.
3. Tasks scheduled for today appear above tasks that are only due today.
4. Overdue tasks appear in their own group.
5. Completing a task stamps the completion and removes it from the open list.
6. Rescheduling changes the scheduled day, the due day, or both, and keeps the same task.
7. Quick capture creates an inbox task with a title only. Inbox tasks do not fill My Day. My Day shows a count.

### 7.2 Maintain something that repeats

1. The user creates a series, for example "replace the air filter" every 90 days, or "send invoices" on the first weekday of a simpler monthly rule.
2. Opening My Day, Tasks, or Calendar materializes occurrences inside a rolling window.
3. Completing, skipping by cancellation, or editing one occurrence does not delete the series.
4. Running the same screen twice does not duplicate an occurrence.

### 7.3 Connect work to an outcome

1. The user creates a goal in an area, with or without a date.
2. The user creates a project and links it to that goal.
3. The user adds milestones and tasks. A task has at most one project and any number of goals, including zero.
4. The goal page lists linked projects and open tasks. It does not demand that every habit or task in the area join the goal.

### 7.4 Record a measurement

1. The user defines a metric: name, unit, kind, and whether values are snapshots or amounts added across a period.
2. The user enters a value for a calendar date. Entering the same date again updates that entry.
3. History remains after the metric is archived.
4. Net worth is shown only when the user has at least one asset metric and at least one liability metric, and every included metric shares one unit. Otherwise the screen lists the balances and explains why it is not combining them.

### 7.5 Explore without committing

1. The user creates a plan in `idea`.
2. They write notes, save links, and add questions.
3. They add options and score them.
4. They write a decision and move the plan to `decided`.
5. They promote individual actions if they want them on the task list.
6. They can archive the plan and leave the already promoted tasks in place.

### 7.6 Review the period

1. The user opens the current week or month.
2. The application fills a snapshot from tasks completed in the range, open overdue work, habit results, and metric movement.
3. The user writes what happened, what stalled, what they learned, and what the next period is for.
4. Completing the review freezes the snapshot. Later edits to tasks do not silently rewrite a completed review. A draft review can be refreshed.

## 8. Functional requirements

### 8.1 Dashboard

- Show today's scheduled tasks, tasks due today, overdue count, habits still due today, and upcoming dated items for seven days.
- Show progress for up to three goals the user pins. A goal with no primary metric shows its status and target date, not a fabricated percentage.
- Provide quick capture.
- Let the user hide a widget and change pinned goals from Settings.
- Stay readable at phone width. Summaries beat dense tables.

### 8.2 My Day

- Group habits due, scheduled tasks, due-today tasks that are not already in the scheduled group, and overdue tasks.
- Completing, logging, and rescheduling work from this screen.
- Show estimated minutes for the scheduled group when estimates exist. Missing estimates are blank, not zero.

### 8.3 Tasks

- Create, edit, complete, reopen, cancel, and reschedule.
- Fields: title, notes, status, priority, due date, scheduled date, optional start and end time, estimated minutes, life area, project, milestone, goals, parent task.
- Status values: `inbox`, `todo`, `in_progress`, `done`, `cancelled`.
- Priority values: none, low, medium, high.
- Subtasks are one level deep. A subtask cannot itself be a recurring occurrence. Completing a parent does not complete its children. The interface warns when a parent is completed with open children.
- Views: inbox, upcoming, overdue, completed, and a filter by area, project, goal, and status.
- Completed view defaults to the last 30 days and can show older history.
- One global task collection. Area screens filter it. They do not own a second copy.
- Each completion, reopen, cancel, and reschedule appends an activity row so a later reopen does not erase the fact of completion.

### 8.4 Recurrence

MVP rules are only:

- Daily, every N days, from a start date.
- Weekly, on chosen weekdays, every N weeks.
- Monthly, on a chosen day of the month, every N months. Day 31 in a shorter month lands on that month's last day.

Out of the MVP rule set: yearly rules, "last Friday" rules, exception calendars, and a time of day on the rule itself. An occurrence can still be given its own clock time after it exists.

Generation runs when the user loads My Day, Tasks, Dashboard, or Calendar. It inserts missing occurrences from seven days before today through 60 days after today, and never past the series end date. The unique pair of series and occurrence date makes a retry safe.

Editing the series updates open, not-yet-detached occurrences from today forward. Editing a single occurrence detaches it. Deactivating a series cancels future open occurrences that are still attached, and leaves completed history.

### 8.5 Habits

- A habit has a tracking type: boolean, numeric, or duration.
- Boolean habits store "logged" with no target number.
- Numeric and duration habits require a unit and a target greater than zero. Duration is stored in minutes. The interface may show hours and minutes.
- Schedule is either fixed weekdays (seven days means daily) or a weekly count, from one to seven, with no required weekdays.
- A log row is unique per habit and calendar date. Its state is logged, skipped, or rest.
- Skipped and rest are neutral. They are not success and they are not misses.
- A fixed day with no log is due while that day is still today, and missed after the day has ended.
- A day that is not on the schedule has no miss.
- A weekly quota shows progress such as "2 of 4" until the week ends. The week is judged only after it ends.
- Pausing hides a habit from My Day and keeps its logs. Archiving does the same and removes it from active lists.
- Changing a schedule does not rewrite log rows. It can change how old days are classified. Completed reviews keep the snapshot they stored. This limitation is accepted for the MVP.

### 8.6 Goals and projects

- Goal fields: title, description, area, status, optional target date. Status values: active, paused, completed, archived.
- A goal may name one primary metric. Progress uses that metric's current value, target, and direction. No primary metric means no percentage.
- Project fields: title, description, area, status, optional start and target dates, milestones, and links to goals.
- A project may support several goals. A goal may have several projects.
- Milestones are ordered, have an optional date, and are open or done.
- Paused items stay visible in a paused filter and drop out of default active lists.

### 8.7 Measurements

- Metric fields: name, description, area, optional goal, kind, unit, aggregation, direction, optional target.
- Kinds: general, asset, liability, income, expense.
- Aggregation `latest` means the current value is the newest entry on or before today. Use this for balances and body weight.
- Aggregation `period_sum` means a month or review range adds the entries whose dates fall inside it. Use this for income and expenses recorded as amounts.
- One entry per metric per date. A correction is an update, not a second row.
- History is a dated list and a simple chart.
- Current-month business or household cash flow is income minus expense only when that area has exactly one income metric and exactly one expense metric and both use the same unit. Otherwise the area lists the metrics.
- The application stores what the user typed. It does not forecast investment growth.

### 8.8 Reviews

- Weekly and monthly reviews share one flow.
- A week follows the user's week start. The default is Monday. A month is a calendar month in the user's timezone.
- One review per user, period type, and period start.
- Snapshot contents: tasks completed in the range, tasks that were overdue at generation time, habit days met, missed, skipped, and rest, metrics whose latest value changed, and goals completed or due inside the range.
- Reflection fields: went well, incomplete priorities, obstacles, lessons, priority changes, next period.
- The user can write next-period intentions as text. Those sentences do not become tasks unless the user creates tasks themselves.

### 8.9 Calendar and reminders

- Calendar is a view of tasks with a due date or a scheduled time, plus milestone dates. It is not a second store of events.
- Week agenda and month grid are enough.
- Creating a time-specific activity creates a task with a start time, and an end time when the user sets one.
- Reminders are the dates themselves, shown on My Day and the Dashboard.
- There is no "notify me 30 minutes before" engine in the MVP.
- There is no email, push, or SMS delivery in the MVP.

The reliable reminder is the list the user sees when they open the application. Web Push is uneven: Android browsers can subscribe, desktop browsers can subscribe, and iPhone delivers web push only to a home-screen PWA, with permission and delivery behavior that the application must not treat as guaranteed. Background sync is not available in a dependable way on either phone platform. Those channels are post-MVP, and even then they stay best-effort.

### 8.10 Data management

- Export a JSON document of the user's records from Settings, and CSV files for tasks, habit logs, and metric entries.
- Back up with Supabase's managed backups and with encrypted PostgreSQL dumps taken through the direct connection and stored outside Supabase. Restoration is a documented operator procedure, rehearsed in a scratch schema inside the same database before real data depends on it.
- Archive goals, projects, habits, metrics, and plans. Archive hides them from active screens and keeps history.
- Tasks are not archived. They are completed, cancelled, or deleted.
- Hard delete asks for confirmation and states what history will disappear.
- Calendar dates are civil dates in the user's timezone. Instants such as a scheduled time and a completion stamp include a timezone.
- Recurrence generation is idempotent.
- Offline editing and sync are not part of the MVP. The installed app can open an offline page that contains no private data.

### 8.11 Settings

- Timezone, stored as an IANA name.
- Week start.
- Currency code, used as the default unit offered when creating a money metric. Each metric still stores its own unit.
- Password change.
- Dashboard pins and hidden widgets.
- Export and sign out.

There is no public registration screen.

## 9. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Privacy | Financial, health, faith, relationship, and planning content is visible only to the signed-in owner. Pages are not cached in a shared cache or in a service worker |
| Security | Password authentication, revocable server sessions, authorization on every read and write, encrypted transport, secrets only in the environment |
| Integrity | Completion, habit logs, and balances are constrained in the database so a retry or a double click cannot duplicate them |
| Time | "Today" is computed in the user's timezone on the server. Date-only fields never shift because the server clock is UTC |
| Clients | One web application. Layouts work at 390px width and at a desktop width. No second native codebase |
| Availability | One process and one database. Short downtime during a deploy is acceptable |
| Recovery | A fresh database can be restored from a dump without application code that lives only in a vendor console |
| Maintainability | One repository, one deployable, forward-only SQL migrations, and domain rules that can be unit tested without the browser |
| Performance | Dashboard and My Day remain responsive with several years of personal rows. Completed lists are paged. This does not require a cache layer |
| Accessibility | Main flows are usable by keyboard, controls have names, and status is not conveyed by color alone. Touch targets on the primary actions are at least 44px |
| Language | English interface |
| Intelligence | No AI feature is required to capture, complete, log, plan, or review |

## 10. User stories and acceptance criteria

### Story 1 — Sign in on either device

The user can sign in with email and password on a phone and a desktop and see the same tasks.

- A wrong password shows a generic failure and does not reveal whether the email exists.
- Signing out on one browser removes that session.
- Unauthenticated visitors cannot load My Day, even by requesting a server action directly.

### Story 2 — Capture without organizing

The user can save "call the accountant" in under ten seconds.

- The task lands in the inbox, with no due date and no life area.
- My Day does not list it among today's work.
- The inbox count increases.

### Story 3 — Separate the day from the deadline

The user can schedule a task for Tuesday that is due Friday.

- Tuesday's My Day includes it as scheduled work.
- Friday's My Day includes it as due if it is still open and not scheduled for Friday.
- Saturday it appears as overdue if it is still open.

### Story 4 — Preserve completion history

The user completes a task and later reopens it.

- The completion remains in the activity history with its original time.
- A review generated after the completion and then marked complete still counts that completion.
- The open list shows the task again after reopen.

### Story 5 — Repeat without duplicates

The user sets a monthly task and opens Tasks twice.

- One occurrence exists for that month.
- Completing it leaves next month's occurrence open after the window reaches it.
- Cancelling one occurrence prevents that date from being recreated.

### Story 6 — Log different kinds of habits

The user logs a walked distance and marks a prayer habit.

- The distance habit asks for a number and a unit already defined on the habit.
- The prayer habit asks for done, skipped, or rest.
- A habit scheduled only on Monday does not show as missed on Tuesday.
- A 3-times-a-week habit shows the week's count before the week ends, and does not mark Monday missed merely because Monday has no log.

### Story 7 — Leave a task independent

The user creates a task with no goal and no project.

- Save succeeds.
- The task appears in the global list and My Day when scheduled.
- Goal pages do not list it.

### Story 8 — See a balance change

The user records a savings balance on two dates.

- The metric's current value is the later date if that date is today or earlier.
- Both dates remain in history.
- A second save on the same date replaces the value.
- Two balances in different units are not added together.

### Story 9 — Think, then commit

The user writes a relocation plan, scores two cities, records a decision, and promotes one action.

- Before promotion, the task list has no new task from that plan.
- After promotion, exactly one task exists and the action points at it.
- Archiving the plan does not delete that task.
- The score total does not change which option is marked chosen.

### Story 10 — Review from records

The user opens this week's review after completing two tasks and missing one scheduled habit.

- The draft lists those facts.
- The user can save reflection text without completing the review.
- Completing the review stores the stats.
- Deleting or editing a task afterward leaves the completed review's snapshot in place.
- Refresh remains available on a draft.

### Story 11 — Leave with the data

The user exports from Settings.

- The download includes tasks, habits, logs, metrics, entries, plans, and reviews.
- The download requires a signed-in session.
- The export contains no password hash and no session token.

## 11. Scope

### 11.1 MVP

The MVP is the smallest system that supports both loops for real daily use.

- Sign-in, sign-out, password change, timezone, week start, currency default.
- Six life areas as filters and overview pages.
- Dashboard and My Day.
- Tasks, subtasks, activity history, and the recurrence subset in section 8.4.
- Calendar as a view.
- Habits with both schedule kinds and all three tracking types.
- Goals, projects, milestones, and links.
- Manual metrics, history, cautious net worth, and cautious profit.
- Plans with Markdown, questions, links, comparison, decisions, and task promotion.
- Weekly and monthly reviews.
- JSON and CSV export.
- Installable PWA shell that does not cache private pages.
- Backup and restore procedure for the database.

A usable daily slice exists before plans and reviews ship. The roadmap says when. The MVP is not done until the whole list above is in place.

### 11.2 Post-MVP

Build these after the user has lived in the MVP and the gap is concrete.

- Web Push, still treated as best-effort, plus an optional email digest.
- Reminder lead times.
- Richer recurrence, including nth-weekday rules and skipped dates.
- A time of day on the series template.
- Schedule history for habits, so editing a schedule cannot reclassify old days.
- Weighted decision scores and explicit cost, benefit, and risk fields.
- Rich-text planning documents.
- Charts beyond a single series history: habit trends and a dedicated finance page.
- Asset records for a vehicle or appliance, attached to recurring maintenance tasks.
- Read-only offline cache of today, then a designed sync if the read-only cache proves insufficient.
- TOTP as a second factor if the application is exposed beyond a private network.
- Trash with restore.

### 11.3 Future possibilities

These stay out of the design of the core loop.

- AI-assisted review drafts, research summaries, or turning notes into proposed actions. Any of these must be optional and must fail closed when the provider is absent.
- Bank or calendar imports.
- A native wrapper, only if the PWA blocks a real need.
- A second user in the same household. The schema already isolates rows by user, which is not a promise to build sharing.

## 12. Explicitly excluded features

- Public signup, organizations, sharing, and comments.
- A life score, a faith score, a character score, or a health score.
- Medical or clinical workflows.
- Prayer-time engines, location tracking, and adhan notifications.
- Islamic-finance classification and investment-return calculators.
- Double-entry accounting, envelopes, invoices, taxes, and bank connections.
- Lead pipelines, proposal documents, and client logins.
- A generic custom-field or workflow engine.
- A separate event database beside tasks.
- Offline multi-device sync in the first release.
- Background job workers, queues, and microservice splits.
- AI features required for ordinary use.
- File and image attachments.
- Native iOS and Android codebases.

## 13. Assumptions

Confirmed by inspection on 27 October 2026:

- The workspace at `Life Tracker` contained no files and no git repository.
- The machine has Node v23.9.0, npm 10.9.2, Yarn, Python 3.12.3, Docker 28.3.3, and `psql`. Node 23 is past end of life. Yarn, Python, and Docker are unused by this plan. `psql` remains useful for dumps and inspection.
- `pnpm` was not on the path.

Owner decision recorded on 27 October 2026:

- PostgreSQL runs on one Supabase project. The Next.js app keeps its own sessions and queries. Supabase Auth and the browser Data API are not part of the product. Automated tests use a separate schema in that same database so they do not erase real records.
- The phone app is the same Next.js site, installed to the home screen. There is no second mobile codebase in the MVP.

Product assumptions, safe to reverse in Settings or in a later phase without a new architecture:

- The owner is a single user. Every domain row still carries `user_id` so a test can prove isolation and a later second account would not require a rewrite.
- The first-run timezone offered is `Asia/Karachi`, because this planning session is in UTC+5. The user confirms it before relying on My Day.
- The week starts on Monday until changed.
- The interface is English.
- The default currency code offered for new money metrics is USD until changed. Metrics may use another unit. Mixed units are not converted.
- Salah and character are tracked only if the user creates habits or writes notes. The MVP does not compute prayer times.
- The user will enter financial numbers manually.
- Desktop and phone browsers are current Chrome, Safari, or Firefox.
- Short maintenance downtime is acceptable.

## 14. Decisions that need the owner's approval

These do not block the plan. They change deployment risk or a personal workflow. The recommendations stand if the owner does not redirect them.

| Decision | Recommendation | What changes if rejected |
| --- | --- | --- |
| Where the app is reachable | A private network such as Tailscale, plus the password. The database is already Supabase | A public URL for the app needs TOTP before real financial or faith data is entered. The application shape stays the same |
| Supabase plan | A paid plan for the single project, so a quiet week does not pause My Day | A free project can pause after inactivity and stay down until it is restored in the dashboard |
| Worship tracking | Manual habits chosen by the user | Calculated prayer times need a location, a calculation method, and a notification story. That is a different feature, scheduled only after the MVP |
| Second person | Not in the MVP | Sharing would add authorization rules beyond "this row is mine" and is a product redesign of privacy |
