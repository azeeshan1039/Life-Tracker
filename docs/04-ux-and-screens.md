# UX and screen specification

Status: planning decision, 27 October 2026. This describes structure, behavior, and responsive rules. It is not a visual design. Colors, type, and spacing are chosen during implementation from the accessible primitives in the architecture document, and they stay quiet enough that a faith note and a balance can share a screen without looking like a game.

Product rules live in [01-product-requirements.md](./01-product-requirements.md). If a screen and the requirements disagree, the requirements win.

## 1. Navigation

### 1.1 Desktop, 1024px and wider

A left sidebar, persistent:

- My Day
- Dashboard
- Tasks
- Calendar
- Life areas
- Goals
- Projects
- Habits
- Measurements
- Planning
- Reviews
- Settings, at the bottom
- Sign out, at the bottom

The current route is indicated by more than color: weight plus an aria-current marker.

Life areas in the sidebar expand to the six names. That is a filter menu, not six different applications.

### 1.2 Tablet, 768px to 1023px

The same destinations collapse to icons with accessible names. A control opens the full labels. Content uses the full remaining width. Tables that do not fit become stacked rows.

### 1.3 Phone, under 768px

A bottom bar with five items:

| Item | Destination |
| --- | --- |
| Today | My Day |
| Tasks | Task list |
| Plan | Planning index |
| Areas | Life area index |
| More | Habits, goals, projects, measurements, calendar, reviews, dashboard, settings, sign out |

Primary capture on My Day, Tasks, and Planning is a button fixed above the bottom bar so it stays reachable. Sidebar links are not duplicated as a second bottom row.

There is no hover-only action. Every row action is visible or inside a labeled menu.

### 1.4 Shared shell

- Skip link to main content.
- The page title is an `h1`.
- Destructive actions use a confirmation dialog that names the record.
- Dates display as `27 Oct 2026`. Times display in the user timezone with the zone abbreviation when a clock time is shown.
- A failed load shows the shell and a retry message in the content area. It does not bounce the user to login unless the session is actually missing.

## 2. How a day feels

Morning, phone: open the installed icon, land on My Day, log the habits that are due, complete or reschedule the scheduled tasks, glance at overdue. Capture anything new into the inbox. Leave.

During the day, desktop: open Tasks or a project, work from the same rows that appeared on the phone.

Evening or end of week: open Reviews if a draft is waiting. The Dashboard is the optional wide overview, not a required stop.

When something large is undecided: open Planning, create an idea, and stop. Do not visit Goals unless an outcome is actually chosen.

## 3. Screen specifications

### 3.1 Sign in

Route: `/login`.

Purpose: establish a session.

Contents: email, password, submit. No signup, no social login, no "forgot password" link. Forgotten passwords are reset with the operator seed command documented in the operations note during implementation. That is acceptable for one owner and avoids an email-reset system.

Empty state: not applicable.

Errors: one message, "Email or password is incorrect", including when the account is locked out by the failure counter. Fields stay filled except the password.

Success: go to My Day.

### 3.2 My Day

Route: `/today`. Default landing after login.

Purpose: do today's work.

Regions, top to bottom:

1. Date and timezone, so a wrong zone is obvious.
2. Habits due today. Each row matches its tracking type. Actions: log, skip, rest. Weekly-quota habits that are already satisfied this week are omitted, with a one-line "Weekly habits met" disclosure.
3. Scheduled for today. Checkbox completes. A reschedule control changes `scheduled_for`. Show priority and area name when present. Show the due date if it is not today.
4. Due today, excluding anything already listed as scheduled.
5. Overdue, with the due date.
6. Inbox count, linking to the inbox view. Not the inbox items themselves.
7. Quick capture field.

Estimated minutes for the scheduled group appear as a total when at least one estimate exists: "About 90 minutes estimated, 2 tasks have no estimate."

Empty state: "Nothing scheduled today" plus the capture field and any habits. An overdue group is hidden when empty. A brand-new account sees a short explanation of scheduled date versus due date and a link to create a task.

Errors: a failed completion returns the task to the list and shows "Could not update this task." A failed habit log keeps the typed number.

Responsive: regions stack. Completion controls are at least 44px.

### 3.3 Dashboard

Route: `/`.

Purpose: a configurable glance. Not the working list.

Widgets, each removable in Settings:

- Today: counts for scheduled, due, overdue, and habits still open, linking to My Day.
- Habits: the same due habits as My Day, so a desktop user does not have to change pages. Logging here writes the same log.
- Upcoming: dated tasks and milestones in the next seven days.
- Pinned goals: up to three. Title, status, target date, and primary metric current versus target when that metric exists.
- Inbox: count and capture field.

Empty pinned goals: "Pin a goal in Settings" once any goal exists, otherwise "Goals are optional. Tasks do not need one."

The dashboard does not show a composite score, a streak leaderboard, or every area's full detail.

### 3.4 Tasks

Route: `/tasks`.

Purpose: find and change work across life areas.

Header: views as a segmented control — Upcoming, Overdue, Inbox, Completed. Filters for area, project, goal, and priority. Text search matches title only, case-insensitive.

Upcoming means open tasks with `scheduled_for` or `due_on` on or after today, plus open tasks with neither date, in a final "Undated" group. Sort: priority descending, then nearest date, then title.

A row shows title, date labels, area, and project. Expanding a row or opening `/tasks/[id]` shows notes, subtasks, goals, estimates, and activity.

Create and edit use a dialog on desktop and a full page on mobile if the dialog cannot show every field comfortably. Required field: title. Everything else is optional. The form labels "Scheduled for" and "Due" as two fields, with one sentence: "Scheduled is when you will do it. Due is the deadline."

Subtasks render under the parent. Add subtask asks for a title. The parent completion dialog, when open children exist, says "This does not complete the subtasks" and offers confirm.

Completed view pages 50 rows and defaults to completions in the activity log in the last 30 days.

Empty states are written per view. Upcoming's empty state points at capture. Overdue's empty state is "No overdue tasks."

Errors: validation messages sit on the field. A lost session redirects to login only after the action returns unauthorized.

### 3.5 Task detail

Route: `/tasks/[id]`.

Purpose: edit one task and read its activity.

Shows every editable field, subtasks, linked goals, the series banner when `series_id` is set, and the activity list.

Series banner: "This occurrence is part of a repeating task." Actions: edit only this one, edit the repeating template, cancel this one, stop the series. Editing only this one is described as detaching it from future template updates.

Missing id or another user's id: "This task is not available." Same sentence either way.

### 3.6 Calendar

Route: `/calendar`.

Purpose: see dated work. Not a second editor with a different data model.

Week agenda is the default on phones. Month grid is the default on desktop, with the agenda beside it or below it.

Each cell lists, at most, the titles that fit, then "N more" opens the day. Items are tasks with `scheduled_start`, else tasks with `due_on` or `scheduled_for`, else milestones with `target_date`. Colors distinguish deadline, scheduled task, and milestone, and the text label does too.

Clicking an item opens the task or milestone. Adding from a day creates a task with `scheduled_for` set to that day.

Empty day: no marker. Empty month: the grid remains, with capture.

Drag and drop rescheduling is not in the MVP. Reschedule uses the task form. This avoids a class of touch bugs.

### 3.7 Life area overview

Route: `/areas`.

Purpose: enter one of the six domains.

Six cards. Each shows the area name, one-line purpose, and counts of active goals, active projects, open tasks, and active habits. Counts of zero are shown as zero, not hidden, so the user can see neglected areas without a score.

### 3.8 Life area detail

Route: `/areas/[key]`.

Purpose: the area's current picture and a place to add something already scoped to that area.

Sections: purpose, active goals, active projects, open tasks, active habits, active metrics. Each section lists up to five items and links to the full filtered list.

Primary actions: add task, add goal, add project, add habit, add metric. The created record is prefilled with this area. Add plan is present and links to a new plan pre-linked to this area, still in status `idea`.

Empty section text depends on the area only in its suggestions:

- Business suggestions are a project and a revenue metric, described as manual figures.
- Career suggestions are a learning project and a duration habit.
- Health suggestions are a walking habit and a measurement the user names.
- Deen suggestions are separate optional habits, with the sentence "These are private reminders. They are not a measure of faith."
- Wealth suggestions are savings, income, expenses, and liabilities as separate metrics, with the sentence "Nothing here is a forecast."
- Relationships suggestions are a recurring household task.

Suggestions are buttons that create ordinary records. They are not installed until pressed.

If the cash-flow rule in the data model is met, show one line for this month's income minus expense. Otherwise do not show a profit figure.

### 3.9 Goals

Routes: `/goals`, `/goals/[id]`.

Index: active by default, filters for paused, completed, archived, and area. A goal row shows title, area, target date, and metric summary or "No measurement".

Detail: description, status control, target date, primary metric selector, linked projects, open tasks that reference the goal, and recent metric entries when a primary metric exists.

The percentage bar appears only under the data-model rules. The empty measurement state links to "Add a measurement" without requiring it.

Archiving asks for confirmation and says projects and tasks will remain.

### 3.10 Projects

Routes: `/projects`, `/projects/[id]`.

Index similar to goals. Detail adds milestones in `sort_order`, with a control to mark a milestone done, and the project's tasks grouped by milestone then "No milestone".

Linking a goal is a multi-select of existing goals. Creating a goal from here is allowed and returns to the project.

Empty milestones: "Milestones are optional checkpoints."

### 3.11 Habits

Routes: `/habits`, `/habits/[id]`.

Index: active habits with today's class, if any, and a pause or archive action.

Create form:

- Title.
- Tracking: done / number / duration. Choosing number or duration reveals unit and target. Duration explains that the value is minutes.
- Schedule: specific days, or times per week. Specific days shows seven toggles. Times per week shows a number and the sentence that the count resets on Monday.
- Optional area and optional goal.

Detail: the form fields, a 12-week history, and the log for a selected date. History cells use text or an accessible label, not color alone: met, below target, missed, skipped, rest, unscheduled, due.

Logging from history uses the same unique day rule. Saving again updates the log.

Empty history: "No days logged yet."

Pause explains that missed days will stop accumulating while paused, because My Day will not ask and the classifier treats a paused habit as inactive for days after the pause. Implementation note: classification runs only for `active` habits. Days during pause are `unscheduled` even if the weekday matches. The history label for those days is "paused". This must match the habit module tests.

### 3.12 Measurements

Routes: `/measurements`, `/measurements/[id]`.

Index grouped by kind. Each row shows name, unit, current value or month sum, and the date of the latest relevant entry.

Create form: name, kind, unit (prefilled from the currency setting when kind is asset, liability, income, or expense), aggregation with a plain explanation of snapshot versus amount-in-period, direction, optional target, optional area, optional goal, and "use as this goal's main measurement".

Detail: current value, target, a history chart plus a table, and an entry form with date, value, and note. The date defaults to today. Submitting an existing date warns "This replaces the value for that date" and then updates.

Net worth block on the index, above the list, follows the data-model rule. When it cannot be computed, the block says which condition failed: missing assets, missing liabilities, or mixed units. It does not show a made-up total.

Empty index: explain snapshots in one paragraph and offer the wealth suggestions only as buttons, not as created rows.

### 3.13 Planning workspace

Routes: `/plans`, `/plans/[id]`.

Index grouped by status in this order: idea, exploring, decided, active, completed, archived. A plan card shows title, status, linked area names, and updated date. Filter by area and status.

Create asks for a title only and saves an idea.

Detail is one page with stacked sections, not a wizard:

1. Status control and summary.
2. Markdown body, with a preview. The editor is a textarea.
3. Linked life areas, goals, and projects. Linking never changes plan status.
4. Questions: add, mark answered, drop, reorder by sort number if drag is not implemented. Up and down buttons are enough.
5. Links: URL, title, note.
6. Options and a link to the comparison view.
7. Decision history and a form to record another decision.
8. Actions: proposed list, promote, dismiss. Promoted rows show the task title and status. The button label is "Create task". There is no button that creates tasks for all actions.

Empty body: "Write freely. Nothing on this page becomes a task unless you use Create task."

Archive confirmation: "Linked tasks stay in your task list."

### 3.14 Decision comparison

Route: `/plans/[id]/compare`.

Purpose: compare options without choosing for the user.

A grid: criteria as rows, options as columns, each cell a score from 1 to 5 or blank, plus an optional note. Add criterion and add option sit at the edges.

Under each option, show the mean of entered scores or "Unscored", and a radio "Chosen". The radio is the only way to set `is_chosen`. A caption reads "The average is a prompt, not a recommendation."

Save persists the grid in one action. Leaving with unsaved changes uses the browser's beforeunload prompt on desktop and an in-page confirmation if the user taps back on mobile when the form is dirty. If that mobile check is unreliable, the section saves each cell on change instead. Prefer save-on-change if the unsaved-guard gets fragile during implementation. The acceptance criterion is that a scored cell survives a reload.

Empty: "Add at least two options if you want a comparison. One option is enough if you are only taking notes."

### 3.15 Reviews

Routes: `/reviews`, `/reviews/[id]`.

Index: current week and current month at the top, then older reviews. A missing current review shows "Start this week's review", which creates the draft and generates stats.

Detail:

- Period label.
- Generated sections: completed tasks, still overdue, habit summary, metric changes, goals completed. Each can be empty with a plain sentence.
- Refresh stats, visible only on drafts.
- Six reflection fields from the data model.
- Save draft and Complete review.

Complete sets status and hides refresh. The snapshot caption includes the generation time.

Empty stats: "Nothing recorded in this period yet. You can still write the reflection."

The screen never tells the user the week was a success or a failure.

### 3.16 Settings

Route: `/settings`.

Sections:

- Profile name and email, read-only email in the MVP except through the seed command. Name is editable.
- Timezone search, week start, currency code.
- Dashboard hidden widgets and pinned goals.
- Password change: current password, new password, confirm.
- Sessions: this device and others, with revoke. If the session list is tight on time, ship revoke-all-others with password change first, and a full list in the same phase if the table is already being read.
- Export JSON, and separate CSV downloads for tasks, habit logs, and metric entries.
- A short backup reminder pointing at the operations document: the application does not store the off-site backup.

Danger zone is limited to sign out. There is no "delete my account" button.

### 3.17 Offline

Route: `/offline`.

Purpose: explain the lack of a network without showing private data.

Text: "Life Tracker needs a connection to show your records. Nothing from your account is stored on this device for offline use."

No retry that displays cached tasks. A retry link reloads `/today`.

### 3.18 Health

Route: `/health`.

Returns a small JSON status for the process and, if cheap, a database `select 1`. It does not require a session and does not return personal data. The app host can use it as a health check.

## 4. Interaction rules

### 4.1 Quick capture

Present on My Day, Dashboard, and Tasks. One text field and a submit control. Enter submits. The task is an inbox item. The field clears on success. On failure the text remains.

### 4.2 Dates

Date inputs are calendar dates. Time inputs appear only when the user opens "Add a time" on a task. Clearing the time clears `scheduled_start` and `scheduled_end`.

### 4.3 Priority

Displayed as None, Low, Medium, High. None is the default and is not a warning.

### 4.4 Status changes

Goal, project, habit, metric, and plan status changes save immediately from a select control, with an undo toast for archive if implementation can do it without a trash system. If undo is not solid, use a confirm dialog and skip the toast. Do not build a trash table to support the toast.

### 4.5 Empty, loading, and error patterns

| State | Behavior |
| --- | --- |
| Loading | The shell renders. The region shows a text status "Loading" that assistive tech can hear. Spinners are not the only indicator |
| Empty | Say what is missing and the single next action. Do not show sample personal data |
| Validation | Inline, tied to the field |
| Server failure | "Something went wrong saving this. Your text is still on the page." when that is true |
| Not found | "This record is not available." |
| Offline browser | The service worker serves `/offline` for navigations it cannot complete. It does not serve a cached dashboard |

## 5. Responsive behavior checklist

Every screen in section 3 is checked at about 390px and at about 1280px before the phase that introduced it is done.

- No horizontal scroll on the phone except the comparison grid, which may scroll sideways inside its frame. The rest of the plan page does not scroll sideways.
- Bottom bar does not cover the save button. Save sits above it.
- Dialogs on a phone become full-screen sheets.
- The month grid does not shrink day numbers below readability. On a phone the week agenda is the default.
- Charts have a data table equivalent on the same page.

## 6. Out of scope for the interface

- A theme designer, custom illustrations, and a marketing landing page.
- Drag-and-drop planning boards.
- Notification permission prompts.
- Onboarding tours longer than the empty-state sentences.
- Dark mode, unless the component primitives provide it for a trivial settings toggle. It is not a milestone.
