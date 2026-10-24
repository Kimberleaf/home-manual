# Phase 1 verification

Date: 2026-09-19. Target: the 14 acceptance checks in `oawm-data-build-spec.md`.
Tested by driving the running app at `http://localhost:8347/` with real DOM events.

## Source fidelity

Every file was sliced out of the fenced blocks in the source documents
programmatically — not retyped — then compared back line by line with a
case-sensitive comparison.

| File | Lines | Result |
| --- | ---: | --- |
| `dist/index.html` | 74 | Identical |
| `dist/styles.css` | 239 | Identical |
| `dist/app.js` | 422 | Identical |
| `dist/data.js` | 2817 | Identical |
| `.openai/hosting.json` | 6 | Identical |
| `restore/house-manual-review-2026-09-19.json` | 2073 | Identical |

Catalog integrity: 26 sections, 295 tasks, `sourceTaskCount` 295, IDs unique and
sequential (`task-1`…`task-295`, `section-1`…`section-26`), every section's task
count matches the spec's inventory table, no task missing a required field.

## Acceptance checks

| # | Check | Result |
| ---: | --- | --- |
| 1 | Fresh browser: Home visible, "100-Acre Wood", review starts at section-1, fields default | Pass |
| 2 | 295 tasks / 26 sections match the appendix; room counts sum to 295 | Pass |
| 3 | Decisions are mutually exclusive; re-clicking clears; progress updates | Pass |
| 4 | Text survives reload; Home selected; review resets to first section | Pass |
| 5 | Assignable → amber outline + Open group; clearing restores owner resolution | Pass |
| 6 | Paid toggles blue tag, survives save/restore, alone does not mark reviewed | Pass |
| 7 | Remove excludes from dashboard/owners, retains in review and PDF | Pass |
| 8 | Shared tasks count in each owner group; percentages use total assignments | Pass |
| 9 | Owner groups expand; "Review task" returns to correct room, task, and focus | Pass |
| 10 | Backup exports all IDs/flags/text; restore replaces all state | Pass |
| 11 | Native Save dialog cancellation vs. fallback download | **Manual** — see below |
| 12 | PDF uses a separate print view, contains no backup JSON | Pass |
| 13 | Breakpoints at 720px and 980px behave as specified | Pass |
| 14 | Snapshot values match the companion backup file | Pass |

### Check 11 needs a human

Verifying it means cancelling a real OS save dialog, which can't be driven from
here. To check it yourself: click **Save file**, press Escape at the dialog, and
confirm nothing lands in your Downloads folder. In a browser without
`showSaveFilePicker` (Firefox), the same click should produce a normal download.

## Restore fidelity

Restoring `house-manual-review-2026-09-19.json` reproduces the documented snapshot
exactly. Each restored record was compared field-by-field against the source
envelope: **zero records differ**.

| Measure | Expected | Observed |
| --- | --- | --- |
| Task records | 295 | 295 |
| Non-default records | 22 | 22 |
| Reviewed (app rule) | 21 | 21 |
| Decisions keep / change / remove / blank | 16 / 1 / 0 / 278 | 16 / 1 / 0 / 278 |

That row records the snapshot as exported. The Change decision was removed
from the app later, and the one task carrying it (task-5) now reads Keep, so a
restore of the same file today gives 17 / - / 0 / 278 with the reviewed total
unchanged at 21. The file itself is untouched.
| Non-empty new owner | 1 | 1 |
| Non-empty notes | 7 | 7 |
| Assignable | task-18, task-22 | task-18, task-22 |
| Paid | task-19, task-22 | task-19, task-22 |
| Active section | section-2 (Kitchen) | Kitchen |
| Daily / Ongoing Routines | 11/11 | 11/11 |
| Kitchen | 10/32 | 10/32 |
| All other sections | 0 reviewed | 0 reviewed |

Whitespace is preserved: the trailing space at the end of task-2's note survives
the round trip.

## Documented quirks, confirmed reproduced in Phase 1

Each was confirmed present at the `phase-1-baseline` tag. Four were then fixed in
Phase 1b (marked below); the rest are preserved deliberately.

- Task controls render **2 columns** at every desktop width, because the early
  `!important` rule beats the later 4-column declaration. *(fixed in 1b)*
- Decisions are checkboxes with JS-enforced exclusivity, not radio inputs.
  *(fixed in 1b)*
- Storage writes have no quota or denial handling. *(fixed in 1b)*
- Restore has no confirmation and no undo. *(fixed in 1b)*
- Owner resolution ignores names that appear only inside parentheses — task-7
  resolves to Michael, Brighton, Kimberly and drops the parenthesised detail.
- "Each child" is never expanded into named children.
- Generic responsibility strings survive as their own owner groups: "Whoever
  notices / area owner", "Person using dryer", "Person responsible / person who
  discovers an urgent mess".
- `localStorage` holds only touched tasks, not all 295; the full set appears only
  in exported envelopes and after a restore.
- Paid badges, assignable badges, and `sourceNote` are absent from the PDF while
  remaining in JSON backups.

## Phase 1b re-verification

The full suite was re-run against the changed code. All 13 automatable
acceptance checks still pass, plus the behaviour of each fix.

| Area | Result |
| --- | --- |
| Checks 1, 2, 5, 6, 7, 8, 9 re-run | Pass |
| Check 10 restore, field-by-field vs. source | Pass — zero records differ |
| Check 12 print view (26 sections, 295 rows, no backup JSON) | Pass |
| Check 13 breakpoints | Pass — measured at 1500, 1282, 1280, 1000, 720, 375, 320px |
| Decision inputs are radios in a labelled radiogroup | Pass |
| Native exclusivity; per-task `name` scoping | Pass |
| Click the selected option to clear it | Pass — verified with hardware clicks |
| Arrow keys move through the group | Pass |
| Space on the selected option clears it | Pass |
| Storage failure: status, styling, toast, single warning, recovery | Pass |
| Restore prompts only when work exists; cancel aborts | Pass |
| No overflow on controls, card, or page at any width | Pass |

Two notes on how this was tested, because they bit during the work:

- The clear-on-reclick bug only reproduced under a **real** mouse click. A
  programmatic `.click()` fires no `pointerdown`, so it cannot exercise that path
  and reports a false pass. Test it with real input or by dispatching
  `pointerdown` before the click.
- The browser-automation harness sends `key: ""` for "space" and does not map
  `"Down"` to `ArrowDown`. Both looked like app failures and were not. A
  correctly formed `KeyboardEvent` with `key: ' '` confirms the real behaviour.

One thing deliberately **not** changed: `updateProgress()` re-renders the
dashboard on every keystroke even while the Home view is hidden. It measures at
0.47ms per keystroke over 40 keystrokes — wasted work, but imperceptible, so it
did not meet the bar for this pass.

## Dashboard sanity

Fresh state: 295 active tasks, 311 owner assignments, 11 owner groups — Kimberly
244 (78.5%), Michael 22 (7.1%), Ephraim 18 (5.8%), Open 10 (3.2%).

After restore: 295 active, 311 assignments, 12 groups — Kimberly 241 (77.5%),
Open 12 (3.9%). The shift reflects the two assignable tasks and the one new-owner
override in the snapshot.

# Assignments, soft skills, awards — verification

Date: 2026-10-03. Driven with real DOM events on a separate port, so the
browser storage behind the everyday port was never touched. The starting state was
the 2026-10-04 export loaded as version 1 browser data, the way an existing
browser meets this update.

| Check | Result |
| --- | --- |
| Loads with no console errors | Pass |
| One-time update fills New owner only where blank (task-5, 227, 230–240, 249, 264, 269, 271, 296); existing owners such as task-26 Michael untouched | Pass |
| Merged task-28 hands Paid to task-27; task-20 and task-28 hidden; 294 tasks shown | Pass |
| Starter soft skills (3) and award types (4, 5 points) seeded once | Pass |
| Parking lot holds assignable tasks with no owner (106) | Pass |
| Tap chore → tap name assigns it and opens the next parking-lot chore | Pass |
| Master bedroom / bathroom / office chores offer only Kim and Michael | Pass |
| Auto-assign empties the lot; every person lands at ≈ 18 h/mo; no MBR/MBA/MO chore with a kid | Pass |
| Move, share, back to parking lot | Pass |
| Undo auto-assign restores the lot and leaves hand-moved chores alone | Pass |
| Soft skills: add form, `#softskill` note, plain-words note, auto-fill | Pass |
| Awards: give, one-off, edit points (room-view badge follows), add type, remove history entry | Pass |
| + button only in room view; title and cadence required; kids disabled for master bath; checklist; owners; correct frequency group | Pass |
| Delete a task added in the app | Pass |
| Save file writes version 2 with extras and merged-task records (296) | Pass |
| Restore version 2 into empty storage; restore version 1 file re-applies owner updates and keeps extras | Pass |
| No horizontal scroll at 375px on any view (fixed an existing room-strip overflow) | Pass |

# Calendar — verification

Date: 2026-10-04. Same method: real DOM events (including drag events) on a
separate port, starting from the 2026-10-04 export as version 1 browser data.

| Check | Result |
| --- | --- |
| Week of Oct 4–10: seven day blocks, Sunday first, 13–16 scheduled chores a day for Everyone, 22 daily routines folded per day | Pass |
| Who filter (Oliver): only his chores, 7 daily routines | Pass |
| Month: October 2026 has 4 lead blanks (Oct 1 is a Thursday) and 31 day cells with counts; tapping the 20th opens Oct 18–24 | Pass |
| Quarter: Oct, Nov, Dec cards; tapping November opens November 2026 | Pass |
| Year: 12 cards; › goes to 2027; Back to today returns | Pass |
| Drag a weekly chore Mon → Wed, Just this time: moved this week only, back on Monday next week | Pass |
| Drag a chore Tue → Sat, Every time from now: on Saturday two weeks later too | Pass |
| Details shows "Every Saturday (day chosen by you)"; Back to automatic restores Tuesday | Pass |
| Details Move to a date, Just this time | Pass |
| Moves and chosen days saved to `extras.calendar` | Pass |
| A chore assigned on the Assignments board appears on that person's calendar | Pass |
| No horizontal scroll at 375px in week, month, quarter and year | Pass |
| No console errors | Pass |

## Assignments board counts catalog owners (2026-10-04)

| Check | Result |
| --- | --- |
| Board columns match Tasks by owner: Kim 110 + 4 "Everyone" = 114, Michael 38 + 4 = 42, Brighton 6 + 4 "Each child" + 4 = 14, Oliver 18 + 8 = 26, Ephraim 20 + 8 = 28; parking lot 106 = Open 106 | Pass |
| 159 catalog-owned cards marked *catalog owner* | Pass |
| Auto-assign counts Kim's real load: she gets none of the parking lot; kids level at ≈ 31 h/mo; Michael takes the master-suite and office chores | Pass |
| No master-suite or office chore with a kid after auto-assign | Pass |
| Moving a catalog-owned chore (Cook / provide dinner) to Michael sets its New owner | Pass |
| Calendar unchanged: Kim's week 6–8 chores a day plus 13 daily routines | Pass |

## One owner rule everywhere; lanes fit (2026-10-04)

| Check | Result |
| --- | --- |
| Home, Tasks by owner and Assignments agree: Kimberly 114, Michael 42, Oliver 26, Ephraim 28, Brighton 14, Open 106 ("Everyone" and "Each child" counted per person on every page) | Pass |
| No card extends past its lane (before: every card in Kim's lane was 267px in a 185px lane) | Pass |
| Unticking people hides their lanes; 5 lanes 185px, 2 lanes 482px, 1 lane 979px at 1440px | Pass |
| No one ticked: "Tick a name above" note, parking lot still shown | Pass |
| Phone width: one full-width lane per person, no horizontal scroll; Soft skills board likewise | Pass |
| Calendar unchanged (Kim 7,7,6,7,7,8,7 for Oct 4–10) | Pass |

## Calendar day view (2026-10-04)

| Check | Result |
| --- | --- |
| Time → Today shows Sunday, October 4, 2026 across the full width (1341px at 1440); No set date list hidden, back in week view | Pass |
| Everyone: grouped by person with counts and time (Kim 7 · ≈ 2.6 h, …, Unassigned 6); 22 daily routines folded | Pass |
| Cards 326px, four per row, none overflowing; room, title, cadence, time, standard shown | Pass |
| › / Back to today step one day; Oliver filter shows only his chores (7 daily) | Pass |
| Tapping a card opens details with Move to | Pass |
| Week view: tapping Wednesday's name opens Wednesday, October 7 | Pass |
| Phone width: one card per row, no horizontal scroll; no console errors | Pass |

## Marking done, trigger chores, Home analytics (2026-10-04)

| Check | Result |
| --- | --- |
| task-181 step 1 on Kim's calendar only (Sun Oct 4), tagged "Then Michael"; not on Michael's | Pass |
| Kim checks it: recorded by Kimberly; toast says Michael has it today; "Put away Kimberly + Michael laundry" appears on Michael's day, not Kim's | Pass |
| Michael checks his step: recorded by Michael | Pass |
| Home: 2 done (Kim 1 ≈ 15 min, Michael 1 ≈ 20 min), timed list, 7-day table | Pass |
| Shared chore in Everyone view opens Who did it?; picking Oliver records Oliver | Pass |
| Details panel shows "Done by Oliver …"; Mark not done undoes | Pass |
| Filtered to one person: credited to them with no picker | Pass |
| Month cell reports "16 chores, 2 done" | Pass |
| Step 1 done yesterday, step 2 not done: shows on Michael's today as "Waiting since Sat", not on Saturday | Pass |
| Save file carries completions (4); restore into empty storage brings all 4 back; Home ‹ shows Saturday's 1 | Pass |
| Phone width: no horizontal scroll on Home or Calendar (7-day table scrolls in its own box); check clear of card title; no console errors | Pass |

## Save file review, sign-in and roles (2026-10-04)

| Check | Result |
| --- | --- |
| **Save file round trip:** with a review note, an added task, a soft skill, an award, a chosen calendar day, a one-off move, chores done, an auto-assign setting, admin roles and sign-in times all present, Save → wipe storage → Restore leaves `house-manual-extras-v1` identical and all 297 review records identical | Pass |
| Restore always confirms, naming calendar changes, chores done and admin roles | Pass |
| Signed out: only the sign-in screen; wrong password and unknown user get the same error | Pass |
| Michael signs in with his default username (not case-sensitive): admin, all 8 tabs, Save/Restore/PDF, simulate list = Brighton, Oliver, Ephraim | Pass |
| Users tab: own row locked; making Brighton admin drops him from the simulate list; removing it restores him | Pass |
| Simulate Brighton: gold banner; Home, My chores, Calendar, Soft skills, Awards only; Home shows only his chores done; My chores = his 14; calendar fixed to him, no Who filter, nothing draggable, no move controls; his 2 soft skills; his points, no give buttons; Save/Restore/PDF hidden; admin pages blocked | Pass |
| Marking done while simulating is blocked with a message and saves nothing | Pass |
| Return to admin view restores all 8 tabs | Pass |
| Refresh keeps the sign-in and a simulation in progress; Log out returns to the sign-in screen | Pass |
| Brighton signs in for real: member tabs; checking a chore records Brighton; Home shows only his count | Pass |
| Kim signs in as the second admin | Pass |
| Phone width: sign-in screen, Users, admin Home, simulated Home and Calendar have no horizontal scroll; no console errors | Pass |

## Changing sign-ins, Actions menu, settings gear (2026-10-04)

| Check | Result |
| --- | --- |
| In-page SHA-256 matches Node's on 309 inputs (empty, "abc", multi-block, Unicode, padding boundaries 55/56/64/119 bytes, 300 random) | Pass |
| Data from the previous version (admins and sign-in times keyed by username, tab signed in with Michael's old username) loads, converts to ids and stays signed in | Pass |
| Save, Restore and Export PDF live in the Actions menu; Save from the menu works and closes it | Pass |
| Gear menu lists the non-admins with their usernames; opening one menu closes the other; click outside and Escape close them | Pass |
| Simulate from the gear: banner shown; Actions and gear hidden; Log out still shown | Pass |
| Change sign-in rejects a bad username, a username someone else has, a short password and mismatched passwords, each with its own message | Pass |
| Brighton → `brighton.s` with a new password: stored as salt + hash only, no readable password anywhere; old username and old password refused; new pair (username any case) signs in | Pass |
| Kim changes her own password: stays signed in; old password then refused, new one accepted | Pass |
| A Save file backup holds the accounts but neither password | Pass |
| Back to default sign-in (confirmed): Brighton signs in with the defaults again | Pass |
| Phone width: both menus fit on screen; Users becomes stacked cards, with or without the change form open; no console errors | Pass |

## Room-tag hints and paid chores (2026-10-04)

| Check | Result |
| --- | --- |
| Room tags carry the full room name on hover (DLY = Daily / Ongoing Routines, MBA = Master Bathroom) in the room view, Tasks by owner, Assignments, Calendar chips and details, and Home's done list (from the saved title) | Pass |
| Screen-reader labels stay plain text | Pass |
| Paid chores: blue edge + Paid label on Assignments cards, Calendar week chips and day cards | Pass |
| Parking lot tabs: Chores 41 / Paid 65; the Chores lot holds no paid jobs | Pass |
| Paid auto-assign hands out only the 65 paid jobs; every lane ends at ≈ 6.4–6.5 h/mo paid; the Chores lot stays at 41; Undo label says paid and restores all 65 | Pass |
| Chores auto-assign leaves the paid lot at 65 | Pass |
| Tap-assign in the paid lot moves on to the next paid job | Pass |
| A lane with no paid work reads 0 min/mo (was 1 min) | Pass |
| Phone width: both lots and the Calendar fit; no console errors | Pass |

## Subtasks (2026-10-04)

| Check | Result |
| --- | --- |
| Upstairs Bathroom room view: *Clean upstairs bathroom* + the removed *Replace toilet paper roll*; 15 subtasks with cadence and monthly time; Walls still marked Paid | Pass |
| Roll-up: ≈ 9.5 h/mo in all (570 min) = the subtasks' rows added up (580 min shown, the difference is display rounding); ≈ 2.2 h each weekly clean | Pass |
| No subtask appears as a chore of its own on Tasks by owner, Assignments (either lot) or the Calendar | Pass |
| Assignments: the main chore sits in Ephraim's lane as "Weekly · ≈ 9.5 h/mo · 15 subtasks"; opening it lists them | Pass |
| Calendar: one weekly *Clean upstairs bathroom* for Ephraim; details show the 15 subtasks already open | Pass |
| Add with +: picker starts on the chosen room; ticks survive a search; pulling 2 Guest Bathroom chores and adding *Restock guest towels* (no cadence → Weekly) makes one chore with 3 subtasks, and the 2 are gone from the room list | Pass |
| Pulling a Master Bathroom chore into a Laundry Room chore limits owners to Michael and Kim | Pass |
| Save file carries the pulled-in links and the created subtask | Pass |
| Deleting the main chore: confirms with the details; the 2 pulled chores return; the created subtask is deleted; nothing left in storage | Pass |
| Phone width: room view with subtasks open, the form with its picker and a new row, Assignments — no horizontal scroll; no console errors | Pass |

## Paid auto-assign: Oliver and Ephraim only (2026-10-08)

| Check | Result |
| --- | --- |
| Paid lot shows "Auto-assign splits paid jobs evenly between Oliver and Ephraim. Tap a job to give it to anyone." | Pass |
| Paid auto-assign of 64 jobs: Oliver and Ephraim each end at 36 paid jobs and 16 h/mo; Kim, Michael and Brighton's paid work unchanged | Pass |
| With Oliver unticked (hidden), paid auto-assign still splits 31 / 32 between Oliver and Ephraim and gives no one else any | Pass |
| Unpaid auto-assign still follows the ticks (unticked Oliver gets none) | Pass |
| A paid job can still be assigned by hand to any of the five (assigned one to Kim) | Pass |
| No console errors | Pass |

## Weekly room chores and the assignments rollback (2026-10-08)

| Check | Result |
| --- | --- |
| Weekly rule builds 8 weekly chores from the Oct 4 data: Kitchen 4 parts, Living Room 7, Laundry 2, Guest Bath 7, Upstairs Hall Closet 2, Upstairs Bath 7, Master Bedroom 10, Master Bath 8, each with its rolled-up time | Pass |
| Pantry (only one unpaid weekly chore) gets none; Kids' bedrooms and Whole-House get none; the laundry trigger chore stays on its own | Pass |
| Paid weekly chores stay individual (Kitchen's 4 paid weekly chores are cards of their own) | Pass |
| After auto-assigning (141 chores owned), restoring `house-manual-review-2026-10-04-assignments-only.json` through Actions → Restore returns to 43 owned; a chore marked done in between is kept; still signed in | Pass |
| All 8 weekly chores wait in the Chores parking lot; none in the Paid lot | Pass |
| Auto-assign gives each weekly chore to exactly one person; Master Bedroom and Master Bathroom go to Michael (adults only) | Pass |
| No part (e.g. MBA: Mirror, MBA: Tub/shower, GB: Mirror, UB: Toilet) appears as a chore on Tasks by owner, Assignments or the Calendar | Pass |
| Calendar: Master Bathroom (weekly) is one entry on one day; details list the 8 parts with 5 due this time, the every-2-weeks parts alternating week to week | Pass |
| Room view: subtasks folded until opened; marking Mirror Paid moves it out as its own chore (message), un-marking puts it back (message); Remove hides Tub/shower, Show removed (1) → Restore brings it back; adding "Wipe light switch" takes the weekly cadence; Delete removes it; the room's count stays at main chores (11/11) | Pass |
| Phone width: room view with the panel open, Calendar, Assignments — no horizontal scroll; no console errors | Pass |

## Standing Items (2026-10-11)

| Check | Result |
| --- | --- |
| The No set date side list is gone; Standing Items sits under the calendar | Pass |
| Everyone: Kim 22, Michael 7, Brighton 2, Oliver 3, Ephraim 1, Unassigned 3 — each person's group with their character (witch, skateboard, bluebird, Japanese flag, scorpion); Unassigned has none | Pass |
| The agreed starters are standing (Kids' laundry, Laundry-room basket laundry, Vacuum closet floor, Holiday planning, Assess/reorder laundry products, Kimberly + Michael laundry); Grocery list and the before-shopping fridge reset stay on the calendar | Pass |
| No standing item appears on any calendar day | Pass |
| The five characters drawn side by side read as one set; Oliver's redrawn so it stands tall holding the pole | Pass |
| The character stands beside its group heading and stays in view while a long group scrolls | Pass |
| Who = Kim: only Kim's group, with the witch | Pass |
| Checking off Kimberly + Michael laundry from Standing Items: recorded as `task-181|standing|2026-10-11` by Kim; card shows "Last done Sun, Oct 11, by Kim"; Michael's put-away step appears on his day; Home counts 1 | Pass |
| A standing item's details: "Standing item · …", "done when it needs doing", no move controls | Pass |
| Standing item switch: Kids' laundry off → back on the calendar (message); on → back to Standing Items (message) | Pass |
| Switch locked on for an as-needed chore and off for a room's weekly chore | Pass |
| Switching a Guest Bathroom weekly part to standing takes it out of Guest Bathroom (weekly); switching it back puts it in (messages) | Pass |
| Simulated Brighton sees only his 2 standing items, with the bluebird | Pass |
| Phone width: no horizontal scroll; the character sits above its group at 84px and doesn't stick; no console errors | Pass |

## Making a subtask a chore of its own (2026-10-11)

| Check | Result |
| --- | --- |
| Every subtask card in Master Bathroom (weekly) has **Make it a chore of its own** (8 of 8) | Pass |
| Splitting *Master-bath floor/robot vacuum* (no owner): own card in the room, highlighted, with **Move back into Master Bathroom (weekly)**; 7 parts left; panel stays open; in the Chores parking lot; message says so | Pass |
| Splitting *Mirror* (owner Michael): keeps Michael; message says so | Pass |
| Both saved in `extras.standalone`; **Move back** puts the first back in the weekly chore (message) | Pass |
| Splitting Kitchen (weekly) down to one part ends the weekly chore, and the message explains the last part is on its own too; moving them back restores it | Pass |
| A subtask added inside Guest Bathroom (weekly) can be split off: own card, its `parent` cleared, Delete still offered, parking lot | Pass |
| Subtask card controls wrap cleanly (notes, Paid, Standing / split, Remove) with no overflow at desktop and phone width; no console errors | Pass |

## Room view edits wait for Submit (2026-10-12)

| Check | Result |
| --- | --- |
| Remove, a Paid tick and a note on room-view cards are staged, not saved: storage unchanged, gold bar shows the count, cards marked *Unsaved* | Pass |
| Staged edits survive switching rooms and leaving the tab; the tab reads "Room-by-room review (N unsaved)" | Pass |
| Undoing an edit by hand drops it from the count; the bar hides at zero | Pass |
| **Submit changes** saves every staged edit, clears the bar and the marks, and says how many were saved and removed | Pass |
| Removing a subtask shows it struck through with Undo until Submit; Discard puts everything back | Pass |
| Ticking Standing on a weekly part regroups the room only after Submit | Pass |
| Signing out with unsaved changes asks first; cancelling keeps you signed in with the edits | Pass |
| Bar reads "Unsaved changes on 1 chore" (singular) and sticks under the header at 1280px | Pass |
| Fixed during testing: the tab-label update picked `<body data-view="review">` and blanked the page; it now targets `.feature-tabs` only | Pass |
| No console errors (the reload warning is blocked in automation, as expected) | Pass |

## Clear AI notes (2026-10-17)

| Check | Result |
| --- | --- |
| `restore/house-manual-review-2026-10-12-ai-notes-cleared.json` is the Oct 12 save with all 42 `AI:` notes emptied; every other line is unchanged | Pass |
| Each of those 42 instructions checked against the catalog first: titles, cadences and the task-28 merge are already applied | Pass |
| With the Oct 12 save loaded, an admin sees **Clear AI notes (42)** under the room title | Pass |
| Clicking it asks first, then stages every one: bar reads "Unsaved changes on 42 chores", no note on screen still holds `AI:`, storage unchanged | Pass |
| **Discard** puts them all back; **Submit changes** saves them; none left in storage; the button hides | Pass |
| A note "Kim prefers mornings." above an `AI:` line keeps that first line | Pass |
| task-28 (merged into Refrigerator dusting, so hidden) is cleared too | Pass |
| The three soft skills still show after clearing (they are saved skills, not read from the notes) | Pass |
| Simulating Oliver: the button and the room view are hidden; no console errors | Pass |

## Maturity Marks and the new chores (2026-10-17)

| Check | Result |
| --- | --- |
| New tab **Maturity Marks** after Awards; 8 cards from the document in two sections, with no `{}` directions in the text and the shower bullet left out | Pass |
| Kim (admin) starts on Everyone; User name lists Kim (0), Michael (1), Brighton (4), Oliver (4), Ephraim (6); picking Oliver shows his 4 cards and character; picking Kim says there are none yet | Pass |
| Michael (admin) starts on his own card; the sub-points under *Non-Negotiable Boundaries on Respect* show nested | Pass |
| Simulating Ephraim: the tab is there, the User name picker isn't, and only his 6 cards show | Pass |
| New chores: *Check Prisma email and messages* (Ephraim, daily), *Shower* (each child, every other day), *Weekly bedroom deep clean* (Oliver and Ephraim, weekly, with a dust / wipe / vacuum checklist); each card shows its chore under *On the chore list* | Pass |
| Ephraim's calendar week: Shower on Mon, Wed, Fri; deep clean on Sunday; the email check sits in Daily routines | Pass |
| **Clear AI notes** also catches notes written "AI -" (tasks 3, 13 and 20, all already applied); the cleaned save file has them cleared too | Pass |
| Phone width: cards fit at 339px, no horizontal scroll; no console errors | Pass |

## AI notes get their own field (2026-10-17)

| Check | Result |
| --- | --- |
| Loading the Oct 12 save: all 48 AI lines in regular notes ("AI:", "AI -", "AI,", "AI note:") move into the AI note field, marked done; no regular note still mentions AI; text above an AI line stays in the regular notes | Pass |
| The move runs once (marked in `extras.applied`); restoring an older backup moves its AI lines too | Pass |
| Every main card (full-width row) and subtask card (8 of 8 in Master Bathroom) has an AI note; done and empty ones are folded, an open one is unfolded and marked *to do* | Pass |
| Typing a new AI note is staged (bar shows 1 chore) and saved on Submit with `aiDone: false`; Done is disabled while the note is empty | Pass |
| **AI notes to do: 1 · Next ›** appears; from Kids' bedrooms it jumps to Daily routines and focuses that note | Pass |
| Ticking Done and submitting folds the note, shows *done*, and hides the Next button | Pass |
| The old **Clear AI notes** button is gone; no horizontal overflow at 1280px; no console errors | Pass |

## Earnings, overdue, one-offs and editable Maturity Marks (2026-10-17)

| Check | Result |
| --- | --- |
| Calendar week Oct 11–17 (Oct 12 save): **Paid chores earned** shows Brighton "No paid chores this week", Oliver $0.00 of $10 with 12 paid chores ($0.83 each), Ephraim 7 ($1.43 each); the same box shows on Home | Pass |
| Marking one of Oliver's paid chores done (calendar on Oliver) makes it $0.83, 1 of 12, and clears that chore's overdue colour | Pass |
| Narrowed to Michael, no earnings box; simulated Oliver sees only his own on Home and the Calendar; month view still shows this week's | Pass |
| 50 past, unmarked chores in the week are red and tagged *Overdue*; daily routines are not; the month view marks 16 days with overdue counts ("3 chores, 3 overdue") | Pass |
| **+** form, One-off ticked: cadence, flags, checklist and subtasks hide; Day(s) shows with today filled in; the hint and button change; no owner ticked → "Tick at least one owner" and the form stays open | Pass |
| One-off for Brighton on Oct 15, 17 and 19: saved in `extras.oneOffs`, not added to the room view, Assignments or Tasks by owner; on the Calendar Thu (Overdue + One-off), Sat, and next Mon; detail says "One-off: Thu, Oct 15, …", offers Mark done, Move, Delete this one-off | Pass |
| Moving it to Fri works in one step (no "every time" choice); deleting removes it and its moves | Pass |
| Maturity Marks seeded into `extras.maturity` (7 + 1 cards); Edit on Michael's card shows the text with sub-points indented; adding a line and linking *School review* saves and shows both | Pass |
| **+ Add a card** for Brighton in a new section "Driving & Car Care": new section appears, Core Need line highlighted, Brighton (5); deleting it removes the empty section | Pass |
| Simulated Brighton sees 5 cards and no Edit/Add buttons | Pass |
| Phone width: no overflow on the Calendar earnings rows, the one-off form or the card editor; no console errors | Pass |

## Sign-in details out of the code (2026-10-17)

| Check | Result |
| --- | --- |
| The family name and default-password pattern live only in `dist/local-config.js`, which `.gitignore` excludes; `dist/local-config.example.js` (committed) has empty placeholders | Pass |
| With the local config: default usernames and passwords sign in exactly as before | Pass |
| Without it: usernames fall back to first names, no default password works, the sign-in screen explains how to set it up, and a password an admin set still works | Pass |
| No tracked file contains the family name or the password pattern | Pass |

## Home server: one shared copy on the home network (2026-10-17)

Run against a throwaway data folder (`--data`) on test ports, never the real `data/`.

| Check | Result |
| --- | --- |
| `/api/status` reports the server; wrong password and no sign-in get 401; the default sign-ins from `dist/local-config.js` work | Pass |
| The page is sent `local-config.js` with the family name only, never the password pattern | Pass |
| A browser holding the old data: Kim signs in, is asked once, and its 313 records move into the shared copy (`initialized`) | Pass |
| A password hash in an imported file moves into `data/accounts.json`; devices only see `hasPassword`; `household.json` holds no hash | Pass |
| A member (Oliver) can only save chores marked done: his note edit is ignored, import and account changes get 403 | Pass |
| Oliver marks a paid chore done in one tab; Kim's tab shows it done (and $0.83 earned) within about 5 seconds, without a reload | Pass |
| Kim saves while Oliver's tab is a version behind: Oliver's next change is merged, and Kim's change and both of Oliver's survive | Pass |
| Two admins change the same note at once: the second keeps the first's text and is told "their version was kept" | Pass |
| A save that changes nothing keeps the version, so devices don't re-fetch | Pass |
| Users tab: setting Ephraim's password goes through the server, which hashes it; the new password signs in; Back to default works; passwords under 8 characters are refused | Pass |
| A reload keeps the tab signed in; Log out ends the session on the server and clears the household's data from the page | Pass |
| 5 wrong passwords from one device lock it out for a minute (429); `..` paths can't reach `data/` (404) | Pass |
| Served as plain files (`python -m http.server`), the app falls back to browser-only storage and signs in as before | Pass |
| Only console error: the expected 409 from the clash test | Pass |
| Fix: the offer to move old browser data comes at an admin's first sign-in in that browser even when another device already saved to the shared copy; declining leaves **Actions → Move this browser's old data in**, which replaces the shared copy with it | Pass |
| Fix: the server answers on IPv6 too (`[::1]`), so `localhost` works whichever the browser tries first | Pass |

## Start on a date (2026-10-18)

Run on the home server against a throwaway data folder loaded with the Oct 12 save.

| Check | Result |
| --- | --- |
| Room view: *Room reset/tidy* (each child) set to start Wed Oct 21: staged ("Unsaved changes on 1 chore"), saved as `startOn` on Submit, hint changes | Pass |
| Calendar for Oliver: nothing the week of Oct 11; Wed 21; Wed 28. Brighton's calendar shows Wed 21 too. Detail: "Every Wednesday (from its start date)" and "Starts Wednesday, October 21, 2026" | Pass |
| **+** form: Start on shows for a regular task and hides for a one-off; a weekly task for Ephraim starting Tue Oct 20 lands on Tue 20; the toast names the start day | Pass |
| A 2-3x a week task for Brighton starting Thu Oct 22: Thu 22, Sat 24; then Mon 26, Thu 29, Sat 31; nothing the week before | Pass |
| Clearing the date and submitting puts the chore back on its automatic days (in the week of Oct 11 again) | Pass |
| A standing item's Start on is switched off with "Standing items have no days on the calendar"; no console errors | Pass |

## Editable cadence; the page is now Gallery (2026-10-18)

Run on the home server against a throwaway data folder loaded with the Oct 12 save.

| Check | Result |
| --- | --- |
| The tab reads **Gallery** ("Gallery (1 unsaved)" with a pending edit); the eyebrow, Export PDF, the calendar and board "Open in Gallery" buttons and the PDF cover use the new name | Pass |
| *Room reset/tidy*: Cadence shows "Weekly / as needed", hint "Reads as: weekly"; typing "Monthly" updates the hint to "monthly · was …"; the change is staged, then on Submit saved as `cadence` and the card moves from Weekly to Monthly | Pass |
| Oliver's calendar over 8 weeks shows it twice (about monthly) | Pass |
| A part of Kitchen (weekly) set to Quarterly leaves the weekly chore (4 parts to 3) and becomes its own card under Quarterly; clearing the field restores the original wording and puts it back; the override is saved as blank | Pass |
| A room's weekly chore has no Cadence field of its own; no console errors | Pass |

## Fix: a shared chore's done check is per person (2026-10-18)

The bug: *Shower* (each child) checked off by Ephraim showed as done on Brighton's calendar too. Run on the home server against a throwaway copy of the Oct 12 save.

| Check | Result |
| --- | --- |
| Calendar on Ephraim: checking Shower on Sun 18 marks it done for him; on Brighton and Oliver it stays open; saved as `task-299|0|2026-10-18|Ephraim` | Pass |
| Everyone: the chip reads "1 of 3 done · Ephraim" and isn't marked done; later "2 of 3 done · Brighton, Ephraim" | Pass |
| Tapping it in Everyone asks only about the owner who hasn't (Oliver); then "Done · everyone" | Pass |
| A check saved the old way (plain key, by Ephraim) shows done for Ephraim only; undoing it from his calendar removes it | Pass |
| Day view for Everyone: checking the Shower in Ephraim's group marks only his; Brighton's and Oliver's stay open | Pass |
| No console errors | Pass |

## Owner boxes are the only word on ownership (2026-10-18)

| Check | Result |
| --- | --- |
| The Oct 12 save in the previous version (a0d2704) and this one give identical Home totals: Kim 91, Ephraim 63, Oliver 60, Michael 57, Brighton 19, Open 8, "Person responsible…" 1 | Pass |
| 268 chores with no owner boxes get them ticked from the catalog (`ownerSet`): e.g. *Basic personal hygiene* → everyone, *Room reset/tidy* and *Shower* → the three kids; parking-lot and removed chores are left alone | Pass |
| Gallery cards: *Active laundry moved forward* reads "Current owner: Kim, Brighton" with "Catalog: Kimberly for everyone's laundry…" underneath, and those boxes ticked; *Pinto basic care* → Kim, Michael, Brighton | Pass |
| Unticking *Check Prisma email* leaves "Current owner: Ephraim" until Submit; then "Open — needs an owner", with no fall back to the catalog, still so after a reload | Pass |
| No console errors (the 404s are the plain test server answering `/api/status`, which is how the app knows it is not on the home server) | Pass |

## Rename a chore in the Gallery (2026-10-18)

| Check | Result |
| --- | --- |
| **Rename** on *Check Prisma email and messages* opens a focused text box with the name; Enter stages "Check Prisma inbox and messages" (1 unsaved), shown with "was …" | Pass |
| Submit saves it as `title`; Tasks by owner, Assignments and the Calendar show the new name, and the old one is gone | Pass |
| A Kitchen (weekly) subtask renamed to "Fridge reset before shopping" stays in its open panel; Esc on a second rename leaves it unchanged; a blank name puts the original back and leaves nothing pending | Pass |
| A room's weekly chore has no Rename; no console errors (the 404s are the plain test server answering `/api/status`) | Pass |

## Paid balance and estimated time (2026-10-18)

Run on a throwaway copy of the live shared data (version 20) in browser-only mode; the scratch copy was deleted afterwards.

| Check | Result |
| --- | --- |
| Live data before: Oliver 35 paid jobs ≈ 15.6 h/mo, Ephraim 38 ≈ 18.1 h/mo (6 shared); the Paid tab reads "Oliver ≈ 14 h/mo · Ephraim ≈ 16 h/mo" (shared jobs half each) | Pass |
| **Balance Oliver & Ephraim** proposes 3 moves (Inside microwave and Cabinet exteriors to Oliver, Wipe/clean front door to Ephraim) for ≈ 15 h/mo each; after confirming it reads "(even)" and the button is off | Pass |
| **Undo** puts the three back; balancing again gives the same result | Pass |
| Gallery: *Shower* hint "Not set (the app guesses ≈ 15 min…)"; choosing 15 min is staged and saved as `effort` | Pass |
| Calendar week for Oliver: only the 4 Shower chips show a time (15 min), the other 62 none; details show "15 min each time" or "Not set yet. Admins can add it in the Gallery." | Pass |
| Day view: the Shower card reads "Every other day · 15 min"; others show no time; Oliver's header totals only set times ("4 chores · 15 min"); no console errors | Pass |

## Overdue on Home; cadence dropdown fix (2026-10-18)

Run on a throwaway copy of the live shared data in browser-only mode; the copy was deleted afterwards.

| Check | Result |
| --- | --- |
| Live data has one completion, today: Overdue reads "Nothing overdue", counted from Sun, Oct 18; the Calendar has no red chips (before this, 339 chores going back 4 weeks counted as overdue, from before anyone tracked them) | Pass |
| With tracking started Oct 12: 60 overdue (≈ 23 h): Kim 14, Michael 6, Brighton 7, Oliver 16, Ephraim 12; list oldest first ("Mon, Oct 12 · Brighton · Shower · 6 days late · ≈ 15 min"); 7-day table totals 12 11 16 7 9 5; the Calendar's red chips start Oct 12 | Pass |
| Simulated Oliver: "Your overdue chores", only his 16, one bar and one table row | Pass |
| Phone width: each overdue row puts the chore on its own line; no sideways scroll | Pass |
| Bug: the Gallery's cadence box only suggested wording matching what was already in it. Now a dropdown: the original ("Weekly / as needed (original)"), the usual cadences, and **Other…** which opens a box to type in | Pass |
| Picking Monthly stages it; picking the original again leaves nothing pending; Every 2 weeks submitted moves the chore to that group | Pass |
| "Every Saturday" reads as weekly and "Every other Saturday" as every 2 weeks; no console errors | Pass |
