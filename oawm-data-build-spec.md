# OAWM build specification — House Manual / 100-Acre Wood

## Purpose and fidelity contract

Reconstruct the current House Manual web app exactly as represented by the source snapshot in this document. This is an as-built specification, not a proposed redesign. The Home dashboard is labeled “100-Acre Wood”; the browser title and hosted project remain “House Manual Review,” and the header reads “House Manual.” OAWM is the requested document prefix, not an implemented product label.

Reference production URL: https://house-manual-review.kimberleaf.chatgpt.site/
Source revision: cba8281d61b4c63ddae0e3a1289bc6c8aeb30727.
Source inspection date: 2026-09-19.
The companion oawm-data-bkup.md contains user state from the supplied export, separate from this baseline implementation.

The exact source and complete 295-task catalog are embedded below. For pixel and behavioral fidelity, recreate these files verbatim. The prose explains the requirements and highlights current limitations; where prose is less specific, the embedded implementation is authoritative. No external source files, images, packages, fonts, or libraries need to be fetched.

## Architecture and reconstruction

A static, single-page application uses HTML, CSS, and vanilla JavaScript. There is no framework, package installation, compilation, application API, database, or payment service. Create a dist directory containing index.html, styles.css, data.js and app.js using the corresponding fenced blocks in the source appendix. Serve dist over HTTP for development and HTTPS in production. Load data.js before app.js; data.js sets window.HOUSE_MANUAL_DATA and app.js runs an immediately invoked function.

The app has one URL. Navigation buttons toggle hidden panels; there is no routing, URL hash state, browser-history navigation, or deep-link system. Initial view is Home. Initial review section is the first catalog section. Switching tabs retains in-memory edits and the selected review section.

The original hosting configuration serves dist and identifies the existing private Site. It is supplied for provenance, not as authorization to overwrite that Site from a new reconstruction. A new deployment needs its own hosting identity. The original site's owner-only access is enforced by hosting, not by a login component in these files.

## Screen structure and visual design

Persistent sticky header: HM square monogram; uppercase House Manual eyebrow; House Manual heading; autosave status; Save file and Restore file buttons; gold Export PDF button. White feature navigation below it contains Home, Room-by-room review, Tasks by owner, in that order. Active navigation uses dark teal and white type with aria-current="page".

Design tokens: ink #17292b; muted #637174; page #fbfaf7; white surfaces; line #d9dfdc; dark teal #173a3d; secondary teal #24575a; aqua #dcefeb; gold #e6bd67. Headings use Georgia/Times New Roman; body uses Inter if available, then system sans-serif. No bundled font. Rounded white cards, restrained shadows, gold keyboard focus outlines, teal navigation and gold accents. The favicon is the inline house SVG in the HTML.

Use the exact CSS appendix for dimensions, spacing, typography, hover states, breakpoints and printing. CSS source order matters: an early !important task-controls override means two equal columns on desktop, even though a later rule declares four columns. At 720px and below task controls become one column. At 980px and below room navigation becomes a horizontally scrollable row and the sidebar stops being sticky. Header actions wrap at 720px. Minimum body width is 320px. Hidden panels use display:none !important. Do not “clean up” CSS in ways that change its effective cascade.

## Home: 100-Acre Wood dashboard

Show Home dashboard eyebrow, 100-Acre Wood title, and one Task allocation widget. No additional dashboard widgets exist.

Widget includes active-task count, owner-assignment count and owner-group count; a circular pie rendered with CSS conic-gradient; and a three-column table labeled Owner, Tasks, Share. A matching colored swatch identifies each owner. Desktop chart width is at most 340px, with table beside it. On narrow screens chart and table stack.

Exclude tasks whose decision is remove. For each remaining task, use the exact owner-resolution algorithm below. Count one assignment per returned owner and combine owner groups case-insensitively. Sort by descending count, breaking ties with name.localeCompare. The denominator for percentages and slice angles is total owner assignments, not unique tasks. Display percentages to one decimal. Total assignments can exceed the number of active tasks. Pie slices proceed in sorted order, starting at the top. Colors cycle through #24575a, #c78322, #4879b5, #975e9b, #588544, #cb6556, #536480, #968230, #398e91, #a35370, #777777.

The explanatory note is: “Shared tasks count once for each assigned owner. Percentages show the share of owner assignments, not time or effort. Open tasks are included; removed tasks are excluded.”
For zero active assignments show a neutral circle and “No active tasks to allocate.” table message. Counts update whenever task progress updates, on restore, and when entering Home. There are no pie tooltips, click actions, filters, or payment calculations. An accessible image label summarizes totals and the table supplies exact values.

## Room-by-room review

A sidebar contains overall progress and all 26 sections in catalog order, each with reviewed/total counts. The workspace shows section title, task count, reviewed count, and task cards grouped by frequency. Preserve frequency groups in order of first encounter and task order within each group. Selecting a room updates the workspace and smoothly scrolls to the top.

Each task displays its title, optional cadence chip, standard, optional source note, and original current owner (fallback “No consistent owner”). Editable controls:
- Decision: Keep, Change, Remove. Implemented as checkboxes with mutually exclusive behavior. Clicking a selected decision clears it.
- New owner: free text, placeholder Optional.
- Notes: resizable textarea, placeholder Support, reminders, standards...
- Mark assignable: checkbox with “Open — needs an owner” helper.
- Paid item: independent checkbox.

Assignable produces an “Open · needs an owner” badge and amber card outline. Paid produces a blue Paid badge. Both can coexist with any decision and with nonempty newOwner. Neither clears other fields. Paid is a future-payment eligibility tag, not evidence of a completed payment. No transaction occurs.

Reviewed means a nonempty decision OR trimmed newOwner OR trimmed notes OR assignable=true. Paid alone does NOT mark a task reviewed. The denominator remains all 295 tasks, including tasks marked remove. A remove decision keeps the card visible in review and print, but excludes it from owner groups and dashboard. Change does not modify the baseline task wording.

Text updates occur on input and change; decision and flag updates occur on change. Flag changes rerender the review section and restore keyboard focus to the changed checkbox. All user-rendered text is HTML-escaped.

## Owner resolution: exact current rules

Assignable=true takes precedence over even a nonempty newOwner and returns only “Open — needs an owner”.

Otherwise trim newOwner. If nonempty, split on plus, comma, semicolon, word “and” (case-insensitive), or ampersand with surrounding whitespace; discard empty parts and deduplicate exact strings. Do not infer names or rewrite spelling.

Without newOwner, remove parenthesized substrings from original currentOwner. Split the remaining text on plus, semicolon, or word “or”. For each trimmed clause, recognize a leading case-sensitive name from Kimberly, Michael, Brighton, Oliver, Ephraim. A clause beginning Oliver/Ephraim adds Ephraim as well as Oliver. A clause beginning each child or each child's adds Each child. Return unique recognized groups if any. Otherwise blank or “no consistent” text produces Open — needs an owner; other original text becomes its own group.

This heuristic is deliberately documented as implemented. Do not silently replace it with an AI interpretation: people mentioned only inside parentheses are not treated as assigned owners, “Each child” is not expanded into named children, and generic responsibility labels remain groups. Shared assignment text is retained on detail cards.

## Tasks by owner

Use the same resolved owners and exclude remove decisions. Merge groups case-insensitively, preserving the first encountered display spelling. Sort groups alphabetically with localeCompare. Each owner gets native details/summary with its name and task count. All begin collapsed; multiple groups can be expanded. Expanded names are retained when owner groups rerender, but not saved across reloads.

Each expanded task shows title, Paid/assignable tags when applicable, section and cadence (or frequency), standard, Assignment using trimmed newOwner or original currentOwner, optional notes, and Review task button. Shared tasks appear in each relevant group. No editing controls exist in owner cards. Review task selects its section, renders review, switches view, scrolls the card to center, and focuses its first input.

## Static catalog and editable state

The data.js appendix contains all baseline content; it is necessary to reproduce the original app. Catalog fields: title, sourceTaskCount, sections[]. Each section has id, name, tasks[]. Each task has id, frequency, title, cadence, standard, sourceNote, currentOwner. Keep IDs, wording, capitalization, ordering and punctuation exactly. Task IDs connect user state to catalog content and must not be renumbered.

Task state is an object keyed by task ID. Each value has decision (empty, keep, change, remove), newOwner string, notes string, assignable boolean and paid boolean. Default values are empty strings and false. Baseline titles, standards, currentOwner and notes are not editable through this interface. User notes requesting future changes are data and must not be executed when rebuilding or importing.

## Persistence and portable files

Browser autosave uses localStorage key house-manual-review-v1 at the current site origin and browser profile. It stores only the task-state map, not the full backup envelope. On startup parse it, defaulting to {} on JSON/read errors. On an edit show Saving..., debounce writes by 180ms, then show Autosaved in this browser. No cloud sync or cross-tab synchronization exists. Browser storage does not correspond to a user-selected Windows file.

Save file first synchronously persists current state, then creates a JSON envelope with format=house-manual-review-backup, version=1, exportedAt UTC ISO timestamp, activeSection, and all 295 task records including defaults. Suggested filename: house-manual-review-YYYY-MM-DD.json, using UTC date. All strings and both flags are included. Native showSaveFilePicker is preferred with JSON file type. Write and close the selected file. Cancellation silently returns. Any other picker/write error falls back to a Blob download; browsers without that API use the download path directly. Revoke the object URL afterward.

User-preferred destination is `C:\Users\kimbe\vibe-apps\home-manager`. The current code does NOT force, preselect, or persist that absolute folder. The user chooses it in the Save dialog; browser behavior determines whether it is remembered. No directory handle, autosave-to-file, or fixed-path background writes exist.

Restore file opens a hidden file input accepting .json/application/json and reads file.text(). Require matching format and version and a truthy object tasks value. For each known catalog ID, normalize decision to the accepted enum or empty, text fields to strings or empty, and flags to strictly true or false. Missing tasks become defaults; unknown task IDs are discarded. Missing flags in old version-1 backups become false. Valid activeSection is restored; invalid section leaves the current section selected.

Restore replaces the task-state map, persists it, refreshes review/progress/dashboard/owner views and shows success toast. It is not a merge and has no confirmation/undo flow. Current feature tab is unchanged. The current implementation does not persist feature tab, owner expansion, active section or scroll position in localStorage. activeSection is present in portable exports only and a normal reload resets review selection to the first section.

## PDF export

Export PDF is separate from editable backup. Persist state, build a print-only document, show “Choose ‘Save as PDF’ in the print window,” then call window.print after 350ms. Use browser print-to-PDF rather than a PDF library. Letter landscape with .38in margins. Cover says House Manual / Room-by-Room Review, reviewed count and local date. Each section begins on a new page, grouped by frequency. Tables have Task / standard, Current owner, Decision, New owner, Notes columns with widths 31/18/10/16/25 percent. Table rows avoid splitting. Hide header, app shell, dashboard, feature tabs, owners view and toast in print.

As currently built, Paid and assignable badges/flags are NOT printed, nor is sourceNote. They remain fully included in JSON backups. PDF cannot be restored as editable state.

## Optional browser-agent tools

If document.modelContext.registerTool exists, register set_task_review and get_review_progress. Otherwise skip quietly. set_task_review accepts known taskId and optional decision/newOwner/notes (no paid/assignable schema fields), updates local state and relevant rendered review, and returns taskId, saved=true and reviewed. That saved response precedes the debounced storage write. get_review_progress returns reviewed, total, and per-section counts. Exact schemas and implementation are in app.js.

## Fidelity limitations and non-features

No task creation/deletion editor, catalog editing, subtask UI, completion tracking, due dates, users database, owner dropdown, filters/search, notifications, payment amounts, payout integration, authentication form or server state exists. Notes mentioning such ideas do not implement them. Paid alone is excluded from review progress. Original current owner remains visible even when newOwner overrides grouping. Pie colors depend on sorted rank, not stable owner identity.

Storage writes do not have quota/denial error handling. Restore validation is normalization, not a rigorous structural schema: malformed matching-envelope files may normalize fields to defaults. There is no restore confirmation or safety copy. Restoring can change in-memory state before a storage error is caught. Native save fallback can produce a download after a non-cancellation write failure. Preserve these observations in any exact reconstruction; improvements are a separate change request.

## Acceptance checks

1. Fresh browser: Home visible, title 100-Acre Wood, room review initially points to section-1, all task fields default.
2. All 295 tasks and 26 sections match appendix; room counts sum to 295.
3. Selecting/clearing decisions updates progress and preserves mutually exclusive checkbox behavior.
4. Enter text, reload: values remain; Home is selected and review resets to first section.
5. Assignable produces amber indication and moves task to Open group; clearing it restores normal owner resolution.
6. Paid toggles blue tag, survives autosave/export/import, and by itself does not increase reviewed count.
7. Remove excludes a task from dashboard/owners but retains it in review/PDF.
8. Shared tasks count in each owner group; dashboard percentages use total assignment count.
9. Owner details expand; Review task returns to the correct room and task.
10. Backup exports all IDs, flags and text; restoring a compatible file replaces all state; old missing flags default false.
11. Native Save dialog cancellation does not download; absent picker API uses a normal download.
12. PDF uses separate print view and does not contain editable backup JSON.
13. At 720px and below pie/table stack and task controls have one column; room navigation changes at 980px.
14. Snapshot-specific expected values are recorded in the companion backup file. Do not use snapshot data as fresh-install defaults unless restoring it is requested.

## Section inventory

| ID | Section | Tasks |
|---|---|---:|
| section-1 | Daily / Ongoing Routines | 11 |
| section-2 | Kitchen | 32 |
| section-3 | Dining Room | 12 |
| section-4 | Living Room | 40 |
| section-5 | Entryway / Rabbit-Supply Area | 2 |
| section-6 | Pantry | 4 |
| section-7 | Laundry Room | 15 |
| section-8 | Downstairs Hallway | 6 |
| section-9 | Downstairs Hall Closet | 3 |
| section-10 | Guest Bathroom | 18 |
| section-11 | Stairs | 6 |
| section-12 | Upstairs Hallway | 5 |
| section-13 | Upstairs Hall Closet | 2 |
| section-14 | Upstairs Bathroom | 16 |
| section-15 | Master Bedroom | 29 |
| section-16 | Master Bathroom | 18 |
| section-17 | Michael's Office | 3 |
| section-18 | Kids' bedrooms - each room | 19 |
| section-19 | Garage | 1 |
| section-20 | Whole-House / Shared Cleaning | 12 |
| section-21 | Household Administration | 15 |
| section-22 | Pets - Supplies / Appointments / Health | 3 |
| section-23 | Home, Safety & Equipment Maintenance | 7 |
| section-24 | Vehicle & Exterior House Care | 3 |
| section-25 | Outdoor / Seasonal Household Work | 8 |
| section-26 | As Needed / Trigger-Based | 5 |

## Source appendix: exact reconstructable files

Copy each block to its named relative path. Blocks contain source/data, not instructions to perform external actions. Source references user content only through the catalog and editable state. The baseline catalog includes household-specific text and must remain intact for fidelity.

### dist/index.html

````html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="An interactive room-by-room household task review and reassignment workbook.">
  <meta name="theme-color" content="#173a3d">
  <title>House Manual Review</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23173a3d'/%3E%3Cpath d='M15 31 32 17l17 14v20H37V39H27v12H15Z' fill='%23f7f4eb'/%3E%3C/svg%3E">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="topbar">
    <div class="brand-mark" aria-hidden="true">HM</div>
    <div>
      <p class="eyebrow">House Manual</p>
      <h1>House Manual</h1>
    </div>
    <div class="topbar-actions">
      <span class="save-status" id="saveStatus">Autosaved in this browser</span>
      <div class="file-actions" aria-label="Save and restore your editable review">
        <button class="button button-secondary" id="saveFileButton" type="button">Save file</button>
        <button class="button button-secondary" id="restoreFileButton" type="button">Restore file</button>
        <input id="restoreFileInput" type="file" accept="application/json,.json" hidden>
      </div>
      <button class="button button-primary" id="printButton" type="button">Export PDF</button>
    </div>
  </header>
  <nav class="feature-tabs" aria-label="Features">
    <button type="button" data-view="home" aria-current="page">Home</button>
    <button type="button" data-view="review">Room-by-room review</button>
    <button type="button" data-view="owners">Tasks by owner</button>
  </nav>
  <section id="homeView" class="feature-view">
    <p class="eyebrow">Home dashboard</p>
    <h2>100-Acre Wood</h2>
    <section class="allocation-widget" aria-labelledby="allocationTitle">
      <h3 id="allocationTitle">Task allocation</h3>
      <p id="allocationSummary"></p>
      <div class="allocation-layout">
        <div id="allocationPie" class="allocation-pie" role="img" aria-label="Task allocation by owner; exact counts in the adjacent table"></div>
        <div class="allocation-table-wrap"><table class="allocation-table"><thead><tr><th scope="col">Owner</th><th scope="col">Tasks</th><th scope="col">Share</th></tr></thead><tbody id="allocationLegend"></tbody></table></div>
      </div>
      <p class="allocation-note">Shared tasks count once for each assigned owner. Percentages show the share of owner assignments, not time or effort. Open tasks are included; removed tasks are excluded.</p>
    </section>
  </section>
  <section id="ownersView" class="feature-view" hidden>
    <h2>Tasks by owner</h2>
    <p>New owners override original assignments. Shared tasks appear under each owner; tasks marked assignable appear under Open — needs an owner. Removed tasks are excluded.</p>
    <div id="ownerGroups"></div>
  </section>
  <main class="app-shell" id="reviewView" hidden>
    <aside class="sidebar" aria-label="Rooms and areas">
      <div class="progress-card">
        <div class="progress-copy"><span>Review progress</span><strong id="progressText">0 of 295</strong></div>
        <div class="progress-track" aria-hidden="true"><span id="progressBar"></span></div>
      </div>
      <nav id="sectionNav"></nav>
    </aside>
    <section class="workspace" id="workspace">
      <div class="workspace-intro">
        <p class="eyebrow">Choose one decision per task</p>
        <h2 id="sectionTitle">Daily / ongoing routines</h2>
        <p id="sectionMeta">Loading tasks...</p>
      </div>
      <div id="taskGroups"></div>
    </section>
  </main>
  <section id="printRoot" aria-hidden="true"></section>
  <div id="toast" role="status" aria-live="polite"></div>
  <script src="data.js"></script>
  <script src="app.js"></script>
</body>
</html>
````

### dist/styles.css

````css
:root {
  --ink: #17292b;
  --muted: #637174;
  --paper: #fbfaf7;
  --surface: #ffffff;
  --line: #d9dfdc;
  --deep: #173a3d;
  --deep-2: #24575a;
  --aqua: #dcefeb;
  --gold: #e6bd67;
  --gold-soft: #fff4d9;
  --shadow: 0 14px 40px rgba(22, 45, 46, .09);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--ink);
  background: var(--paper);
}

* { box-sizing: border-box; }
.allocation-widget { padding: clamp(18px, 3vw, 32px); border: 1px solid var(--line); border-radius: 18px; background: white; box-shadow: var(--shadow); }
.allocation-widget h3 { margin: 0; font-size: 1.3rem; }
.allocation-layout { display: grid; grid-template-columns: minmax(200px, .8fr) minmax(0, 1.2fr); gap: 36px; align-items: center; margin: 28px 0; }
.allocation-pie { width: min(100%, 340px); aspect-ratio: 1; border-radius: 50%; justify-self: center; }
.allocation-table { width: 100%; border-collapse: collapse; font-size: .95rem; }
.allocation-table th, .allocation-table td { padding: 11px 8px; border-bottom: 1px solid var(--line); text-align: right; }
.allocation-table th:first-child { text-align: left; font-weight: 600; overflow-wrap: anywhere; }
.allocation-swatch { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 9px; }
.allocation-note { color: var(--muted); font-size: .875rem; line-height: 1.5; margin-bottom: 0; }
@media (max-width: 720px) { .allocation-layout { grid-template-columns: 1fr; gap: 22px; } .allocation-pie { width: min(75vw, 280px); } }
[hidden] { display: none !important; }
.feature-tabs { display: flex; flex-wrap: wrap; gap: 8px; padding: 14px clamp(18px, 3vw, 42px); border-bottom: 1px solid var(--line); background: white; }
.feature-tabs button { padding: 12px 18px; border: 1px solid var(--line); border-radius: 10px; background: white; cursor: pointer; font-weight: 700; }
.feature-tabs button[aria-current] { color: white; background: var(--deep); }
.feature-view { max-width: 1400px; margin: auto; padding: 32px clamp(18px, 3vw, 42px); }
.feature-view h2 { font-family: Georgia, serif; font-size: 2rem; color: var(--deep); }
.owner-group { border: 1px solid var(--line); border-radius: 14px; background: white; margin: 14px 0; overflow: hidden; }
.owner-group summary { padding: 20px; cursor: pointer; font-size: 1.1rem; font-weight: 700; }
.owner-group summary span { margin-left: 12px; font-size: .9rem; color: var(--muted); }
.owner-task-list { padding: 0 20px 20px; display: grid; gap: 12px; }
.owner-task { padding: 18px; border: 1px solid var(--line); border-radius: 10px; }
.owner-task h3 { margin: 0; }
.owner-task p { line-height: 1.5; }
.owner-task .button { background: var(--aqua); }
.paid-indicator { display: inline-block; padding: 4px 9px; margin: 0 5px 9px 0; border-radius: 7px; color: #184b79; background: #e1efff; font-size: .875rem; font-weight: 800; }
.paid-option { display: flex; align-items: center; gap: 8px; min-height: 44px; font-size: .875rem; font-weight: 700; }
.paid-option input { width: 18px; height: 18px; accent-color: var(--deep); }
.task-controls { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
@media (max-width: 720px) { .task-controls { grid-template-columns: 1fr !important; } }
@media print { .feature-tabs, .feature-view { display: none !important; } }
html { scroll-behavior: smooth; }
body { margin: 0; min-width: 320px; background: var(--paper); }
button, input, textarea { font: inherit; }
button { color: inherit; }

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  min-height: 82px;
  padding: 14px clamp(18px, 3vw, 42px);
  color: #fff;
  background: var(--deep);
  box-shadow: 0 8px 28px rgba(10, 37, 39, .18);
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid rgba(255,255,255,.45);
  border-radius: 15px;
  color: var(--gold);
  font-family: Georgia, serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: .08em;
}

.eyebrow {
  margin: 0 0 3px;
  color: inherit;
  font-size: .76rem;
  font-weight: 800;
  letter-spacing: .15em;
  text-transform: uppercase;
}

.topbar h1 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: clamp(1.25rem, 2vw, 1.7rem); font-weight: 500; }
.topbar-actions { display: flex; align-items: center; gap: 12px; }
.save-status { color: rgba(255,255,255,.72); font-size: .82rem; }
.file-actions { display: flex; align-items: center; gap: 7px; }

.button {
  min-height: 44px;
  padding: 10px 17px;
  border: 1px solid transparent;
  border-radius: 12px;
  font-weight: 750;
  cursor: pointer;
}
.button:focus-visible, .nav-button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
.button-primary { color: var(--deep); background: var(--gold); }
.button-primary:hover { background: #f0ca7a; transform: translateY(-1px); }
.button-secondary { border-color: rgba(255,255,255,.42); color: #fff; background: rgba(255,255,255,.08); }
.button-secondary:hover { background: rgba(255,255,255,.16); }

.app-shell {
  display: grid;
  grid-template-columns: minmax(250px, 285px) minmax(0, 1fr);
  gap: clamp(22px, 3vw, 44px);
  width: min(1540px, 100%);
  margin: 0 auto;
  padding: clamp(24px, 3vw, 44px);
}

.sidebar { position: sticky; top: 106px; align-self: start; max-height: calc(100vh - 130px); overflow: auto; padding-right: 7px; }
.progress-card { margin-bottom: 18px; padding: 16px; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); box-shadow: var(--shadow); }
.progress-copy { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 10px; font-size: .85rem; }
.progress-copy strong { color: var(--deep); }
.progress-track { height: 8px; overflow: hidden; border-radius: 99px; background: #e8ecea; }
.progress-track span { display: block; width: 0; height: 100%; border-radius: inherit; background: var(--deep-2); transition: width .25s ease; }

#sectionNav { display: grid; gap: 5px; }
.nav-button {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 9px 11px;
  border: 0;
  border-radius: 10px;
  text-align: left;
  background: transparent;
  cursor: pointer;
}
.nav-button:hover { background: #eef2f0; }
.nav-button[aria-current="page"] { color: #fff; background: var(--deep); }
.nav-name { font-size: .88rem; font-weight: 690; line-height: 1.25; }
.nav-count { display: grid; place-items: center; min-width: 28px; height: 25px; padding: 0 7px; border-radius: 99px; color: var(--muted); background: #e9eeeb; font-size: .76rem; font-weight: 800; }
.nav-button[aria-current="page"] .nav-count { color: var(--deep); background: var(--gold); }

.workspace { min-width: 0; }
.workspace-intro { margin: 2px 0 24px; }
.workspace-intro .eyebrow { color: var(--deep-2); }
.workspace-intro h2 { margin: 7px 0 6px; color: var(--deep); font-family: Georgia, "Times New Roman", serif; font-size: clamp(2rem, 4vw, 3.35rem); font-weight: 500; line-height: 1.03; }
.workspace-intro > p:last-child { margin: 0; color: var(--muted); font-size: .96rem; }

.frequency-group { margin: 0 0 30px; }
.frequency-heading { display: flex; align-items: center; gap: 12px; margin: 0 0 12px; color: var(--deep); font-size: .88rem; letter-spacing: .08em; text-transform: uppercase; }
.frequency-heading::after { content: ""; flex: 1; height: 1px; background: var(--line); }
.task-list { display: grid; gap: 12px; }
.task-card { border: 1px solid var(--line); border-radius: 17px; background: var(--surface); box-shadow: 0 6px 22px rgba(22,45,46,.045); overflow: hidden; }
.task-card[data-reviewed="true"] { border-color: #b5d6cf; }
.task-card[data-assignable="true"] { border-color: #d69b40; box-shadow: 0 7px 24px rgba(151, 98, 17, .12); }
.task-summary { display: grid; grid-template-columns: minmax(0, 1fr) minmax(150px, 240px); gap: 20px; padding: 18px 20px 14px; }
.task-title { margin: 0 0 6px; font-size: 1.08rem; line-height: 1.28; }
.assignable-indicator { display: inline-flex; margin: 0 0 9px; padding: 4px 8px; border-radius: 7px; color: #754d0b; background: #fff1d3; font-size: .77rem; font-weight: 800; }
.cadence { display: inline-flex; margin-bottom: 9px; padding: 4px 8px; border-radius: 7px; color: var(--deep-2); background: var(--aqua); font-size: .77rem; font-weight: 750; }
.standard { margin: 0; color: #526164; font-size: .9rem; line-height: 1.5; }
.source-note { margin: 7px 0 0; color: #76581e; font-size: .84rem; line-height: 1.4; }
.owner-label { display: block; margin-bottom: 5px; color: var(--muted); font-size: .73rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.current-owner { margin: 0; font-size: .88rem; font-weight: 650; line-height: 1.4; }

.task-controls { display: grid; grid-template-columns: minmax(245px, auto) minmax(145px, .65fr) minmax(190px, 1fr) minmax(155px, .7fr); gap: 14px; padding: 14px 20px 18px; border-top: 1px solid #e8ebe9; background: #fbfcfb; }
.field-label { display: block; margin: 0 0 7px; color: var(--muted); font-size: .76rem; font-weight: 800; letter-spacing: .04em; }
.decision-options { display: flex; gap: 7px; }
.decision-option { position: relative; flex: 1; }
.decision-option input { position: absolute; opacity: 0; pointer-events: none; }
.decision-option span { display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 43px; padding: 8px 10px; border: 1px solid #cfd6d3; border-radius: 10px; background: white; font-size: .84rem; font-weight: 750; cursor: pointer; }
.decision-option span::before { content: ""; width: 14px; height: 14px; border: 1.5px solid #9ba8a4; border-radius: 4px; }
.decision-option input:focus-visible + span { outline: 3px solid var(--gold); outline-offset: 2px; }
.decision-option input:checked + span { color: var(--deep); border-color: #79aaa0; background: var(--aqua); }
.decision-option input:checked + span::before { border-color: var(--deep-2); background: var(--deep-2); box-shadow: inset 0 0 0 3px var(--aqua); }
.text-input, .notes-input { width: 100%; min-height: 43px; border: 1px solid #cfd6d3; border-radius: 10px; color: var(--ink); background: white; }
.text-input { padding: 9px 11px; }
.notes-input { height: 43px; padding: 10px 11px; line-height: 1.35; resize: vertical; }
.text-input::placeholder, .notes-input::placeholder { color: #98a29f; }
.assignable-option { display: grid; align-content: center; gap: 3px; min-height: 43px; padding: 9px 11px; border: 1px solid #d7b875; border-radius: 10px; color: #5f430f; background: #fff9eb; cursor: pointer; }
.assignable-option input { width: 16px; height: 16px; margin: 0 7px 0 0; accent-color: #b77a1d; vertical-align: -2px; }
.assignable-option span { font-size: .84rem; font-weight: 800; }
.assignable-option small { color: #806227; font-size: .73rem; line-height: 1.25; }

#toast { position: fixed; right: 22px; bottom: 22px; z-index: 30; padding: 11px 15px; border-radius: 10px; color: #fff; background: var(--deep); box-shadow: var(--shadow); opacity: 0; transform: translateY(8px); pointer-events: none; transition: .2s ease; }
#toast.visible { opacity: 1; transform: none; }
#printRoot { display: none; }

@media (max-width: 980px) {
  .app-shell { grid-template-columns: 1fr; padding-top: 20px; }
  .sidebar { position: static; max-height: none; overflow: visible; padding: 0; }
  #sectionNav { display: flex; gap: 8px; overflow-x: auto; padding: 2px 1px 9px; scrollbar-width: thin; }
  .nav-button { flex: 0 0 auto; width: auto; max-width: 235px; border: 1px solid var(--line); background: var(--surface); }
  .progress-card { margin-bottom: 12px; }
}

@media (max-width: 720px) {
  .topbar { grid-template-columns: auto 1fr; padding: 11px 15px; }
  .brand-mark { width: 42px; height: 42px; border-radius: 12px; }
  .topbar .eyebrow { display: none; }
  .topbar-actions { grid-column: 1 / -1; flex-wrap: wrap; justify-content: flex-start; }
  .save-status { flex: 1 0 100%; }
  .file-actions { flex: 1; }
  .file-actions .button { flex: 1; }
  .app-shell { padding: 20px 14px 40px; }
  .workspace-intro h2 { font-size: 2.1rem; }
  .task-summary { grid-template-columns: 1fr; gap: 13px; padding: 17px 16px 13px; }
  .task-controls { grid-template-columns: 1fr; padding: 13px 16px 17px; }
  .decision-options { flex-wrap: wrap; }
  .decision-option { min-width: 88px; }
}

@media print {
  @page { size: letter landscape; margin: .38in; }
  body { background: white; }
  .topbar, .app-shell, #toast { display: none !important; }
  #printRoot { display: block; color: #17292b; font-family: Arial, sans-serif; }
  .print-cover { min-height: 6.8in; display: grid; place-content: center; text-align: center; page-break-after: always; }
  .print-cover h1 { margin: 0 0 10px; color: #173a3d; font-family: Georgia, serif; font-size: 30pt; }
  .print-cover p { margin: 4px; font-size: 11pt; }
  .print-section { break-before: page; }
  .print-section h2 { margin: 0 0 10px; padding: 7px 10px; color: white; background: #173a3d; font-family: Georgia, serif; font-size: 15pt; }
  .print-frequency { margin: 9px 0 4px; font-size: 9pt; text-transform: uppercase; }
  .print-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7.5pt; }
  .print-table th, .print-table td { padding: 4px 5px; border: .6pt solid #aeb8b4; vertical-align: top; text-align: left; overflow-wrap: anywhere; }
  .print-table th { color: white; background: #5d7180; font-size: 7pt; }
  .print-table th:nth-child(1) { width: 31%; }
  .print-table th:nth-child(2) { width: 18%; }
  .print-table th:nth-child(3) { width: 10%; }
  .print-table th:nth-child(4) { width: 16%; }
  .print-table th:nth-child(5) { width: 25%; }
  .print-task-title { font-weight: 700; }
  .print-cadence { margin-top: 2px; color: #526164; font-size: 6.8pt; }
  tr { break-inside: avoid; }
}
````

### dist/app.js

````javascript
(() => {
  const data = window.HOUSE_MANUAL_DATA;
  const storageKey = 'house-manual-review-v1';
  const nav = document.querySelector('#sectionNav');
  const taskGroups = document.querySelector('#taskGroups');
  const title = document.querySelector('#sectionTitle');
  const meta = document.querySelector('#sectionMeta');
  const progressText = document.querySelector('#progressText');
  const progressBar = document.querySelector('#progressBar');
  const saveStatus = document.querySelector('#saveStatus');
  const saveFileButton = document.querySelector('#saveFileButton');
  const restoreFileButton = document.querySelector('#restoreFileButton');
  const restoreFileInput = document.querySelector('#restoreFileInput');
  const printRoot = document.querySelector('#printRoot');
  const toast = document.querySelector('#toast');
  const allTasks = data.sections.flatMap(section => section.tasks);
  let activeSection = data.sections[0].id;
  let state = loadState();
  let saveTimer;

  const backupFormat = 'house-manual-review-backup';
  const backupVersion = 1;

  function loadState() {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {}; }
    catch { return {}; }
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }

  function taskState(taskId) {
    return { decision: '', newOwner: '', notes: '', assignable: false, paid: false, ...state[taskId] };
  }

  function isReviewed(taskId) {
    const item = taskState(taskId);
    return Boolean(item.decision || item.newOwner.trim() || item.notes.trim() || item.assignable);
  }

  function reviewedCount(tasks = allTasks) {
    return tasks.filter(task => isReviewed(task.id)).length;
  }

  function queueSave() {
    saveStatus.textContent = 'Saving...';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify(state));
      saveStatus.textContent = 'Autosaved in this browser';
    }, 180);
  }

  function persistState() {
    clearTimeout(saveTimer);
    localStorage.setItem(storageKey, JSON.stringify(state));
    saveStatus.textContent = 'Autosaved in this browser';
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('visible'), 3200);
  }

  function portableState() {
    const tasks = {};
    allTasks.forEach(task => {
      const item = taskState(task.id);
      tasks[task.id] = {
        decision: item.decision || '',
        newOwner: item.newOwner || '',
        notes: item.notes || '',
        assignable: Boolean(item.assignable),
        paid: item.paid === true
      };
    });
    return {
      format: backupFormat,
      version: backupVersion,
      exportedAt: new Date().toISOString(),
      activeSection,
      tasks
    };
  }

  async function downloadBackup() {
    persistState();
    const date = new Date().toISOString().slice(0, 10);
    const filename = `house-manual-review-${date}.json`;
    const contents = JSON.stringify(portableState(), null, 2);

    if (window.showSaveFilePicker) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'House Manual backup', accept: { 'application/json': ['.json'] } }]
        });
        const writer = await fileHandle.createWritable();
        await writer.write(contents);
        await writer.close();
        showToast('Editable backup saved to the folder you chose.');
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }

    const blob = new Blob([contents], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast('Editable backup saved to your computer.');
  }

  function validatedBackup(value) {
    if (!value || value.format !== backupFormat || value.version !== backupVersion || !value.tasks || typeof value.tasks !== 'object') {
      throw new Error('This is not a compatible House Manual backup file.');
    }
    const restored = {};
    const validDecisions = new Set(['', 'keep', 'change', 'remove']);
    allTasks.forEach(task => {
      const item = value.tasks[task.id] || {};
      const decision = typeof item.decision === 'string' ? item.decision : '';
      restored[task.id] = {
        decision: validDecisions.has(decision) ? decision : '',
        newOwner: typeof item.newOwner === 'string' ? item.newOwner : '',
        notes: typeof item.notes === 'string' ? item.notes : '',
        assignable: item.assignable === true,
        paid: item.paid === true
      };
    });
    const sectionExists = data.sections.some(section => section.id === value.activeSection);
    return { tasks: restored, activeSection: sectionExists ? value.activeSection : activeSection };
  }

  async function restoreBackup(file) {
    try {
      const backup = validatedBackup(JSON.parse(await file.text()));
      state = backup.tasks;
      activeSection = backup.activeSection;
      persistState();
      renderNav();
      renderSection();
      updateProgress();
      renderOwners();
      showToast('Backup restored. Your editable review is ready.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'The backup file could not be restored.');
    } finally {
      restoreFileInput.value = '';
    }
  }

  function renderNav() {
    nav.innerHTML = data.sections.map(section => {
      const done = reviewedCount(section.tasks);
      return `<button class="nav-button" type="button" data-section="${section.id}" ${section.id === activeSection ? 'aria-current="page"' : ''}>
        <span class="nav-name">${escapeHtml(section.name)}</span>
        <span class="nav-count" aria-label="${done} of ${section.tasks.length} reviewed">${done}/${section.tasks.length}</span>
      </button>`;
    }).join('');
  }

  function decisionOption(task, value, label) {
    const checked = taskState(task.id).decision === value ? 'checked' : '';
    return `<label class="decision-option"><input type="checkbox" name="decision-${task.id}" data-field="decision" value="${value}" ${checked}><span>${label}</span></label>`;
  }

  function renderTask(task) {
    const item = taskState(task.id);
    return `<article class="task-card" data-task-id="${task.id}" data-reviewed="${isReviewed(task.id)}" data-assignable="${item.assignable === true}">
      <div class="task-summary">
        <div>
          <h4 class="task-title">${escapeHtml(task.title)}</h4>
          ${item.assignable ? '<span class="assignable-indicator">Open · needs an owner</span>' : ''}
          ${item.paid ? '<span class="paid-indicator">Paid</span>' : ''}
          ${task.cadence ? `<span class="cadence">${escapeHtml(task.cadence)}</span>` : ''}
          <p class="standard">${escapeHtml(task.standard)}</p>
          ${task.sourceNote ? `<p class="source-note"><strong>Note:</strong> ${escapeHtml(task.sourceNote)}</p>` : ''}
        </div>
        <div><span class="owner-label">Current owner</span><p class="current-owner">${escapeHtml(task.currentOwner || 'No consistent owner')}</p></div>
      </div>
      <div class="task-controls">
        <div><span class="field-label">Decision</span><div class="decision-options">
          ${decisionOption(task, 'keep', 'Keep')}${decisionOption(task, 'change', 'Change')}${decisionOption(task, 'remove', 'Remove')}
        </div></div>
        <label><span class="field-label">New owner</span><input class="text-input" type="text" data-field="newOwner" value="${escapeHtml(item.newOwner)}" placeholder="Optional"></label>
        <label><span class="field-label">Notes</span><textarea class="notes-input" data-field="notes" placeholder="Support, reminders, standards...">${escapeHtml(item.notes)}</textarea></label>
        <label class="assignable-option"><input type="checkbox" data-field="assignable" ${item.assignable ? 'checked' : ''}><span>Mark assignable</span><small>Open — needs an owner</small></label>
        <label class="paid-option"><input type="checkbox" data-field="paid" ${item.paid ? 'checked' : ''}><span>Paid item</span></label>
      </div>
    </article>`;
  }

  function renderSection() {
    const section = data.sections.find(item => item.id === activeSection);
    const groups = [];
    for (const task of section.tasks) {
      let group = groups.find(item => item.name === task.frequency);
      if (!group) { group = { name: task.frequency, tasks: [] }; groups.push(group); }
      group.tasks.push(task);
    }
    title.textContent = section.name;
    meta.textContent = `${section.tasks.length} tasks · ${reviewedCount(section.tasks)} reviewed`;
    taskGroups.innerHTML = groups.map(group => `<section class="frequency-group">
      <h3 class="frequency-heading">${escapeHtml(group.name)} <span>(${group.tasks.length})</span></h3>
      <div class="task-list">${group.tasks.map(renderTask).join('')}</div>
    </section>`).join('');
  }

  function updateProgress() {
    renderDashboard();
    const count = reviewedCount();
    progressText.textContent = `${count} of ${allTasks.length}`;
    progressBar.style.width = `${(count / allTasks.length) * 100}%`;
    renderNav();
    const section = data.sections.find(item => item.id === activeSection);
    meta.textContent = `${section.tasks.length} tasks · ${reviewedCount(section.tasks)} reviewed`;
  }

  function updateTask(taskId, patch) {
    state[taskId] = { ...taskState(taskId), ...patch };
    const card = document.querySelector(`[data-task-id="${taskId}"]`);
    if (card) card.dataset.reviewed = String(isReviewed(taskId));
    queueSave();
    updateProgress();
  }

  nav.addEventListener('click', event => {
    const button = event.target.closest('[data-section]');
    if (!button) return;
    activeSection = button.dataset.section;
    renderNav();
    renderSection();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  taskGroups.addEventListener('change', event => {
    const field = event.target.dataset.field;
    const card = event.target.closest('[data-task-id]');
    if (!field || !card) return;
    if (field === 'decision') {
      card.querySelectorAll('[data-field="decision"]').forEach(input => { if (input !== event.target) input.checked = false; });
      updateTask(card.dataset.taskId, { decision: event.target.checked ? event.target.value : '' });
    } else if (field === 'assignable' || field === 'paid') {
      updateTask(card.dataset.taskId, { [field]: event.target.checked });
      renderSection();
      taskGroups.querySelector(`[data-task-id="${card.dataset.taskId}"] [data-field="${field}"]`).focus();
    } else {
      updateTask(card.dataset.taskId, { [field]: event.target.value });
    }
  });

  taskGroups.addEventListener('input', event => {
    const field = event.target.dataset.field;
    const card = event.target.closest('[data-task-id]');
    if (!field || !card || field === 'decision' || field === 'assignable' || field === 'paid') return;
    updateTask(card.dataset.taskId, { [field]: event.target.value });
  });

  function ownersFor(task) {
    const item = taskState(task.id);
    if (item.assignable) return ['Open — needs an owner'];
    const assigned = item.newOwner.trim();
    if (assigned) return [...new Set(assigned.split(/\s*(?:\+|,|;|\band\b|&)\s*/i).filter(Boolean))];
    const original = (task.currentOwner || '').replace(/\([^)]*\)/g, '');
    const names = new Set();
    for (const part of original.split(/\s*(?:\+|;|\bor\b)\s*/i)) {
      const match = part.trim().match(/^(Kimberly|Michael|Brighton|Oliver|Ephraim)\b/);
      if (match) names.add(match[1]);
      if (/^Oliver\/Ephraim/.test(part.trim())) names.add('Ephraim');
      if (/^(each child|each child's)/i.test(part.trim())) names.add('Each child');
    }
    if (names.size) return [...names];
    if (!original || /no consistent/i.test(original)) return ['Open — needs an owner'];
    return [original.trim()];
  }

  function renderDashboard() {
    const groups = new Map();
    const tasks = allTasks.filter(task => taskState(task.id).decision !== 'remove');
    for (const task of tasks) for (const owner of ownersFor(task)) {
      const key = owner.toLocaleLowerCase();
      if (!groups.has(key)) groups.set(key, { name: owner, count: 0 });
      groups.get(key).count++;
    }
    const entries = [...groups.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const total = entries.reduce((sum, item) => sum + item.count, 0);
    const colors = ['#24575a', '#c78322', '#4879b5', '#975e9b', '#588544', '#cb6556', '#536480', '#968230', '#398e91', '#a35370', '#777777'];
    let angle = 0;
    const stops = entries.map((item, index) => {
      item.color = colors[index % colors.length];
      const start = angle;
      angle += item.count / total * 360;
      return `${item.color} ${start}deg ${angle}deg`;
    });
    const pie = document.querySelector('#allocationPie');
    pie.style.background = total ? `conic-gradient(${stops.join(',')})` : '#e8ecea';
    pie.setAttribute('aria-label', total ? `Task allocation: ${tasks.length} active tasks, ${total} owner assignments. Exact counts in the table.` : 'No active tasks to allocate.');
    document.querySelector('#allocationSummary').textContent = `${tasks.length} active tasks · ${total} owner assignments · ${entries.length} owner groups`;
    document.querySelector('#allocationLegend').innerHTML = entries.length ? entries.map(item => `<tr><th scope="row"><span class="allocation-swatch" style="background:${item.color}" aria-hidden="true"></span>${escapeHtml(item.name)}</th><td>${item.count}</td><td>${(item.count / total * 100).toFixed(1)}%</td></tr>`).join('') : '<tr><td colspan="3">No active tasks to allocate.</td></tr>';
  }

  function renderOwners() {
    const root = document.querySelector('#ownerGroups');
    const expanded = new Set([...root.querySelectorAll('details[open]')].map(el => el.dataset.owner));
    const groups = new Map();
    for (const section of data.sections) for (const task of section.tasks) {
      if (taskState(task.id).decision === 'remove') continue;
      for (const owner of ownersFor(task)) {
        const key = owner.toLocaleLowerCase();
        if (!groups.has(key)) groups.set(key, { name: owner, tasks: [] });
        groups.get(key).tasks.push({ task, section });
      }
    }
    root.innerHTML = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name)).map(group =>
      `<details class="owner-group" data-owner="${escapeHtml(group.name)}" ${expanded.has(group.name) ? 'open' : ''}>
        <summary>${escapeHtml(group.name)} <span>${group.tasks.length} tasks</span></summary>
        <div class="owner-task-list">${group.tasks.map(({task, section}) => {
          const item = taskState(task.id);
          return `<article class="owner-task"><h3>${escapeHtml(task.title)} ${item.paid ? '<span class="paid-indicator">Paid</span>' : ''} ${item.assignable ? '<span class="assignable-indicator">Open · needs an owner</span>' : ''}</h3>
            <p>${escapeHtml(section.name)} · ${escapeHtml(task.cadence || task.frequency)}</p>
            <p>${escapeHtml(task.standard)}</p><p><strong>Assignment:</strong> ${escapeHtml(item.newOwner.trim() || task.currentOwner)}</p>
            ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}
            <button type="button" class="button" data-open-task="${task.id}" data-room="${section.id}">Review task</button></article>`;
        }).join('')}</div></details>`).join('');
  }

  function showView(view) {
    for (const name of ['home', 'review', 'owners']) document.querySelector(`#${name}View`).hidden = name !== view;
    document.querySelectorAll('[data-view]').forEach(button => {
      if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (view === 'owners') renderOwners();
    if (view === 'home') renderDashboard();
  }
  document.querySelector('.feature-tabs').addEventListener('click', event => {
    const button = event.target.closest('[data-view]');
    if (button) showView(button.dataset.view);
  });
  document.querySelector('#ownerGroups').addEventListener('click', event => {
    const button = event.target.closest('[data-open-task]');
    if (!button) return;
    activeSection = button.dataset.room;
    renderNav(); renderSection(); showView('review');
    const card = taskGroups.querySelector(`[data-task-id="${button.dataset.openTask}"]`);
    card.scrollIntoView({ block: 'center' });
    card.querySelector('input').focus({ preventScroll: true });
  });

  function buildPrintView() {
    const today = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date());
    const cover = `<div class="print-cover"><div><p>House Manual</p><h1>Room-by-Room Review</h1><p>${reviewedCount()} of ${allTasks.length} tasks reviewed</p><p>Saved ${escapeHtml(today)}</p></div></div>`;
    const sections = data.sections.map(section => {
      const grouped = Object.groupBy ? Object.groupBy(section.tasks, task => task.frequency) : section.tasks.reduce((acc, task) => ((acc[task.frequency] ||= []).push(task), acc), {});
      const groups = Object.entries(grouped).map(([frequency, tasks]) => `<h3 class="print-frequency">${escapeHtml(frequency)} (${tasks.length})</h3>
        <table class="print-table"><thead><tr><th>Task / standard</th><th>Current owner</th><th>Decision</th><th>New owner</th><th>Notes</th></tr></thead><tbody>
        ${tasks.map(task => { const item = taskState(task.id); return `<tr><td><div class="print-task-title">${escapeHtml(task.title)}</div><div class="print-cadence">${escapeHtml(task.cadence)}${task.standard ? ` · ${escapeHtml(task.standard)}` : ''}</div></td><td>${escapeHtml(task.currentOwner)}</td><td>${escapeHtml(item.decision ? item.decision[0].toUpperCase() + item.decision.slice(1) : '')}</td><td>${escapeHtml(item.newOwner)}</td><td>${escapeHtml(item.notes)}</td></tr>`; }).join('')}
        </tbody></table>`).join('');
      return `<section class="print-section"><h2>${escapeHtml(section.name)} · ${reviewedCount(section.tasks)}/${section.tasks.length}</h2>${groups}</section>`;
    }).join('');
    printRoot.innerHTML = cover + sections;
  }

  document.querySelector('#printButton').addEventListener('click', () => {
    persistState();
    buildPrintView();
    showToast('Choose “Save as PDF” in the print window.');
    setTimeout(() => window.print(), 350);
  });

  saveFileButton.addEventListener('click', downloadBackup);
  restoreFileButton.addEventListener('click', () => restoreFileInput.click());
  restoreFileInput.addEventListener('change', () => {
    const [file] = restoreFileInput.files;
    if (file) restoreBackup(file);
  });

  function registerWebMcp() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const taskIds = new Set(allTasks.map(task => task.id));
    const register = tool => Promise.resolve(context.registerTool(tool)).catch(() => {});
    register({
      name: 'set_task_review', title: 'Set task review',
      description: 'Update the decision, new owner, and notes for one House Manual task.',
      inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, decision: { type: 'string', enum: ['', 'keep', 'change', 'remove'] }, newOwner: { type: 'string' }, notes: { type: 'string' } }, required: ['taskId'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!taskIds.has(input.taskId)) throw new Error('Unknown taskId');
        const patch = {};
        if (input.decision !== undefined) patch.decision = input.decision;
        if (input.newOwner !== undefined) patch.newOwner = input.newOwner;
        if (input.notes !== undefined) patch.notes = input.notes;
        updateTask(input.taskId, patch);
        if (document.querySelector(`[data-task-id="${input.taskId}"]`)) renderSection();
        return { taskId: input.taskId, saved: true, reviewed: isReviewed(input.taskId) };
      }
    });
    register({
      name: 'get_review_progress', title: 'Get review progress',
      description: 'Return overall and room-by-room House Manual review progress.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute() { return { reviewed: reviewedCount(), total: allTasks.length, sections: data.sections.map(section => ({ id: section.id, name: section.name, reviewed: reviewedCount(section.tasks), total: section.tasks.length })) }; }
    });
  }

  renderNav();
  renderSection();
  updateProgress();
  registerWebMcp();
})();
````

### dist/data.js

````javascript
window.HOUSE_MANUAL_DATA = {
  "title": "House Manual - Room-by-Room Review",
  "sourceTaskCount": 295,
  "sections": [
    {
      "id": "section-1",
      "name": "Daily / Ongoing Routines",
      "tasks": [
        {
          "id": "task-1",
          "frequency": "Immediate / after use",
          "title": "Personal dishes",
          "cadence": "After use",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "EVERYONE / individual responsibility"
        },
        {
          "id": "task-2",
          "frequency": "Immediate / after use",
          "title": "Active laundry moved forward",
          "cadence": "Whenever a load is active",
          "standard": "Laundry is moved through wash/dry/put-away stage according to the current household reality and the owner note.",
          "sourceNote": "",
          "currentOwner": "Kimberly for everyone's laundry except Brighton's; Brighton for his own laundry"
        },
        {
          "id": "task-3",
          "frequency": "Daily / nightly",
          "title": "Basic personal hygiene",
          "cadence": "Daily",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "EVERYONE / individual responsibility"
        },
        {
          "id": "task-4",
          "frequency": "Daily / nightly",
          "title": "Cook / provide dinner",
          "cadence": "Daily",
          "standard": "Dinner is prepared, reheated, ordered, or intentionally provided according to the day's plan.",
          "sourceNote": "Current reality: Kimberly does approximately 99% of household cooking.",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-5",
          "frequency": "Daily / nightly",
          "title": "Dirty laundry contained",
          "cadence": "Daily",
          "standard": "Laundry is moved through wash/dry/put-away stage according to the current household reality and the owner note.",
          "sourceNote": "",
          "currentOwner": "EVERYONE / individual responsibility"
        },
        {
          "id": "task-6",
          "frequency": "Daily / nightly",
          "title": "Personal belongings out of common areas",
          "cadence": "Daily",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "EVERYONE / individual responsibility"
        },
        {
          "id": "task-7",
          "frequency": "Daily / nightly",
          "title": "Pinto basic care",
          "cadence": "Daily",
          "standard": "Pinto's food, water, bathroom trips/walks, and obvious health/behavior concerns are handled according to schedule.",
          "sourceNote": "Updated: Brighton does much of the Pinto care.",
          "currentOwner": "Michael (morning Pinto food/water + morning walk) + Brighton (much of Pinto care) + Kimberly (remaining Pinto care/coverage as needed)"
        },
        {
          "id": "task-8",
          "frequency": "Daily / nightly",
          "title": "Picket food and water",
          "cadence": "Daily morning + PM",
          "standard": "Food/water/habitat task is completed; obvious health or habitat concerns are reported.",
          "sourceNote": "",
          "currentOwner": "Michael (morning Picket food/water) + Ephraim (PM Picket food/water); Kimberly currently monitors/follows up if needed"
        },
        {
          "id": "task-9",
          "frequency": "Daily / nightly",
          "title": "Kids' school management",
          "cadence": "Daily on school days",
          "standard": "Dashboards and Mighty are checked; assignments, messages, missing work, projects, and deadlines are reviewed; kids are reminded/followed up with; coaches are contacted as needed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-10",
          "frequency": "Daily / nightly",
          "title": "Water filter filled",
          "cadence": "Multiple times daily / as needed",
          "standard": "Water filter/reservoir is usable, filled or changed as needed, and not left empty.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-11",
          "frequency": "Daily / nightly",
          "title": "House Close",
          "cadence": "Nightly",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly + household members with assigned closing tasks"
        }
      ]
    },
    {
      "id": "section-2",
      "name": "Kitchen",
      "tasks": [
        {
          "id": "task-12",
          "frequency": "Daily / nightly",
          "title": "Unload dishwasher",
          "cadence": "Every morning / when clean",
          "standard": "Clean dishes are put away so the dishwasher is available for the next round.",
          "sourceNote": "",
          "currentOwner": "Michael"
        },
        {
          "id": "task-13",
          "frequency": "Daily / nightly",
          "title": "Water filter refill",
          "cadence": "Multiple times daily / as needed",
          "standard": "Water filter/reservoir is usable, filled or changed as needed, and not left empty.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-14",
          "frequency": "Daily / nightly",
          "title": "Bulk dinner/evening dishes + sink/disposal reset",
          "cadence": "Nightly",
          "standard": "Bulk dishes are handled; sink is wiped/washed down; water and stains around the sink/counter are cleaned; disposal is run as needed.",
          "sourceNote": "",
          "currentOwner": "Michael"
        },
        {
          "id": "task-15",
          "frequency": "Daily / nightly",
          "title": "Final dishwasher start + late dishes",
          "cadence": "Nightly",
          "standard": "Dishwasher soap is added, dishwasher is started, and late dishes are handled so the kitchen is truly closed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-16",
          "frequency": "Daily / nightly",
          "title": "Nightly kitchen pickup and counter wipe-down",
          "cadence": "Nightly",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Oliver"
        },
        {
          "id": "task-17",
          "frequency": "Daily / nightly",
          "title": "Kitchen trash taken out",
          "cadence": "Nightly / before overflowing or smelling",
          "standard": "Kitchen trash is taken out nightly or before it overflows or smells; liner is replaced if used.",
          "sourceNote": "Michael currently takes out the kitchen trash nightly.",
          "currentOwner": "Michael"
        },
        {
          "id": "task-18",
          "frequency": "Weekly",
          "title": "Refrigerator/freezer before-shopping reset",
          "cadence": "Before each grocery trip",
          "standard": "Items are returned to useful homes; trash/donations/misplaced items are removed; area is usable again.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-19",
          "frequency": "Weekly",
          "title": "Stainless appliance exteriors",
          "cadence": "Weekly",
          "standard": "Seasonal or visible outdoor needs are handled, scheduled, or added to the maintenance list.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-20",
          "frequency": "Weekly",
          "title": "Coffee pot",
          "cadence": "Weekly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-21",
          "frequency": "Weekly",
          "title": "Deep-clean counters",
          "cadence": "Weekly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-22",
          "frequency": "Weekly",
          "title": "Inside microwave",
          "cadence": "Weekly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-23",
          "frequency": "Weekly",
          "title": "Regular refrigerator maintenance",
          "cadence": "Weekly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-24",
          "frequency": "Weekly",
          "title": "Scrub sink to remove stains",
          "cadence": "Weekly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-25",
          "frequency": "Weekly",
          "title": "Assess food inventory",
          "cadence": "Weekly and before shopping",
          "standard": "Needed supplies are checked early, added to the correct list, ordered, replaced, or restocked before they become urgent.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-26",
          "frequency": "Monthly",
          "title": "Dishwasher maintenance",
          "cadence": "Monthly",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-27",
          "frequency": "Monthly",
          "title": "Top of refrigerator",
          "cadence": "Monthly",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-28",
          "frequency": "Monthly",
          "title": "Vacuum under/sides of refrigerator",
          "cadence": "Monthly / as accessible",
          "standard": "Floor or item is picked up enough to clean; visible dust, hair, debris, and missed edges are addressed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-29",
          "frequency": "Monthly",
          "title": "Cabinet exteriors",
          "cadence": "Monthly / as needed",
          "standard": "Seasonal or visible outdoor needs are handled, scheduled, or added to the maintenance list.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-30",
          "frequency": "Monthly",
          "title": "Assess/reorder kitchen/supplement/cleaning/pet supplies",
          "cadence": "Monthly / before shopping as needed",
          "standard": "Needed supplies are checked early, added to the correct list, ordered, replaced, or restocked before they become urgent.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-31",
          "frequency": "Monthly",
          "title": "Coffee maker deep clean/descale",
          "cadence": "Monthly or according to machine needs",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-32",
          "frequency": "Every 2 months",
          "title": "Light fixtures",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-33",
          "frequency": "Every 2 months",
          "title": "Kitchen rug",
          "cadence": "Every 2 months / sooner if dirty",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-34",
          "frequency": "Quarterly",
          "title": "Range hood/filter",
          "cadence": "Every 3 months",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-35",
          "frequency": "Quarterly",
          "title": "Deep-clean refrigerator/freezer interior",
          "cadence": "Quarterly",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-36",
          "frequency": "Quarterly",
          "title": "Cabinet/drawer interiors",
          "cadence": "Quarterly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-37",
          "frequency": "Quarterly",
          "title": "Oven drawer",
          "cadence": "Quarterly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-38",
          "frequency": "Quarterly",
          "title": "Tops of cabinets",
          "cadence": "Quarterly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-39",
          "frequency": "Quarterly",
          "title": "Under-sink cabinet organize/clean-out",
          "cadence": "Quarterly / as needed",
          "standard": "Items are returned to useful homes; trash/donations/misplaced items are removed; area is usable again.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-40",
          "frequency": "Quarterly",
          "title": "Walls",
          "cadence": "Quarterly / as needed",
          "standard": "Visible fingerprints, scuffs, splashes, smudges, and cobwebs are cleaned without damaging paint.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-41",
          "frequency": "Quarterly",
          "title": "Inside oven",
          "cadence": "Quarterly / sooner after significant spill",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-42",
          "frequency": "As needed / product schedule",
          "title": "Water filter replacement + reservoir wash",
          "cadence": "According to filter schedule / as needed",
          "standard": "Water filter/reservoir is usable, filled or changed as needed, and not left empty.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-43",
          "frequency": "As needed / product schedule",
          "title": "Under-sink roach trap",
          "cadence": "Replace according to product schedule / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        }
      ]
    },
    {
      "id": "section-3",
      "name": "Dining Room",
      "tasks": [
        {
          "id": "task-44",
          "frequency": "Daily / nightly",
          "title": "Table and bench reset",
          "cadence": "Daily / as needed",
          "standard": "Items are returned to useful homes; trash/donations/misplaced items are removed; area is usable again.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-45",
          "frequency": "Daily / nightly",
          "title": "Empty dining-room trash",
          "cadence": "Nightly / as needed",
          "standard": "Trash is removed before overflowing or smelling; liner is replaced if used; bag goes to proper larger container.",
          "sourceNote": "",
          "currentOwner": "Michael"
        },
        {
          "id": "task-46",
          "frequency": "Weekly",
          "title": "Dust black shelves",
          "cadence": "Weekly",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-47",
          "frequency": "Monthly",
          "title": "Baseboards",
          "cadence": "About every 4 weeks / as needed",
          "standard": "Visible dust, hair, and grime are wiped from trim, edges, rails, and corners.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-48",
          "frequency": "Monthly",
          "title": "Wash/change seat covers",
          "cadence": "About every 4 weeks / sooner if dirty",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-49",
          "frequency": "Monthly",
          "title": "Wash trash can",
          "cadence": "Monthly / as needed",
          "standard": "Trash is removed before overflowing or smelling; liner is replaced if used; bag goes to proper larger container.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-50",
          "frequency": "Every 2 months",
          "title": "Light fixture",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-51",
          "frequency": "Every 2 months",
          "title": "Pictures and wall hangings",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-52",
          "frequency": "Quarterly",
          "title": "Walls",
          "cadence": "Quarterly / as needed",
          "standard": "Visible fingerprints, scuffs, splashes, smudges, and cobwebs are cleaned without damaging paint.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-53",
          "frequency": "Quarterly",
          "title": "Windows",
          "cadence": "Quarterly / as needed",
          "standard": "Glass, sill, trim, and accessible tracks are cleaned; fingerprints, dust, cobwebs, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-54",
          "frequency": "Seasonal / annual",
          "title": "Blinds",
          "cadence": "2x/year / as needed",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-55",
          "frequency": "As needed / product schedule",
          "title": "Oil wood table/chairs",
          "cadence": "According to wood/product needs",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        }
      ]
    },
    {
      "id": "section-4",
      "name": "Living Room",
      "tasks": [
        {
          "id": "task-56",
          "frequency": "Daily / nightly",
          "title": "Robot vacuum dust bin",
          "cadence": "Daily",
          "standard": "Floor or item is picked up enough to clean; visible dust, hair, debris, and missed edges are addressed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-57",
          "frequency": "Daily / nightly",
          "title": "Daily pickup/tidy",
          "cadence": "Daily / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-58",
          "frequency": "Weekly",
          "title": "Coffee table",
          "cadence": "Weekly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-59",
          "frequency": "Weekly",
          "title": "Couch quick reset",
          "cadence": "Weekly / as needed",
          "standard": "Items are returned to useful homes; trash/donations/misplaced items are removed; area is usable again.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-60",
          "frequency": "Weekly",
          "title": "Lizard tank glass",
          "cadence": "Weekly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Michael"
        },
        {
          "id": "task-61",
          "frequency": "Weekly",
          "title": "Bookshelves",
          "cadence": "Weekly / every 2 weeks",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-62",
          "frequency": "Weekly",
          "title": "Entertainment center",
          "cadence": "Weekly / every 2 weeks",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-63",
          "frequency": "Weekly",
          "title": "Random surface objects",
          "cadence": "Weekly / every 2 weeks",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-64",
          "frequency": "Weekly",
          "title": "Coffee-table folded towels/sheets reset",
          "cadence": "Weekly / if present",
          "standard": "Any folded towels, sheets, bedding, or linens left on the coffee table are moved to their correct closet/storage location or other agreed put-away place so the coffee table is cleared.",
          "sourceNote": "",
          "currentOwner": "Oliver"
        },
        {
          "id": "task-65",
          "frequency": "Weekly",
          "title": "Rabbit bowls",
          "cadence": "Weekly deep clean",
          "standard": "Food/water/habitat task is completed; obvious health or habitat concerns are reported.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-66",
          "frequency": "Weekly",
          "title": "Main rug vacuum",
          "cadence": "Weekly in addition to normal robot cleaning",
          "standard": "Floor or item is picked up enough to clean; visible dust, hair, debris, and missed edges are addressed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-67",
          "frequency": "Weekly",
          "title": "Rabbit litter box / surrounding area",
          "cadence": "Weekly or according to litter system",
          "standard": "Food/water/habitat task is completed; obvious health or habitat concerns are reported.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-68",
          "frequency": "Every 2-3 weeks",
          "title": "Robot vacuum filter",
          "cadence": "About every 3 weeks / sooner if needed",
          "standard": "Floor or item is picked up enough to clean; visible dust, hair, debris, and missed edges are addressed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-69",
          "frequency": "Every 2-3 weeks",
          "title": "Picket bedding/pillows and rabbit-soiled rugs",
          "cadence": "Every 2 weeks / as needed",
          "standard": "Food/water/habitat task is completed; obvious health or habitat concerns are reported.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-70",
          "frequency": "Every 2-3 weeks",
          "title": "TV",
          "cadence": "Every 2 weeks / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-71",
          "frequency": "Every 2-3 weeks",
          "title": "Dog couch covers",
          "cadence": "Every 2 weeks / sooner if dirty",
          "standard": "Pinto's food, water, bathroom trips/walks, and obvious health/behavior concerns are handled according to schedule.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-72",
          "frequency": "Every 2-3 weeks",
          "title": "Rabbit-area deeper cleaning",
          "cadence": "Every 2-3 weeks",
          "standard": "Food/water/habitat task is completed; obvious health or habitat concerns are reported.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-73",
          "frequency": "Monthly",
          "title": "Baseboards",
          "cadence": "About every 4 weeks / as needed",
          "standard": "Visible dust, hair, and grime are wiped from trim, edges, rails, and corners.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-74",
          "frequency": "Monthly",
          "title": "Robot main/side brushes",
          "cadence": "About every 4 weeks / sooner if needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-75",
          "frequency": "Monthly",
          "title": "Dust/clean plants",
          "cadence": "Monthly",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-76",
          "frequency": "Monthly",
          "title": "Vacuum under/behind furniture",
          "cadence": "Monthly / as accessible",
          "standard": "Floor or item is picked up enough to clean; visible dust, hair, debris, and missed edges are addressed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-77",
          "frequency": "Monthly",
          "title": "Air Doctor exterior/intake cleaning",
          "cadence": "Monthly / as needed",
          "standard": "Seasonal or visible outdoor needs are handled, scheduled, or added to the maintenance list.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-78",
          "frequency": "Monthly",
          "title": "Back door",
          "cadence": "Monthly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-79",
          "frequency": "Monthly",
          "title": "Fireplace area",
          "cadence": "Monthly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-80",
          "frequency": "Monthly",
          "title": "Front door",
          "cadence": "Monthly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-81",
          "frequency": "Every 2 months",
          "title": "Ceiling fan",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-82",
          "frequency": "Every 2 months",
          "title": "Light fixtures",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-83",
          "frequency": "Every 2 months",
          "title": "Vents",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-84",
          "frequency": "Every 2 months",
          "title": "Wall hangings",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-85",
          "frequency": "Every 2 months",
          "title": "Portable rugs/mats",
          "cadence": "Every 2 months / sooner if dirty",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-86",
          "frequency": "Quarterly",
          "title": "Walls",
          "cadence": "Quarterly / as needed",
          "standard": "Visible fingerprints, scuffs, splashes, smudges, and cobwebs are cleaned without damaging paint.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-87",
          "frequency": "Quarterly",
          "title": "Windows",
          "cadence": "Quarterly / as needed",
          "standard": "Glass, sill, trim, and accessible tracks are cleaned; fingerprints, dust, cobwebs, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-88",
          "frequency": "Seasonal / annual",
          "title": "Blinds",
          "cadence": "2x/year / as needed",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-89",
          "frequency": "Seasonal / annual",
          "title": "Main rug deep wash outside",
          "cadence": "2x/year / specific need",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-90",
          "frequency": "As needed / product schedule",
          "title": "Lizard habitat maintenance",
          "cadence": "According to established habitat schedule",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Michael"
        },
        {
          "id": "task-91",
          "frequency": "As needed / product schedule",
          "title": "Air Doctor filter replacement",
          "cadence": "According to filter indicator/manufacturer schedule",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-92",
          "frequency": "As needed / product schedule",
          "title": "Main rug spot clean",
          "cadence": "As needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-93",
          "frequency": "As needed / product schedule",
          "title": "Robot parts inventory/reorder",
          "cadence": "As needed",
          "standard": "Needed supplies are checked early, added to the correct list, ordered, replaced, or restocked before they become urgent.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-94",
          "frequency": "As needed / product schedule",
          "title": "Throw blankets",
          "cadence": "As needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-95",
          "frequency": "As needed / product schedule",
          "title": "Water plants",
          "cadence": "On plant schedule / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        }
      ]
    },
    {
      "id": "section-5",
      "name": "Entryway / Rabbit-Supply Area",
      "tasks": [
        {
          "id": "task-96",
          "frequency": "Daily / nightly",
          "title": "Entryway reset",
          "cadence": "Daily / as needed",
          "standard": "Items are returned to useful homes; trash/donations/misplaced items are removed; area is usable again.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-97",
          "frequency": "Monthly",
          "title": "Dust/wipe entry surfaces",
          "cadence": "Monthly / as needed",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        }
      ]
    },
    {
      "id": "section-6",
      "name": "Pantry",
      "tasks": [
        {
          "id": "task-98",
          "frequency": "Weekly",
          "title": "Pantry quick organize/clean-out",
          "cadence": "Weekly",
          "standard": "Items are returned to useful homes; trash/donations/misplaced items are removed; area is usable again.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-99",
          "frequency": "Weekly",
          "title": "Sweep pantry floor",
          "cadence": "Weekly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-100",
          "frequency": "Monthly",
          "title": "Pantry door",
          "cadence": "Monthly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-101",
          "frequency": "Quarterly",
          "title": "Pantry deeper organization",
          "cadence": "Quarterly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        }
      ]
    },
    {
      "id": "section-7",
      "name": "Laundry Room",
      "tasks": [
        {
          "id": "task-102",
          "frequency": "Immediate / after use",
          "title": "Dryer lint trap",
          "cadence": "Every dryer load, at minimum once a week",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Person using dryer"
        },
        {
          "id": "task-103",
          "frequency": "Weekly",
          "title": "Wipe down washer/dryer exteriors",
          "cadence": "Weekly",
          "standard": "Seasonal or visible outdoor needs are handled, scheduled, or added to the maintenance list.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-104",
          "frequency": "Weekly",
          "title": "Empty laundry-room trash",
          "cadence": "Weekly / as needed",
          "standard": "Laundry is moved through wash/dry/put-away stage according to the current household reality and the owner note.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-105",
          "frequency": "Weekly",
          "title": "Laundry room reset/organize",
          "cadence": "Weekly / as needed",
          "standard": "Laundry is moved through wash/dry/put-away stage according to the current household reality and the owner note.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-106",
          "frequency": "Weekly",
          "title": "Laundry-room basket laundry",
          "cadence": "Weekly / as needed",
          "standard": "Laundry that collects in the laundry-room basket is washed, dried, and moved forward so it does not become a hidden backlog.",
          "sourceNote": "Added from current household reality.",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-107",
          "frequency": "Monthly",
          "title": "Baseboards",
          "cadence": "About every 4 weeks / as needed",
          "standard": "Visible dust, hair, and grime are wiped from trim, edges, rails, and corners.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-108",
          "frequency": "Monthly",
          "title": "Deep dryer lint clean-out",
          "cadence": "Monthly",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-109",
          "frequency": "Monthly",
          "title": "Washing-machine clean cycle",
          "cadence": "Monthly",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-110",
          "frequency": "Monthly",
          "title": "Assess/reorder laundry products",
          "cadence": "Monthly / as needed",
          "standard": "Laundry is moved through wash/dry/put-away stage according to the current household reality and the owner note.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-111",
          "frequency": "Monthly",
          "title": "Cabinets and storage",
          "cadence": "Monthly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-112",
          "frequency": "Monthly",
          "title": "Door",
          "cadence": "Monthly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-113",
          "frequency": "Monthly",
          "title": "Wash laundry-room trash can",
          "cadence": "Monthly / as needed",
          "standard": "Laundry is moved through wash/dry/put-away stage according to the current household reality and the owner note.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-114",
          "frequency": "Quarterly",
          "title": "Clean between/behind appliances and fixtures",
          "cadence": "Quarterly / as accessible",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-115",
          "frequency": "Quarterly",
          "title": "Walls",
          "cadence": "Quarterly / as needed",
          "standard": "Visible fingerprints, scuffs, splashes, smudges, and cobwebs are cleaned without damaging paint.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-116",
          "frequency": "Seasonal / annual",
          "title": "Dryer vent/exhaust maintenance",
          "cadence": "Annually",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly tracks/schedules"
        }
      ]
    },
    {
      "id": "section-8",
      "name": "Downstairs Hallway",
      "tasks": [
        {
          "id": "task-117",
          "frequency": "Monthly",
          "title": "Baseboards",
          "cadence": "About every 4 weeks / as needed",
          "standard": "Visible dust, hair, and grime are wiped from trim, edges, rails, and corners.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-118",
          "frequency": "Monthly",
          "title": "Garage door/interior door surface",
          "cadence": "Monthly / as needed",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-119",
          "frequency": "Every 2 months",
          "title": "Light fixtures",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-120",
          "frequency": "Quarterly",
          "title": "Walls",
          "cadence": "Quarterly / as needed",
          "standard": "Visible fingerprints, scuffs, splashes, smudges, and cobwebs are cleaned without damaging paint.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-121",
          "frequency": "Seasonal / annual",
          "title": "Fall/winter hanging basket",
          "cadence": "Fall/winter seasonal setup/check",
          "standard": "Basket is stocked and reset for fall/winter needs such as masks and cold-season items.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-122",
          "frequency": "Seasonal / annual",
          "title": "Spring/summer hanging basket",
          "cadence": "Spring/summer seasonal setup/check",
          "standard": "Basket is stocked and reset for spring/summer needs such as mosquito/tick items.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        }
      ]
    },
    {
      "id": "section-9",
      "name": "Downstairs Hall Closet",
      "tasks": [
        {
          "id": "task-123",
          "frequency": "Monthly",
          "title": "Door",
          "cadence": "Monthly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-124",
          "frequency": "Monthly",
          "title": "Sweep floor",
          "cadence": "Monthly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-125",
          "frequency": "Quarterly",
          "title": "Organize/declutter",
          "cadence": "Quarterly / as needed",
          "standard": "Items are returned to useful homes; trash/donations/misplaced items are removed; area is usable again.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        }
      ]
    },
    {
      "id": "section-10",
      "name": "Guest Bathroom",
      "tasks": [
        {
          "id": "task-126",
          "frequency": "Weekly",
          "title": "Bathroom floor",
          "cadence": "Weekly",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-127",
          "frequency": "Weekly",
          "title": "Mirror",
          "cadence": "Weekly",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-128",
          "frequency": "Weekly",
          "title": "Toilet",
          "cadence": "Weekly",
          "standard": "Toilet bowl, seat, lid, hinges, handle, base, exterior, and surrounding splashes are cleaned.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-129",
          "frequency": "Weekly",
          "title": "Vanity top/front, sink, and faucet",
          "cadence": "Weekly",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-130",
          "frequency": "Weekly",
          "title": "Empty trash",
          "cadence": "Weekly / as needed",
          "standard": "Trash is removed before overflowing or smelling; liner is replaced if used; bag goes to proper larger container.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-131",
          "frequency": "Weekly",
          "title": "Shower/tub if applicable",
          "cadence": "Weekly / as needed",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-132",
          "frequency": "Weekly",
          "title": "Replace hand towel",
          "cadence": "Weekly / sooner if dirty",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-133",
          "frequency": "Monthly",
          "title": "Baseboards",
          "cadence": "About every 4 weeks / as needed",
          "standard": "Visible dust, hair, and grime are wiped from trim, edges, rails, and corners.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-134",
          "frequency": "Monthly",
          "title": "Shower curtain/liner",
          "cadence": "About monthly / as needed",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-135",
          "frequency": "Monthly",
          "title": "Assess/reorder bathroom products",
          "cadence": "Monthly / as needed",
          "standard": "Needed supplies are checked early, added to the correct list, ordered, replaced, or restocked before they become urgent.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-136",
          "frequency": "Monthly",
          "title": "Door",
          "cadence": "Monthly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-137",
          "frequency": "Monthly",
          "title": "Wash trash can",
          "cadence": "Monthly / as needed",
          "standard": "Trash is removed before overflowing or smelling; liner is replaced if used; bag goes to proper larger container.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-138",
          "frequency": "Every 2 months",
          "title": "Painting/wall art",
          "cadence": "Every 2 months",
          "standard": "Visible fingerprints, scuffs, splashes, smudges, and cobwebs are cleaned without damaging paint.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-139",
          "frequency": "Every 2 months",
          "title": "Vent fan",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-140",
          "frequency": "Quarterly",
          "title": "Walls",
          "cadence": "Quarterly / as needed",
          "standard": "Visible fingerprints, scuffs, splashes, smudges, and cobwebs are cleaned without damaging paint.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-141",
          "frequency": "As needed / product schedule",
          "title": "Refill wax melt",
          "cadence": "As needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-142",
          "frequency": "As needed / product schedule",
          "title": "Replace toilet paper roll",
          "cadence": "As needed",
          "standard": "Toilet bowl, seat, lid, hinges, handle, base, exterior, and surrounding splashes are cleaned.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-143",
          "frequency": "As needed / product schedule",
          "title": "Replace/refill soap",
          "cadence": "As needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        }
      ]
    },
    {
      "id": "section-11",
      "name": "Stairs",
      "tasks": [
        {
          "id": "task-144",
          "frequency": "Weekly",
          "title": "Vacuum stairs",
          "cadence": "Weekly",
          "standard": "Floor or item is picked up enough to clean; visible dust, hair, debris, and missed edges are addressed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-145",
          "frequency": "Monthly",
          "title": "Boards/baseboards/trim",
          "cadence": "About every 4 weeks / as needed",
          "standard": "Visible dust, hair, and grime are wiped from trim, edges, rails, and corners.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-146",
          "frequency": "Monthly",
          "title": "Shelf and items on shelf",
          "cadence": "Monthly",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-147",
          "frequency": "Monthly",
          "title": "Railings",
          "cadence": "Monthly / as needed",
          "standard": "Visible dust, hair, and grime are wiped from trim, edges, rails, and corners.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-148",
          "frequency": "Every 2 months",
          "title": "Lights",
          "cadence": "Every 2 months",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-149",
          "frequency": "Quarterly",
          "title": "Walls",
          "cadence": "Quarterly / as needed",
          "standard": "Visible fingerprints, scuffs, splashes, smudges, and cobwebs are cleaned without damaging paint.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        }
      ]
    },
    {
      "id": "section-12",
      "name": "Upstairs Hallway",
      "tasks": [
        {
          "id": "task-150",
          "frequency": "Weekly",
          "title": "Vacuum hallway",
          "cadence": "Weekly / as needed",
          "standard": "Floor or item is picked up enough to clean; visible dust, hair, debris, and missed edges are addressed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-151",
          "frequency": "Monthly",
          "title": "Baseboards",
          "cadence": "About every 4 weeks / as needed",
          "standard": "Visible dust, hair, and grime are wiped from trim, edges, rails, and corners.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-152",
          "frequency": "Every 2 months",
          "title": "Intake vent/return",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-153",
          "frequency": "Every 2 months",
          "title": "Light fixture",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-154",
          "frequency": "Quarterly",
          "title": "Walls",
          "cadence": "Quarterly / as needed",
          "standard": "Visible fingerprints, scuffs, splashes, smudges, and cobwebs are cleaned without damaging paint.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        }
      ]
    },
    {
      "id": "section-13",
      "name": "Upstairs Hall Closet",
      "tasks": [
        {
          "id": "task-155",
          "frequency": "Weekly",
          "title": "Organize/replenish towels, bedding, and linens",
          "cadence": "Regularly / as needed",
          "standard": "Towels, bedding, and linens are folded, sorted, and replenished; obvious clutter or misplaced items are handled.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-156",
          "frequency": "Weekly",
          "title": "Vacuum closet floor",
          "cadence": "When closet is cleaned / as needed",
          "standard": "Floor or item is picked up enough to clean; visible dust, hair, debris, and missed edges are addressed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        }
      ]
    },
    {
      "id": "section-14",
      "name": "Upstairs Bathroom",
      "tasks": [
        {
          "id": "task-157",
          "frequency": "Weekly",
          "title": "Bathroom floor",
          "cadence": "Every bathroom clean / at least weekly",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Ephraim (assigned; Kimberly currently reminds/follows up)"
        },
        {
          "id": "task-158",
          "frequency": "Weekly",
          "title": "Mirror",
          "cadence": "Weekly",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Ephraim (assigned; Kimberly currently reminds/follows up)"
        },
        {
          "id": "task-159",
          "frequency": "Weekly",
          "title": "Toilet",
          "cadence": "Weekly",
          "standard": "Toilet bowl, seat, lid, hinges, handle, base, exterior, and surrounding splashes are cleaned.",
          "sourceNote": "",
          "currentOwner": "Ephraim (assigned; Kimberly currently reminds/follows up)"
        },
        {
          "id": "task-160",
          "frequency": "Weekly",
          "title": "Vanity top/front, sink, and faucet",
          "cadence": "Weekly",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Ephraim (assigned; Kimberly currently reminds/follows up)"
        },
        {
          "id": "task-161",
          "frequency": "Weekly",
          "title": "Empty trash",
          "cadence": "Weekly / as needed",
          "standard": "Trash is removed before overflowing or smelling; liner is replaced if used; bag goes to proper larger container.",
          "sourceNote": "",
          "currentOwner": "Ephraim (assigned; Kimberly currently reminds/follows up)"
        },
        {
          "id": "task-162",
          "frequency": "Weekly",
          "title": "Tub/shower",
          "cadence": "Weekly / as needed",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Ephraim (assigned; Kimberly currently reminds/follows up)"
        },
        {
          "id": "task-163",
          "frequency": "Weekly",
          "title": "Replace hand towel",
          "cadence": "Weekly / sooner if dirty",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Ephraim (assigned; Kimberly currently reminds/follows up)"
        },
        {
          "id": "task-164",
          "frequency": "Monthly",
          "title": "Baseboards",
          "cadence": "About every 4 weeks / as needed",
          "standard": "Visible dust, hair, and grime are wiped from trim, edges, rails, and corners.",
          "sourceNote": "",
          "currentOwner": "Ephraim (assigned; Kimberly currently reminds/follows up)"
        },
        {
          "id": "task-165",
          "frequency": "Monthly",
          "title": "Assess/reorder bathroom products",
          "cadence": "Monthly / as needed",
          "standard": "Needed supplies are checked early, added to the correct list, ordered, replaced, or restocked before they become urgent.",
          "sourceNote": "",
          "currentOwner": "Ephraim (assigned; Kimberly currently reminds/follows up)"
        },
        {
          "id": "task-166",
          "frequency": "Monthly",
          "title": "Door",
          "cadence": "Monthly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Ephraim (assigned; Kimberly currently reminds/follows up)"
        },
        {
          "id": "task-167",
          "frequency": "Monthly",
          "title": "Shower curtain and liner",
          "cadence": "Monthly / as needed",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Ephraim (assigned; Kimberly currently reminds/follows up)"
        },
        {
          "id": "task-168",
          "frequency": "Monthly",
          "title": "Wash trash can",
          "cadence": "Monthly / as needed",
          "standard": "Trash is removed before overflowing or smelling; liner is replaced if used; bag goes to proper larger container.",
          "sourceNote": "",
          "currentOwner": "Ephraim (assigned; Kimberly currently reminds/follows up)"
        },
        {
          "id": "task-169",
          "frequency": "Every 2 months",
          "title": "Vent fan",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Ephraim (assigned; Kimberly currently reminds/follows up)"
        },
        {
          "id": "task-170",
          "frequency": "Quarterly",
          "title": "Walls",
          "cadence": "Quarterly / as needed",
          "standard": "Visible fingerprints, scuffs, splashes, smudges, and cobwebs are cleaned without damaging paint.",
          "sourceNote": "",
          "currentOwner": "Ephraim (assigned; Kimberly currently reminds/follows up)"
        },
        {
          "id": "task-171",
          "frequency": "As needed / product schedule",
          "title": "Replace toilet paper roll",
          "cadence": "As needed",
          "standard": "Toilet bowl, seat, lid, hinges, handle, base, exterior, and surrounding splashes are cleaned.",
          "sourceNote": "",
          "currentOwner": "Ephraim (assigned; Kimberly currently reminds/follows up)"
        },
        {
          "id": "task-172",
          "frequency": "As needed / product schedule",
          "title": "Replace/refill soap",
          "cadence": "As needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Ephraim (assigned; Kimberly currently reminds/follows up)"
        }
      ]
    },
    {
      "id": "section-15",
      "name": "Master Bedroom",
      "tasks": [
        {
          "id": "task-173",
          "frequency": "2-3x per week",
          "title": "Robot vacuum master bedroom",
          "cadence": "2-3x/week / as needed",
          "standard": "Floor or item is picked up enough to clean; visible dust, hair, debris, and missed edges are addressed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-174",
          "frequency": "Weekly",
          "title": "Desk",
          "cadence": "Weekly",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-175",
          "frequency": "Weekly",
          "title": "Dust black shelf",
          "cadence": "Weekly",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-176",
          "frequency": "Weekly",
          "title": "Dust bookshelf",
          "cadence": "Weekly",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-177",
          "frequency": "Weekly",
          "title": "Dust dresser",
          "cadence": "Weekly",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-178",
          "frequency": "Weekly",
          "title": "Dust nightstands",
          "cadence": "Weekly",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-179",
          "frequency": "Weekly",
          "title": "Hair shelf",
          "cadence": "Weekly",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-180",
          "frequency": "Weekly",
          "title": "General room reset/tidy",
          "cadence": "Weekly / as needed",
          "standard": "Items are returned to useful homes; trash/donations/misplaced items are removed; area is usable again.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-181",
          "frequency": "Weekly",
          "title": "Kimberly + Michael laundry",
          "cadence": "Weekly / as needed",
          "standard": "Laundry is moved through wash/dry/put-away stage according to the current household reality and the owner note.",
          "sourceNote": "",
          "currentOwner": "Kimberly (wash/dry) + Michael (hang up / put away clean Kimberly + Michael laundry)"
        },
        {
          "id": "task-182",
          "frequency": "Weekly",
          "title": "Crystal shelf",
          "cadence": "Weekly / every 2 weeks",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-183",
          "frequency": "Every 2-3 weeks",
          "title": "Bedding",
          "cadence": "Every 2 weeks / sooner if needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-184",
          "frequency": "Monthly",
          "title": "Baseboards",
          "cadence": "About every 4 weeks / as needed",
          "standard": "Visible dust, hair, and grime are wiped from trim, edges, rails, and corners.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-185",
          "frequency": "Monthly",
          "title": "Mirrors",
          "cadence": "About every 4 weeks / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-186",
          "frequency": "Monthly",
          "title": "Amp",
          "cadence": "Monthly",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-187",
          "frequency": "Monthly",
          "title": "Bed railings/frame",
          "cadence": "Monthly",
          "standard": "Visible dust, hair, and grime are wiped from trim, edges, rails, and corners.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-188",
          "frequency": "Monthly",
          "title": "Under bed",
          "cadence": "Monthly",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-189",
          "frequency": "Monthly",
          "title": "Assess/reorder makeup, hair, and personal products",
          "cadence": "Monthly / as needed",
          "standard": "Needed supplies are checked early, added to the correct list, ordered, replaced, or restocked before they become urgent.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-190",
          "frequency": "Monthly",
          "title": "Door",
          "cadence": "Monthly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-191",
          "frequency": "Monthly",
          "title": "Organize needed areas",
          "cadence": "Monthly / as needed",
          "standard": "Items are returned to useful homes; trash/donations/misplaced items are removed; area is usable again.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-192",
          "frequency": "Monthly",
          "title": "Portable fan",
          "cadence": "Monthly / sooner if rabbit fur builds up",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-193",
          "frequency": "Every 2 months",
          "title": "Ceiling fan",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-194",
          "frequency": "Every 2 months",
          "title": "Light fixture",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-195",
          "frequency": "Every 2 months",
          "title": "Pictures/wall hangings",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-196",
          "frequency": "Every 2 months",
          "title": "Vents",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-197",
          "frequency": "Quarterly",
          "title": "Throw/decorative pillows",
          "cadence": "Quarterly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-198",
          "frequency": "Quarterly",
          "title": "Walls",
          "cadence": "Quarterly / as needed",
          "standard": "Visible fingerprints, scuffs, splashes, smudges, and cobwebs are cleaned without damaging paint.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-199",
          "frequency": "Quarterly",
          "title": "Windows",
          "cadence": "Quarterly / as needed",
          "standard": "Glass, sill, trim, and accessible tracks are cleaned; fingerprints, dust, cobwebs, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-200",
          "frequency": "Seasonal / annual",
          "title": "Blinds",
          "cadence": "2x/year / as needed",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-201",
          "frequency": "Seasonal / annual",
          "title": "Mattress rotation/refreshing routine",
          "cadence": "Annually",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        }
      ]
    },
    {
      "id": "section-16",
      "name": "Master Bathroom",
      "tasks": [
        {
          "id": "task-202",
          "frequency": "2-3x per week",
          "title": "Master-bath floor/robot vacuum",
          "cadence": "2-3x/week / as needed",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-203",
          "frequency": "Weekly",
          "title": "Master-bath floor mop",
          "cadence": "Weekly",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-204",
          "frequency": "Weekly",
          "title": "Mirror",
          "cadence": "Weekly",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-205",
          "frequency": "Weekly",
          "title": "Counters, sinks, and faucets",
          "cadence": "Weekly / as needed",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Michael (assigned) + Kimberly (often completes when needed)"
        },
        {
          "id": "task-206",
          "frequency": "Weekly",
          "title": "Tub/shower",
          "cadence": "Weekly / as needed",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-207",
          "frequency": "Weekly",
          "title": "Replace hand towel",
          "cadence": "Weekly / sooner if dirty",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-208",
          "frequency": "Weekly",
          "title": "Toilet room",
          "cadence": "Weekly standard",
          "standard": "Toilet bowl, seat, lid, hinges, handle, base, exterior, and surrounding splashes are cleaned.",
          "sourceNote": "",
          "currentOwner": "Michael"
        },
        {
          "id": "task-209",
          "frequency": "Every 2-3 weeks",
          "title": "Wash shower rug",
          "cadence": "Every 2 weeks / sooner if dirty",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-210",
          "frequency": "Monthly",
          "title": "Assess/reorder shower, teeth, and personal-care items",
          "cadence": "Monthly / as needed",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-211",
          "frequency": "Monthly",
          "title": "Bathroom closet",
          "cadence": "Monthly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Michael"
        },
        {
          "id": "task-212",
          "frequency": "Monthly",
          "title": "Cabinet exteriors",
          "cadence": "Monthly / as needed",
          "standard": "Seasonal or visible outdoor needs are handled, scheduled, or added to the maintenance list.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-213",
          "frequency": "Monthly",
          "title": "Doors",
          "cadence": "Monthly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-214",
          "frequency": "Monthly",
          "title": "Shower curtain and liner",
          "cadence": "Monthly / as needed",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-215",
          "frequency": "Every 2 months",
          "title": "Vents",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-216",
          "frequency": "Quarterly",
          "title": "Cabinet/drawer interiors",
          "cadence": "Quarterly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-217",
          "frequency": "Quarterly",
          "title": "Descale faucets/fixtures",
          "cadence": "Quarterly / as needed",
          "standard": "Bathroom surfaces are cleaned to a sanitary usable condition; hair, toothpaste, residue, odors, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-218",
          "frequency": "Quarterly",
          "title": "Walls",
          "cadence": "Quarterly / as needed",
          "standard": "Visible fingerprints, scuffs, splashes, smudges, and cobwebs are cleaned without damaging paint.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-219",
          "frequency": "As needed / product schedule",
          "title": "Dehumidifier",
          "cadence": "Empty and restart as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        }
      ]
    },
    {
      "id": "section-17",
      "name": "Michael's Office",
      "tasks": [
        {
          "id": "task-220",
          "frequency": "Weekly",
          "title": "Clean office floor",
          "cadence": "Weekly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "No consistent current owner"
        },
        {
          "id": "task-221",
          "frequency": "Monthly",
          "title": "Dust office surfaces",
          "cadence": "Monthly / periodically",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "No consistent current owner"
        },
        {
          "id": "task-222",
          "frequency": "As needed / product schedule",
          "title": "Fish tank care",
          "cadence": "According to established tank schedule",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Michael"
        }
      ]
    },
    {
      "id": "section-18",
      "name": "Kids' bedrooms - each room",
      "tasks": [
        {
          "id": "task-223",
          "frequency": "Weekly",
          "title": "Kids' laundry",
          "cadence": "Weekly / as needed",
          "standard": "Laundry is moved through wash/dry/put-away stage according to the current household reality and the owner note.",
          "sourceNote": "",
          "currentOwner": "Kimberly (wash/dry for Oliver + Ephraim) + Brighton (own laundry) + Oliver/Ephraim expected to put away their own clean clothes, but not consistently doing so yet"
        },
        {
          "id": "task-224",
          "frequency": "Weekly",
          "title": "Room reset/tidy",
          "cadence": "Weekly / as needed",
          "standard": "Items are returned to useful homes; trash/donations/misplaced items are removed; area is usable again.",
          "sourceNote": "",
          "currentOwner": "Each child (Kimberly currently reminds/follows up)"
        },
        {
          "id": "task-225",
          "frequency": "Weekly",
          "title": "Vacuum carpet",
          "cadence": "Weekly / as needed",
          "standard": "Floor or item is picked up enough to clean; visible dust, hair, debris, and missed edges are addressed.",
          "sourceNote": "",
          "currentOwner": "Each child (Kimberly currently reminds/follows up)"
        },
        {
          "id": "task-226",
          "frequency": "Weekly",
          "title": "Dust furniture/shelves/desks/nightstands",
          "cadence": "Weekly / every 2 weeks",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Each child for routine room cleaning; Kimberly for deeper follow-up as needed"
        },
        {
          "id": "task-227",
          "frequency": "Every 2-3 weeks",
          "title": "Kids' bedding wash/change",
          "cadence": "Every 2 weeks / sooner if needed",
          "standard": "Kids' bedding is removed, washed, dried, and put back or replaced often enough to stay clean and usable.",
          "sourceNote": "Currently Kimberly.",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-228",
          "frequency": "Monthly",
          "title": "Baseboards",
          "cadence": "About every 4 weeks / as needed",
          "standard": "Visible dust, hair, and grime are wiped from trim, edges, rails, and corners.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-229",
          "frequency": "Monthly",
          "title": "Mirrors",
          "cadence": "About every 4 weeks / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-230",
          "frequency": "Monthly",
          "title": "Under bed",
          "cadence": "Monthly",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-231",
          "frequency": "Monthly",
          "title": "Assess/reorder personal-care products",
          "cadence": "Monthly / as needed",
          "standard": "Needed supplies are checked early, added to the correct list, ordered, replaced, or restocked before they become urgent.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-232",
          "frequency": "Monthly",
          "title": "Door",
          "cadence": "Monthly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-233",
          "frequency": "Monthly",
          "title": "Organize needed areas",
          "cadence": "Monthly / as needed",
          "standard": "Items are returned to useful homes; trash/donations/misplaced items are removed; area is usable again.",
          "sourceNote": "",
          "currentOwner": "Kimberly + each child"
        },
        {
          "id": "task-234",
          "frequency": "Every 2 months",
          "title": "Light fixture",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-235",
          "frequency": "Every 2 months",
          "title": "Pictures/wall hangings",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-236",
          "frequency": "Every 2 months",
          "title": "Vents",
          "cadence": "Every 2 months",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-237",
          "frequency": "Every 2 months",
          "title": "Fan",
          "cadence": "Every 2 months, if applicable",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-238",
          "frequency": "Quarterly",
          "title": "Throw/decorative pillows and washable soft items",
          "cadence": "Quarterly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-239",
          "frequency": "Quarterly",
          "title": "Walls",
          "cadence": "Quarterly / as needed",
          "standard": "Visible fingerprints, scuffs, splashes, smudges, and cobwebs are cleaned without damaging paint.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-240",
          "frequency": "Quarterly",
          "title": "Windows",
          "cadence": "Quarterly / as needed",
          "standard": "Glass, sill, trim, and accessible tracks are cleaned; fingerprints, dust, cobwebs, and visible grime are removed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-241",
          "frequency": "Seasonal / annual",
          "title": "Blinds",
          "cadence": "2x/year / as needed",
          "standard": "Visible dust, cobwebs, buildup, fingerprints, or grime are removed without damaging the item.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        }
      ]
    },
    {
      "id": "section-19",
      "name": "Garage",
      "tasks": [
        {
          "id": "task-242",
          "frequency": "Quarterly",
          "title": "Clean-out and organization",
          "cadence": "Quarterly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "Michael usually cleans the garage.",
          "currentOwner": "Michael"
        }
      ]
    },
    {
      "id": "section-20",
      "name": "Whole-House / Shared Cleaning",
      "tasks": [
        {
          "id": "task-243",
          "frequency": "Immediate / after use",
          "title": "Spills, stains, and pet messes",
          "cadence": "Immediately / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Person responsible / person who discovers an urgent mess"
        },
        {
          "id": "task-244",
          "frequency": "Daily / nightly",
          "title": "Nightly downstairs robot vacuum",
          "cadence": "Nightly",
          "standard": "Floor or item is picked up enough to clean; visible dust, hair, debris, and missed edges are addressed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-245",
          "frequency": "Weekly",
          "title": "Main trash and recycling cans to curb",
          "cadence": "Weekly",
          "standard": "Main household trash and recycling cans are taken to the curb or correct pickup location on schedule, and cans are returned after pickup when appropriate.",
          "sourceNote": "",
          "currentOwner": "Kimberly or Michael"
        },
        {
          "id": "task-246",
          "frequency": "Weekly",
          "title": "Mop entire downstairs",
          "cadence": "Weekly",
          "standard": "Hard floor is mopped; sticky spots, pet residue, visible grime, and edges are addressed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-247",
          "frequency": "Weekly",
          "title": "Robot-missed floor areas",
          "cadence": "Weekly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-248",
          "frequency": "Weekly",
          "title": "Smaller household trash cans",
          "cadence": "Weekly / as needed",
          "standard": "Trash is removed before overflowing or smelling; liner is replaced if used; bag goes to proper larger container.",
          "sourceNote": "",
          "currentOwner": "Kimberly / room owner where assigned"
        },
        {
          "id": "task-249",
          "frequency": "Weekly",
          "title": "Pet food/water bowls not otherwise listed",
          "cadence": "Weekly deep clean",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-250",
          "frequency": "Monthly",
          "title": "Household mirrors/glass not otherwise listed",
          "cadence": "About every 4 weeks",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-251",
          "frequency": "Monthly",
          "title": "General high-touch spots",
          "cadence": "About every 4 weeks / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-252",
          "frequency": "Monthly",
          "title": "One neglected/trouble spot",
          "cadence": "Monthly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-253",
          "frequency": "Every 2 months",
          "title": "Other small house rugs/mats not listed by room",
          "cadence": "Every 2 months / sooner if dirty",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-254",
          "frequency": "Seasonal / annual",
          "title": "Closet seasonal reset",
          "cadence": "Seasonally / as needed",
          "standard": "Items are returned to useful homes; trash/donations/misplaced items are removed; area is usable again.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        }
      ]
    },
    {
      "id": "section-21",
      "name": "Household Administration",
      "tasks": [
        {
          "id": "task-255",
          "frequency": "Weekly",
          "title": "Grocery list",
          "cadence": "Before each shopping trip",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "Ingredients, staples, household supplies, requested/needed items.",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-256",
          "frequency": "Weekly",
          "title": "Mail/paperwork sorting and dealing with",
          "cadence": "Weekly",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly (collects/sorts) + Michael (processes routed mail)"
        },
        {
          "id": "task-257",
          "frequency": "Weekly",
          "title": "School review",
          "cadence": "Weekly",
          "standard": "Dashboards and Mighty are checked; assignments, messages, missing work, projects, and deadlines are reviewed; kids are reminded/followed up with; coaches are contacted as needed.",
          "sourceNote": "Deeper look-ahead beyond daily dashboard checks.",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-258",
          "frequency": "Weekly",
          "title": "Weekly calendar review",
          "cadence": "Weekly",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "Appointments, school, activities, training, family obligations, travel, and changes.",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-259",
          "frequency": "Weekly",
          "title": "Household inventory check",
          "cadence": "Weekly / before shopping",
          "standard": "Needed supplies are checked early, added to the correct list, ordered, replaced, or restocked before they become urgent.",
          "sourceNote": "Food, cleaning, paper, personal-care, seasonal and household supplies.",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-260",
          "frequency": "Weekly",
          "title": "Menu planning",
          "cadence": "Weekly / before shopping cycle",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "Accounts for grocery nights, busy evenings, leftovers, frozen/easy meals.",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-261",
          "frequency": "Monthly",
          "title": "Medication/supplement inventory and expiration check",
          "cadence": "Monthly",
          "standard": "Needed supplies are checked early, added to the correct list, ordered, replaced, or restocked before they become urgent.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-262",
          "frequency": "Monthly",
          "title": "Subscriptions / recurring household orders review",
          "cadence": "Monthly",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-263",
          "frequency": "Seasonal / annual",
          "title": "Equinox and solstice celebrations",
          "cadence": "4x/year",
          "standard": "Planning, supplies, gifts, food, activities, and behind-the-scenes preparation are handled at the desired family level.",
          "sourceNote": "Spring equinox, summer solstice, autumn equinox, winter solstice.",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-264",
          "frequency": "Seasonal / annual",
          "title": "Holiday planning, cooking, shopping, and family magic",
          "cadence": "According to holiday calendar",
          "standard": "Dinner is prepared, reheated, ordered, or intentionally provided according to the day's plan.",
          "sourceNote": "Traditions, gifts, ordering, cooking/baking, décor, activities, behind-the-scenes prep.",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-265",
          "frequency": "Seasonal / annual",
          "title": "Back-to-school celebration",
          "cadence": "Annually before school begins",
          "standard": "Dashboards and Mighty are checked; assignments, messages, missing work, projects, and deadlines are reviewed; kids are reminded/followed up with; coaches are contacted as needed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-266",
          "frequency": "Seasonal / annual",
          "title": "Seasonal household purchasing and readiness",
          "cadence": "Seasonally / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "Winter gear, pool items, wasp traps March-August, mosquito/tick sprays/treatments, masks, seasonal supplements.",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-267",
          "frequency": "Seasonal / annual",
          "title": "Seasonal kids' clothing 'fashion show'",
          "cadence": "Spring and fall",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "Kids try on prior-season clothing; donate/trash outgrown items; identify and order weather needs.",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-268",
          "frequency": "As needed / product schedule",
          "title": "Household birthday planning and celebration",
          "cadence": "For each birthday",
          "standard": "Planning, supplies, gifts, food, activities, and behind-the-scenes preparation are handled at the desired family level.",
          "sourceNote": "Planning, cooking, ordering, gifts, supplies, traditions.",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-269",
          "frequency": "As needed / product schedule",
          "title": "Extended-family occasions and gift management",
          "cadence": "Ongoing / annual calendar",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "Birthdays, Mother's Day, Father's Day, holiday gifts/orders for family outside the home.",
          "currentOwner": "Kimberly"
        }
      ]
    },
    {
      "id": "section-22",
      "name": "Pets - Supplies / Appointments / Health",
      "tasks": [
        {
          "id": "task-270",
          "frequency": "Monthly",
          "title": "Pet food/medication/tablet supply review",
          "cadence": "Monthly / as needed",
          "standard": "Needed supplies are checked early, added to the correct list, ordered, replaced, or restocked before they become urgent.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-271",
          "frequency": "Quarterly",
          "title": "Pet supplies/appointments review",
          "cadence": "Quarterly and ahead of known due dates",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-272",
          "frequency": "Trigger-based",
          "title": "Pet health concern",
          "cadence": "Trigger-based",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly + relevant pet owner"
        }
      ]
    },
    {
      "id": "section-23",
      "name": "Home, Safety & Equipment Maintenance",
      "tasks": [
        {
          "id": "task-273",
          "frequency": "Weekly",
          "title": "Maintenance/repair list review",
          "cadence": "Weekly",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly (tracks/notices) + Michael (repair/action)"
        },
        {
          "id": "task-274",
          "frequency": "Monthly",
          "title": "Longer-term maintenance/repair review",
          "cadence": "Monthly",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly (tracks/notices) + Michael (repair/action)"
        },
        {
          "id": "task-275",
          "frequency": "Monthly",
          "title": "Robot vacuum deeper maintenance/parts check",
          "cadence": "Monthly",
          "standard": "Floor or item is picked up enough to clean; visible dust, hair, debris, and missed edges are addressed.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-276",
          "frequency": "Monthly",
          "title": "Smoke/carbon monoxide alarm checks",
          "cadence": "Monthly",
          "standard": "Safety/system check is completed; problems are addressed promptly or added to the maintenance list.",
          "sourceNote": "",
          "currentOwner": "No consistent current owner"
        },
        {
          "id": "task-277",
          "frequency": "Seasonal / annual",
          "title": "Fire extinguisher check",
          "cadence": "Annually",
          "standard": "Safety/system check is completed; problems are addressed promptly or added to the maintenance list.",
          "sourceNote": "",
          "currentOwner": "No consistent current owner"
        },
        {
          "id": "task-278",
          "frequency": "Seasonal / annual",
          "title": "Water-heater check and maintenance",
          "cadence": "Annually / as due / as needed",
          "standard": "Safety/system check is completed; problems are addressed promptly or added to the maintenance list.",
          "sourceNote": "",
          "currentOwner": "No consistent current owner"
        },
        {
          "id": "task-279",
          "frequency": "Seasonal / annual",
          "title": "A/C and HVAC checks",
          "cadence": "Seasonally / according to filter and service schedule",
          "standard": "Safety/system check is completed; problems are addressed promptly or added to the maintenance list.",
          "sourceNote": "",
          "currentOwner": "No consistent current owner"
        }
      ]
    },
    {
      "id": "section-24",
      "name": "Vehicle & Exterior House Care",
      "tasks": [
        {
          "id": "task-280",
          "frequency": "Monthly",
          "title": "Clean vehicle interiors",
          "cadence": "Monthly / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly for her car; no consistent owner for other vehicles"
        },
        {
          "id": "task-281",
          "frequency": "Seasonal / annual",
          "title": "Gutters + exterior house checks and maintenance",
          "cadence": "Spring and fall / after major storms / as needed",
          "standard": "Seasonal or visible outdoor needs are handled, scheduled, or added to the maintenance list.",
          "sourceNote": "",
          "currentOwner": "No consistent current owner"
        },
        {
          "id": "task-282",
          "frequency": "As needed / product schedule",
          "title": "Car maintenance",
          "cadence": "According to vehicle maintenance schedule / as needed",
          "standard": "Oil changes, tire rotations, inspections, registration/renewal-related needs, repairs, fluids, warning lights, recalls, and other vehicle maintenance are tracked and handled or scheduled before they become urgent when possible.",
          "sourceNote": "",
          "currentOwner": "Michael"
        }
      ]
    },
    {
      "id": "section-25",
      "name": "Outdoor / Seasonal Household Work",
      "tasks": [
        {
          "id": "task-283",
          "frequency": "Seasonal / annual",
          "title": "Front door/porch/exterior entry cleanup",
          "cadence": "Once per season / as needed",
          "standard": "Seasonal or visible outdoor needs are handled, scheduled, or added to the maintenance list.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-284",
          "frequency": "Seasonal / annual",
          "title": "Garden/yard seasonal tasks",
          "cadence": "Seasonal",
          "standard": "Seasonal or visible outdoor needs are handled, scheduled, or added to the maintenance list.",
          "sourceNote": "Michael usually handles garden/yard seasonal work.",
          "currentOwner": "Michael"
        },
        {
          "id": "task-285",
          "frequency": "Seasonal / annual",
          "title": "Pool seasonal maintenance",
          "cadence": "Seasonal",
          "standard": "Seasonal or visible outdoor needs are handled, scheduled, or added to the maintenance list.",
          "sourceNote": "",
          "currentOwner": "No consistent current owner"
        },
        {
          "id": "task-286",
          "frequency": "Seasonal / annual",
          "title": "Outdoor furniture/patio cleanup",
          "cadence": "Seasonal / as needed",
          "standard": "Task is completed to the House Manual standard; area is usable, clean, and reset enough for normal household use.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-287",
          "frequency": "Seasonal / annual",
          "title": "Stored seasonal items reset",
          "cadence": "Seasonal / as needed",
          "standard": "Items are returned to useful homes; trash/donations/misplaced items are removed; area is usable again.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-288",
          "frequency": "As needed / product schedule",
          "title": "Front-yard routine work",
          "cadence": "As needed",
          "standard": "Seasonal or visible outdoor needs are handled, scheduled, or added to the maintenance list.",
          "sourceNote": "Michael usually handles front-yard routine work.",
          "currentOwner": "Michael"
        },
        {
          "id": "task-289",
          "frequency": "As needed / product schedule",
          "title": "Garden watering",
          "cadence": "As needed / seasonal",
          "standard": "Seasonal or visible outdoor needs are handled, scheduled, or added to the maintenance list.",
          "sourceNote": "",
          "currentOwner": "No consistent current owner"
        },
        {
          "id": "task-290",
          "frequency": "As needed / product schedule",
          "title": "Yard work",
          "cadence": "As needed plus seasonal",
          "standard": "Seasonal or visible outdoor needs are handled, scheduled, or added to the maintenance list.",
          "sourceNote": "Michael usually does yard work.",
          "currentOwner": "Michael"
        }
      ]
    },
    {
      "id": "section-26",
      "name": "As Needed / Trigger-Based",
      "tasks": [
        {
          "id": "task-291",
          "frequency": "Trigger-based",
          "title": "Pantry/fridge becomes visibly messy",
          "cadence": "Trigger-based",
          "standard": "Immediate issue is handled enough to prevent worsening; follow-up is assigned or logged.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-292",
          "frequency": "Trigger-based",
          "title": "Robot part wears out",
          "cadence": "Trigger-based",
          "standard": "Immediate issue is handled enough to prevent worsening; follow-up is assigned or logged.",
          "sourceNote": "",
          "currentOwner": "Kimberly"
        },
        {
          "id": "task-293",
          "frequency": "Trigger-based",
          "title": "Something breaks",
          "cadence": "Trigger-based",
          "standard": "Immediate issue is handled enough to prevent worsening; follow-up is assigned or logged.",
          "sourceNote": "",
          "currentOwner": "No consistent current owner"
        },
        {
          "id": "task-294",
          "frequency": "Trigger-based",
          "title": "Supply runs low",
          "cadence": "Trigger-based",
          "standard": "Needed supplies are checked early, added to the correct list, ordered, replaced, or restocked before they become urgent.",
          "sourceNote": "Everyone should report low supplies, but Kimberly currently carries most of the noticing/reporting.",
          "currentOwner": "Kimberly currently notices/reports most low supplies; everyone should report needs they notice."
        },
        {
          "id": "task-295",
          "frequency": "Trigger-based",
          "title": "Trash is full",
          "cadence": "Trigger-based",
          "standard": "Trash is removed before overflowing or smelling; liner is replaced if used; bag goes to proper larger container.",
          "sourceNote": "",
          "currentOwner": "Whoever notices / area owner"
        }
      ]
    }
  ]
};
````

### .openai/hosting.json

````json
{
  "project_id": "appgprj_6aaef0ab55948191b063d62a437b12d8",
  "static": {
    "directory": "dist"
  }
}
````
