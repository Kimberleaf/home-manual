# House Manual / 100-Acre Wood

A local rebuild of the House Manual review app that was originally built with the
ChatGPT "sites" feature. Reconstructed from `oawm-data-build-spec.md` and restored
from `oawm-data-bkup.md`.

## Run it

Double-click **House Manual** on your desktop. That starts the server and opens
the app; closing the window it leaves behind stops the server. Double-clicking it
again while it is already running just reopens the browser rather than starting a
second server.

To recreate the shortcut if it ever goes missing, or to add one to the Start Menu:

```powershell
.\tools\install-shortcut.ps1
.\tools\install-shortcut.ps1 -StartMenu
.\tools\install-shortcut.ps1 -Remove
```

### From a terminal

```powershell
.\serve.ps1
```

That starts a dependency-free static server on <http://localhost:8347/> and opens
a browser. It is built on the .NET `HttpListener` that ships with Windows
PowerShell, so it runs with nothing installed.

Useful switches:

| Switch | Purpose |
| --- | --- |
| `-Port 8080` | Pick a port. If it's busy the script falls back to 8412, 8590, 9123. |
| `-Root .` | Serve the whole project rather than just `dist`. |
| `-NoBrowser` | Don't auto-open a browser. |

Node, Python and Git are installed now, so `npx serve dist` or
`python -m http.server` work too — `serve.ps1` just needs nothing at all.

**Serve it over HTTP — don't open `dist/index.html` directly.** `localStorage` is
scoped per origin, and `file://` origins handle it unreliably. Your saved review
would come and go.

## Load your saved data

The app starts empty. To load a snapshot, choose **Actions → Restore file** in the
header and pick a file from `restore\`.

`restore\house-manual-review-2026-10-04-assignments-only.json` holds only the
chore assignments from the Oct 4, 11:08 AM backup (before any auto-assign).
Restoring it puts every chore's owner back to that point and keeps everything
else (chores marked done, sign-ins, calendar moves, awards). The tracked baseline is
`house-manual-review-2026-09-19.json`; the later dated files are your own exports
(git ignores them).

Because `localStorage` is per-origin, you need to do this once per port you serve
from. Stick to the default port and it's a one-time step.

## What's here

| Path | What it is |
| --- | --- |
| `dist/` | The running app — `index.html`, `styles.css`, `app.js`, `data.js`. |
| `restore/` | Your data snapshot, extracted verbatim from the backup document. |
| `.openai/hosting.json` | Original hosting config, kept for provenance only. |
| `serve.ps1` | The local static server. |
| `start-house-manual.ps1` | What the desktop shortcut runs. |
| `start-house-manual.cmd` | Same thing, for double-clicking from Explorer. |
| `assets/house-manual.ico` | The shortcut's icon, matching the app's favicon. |
| `tools/` | One-off generators: the icon, and the shortcut installer. |
| `VERIFICATION.md` | Results of the spec's 14 acceptance checks. |
| `oawm-data-*.md` | The original source documents. Treat as read-only. |

The verbatim Phase 1 clone is the `phase-1-baseline` tag, so you can see exactly
what Phase 1b changed and revert any of it:

```bash
git diff phase-1-baseline..HEAD -- dist/
```

## Signing in

Everyone signs in. The default usernames (first initial + family name) and
default passwords (a pattern with each person's first name in it) come from
`dist/local-config.js`, which stays on this computer and is kept out of git. To
set it up on a new computer, copy `dist/local-config.example.js` to
`dist/local-config.js` and fill in `familyName` and `passwordPattern`. Without
it, default usernames are first names in lower case and there are no default
passwords, so only people whose password an admin has set can sign in (the
sign-in screen says so). Admins can change anyone's username and password (see
**Users** below). Signing in lasts for
the browser tab: a refresh keeps you signed in, closing the tab signs you out, and
**Log out** is in the header.

A password an admin sets is stored only as a salted SHA-256 hash, never as
readable text, in this browser and in **Save file** backups. Each person also has
a fixed id (their first name), so changing a username never loses their admin
status, sign-in history or anything else.

**This is a household lock, not security.** There is no server, so the check runs
in the page; anyone who opens the browser's developer tools can read the code or
the saved data. Real accounts arrive with the Phase 2 server build.

- **Admins** (to start: Michael and Kim) see every tab and everyone's data, plus
  the **Actions** menu in the header (**Save file**, **Restore file**, **Export
  PDF**) and the settings gear next to their name.
- **Everyone else** sees Home (their own chores done, no household totals),
  **My chores**, their own Calendar (they can mark chores done; only admins move
  chores), their own soft skills, and their own points and award history.
- **Users** (admin tab) lists everyone with their username, whether their
  password is the default or one an admin set, an Admin switch, and when they
  last signed in. You can't change your own access, and the last admin can't be
  removed. **Change sign-in** sets a new username (3–32 lowercase letters,
  numbers, dots, dashes or underscores; no two people the same) and/or a new
  password (at least 8 characters, typed twice); **Back to default sign-in**
  undoes both. Admins can change their own sign-in too. All of it is saved with
  everything else and travels with **Save file**.
- **Simulate user** (admin, under the settings gear next to your name) shows the
  app exactly as a non-admin sees it: their tabs, their chores, their calendar. A gold banner says whose
  view it is; **Return to admin view** ends it. Nothing done during a simulation
  is saved, so marking a chore done there is switched off.

## The app

Nine views, switched by the tabs under the header (admins see all of them). There is no routing — one URL,
toggled panels.

- **Home** — the "100-Acre Wood" dashboard with a single task-allocation pie and table.
- **Room-by-room review** — 26 sections, grouped by frequency (most frequent
  first). Per task you set a decision (Keep / Remove), new owners, notes, and the
  *assignable* and *paid* flags. The gold **+** button in the bottom right adds a
  task to any room; only the title and cadence are required.
  Edits here wait for you: Keep / Remove, new owners, notes, the *assignable*,
  *paid* and *standing* boxes, and removing or restoring a subtask are held as
  unsaved changes. A gold bar at the top says how many chores have them, each
  changed card is marked *Unsaved*, and the tab reads "Room-by-room review
  (N unsaved)". **Submit changes** saves them all at once and **Discard** throws
  them away. They survive switching rooms or tabs. Signing out or reloading
  asks first. Adding a subtask, splitting one off or moving it back, deleting a
  task, and the **+** form still act straight away.
  Every chore and subtask card also has an **AI note**, for admins only: an
  instruction for Claude to change the catalog, kept apart from the regular
  notes. It is folded away unless it holds a note that isn't done yet. Tick
  **Done** once Claude has carried it out and it folds up again; changing the
  text makes it a new instruction, so Done is cleared. While any are open, the
  room title shows **AI notes to do: N · Next ›**, which steps through them
  room by room. Like other edits, AI notes wait for **Submit changes**. In a
  save file they are `aiNote` and `aiDone` on each task. AI lines written into
  the regular notes before this field existed ("AI:", "AI -", "AI,", "AI
  note:") moved into it once, marked done.
  Ticking **One-off** in the **+** form makes an ephemeral task instead: pick
  one or more days and at least one owner, and it sits on just those days on
  those people's calendars. It has no cadence, never appears in the room view,
  on the Assignments board or in a parking lot, and is never reassigned. On
  the Calendar it carries a *One-off* tag; tap it to mark it done, move it to
  another day, or (admins) delete it. One-offs are saved in `extras.oneOffs`.
- **Tasks by owner** — the same tasks regrouped by resolved owner.
- **Assignments** — one column per person with their chores, and a **parking
  lot** of chores waiting for an owner. See below.
- **Calendar** — which chores fall on which day, for everyone or one person, by
  week, month, quarter or year. See below. A chore whose day has passed
  without being marked done turns red and is tagged *Overdue* (the daily
  routines are left out); the month view counts overdue chores per day.
  Above the calendar, **Paid chores earned** shows each kid's money for the
  week on screen (this week in the month, quarter and year views): every kid
  can earn $10 a week, split evenly across the paid chores on their calendar
  that week, so each is worth $10 ÷ that number and pays when they mark it
  done. A shared paid chore counts for each of its kids and pays whoever did
  it. The same box is on Home, for this week; a kid sees only their own.
- **Soft skills** — expectations that aren't to-dos ("tell Kim when something is
  low"), on the same kind of board with its own parking lot.
- **Awards** — one-off points for things nobody can be assigned.
- **Maturity Marks** — the expectations from the *Family & Home Needs*
  document, one card per heading. Everyone sees the cards meant for them, with
  their character; admins pick anyone (or Everyone) from **User name**, and
  start on their own cards when they have any. Each card lists who it is for,
  and the chores that carry part of it out (the daily Prisma email check, the
  weekly bedroom deep clean, the every-other-day shower). Admins add cards
  (**+ Add a card**, or **+ Add a card here** on a section) and **Edit** or
  delete any card: its title, section (or a new one), who it is for, its
  expectations, one per line as "Label: what it means" (indent a line or start
  it with "-" for a sub-point; a "Core Need" label is highlighted), and linked
  chores. `dist/maturity.js` is only the starting content: it is copied into
  the saved data (`extras.maturity`) once, and the app's copy is what shows.
- **Users** — admin only; who is an admin.

### Assignments

Every chore is on the board. It sits under its New owner, or under the catalog
owner when no New owner is set. Those catalog-owned cards say *catalog owner*.
"Each child" chores sit under all three kids and "Everyone" chores under all
five. That rule lives in one place, `ownersFor()` in `dist/app.js`, and Home,
Tasks by owner, the board and the Calendar all use it, so their per-person
totals always agree. A chore
waits in the **parking lot** when it is marked assignable with no New owner, or
when nobody owns it at all. Removed tasks and award-only tasks are left off.

- **Tap a chore, then tap a name.** Assigning from the parking lot opens the next
  chore straight away, so a run of them goes tap, tap, tap.
- **Tap an assigned chore** to *move* it to someone else, *share* it, or send it
  *back to the parking lot*. Doing that to a catalog-owned chore sets its New
  owner. Taking the last owner off marks it assignable, so it
  lands back in the lot rather than disappearing.
- **Paid chores** (those marked *Paid item*) have a blue edge and a *Paid* label,
  here and on the Calendar. The parking lot has two tabs, **Chores** and
  **Paid**, each with its count. Auto-assign hands out only the tab that is
  showing and balances it on its own: unpaid chores by each person's unpaid time,
  among the people ticked; paid jobs **only to Oliver and Ephraim**, split evenly
  by paid time (counting the paid jobs they already have), whoever is ticked.
  Anyone can still be given a paid job by hand. A paid job in the master suite or
  office stays in the lot for Michael or Kim, and the message says so. The two
  names are `paidAutoAssignees` in `dist/app.js`. Each lane shows its total chores and paid count, and the time for the tab
  that is showing.
- **Show and auto-assign to** picks whose lanes are shown. The lanes share the
  width evenly, so ticking fewer people gives each one a wider, easier-to-read
  lane. The same ticks decide who auto-assign shares the work among.
- **Auto-assign** hands out the whole parking lot so estimated time per month
  stays even across the people ticked. The most
  restricted chores go first, then the biggest, each to whoever has the least.
  Chores people already have count toward their total. **Undo auto-assign**
  puts back everything it placed that you haven't since moved by hand.

The time estimate is *times per month × minutes each*. Times per month is parsed
from the cadence wording; minutes each is a guess from how often the task happens,
nudged by its title ("deep", "wash", "windows" run longer; "wipe", "refill" run
shorter). A task added with **+** can state its own effort. The numbers are for
balancing, not timesheets.

**Hard rule:** master bedroom, master bathroom and Michael's office tasks only ever
go to Michael or Kim, so kids never get office tasks. This is enforced
everywhere an owner can be picked: the room-by-room checkboxes, the add-task form,
the board's buttons and auto-assign. It lives in `adultsOnlySections` in
`dist/app.js`.

### Calendar

Pick **Who** (Everyone or one person) and **Time** (today, this week, month,
quarter or year). The ‹ › arrows step to the previous or next period; **Back to
today** returns.

- **Day:** one day across the full width, with
  large cards showing the room, title, cadence, time estimate, what done looks
  like and any checklist. For Everyone, cards are grouped by person with each
  person's count and time; a shared chore appears under each owner, marked
  "with …". Tap a card for its details, including **Move to**.
- **Week:** seven day blocks, Sunday first, holding that day's chores. The daily
  routines fold into one *Daily routines (N)* line per day. Tap a chore for its
  details; drag it to another day; tap a day's name to open that day.
- **Month:** a calendar grid showing only how many chores fall on each day
  (shaded by how busy it is). Tap a day to open its week.
- **Quarter / Year:** a card per month with that month's total and, for
  Everyone, each person's count. Tap a month to open it, then a day to open
  its week.
- **Standing Items** (under the calendar): chores done when they need doing, not
  on a set day. See below.

The daily routines are on every day, so they're left out of the month, quarter
and year counts.

**Whose chores:** the New owner, else the catalog owner, the same rule as Tasks
by owner. "Each child" counts for Brighton, Oliver and Ephraim; "Everyone" counts
for all five. Assigning a chore on the Assignments board moves it on the calendar
straight away.

**Which day:** the catalog has cadences, not dates, so the calendar works out a
pattern for each chore. "Weekly" becomes every Tuesday, "Monthly" the 12th,
"Quarterly" the 5th of Jan/Apr/Jul/Oct, and seasonal wording ("Spring and fall")
lands in those months. Each person's chores are spread so their estimated
minutes are as even as possible across the days, and the same data always gives
the same calendar. Reassigning chores can re-spread the automatic ones for the
people involved; a chosen day never moves.

**Moving a chore:** drag it to another day in the week view, or use **Move to**
in its details, then choose:

- **Just this time:** only that occurrence moves (marked *Moved*); the rest stay.
- **Every time from now:** the chore repeats from the new date. Weekly chores
  keep the new weekday, monthly ones the new day of the month, and so on.

**Back to automatic** in the details undoes both. Chosen days and one-off moves
are saved in `extras.calendar` and travel with **Save file**.

### Marking chores done

Every chore in the Calendar's day and week views has a round check; the details
panel has **Mark done** too. Tap again to undo. Each completion records who did
it, when, and the day it was marked done. Credit goes to the person the calendar
is filtered to, or the chore's only owner; otherwise a **Who did it?** picker
asks. The month view shows a ✓ count on each day. Completions are saved in
`extras.completions` and travel with **Save file**.

**Home → Chores done** shows any day (‹ › to step, **Back to today**): the
total, a bar per person with their count and estimated time, a timed list of
what was done, and the last seven days per person. A completion counts on the
day it was marked done.

### Trigger chores

A trigger chore has two steps for two people. The first step is scheduled like
any chore but only shows on the first person's calendar. The day they mark it
done, the second step appears on the second person's list, and it stays on their
today list ("Waiting since …") until it is marked done. In the room view it is
marked *Trigger · Kim, then Michael*.

*Kimberly + Michael laundry* (`task-181`) is the first: Kim washes and dries,
then **Put away Kimberly + Michael laundry** goes to Michael that day. A trigger
is defined by a `trigger` block on the task in `dist/data.js` (`first`,
`firstStep`, `then`, `thenTitle`, `thenStandard`, `thenEffort`).

### Soft skills

The board works like Assignments, but soft skills have no cadence, so auto-assign
balances them by count, and a shared skill counts in full for each person.
Add one with the form at the top. A task also shows up here, marked *Soft
skill* in the room view, when its notes include `#softskill` (or `#soft-skill`) or
say in words that it should be a soft skill. The task itself stays a chore.

### Awards

Award types (name, points, description) are tapped onto a person to log points.
**Something else** gives a one-off award that isn't on the list. Totals show this
month and all time; **History** can remove an entry given by mistake. Edit or add
types under **Edit the award list**. A task linked to an award, like *Spills,
stains, and pet messes*, shows an award badge in the room view and stays off the
assignment board. Points are recognition only; nothing here moves money.

### Checklists

A task can carry a checklist of sub-items (e.g. *Basic personal hygiene*), shown
as an expandable list on the task card and in the PDF. Checklist steps have no
time of their own.

### Standing Items

Some chores are done when they need doing rather than on a set day: laundry
runs, restocking when something's low, the holidays. These **standing items** are
listed in **Standing Items** at the bottom of the Calendar instead of on its days,
and left out of its day, week, month, quarter and year counts.

- **One group per person**, each with their own cartoon character standing tall
  beside it (and staying in view while a long group scrolls): Kim a witch, Oliver
  the flag of Japan, Ephraim a scorpion, Brighton a bluebird, Michael a
  skateboard. Unassigned standing items have no character. The groups follow the
  **Who** filter; a member sees only theirs. The drawings are original SVGs in
  `dist/characters.js`.
- **Checking one off** records it for today, so it can be done again another day.
  Each card says **Last done Tue, Oct 6, by Kim** (or **Not done yet**), and the
  completion counts in Home's **Chores done**. The Kim → Michael laundry trigger
  works from here: checking it off puts Michael's put-away step on his calendar
  that day.
- **What's standing:** every chore with no regular cadence (as needed, trigger-
  based) is always standing. Others are standing by default when the catalog
  says `"standing": true`: Kids' laundry, Laundry-room basket laundry, Vacuum
  closet floor, Holiday planning, the seven *Assess/reorder … products* chores,
  and Kimberly + Michael laundry. Shopping-day chores (grocery list, the
  before-shopping fridge reset) stay on the calendar.
- **The Standing item switch** on every chore (room view, subtask cards, and the
  + form) moves a chore in or out; a change is saved in `extras.standing` and
  travels with **Save file**. It's locked on for chores with no cadence and off
  for a room's weekly chore. A standing item is never part of a room's weekly
  chore, so switching a weekly part to standing takes it out (and back in when
  switched off).
- Standing items stay on the Assignments board (marked *standing*) and still
  count in auto-assign's time balance.

### Subtasks

A chore can hold other chores as **subtasks**. A subtask is not a chore of its
own: it is left out of the room list, Tasks by owner, Assignments, the Calendar,
Home and the review count, and shown only inside its main chore, under
**Subtasks**, with its cadence and estimated monthly time. Click the main chore
(room view, Assignments card, Calendar details, My chores) to see them.

The main chore's time is all its subtasks' monthly time added up (plus its own,
if it states an effort), spread over its own cadence. A quarterly subtask adds
its share to every weekly clean instead of a spike once a quarter, so auto-assign
and the calendar see the true load. If any subtask is in a master-suite or office
room, the main chore is Michael-or-Kim only too. One level only: a main chore
can't itself be a subtask. **A paid chore is never a subtask**: it always stays a
chore of its own.

- **The weekly rule.** In each room, the unpaid chores that come round weekly or
  every 2–3 weeks are one weekly chore, *Room (weekly)*, so one person does them
  together on one day, whenever there are at least two of them. Parts that come
  every 2 or 3 weeks take turns on alternate weeks; the Calendar's details say
  which parts are due that week. The rule covers the physical rooms (Kitchen,
  Dining, Living, Entryway, Pantry, Laundry, the hallways and closets, all three
  bathrooms, Master Bedroom, Michael's Office, Garage) and leaves out Kids'
  bedrooms (each child does their own) and the sections that aren't rooms. Trigger
  and award chores stay on their own. Because **Paid** is set in the app, the
  groups are worked out afresh each time: mark a part Paid and it steps out as a
  chore of its own; un-mark a paid weekly chore and it joins its room's weekly
  chore. A room with fewer than two such chores has no weekly chore. New weekly
  chores start in the parking lot. The rule lives in `weeklyRoomSections` and
  `rebuildSections()` in `dist/app.js`; each weekly chore's id is
  `weekly-<section id>`, and its owner, notes and the rest are saved and backed
  up like any chore.
- **In the room view**, a main chore's **Subtasks** open into full cards: notes,
  **Paid item**, and **Remove** (for catalog chores; **Show removed** lists them
  with **Restore**) or **Delete** (for ones added in the app). A form at the
  bottom adds a new subtask (a blank cadence means the main chore's). Everywhere
  else the subtasks are a read-only list inside the main chore.
- **Make it a chore of its own** on a subtask card takes it out of its main
  chore as a separate chore card in its room. If it has no owner of its own it
  goes to the Assignments parking lot, ready to assign; otherwise it keeps its
  owner. It stays out even though it still fits the weekly rule (saved in
  `extras.standalone`), until **Move back into Room (weekly)** on its card puts
  it back. If that leaves a weekly chore with one part, the weekly chore goes
  away and that part becomes a chore of its own too (the message says so).
- **Adding a chore with +** has a **Subtasks** section: tick existing chores to
  pull in (filter by room, or search), and/or add new subtask rows (a blank
  cadence means "same as the chore"). Pulled-in links are saved in
  `extras.parents`; new subtasks are added tasks with a `parent`. Deleting a main
  chore added in the app deletes the subtasks created with it, and the pulled-in
  chores become chores of their own again.

### Decisions

**Keep** or **Remove**. There is no Change — it was dropped as redundant, and
anything that carried it is read as Keep.

That migration happens on load, in one place, so it applies wherever old data
comes from: browser state saved before the change, a backup file exported
earlier, or the agent tool. `restore/house-manual-review-2026-09-19.json` is
left exactly as exported, still holding its one `change`, because it is the
historical record — restoring it simply yields Keep. A task that was marked
Change stays reviewed; it is never dropped to blank.

### Room prefixes

Every task title is shown with a short room tag in front of it — `DR: Dust black
shelves`. It earns its keep in **Tasks by owner** and in the PDF, where tasks
from every room are mixed together under one person.

The prefix is added when a title is drawn, never stored, so your saved backups are
unaffected. Hovering a tag shows the room's full name, on every page. To change a tag, edit `sectionAbbr` in `dist/app.js`; the values have
to stay distinct.

| | | | | | |
| --- | --- | --- | --- | --- | --- |
| `DLY` Daily / Ongoing | `KIT` Kitchen | `DR` Dining Room | `LR` Living Room | `ENT` Entryway | `PAN` Pantry |
| `LDY` Laundry Room | `DH` Downstairs Hallway | `DHC` Downstairs Hall Closet | `GB` Guest Bathroom | `STR` Stairs | `UH` Upstairs Hallway |
| `UHC` Upstairs Hall Closet | `UB` Upstairs Bathroom | `MBR` Master Bedroom | `MBA` Master Bathroom | `MO` Michael's Office | `KID` Kids' bedrooms |
| `GAR` Garage | `WH` Whole-House | `ADM` Household Admin | `PET` Pets | `MNT` Home & Equipment | `VEH` Vehicle & Exterior |
| `OUT` Outdoor / Seasonal | `TRG` As Needed / Trigger | | | | |

The near-misses are the ones to watch if you edit them: Dining Room / Downstairs
Hallway / Downstairs Hall Closet / Daily, Living Room / Laundry Room, Master
Bedroom / Master Bathroom, and the three Upstairs entries.

### Choosing a new owner

**New owners** is a checkbox list of the household: Kim, Michael, Brighton,
Oliver, Ephraim. Any task can have several owners; a shared task counts once for
each owner on Home and appears under each one in Tasks by owner and on the
Assignments board. In master bedroom, master bathroom and office tasks the kids'
boxes are disabled (see the hard rule above). A box that is already ticked stays
clickable so it can be cleared.

The list stores **Kimberly** while displaying **Kim**. That is deliberate: the
task catalog's own owner text says "Kimberly", and most tasks resolve to her from
it. Storing "Kim" would split her work across two owner groups in the pie and in
Tasks by owner. So the controls read Kim, and every other view says Kimberly.

A value that is not on the list — from a restored backup, or set by the agent
tool — is kept and shown as an extra ticked box rather than silently dropped.

A task counts as **reviewed** if it has a decision, a new owner, notes, or the
assignable flag. **Paid alone does not count** — it's a future-payment eligibility
tag, and nothing in this app moves money or records a transaction.

### Storage and backups

Edits autosave to `localStorage` after a 180ms debounce, under two keys:

- `house-manual-review-v1` — the per-task review map, the same shape as always.
- `house-manual-extras-v1` — tasks added with **+**, soft skills and who has
  them, award types and history, auto-assign preferences, calendar days chosen
  and one-off moves, chores marked done, who is an admin and when each person
  last signed in, and which one-time updates have run.

Those two keys are the whole saved state, and **Save file** writes both in full.
Verified on 2026-10-04 by filling in every kind of data, saving, wiping the
browser's storage and restoring: both keys came back identical. Who is signed in,
and any simulation, live only in the tab (`sessionStorage`) and are deliberately
not saved.

**Save file** writes a portable JSON envelope, now `version: 2`: every task record
(including the two merged-away tasks), `format`, `exportedAt`, `activeSection`, and
`extras`. **Restore file** accepts version 2 and the older version 1 files. A
version 1 file replaces the review only and keeps everything else already in the
browser. Restore always asks first and names what it will replace. **Export
PDF** builds a separate print-only document of the room-by-room review (not the
newer pages) and hands off to the browser's print dialog.

## Catalog changes, October 2026

On 2026-10-03 the household reviewed the change requests written in their saved
notes. They agreed a list of interpretations, and those were applied. The notes
themselves are untouched; the app never acts on a note's text, except to pick up
`#softskill` as described above.

- **In `dist/data.js`:** renamed titles, new cadences (with the matching frequency
  group), rewritten or extended descriptions, the hygiene checklist, the award
  link on *Spills, stains, and pet messes*, and one new task
  (`task-296`, *Bring down dirty laundry and put away clean laundry*). Two tasks
  are merged into others and carry `retired` / `mergedInto`: *Vacuum under/sides
  of refrigerator* became part of *Refrigerator dusting*, and *Coffee pot* became
  part of *Deep-clean counters and coffee pot* (every 2 weeks). Merged tasks are
  hidden but their saved data is kept and still exported.
- **In `dist/app.js`, `reviewOwnerUpdates`:** owner changes, applied once to the
  saved review and only where New owner was still blank. The same pass runs when
  an older backup is restored. Merged tasks hand their Assignable and Paid flags
  to the task they were merged into.
- **Starter data:** three soft skills (from the grocery list, school review and
  inventory notes) and four award types at 5 points each. They are seeded once and
  are ordinary editable data after that.

`git diff phase-1-baseline..HEAD -- dist/data.js` shows every catalog change.

## Roadmap

- **Phase 1 — done.** Verbatim clone, documented quirks intact. Verified byte-for-byte
  against the spec and behaviourally against the 14 acceptance checks. Tag
  `phase-1-baseline`.
- **Phase 1b — done.** Four fixes, one commit each:
  - decisions are real radio inputs in a labelled radiogroup, so arrow keys work
    and assistive tech announces one choice of three rather than three checkboxes
  - `localStorage` write failures are reported instead of being announced as saves
  - restore confirms before replacing existing work
  - task controls get a real middle breakpoint instead of an `!important` override
- **Assignments, soft skills, awards — done (2026-10-03).** Assignment board with
  parking lot and auto-assign, soft skills board, one-off awards, add-task button,
  multiple owners on any task, checklists, and the October catalog changes.
- **Calendar — done (2026-10-04).** Week, month, quarter and year views,
  filtered by person, with automatic spreading, drag-and-drop and chosen days.
- **Sign-in and roles — done (2026-10-04).** Household sign-in, admin and member
  views, a Users tab, and Simulate user.
- **Phase 2 — next.** Next.js + Prisma (SQLite locally, Postgres in production)
  with Auth.js and per-person accounts with roles.

### Toolchain

Installed 2026-09-19 via winget: Git 2.55.0.3, Python 3.13.15, Node 24.19.0 LTS
(npm 11.17.0). Everything Phase 2 needs is in place.
