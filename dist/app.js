(() => {
  const data = window.HOUSE_MANUAL_DATA;
  const storageKey = 'house-manual-review-v1';
  // Everything that is not a per-task review record lives under its own key --
  // tasks added in the app, soft skills, awards, auto-assign preferences -- so
  // the review key keeps exactly the shape it has always had.
  const extrasKey = 'house-manual-extras-v1';
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

  // Every catalog task, including ones merged into another task. Merged tasks
  // are hidden from every view, but their saved review data is still read and
  // written so nothing recorded against them is lost.
  const catalogTasks = data.sections.flatMap(section => section.tasks);

  // What the views draw: catalog tasks that are not merged away, plus tasks
  // added in the app, per room. Rebuilt whenever a task is added or removed.
  let sections = [];
  let allTasks = [];
  const sectionByTask = new Map();
  let activeSection = data.sections[0].id;
  let currentView = 'home';

  // "Change" was removed from the decision control. Anything still carrying it
  // -- browser state from before the change, an older backup file, or the
  // agent tool -- is read as "keep". Dropping it to blank instead would
  // silently un-review those tasks.
  const decisions = new Set(['', 'keep', 'remove']);

  function normalizeDecision(value) {
    const decision = typeof value === 'string' ? value : '';
    if (decision === 'change') return 'keep';
    return decisions.has(decision) ? decision : '';
  }

  const backupFormat = 'house-manual-review-backup';
  const backupVersion = 2;

  // The household roster. `value` is what gets stored and what ownersFor()
  // groups by, so it has to match the names the catalog's owner text already
  // uses; `label` is only what the controls show. Storing "Kimberly" while
  // showing "Kim" keeps reassigned tasks in the same owner group as the ones
  // that resolve to her from the catalog.
  const ownerRoster = [
    { value: 'Kimberly', label: 'Kim' },
    { value: 'Michael', label: 'Michael' },
    { value: 'Brighton', label: 'Brighton' },
    { value: 'Oliver', label: 'Oliver' },
    { value: 'Ephraim', label: 'Ephraim' }
  ];
  const rosterNames = ownerRoster.map(owner => owner.value);

  // Everyone who can sign in. `id` is the person's first name and never
  // changes; admins can change the username and password. Until they do, the
  // username is first initial + family name and the password follows the
  // pattern the household agreed. Both come from dist/local-config.js, which
  // stays on this computer and out of git (copy local-config.example.js to
  // make one). Without it, default usernames are first names in lower case and
  // there are no default passwords. This is a household lock, not security:
  // with no server, the check runs in the page and the browser's developer
  // tools can see it. Real accounts come with the Phase 2 server build.
  const localConfig = window.HOUSE_MANUAL_LOCAL || {};
  const familyName = typeof localConfig.familyName === 'string' ? localConfig.familyName.trim().toLowerCase() : '';
  const users = ownerRoster.map(owner => ({ id: owner.value, name: owner.value, label: owner.label, defaultUsername: familyName ? `${owner.value[0].toLowerCase()}${familyName}` : owner.value.toLowerCase() }));
  const defaultAdmins = ['Michael', 'Kimberly'];
  const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,31}$/;
  const minPasswordLength = 8;

  // The default password: the local config's pattern with {name} replaced by
  // the person's first name, or none at all without a config.
  function defaultPasswordFor(user) {
    const pattern = typeof localConfig.passwordPattern === 'string' ? localConfig.passwordPattern : '';
    return pattern.includes('{name}') ? pattern.replaceAll('{name}', user.name) : pattern || null;
  }

  // A password an admin sets is stored only as a salted SHA-256 hash, so it is
  // never readable in this browser's storage or in a saved backup file. The
  // hash is computed here rather than with crypto.subtle, which only exists on
  // secure origins and is asynchronous.
  const sha256Constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function sha256(text) {
    const rotate = (value, bits) => (value >>> bits) | (value << (32 - bits));
    const bytes = new TextEncoder().encode(text);
    const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    const view = new DataView(padded.buffer);
    const bits = bytes.length * 8;
    view.setUint32(padded.length - 8, Math.floor(bits / 0x100000000));
    view.setUint32(padded.length - 4, bits >>> 0);
    let hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const w = new Uint32Array(64);
    for (let offset = 0; offset < padded.length; offset += 64) {
      for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rotate(w[i - 15], 7) ^ rotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotate(w[i - 2], 17) ^ rotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = hash;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + ((e & f) ^ (~e & g)) + sha256Constants[i] + w[i]) >>> 0;
        const t2 = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      hash = hash.map((value, i) => (value + [a, b, c, d, e, f, g, h][i]) >>> 0);
    }
    return hash.map(value => value.toString(16).padStart(8, '0')).join('');
  }

  function newSalt() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function passwordHash(salt, password) {
    return sha256(`${salt}:${password}`);
  }

  function usernameOf(user) {
    return extras.users.accounts[user.id]?.username || user.defaultUsername;
  }

  function hasCustomPassword(user) {
    const account = extras.users.accounts[user.id];
    return Boolean(account?.hash || account?.hasPassword);
  }

  function checkPassword(user, password) {
    const account = extras.users.accounts[user.id];
    if (account?.hash) return passwordHash(account.salt, password) === account.hash;
    const fallback = defaultPasswordFor(user);
    return fallback !== null && password === fallback;
  }

  // Hard assignment rule: master bedroom, master bathroom and Michael's office
  // only ever go to Michael or Kimberly. Every place an owner can be picked --
  // the room-by-room checkboxes, the add-task form, the assignment board and
  // auto-assign -- asks eligibleNames() first.
  const adultsOnlySections = new Set(['section-15', 'section-16', 'section-17']);
  const adultsOnlyRule = 'Master bedroom, master bathroom and office tasks go to Michael or Kim only.';

  let state = {};
  let extras = emptyExtras();
  let saveTimer;

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey)) || {};
      for (const record of Object.values(stored)) {
        if (record && typeof record === 'object') record.decision = normalizeDecision(record.decision);
      }
      return stored;
    }
    catch { return {}; }
  }

  function loadExtras() {
    try { return cleanExtras(JSON.parse(localStorage.getItem(extrasKey))); }
    catch { return emptyExtras(); }
  }

  function emptyExtras() {
    return { customTasks: [], parents: {}, standing: {}, standalone: {}, softSkills: [], skillOwners: {}, awardTypes: [], awardLog: [], autoPools: {}, calendar: { pins: {}, moves: {} }, completions: {}, users: { admins: [...defaultAdmins], lastLogin: {}, accounts: {} }, oneOffs: [], maturity: null, applied: [] };
  }

  function toPoints(value) {
    const number = Math.round(Number(value));
    return Number.isFinite(number) ? Math.min(Math.max(number, 0), 1000) : 0;
  }

  // Extras arrive from localStorage and from backup files, so every field is
  // checked and anything malformed is dropped rather than trusted.
  function cleanExtras(value) {
    const clean = emptyExtras();
    if (!value || typeof value !== 'object') return clean;
    const list = items => Array.isArray(items) ? items.filter(item => item && typeof item === 'object') : [];
    const text = item => typeof item === 'string' ? item : '';
    const rooms = new Set(data.sections.map(section => section.id));
    clean.customTasks = list(value.customTasks)
      .filter(task => text(task.id) && text(task.title).trim() && rooms.has(task.sectionId))
      .map(task => ({
        id: task.id,
        sectionId: task.sectionId,
        frequency: text(task.frequency) || frequencyForCadence(task.cadence),
        title: text(task.title).trim(),
        cadence: text(task.cadence).trim(),
        standard: text(task.standard),
        sourceNote: '',
        currentOwner: text(task.currentOwner),
        checklist: Array.isArray(task.checklist) ? task.checklist.filter(item => typeof item === 'string' && item.trim()) : [],
        effort: Number.isFinite(task.effort) && task.effort > 0 ? task.effort : null,
        parent: text(task.parent) || null,
        standing: task.standing === true,
        custom: true,
        createdAt: text(task.createdAt)
      }));
    // Existing chores pulled in as subtasks of another: { childId: parentId }.
    // (Catalog subtasks carry `parent` in data.js; chores added in the app carry
    // it on the task.) Links that no longer resolve are ignored when sections
    // are built.
    if (value.parents && typeof value.parents === 'object') {
      for (const [child, parent] of Object.entries(value.parents)) {
        if (typeof parent === 'string' && parent && parent !== child) clean.parents[child] = parent;
      }
    }
    // Standing items switched on or off in the app: { taskId: true | false },
    // overriding the catalog's `standing` (or a chore's lack of a cadence).
    if (value.standing && typeof value.standing === 'object') {
      for (const [id, on] of Object.entries(value.standing)) {
        if (typeof on === 'boolean') clean.standing[id] = on;
      }
    }
    // Subtasks made chores of their own in the room view: { taskId: true }.
    // They are never folded into a main chore again until moved back.
    if (value.standalone && typeof value.standalone === 'object') {
      for (const [id, on] of Object.entries(value.standalone)) {
        if (on === true) clean.standalone[id] = true;
      }
    }
    clean.softSkills = list(value.softSkills)
      .filter(skill => text(skill.id) && text(skill.title).trim())
      .map(skill => ({ id: skill.id, title: text(skill.title).trim(), description: text(skill.description), fromTask: text(skill.fromTask) || null }));
    if (value.skillOwners && typeof value.skillOwners === 'object') {
      for (const [id, owners] of Object.entries(value.skillOwners)) {
        if (Array.isArray(owners)) clean.skillOwners[id] = owners.filter(owner => typeof owner === 'string' && owner.trim());
      }
    }
    clean.awardTypes = list(value.awardTypes)
      .filter(award => text(award.id) && text(award.title).trim())
      .map(award => ({ id: award.id, title: text(award.title).trim(), points: toPoints(award.points), description: text(award.description), taskId: text(award.taskId) || null }));
    clean.awardLog = list(value.awardLog)
      .filter(entry => text(entry.id) && text(entry.person))
      .map(entry => ({ id: entry.id, typeId: text(entry.typeId) || null, title: text(entry.title), points: toPoints(entry.points), person: entry.person, at: text(entry.at) }));
    if (value.autoPools && typeof value.autoPools === 'object') {
      for (const board of ['chores', 'skills']) {
        if (Array.isArray(value.autoPools[board])) clean.autoPools[board] = value.autoPools[board].filter(isRosterName).map(rosterValue);
      }
    }
    // Calendar pins: { taskId: { seriesIndex: 'YYYY-MM-DD' } }, the date one
    // occurrence should fall on, which every other occurrence follows. Moves:
    // { taskId: { 'seriesIndex|YYYY-MM-DD': 'YYYY-MM-DD' } }, one occurrence
    // moved without changing the rest.
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;
    const calendar = value.calendar && typeof value.calendar === 'object' ? value.calendar : {};
    for (const [kind, keyPattern] of [['pins', /^\d+$/], ['moves', /^\d+\|\d{4}-\d{2}-\d{2}$/]]) {
      const source = calendar[kind] && typeof calendar[kind] === 'object' ? calendar[kind] : {};
      for (const [taskId, entries] of Object.entries(source)) {
        if (!entries || typeof entries !== 'object') continue;
        const kept = Object.fromEntries(Object.entries(entries).filter(([key, date]) => keyPattern.test(key) && typeof date === 'string' && isoDate.test(date)));
        if (Object.keys(kept).length) clean.calendar[kind][taskId] = kept;
      }
    }
    // Chores marked done: { 'taskId|part|YYYY-MM-DD': { by, at, on, title } }.
    // `part` is the series index, 'then' for a trigger chore's second step, or
    // 'standing' for a standing item (dated the day it was done);
    // the date is the day the occurrence was scheduled (for a second step, the
    // day it was triggered). `on` is the day it was marked done -- what Home
    // counts -- and `title` keeps the name in case the task is later deleted.
    const completions = value.completions && typeof value.completions === 'object' ? value.completions : {};
    for (const [key, entry] of Object.entries(completions)) {
      if (!/^[^|]+\|(\d+|then|standing)\|\d{4}-\d{2}-\d{2}(\|[A-Za-z]+)?$/.test(key) || !entry || typeof entry !== 'object') continue;
      if (!isoDate.test(text(entry.on)) || !text(entry.by).trim()) continue;
      clean.completions[key] = { by: entry.by, at: text(entry.at), on: entry.on, title: text(entry.title) };
    }
    // Who is an admin, when each person last signed in, and any username or
    // password an admin has set. Entries are keyed by the person's id; data
    // saved before usernames could change was keyed by the original username,
    // and is read either way. There is always at least one admin: a list
    // emptied by hand or by an old backup falls back to the defaults rather
    // than locking everyone out of the admin tabs.
    const idFor = name => users.find(user => user.id === name || user.defaultUsername === name)?.id || null;
    const people = value.users && typeof value.users === 'object' ? value.users : {};
    const admins = Array.isArray(people.admins) ? people.admins.map(idFor).filter(Boolean) : [];
    clean.users.admins = admins.length ? [...new Set(admins)] : [...defaultAdmins];
    if (people.lastLogin && typeof people.lastLogin === 'object') {
      for (const [name, at] of Object.entries(people.lastLogin)) {
        if (idFor(name) && typeof at === 'string') clean.users.lastLogin[idFor(name)] = at;
      }
    }
    const taken = new Set();
    const accounts = people.accounts && typeof people.accounts === 'object' ? people.accounts : {};
    for (const [name, account] of Object.entries(accounts)) {
      const id = idFor(name);
      if (!id || !account || typeof account !== 'object') continue;
      const kept = {};
      const username = text(account.username).trim().toLowerCase();
      if (usernamePattern.test(username) && !taken.has(username)) { kept.username = username; taken.add(username); }
      if (/^[0-9a-f]{32}$/.test(text(account.salt)) && /^[0-9a-f]{64}$/.test(text(account.hash))) { kept.salt = account.salt; kept.hash = account.hash; }
      if (text(account.changedAt)) kept.changedAt = account.changedAt;
      // From the home server: the hash stays there, and this says one is set.
      if (account.hasPassword === true) kept.hasPassword = true;
      if (kept.username || kept.hash || kept.hasPassword) clean.users.accounts[id] = kept;
    }
    // One-off tasks: on the given days for the given people, and nowhere else
    // -- never in a room, on a board or in a parking lot, and never repeating.
    clean.oneOffs = list(value.oneOffs)
      .filter(entry => text(entry.id) && text(entry.title).trim() && rooms.has(entry.sectionId))
      .map(entry => ({
        id: entry.id,
        sectionId: entry.sectionId,
        title: text(entry.title).trim(),
        standard: text(entry.standard),
        notes: text(entry.notes),
        owners: Array.isArray(entry.owners) ? [...new Set(entry.owners.filter(isRosterName).map(rosterValue))] : [],
        days: Array.isArray(entry.days) ? [...new Set(entry.days.filter(day => typeof day === 'string' && isoDate.test(day)))].sort() : [],
        effort: Number.isFinite(entry.effort) && entry.effort > 0 ? entry.effort : null,
        createdAt: text(entry.createdAt)
      }))
      .filter(entry => entry.owners.length && entry.days.length);
    // Maturity Marks cards, once seeded from maturity.js; null until then.
    clean.maturity = cleanMaturity(value.maturity);
    clean.applied = Array.isArray(value.applied) ? value.applied.filter(id => typeof id === 'string') : [];
    return clean;
  }

  // { sections: [{ id, title, cards: [{ id, title, people, items, chores }] }] }
  // where an item is { label, text, kind?, subitems? }. Anything malformed is
  // dropped; a section left with no cards goes too.
  function cleanMaturity(value) {
    if (!value || typeof value !== 'object' || !Array.isArray(value.sections)) return null;
    const text = item => typeof item === 'string' ? item : '';
    const item = entry => {
      const kept = { label: text(entry?.label).trim(), text: text(entry?.text).trim() };
      if (entry?.kind === 'need') kept.kind = 'need';
      const subitems = Array.isArray(entry?.subitems) ? entry.subitems.map(item).filter(sub => sub.label || sub.text) : [];
      if (subitems.length) kept.subitems = subitems;
      return kept;
    };
    const userIds = new Set(users.map(user => user.id));
    const sectionsKept = value.sections
      .filter(section => section && typeof section === 'object' && text(section.id) && Array.isArray(section.cards))
      .map(section => ({
        id: section.id,
        title: text(section.title).trim(),
        cards: section.cards
          .filter(card => card && typeof card === 'object' && text(card.id) && text(card.title).trim())
          .map(card => ({
            id: card.id,
            title: text(card.title).trim(),
            people: Array.isArray(card.people) ? card.people.filter(id => userIds.has(id)) : [],
            items: Array.isArray(card.items) ? card.items.map(item).filter(entry => entry.label || entry.text || entry.subitems) : [],
            chores: Array.isArray(card.chores) ? card.chores.filter(id => typeof id === 'string' && id) : []
          }))
      }))
      .filter(section => section.cards.length);
    return { sections: sectionsKept };
  }

  // Subtasks: a chore can hold other chores as subtasks. A subtask is not a
  // chore of its own -- it is left out of every list, board, calendar and
  // count, and shown only inside its main chore -- but its time is added to the
  // main chore's. One level only: a main chore can't itself be a subtask, and
  // a paid chore never is one: it always stays a chore of its own.
  const subtasksOf = new Map();
  const parentOf = new Map();

  // The weekly rule: in each room below, the unpaid chores that come round
  // weekly or every 2-3 weeks are one weekly chore -- one person, one day --
  // whenever there are at least two of them. Their parts that come every 2 or
  // 3 weeks are done on alternate weeks. Kids' bedrooms (each child does their
  // own) and the sections that aren't rooms are left out, as are trigger and
  // award chores. Because Paid is set in the app, the groups are worked out
  // afresh every time: mark a part Paid and it steps out on its own.
  const weeklyRoomSections = new Set([
    'section-2', 'section-3', 'section-4', 'section-5', 'section-6', 'section-7', 'section-8', 'section-9',
    'section-10', 'section-11', 'section-12', 'section-13', 'section-14', 'section-15', 'section-16',
    'section-17', 'section-19'
  ]);
  const weeklyChoreId = sectionId => `weekly-${sectionId}`;
  const weeklyChoreIds = [...weeklyRoomSections].map(weeklyChoreId);

  function comesWeekly(task) {
    const rate = calendarRate(task);
    return rate !== null && rate >= 1.3 && rate < 8;
  }

  // Standing items are done when they need doing, not on a set day: laundry
  // runs, restocking when something's low, the holidays. They are listed in
  // the Calendar's Standing Items, not on its days, and never folded into a
  // room's weekly chore. A chore with no regular cadence is always one; any
  // other can be switched in or out (the catalog's `standing` is the default).
  function hasNoCadence(task) {
    return calendarRate(task) === null;
  }

  function isStanding(task) {
    // A one-off has no cadence either, but it sits on its own days.
    if (task.oneOff) return false;
    if (hasNoCadence(task)) return true;
    return extras.standing[task.id] ?? task.standing === true;
  }

  // Whether a chore, on its own merits, belongs in its room's weekly chore:
  // unpaid, not standing, comes weekly or every 2-3 weeks, and isn't a
  // trigger or award chore. (Being made a chore of its own, or being linked
  // to another main chore, is checked separately.) Linked explicitly to the
  // weekly chore, a paid or standing chore still never joins it.
  function fitsWeeklyRule(task) {
    return taskState(task.id).paid !== true && !isStanding(task) && !task.trigger && !task.award && comesWeekly(task);
  }

  function weeklyChoreFor(section) {
    return {
      id: weeklyChoreId(section.id),
      sectionId: section.id,
      frequency: 'Weekly',
      title: `${section.name} (weekly)`,
      cadence: 'Weekly',
      standard: "This room's weekly chores, done together by one person on one day. Parts that come every 2 or 3 weeks are done on alternate weeks. Open Subtasks to see them.",
      sourceNote: '',
      currentOwner: '',
      weeklyRoom: true
    };
  }

  // A cadence or name changed in the Gallery overrides the catalog's (or the
  // one a task added in the app was given). Everything downstream --
  // frequency groups, the weekly room chores, standing items, the calendar,
  // the boards and time estimates -- reads the task's cadence and title, so it
  // all follows. The originals are kept as `originalCadence` and
  // `originalTitle`.
  function withOwnCadence(task) {
    const item = taskState(task.id);
    const cadence = String(item.cadence || '').trim();
    const title = String(item.title || '').trim();
    let own = task;
    if (cadence && cadence !== task.cadence) own = { ...own, cadence, frequency: frequencyForCadence(cadence), originalCadence: task.cadence };
    if (title && title !== task.title) own = { ...own, title, originalTitle: task.title };
    // An estimated time chosen in the Gallery.
    if (item.effort > 0 && item.effort !== task.effort) own = { ...own, effort: item.effort };
    return own;
  }

  function rebuildSections() {
    sectionByTask.clear();
    subtasksOf.clear();
    parentOf.clear();
    const everything = data.sections.map(section => ({
      section,
      tasks: [
        ...section.tasks.filter(task => !task.retired),
        ...extras.customTasks.filter(task => task.sectionId === section.id)
      ].map(withOwnCadence)
    }));
    const isPaid = task => taskState(task.id).paid === true;
    const kept = task => taskState(task.id).decision !== 'remove';
    const linkFor = task => extras.parents[task.id] || task.parent || null;
    const realIds = new Set(everything.flatMap(({ tasks }) => tasks).map(task => task.id));
    const hasExplicitChildren = new Set(everything.flatMap(({ tasks }) => tasks).map(linkFor).filter(id => realIds.has(id)));

    // Each room's weekly chore, when it has at least two kept parts.
    const weeklyMembers = new Map();
    for (const { section, tasks } of everything) {
      if (!weeklyRoomSections.has(section.id)) continue;
      const id = weeklyChoreId(section.id);
      const members = tasks.filter(task => !extras.standalone[task.id] && !hasExplicitChildren.has(task.id)
        && (linkFor(task) === id ? !isPaid(task) && !isStanding(task) : !linkFor(task) && fitsWeeklyRule(task)));
      if (members.filter(kept).length >= 2) weeklyMembers.set(section.id, members);
    }
    const weeklyChores = new Map([...weeklyMembers.keys()].map(sectionId => [sectionId, weeklyChoreFor(everything.find(entry => entry.section.id === sectionId).section)]));
    const byId = new Map([
      ...everything.flatMap(({ tasks }) => tasks).map(task => [task.id, task]),
      ...[...weeklyChores.values()].map(chore => [chore.id, chore])
    ]);

    for (const [sectionId, members] of weeklyMembers) {
      for (const task of members) parentOf.set(task.id, weeklyChoreId(sectionId));
    }
    for (const task of byId.values()) {
      if (parentOf.has(task.id) || isPaid(task) || extras.standalone[task.id]) continue;
      const parent = byId.get(linkFor(task));
      if (parent && parent.id !== task.id && !parent.weeklyRoom && !linkFor(parent)) parentOf.set(task.id, parent.id);
    }
    for (const task of byId.values()) {
      const parentId = parentOf.get(task.id);
      if (!parentId) continue;
      if (!subtasksOf.has(parentId)) subtasksOf.set(parentId, []);
      subtasksOf.get(parentId).push(task);
    }
    sections = everything.map(({ section, tasks }) => ({
      id: section.id,
      name: section.name,
      tasks: [...(weeklyChores.has(section.id) ? [weeklyChores.get(section.id)] : []), ...tasks.filter(task => !parentOf.has(task.id))]
    }));
    everything.forEach(({ tasks }, index) => {
      for (const task of [...tasks, ...sections[index].tasks]) sectionByTask.set(task.id, sections[index]);
    });
    allTasks = sections.flatMap(section => section.tasks);
    // One-off tasks belong to a room only for their room tag; they are not in
    // its list.
    for (const entry of extras.oneOffs) sectionByTask.set(entry.id, sections.find(section => section.id === entry.sectionId) || sections[0]);
  }

  // ---- One-off tasks ----

  // A one-off task as the calendar sees it. It has no cadence, so it is never
  // a standing item and never spread automatically: it sits on its own days.
  function oneOffTask(entry) {
    return {
      id: entry.id,
      sectionId: entry.sectionId,
      frequency: 'One-off',
      title: entry.title,
      cadence: 'One-off',
      standard: entry.standard,
      sourceNote: '',
      currentOwner: '',
      checklist: [],
      effort: entry.effort,
      oneOff: true,
      notes: entry.notes
    };
  }

  function oneOffPlans(firstOrder) {
    return extras.oneOffs.map((entry, index) => {
      const task = oneOffTask(entry);
      const owners = householdMembers(entry.owners);
      return { task, owners, order: firstOrder + index, series: [{ unit: 'dates', days: entry.days.map(dayFromIso), pinned: true }], minutes: minutesEach(task), bucket: owners[0] || '_shared' };
    });
  }

  function deleteOneOff(id) {
    extras.oneOffs = extras.oneOffs.filter(entry => entry.id !== id);
    delete extras.calendar.moves[id];
    delete extras.calendar.pins[id];
    sectionByTask.delete(id);
    queueSave();
  }

  function sectionFor(task) {
    return sectionByTask.get(task.id);
  }

  // A main chore's subtasks, leaving out any reviewed as Remove.
  function subtasksFor(task) {
    return (subtasksOf.get(task.id) || []).filter(sub => taskState(sub.id).decision !== 'remove');
  }

  function findTask(taskId) {
    for (const section of sections) {
      const found = section.tasks.find(task => task.id === taskId);
      if (found) return found;
    }
    for (const subs of subtasksOf.values()) {
      const found = subs.find(task => task.id === taskId);
      if (found) return found;
    }
    return null;
  }

  // ---- One-time updates ----

  // Changes from the October 2026 household review that live in review data
  // rather than the catalog. Owners are only filled in where New owner is still
  // blank, so a choice already made in the app is never overwritten. A backup
  // from before this update gets the same pass when it is restored.
  const reviewUpdate = 'review-updates-2026-10';
  const reviewOwnerUpdates = {
    'task-5': 'Oliver, Ephraim',
    'task-296': 'Oliver, Ephraim',
    'task-227': 'Kimberly, Oliver, Ephraim',
    'task-230': 'Oliver, Ephraim',
    'task-234': 'Oliver, Ephraim',
    'task-235': 'Oliver, Ephraim',
    'task-236': 'Oliver, Ephraim',
    'task-237': 'Oliver, Ephraim',
    'task-240': 'Oliver, Ephraim',
    'task-249': 'Kimberly, Brighton',
    'task-271': 'Kimberly, Brighton',
    'task-264': 'Kimberly, Michael',
    'task-269': 'Kimberly, Michael'
  };

  function blankRecord() {
    return { decision: '', newOwner: '', notes: '', assignable: false, paid: false, aiNote: '', aiDone: false, startOn: '', cadence: '', title: '', effort: 0, ownerSet: false };
  }

  // AI notes -- instructions for Claude to change the catalog -- have their own
  // admin-only field. Before it existed they were written into the regular
  // notes as a line starting "AI:" (or "AI -", "AI,", "AI note:"), running to
  // the end of the note. Those move into the field once, marked done: every
  // one of them had been carried out by then.
  const aiNotesMoved = 'ai-notes-own-field-2026-10';
  const oldAiNotePattern = /^[ \t]*AI(?:[ \t]+note)?[ \t]*[:,–-]/im;

  function moveAiNotes(records, target) {
    if (target.applied.includes(aiNotesMoved)) return false;
    for (const record of Object.values(records)) {
      if (!record || typeof record.notes !== 'string') continue;
      const match = oldAiNotePattern.exec(record.notes);
      if (!match) continue;
      const moved = record.notes.slice(match.index).trim();
      record.aiNote = [typeof record.aiNote === 'string' ? record.aiNote.trim() : '', moved].filter(Boolean).join('\n\n');
      record.aiDone = true;
      record.notes = record.notes.slice(0, match.index).trim();
    }
    target.applied.push(aiNotesMoved);
    return true;
  }

  function applyReviewUpdates(records) {
    for (const [taskId, owners] of Object.entries(reviewOwnerUpdates)) {
      const item = { ...blankRecord(), ...records[taskId] };
      if (!String(item.newOwner ?? '').trim()) records[taskId] = { ...item, newOwner: owners };
    }
    // A task merged into another hands over its Assignable and Paid flags.
    for (const task of catalogTasks) {
      if (!task.mergedInto || !records[task.id]) continue;
      const from = records[task.id];
      const into = { ...blankRecord(), ...records[task.mergedInto] };
      records[task.mergedInto] = { ...into, assignable: into.assignable === true || from.assignable === true, paid: into.paid === true || from.paid === true };
    }
  }

  // Starter soft skills and awards. They are seeded once and are ordinary data
  // after that: edit or delete them and they stay that way.
  const starterSeed = 'starter-skills-and-awards-2026-10';
  const starterSoftSkills = [
    { id: 'skill-tell-kim-when-low', title: 'Tell Kim when something is low or needed', description: 'When you notice something running low, or something the household needs, let Kimberly know so it gets on the list.', fromTask: 'task-255', owners: ['Michael', 'Brighton', 'Oliver', 'Ephraim'] },
    { id: 'skill-school-follow-up', title: "Follow up on school; don't re-review", description: 'Kimberly does the weekly school review. Michael follows up on what she finds rather than reviewing it again.', fromTask: 'task-257', owners: ['Michael'] },
    { id: 'skill-own-supplies', title: 'Keep an eye on supplies for the things you use', description: "Check the supplies for the things you use and flag what's running out, so the household inventory check isn't Kimberly's job alone.", fromTask: 'task-259', owners: ['Michael', 'Brighton', 'Oliver', 'Ephraim'] }
  ];
  const starterAwards = [
    { id: 'award-spill', title: 'Cleaned up a spill, stain, or pet mess', points: 5, description: "Handled a mess right away, especially one you didn't make.", taskId: 'task-243' },
    { id: 'award-not-yours', title: "Did a job that wasn't yours, unasked", points: 5, description: 'Saw something that needed doing and just did it.', taskId: null },
    { id: 'award-helped', title: 'Helped someone finish their job', points: 5, description: 'Pitched in so someone else could get done.', taskId: null },
    { id: 'award-heads-up', title: 'Gave a heads-up before something ran out or broke', points: 5, description: 'Noticed early and told someone who could fix it.', taskId: null }
  ];

  function seedStarters(target) {
    if (target.applied.includes(starterSeed)) return;
    for (const { owners, ...skill } of starterSoftSkills) {
      if (target.softSkills.some(item => item.id === skill.id)) continue;
      target.softSkills.push({ ...skill });
      if (!target.skillOwners[skill.id]) target.skillOwners[skill.id] = [...owners];
    }
    for (const award of starterAwards) {
      if (!target.awardTypes.some(item => item.id === award.id)) target.awardTypes.push({ ...award });
    }
    target.applied.push(starterSeed);
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }

  function taskState(taskId) {
    return { ...blankRecord(), ...state[taskId] };
  }

  function isReviewed(taskId) {
    const item = taskState(taskId);
    return Boolean(item.decision || item.newOwner.trim() || item.notes.trim() || item.assignable);
  }

  function reviewedCount(tasks = allTasks) {
    return tasks.filter(task => isReviewed(task.id)).length;
  }

  // Writing can fail: the quota can be exhausted, and private windows or
  // blocked site data can make localStorage throw on write. Report it instead
  // of claiming a save that did not happen.
  let storageWarned = false;

  function writeState() {
    // From the home server, saving means sending the change there.
    if (sync.server) { scheduleServerSave(); return true; }
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      localStorage.setItem(extrasKey, JSON.stringify(extras));
      saveStatus.textContent = 'Autosaved in this browser';
      saveStatus.removeAttribute('data-error');
      storageWarned = false;
      return true;
    } catch (error) {
      saveStatus.textContent = 'Not saved in this browser';
      saveStatus.setAttribute('data-error', 'true');
      if (!storageWarned) {
        storageWarned = true;
        showToast('This browser will not store your review. Use Save file to keep your work.');
      }
      return false;
    }
  }

  function queueSave() {
    saveStatus.textContent = 'Saving...';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(writeState, 180);
  }

  function persistState() {
    clearTimeout(saveTimer);
    return writeState();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('visible'), 3200);
  }

  function newId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // ---- Backups ----

  // Every task record a backup carries: the catalog, tasks added in the app,
  // and each room's weekly chore (whether or not the room has one right now).
  function recordIds(customTasks) {
    return [...catalogTasks.map(task => task.id), ...customTasks.map(task => task.id), ...weeklyChoreIds];
  }

  function portableState() {
    const tasks = {};
    recordIds(extras.customTasks).forEach(id => {
      const task = { id };
      const item = taskState(task.id);
      tasks[task.id] = {
        decision: item.decision || '',
        newOwner: item.newOwner || '',
        notes: item.notes || '',
        assignable: Boolean(item.assignable),
        paid: item.paid === true,
        aiNote: item.aiNote || '',
        aiDone: item.aiDone === true,
        startOn: item.startOn || '',
        cadence: item.cadence || '',
        title: item.title || '',
        effort: Number(item.effort) > 0 ? Number(item.effort) : 0,
        ownerSet: item.ownerSet === true
      };
    });
    return {
      format: backupFormat,
      version: backupVersion,
      exportedAt: new Date().toISOString(),
      activeSection,
      tasks,
      extras
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

  // Version 1 backups hold task reviews only. Restoring one replaces the review
  // and keeps the added tasks, soft skills and awards already in this browser.
  // Version 2 backups carry all of it.
  function validatedBackup(value) {
    if (!value || value.format !== backupFormat || ![1, 2].includes(value.version) || !value.tasks || typeof value.tasks !== 'object') {
      throw new Error('This is not a compatible House Manual backup file.');
    }
    const restoredExtras = value.version >= 2 ? cleanExtras(value.extras) : cleanExtras(JSON.parse(JSON.stringify(extras)));
    const restored = {};
    recordIds(restoredExtras.customTasks).forEach(id => {
      const task = { id };
      const item = value.tasks[task.id] || {};
      restored[task.id] = {
        decision: normalizeDecision(item.decision),
        newOwner: typeof item.newOwner === 'string' ? item.newOwner : '',
        notes: typeof item.notes === 'string' ? item.notes : '',
        assignable: item.assignable === true,
        paid: item.paid === true,
        aiNote: typeof item.aiNote === 'string' ? item.aiNote : '',
        aiDone: item.aiDone === true,
        startOn: typeof item.startOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.startOn) ? item.startOn : '',
        cadence: typeof item.cadence === 'string' ? item.cadence.trim() : '',
        title: typeof item.title === 'string' ? item.title.trim() : '',
        effort: Number.isFinite(item.effort) && item.effort > 0 ? item.effort : 0,
        ownerSet: item.ownerSet === true
      };
    });
    moveAiNotes(restored, restoredExtras);
    const updatedAlready = value.version >= 2 && restoredExtras.applied.includes(reviewUpdate);
    if (!updatedAlready) {
      applyReviewUpdates(restored);
      if (!restoredExtras.applied.includes(reviewUpdate)) restoredExtras.applied.push(reviewUpdate);
    }
    seedStarters(restoredExtras);
    seedMaturity(restoredExtras);
    const sectionExists = data.sections.some(section => section.id === value.activeSection);
    return { tasks: restored, extras: restoredExtras, activeSection: sectionExists ? value.activeSection : activeSection };
  }

  async function restoreBackup(file) {
    try {
      const backup = validatedBackup(JSON.parse(await file.text()));
      if (sync.server) {
        const reply = await api('POST', '/api/import', { tasks: backup.tasks, extras: backup.extras });
        if (!reply.ok) throw new Error(reply.data?.error || "The house computer didn't accept the backup.");
        pendingEdits.clear();
        receiveServerData(reply.data, { replace: true });
        activeSection = backup.activeSection;
        redrawAfterSync();
        renderSection();
        updateProgress();
        showToast('Backup restored for everyone. The shared copy now matches the file.');
        return;
      }
      state = backup.tasks;
      extras = backup.extras;
      activeSection = backup.activeSection;
      // Unsubmitted room-view edits were made against the old data.
      pendingEdits.clear();
      rebuildSections();
      renderPendingBar();
      const stored = persistState();
      renderNav();
      renderSection();
      updateProgress();
      // A backup carries who is an admin, so re-check what can be seen.
      applyAccess();
      // A failed write leaves the restore live in memory but not durable, so
      // don't let the success message paper over the warning writeState gave.
      if (stored) showToast('Backup restored. Your editable review is ready.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'The backup file could not be restored.');
    } finally {
      restoreFileInput.value = '';
    }
  }

  // ---- Cadence and workload ----

  // Frequency groups in the order a room lists them, most frequent first. A
  // group this list does not know goes after the known ones.
  const frequencyOrder = [
    'Immediate / after use', 'Daily / nightly', 'Every other day', '2-3x per week', 'Weekly', 'Every 2 weeks',
    'Every 2-3 weeks', 'Monthly', 'Every 2 months', 'Quarterly', 'Seasonal / annual',
    'As needed', 'As needed / product schedule', 'Trigger-based'
  ];

  // Times per month for the wording the catalog uses. When a cadence matches
  // more than one pattern, the one that appears first in the text wins, so
  // "Weekly / every 2 weeks" reads as weekly and "Every 2 weeks / as needed"
  // as every two weeks.
  const cadenceRates = [
    [/multiple times daily/, 60],
    [/morning \+ pm/, 60],
    [/school days/, 21],
    [/nightly|daily|every morning|after use|every dryer load/, 30],
    [/every other day|every 2 days/, 15],
    [/2-3x ?(?:\/|per) ?week/, 10],
    [/every 2-3 weeks/, 1.7],
    [/every 3 weeks/, 1.4],
    [/every 2 weeks|every other week|bi-?weekly|fortnight|every other (?:mon|tues|wednes|thurs|fri|satur|sun)day/, 2.15],
    [/weekly|once a week|every week|each week|every (?:mon|tues|wednes|thurs|fri|satur|sun)day|(?:mon|tues|wednes|thurs|fri|satur|sun)days\b/, 4.3],
    [/every 4 weeks|monthly|every month|once a month/, 1],
    [/every 2 months/, 0.5],
    [/quarterly|every 3 months|4x\/year/, 0.33],
    [/2x\/year|twice a year|spring and fall/, 0.17],
    [/seasonal|per season/, 0.25],
    [/annual|yearly|once a year|birthday/, 0.083]
  ];
  // Fallback when the cadence is something like "As needed" or "Before each
  // shopping trip": a rough rate for the task's frequency group.
  const frequencyRates = {
    'Immediate / after use': 20, 'Daily / nightly': 30, 'Every other day': 15, '2-3x per week': 10, 'Weekly': 4.3,
    'Every 2 weeks': 2.15, 'Every 2-3 weeks': 1.7, 'Monthly': 1, 'Every 2 months': 0.5,
    'Quarterly': 0.33, 'Seasonal / annual': 0.15, 'As needed': 1,
    'As needed / product schedule': 0.5, 'Trigger-based': 0.5
  };

  function cadenceRate(cadence) {
    const text = String(cadence ?? '').toLowerCase();
    let best = null;
    for (const [pattern, rate] of cadenceRates) {
      const match = text.match(pattern);
      if (match && (!best || match.index < best.index)) best = { index: match.index, rate };
    }
    return best ? best.rate : null;
  }

  function frequencyForCadence(cadence) {
    const text = String(cadence ?? '').toLowerCase();
    const rate = cadenceRate(text);
    if (rate === null) return /trigger|when |if /.test(text) ? 'Trigger-based' : 'As needed';
    if (rate >= 20) return 'Daily / nightly';
    if (rate >= 14) return 'Every other day';
    if (rate >= 8) return '2-3x per week';
    if (rate >= 3.5) return 'Weekly';
    if (rate >= 2) return 'Every 2 weeks';
    if (rate >= 1.3) return 'Every 2-3 weeks';
    if (rate >= 0.9) return 'Monthly';
    if (rate >= 0.45) return 'Every 2 months';
    if (rate >= 0.3) return 'Quarterly';
    return 'Seasonal / annual';
  }

  function timesPerMonth(task) {
    return cadenceRate(task.cadence) ?? frequencyRates[task.frequency] ?? 1;
  }

  // Minutes per occurrence. The catalog has no effort data, so this is an
  // estimate: frequent jobs tend to be short and rare ones long, nudged by the
  // wording of the title. A task added in the app can state its own effort.
  function ownMinutesEach(task) {
    if (task.effort) return task.effort;
    const rate = timesPerMonth(task);
    let minutes = rate >= 20 ? 10 : rate >= 4 ? 15 : rate >= 1 ? 20 : rate >= 0.3 ? 40 : 60;
    const words = String(task.title).toLowerCase();
    if (/deep|wash|organi[sz]e|window|walls|baseboard|declutter|planning|holiday|celebration|gift|garage|cook/.test(words)) minutes *= 1.5;
    else if (/wipe|replace|refill|empty|check|towel|trash|reset|pickup/.test(words)) minutes *= 0.6;
    return Math.round(minutes);
  }

  function ownWorkload(task) {
    return timesPerMonth(task) * ownMinutesEach(task);
  }

  // Estimated minutes per month: how auto-assign weighs one chore against
  // another. A chore with subtasks takes, over a month, as long as all of them
  // together -- each at its own cadence -- plus its own time if it states one.
  function workload(task) {
    const subs = subtasksFor(task);
    if (!subs.length) return ownWorkload(task);
    const own = task.effort ? timesPerMonth(task) * task.effort : 0;
    return own + subs.reduce((sum, sub) => sum + ownWorkload(sub), 0);
  }

  // Minutes each time the chore comes around. For a chore with subtasks that
  // is its monthly total spread over its own cadence, so a quarterly subtask
  // adds its share to every weekly clean rather than a spike once a quarter.
  function minutesEach(task) {
    if (!subtasksFor(task).length) return ownMinutesEach(task);
    return Math.max(1, Math.round(workload(task) / timesPerMonth(task)));
  }

  function formatMinutes(minutes) {
    if (minutes <= 0) return '0 min';
    if (minutes < 59.5) return `${Math.max(1, Math.round(minutes))} min`;
    return `${(minutes / 60).toFixed(minutes < 600 ? 1 : 0)} h`;
  }

  // ---- Owners ----

  // The separators ownersFor() splits on, so the controls and the grouping
  // always read a stored value the same way.
  function splitOwners(value) {
    return [...new Set(String(value ?? '').trim().split(/\s*(?:\+|,|;|\band\b|&)\s*/i).filter(Boolean))];
  }

  function rosterValue(name) {
    const known = ownerRoster.find(owner => owner.value.toLowerCase() === String(name).trim().toLowerCase());
    return known ? known.value : null;
  }

  function isRosterName(value) {
    return rosterValue(value) !== null;
  }

  function ownerLabel(value) {
    const known = ownerRoster.find(owner => owner.value.toLowerCase() === String(value).toLowerCase());
    return known ? known.label : value;
  }

  // A chore is adults-only if it, or any of its subtasks, is in a master-suite
  // or office room -- otherwise pulling one in would be a way round the rule.
  function inAdultsOnlyRoom(task) {
    return adultsOnlySections.has(sectionFor(task)?.id ?? task.sectionId);
  }

  function isAdultsOnly(task) {
    return inAdultsOnlyRoom(task) || subtasksFor(task).some(inAdultsOnlyRoom);
  }

  function eligibleNames(task) {
    return isAdultsOnly(task) ? ['Kimberly', 'Michael'] : [...rosterNames];
  }

  const kids = ['Brighton', 'Oliver', 'Ephraim'];

  // The household members an owner list stands for: "Each child" is the three
  // kids and "Everyone" is all five. Anything else that is not a name -- like
  // "Open — needs an owner" -- stands for nobody.
  function householdMembers(owners) {
    const names = new Set();
    for (const owner of owners) {
      const known = rosterValue(owner);
      if (known) names.add(known);
      else if (/each child/i.test(owner)) kids.forEach(name => names.add(name));
      else if (/everyone/i.test(owner)) rosterNames.forEach(name => names.add(name));
    }
    return rosterNames.filter(name => names.has(name));
  }

  function joinOwners(owners) {
    return [...new Set(owners)].join(', ');
  }

  // Any task can have several owners. Anything a restored backup or the agent
  // tool left here that is not on the roster is kept and shown rather than
  // silently dropped. A name the room's rule rules out is disabled -- unless it
  // is already ticked, so it can still be cleared.
  function ownerChecks(picked, allowed, fieldAttrs) {
    const boxes = ownerRoster.map(owner => {
      const on = picked.some(part => part.toLowerCase() === owner.value.toLowerCase());
      const blocked = !allowed.includes(owner.value) && !on;
      return `<label class="owner-pick${blocked ? ' is-blocked' : ''}"${blocked ? ` title="${escapeHtml(adultsOnlyRule)}"` : ''}><input type="checkbox" ${fieldAttrs} value="${escapeHtml(owner.value)}" ${on ? 'checked' : ''} ${blocked ? 'disabled' : ''}><span>${escapeHtml(owner.label)}</span></label>`;
    }).join('');
    const kept = picked.filter(part => !isRosterName(part)).map(extra =>
      `<label class="owner-pick owner-pick-extra"><input type="checkbox" ${fieldAttrs} value="${escapeHtml(extra)}" checked><span>${escapeHtml(extra)}</span></label>`).join('');
    return boxes + kept;
  }

  function renderOwnerField(task, item, heading) {
    const restricted = isAdultsOnly(task);
    return `<div><span class="field-label">New owners</span>
        <div class="owner-picks" role="group" aria-label="New owners for ${escapeHtml(heading)}">${ownerChecks(splitOwners(item.newOwner), eligibleNames(task), 'data-field="ownerPick"')}</div>
        ${restricted ? '<small class="owner-rule">Michael or Kim only</small>' : ''}</div>`;
  }

  // ---- Soft skills and awards lookups ----

  // A task becomes a soft skill when its notes (or, for a task added in the
  // app, its description) carry #softskill, or say in words that it should be a
  // soft skill.
  const softSkillPattern = /#soft-?skills?\b|\bsoft[\s-]?skills?\b/i;

  function softSkillSource(task) {
    const item = taskState(task.id);
    if (item.decision === 'remove') return null;
    if (softSkillPattern.test(item.notes)) return item.notes;
    if (task.custom && softSkillPattern.test(task.standard)) return task.standard;
    return null;
  }

  function allSoftSkills() {
    const covered = new Set(extras.softSkills.map(skill => skill.fromTask).filter(Boolean));
    // Subtasks' notes count too: they can be edited inside their main chore.
    const everyTask = [...allTasks, ...[...subtasksOf.values()].flat()];
    const fromNotes = everyTask.filter(task => !covered.has(task.id) && softSkillSource(task)).map(task => ({
      id: `task:${task.id}`,
      title: task.title,
      description: softSkillSource(task).replace(/#soft-?skills?\b/gi, '').trim(),
      fromTask: task.id,
      fromNotes: true
    }));
    return [...extras.softSkills, ...fromNotes];
  }

  function awardForTask(task) {
    return task.award ? extras.awardTypes.find(award => award.id === task.award) || null : null;
  }

  // ---- Room-by-room review ----

  // Edits made on room-view cards -- Keep/Remove, owners, notes, Assignable,
  // Paid, Standing, and a subtask's Remove/Restore -- wait here until Submit
  // changes, so nothing is saved by a stray click. Each entry is a partial
  // review record, plus `standing` for the Standing switch. Cards draw the
  // saved value with any waiting edit laid over it. (Buttons that are actions
  // rather than edits -- add a subtask, make one a chore of its own, move it
  // back, delete a task, the + form -- still act at once.)
  const pendingEdits = new Map();

  function draftOf(taskId) {
    const { standing, ...review } = pendingEdits.get(taskId) || {};
    return { ...taskState(taskId), ...review };
  }

  function draftStanding(task) {
    const pending = pendingEdits.get(task.id);
    return pending && 'standing' in pending ? pending.standing : isStanding(task);
  }

  function stageEdit(taskId, patch) {
    // A merged-away task has no card, but Clear AI notes still reaches it.
    const task = findTask(taskId) || catalogTasks.find(item => item.id === taskId);
    if (!task) return;
    const saved = { ...taskState(taskId), standing: isStanding(task) };
    const next = { ...pendingEdits.get(taskId), ...patch };
    // A field put back to its saved value is no longer a change.
    for (const key of Object.keys(next)) if (next[key] === saved[key]) delete next[key];
    if (Object.keys(next).length) pendingEdits.set(taskId, next);
    else pendingEdits.delete(taskId);
    taskGroups.querySelectorAll(`[data-task-id="${CSS.escape(taskId)}"]`).forEach(card => card.classList.toggle('has-pending', pendingEdits.has(taskId)));
    renderPendingBar();
  }

  function renderPendingBar() {
    const count = pendingEdits.size;
    document.querySelector('#pendingBar').hidden = count === 0;
    document.querySelector('#pendingText').textContent = `Unsaved changes on ${count} chore${count === 1 ? '' : 's'}`;
    // The tab button specifically: <body> carries data-view too, for the
    // view that's showing.
    document.querySelector('.feature-tabs [data-view="review"]').textContent = count ? `Gallery (${count} unsaved)` : 'Gallery';
    renderAiNotesButton();
  }

  // Chores whose AI note (saved or waiting) is not marked done, in the order
  // the room view lists them: room by room, each main chore before its parts.
  function openAiNotes() {
    return sections
      .flatMap(section => section.tasks.flatMap(task => [task, ...(subtasksOf.get(task.id) || [])]))
      .map(task => task.id)
      .filter(id => { const item = draftOf(id); return item.aiNote.trim() && !item.aiDone; });
  }

  function renderAiNotesButton() {
    const count = openAiNotes().length;
    const button = document.querySelector('#nextAiNote');
    button.hidden = count === 0;
    button.textContent = `AI notes to do: ${count} · Next ›`;
  }

  // Steps through the open AI notes, opening each chore's room and its note.
  let lastAiNote = null;

  function showNextAiNote() {
    const ids = openAiNotes();
    if (!ids.length) return;
    const id = ids[(ids.indexOf(lastAiNote) + 1) % ids.length];
    lastAiNote = id;
    openTaskInRoom(id);
    const note = taskGroups.querySelector(`[data-task-id="${CSS.escape(id)}"] .ai-note`);
    if (!note) return;
    note.open = true;
    note.scrollIntoView({ block: 'center' });
    note.querySelector('textarea').focus({ preventScroll: true });
  }

  document.querySelector('#nextAiNote').addEventListener('click', showNextAiNote);

  // The AI note on a room-view card: admin only, folded away unless it holds a
  // note that isn't done yet. Ticking Done folds it up again.
  function aiNoteHtml(item) {
    const note = item.aiNote.trim();
    const status = !note ? 'add one' : item.aiDone ? 'done' : 'to do';
    return `<details class="ai-note${note && !item.aiDone ? ' is-open-note' : ''}" data-admin-only${note && !item.aiDone ? ' open' : ''}>
      <summary><span class="ai-note-title">AI note</span><span class="ai-note-status">${status}</span></summary>
      <textarea class="notes-input" data-field="aiNote" aria-label="AI note" placeholder="An instruction for Claude, e.g. change this to quarterly">${escapeHtml(item.aiNote)}</textarea>
      <label class="paid-option"><input type="checkbox" data-field="aiDone" ${item.aiDone ? 'checked' : ''} ${note ? '' : 'disabled'}><span>Done: Claude has carried this out</span></label>
    </details>`;
  }

  function submitEdits() {
    if (!pendingEdits.size) return;
    const chores = pendingEdits.size;
    let removed = 0;
    for (const [id, patch] of pendingEdits) {
      const task = findTask(id);
      const { standing, ...review } = patch;
      if (Object.keys(review).length) state[id] = { ...taskState(id), ...review };
      if (review.decision === 'remove') removed++;
      if (task && standing !== undefined) {
        if (standing === (task.standing === true)) delete extras.standing[id];
        else extras.standing[id] = standing;
      }
    }
    pendingEdits.clear();
    // Paid, Standing and Keep/Remove decide what each room's weekly chore holds.
    rebuildSections();
    persistState();
    renderSection();
    updateProgress();
    renderPendingBar();
    showToast(`Saved changes to ${chores} chore${chores === 1 ? '' : 's'}.${removed ? ` ${removed} removed.` : ''}`);
  }

  function discardEdits({ ask = true } = {}) {
    if (!pendingEdits.size) return true;
    if (ask && !window.confirm(`Discard your unsaved changes on ${pendingEdits.size} chore${pendingEdits.size === 1 ? '' : 's'}?`)) return false;
    pendingEdits.clear();
    renderSection();
    renderPendingBar();
    return true;
  }

  document.querySelector('#pendingSubmit').addEventListener('click', submitEdits);
  document.querySelector('#pendingDiscard').addEventListener('click', () => { if (discardEdits()) showToast('Changes discarded.'); });
  window.addEventListener('beforeunload', event => {
    if (!pendingEdits.size) return;
    event.preventDefault();
    event.returnValue = '';
  });

  function renderNav() {
    nav.innerHTML = sections.map(section => {
      const done = reviewedCount(section.tasks);
      return `<button class="nav-button" type="button" data-section="${section.id}" ${section.id === activeSection ? 'aria-current="page"' : ''}>
        <span class="nav-name">${escapeHtml(section.name)}</span>
        <span class="nav-count" aria-label="${done} of ${section.tasks.length} reviewed">${done}/${section.tasks.length}</span>
      </button>`;
    }).join('');
  }

  function decisionOption(task, value, label) {
    const checked = draftOf(task.id).decision === value ? 'checked' : '';
    return `<label class="decision-option"><input type="radio" name="decision-${task.id}" data-field="decision" value="${value}" ${checked}><span>${label}</span></label>`;
  }

  // Room prefix shown in front of every task title, e.g. "DR: Dust black
  // shelves". It lives here rather than in data.js so the prefix is added when
  // a title is drawn, never stored.
  //
  // Edit a value here to change a prefix. They have to stay distinct, which is
  // why the near-misses are spelled out: Dining Room / Downstairs Hallway /
  // Downstairs Hall Closet / Daily, Living Room / Laundry Room, Master
  // Bedroom / Master Bathroom, and the three Upstairs entries.
  const sectionAbbr = {
    'section-1': 'DLY',   // Daily / Ongoing Routines
    'section-2': 'KIT',   // Kitchen
    'section-3': 'DR',    // Dining Room
    'section-4': 'LR',    // Living Room
    'section-5': 'ENT',   // Entryway / Rabbit-Supply Area
    'section-6': 'PAN',   // Pantry
    'section-7': 'LDY',   // Laundry Room
    'section-8': 'DH',    // Downstairs Hallway
    'section-9': 'DHC',   // Downstairs Hall Closet
    'section-10': 'GB',   // Guest Bathroom
    'section-11': 'STR',  // Stairs
    'section-12': 'UH',   // Upstairs Hallway
    'section-13': 'UHC',  // Upstairs Hall Closet
    'section-14': 'UB',   // Upstairs Bathroom
    'section-15': 'MBR',  // Master Bedroom
    'section-16': 'MBA',  // Master Bathroom
    'section-17': 'MO',   // Michael's Office
    'section-18': 'KID',  // Kids' bedrooms - each room
    'section-19': 'GAR',  // Garage
    'section-20': 'WH',   // Whole-House / Shared Cleaning
    'section-21': 'ADM',  // Household Administration
    'section-22': 'PET',  // Pets - Supplies / Appointments / Health
    'section-23': 'MNT',  // Home, Safety & Equipment Maintenance
    'section-24': 'VEH',  // Vehicle & Exterior House Care
    'section-25': 'OUT',  // Outdoor / Seasonal Household Work
    'section-26': 'TRG'   // As Needed / Trigger-Based
  };

  function roomTag(section) {
    if (sectionAbbr[section.id]) return sectionAbbr[section.id];
    // Fallback so a section added later still gets a prefix rather than none.
    const initials = section.name.replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/)
      .slice(0, 3).map(word => word[0].toUpperCase()).join('');
    return initials || '?';
  }

  function taskTitle(task, section = sectionFor(task)) {
    return `${roomTag(section)}: ${task.title}`;
  }

  // The same title for drawing on screen: the room tag shows the room's full
  // name on hover. taskTitle() stays plain text for toasts, screen-reader
  // labels, the PDF and saved records.
  function roomTagHtml(section) {
    return `<abbr class="room-tag" title="${escapeHtml(section.name)}">${escapeHtml(roomTag(section))}</abbr>`;
  }

  function taskTitleHtml(task, section = sectionFor(task)) {
    return `${roomTagHtml(section)}: ${escapeHtml(task.title)}`;
  }

  // How many weeks apart a subtask comes round inside a weekly main chore:
  // 1, 2 or 3, or null for anything slower or irregular.
  function weeksApart(task) {
    const rate = calendarRate(task);
    if (rate === null) return null;
    return rate >= 3.5 ? 1 : rate >= 2 ? 2 : rate >= 1.3 ? 3 : null;
  }

  // Which of a main chore's subtasks are due on a given week of it. Parts that
  // come every 2 or 3 weeks take turns, so the weeks stay even.
  function dueThisTime(subs, weekIndex) {
    const seen = { 2: 0, 3: 0 };
    return new Map(subs.map(sub => {
      const period = weeksApart(sub);
      if (period === null) return [sub.id, null];
      if (period === 1) return [sub.id, true];
      const phase = seen[period]++ % period;
      return [sub.id, mod(weekIndex - phase, period) === 0];
    }));
  }

  // A chore's name in the Gallery, with any rename waiting for Submit shown,
  // a Rename button, and the original when it has changed.
  function renameableTitleHtml(task) {
    const original = task.originalTitle || task.title;
    const shown = draftOf(task.id).title || task.title;
    if (task.weeklyRoom) return escapeHtml(shown);
    return `<span class="title-text" data-original="${escapeHtml(original)}">${escapeHtml(shown)}</span>`
      + ` <button type="button" class="rename-chip" data-rename title="Rename this chore" aria-label="Rename ${escapeHtml(shown)}">Rename</button>`
      + (shown !== original ? ` <small class="renamed-from">was “${escapeHtml(original)}”</small>` : '');
  }

  // Swaps the name for a text box: Enter or leaving it stages the new name
  // (blank, or the original, puts the original back); Esc cancels.
  function startRename(button) {
    const card = button.closest('[data-task-id]');
    const text = button.previousElementSibling;
    if (!card || !text?.classList.contains('title-text')) return;
    const taskId = card.dataset.taskId;
    const original = text.dataset.original;
    const input = document.createElement('input');
    input.className = 'text-input rename-input';
    input.value = text.textContent;
    input.setAttribute('aria-label', 'New name');
    text.replaceWith(input);
    button.hidden = true;
    input.focus();
    input.select();
    let finished = false;
    const finish = save => {
      if (finished) return;
      finished = true;
      if (save) {
        const value = input.value.trim();
        stageEdit(taskId, { title: value && value !== original ? value : '' });
      }
      const parentId = parentOf.get(taskId);
      if (parentId) openSubtaskPanels.add(parentId);
      renderSection();
      taskGroups.querySelector(`[data-task-id="${CSS.escape(taskId)}"] [data-rename]`)?.focus();
    };
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); finish(true); }
      if (event.key === 'Escape') { event.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }

  function subtaskRoomPrefix(sub, parent) {
    const room = sectionFor(sub);
    return room && room.id !== sectionFor(parent)?.id ? `${roomTagHtml(room)}: ` : '';
  }

  // A main chore's subtasks, read-only and folded away until opened: each with
  // its cadence and monthly time, which together make up the main chore's
  // time. Given a week of the chore, it also says which parts are due then.
  function subtasksHtml(task, { open = false, weekIndex = null } = {}) {
    const subs = subtasksFor(task);
    if (!subs.length) return '';
    const due = weekIndex === null ? null : dueThisTime(subs, weekIndex);
    const dueCount = due ? [...due.values()].filter(value => value !== false).length : null;
    return `<details class="subtasks"${open ? ' open' : ''}>
      <summary>Subtasks · ${subs.length} <span>${dueCount !== null ? `${dueCount} due this time · ` : ''}≈ ${escapeHtml(formatMinutes(minutesEach(task)))} each time · ≈ ${escapeHtml(formatMinutes(workload(task)))}/mo in all</span></summary>
      <ul>${subs.map(sub => {
        const isDue = due ? due.get(sub.id) : null;
        return `<li${isDue === false ? ' class="is-not-due"' : ''}>
          <span class="subtask-title">${subtaskRoomPrefix(sub, task)}${escapeHtml(sub.title)}</span>
          <span class="subtask-meta">${escapeHtml(sub.cadence || sub.frequency)} · ≈ ${escapeHtml(formatMinutes(ownWorkload(sub)))}/mo${isDue === true ? ' · <strong>this time</strong>' : isDue === false ? ' · not this time' : ''}</span>
        </li>`;
      }).join('')}</ul>
    </details>`;
  }

  // In the room view a main chore's subtasks are full cards -- notes, Paid,
  // Remove or Delete -- folded away until the chore is opened, with a form to
  // add one. Removed parts are listed on request so they can be brought back.
  // Marking a part Paid takes it out: paid chores always stand on their own.
  const openSubtaskPanels = new Set();
  const showRemovedFor = new Set();

  // The Standing item switch. A chore with no regular cadence is always a
  // standing item, and a room's weekly chore never is one, so for those the
  // switch is shown but can't be changed.
  function standingSwitchHtml(task) {
    const locked = hasNoCadence(task) || task.weeklyRoom;
    const why = hasNoCadence(task) ? 'It has no regular cadence, so it is always a standing item.' : task.weeklyRoom ? "A room's weekly chore is always on the calendar." : 'Standing items are listed under the Calendar instead of on its days.';
    return `<label class="paid-option standing-option" title="${escapeHtml(why)}"><input type="checkbox" data-field="standing" ${draftStanding(task) ? 'checked' : ''} ${locked ? 'disabled' : ''}><span>Standing item</span></label>`;
  }

  // A chore's cadence, editable. Blank, or the original wording, means the
  // original. The hint says how the app reads it, since that decides its
  // frequency group, its calendar days and whether it is a standing item.
  function cadenceReading(cadence) {
    const group = frequencyForCadence(cadence);
    return group === 'As needed' || group === 'Trigger-based' ? `Reads as: ${group.toLowerCase()} (a standing item, no set days)` : `Reads as: ${group.toLowerCase()}`;
  }

  // A real dropdown -- the original wording, the current one, the usual
  // cadences -- and "Other…" to type any wording, in the box underneath. (A
  // text box with suggestions only suggests what matches what's already in it,
  // so a chore reading "Weekly / as needed" offered nothing else.)
  const cadenceChoices = ['Daily', 'Nightly', 'Every other day', '2-3x/week', 'Weekly', 'Every 2 weeks', 'Every 3 weeks', 'Monthly', 'Every 2 months', 'Quarterly', '2x/year', 'Annually', 'As needed'];

  function cadenceFieldHtml(task, item) {
    if (task.weeklyRoom) return '';
    const original = task.originalCadence || task.cadence || '';
    const value = item.cadence || task.cadence || '';
    const changed = value.trim() !== original;
    const values = [...new Set([original, value, ...cadenceChoices].filter(Boolean))];
    const label = choice => choice === original && !cadenceChoices.includes(choice) ? `${choice} (original)` : choice;
    return `<div class="cadence-field"><label><span class="field-label">Cadence</span><select class="owner-select" data-field="cadenceChoice" aria-label="Cadence">
        ${values.map(choice => `<option value="${escapeHtml(choice)}" ${choice === value ? 'selected' : ''}>${escapeHtml(label(choice))}</option>`).join('')}
        <option value="__other">Other… (type your own)</option>
      </select></label>
      <input class="text-input cadence-custom" data-field="cadence" data-original="${escapeHtml(original)}" value="${escapeHtml(value)}" autocomplete="off" aria-label="Cadence, in your own words" placeholder="e.g. Every Saturday" hidden>
      <small class="cadence-hint">${escapeHtml(cadenceReading(value))}${changed ? ` · was “${escapeHtml(original)}”` : ''}</small></div>`;
  }

  // Who owns the chore now (the last submitted owner boxes), and the catalog's
  // original wording underneath when it says something else.
  function currentOwnerHtml(task) {
    const owners = ownersFor(task);
    const now = owners[0] === openOwner ? openOwner : owners.map(ownerLabel).join(', ');
    const original = (task.currentOwner || '').trim();
    return `<span class="owner-label">Current owner</span><p class="current-owner">${escapeHtml(now)}</p>
      ${original && original !== now ? `<p class="catalog-owner">Catalog: ${escapeHtml(original)}</p>` : ''}`;
  }

  // How long a chore takes each time. Only a time someone chose is shown on
  // the calendar; without one the app still estimates it, for balancing
  // workloads, but doesn't show the guess.
  const effortChoices = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240];

  function effortOptionsHtml(selected) {
    const choices = selected && !effortChoices.includes(selected) ? [...effortChoices, selected].sort((a, b) => a - b) : effortChoices;
    return `<option value="">Not set</option>${choices.map(minutes => `<option value="${minutes}" ${minutes === selected ? 'selected' : ''}>${escapeHtml(formatMinutes(minutes))}</option>`).join('')}`;
  }

  function effortFieldHtml(task, item) {
    if (task.weeklyRoom) return '';
    const selected = item.effort || task.effort || 0;
    return `<label class="effort-field"><span class="field-label">Estimated time</span><select class="owner-select" data-field="effort">${effortOptionsHtml(selected)}</select>
      <small>${selected ? 'Each time; shown on the calendar' : `Not set (the app guesses ≈ ${escapeHtml(formatMinutes(ownMinutesEach({ ...task, effort: null })))} for balancing)`}</small></label>`;
  }

  // The time to show for a chore: its own, or, for a chore with subtasks, the
  // average each time once every part has one. Null when not known.
  function knownMinutes(task) {
    const subs = subtasksFor(task);
    if (!subs.length) return task.effort > 0 ? task.effort : null;
    return subs.every(sub => sub.effort > 0) ? minutesEach(task) : null;
  }

  // The day a chore first appears on its owners' calendars; it repeats from
  // there. Standing items have no days on the calendar, so it doesn't apply.
  function startOnHtml(task, item) {
    const standing = draftStanding(task);
    const hint = standing ? 'Standing items have no days on the calendar'
      : item.startOn ? 'First on the calendar that day, then repeats'
      : 'Optional: the first day it shows on the calendar';
    return `<label class="start-on"><span class="field-label">Start on</span><input class="text-input" type="date" data-field="startOn" value="${escapeHtml(item.startOn)}" ${standing ? 'disabled' : ''}><small>${hint}</small></label>`;
  }

  function subtaskCardHtml(sub, parent) {
    const item = draftOf(sub.id);
    // A Remove waiting for Submit: struck through, with Undo.
    if (item.decision === 'remove') {
      return `<li class="subtask-card has-pending is-removing" data-task-id="${sub.id}">
        <div class="subtask-head"><strong>${subtaskRoomPrefix(sub, parent)}${escapeHtml(sub.title)}</strong><span class="subtask-meta">Will be removed when you submit</span></div>
        <div class="subtask-controls"><button type="button" class="chip" data-restore-subtask="${sub.id}">Undo</button></div>
      </li>`;
    }
    return `<li class="subtask-card${pendingEdits.has(sub.id) ? ' has-pending' : ''}" data-task-id="${sub.id}">
      <div class="subtask-head">
        <strong>${subtaskRoomPrefix(sub, parent)}${renameableTitleHtml(sub)}</strong>
        <span class="subtask-meta">${escapeHtml(sub.cadence || sub.frequency)} · ≈ ${escapeHtml(formatMinutes(ownWorkload(sub)))}/mo</span>
      </div>
      ${sub.standard ? `<p class="standard">${escapeHtml(sub.standard)}</p>` : ''}
      <div class="subtask-controls">
        <label><span class="field-label">Notes</span><textarea class="notes-input" data-field="notes" placeholder="Notes">${escapeHtml(item.notes)}</textarea></label>
        ${aiNoteHtml(item)}
        <label class="paid-option" title="Paid chores always stand on their own"><input type="checkbox" data-field="paid" ${item.paid ? 'checked' : ''}><span>Paid item</span></label>
        ${cadenceFieldHtml(sub, item)}
        ${effortFieldHtml(sub, item)}
        ${standingSwitchHtml(sub)}
        <button type="button" class="chip" data-split-subtask="${sub.id}">Make it a chore of its own</button>
        ${sub.custom
          ? `<button type="button" class="chip chip-danger" data-delete-task="${sub.id}">Delete</button>`
          : `<button type="button" class="chip chip-danger" data-remove-subtask="${sub.id}">Remove</button>`}
      </div>
    </li>`;
  }

  function subtaskManagerHtml(task) {
    const all = subtasksOf.get(task.id) || [];
    if (!all.length) return '';
    const live = all.filter(sub => taskState(sub.id).decision !== 'remove');
    const removed = all.filter(sub => taskState(sub.id).decision === 'remove');
    const showRemoved = showRemovedFor.has(task.id);
    return `<details class="subtasks subtask-manager" data-subtasks-of="${task.id}"${openSubtaskPanels.has(task.id) ? ' open' : ''}>
      <summary>Subtasks · ${live.length} <span>≈ ${escapeHtml(formatMinutes(minutesEach(task)))} each time · ≈ ${escapeHtml(formatMinutes(workload(task)))}/mo in all</span></summary>
      <ul class="subtask-cards">${live.map(sub => subtaskCardHtml(sub, task)).join('')}</ul>
      <form class="subtask-add" data-add-subtask="${task.id}" autocomplete="off">
        <label><span class="visually-hidden">New subtask</span><input class="text-input" name="title" placeholder="Add a subtask" required pattern=".*\\S.*"></label>
        <label><span class="visually-hidden">Its cadence</span><input class="text-input" name="cadence" list="cadenceOptions" placeholder="Cadence (blank: ${escapeHtml(task.cadence)})"></label>
        <button class="button button-quiet button-small" type="submit">Add</button>
      </form>
      ${removed.length ? `<button type="button" class="link-button" data-toggle-removed="${task.id}" aria-expanded="${showRemoved}">${showRemoved ? 'Hide' : 'Show'} removed (${removed.length})</button>
        ${showRemoved ? `<ul class="subtask-removed">${removed.map(sub => draftOf(sub.id).decision === 'remove'
          ? `<li><span>${escapeHtml(sub.title)}</span><button type="button" class="chip chip-quiet" data-restore-subtask="${sub.id}">Restore</button></li>`
          : `<li class="is-restoring"><span>${escapeHtml(sub.title)} · restored when you submit</span><button type="button" class="chip chip-quiet" data-remove-subtask="${sub.id}">Undo</button></li>`).join('')}</ul>` : ''}` : ''}
    </details>`;
  }

  // A title saved as text, like a completed chore's "KIT: Coffee pot", with
  // its room tag given the same hover hint when the tag is still known.
  function titleTextHtml(text) {
    const match = /^([A-Z]{1,4}): ([\s\S]*)$/.exec(String(text ?? ''));
    const section = match && sections.find(entry => roomTag(entry) === match[1]);
    return section ? `${roomTagHtml(section)}: ${escapeHtml(match[2])}` : escapeHtml(text);
  }

  function groupByFrequency(tasks) {
    const groups = [];
    for (const task of tasks) {
      let group = groups.find(item => item.name === task.frequency);
      if (!group) { group = { name: task.frequency, tasks: [], first: groups.length }; groups.push(group); }
      group.tasks.push(task);
    }
    const rank = group => {
      const index = frequencyOrder.indexOf(group.name);
      return index === -1 ? frequencyOrder.length + group.first : index;
    };
    return groups.sort((a, b) => rank(a) - rank(b));
  }

  function renderTask(task, section) {
    const item = draftOf(task.id);
    const heading = taskTitle(task, section);
    const open = item.assignable && !item.newOwner.trim();
    const award = awardForTask(task);
    const checklist = task.checklist?.length
      ? `<details class="checklist"><summary>Checklist · ${task.checklist.length} items</summary><ul>${task.checklist.map(entry => `<li>${escapeHtml(entry)}</li>`).join('')}</ul></details>`
      : '';
    return `<article class="task-card${pendingEdits.has(task.id) ? ' has-pending' : ''}" data-task-id="${task.id}" data-reviewed="${isReviewed(task.id)}" data-assignable="${open}">
      <div class="task-summary">
        <div>
          <h4 class="task-title">${roomTagHtml(section)}: ${renameableTitleHtml(task)}</h4>
          ${open ? '<span class="assignable-indicator">Open · needs an owner</span>' : ''}
          ${item.paid ? '<span class="paid-indicator">Paid</span>' : ''}
          ${award ? `<button type="button" class="award-indicator" data-go-awards>Award · ${award.points} pts</button>` : ''}
          ${softSkillSource(task) ? '<span class="soft-skill-indicator">Soft skill</span>' : ''}
          ${task.trigger ? `<span class="soft-skill-indicator" title="${escapeHtml(`${task.trigger.firstStep}, then “${task.trigger.thenTitle}” the same day`)}">Trigger · ${escapeHtml(ownerLabel(task.trigger.first))}, then ${escapeHtml(ownerLabel(task.trigger.then))}</span>` : ''}
          ${task.custom ? '<span class="custom-indicator">Added in app</span>' : ''}
          ${task.cadence ? `<span class="cadence">${escapeHtml(task.cadence)}</span>` : ''}
          ${task.standard ? `<p class="standard">${escapeHtml(task.standard)}</p>` : ''}
          ${task.sourceNote ? `<p class="source-note"><strong>Note:</strong> ${escapeHtml(task.sourceNote)}</p>` : ''}
          ${checklist}
          ${subtaskManagerHtml(task)}
        </div>
        <div>${currentOwnerHtml(task)}
          ${task.custom ? `<button type="button" class="button button-quiet button-small delete-task" data-delete-task="${task.id}">Delete task</button>` : ''}
          ${extras.standalone[task.id] && weeklyRoomSections.has(section.id) && fitsWeeklyRule(task)
            ? `<button type="button" class="button button-quiet button-small delete-task" data-unsplit-subtask="${task.id}">Move back into ${escapeHtml(section.name)} (weekly)</button>` : ''}</div>
      </div>
      <div class="task-controls">
        <div><span class="field-label">Decision</span><div class="decision-options" role="radiogroup" aria-label="Decision for ${escapeHtml(heading)}">
          ${decisionOption(task, 'keep', 'Keep')}${decisionOption(task, 'remove', 'Remove')}
        </div></div>
        ${renderOwnerField(task, item, heading)}
        <label><span class="field-label">Notes</span><textarea class="notes-input" data-field="notes" placeholder="Support, reminders, standards...">${escapeHtml(item.notes)}</textarea></label>
        <label class="assignable-option"><input type="checkbox" data-field="assignable" ${item.assignable ? 'checked' : ''}><span>Mark assignable</span><small>Waits in the Assignments parking lot until it has an owner</small></label>
        <label class="paid-option"><input type="checkbox" data-field="paid" ${item.paid ? 'checked' : ''}><span>Paid item</span></label>
        ${standingSwitchHtml(task)}
        ${cadenceFieldHtml(task, item)}
        ${effortFieldHtml(task, item)}
        ${startOnHtml(task, item)}
        ${aiNoteHtml(item)}
      </div>
    </article>`;
  }

  function renderSection() {
    const section = sections.find(item => item.id === activeSection);
    const groups = groupByFrequency(section.tasks);
    title.textContent = section.name;
    meta.textContent = `${section.tasks.length} tasks · ${reviewedCount(section.tasks)} reviewed`;
    taskGroups.innerHTML = groups.map(group => `<section class="frequency-group">
      <h3 class="frequency-heading">${escapeHtml(group.name)} <span>(${group.tasks.length})</span></h3>
      <div class="task-list">${group.tasks.map(task => renderTask(task, section)).join('')}</div>
    </section>`).join('');
    renderAiNotesButton();
  }

  function updateProgress() {
    renderDashboard();
    const count = reviewedCount();
    progressText.textContent = `${count} of ${allTasks.length}`;
    progressBar.style.width = `${(count / allTasks.length) * 100}%`;
    renderNav();
    const section = sections.find(item => item.id === activeSection);
    meta.textContent = `${section.tasks.length} tasks · ${reviewedCount(section.tasks)} reviewed`;
  }

  function updateTask(taskId, patch) {
    state[taskId] = { ...taskState(taskId), ...patch };
    // Paid and Keep/Remove decide which chores a room's weekly chore holds.
    if ('paid' in patch || 'decision' in patch) rebuildSections();
    const card = document.querySelector(`[data-task-id="${taskId}"]`);
    if (card) card.dataset.reviewed = String(isReviewed(taskId));
    queueSave();
    updateProgress();
  }

  // A subtask has no card of its own, so it opens its main chore with the
  // subtask list expanded.
  function openTaskInRoom(taskId) {
    const target = parentOf.get(taskId) || taskId;
    const task = allTasks.find(item => item.id === target);
    if (!task) return;
    activeSection = sectionFor(task).id;
    renderNav(); renderSection(); showView('review');
    const card = taskGroups.querySelector(`[data-task-id="${target}"]`);
    if (target !== taskId) card.querySelector('.subtasks')?.setAttribute('open', '');
    card.scrollIntoView({ block: 'center' });
    card.querySelector('input').focus({ preventScroll: true });
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
    const taskId = card.dataset.taskId;
    // Every edit here waits for Submit changes (see pendingEdits).
    if (field === 'decision') {
      // Radios in a shared name group deselect their siblings natively.
      stageEdit(taskId, { decision: event.target.value });
    } else if (field === 'notes' || field === 'aiNote') {
      // Typing is staged as it happens (the input handler below).
    } else if (field === 'startOn') {
      stageEdit(taskId, { startOn: event.target.value });
    } else if (field === 'effort') {
      stageEdit(taskId, { effort: Number(event.target.value) || 0 });
    } else if (field === 'cadenceChoice') {
      const custom = event.target.closest('.cadence-field').querySelector('[data-field="cadence"]');
      if (event.target.value === '__other') {
        custom.hidden = false;
        custom.focus();
        custom.select();
        return;
      }
      custom.hidden = true;
      custom.value = event.target.value;
      stageEdit(taskId, { cadence: event.target.value !== custom.dataset.original ? event.target.value : '' });
      updateCadenceHint(custom);
    } else if (field === 'cadence') {
      // Back to the original wording, or blank: no override.
      const value = event.target.value.trim();
      stageEdit(taskId, { cadence: value && value !== event.target.dataset.original ? value : '' });
      if (!value) event.target.value = event.target.dataset.original;
      updateCadenceHint(event.target);
    } else {
      const patch = field === 'ownerPick'
        ? { newOwner: [...card.querySelectorAll('[data-field="ownerPick"]')].filter(box => box.checked).map(box => box.value).join(', '), ownerSet: true }
        : { [field]: event.target.checked };
      stageEdit(taskId, patch);
      // Redraw so badges like "Open · needs an owner" follow the draft, then
      // put focus back where it was.
      renderSection();
      const selector = field === 'ownerPick' ? `[data-field="ownerPick"][value="${CSS.escape(event.target.value)}"]` : `[data-field="${field}"]`;
      taskGroups.querySelector(`[data-task-id="${CSS.escape(taskId)}"] ${selector}`)?.focus();
    }
  });

  taskGroups.addEventListener('input', event => {
    // Only the notes textareas need live input handling. Every other control
    // is a radio or a checkbox, and those report on change.
    const field = event.target.dataset.field;
    if (field === 'cadence') { updateCadenceHint(event.target); return; }
    if (field !== 'notes' && field !== 'aiNote') return;
    const card = event.target.closest('[data-task-id]');
    if (!card) return;
    if (field === 'notes') { stageEdit(card.dataset.taskId, { notes: event.target.value }); return; }
    // Changing an AI note makes it a new instruction, so it is no longer done;
    // Done can only be ticked once there is a note.
    const note = event.target.value;
    stageEdit(card.dataset.taskId, { aiNote: note, aiDone: false });
    const done = event.target.closest('.ai-note').querySelector('[data-field="aiDone"]');
    done.checked = false;
    done.disabled = !note.trim();
  });

  function updateCadenceHint(input) {
    const value = input.value.trim() || input.dataset.original;
    const changed = value !== input.dataset.original;
    input.closest('.cadence-field').querySelector('.cadence-hint').textContent = `${cadenceReading(value)}${changed ? ` · was “${input.dataset.original}”` : ''}`;
  }

  // Clicking the selected decision clears it. A radio can't be unchecked by
  // clicking it, and its `change` event fires before `click`, so the only way
  // to know it was already selected is to record that when the press starts.
  let decisionToClear = null;

  function clearDecision(input) {
    input.checked = false;
    stageEdit(input.closest('[data-task-id]').dataset.taskId, { decision: '' });
  }

  function decisionInputFrom(target) {
    const option = target.closest?.('.decision-option');
    return option ? option.querySelector('input[data-field="decision"]') : null;
  }

  taskGroups.addEventListener('pointerdown', event => {
    const input = decisionInputFrom(event.target);
    decisionToClear = input && input.checked ? input : null;
  });

  // Make a subtask a chore of its own: out of its main chore for good (until
  // moved back), and -- if it has no owner of its own -- into the Assignments
  // parking lot, ready to assign. Its card shows straight away in the room.
  function splitSubtask(id) {
    const task = findTask(id);
    const parentId = parentOf.get(id);
    if (!task || !parentId) return;
    const parent = findTask(parentId);
    extras.standalone[id] = true;
    delete extras.parents[id];
    const custom = extras.customTasks.find(item => item.id === id);
    if (custom) custom.parent = null;
    const review = taskState(id);
    const owner = review.newOwner.trim();
    if (!owner) state[id] = { ...review, assignable: true };
    openSubtaskPanels.add(parentId);
    rebuildSections();
    persistState();
    renderSection();
    updateProgress();
    const card = taskGroups.querySelector(`.task-list > [data-task-id="${CSS.escape(id)}"]`);
    card?.scrollIntoView({ block: 'center' });
    card?.classList.add('just-split');
    const where = owner ? `It keeps its owner, ${splitOwners(owner).map(ownerLabel).join(' and ')}.` : "It's in the Assignments parking lot, ready to assign.";
    const gone = findTask(parentId) ? '' : ` “${parent.title}” had only one part left, so that part is a chore of its own too.`;
    showToast(`“${task.title}” is now a chore of its own. ${where}${gone}`);
  }

  function unsplitSubtask(id) {
    const task = findTask(id);
    if (!task) return;
    delete extras.standalone[id];
    rebuildSections();
    persistState();
    const parentId = parentOf.get(id);
    if (parentId) openSubtaskPanels.add(parentId);
    renderSection();
    updateProgress();
    showToast(parentId
      ? `“${task.title}” is back in “${findTask(parentId).title}”.`
      : `“${task.title}” will join its room's weekly chore once there are two weekly chores to group.`);
  }

  // Remember which subtask panels are open, so they stay open when the room
  // redraws. `toggle` doesn't bubble, so listen while it travels down.
  taskGroups.addEventListener('toggle', event => {
    const panel = event.target.closest?.('[data-subtasks-of]');
    if (!panel || event.target !== panel) return;
    if (panel.open) openSubtaskPanels.add(panel.dataset.subtasksOf);
    else openSubtaskPanels.delete(panel.dataset.subtasksOf);
  }, true);

  taskGroups.addEventListener('submit', event => {
    const form = event.target.closest('[data-add-subtask]');
    if (!form) return;
    event.preventDefault();
    const parent = findTask(form.dataset.addSubtask);
    const titleText = form.elements.title.value.trim();
    if (!parent || !titleText) return;
    const cadence = form.elements.cadence.value.trim() || parent.cadence;
    extras.customTasks.push({
      id: newId('custom'),
      sectionId: sectionFor(parent).id,
      frequency: frequencyForCadence(cadence),
      title: titleText,
      cadence,
      standard: '',
      sourceNote: '',
      currentOwner: '',
      checklist: [],
      effort: null,
      parent: parent.id,
      custom: true,
      createdAt: new Date().toISOString()
    });
    openSubtaskPanels.add(parent.id);
    rebuildSections();
    persistState();
    renderSection();
    updateProgress();
    taskGroups.querySelector(`[data-add-subtask="${CSS.escape(parent.id)}"] [name="title"]`)?.focus();
    showToast(`Added “${titleText}” to “${parent.title}”.`);
  });

  // Act on the input's own click, not the label's. A click on the label
  // bubbles first, then the label forwards it to the input -- and that
  // forwarded activation would re-check the radio and fire `change`, putting
  // the decision straight back. The forwarded click is last, so clearing there
  // is the only point nothing undoes.
  taskGroups.addEventListener('click', event => {
    const rename = event.target.closest('[data-rename]');
    if (rename) { event.preventDefault(); startRename(rename); return; }
    const deleteButton = event.target.closest('[data-delete-task]');
    if (deleteButton) { deleteCustomTask(deleteButton.dataset.deleteTask); return; }
    // A subtask's Remove / Restore (and their Undo) wait for Submit changes.
    const remove = event.target.closest('[data-remove-subtask]');
    const restore = event.target.closest('[data-restore-subtask]');
    if (remove || restore) {
      const id = (remove || restore).dataset[remove ? 'removeSubtask' : 'restoreSubtask'];
      const parentId = parentOf.get(id);
      if (parentId) openSubtaskPanels.add(parentId);
      stageEdit(id, { decision: remove ? 'remove' : 'keep' });
      renderSection();
      return;
    }
    const split = event.target.closest('[data-split-subtask]');
    if (split) { splitSubtask(split.dataset.splitSubtask); return; }
    const unsplit = event.target.closest('[data-unsplit-subtask]');
    if (unsplit) { unsplitSubtask(unsplit.dataset.unsplitSubtask); return; }
    const toggleRemoved = event.target.closest('[data-toggle-removed]');
    if (toggleRemoved) {
      const id = toggleRemoved.dataset.toggleRemoved;
      if (showRemovedFor.has(id)) showRemovedFor.delete(id); else showRemovedFor.add(id);
      openSubtaskPanels.add(id);
      renderSection();
      taskGroups.querySelector(`[data-toggle-removed="${CSS.escape(id)}"]`)?.focus();
      return;
    }
    if (event.target.closest('[data-go-awards]')) { showView('awards'); return; }
    const input = event.target;
    if (input.dataset?.field !== 'decision' || input !== decisionToClear) return;
    decisionToClear = null;
    clearDecision(input);
  });

  // Keyboard equivalent: arrow keys move through the group natively, and Space
  // on the selected option clears it the same way a click does.
  taskGroups.addEventListener('keydown', event => {
    if (event.key !== ' ' && event.key !== 'Spacebar') return;
    const input = event.target;
    if (input.dataset?.field !== 'decision' || !input.checked) return;
    event.preventDefault();
    clearDecision(input);
  });

  // ---- Add a task ----

  const addTaskButton = document.querySelector('#addTaskButton');
  const addTaskDialog = document.querySelector('#addTaskDialog');
  const addTaskForm = document.querySelector('#addTaskForm');
  const addTaskRoom = document.querySelector('#addTaskRoom');
  const addTaskOwners = document.querySelector('#addTaskOwners');

  // Subtasks in the form: existing chores ticked to pull in -- kept in
  // pulledIds, so a tick survives changing the room filter or the search --
  // and rows for brand-new subtasks.
  const pullList = document.querySelector('#pullList');
  const pullRoom = document.querySelector('#pullRoom');
  const pullSearch = document.querySelector('#pullSearch');
  const newSubtasks = document.querySelector('#newSubtasks');
  const pulledIds = new Set();

  // What can become a subtask: a kept chore of its own that has no subtasks
  // itself and isn't a trigger chore or handled by an award.
  function pullable(task) {
    return taskState(task.id).decision !== 'remove' && taskState(task.id).paid !== true
      && !subtasksOf.has(task.id) && !task.weeklyRoom && !task.trigger && !awardForTask(task);
  }

  function renderPullList() {
    const words = pullSearch.value.trim().toLowerCase();
    const rooms = pullRoom.value ? sections.filter(section => section.id === pullRoom.value) : sections;
    const choices = rooms.flatMap(section => section.tasks.filter(pullable).map(task => ({ task, section })))
      .filter(({ task, section }) => !words || `${task.title} ${section.name} ${roomTag(section)}`.toLowerCase().includes(words));
    pullList.innerHTML = choices.length
      ? choices.map(({ task, section }) => `<label class="pull-item"><input type="checkbox" value="${task.id}" ${pulledIds.has(task.id) ? 'checked' : ''}>
          <span>${taskTitleHtml(task, section)}</span><small>${escapeHtml(task.cadence || task.frequency)} · ≈ ${escapeHtml(formatMinutes(workload(task)))}/mo</small></label>`).join('')
      : '<p class="board-empty">No chores match.</p>';
    document.querySelector('#pullCount').textContent = pulledIds.size ? `· ${pulledIds.size} ticked` : '';
  }

  function addSubtaskRow() {
    newSubtasks.insertAdjacentHTML('beforeend', `<div class="new-subtask">
      <label><span class="visually-hidden">New subtask</span><input class="text-input" data-sub-title placeholder="e.g. Wipe light switches" autocomplete="off"></label>
      <label><span class="visually-hidden">Its cadence</span><input class="text-input" data-sub-cadence list="cadenceOptions" placeholder="Cadence (blank: same as the chore)" autocomplete="off"></label>
      <button type="button" class="chip chip-quiet" data-sub-remove>Remove</button>
    </div>`);
    newSubtasks.lastElementChild.querySelector('[data-sub-title]').focus();
  }

  // Pulling in a master-suite or office chore makes the new chore Michael-or-
  // Kim only, the same as choosing one of those rooms.
  function addTaskAllowedOwners() {
    const adultsOnly = adultsOnlySections.has(addTaskRoom.value)
      || [...pulledIds].some(id => { const task = findTask(id); return task && inAdultsOnlyRoom(task); });
    return adultsOnly ? ['Kimberly', 'Michael'] : rosterNames;
  }

  function renderAddTaskOwners() {
    const picked = [...addTaskOwners.querySelectorAll('input:checked')].map(box => box.value);
    const allowed = addTaskAllowedOwners();
    addTaskOwners.innerHTML = ownerChecks(picked.filter(name => allowed.includes(name)), allowed, 'name="owners"');
  }

  // One-off: the form trades the cadence, flags, checklist and subtasks for a
  // list of days, and owners become required.
  const addTaskOneOff = document.querySelector('#addTaskOneOff');
  const oneOffDayList = document.querySelector('#oneOffDayList');

  function addOneOffDay(value = '') {
    oneOffDayList.insertAdjacentHTML('beforeend', `<div class="one-off-day">
      <label><span class="visually-hidden">Day</span><input class="text-input" type="date" data-one-off-day value="${escapeHtml(value)}"></label>
      <button type="button" class="chip chip-quiet" data-day-remove>Remove</button>
    </div>`);
  }

  function syncOneOffForm() {
    const oneOff = addTaskOneOff.checked;
    addTaskForm.classList.toggle('is-one-off', oneOff);
    addTaskForm.elements.cadence.required = !oneOff;
    document.querySelector('#addTaskHint').textContent = oneOff
      ? 'A one-off needs a title, at least one day and at least one owner.'
      : 'Only the title and cadence are required.';
    document.querySelector('#addTaskSubmit').textContent = oneOff ? 'Add one-off' : 'Add task';
    if (oneOff && !oneOffDayList.children.length) addOneOffDay(isoOf(todayNumber()));
  }

  addTaskOneOff.addEventListener('change', syncOneOffForm);
  document.querySelector('#addOneOffDay').addEventListener('click', () => {
    addOneOffDay();
    oneOffDayList.lastElementChild.querySelector('input').focus();
  });
  oneOffDayList.addEventListener('click', event => {
    if (event.target.closest('[data-day-remove]')) event.target.closest('.one-off-day').remove();
  });

  function addOneOff(form, text) {
    const allowed = addTaskAllowedOwners();
    const owners = form.getAll('owners').filter(name => allowed.includes(name));
    const days = [...new Set([...oneOffDayList.querySelectorAll('[data-one-off-day]')].map(input => input.value).filter(Boolean))].sort();
    if (!days.length) { showToast('Pick at least one day for the one-off.'); return; }
    if (!owners.length) { showToast('Tick at least one owner for the one-off.'); return; }
    const entry = {
      id: newId('oneoff'),
      sectionId: text('sectionId'),
      title: text('title'),
      standard: text('standard'),
      notes: text('notes'),
      owners,
      days,
      effort: Number(text('effort')) || null,
      createdAt: new Date().toISOString()
    };
    extras.oneOffs.push(entry);
    rebuildSections();
    persistState();
    addTaskDialog.close();
    const when = days.map(day => formatDay(dayFromIso(day), { weekday: 'short', month: 'short', day: 'numeric' })).join(', ');
    showToast(`One-off “${entry.title}” is on the calendar for ${owners.map(ownerLabel).join(' and ')}: ${when}.`);
  }

  addTaskButton.addEventListener('click', () => {
    addTaskForm.reset();
    oneOffDayList.innerHTML = '';
    syncOneOffForm();
    addTaskRoom.innerHTML = sections.map(section => `<option value="${section.id}" ${section.id === activeSection ? 'selected' : ''}>${escapeHtml(section.name)}</option>`).join('');
    pulledIds.clear();
    newSubtasks.innerHTML = '';
    pullRoom.innerHTML = '<option value="">All rooms</option>' + sections.map(section => `<option value="${section.id}">${escapeHtml(section.name)}</option>`).join('');
    pullRoom.value = activeSection;
    renderPullList();
    addTaskOwners.innerHTML = '';
    renderAddTaskOwners();
    addTaskDialog.showModal();
    addTaskForm.elements.title.focus();
  });
  addTaskRoom.addEventListener('change', () => {
    pullRoom.value = addTaskRoom.value;
    renderPullList();
    renderAddTaskOwners();
  });
  pullRoom.addEventListener('change', renderPullList);
  pullSearch.addEventListener('input', renderPullList);
  pullList.addEventListener('change', event => {
    const box = event.target.closest('input[type="checkbox"]');
    if (!box) return;
    if (box.checked) pulledIds.add(box.value); else pulledIds.delete(box.value);
    document.querySelector('#pullCount').textContent = pulledIds.size ? `· ${pulledIds.size} ticked` : '';
    renderAddTaskOwners();
  });
  document.querySelector('#addSubtaskRow').addEventListener('click', addSubtaskRow);
  newSubtasks.addEventListener('click', event => {
    if (event.target.closest('[data-sub-remove]')) event.target.closest('.new-subtask').remove();
  });
  document.querySelector('#addTaskCancel').addEventListener('click', () => addTaskDialog.close());

  addTaskForm.addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(addTaskForm);
    const text = name => String(form.get(name) ?? '').trim();
    if (form.get('oneOff') === 'on') { if (text('title')) addOneOff(form, text); return; }
    const sectionId = text('sectionId');
    const allowed = addTaskAllowedOwners();
    const task = {
      id: newId('custom'),
      sectionId,
      frequency: frequencyForCadence(text('cadence')),
      title: text('title'),
      cadence: text('cadence'),
      standard: text('standard'),
      sourceNote: '',
      currentOwner: '',
      checklist: text('checklist').split(/\r?\n/).map(line => line.trim()).filter(Boolean),
      effort: Number(text('effort')) || null,
      standing: form.get('standing') === 'on',
      custom: true,
      createdAt: new Date().toISOString()
    };
    if (!task.title || !task.cadence) return;
    extras.customTasks.push(task);
    state[task.id] = {
      decision: '',
      newOwner: joinOwners(form.getAll('owners').filter(name => allowed.includes(name))),
      notes: text('notes'),
      assignable: form.get('assignable') === 'on',
      paid: form.get('paid') === 'on',
      startOn: form.get('standing') === 'on' ? '' : text('startOn')
    };
    // Subtasks: chores pulled in from the list, then new ones. A new subtask
    // with no cadence of its own comes around with the chore.
    const pulled = [...pulledIds].filter(id => { const found = findTask(id); return found && pullable(found); });
    for (const id of pulled) extras.parents[id] = task.id;
    const created = [...newSubtasks.querySelectorAll('.new-subtask')]
      .map(row => ({ title: row.querySelector('[data-sub-title]').value.trim(), cadence: row.querySelector('[data-sub-cadence]').value.trim() || task.cadence }))
      .filter(row => row.title)
      .map(row => ({
        id: newId('custom'),
        sectionId,
        frequency: frequencyForCadence(row.cadence),
        title: row.title,
        cadence: row.cadence,
        standard: '',
        sourceNote: '',
        currentOwner: '',
        checklist: [],
        effort: null,
        parent: task.id,
        custom: true,
        createdAt: task.createdAt
      }));
    extras.customTasks.push(...created);
    rebuildSections();
    persistState();
    addTaskDialog.close();
    activeSection = sectionId;
    renderNav();
    renderSection();
    updateProgress();
    const card = taskGroups.querySelector(`[data-task-id="${task.id}"]`);
    card?.scrollIntoView({ block: 'center' });
    const subs = pulled.length + created.length;
    const starts = state[task.id].startOn ? ` It starts on the calendar ${formatDay(dayFromIso(state[task.id].startOn), { weekday: 'short', month: 'short', day: 'numeric' })}.` : '';
    showToast(`Added “${task.title}”${subs ? ` with ${subs} subtask${subs === 1 ? '' : 's'}` : ''} to ${sectionFor(task).name}.${starts}`);
  });

  // Deleting a chore added in the app also deletes the subtasks that were
  // created with it; chores that were pulled in from the list go back to being
  // chores of their own.
  function deleteCustomTask(taskId) {
    const task = extras.customTasks.find(item => item.id === taskId);
    if (!task) return;
    const created = extras.customTasks.filter(item => item.parent === taskId);
    const pulled = Object.keys(extras.parents).filter(child => extras.parents[child] === taskId);
    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
    const message = [
      `Delete “${task.title}”${created.length ? ` and the ${plural(created.length, 'subtask')} created with it` : ''}?`,
      pulled.length ? `The ${plural(pulled.length, 'chore')} pulled into it will be ${pulled.length === 1 ? 'a chore' : 'chores'} of ${pulled.length === 1 ? 'its' : 'their'} own again.` : '',
      'This cannot be undone.'
    ].filter(Boolean).join('\n\n');
    if (!window.confirm(message)) return;
    for (const id of [taskId, ...created.map(item => item.id)]) {
      delete state[id];
      delete extras.calendar.pins[id];
      delete extras.calendar.moves[id];
    }
    extras.customTasks = extras.customTasks.filter(item => item.id !== taskId && item.parent !== taskId);
    for (const child of pulled) delete extras.parents[child];
    for (const id of [taskId, ...created.map(item => item.id)]) pendingEdits.delete(id);
    renderPendingBar();
    rebuildSections();
    persistState();
    renderSection();
    updateProgress();
    showToast('Task deleted.');
  }

  // ---- Home and Tasks by owner ----

  const openOwner = 'Open — needs an owner';

  // Who a task belongs to: the owner boxes ticked in the Gallery. Until a
  // chore's boxes have been set (`ownerSet`), the owner the catalog names
  // stands in -- and seedOwnersFromCatalog() ticks those boxes for it, so
  // after that the boxes alone decide, and clearing them all means nobody.
  // "Each child" and "Everyone" are spelled out as the people they cover, so a
  // household-wide chore counts once for each person -- on Home, in Tasks by
  // owner, on the Assignments board and on the Calendar alike, and their
  // totals always agree. A name that is not a person is kept as written.
  function ownersFor(task) {
    const item = taskState(task.id);
    const assigned = item.newOwner.trim();
    if (!assigned && item.assignable) return [openOwner];
    const named = assigned ? splitOwners(assigned) : item.ownerSet ? [] : catalogOwners(task);
    const owners = [
      ...householdMembers(named),
      ...named.filter(owner => !rosterValue(owner) && !/each child|everyone/i.test(owner))
    ];
    return owners.length ? owners : [openOwner];
  }

  // Ticks the owner boxes of every chore that has never had them set, with the
  // people its catalog owner names (as ownersFor reads them, so nobody's
  // totals change). Chores waiting in a parking lot and removed chores are
  // left alone. Runs whenever data loads, so chores added to the catalog later
  // get theirs too. True if anything changed.
  function seedOwnersFromCatalog() {
    let changed = false;
    const everyTask = [...allTasks, ...[...subtasksOf.values()].flat()];
    for (const task of everyTask) {
      if (task.weeklyRoom) continue;
      const item = taskState(task.id);
      if (item.ownerSet || item.decision === 'remove' || (item.assignable && !item.newOwner.trim())) continue;
      if (!item.newOwner.trim()) {
        const named = catalogOwners(task);
        const allowed = eligibleNames(task);
        const people = householdMembers(named).filter(name => allowed.includes(name));
        const written = named.filter(owner => !rosterValue(owner) && !/each child|everyone/i.test(owner));
        item.newOwner = joinOwners([...people, ...written]);
      }
      item.ownerSet = true;
      state[task.id] = item;
      changed = true;
    }
    return changed;
  }

  function catalogOwners(task) {
    const original = (task.currentOwner || '').replace(/\([^)]*\)/g, '');
    const names = new Set();
    for (const part of original.split(/\s*(?:\+|;|\bor\b|\band\b)\s*/i)) {
      const match = part.trim().match(/^(Kimberly|Michael|Brighton|Oliver|Ephraim)\b/);
      if (match) names.add(match[1]);
      if (/^Oliver\/Ephraim/.test(part.trim())) names.add('Ephraim');
      if (/^(each child|each child's)/i.test(part.trim())) names.add('Each child');
    }
    if (names.size) return [...names];
    if (!original || /no consistent/i.test(original)) return [];
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
    for (const section of sections) for (const task of section.tasks) {
      if (taskState(task.id).decision === 'remove') continue;
      for (const owner of ownersFor(task)) {
        const key = owner.toLocaleLowerCase();
        if (!groups.has(key)) groups.set(key, { name: owner, tasks: [] });
        groups.get(key).tasks.push({ task, section });
      }
    }
    // A member sees only their own chores.
    const shown = viewerIsAdmin() ? [...groups.values()] : [...groups.values()].filter(group => group.name === viewer().name);
    if (!shown.length) { root.innerHTML = '<p class="board-hidden-note">No chores for you right now.</p>'; return; }
    root.innerHTML = shown.sort((a, b) => a.name.localeCompare(b.name)).map(group =>
      `<details class="owner-group" data-owner="${escapeHtml(group.name)}" ${expanded.has(group.name) || !viewerIsAdmin() ? 'open' : ''}>
        <summary>${escapeHtml(group.name)} <span>${group.tasks.length} tasks</span></summary>
        <div class="owner-task-list">${group.tasks.map(({task, section}) => {
          const item = taskState(task.id);
          const open = item.assignable && !item.newOwner.trim();
          return `<article class="owner-task"><h3>${taskTitleHtml(task, section)} ${item.paid ? '<span class="paid-indicator">Paid</span>' : ''} ${open ? '<span class="assignable-indicator">Open · needs an owner</span>' : ''}</h3>
            <p>${escapeHtml(section.name)} · ${escapeHtml(task.cadence || task.frequency)}</p>
            <p>${escapeHtml(task.standard)}</p>${subtasksHtml(task)}<p><strong>Assignment:</strong> ${escapeHtml(item.newOwner.trim() || task.currentOwner || 'Open — needs an owner')}</p>
            ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}
            <button type="button" class="button" data-open-task="${task.id}" data-admin-only>Review task</button></article>`;
        }).join('')}</div></details>`).join('');
  }

  // ---- Assignment boards: chores and soft skills ----

  // Every chore is on the board. It sits under its New owner, or under the
  // catalog owner when no New owner is set -- the same rule as Tasks by owner,
  // so the two always agree. It waits in the parking lot when it is marked
  // assignable with no New owner, or nobody owns it at all. Removed tasks, and
  // tasks handled through a one-off award instead, are left off.
  function choreItems() {
    return allTasks.map(task => {
      const item = taskState(task.id);
      if (item.decision === 'remove' || awardForTask(task)) return null;
      // A name that is not a person shows under Others rather than being dropped.
      const owners = ownersFor(task).filter(owner => owner !== openOwner);
      const fromCatalog = !item.newOwner.trim() && owners.length > 0;
      const weight = workload(task);
      return {
        id: task.id,
        title: taskTitle(task),
        titleHtml: taskTitleHtml(task),
        meta: `${task.cadence || task.frequency} · ≈ ${formatMinutes(weight)}/mo${isStanding(task) ? ' · standing' : ''}${subtasksFor(task).length ? ` · ${subtasksFor(task).length} subtasks` : ''}${fromCatalog ? ' · catalog owner' : ''}`,
        task,
        weight,
        owners,
        paid: item.paid === true,
        eligible: eligibleNames(task),
        restricted: isAdultsOnly(task)
      };
    }).filter(Boolean);
  }

  function skillItems() {
    return allSoftSkills().map(skill => {
      const source = skill.fromTask ? allTasks.find(task => task.id === skill.fromTask) : null;
      return {
        id: skill.id,
        title: skill.title,
        meta: skill.fromNotes && source ? `From notes on ${taskTitle(source)}` : skill.description,
        metaHtml: skill.fromNotes && source ? `From notes on ${taskTitleHtml(source)}` : null,
        detail: skill.fromNotes ? skill.description : '',
        weight: 1,
        owners: extras.skillOwners[skill.id] || [],
        eligible: [...rosterNames],
        restricted: false,
        fromNotes: Boolean(skill.fromNotes),
        fromTask: skill.fromTask
      };
    });
  }

  // A shared chore splits its time between its owners. A shared soft skill is
  // an expectation each of them carries in full, so it counts whole for each.
  const boards = {
    chores: { root: () => document.querySelector('#choreBoard'), items: choreItems, unit: 'chore', units: 'chores', splitShared: true },
    skills: { root: () => document.querySelector('#skillBoard'), items: skillItems, unit: 'skill', units: 'skills', splitShared: false }
  };

  function shareOf(kind, item) {
    return boards[kind].splitShared ? item.weight / Math.max(item.owners.length, 1) : item.weight;
  }
  const boardSelected = { chores: null, skills: null };
  const boardFlash = { chores: null, skills: null };
  let lastAutoAssign = null;

  // The chores board has two parking lots on tabs: Chores (unpaid) and Paid.
  // Auto-assign hands out only the lot that is showing, and balances it on
  // its own -- unpaid work against unpaid work, paid jobs against paid jobs --
  // and each lane's time total follows the same tab.
  let lotCategory = 'unpaid';

  // Auto-assign gives paid jobs only to these two, split evenly between them,
  // whoever is ticked to show. Anyone can still be given a paid job by hand.
  const paidAutoAssignees = ['Oliver', 'Ephraim'];

  function inLotCategory(kind, item) {
    return kind !== 'chores' || item.paid === (lotCategory === 'paid');
  }

  function autoPool(kind) {
    return extras.autoPools[kind] ?? [...rosterNames];
  }

  function setOwners(kind, id, owners) {
    if (kind === 'chores') {
      // Taking the last owner off puts the chore back in the parking lot.
      const patch = { newOwner: joinOwners(owners) };
      if (!owners.length) patch.assignable = true;
      state[id] = { ...taskState(id), ...patch };
    } else {
      extras.skillOwners[id] = [...new Set(owners)];
    }
  }

  function ownedBy(item, name) {
    return item.owners.some(owner => rosterValue(owner) === name);
  }

  // A lane for each person ticked in the toolbar (the same people auto-assign
  // shares among), plus Others when a chore is owned by a name that isn't a
  // person.
  function boardColumns(items, shown) {
    const columns = ownerRoster.filter(owner => shown.includes(owner.value))
      .map(owner => ({ key: owner.value, label: owner.label, items: items.filter(item => ownedBy(item, owner.value)) }));
    const others = items.filter(item => item.owners.some(owner => !isRosterName(owner)));
    if (others.length) columns.push({ key: '_other', label: 'Others', items: others });
    return columns;
  }

  function cardHtml(kind, item, column) {
    const key = `${column}|${item.id}`;
    const open = boardSelected[kind] === key;
    const owners = column === '_other' ? `<span class="board-card-owners">${escapeHtml(item.owners.join(', '))}</span>` : '';
    const shared = column !== 'lot' && column !== '_other' && item.owners.length > 1
      ? `<span class="board-card-owners">Shared with ${escapeHtml(item.owners.filter(owner => rosterValue(owner) !== column).map(ownerLabel).join(', '))}</span>` : '';
    return `<li class="board-card${open ? ' is-open' : ''}${item.paid ? ' is-paid' : ''}${boardFlash[kind] === item.id ? ' just-moved' : ''}">
      <button type="button" class="board-card-main" data-act="select" data-key="${escapeHtml(key)}" aria-expanded="${open}">
        <span class="board-card-title">${item.titleHtml || escapeHtml(item.title)}</span>
        ${item.meta ? `<span class="board-card-meta">${item.metaHtml || escapeHtml(item.meta)}</span>` : ''}
        ${item.paid ? '<span class="board-card-tag is-paid">Paid</span>' : ''}
        ${owners}${shared}
      </button>
      ${open ? actionsHtml(kind, item, column) : ''}
    </li>`;
  }

  function actionsHtml(kind, item, column) {
    const chip = (act, name, style = '') => `<button type="button" class="chip ${style}" data-act="${act}" data-item="${escapeHtml(item.id)}" data-from="${escapeHtml(column)}" data-name="${escapeHtml(name)}">${escapeHtml(ownerLabel(name))}</button>`;
    const rule = item.restricted ? `<p class="board-rule">${escapeHtml(adultsOnlyRule)}</p>` : '';
    const detail = (item.detail ? `<p class="board-detail">${escapeHtml(item.detail)}</p>` : '') + (item.task ? subtasksHtml(item.task) : '');
    const tools = [];
    if (kind === 'chores') tools.push(`<button type="button" class="chip chip-quiet" data-act="open" data-item="${escapeHtml(item.id)}">Open in Gallery</button>`);
    if (kind === 'skills' && item.fromNotes) tools.push(`<button type="button" class="chip chip-quiet" data-act="open" data-item="${escapeHtml(item.fromTask)}">Open the task</button>`);
    if (kind === 'skills' && !item.fromNotes) tools.push(`<button type="button" class="chip chip-danger" data-act="delete-skill" data-item="${escapeHtml(item.id)}">Delete skill</button>`);

    if (column === 'lot' || column === '_other') {
      return `<div class="board-actions">${detail}
        <p class="board-actions-label">Assign to</p>
        <div class="chip-row">${item.eligible.map(name => chip('assign', name, 'chip-primary')).join('')}</div>${rule}
        <div class="chip-row">${column === '_other' ? `<button type="button" class="chip chip-quiet" data-act="unassign" data-item="${escapeHtml(item.id)}" data-from="_other">Back to parking lot</button>` : ''}${tools.join('')}</div>
      </div>`;
    }
    const others = item.eligible.filter(name => !ownedBy(item, name));
    return `<div class="board-actions">${detail}
      ${others.length ? `<p class="board-actions-label">Move to</p><div class="chip-row">${others.map(name => chip('move', name, 'chip-primary')).join('')}</div>
      <p class="board-actions-label">Share with</p><div class="chip-row">${others.map(name => chip('share', name)).join('')}</div>` : ''}${rule}
      <div class="chip-row"><button type="button" class="chip chip-quiet" data-act="unassign" data-item="${escapeHtml(item.id)}" data-from="${escapeHtml(column)}">Back to parking lot</button>${tools.join('')}</div>
    </div>`;
  }

  function renderBoard(kind) {
    const board = boards[kind];
    const root = board.root();
    const lotScroll = root.querySelector('.parking-lot .board-list')?.scrollTop ?? 0;
    const items = board.items();
    const waiting = items.filter(item => !item.owners.length);
    const lot = waiting.filter(item => inLotCategory(kind, item));
    const paidLot = kind === 'chores' && lotCategory === 'paid';
    const pool = autoPool(kind);
    const columns = boardColumns(items, pool);
    const loads = columns.map(column => column.items.filter(item => inLotCategory(kind, item)).reduce((sum, item) => sum + shareOf(kind, item), 0));
    const maxLoad = Math.max(1, ...loads);
    const describe = (column, load) => {
      const count = `${column.items.length} ${column.items.length === 1 ? board.unit : board.units}`;
      if (kind !== 'chores') return escapeHtml(count);
      const paid = column.items.filter(item => item.paid).length;
      return `${escapeHtml(count)}${paid ? ` · ${paid} paid` : ''}<br><small>≈ ${escapeHtml(formatMinutes(load))}/mo ${paidLot ? 'paid' : 'unpaid'}</small>`;
    };
    const undo = lastAutoAssign?.kind === kind
      ? `<button type="button" class="button button-quiet button-small" data-act="undo-auto">Undo auto-assign (${lastAutoAssign.changes.length}${lastAutoAssign.category === 'paid' ? ' paid' : ''})</button>` : '';
    const lotTabs = kind === 'chores'
      ? `<div class="lot-tabs" role="group" aria-label="Which parking lot">${[['unpaid', 'Chores'], ['paid', 'Paid']].map(([value, label]) => {
          const count = waiting.filter(item => item.paid === (value === 'paid')).length;
          return `<button type="button" class="lot-tab${value === 'paid' ? ' is-paid' : ''}" data-lot-tab="${value}" aria-pressed="${lotCategory === value}">${label} <span>${count}</span></button>`;
        }).join('')}</div>`
      : '';

    root.innerHTML = `<div class="board-toolbar">
        <fieldset class="pool-picker"><legend>Show and auto-assign to</legend>
          ${ownerRoster.map(owner => `<label><input type="checkbox" data-pool="${owner.value}" ${pool.includes(owner.value) ? 'checked' : ''}>${escapeHtml(owner.label)}</label>`).join('')}
        </fieldset>
        ${undo}
        ${kind === 'chores' ? `<p class="board-rule-note">${escapeHtml(adultsOnlyRule)} Kids never get office tasks. <span class="paid-key">Paid</span> chores have a blue edge.</p>` : ''}
      </div>
      <div class="board">
        <div class="board-people" style="--lanes:${Math.max(columns.length, 1)}">${columns.length ? '' : '<p class="board-hidden-note">Tick a name above to see their lane.</p>'}${columns.map((column, index) => `<section class="person-col" aria-label="${escapeHtml(column.label)}">
          <header><h3>${escapeHtml(column.label)}</h3><p>${describe(column, loads[index])}</p>
            ${kind === 'chores' ? `<div class="load-bar" aria-hidden="true"><span style="width:${(loads[index] / maxLoad * 100).toFixed(1)}%"></span></div>` : ''}</header>
          <ul class="board-list">${column.items.length ? column.items.map(item => cardHtml(kind, item, column.key)).join('') : `<li class="board-empty">No ${board.units} yet.</li>`}</ul>
        </section>`).join('')}</div>
        <aside class="parking-lot${paidLot ? ' is-paid' : ''}" aria-label="${paidLot ? 'Paid parking lot' : 'Parking lot'}">
          <header>${lotTabs}<div><h3>${paidLot ? 'Paid parking lot' : 'Parking lot'}</h3><p>${lot.length} waiting</p></div>
            <button type="button" class="button button-solid" data-act="auto" ${lot.length ? '' : 'disabled'}>Auto-assign ${lot.length ? `all ${lot.length}${paidLot ? ' paid' : ''}` : ''}</button>
            ${paidLot ? `<p class="lot-note">Auto-assign splits paid jobs evenly between ${paidAutoAssignees.map(ownerLabel).join(' and ')}. Tap a job to give it to anyone.</p>${paidBalanceHtml()}` : ''}</header>
          <ul class="board-list">${lot.length ? lot.map(item => cardHtml(kind, item, 'lot')).join('') : `<li class="board-empty">${paidLot ? 'No paid jobs waiting.' : `Nothing waiting. Every ${board.unit} has an owner.`}</li>`}</ul>
        </aside>
      </div>`;
    const list = root.querySelector('.parking-lot .board-list');
    if (list) list.scrollTop = lotScroll;
    boardFlash[kind] = null;
  }

  // ---- Keeping Oliver's and Ephraim's paid work even ----

  // Each one's paid work, in estimated minutes a month (a job they share
  // counts half for each, as on the board).
  function paidLoads(items = choreItems()) {
    const loads = new Map(paidAutoAssignees.map(name => [name, 0]));
    for (const item of items) {
      if (!item.paid) continue;
      for (const owner of item.owners) {
        const name = rosterValue(owner);
        if (loads.has(name)) loads.set(name, loads.get(name) + shareOf('chores', item));
      }
    }
    return loads;
  }

  // The fewest moves (or swaps) of paid jobs one of them does alone that bring
  // their monthly times closest together. Jobs either could do only.
  function paidBalancePlan() {
    const [a, b] = paidAutoAssignees;
    const items = choreItems();
    const loads = paidLoads(items);
    const solo = items.filter(item => item.paid && item.owners.length === 1 && paidAutoAssignees.includes(rosterValue(item.owners[0]))
      && item.eligible.includes(a) && item.eligible.includes(b));
    const owner = new Map(solo.map(item => [item.id, rosterValue(item.owners[0])]));
    const moves = [];
    for (let step = 0; step < 30; step++) {
      const heavy = loads.get(a) >= loads.get(b) ? a : b;
      const light = heavy === a ? b : a;
      const gap = loads.get(heavy) - loads.get(light);
      let best = null;
      for (const item of solo) {
        if (owner.get(item.id) !== heavy) continue;
        const after = Math.abs(gap - 2 * item.weight);
        if (after < gap - 1 && (!best || after < best.after)) best = { after, give: item, take: null };
        for (const other of solo) {
          if (owner.get(other.id) !== light) continue;
          const swapped = Math.abs(gap - 2 * (item.weight - other.weight));
          if (swapped < gap - 1 && (!best || swapped < best.after - 1)) best = { after: swapped, give: item, take: other };
        }
      }
      if (!best) break;
      owner.set(best.give.id, light);
      loads.set(heavy, loads.get(heavy) - best.give.weight);
      loads.set(light, loads.get(light) + best.give.weight);
      moves.push({ item: best.give, from: heavy, to: light });
      if (best.take) {
        owner.set(best.take.id, heavy);
        loads.set(light, loads.get(light) - best.take.weight);
        loads.set(heavy, loads.get(heavy) + best.take.weight);
        moves.push({ item: best.take, from: light, to: heavy });
      }
    }
    // A job moved there and back again is not a move.
    const net = new Map();
    for (const move of moves) {
      const first = net.get(move.item.id);
      net.set(move.item.id, { item: move.item, from: first ? first.from : move.from, to: move.to });
    }
    return { before: paidLoads(items), after: loads, moves: [...net.values()].filter(move => move.from !== move.to) };
  }

  function paidBalanceHtml() {
    const [a, b] = paidAutoAssignees;
    const loads = paidLoads();
    const gap = Math.abs(loads.get(a) - loads.get(b));
    const total = loads.get(a) + loads.get(b);
    const even = gap <= Math.max(30, total * 0.03);
    return `<p class="lot-note paid-balance">${escapeHtml(ownerLabel(a))} ≈ ${escapeHtml(formatMinutes(loads.get(a)))}/mo · ${escapeHtml(ownerLabel(b))} ≈ ${escapeHtml(formatMinutes(loads.get(b)))}/mo of paid work${even ? ' (even)' : ''}</p>
      <button type="button" class="button button-quiet button-small" data-act="balance-paid" ${even ? 'disabled' : ''}>Balance ${escapeHtml(ownerLabel(a))} &amp; ${escapeHtml(ownerLabel(b))}</button>`;
  }

  function balancePaid() {
    const [a, b] = paidAutoAssignees;
    const plan = paidBalancePlan();
    if (!plan.moves.length) { showToast(`${ownerLabel(a)} and ${ownerLabel(b)} are as even as moving paid jobs can make them.`); return; }
    const hours = loads => `${ownerLabel(a)} ${formatMinutes(loads.get(a))}/mo, ${ownerLabel(b)} ${formatMinutes(loads.get(b))}/mo`;
    const list = plan.moves.map(move => `• ${move.item.title}: ${ownerLabel(move.from)} → ${ownerLabel(move.to)}`).join('\n');
    if (!window.confirm(`Even out paid work by estimated time?\n\nNow: ${hours(plan.before)}\nAfter: ${hours(plan.after)}\n\n${list}\n\nUndo is on the board afterwards.`)) return;
    const changes = plan.moves.map(move => ({ id: move.item.id, name: move.to, before: { ...taskState(move.item.id) } }));
    for (const move of plan.moves) setOwners('chores', move.item.id, [move.to]);
    lastAutoAssign = { kind: 'chores', category: 'paid', changes };
    saveBoardChange('chores');
    showToast(`Moved ${plan.moves.length} paid job${plan.moves.length === 1 ? '' : 's'}. Now ${hours(plan.after)}.`);
  }

  function saveBoardChange(kind) {
    queueSave();
    if (kind === 'chores') updateProgress();
    renderBoard(kind);
  }

  // Auto-assign hands out the parking lot so the estimated monthly time stays
  // as even as it can across the people in the pool. The most restricted
  // chores go first (the master-suite and office ones can only go to two
  // people), then the biggest, each to whoever currently has the least.
  // Chores people already have count toward their total. Soft skills have no
  // cadence, so there each one counts the same. Paid jobs go only to Oliver
  // and Ephraim, balanced against the paid jobs they already have.
  function autoAssign(kind) {
    // Only the lot that is showing, balanced against the same kind of work.
    const items = boards[kind].items().filter(item => inLotCategory(kind, item));
    const category = kind === 'chores' ? lotCategory : null;
    const pool = category === 'paid' ? paidAutoAssignees : autoPool(kind);
    if (!pool.length) { showToast('Tick at least one person to share the work.'); return; }
    const load = new Map(pool.map(name => [name, { weight: 0, count: 0 }]));
    for (const item of items) for (const owner of item.owners) {
      const entry = load.get(rosterValue(owner));
      if (entry) { entry.weight += shareOf(kind, item); entry.count++; }
    }
    const lot = items.filter(item => !item.owners.length)
      .map(item => ({ item, choices: item.eligible.filter(name => load.has(name)) }))
      .sort((a, b) => a.choices.length - b.choices.length || b.item.weight - a.item.weight);
    const changes = [];
    let skipped = 0;
    for (const { item, choices } of lot) {
      if (!choices.length) { skipped++; continue; }
      const pick = choices.reduce((best, name) => {
        const a = load.get(name), b = load.get(best);
        return a.weight < b.weight - 1e-9 || (Math.abs(a.weight - b.weight) <= 1e-9 && a.count < b.count) ? name : best;
      });
      load.get(pick).weight += item.weight;
      load.get(pick).count++;
      changes.push({ id: item.id, name: pick, before: kind === 'chores' ? { ...taskState(item.id) } : [...item.owners] });
      setOwners(kind, item.id, [pick]);
    }
    lastAutoAssign = changes.length ? { kind, category, changes } : null;
    boardSelected[kind] = null;
    saveBoardChange(kind);
    const why = category === 'paid'
      ? `${paidAutoAssignees.map(ownerLabel).join(' and ')} can't take master-suite or office jobs. Tap one to give it to Michael or Kim.`
      : 'nobody ticked can take them.';
    const left = skipped ? ` ${skipped} stayed in the parking lot: ${why}` : '';
    const what = category === 'paid' ? 'paid jobs' : boards[kind].units;
    showToast(changes.length ? `Assigned ${changes.length} ${what}.${left} Tap any one to move it.` : `Nothing assigned.${left}`);
  }

  function undoAutoAssign(kind) {
    if (lastAutoAssign?.kind !== kind) return;
    const items = new Map(boards[kind].items().map(item => [item.id, item]));
    let restored = 0;
    for (const change of lastAutoAssign.changes) {
      const item = items.get(change.id);
      // Leave anything moved by hand since then alone.
      if (!item || item.owners.length !== 1 || rosterValue(item.owners[0]) !== change.name) continue;
      if (kind === 'chores') state[change.id] = change.before;
      else extras.skillOwners[change.id] = change.before;
      restored++;
    }
    lastAutoAssign = null;
    saveBoardChange(kind);
    showToast(`Put ${restored} back in the parking lot.`);
  }

  function boardAction(kind, button) {
    const act = button.dataset.act;
    if (act === 'auto') { autoAssign(kind); return; }
    if (act === 'balance-paid') { balancePaid(); return; }
    if (act === 'undo-auto') { undoAutoAssign(kind); return; }
    if (act === 'select') {
      boardSelected[kind] = boardSelected[kind] === button.dataset.key ? null : button.dataset.key;
      renderBoard(kind);
      boards[kind].root().querySelector(`[data-key="${CSS.escape(button.dataset.key)}"]`)?.focus();
      return;
    }
    if (act === 'open') { openTaskInRoom(button.dataset.item); return; }
    if (act === 'delete-skill') { deleteSkill(button.dataset.item); return; }

    const items = boards[kind].items();
    const item = items.find(entry => entry.id === button.dataset.item);
    if (!item) return;
    const name = button.dataset.name;
    const from = button.dataset.from;
    if (name && !item.eligible.includes(name)) { showToast(adultsOnlyRule); return; }
    const without = item.owners.filter(owner => rosterValue(owner) !== from);

    let owners = item.owners;
    if (act === 'assign') owners = [name];
    else if (act === 'move') owners = [...without, name];
    else if (act === 'share') owners = [...item.owners, name];
    else if (act === 'unassign') owners = from === '_other' ? [] : without;
    else return;

    // Assigning from the parking lot moves straight on to the next item there,
    // so a run of chores can be handed out tap, tap, tap.
    let next = null;
    if (from === 'lot') {
      const lot = items.filter(entry => !entry.owners.length && inLotCategory(kind, entry));
      const index = lot.findIndex(entry => entry.id === item.id);
      next = lot[index + 1] || lot[index - 1] || null;
    }
    setOwners(kind, item.id, owners);
    boardFlash[kind] = item.id;
    boardSelected[kind] = next ? `lot|${next.id}` : null;
    saveBoardChange(kind);
    if (next) boards[kind].root().querySelector(`[data-key="${CSS.escape(`lot|${next.id}`)}"]`)?.focus({ preventScroll: true });
    const verb = act === 'unassign' ? 'Back in the parking lot' : act === 'share' ? `Shared with ${ownerLabel(name)}` : `Assigned to ${ownerLabel(name)}`;
    showToast(`${verb}: ${item.title}`);
  }

  for (const kind of Object.keys(boards)) {
    const root = boards[kind].root();
    root.addEventListener('click', event => {
      const tab = event.target.closest('[data-lot-tab]');
      if (tab) {
        lotCategory = tab.dataset.lotTab;
        boardSelected[kind] = null;
        renderBoard(kind);
        root.querySelector(`[data-lot-tab="${lotCategory}"]`)?.focus();
        return;
      }
      const button = event.target.closest('[data-act]');
      if (button && !button.disabled) boardAction(kind, button);
    });
    root.addEventListener('change', event => {
      const box = event.target.closest('[data-pool]');
      if (!box) return;
      const pool = new Set(autoPool(kind));
      if (box.checked) pool.add(box.dataset.pool); else pool.delete(box.dataset.pool);
      extras.autoPools[kind] = rosterNames.filter(name => pool.has(name));
      queueSave();
      renderBoard(kind);
      root.querySelector(`[data-pool="${box.dataset.pool}"]`)?.focus();
    });
  }

  // ---- Soft skills page ----

  const addSkillForm = document.querySelector('#addSkillForm');
  addSkillForm.addEventListener('submit', event => {
    event.preventDefault();
    const titleText = addSkillForm.elements.title.value.trim();
    if (!titleText) return;
    const skill = { id: newId('skill'), title: titleText, description: addSkillForm.elements.description.value.trim(), fromTask: null };
    extras.softSkills.push(skill);
    extras.skillOwners[skill.id] = [];
    addSkillForm.reset();
    boardFlash.skills = skill.id;
    boardSelected.skills = `lot|${skill.id}`;
    saveBoardChange('skills');
    showToast('Soft skill added to the parking lot.');
  });

  function deleteSkill(id) {
    const skill = extras.softSkills.find(item => item.id === id);
    if (!skill || !window.confirm(`Delete the soft skill “${skill.title}”?`)) return;
    extras.softSkills = extras.softSkills.filter(item => item.id !== id);
    delete extras.skillOwners[id];
    boardSelected.skills = null;
    saveBoardChange('skills');
  }

  // ---- Awards ----

  const awardsRoot = document.querySelector('#awardsRoot');

  function sameMonth(iso, now = new Date()) {
    const date = new Date(iso);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  function renderAwards() {
    const openManage = awardsRoot.querySelector('.award-manage')?.open ?? false;
    const totals = ownerRoster.map(owner => {
      const entries = extras.awardLog.filter(entry => entry.person === owner.value);
      return {
        owner,
        month: entries.filter(entry => sameMonth(entry.at)).reduce((sum, entry) => sum + entry.points, 0),
        all: entries.reduce((sum, entry) => sum + entry.points, 0)
      };
    });
    const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
    const log = [...extras.awardLog].sort((a, b) => b.at.localeCompare(a.at));

    awardsRoot.innerHTML = `
      <div class="award-scores">${totals.map(({ owner, month, all }) => `<div class="award-score">
        <h3>${escapeHtml(owner.label)}</h3><strong>${month}</strong><span>points this month · ${all} all time</span></div>`).join('')}</div>

      <section class="awards-section"><h3>Give an award</h3>
        <div class="award-types">${extras.awardTypes.length ? extras.awardTypes.map(award => `<article class="award-type">
          <header><h4>${escapeHtml(award.title)}</h4><span class="points">+${award.points}</span></header>
          ${award.description ? `<p>${escapeHtml(award.description)}</p>` : ''}
          <div class="chip-row">${ownerRoster.map(owner => `<button type="button" class="chip" data-give="${escapeHtml(award.id)}" data-name="${owner.value}">${escapeHtml(owner.label)}</button>`).join('')}</div>
        </article>`).join('') : '<p class="board-empty">No awards yet. Add one under Edit the award list.</p>'}</div>
      </section>

      <section class="awards-section"><h3>Something else</h3>
        <form class="award-custom" id="customAwardForm" autocomplete="off">
          <label><span class="field-label">Who</span><select class="owner-select" name="person">${ownerRoster.map(owner => `<option value="${owner.value}">${escapeHtml(owner.label)}</option>`).join('')}</select></label>
          <label><span class="field-label">What for</span><input class="text-input" name="title" required pattern=".*\\S.*" placeholder="e.g. Helped a neighbor carry groceries"></label>
          <label><span class="field-label">Points</span><input class="text-input" name="points" type="number" min="0" max="1000" step="1" value="5" required></label>
          <button class="button button-solid" type="submit">Give award</button>
        </form>
      </section>

      <section class="awards-section"><h3>History</h3>
        ${log.length ? `<ol class="award-log">${log.map(entry => `<li>
          <time datetime="${escapeHtml(entry.at)}">${escapeHtml(dateFormat.format(new Date(entry.at)))}</time>
          <strong>${escapeHtml(ownerLabel(entry.person))}</strong>
          <span>${escapeHtml(entry.title)}</span>
          <span class="points">+${entry.points}</span>
          <button type="button" class="chip chip-quiet" data-remove-award="${escapeHtml(entry.id)}">Remove</button>
        </li>`).join('')}</ol>` : '<p class="board-empty">No awards given yet.</p>'}
      </section>

      <details class="award-manage" ${openManage ? 'open' : ''}><summary>Edit the award list</summary>
        <div class="award-manage-rows">
          ${extras.awardTypes.map(award => `<div class="award-manage-row" data-award-row="${escapeHtml(award.id)}">
            <input class="text-input" data-award-field="title" aria-label="Award name" value="${escapeHtml(award.title)}">
            <input class="text-input" data-award-field="points" aria-label="Points" type="number" min="0" max="1000" step="1" value="${award.points}">
            <input class="text-input" data-award-field="description" aria-label="Description" value="${escapeHtml(award.description)}" placeholder="Description (optional)">
            <button type="button" class="chip chip-danger" data-delete-award="${escapeHtml(award.id)}">Delete</button>
          </div>`).join('')}
          <form class="award-manage-row" id="newAwardForm" autocomplete="off">
            <input class="text-input" name="title" aria-label="New award name" placeholder="New award" required pattern=".*\\S.*">
            <input class="text-input" name="points" aria-label="Points" type="number" min="0" max="1000" step="1" value="5" required>
            <input class="text-input" name="description" aria-label="Description" placeholder="Description (optional)">
            <button type="submit" class="chip chip-primary">Add award</button>
          </form>
        </div>
      </details>`;
  }

  function giveAward(person, title, points, typeId = null) {
    extras.awardLog.push({ id: newId('given'), typeId, title, points: toPoints(points), person, at: new Date().toISOString() });
    queueSave();
    renderAwards();
    showToast(`${ownerLabel(person)} +${toPoints(points)}: ${title}`);
  }

  awardsRoot.addEventListener('click', event => {
    const give = event.target.closest('[data-give]');
    if (give) {
      const award = extras.awardTypes.find(item => item.id === give.dataset.give);
      if (award) giveAward(give.dataset.name, award.title, award.points, award.id);
      return;
    }
    const remove = event.target.closest('[data-remove-award]');
    if (remove) {
      extras.awardLog = extras.awardLog.filter(entry => entry.id !== remove.dataset.removeAward);
      queueSave();
      renderAwards();
      return;
    }
    const drop = event.target.closest('[data-delete-award]');
    if (drop) {
      const award = extras.awardTypes.find(item => item.id === drop.dataset.deleteAward);
      if (!award || !window.confirm(`Delete the award “${award.title}”? Awards already given stay in the history.`)) return;
      extras.awardTypes = extras.awardTypes.filter(item => item.id !== award.id);
      queueSave();
      renderAwards();
      renderSection();
    }
  });

  awardsRoot.addEventListener('change', event => {
    const field = event.target.dataset.awardField;
    const row = event.target.closest('[data-award-row]');
    if (!field || !row) return;
    const award = extras.awardTypes.find(item => item.id === row.dataset.awardRow);
    if (!award) return;
    if (field === 'title' && !event.target.value.trim()) { event.target.value = award.title; return; }
    award[field] = field === 'points' ? toPoints(event.target.value) : event.target.value.trim();
    queueSave();
    // An edit is committed as focus moves to the next field; put focus back
    // there after the redraw so tabbing through the list keeps working.
    const next = document.activeElement;
    const nextRow = next?.closest?.('[data-award-row]')?.dataset.awardRow;
    const nextField = next?.dataset?.awardField;
    renderAwards();
    renderSection();
    if (nextRow && nextField) awardsRoot.querySelector(`[data-award-row="${CSS.escape(nextRow)}"] [data-award-field="${nextField}"]`)?.focus();
  });

  awardsRoot.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target;
    const values = new FormData(form);
    const text = name => String(values.get(name) ?? '').trim();
    if (form.id === 'customAwardForm') {
      if (text('title')) giveAward(text('person'), text('title'), text('points'));
    } else if (form.id === 'newAwardForm') {
      if (!text('title')) return;
      extras.awardTypes.push({ id: newId('award'), title: text('title'), points: toPoints(text('points')), description: text('description'), taskId: null });
      queueSave();
      renderAwards();
    }
  });

  // ---- Calendar ----

  // Dates are handled as whole day numbers counted from a fixed Sunday, worked
  // out in UTC so a daylight-saving change can never make a day 23 or 25 hours
  // long and shift everything by one.
  const calendarEpoch = Date.UTC(2026, 0, 4);
  const dayMs = 86400000;
  const mod = (value, base) => ((value % base) + base) % base;

  function dayNumber(year, month, date) { return Math.round((Date.UTC(year, month, date) - calendarEpoch) / dayMs); }
  function dateParts(day) {
    const date = new Date(calendarEpoch + day * dayMs);
    return { y: date.getUTCFullYear(), m: date.getUTCMonth(), d: date.getUTCDate(), weekday: date.getUTCDay() };
  }
  function isoOf(day) {
    const { y, m, d } = dateParts(day);
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  function dayFromIso(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return dayNumber(y, m - 1, d);
  }
  function todayNumber() {
    const now = new Date();
    return dayNumber(now.getFullYear(), now.getMonth(), now.getDate());
  }
  // Months counted from January 2026, so "every 3 months" lines up across years.
  function monthNumber(year, month) { return (year - 2026) * 12 + month; }
  function monthParts(index) { return { y: 2026 + Math.floor(index / 12), m: mod(index, 12) }; }
  function daysInMonth(year, month) { return new Date(Date.UTC(year, month + 1, 0)).getUTCDate(); }
  function formatDay(day, options) {
    return new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', ...options }).format(new Date(calendarEpoch + day * dayMs));
  }
  function ordinal(n) {
    const tail = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
    return `${n}${tail}`;
  }

  // Chores with no regular date are always standing items (see isStanding).
  const irregularGroups = new Set(['As needed', 'As needed / product schedule', 'Trigger-based', 'Immediate / after use']);

  function calendarRate(task) {
    const rate = cadenceRate(task.cadence);
    if (rate !== null) return rate;
    if (irregularGroups.has(task.frequency)) return null;
    return frequencyRates[task.frequency] ?? null;
  }

  // Seasonal wording that names a time of year lands in that month.
  function fixedMonths(cadence) {
    const text = String(cadence ?? '').toLowerCase();
    const months = [];
    if (/spring/.test(text)) months.push(3);
    if (/summer/.test(text) && !/spring\/summer/.test(text)) months.push(5);
    if (/fall|autumn/.test(text)) months.push(9);
    if (/winter/.test(text) && !/fall\/winter/.test(text)) months.push(0);
    if (/before school/.test(text)) months.push(7);
    return months;
  }

  // How a chore repeats: one or more series, each either every N days or
  // every N months. "2-3x a week" is three weekly series two days apart.
  function seriesTemplate(task) {
    const rate = calendarRate(task);
    if (rate === null) return null;
    const months = fixedMonths(task.cadence);
    if (months.length && rate < 0.9) return months.map(month => ({ unit: 'month', every: 12, fixedMonth: month }));
    if (rate >= 20) return [{ unit: 'day', every: 1, daily: true }];
    if (rate >= 14) return [{ unit: 'day', every: 2 }];
    if (rate >= 8) return [0, 2, 4].map(step => ({ unit: 'day', every: 7, step }));
    if (rate >= 3.5) return [{ unit: 'day', every: 7 }];
    if (rate >= 2) return [{ unit: 'day', every: 14 }];
    if (rate >= 1.3) return [{ unit: 'day', every: 21 }];
    if (rate >= 0.9) return [{ unit: 'month', every: 1 }];
    if (rate >= 0.45) return [{ unit: 'month', every: 2 }];
    if (rate >= 0.24) return [{ unit: 'month', every: 3 }];
    if (rate >= 0.15) return [{ unit: 'month', every: 6 }];
    return [{ unit: 'month', every: 12 }];
  }

  // The people a chore shows under: its New owner, else the catalog owner --
  // the same rule as Tasks by owner and the Assignments board.
  function calendarOwners(task) {
    return householdMembers(ownersFor(task));
  }

  function calendarOwnerText(owners) {
    if (!owners.length) return 'Unassigned';
    if (owners.length === rosterNames.length) return 'Everyone';
    return owners.map(ownerLabel).join(' + ');
  }

  // Works out a date pattern for every chore. Pinned series (a day someone
  // chose) are placed first; the rest are spread so each person's estimated
  // minutes are as even as possible across the days of the week (weekly-ish
  // chores) or the days of the month (monthly and slower). The same data
  // always gives the same calendar, week after week.
  function buildSchedule() {
    const pins = extras.calendar.pins;
    const loads = new Map();
    const loadFor = bucket => {
      if (!loads.has(bucket)) loads.set(bucket, { days: new Array(42).fill(0), months: Array.from({ length: 12 }, () => new Array(32).fill(0)) });
      return loads.get(bucket);
    };
    // 42 days is a whole number of 7-, 14- and 21-day cycles.
    const addDays = (load, anchor, every, minutes) => { for (let slot = mod(anchor, every); slot < 42; slot += every) load.days[slot] += minutes; };
    const addMonths = (load, anchorMonth, every, date, minutes) => { for (let month = mod(anchorMonth, every); month < 12; month += every) load.months[month][date] += minutes; };

    const plans = allTasks
      .filter(task => taskState(task.id).decision !== 'remove' && !awardForTask(task))
      .map((task, order) => {
        // A trigger chore's first step is only on the first person's calendar;
        // the second person's step appears once the first is marked done.
        const owners = task.trigger ? [task.trigger.first] : calendarOwners(task);
        // A standing item has no days on the calendar; it is listed under
        // Standing Items instead.
        // A start date: nothing before it, and the first time falls on it.
        const startOn = taskState(task.id).startOn;
        return { task, owners, order, series: isStanding(task) ? null : seriesTemplate(task), minutes: minutesEach(task), bucket: owners[0] || '_shared', start: startOn ? dayFromIso(startOn) : null };
      });
    plans.push(...oneOffPlans(plans.length));

    for (const plan of plans) {
      if (!plan.series) continue;
      const load = loadFor(plan.bucket);
      plan.series.forEach((series, index) => {
        if (series.daily) { series.anchor = 0; return; }
        // A day chosen on the calendar wins; otherwise the start date sets the
        // pattern (a chore done several times a week keeps its spacing).
        const pin = pins[plan.task.id]?.[index] || (plan.start != null && series.unit !== 'dates' ? isoOf(plan.start + (series.step || 0)) : null);
        if (!pin) return;
        const day = dayFromIso(pin);
        series.pinned = true;
        if (series.unit === 'day') {
          series.anchor = day;
          addDays(load, day, series.every, plan.minutes);
        } else {
          const { y, m, d } = dateParts(day);
          series.anchorMonth = monthNumber(y, m);
          series.date = d;
          addMonths(load, series.anchorMonth, series.every, d, plan.minutes);
        }
      });
    }

    const automatic = plans.filter(plan => plan.series?.some(series => !series.daily && !series.pinned))
      .sort((a, b) => b.minutes - a.minutes || a.order - b.order);
    for (const plan of automatic) {
      const load = loadFor(plan.bucket);
      const open = plan.series.filter(series => !series.daily && !series.pinned);
      if (open[0].unit === 'day' && open.some(series => series.step !== undefined)) {
        // Several times a week: pick the start day that keeps the set lightest.
        let best = 0, bestLoad = Infinity;
        for (let start = 0; start < 7; start++) {
          const total = open.reduce((sum, series) => sum + load.days[mod(start + series.step, 7)], 0);
          if (total < bestLoad) { best = start; bestLoad = total; }
        }
        for (const series of open) { series.anchor = best + series.step; addDays(load, series.anchor, 7, plan.minutes); }
        continue;
      }
      for (const series of open) {
        if (series.unit === 'day') {
          let best = 0, bestLoad = Infinity;
          for (let offset = 0; offset < series.every; offset++) {
            let total = 0;
            for (let slot = offset; slot < 42; slot += series.every) total += load.days[slot];
            if (total < bestLoad) { best = offset; bestLoad = total; }
          }
          series.anchor = best;
          addDays(load, best, series.every, plan.minutes);
        } else {
          const startMonths = series.fixedMonth !== undefined ? [series.fixedMonth] : [...Array(series.every).keys()];
          let best = { month: startMonths[0], date: 1 }, bestLoad = Infinity;
          for (const month of startMonths) for (let date = 1; date <= 28; date++) {
            let total = 0;
            for (let m = mod(month, series.every); m < 12; m += series.every) total += load.months[m][date];
            if (total < bestLoad) { best = { month, date }; bestLoad = total; }
          }
          series.anchorMonth = best.month;
          series.date = best.date;
          addMonths(load, best.month, series.every, best.date, plan.minutes);
        }
      }
    }
    return plans;
  }

  function occursOn(series, day) {
    if (series.unit === 'dates') return series.days.includes(day);
    if (series.unit === 'day') return mod(day - series.anchor, series.every) === 0;
    const { y, m, d } = dateParts(day);
    return mod(monthNumber(y, m) - series.anchorMonth, series.every) === 0 && d === Math.min(series.date, daysInMonth(y, m));
  }

  // Every calendar item has a stable key -- task, part, and the day it was
  // originally scheduled -- so marking it done survives a one-off move.
  function withKey(item) {
    item.key = `${item.plan.task.id}|${item.part}|${isoOf(item.orig)}`;
    item.doneKey = item.key;
    return item;
  }

  // A chore with more than one owner -- every child's shower, a room two kids
  // share -- has a done check for each of them: Ephraim checking his off
  // doesn't tick Brighton's. Their checks are saved as 'key|Person'. A check
  // saved before that (under the plain key) counts only for whoever made it.
  // Seen as one person (the calendar narrowed to them, or their group on the
  // day view or Standing Items), an item is theirs; seen as Everyone, a shared
  // chore is done once every owner's is.
  function isSharedItem(item) {
    return item.plan.owners.length > 1 && !item.followUp;
  }

  function forPerson(item, person) {
    if (!person || !isSharedItem(item) || !item.plan.owners.includes(person)) return item;
    return { ...item, person, doneKey: `${item.key}|${person}` };
  }

  function personalDone(item, person) {
    const own = extras.completions[`${item.key}|${person}`];
    if (own) return own;
    const older = extras.completions[item.key];
    return older && older.by === person ? older : null;
  }

  // Every chore occurrence from `start` to `end` (day numbers, inclusive),
  // with one-off moves applied: an occurrence moved out of the range is
  // dropped, and one moved into it from outside is added.
  function occurrencesIn(start, end, plans, { skipDaily = false } = {}) {
    const found = [];
    for (const plan of plans) {
      if (!plan.series) continue;
      const moves = extras.calendar.moves[plan.task.id] || {};
      plan.series.forEach((series, index) => {
        if (skipDaily && series.daily) return;
        const daily = Boolean(series.daily);
        // Nothing before a chore's start date.
        const beforeStart = orig => plan.start != null && orig < plan.start;
        const add = orig => {
          if (beforeStart(orig)) return;
          const moved = moves[`${index}|${isoOf(orig)}`];
          const day = moved ? dayFromIso(moved) : orig;
          if (day >= start && day <= end) found.push(withKey({ plan, part: index, orig, day, moved: Boolean(moved), daily }));
        };
        if (series.unit === 'dates') {
          for (const day of series.days) if (day >= start && day <= end) add(day);
        } else if (series.unit === 'day') {
          for (let day = start + mod(series.anchor - start, series.every); day <= end; day += series.every) add(day);
        } else {
          const first = dateParts(start), last = dateParts(end);
          for (let month = monthNumber(first.y, first.m); month <= monthNumber(last.y, last.m); month++) {
            if (mod(month - series.anchorMonth, series.every) !== 0) continue;
            const { y, m } = monthParts(month);
            const day = dayNumber(y, m, Math.min(series.date, daysInMonth(y, m)));
            if (day >= start && day <= end) add(day);
          }
        }
        // Moved in from outside the range.
        for (const [key, target] of Object.entries(moves)) {
          const [seriesIndex, origIso] = key.split('|');
          if (Number(seriesIndex) !== index) continue;
          const orig = dayFromIso(origIso), day = dayFromIso(target);
          if ((orig < start || orig > end) && day >= start && day <= end && occursOn(series, orig) && !beforeStart(orig)) {
            found.push(withKey({ plan, part: index, orig, day, moved: true, daily }));
          }
        }
      });
    }
    return found;
  }

  // ---- Trigger chores ----

  // A trigger chore has two steps for two people. The first step is scheduled
  // like any chore, but only for the first person. The day they mark it done,
  // the second step appears on the second person's list, and it stays on their
  // today list until it is marked done.
  function followUpPlan(plan) {
    const { trigger } = plan.task;
    return {
      task: {
        ...plan.task,
        title: trigger.thenTitle,
        standard: trigger.thenStandard || '',
        cadence: `After ${ownerLabel(trigger.first)} finishes`,
        checklist: [],
        effort: trigger.thenEffort || null,
        trigger: null,
        followUpOf: plan.task
      },
      owners: [trigger.then],
      order: plan.order,
      series: null
    };
  }

  function followUpsIn(start, end) {
    const today = todayNumber();
    const found = [];
    for (const plan of calPlans) {
      const trigger = plan.task.trigger;
      if (!trigger || (calendarState.who && calendarState.who !== trigger.then)) continue;
      const triggeredOn = new Set();
      for (const [key, done] of Object.entries(extras.completions)) {
        const [taskId, part] = key.split('|');
        if (taskId === plan.task.id && part !== 'then') triggeredOn.add(done.on);
      }
      for (const on of triggeredOn) {
        const triggered = dayFromIso(on);
        const finished = extras.completions[`${plan.task.id}|then|${on}`];
        // Done: show it on the day it was done. Not done: on the day it was
        // triggered, or today if that has passed, so it can't be missed.
        const day = finished ? dayFromIso(finished.on) : Math.max(triggered, today);
        if (day < start || day > end) continue;
        found.push(withKey({ plan: followUpPlan(plan), part: 'then', orig: triggered, day, moved: false, daily: false, followUp: true, waitingSince: !finished && triggered < today ? triggered : null }));
      }
    }
    return found;
  }

  function calendarItemsIn(start, end, plans, options) {
    return [...occurrencesIn(start, end, plans, options), ...followUpsIn(start, end)]
      .map(item => forPerson(item, calendarState.who))
      .sort((a, b) => a.day - b.day || a.plan.order - b.plan.order || (a.followUp ? 1 : 0) - (b.followUp ? 1 : 0));
  }

  function describeSeries(series) {
    const weekday = day => formatDay(day, { weekday: 'long' });
    if (series.daily) return 'Every day';
    if (series.unit === 'dates') return `One-off: ${series.days.map(day => formatDay(day, { weekday: 'short', month: 'short', day: 'numeric' })).join(', ')}`;
    if (series.unit === 'day') {
      const on = weekday(series.anchor);
      return series.every === 7 ? `Every ${on}` : series.every === 14 ? `Every other ${on}` : `Every 3 weeks on ${on}`;
    }
    const day = ordinal(series.date);
    const monthName = month => new Intl.DateTimeFormat(undefined, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, month, 1)));
    if (series.every === 1) return `Monthly on the ${day}`;
    const months = [];
    for (let m = mod(series.anchorMonth, series.every); m < 12; m += series.every) months.push(monthName(m).slice(0, 3));
    if (series.every === 12) return `Every year on ${monthName(mod(series.anchorMonth, 12))} ${series.date}`;
    return `${series.every === 2 ? 'Every other month' : series.every === 3 ? 'Every 3 months' : 'Twice a year'} on the ${day} (${months.join(', ')})`;
  }

  const calendarState = { who: '', span: 'week', cursor: todayNumber() };
  const calBody = document.querySelector('#calBody');
  const calWho = document.querySelector('#calWho');
  const calSpan = document.querySelector('#calSpan');
  const calDetail = document.querySelector('#calDetail');
  const calMove = document.querySelector('#calMove');
  const calDoneWho = document.querySelector('#calDoneWho');
  let calPlans = [];
  let pendingMove = null;
  let pendingDone = null;
  // The items drawn in the current calendar view, by key, so a tap on a check
  // or a card can find the item it belongs to.
  const renderedItems = new Map();

  calWho.insertAdjacentHTML('beforeend', ownerRoster.map(owner => `<option value="${owner.value}">${escapeHtml(owner.label)}</option>`).join(''));

  function calendarRange() {
    const { span, cursor } = calendarState;
    const { y, m, weekday } = dateParts(cursor);
    if (span === 'day') return { start: cursor, end: cursor };
    if (span === 'week') return { start: cursor - weekday, end: cursor - weekday + 6 };
    if (span === 'month') return { start: dayNumber(y, m, 1), end: dayNumber(y, m, daysInMonth(y, m)) };
    const first = span === 'quarter' ? m - m % 3 : 0;
    const count = span === 'quarter' ? 3 : 12;
    return { start: dayNumber(y, first, 1), end: dayNumber(y, first + count, 1) - 1, firstMonth: monthNumber(y, first), count };
  }

  function calendarTitle({ start, end }) {
    const { span } = calendarState;
    if (span === 'day') return formatDay(start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (span === 'week') {
      const a = dateParts(start), b = dateParts(end);
      const left = formatDay(start, { month: 'short', day: 'numeric' });
      const right = formatDay(end, a.m === b.m ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
      return `${left} – ${right}, ${b.y}`;
    }
    if (span === 'month') return formatDay(start, { month: 'long', year: 'numeric' });
    if (span === 'quarter') return `Q${Math.floor(dateParts(start).m / 3) + 1} ${dateParts(start).y} · ${formatDay(start, { month: 'short' })} – ${formatDay(end, { month: 'short' })}`;
    return String(dateParts(start).y);
  }

  function doneRecord(item) {
    if (!isSharedItem(item)) return extras.completions[item.key] || null;
    if (item.person) return personalDone(item, item.person);
    const records = item.plan.owners.map(person => personalDone(item, person));
    return records.every(Boolean) ? records[records.length - 1] : null;
  }

  // Seen as Everyone: which owners of a shared chore have done theirs.
  function ownersDone(item) {
    return isSharedItem(item) && !item.person ? item.plan.owners.filter(person => personalDone(item, person)) : [];
  }

  function isPaidItem(item) {
    return taskState(item.plan.task.id).paid === true;
  }

  // Overdue: its day has passed and nobody marked it done. The daily routines
  // are left out -- they come round again tomorrow anyway. Only from the day
  // the household started marking chores done (the first check ever made):
  // before that nothing was being tracked, so nothing can be late. Worked out
  // afresh at the start of each Calendar or Home draw.
  let overdueFrom = null;

  function trackingStart() {
    let first = null;
    for (const entry of Object.values(extras.completions)) {
      const day = dayFromIso(entry.on);
      if (Number.isFinite(day) && (first === null || day < first)) first = day;
    }
    return first;
  }

  function isOverdue(item) {
    return overdueFrom !== null && !item.daily && !item.standing && item.day >= overdueFrom && item.day < todayNumber() && !doneRecord(item);
  }

  function checkHtml(item) {
    const done = doneRecord(item);
    const partly = ownersDone(item);
    const label = done ? (isSharedItem(item) && !item.person ? 'Done by everyone. Tap to undo' : `Done by ${ownerLabel(done.by)}. Tap to undo`)
      : partly.length ? `Done by ${partly.map(ownerLabel).join(', ')} so far. Mark done` : 'Mark done';
    return `<button type="button" class="cal-check${done ? ' is-done' : ''}" data-cal-done="${escapeHtml(item.doneKey)}" aria-pressed="${done ? 'true' : 'false'}" aria-label="${escapeHtml(`${label}: ${item.plan.task.title}`)}" title="${escapeHtml(label)}"></button>`;
  }

  function tagsHtml(item) {
    const done = doneRecord(item);
    const tags = [];
    if (isOverdue(item)) tags.push('<span class="cal-chip-tag is-overdue">Overdue</span>');
    if (item.plan.task.oneOff) tags.push('<span class="cal-chip-tag is-one-off">One-off</span>');
    if (isPaidItem(item)) tags.push('<span class="cal-chip-tag is-paid">Paid</span>');
    if (item.moved) tags.push('<span class="cal-chip-tag">Moved</span>');
    if (item.plan.task.trigger) tags.push(`<span class="cal-chip-tag is-trigger">Then ${escapeHtml(ownerLabel(item.plan.task.trigger.then))}</span>`);
    if (item.followUp) tags.push(`<span class="cal-chip-tag is-trigger">${item.waitingSince != null ? `Waiting since ${escapeHtml(formatDay(item.waitingSince, { weekday: 'short' }))}` : `After ${escapeHtml(ownerLabel(item.plan.task.followUpOf.trigger.first))}`}</span>`);
    const partly = ownersDone(item);
    if (done) tags.push(`<span class="cal-chip-tag is-done">Done · ${escapeHtml(partly.length ? 'everyone' : ownerLabel(done.by))}</span>`);
    else if (partly.length) tags.push(`<span class="cal-chip-tag is-done">${partly.length} of ${item.plan.owners.length} done · ${escapeHtml(partly.map(ownerLabel).join(', '))}</span>`);
    return tags.join('');
  }

  function chipHtml(item, showOwners) {
    renderedItems.set(item.doneKey, item);
    // Only admins rearrange the household's schedule.
    const draggable = !item.daily && !item.followUp && viewerIsAdmin();
    return `<li class="cal-item${doneRecord(item) ? ' is-done' : ''}">${checkHtml(item)}<button type="button" class="cal-chip${item.moved ? ' is-moved' : ''}${item.followUp ? ' is-follow-up' : ''}${isPaidItem(item) ? ' is-paid' : ''}${isOverdue(item) ? ' is-overdue' : ''}" ${draggable ? 'draggable="true"' : ''} data-cal-key="${escapeHtml(item.doneKey)}">
      <span class="cal-chip-title">${taskTitleHtml(item.plan.task)}</span>
      ${knownMinutes(item.plan.task) ? `<span class="cal-chip-time">${escapeHtml(formatMinutes(knownMinutes(item.plan.task)))}</span>` : ''}
      ${showOwners ? `<span class="cal-chip-who">${escapeHtml(calendarOwnerText(item.plan.owners))}</span>` : ''}
      ${tagsHtml(item)}
    </button></li>`;
  }

  function doneCountText(items) {
    const done = items.filter(doneRecord).length;
    return done ? ` · ${done} done` : '';
  }

  function renderCalendarWeek(start, plans) {
    const today = todayNumber();
    const items = calendarItemsIn(start, start + 6, plans);
    const showOwners = !calendarState.who;
    return `<div class="cal-week">${[...Array(7).keys()].map(offset => {
      const day = start + offset;
      const onDay = items.filter(item => item.day === day);
      const daily = onDay.filter(item => item.daily);
      const rest = onDay.filter(item => !item.daily);
      return `<section class="cal-day${day === today ? ' is-today' : ''}" data-drop-day="${day}" aria-label="${escapeHtml(formatDay(day, { weekday: 'long', month: 'long', day: 'numeric' }))}">
        <header><button type="button" class="cal-day-open" data-cal-zoom="day" data-cal-day="${day}" title="See just this day"><span>${escapeHtml(formatDay(day, { weekday: 'short' }))}</span><strong>${dateParts(day).d}</strong></button><small>${rest.length} chore${rest.length === 1 ? '' : 's'}${doneCountText(rest)}</small></header>
        ${daily.length ? `<details class="cal-daily"><summary>Daily routines (${daily.length})${doneCountText(daily)}</summary><ul class="cal-list">${daily.map(item => chipHtml(item, showOwners)).join('')}</ul></details>` : ''}
        <ul class="cal-list">${rest.length ? rest.map(item => chipHtml(item, showOwners)).join('') : '<li class="board-empty">Nothing scheduled</li>'}</ul>
      </section>`;
    }).join('')}</div>`;
  }

  // One day with the whole page to itself: bigger cards that show the room,
  // cadence, time estimate and what "done" looks like without opening them.
  // For Everyone, the cards are grouped by person, so a shared chore appears
  // under each of its owners.
  function dayCardHtml(item, viewer) {
    renderedItems.set(item.doneKey, item);
    const { task } = item.plan;
    const others = item.plan.owners.filter(name => name !== viewer);
    const trigger = task.trigger;
    const steps = trigger
      ? `<span class="cal-card-extra">Step 1: ${escapeHtml(trigger.firstStep)}. Marking it done puts “${escapeHtml(trigger.thenTitle)}” on ${escapeHtml(ownerLabel(trigger.then))}'s list that day.</span>`
      : item.followUp
        ? `<span class="cal-card-extra">Step 2, started when ${escapeHtml(ownerLabel(task.followUpOf.trigger.first))} marked “${escapeHtml(task.followUpOf.title)}” done on ${escapeHtml(formatDay(item.orig, { weekday: 'long', month: 'short', day: 'numeric' }))}.</span>`
        : '';
    return `<li class="cal-card-item${doneRecord(item) ? ' is-done' : ''}">${checkHtml(item)}<button type="button" class="cal-card${item.moved ? ' is-moved' : ''}${item.followUp ? ' is-follow-up' : ''}${isPaidItem(item) ? ' is-paid' : ''}${isOverdue(item) ? ' is-overdue' : ''}" data-cal-key="${escapeHtml(item.doneKey)}">
      <span class="cal-card-room">${escapeHtml(sectionFor(task).name)}</span>
      <span class="cal-card-title">${escapeHtml(task.title)}</span>
      <span class="cal-card-meta">${escapeHtml(task.cadence || task.frequency)}${knownMinutes(task) ? ` · ${escapeHtml(formatMinutes(knownMinutes(task)))}` : ''}${others.length ? ` · with ${escapeHtml(others.map(ownerLabel).join(', '))}` : ''}</span>
      ${task.standard ? `<span class="cal-card-standard">${escapeHtml(task.standard)}</span>` : ''}
      ${task.checklist?.length ? `<span class="cal-card-extra">Checklist · ${task.checklist.length} items</span>` : ''}
      ${!item.followUp && subtasksFor(task).length ? `<span class="cal-card-extra">Subtasks · ${subtasksFor(task).length} (tap to see them)</span>` : ''}
      ${steps}
      <span class="cal-card-tags">${tagsHtml(item)}</span>
    </button></li>`;
  }

  function renderCalendarDay(day, plans) {
    const items = calendarItemsIn(day, day, plans);
    const daily = items.filter(item => item.daily);
    const rest = items.filter(item => !item.daily);
    const who = calendarState.who;
    const groups = who
      ? [{ name: who, label: ownerLabel(who), items: rest }]
      : [
          ...ownerRoster.map(owner => ({ name: owner.value, label: owner.label, items: rest.filter(item => item.plan.owners.includes(owner.value)).map(item => forPerson(item, owner.value)) })),
          { name: null, label: 'Unassigned', items: rest.filter(item => !item.plan.owners.length) }
        ].filter(group => group.items.length);
    // Only the times someone set.
    const minutes = list => list.reduce((sum, item) => sum + (knownMinutes(item.plan.task) || 0), 0);
    const dailyBlock = daily.length
      ? `<details class="cal-day-daily"><summary>Daily routines (${daily.length})${doneCountText(daily)}</summary><ul class="cal-day-chips">${daily.map(item => chipHtml(item, !who)).join('')}</ul></details>`
      : '';
    const body = groups.length && rest.length
      ? groups.map(group => `<section class="cal-day-group">
          <h3>${escapeHtml(group.label)} <span>${group.items.length} chore${group.items.length === 1 ? '' : 's'}${minutes(group.items) ? ` · ${formatMinutes(minutes(group.items))}` : ''}${doneCountText(group.items)}</span></h3>
          <ul class="cal-cards">${group.items.map(item => dayCardHtml(item, group.name)).join('')}</ul>
        </section>`).join('')
      : '<p class="board-hidden-note">Nothing scheduled this day beyond the daily routines.</p>';
    return `<div class="cal-day-view">${dailyBlock}${body}</div>`;
  }

  function renderCalendarMonth(start, end, plans) {
    const today = todayNumber();
    const counts = new Map();
    const doneCounts = new Map();
    const overdueCounts = new Map();
    for (const item of calendarItemsIn(start, end, plans, { skipDaily: true })) {
      counts.set(item.day, (counts.get(item.day) || 0) + 1);
      if (doneRecord(item)) doneCounts.set(item.day, (doneCounts.get(item.day) || 0) + 1);
      if (isOverdue(item)) overdueCounts.set(item.day, (overdueCounts.get(item.day) || 0) + 1);
    }
    const most = Math.max(1, ...counts.values());
    const lead = dateParts(start).weekday;
    const heads = [...Array(7).keys()].map(offset => `<div class="cal-head">${escapeHtml(formatDay(start - lead + offset, { weekday: 'short' }))}</div>`).join('');
    const blanks = '<div class="cal-blank" aria-hidden="true"></div>'.repeat(lead);
    const cells = [];
    for (let day = start; day <= end; day++) {
      const count = counts.get(day) || 0;
      const done = doneCounts.get(day) || 0;
      const overdue = overdueCounts.get(day) || 0;
      cells.push(`<button type="button" class="cal-cell${day === today ? ' is-today' : ''}${overdue ? ' has-overdue' : ''}" data-cal-zoom="week" data-cal-day="${day}" style="--heat:${(count / most).toFixed(2)}" aria-label="${escapeHtml(formatDay(day, { weekday: 'long', month: 'long', day: 'numeric' }))}: ${count} chores${done ? `, ${done} done` : ''}${overdue ? `, ${overdue} overdue` : ''}. Open the week.">
        <span class="cal-date">${dateParts(day).d}</span>${done ? `<span class="cal-done-count">✓ ${done}</span>` : ''}${overdue ? `<span class="cal-overdue-count">${overdue} overdue</span>` : ''}<span class="cal-count">${count}</span></button>`);
    }
    return `<div class="cal-month">${heads}${blanks}${cells.join('')}</div>
      <p class="cal-note">Numbers count scheduled chores; ✓ counts the ones marked done, and red ones are overdue. The daily routines are on every day and left out. Tap a day to see its week.</p>`;
  }

  function renderCalendarMonths({ firstMonth, count }, plans) {
    const today = dateParts(todayNumber());
    const cards = [];
    for (let index = firstMonth; index < firstMonth + count; index++) {
      const { y, m } = monthParts(index);
      const start = dayNumber(y, m, 1), end = dayNumber(y, m, daysInMonth(y, m));
      const items = calendarItemsIn(start, end, plans, { skipDaily: true });
      const perPerson = !calendarState.who ? ownerRoster.map(owner => ({ owner, count: items.filter(item => item.plan.owners.includes(owner.value)).length })) : [];
      cards.push(`<button type="button" class="cal-month-card${today.y === y && today.m === m ? ' is-today' : ''}" data-cal-zoom="month" data-cal-day="${start}">
        <span class="cal-month-name">${escapeHtml(formatDay(start, { month: 'long' }))}</span>
        <strong>${items.length}</strong><span class="cal-month-label">chores${doneCountText(items)}</span>
        ${perPerson.length ? `<span class="cal-month-people">${perPerson.map(({ owner, count: n }) => `<span>${escapeHtml(owner.label)} ${n}</span>`).join('')}</span>` : ''}
      </button>`);
    }
    return `<div class="cal-months${count === 12 ? ' is-year' : ''}">${cards.join('')}</div>
      <p class="cal-note">Daily routines are left out of these totals. Tap a month to open it.</p>`;
  }

  // ---- Paid chores: what each kid has earned this week ----

  // Each kid can earn $10 a week from paid chores. The $10 is split evenly
  // across the paid chores on their calendar that week (Sunday to Saturday),
  // so each one is worth $10 ÷ that number, earned when the kid marks it done.
  // A shared paid chore counts for each of its kids, and pays whoever did it.
  const weeklyAllowance = 10;
  const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });

  function weekStartOf(day) {
    return day - dateParts(day).weekday;
  }

  function weeklyEarnings(start, plans = buildSchedule()) {
    const paid = occurrencesIn(start, start + 6, plans).filter(isPaidItem);
    return kids.map(kid => {
      const mine = paid.filter(item => item.plan.owners.includes(kid));
      const done = mine.filter(item => personalDone(item, kid)?.by === kid).length;
      const each = mine.length ? weeklyAllowance / mine.length : 0;
      return { kid, scheduled: mine.length, done, each, earned: each * done };
    });
  }

  // Kids shown: one kid when the view is narrowed to them, none when it is
  // narrowed to a grown-up, otherwise all three.
  function earningsHtml(start, who, plans) {
    const rows = weeklyEarnings(start, plans).filter(row => !who || row.kid === who);
    if (!rows.length) return '';
    const week = `${formatDay(start, { month: 'short', day: 'numeric' })} – ${formatDay(start + 6, { month: 'short', day: 'numeric' })}`;
    return `<section class="earnings" aria-label="Paid chores earned this week">
      <header><h4>Paid chores earned</h4><span>Week of ${escapeHtml(week)} · ${money.format(weeklyAllowance)} a week each, split across their paid chores</span></header>
      <div class="earnings-rows">${rows.map(row => `<div class="earnings-row">
        <span class="earnings-name">${escapeHtml(ownerLabel(row.kid))}</span>
        ${row.scheduled
          ? `<span class="earnings-track" aria-hidden="true"><span style="width:${(row.earned / weeklyAllowance * 100).toFixed(1)}%"></span></span>
             <strong>${money.format(row.earned)}</strong><small>of ${money.format(weeklyAllowance)} · ${row.done} of ${row.scheduled} paid chore${row.scheduled === 1 ? '' : 's'} done · ${money.format(row.each)} each</small>`
          : '<small class="earnings-none">No paid chores this week</small>'}
      </div>`).join('')}</div>
    </section>`;
  }

  function renderCalendar() {
    renderedItems.clear();
    overdueFrom = trackingStart();
    // A member's calendar is always their own.
    if (!viewerIsAdmin()) calendarState.who = viewer().name;
    calPlans = buildSchedule();
    const plans = calPlans.filter(plan => !calendarState.who || plan.owners.includes(calendarState.who));
    const range = calendarRange();
    calWho.value = calendarState.who;
    calSpan.value = calendarState.span;
    document.querySelector('#calTitle').textContent = calendarTitle(range);
    const today = todayNumber();
    document.querySelector('#calToday').hidden = today >= range.start && today <= range.end;
    const { span } = calendarState;
    calBody.innerHTML = span === 'day' ? renderCalendarDay(range.start, plans)
      : span === 'week' ? renderCalendarWeek(range.start, plans)
      : span === 'month' ? renderCalendarMonth(range.start, range.end, plans)
      : renderCalendarMonths(range, plans);
    // The week on screen, or this week when looking at a month or more.
    const earningsWeek = weekStartOf(span === 'week' || span === 'day' ? range.start : today);
    document.querySelector('#calEarnings').innerHTML = earningsHtml(earningsWeek, calendarState.who, calPlans);
    renderStanding(plans);
  }

  // ---- Standing Items ----

  // Under the calendar: the standing items, one group per person, each with
  // their character standing tall beside it. Checking one off records it for
  // today, so it can be done again another day, and each card says when it
  // was last done and by whom.
  // With `person`, only their own checks (for a shared standing item).
  function lastDone(taskId, person = null) {
    let latest = null;
    for (const [key, entry] of Object.entries(extras.completions)) {
      if (!key.startsWith(`${taskId}|`) || key.split('|')[1] === 'then') continue;
      if (person && !key.endsWith(`|${person}`) && entry.by !== person) continue;
      if (!latest || (entry.at || entry.on) > (latest.at || latest.on)) latest = entry;
    }
    return latest;
  }

  function standingItem(plan) {
    const today = todayNumber();
    return withKey({ plan, part: 'standing', orig: today, day: today, moved: false, daily: false, standing: true });
  }

  function standingCardHtml(item, viewerName) {
    renderedItems.set(item.doneKey, item);
    const { task } = item.plan;
    const last = lastDone(task.id, item.person || null);
    const others = item.plan.owners.filter(name => name !== viewerName);
    return `<li class="cal-card-item standing-item${doneRecord(item) ? ' is-done' : ''}">${checkHtml(item)}<button type="button" class="cal-card${isPaidItem(item) ? ' is-paid' : ''}" data-cal-key="${escapeHtml(item.doneKey)}">
      <span class="cal-card-room">${escapeHtml(sectionFor(task).name)}</span>
      <span class="cal-card-title">${escapeHtml(task.title)}</span>
      <span class="cal-card-meta">${escapeHtml(task.cadence || task.frequency)}${knownMinutes(task) ? ` · ${escapeHtml(formatMinutes(knownMinutes(task)))}` : ''}${others.length ? ` · with ${escapeHtml(others.map(ownerLabel).join(', '))}` : ''}</span>
      <span class="standing-last">${last ? `Last done ${escapeHtml(formatDay(dayFromIso(last.on), { weekday: 'short', month: 'short', day: 'numeric' }))}, by ${escapeHtml(ownerLabel(last.by))}` : 'Not done yet'}</span>
      <span class="cal-card-tags">${tagsHtml(item)}</span>
    </button></li>`;
  }

  function renderStanding(plans) {
    const items = plans.filter(plan => isStanding(plan.task)).map(standingItem);
    const who = calendarState.who;
    const groups = who
      ? [{ name: who, label: ownerLabel(who), items: items.map(item => forPerson(item, who)) }]
      : [
          ...ownerRoster.map(owner => ({ name: owner.value, label: owner.label, items: items.filter(item => item.plan.owners.includes(owner.value)).map(item => forPerson(item, owner.value)) })),
          { name: null, label: 'Unassigned', items: items.filter(item => !item.plan.owners.length) }
        ].filter(group => group.items.length);
    const characters = window.HOUSE_MANUAL_CHARACTERS || {};
    document.querySelector('#standingGroups').innerHTML = items.length
      ? groups.map(group => {
          const character = group.name ? characters[group.name] : null;
          return `<section class="standing-group" aria-label="${escapeHtml(`${group.label}'s standing items`)}">
            ${character ? `<figure class="standing-character" title="${escapeHtml(`${group.label}: ${character.name}`)}">${character.svg}</figure>` : '<div class="standing-character is-empty" aria-hidden="true"></div>'}
            <div class="standing-body">
              <h4>${escapeHtml(group.label)} <span>${group.items.length} standing item${group.items.length === 1 ? '' : 's'}${doneCountText(group.items).replace(' done', ' done today')}</span></h4>
              <ul class="cal-cards">${group.items.map(item => standingCardHtml(item, group.name)).join('')}</ul>
            </div>
          </section>`;
        }).join('')
      : '<p class="board-hidden-note">No standing items.</p>';
  }

  function stepCalendar(direction) {
    const { span, cursor } = calendarState;
    if (span === 'day') { calendarState.cursor = cursor + direction; return; }
    if (span === 'week') { calendarState.cursor = cursor + 7 * direction; return; }
    const { y, m } = dateParts(cursor);
    const months = { month: 1, quarter: 3, year: 12 }[span] * direction;
    const target = monthParts(monthNumber(y, m) + months);
    calendarState.cursor = dayNumber(target.y, target.m, 1);
  }

  // ---- Marking chores done ----

  // Who gets the credit: the person the calendar is filtered to, else the
  // chore's only owner. When that isn't clear, ask.
  function toggleDone(key) {
    if (blockedBySimulation()) return;
    const item = renderedItems.get(key);
    if (!item) return;
    if (doneRecord(item)) {
      undoDone(item);
      saveCompletions();
      showToast('Marked not done.');
      return;
    }
    const owners = item.plan.owners;
    const who = item.person || calendarState.who || (owners.length === 1 ? owners[0] : null);
    if (who) markDone(item, who);
    else askWhoDidIt(item);
  }

  // Undoes the check that is showing: one person's, or (a shared chore seen as
  // Everyone, done by all) every owner's.
  function undoDone(item) {
    if (!isSharedItem(item)) { delete extras.completions[item.key]; return; }
    for (const person of item.person ? [item.person] : item.plan.owners) {
      delete extras.completions[`${item.key}|${person}`];
      if (extras.completions[item.key]?.by === person) delete extras.completions[item.key];
    }
  }

  // A shared chore's check is saved for the owner it is for: the one being
  // looked at, or whoever did it if they are an owner.
  function markDone(item, who) {
    const owner = isSharedItem(item) ? item.person || (item.plan.owners.includes(who) ? who : null) : null;
    extras.completions[owner ? `${item.key}|${owner}` : item.key] = { by: who, at: new Date().toISOString(), on: isoOf(todayNumber()), title: taskTitle(item.plan.task) };
    saveCompletions();
    const trigger = item.plan.task.trigger;
    showToast(trigger
      ? `Done. “${trigger.thenTitle}” is now on ${ownerLabel(trigger.then)}'s list for today.`
      : `Done · ${ownerLabel(who)}`);
  }

  function saveCompletions() {
    queueSave();
    renderCalendar();
  }

  function askWhoDidIt(item) {
    pendingDone = item;
    // A shared chore: the owners who haven't done theirs yet.
    const owners = isSharedItem(item) ? item.plan.owners.filter(person => !personalDone(item, person)) : item.plan.owners;
    const others = rosterNames.filter(name => !owners.includes(name));
    const chip = (name, style) => `<button type="button" class="chip ${style}" data-cal-who="${name}">${escapeHtml(ownerLabel(name))}</button>`;
    document.querySelector('#calDoneWhoText').textContent = taskTitle(item.plan.task);
    document.querySelector('#calDoneWhoChoices').innerHTML = owners.length
      ? `<div class="chip-row">${owners.map(name => chip(name, 'chip-primary')).join('')}</div>
         ${others.length ? `<p class="board-actions-label">Someone else</p><div class="chip-row">${others.map(name => chip(name, '')).join('')}</div>` : ''}`
      : `<div class="chip-row">${rosterNames.map(name => chip(name, 'chip-primary')).join('')}</div>`;
    calDoneWho.showModal();
  }

  calDoneWho.addEventListener('click', event => {
    const choice = event.target.closest('[data-cal-who]')?.dataset.calWho;
    if (!choice) return;
    const item = pendingDone;
    calDoneWho.close();
    if (item && choice !== 'cancel') markDone(item, choice);
  });
  calDoneWho.addEventListener('close', () => { pendingDone = null; });

  // ---- Details ----

  function openCalendarDetail(taskId, item) {
    const plan = item ? item.plan : calPlans.find(entry => entry.task.id === taskId);
    if (!plan) return;
    const { task } = plan;
    const review = taskState(task.id);
    const pinned = Boolean(extras.calendar.pins[task.id]);
    const moved = Boolean(extras.calendar.moves[task.id]);
    const done = item ? doneRecord(item) : null;
    let repeats = 'No set date';
    if (item?.followUp) {
      repeats = `Each time ${ownerLabel(task.followUpOf.trigger.first)} marks “${task.followUpOf.title}” done`;
    } else if (isStanding(task)) {
      repeats = `Standing item: done when it needs doing (${task.cadence || task.frequency})`;
    } else if (plan.series) {
      const severalAWeek = plan.series.length > 1 && plan.series.every(entry => entry.step !== undefined);
      repeats = severalAWeek
        ? `${[...plan.series].sort((a, b) => mod(a.anchor, 7) - mod(b.anchor, 7)).map(entry => formatDay(entry.anchor, { weekday: 'long' })).join(', ')} each week`
        : plan.series.map(describeSeries).join(' and ');
    }
    const oneOff = task.oneOff === true;
    const automatic = plan.series && !plan.series[0].daily && !item?.followUp && !oneOff;
    const canMove = item && !item.daily && !item.followUp && !item.standing && viewerIsAdmin();
    const last = item?.standing ? lastDone(task.id) : null;
    const doneWhen = done ? new Date(done.at) : null;
    const trigger = task.trigger;
    document.querySelector('#calDetailBody').innerHTML = `
      <header class="dialog-head">
        <h2 id="calDetailTitle">${taskTitleHtml(task)}</h2>
        <p>${escapeHtml(sectionFor(task).name)} · ${escapeHtml(task.cadence || task.frequency)} · ${escapeHtml(calendarOwnerText(plan.owners))}</p>
      </header>
      <div class="cal-detail">
        ${item?.standing ? `<p><strong>Standing item</strong> · ${last ? `last done ${escapeHtml(formatDay(dayFromIso(last.on), { weekday: 'long', month: 'short', day: 'numeric' }))}, by ${escapeHtml(ownerLabel(last.by))}` : 'not done yet'}</p>` : ''}
        ${item && !item.standing ? `<p><strong>${escapeHtml(formatDay(item.day, { weekday: 'long', month: 'long', day: 'numeric' }))}</strong>${item.moved ? ` · moved from ${escapeHtml(formatDay(item.orig, { weekday: 'long', month: 'short', day: 'numeric' }))}` : ''}${item.waitingSince != null ? ` · waiting since ${escapeHtml(formatDay(item.waitingSince, { weekday: 'long', month: 'short', day: 'numeric' }))}` : ''}</p>` : ''}
        ${item ? `<div class="cal-detail-done${done ? ' is-done' : ''}">
          ${done
            ? `<span>Done by <strong>${escapeHtml(ownerLabel(done.by))}</strong> ${escapeHtml(formatDay(dayFromIso(done.on), { weekday: 'short', month: 'short', day: 'numeric' }))}${doneWhen && !Number.isNaN(doneWhen.getTime()) ? `, ${escapeHtml(doneWhen.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }))}` : ''}</span>
               <button type="button" class="button button-quiet button-small" data-cal-detail="done">Mark not done</button>`
            : `<span>${item.standing ? 'Not done today.' : 'Not done yet.'}</span><button type="button" class="button button-solid button-small" data-cal-detail="done">Mark done</button>`}
        </div>` : ''}
        ${trigger ? `<p><span class="field-label">Trigger</span>Step 1 (${escapeHtml(ownerLabel(trigger.first))}): ${escapeHtml(trigger.firstStep)}. Marking it done puts “${escapeHtml(trigger.thenTitle)}” on ${escapeHtml(ownerLabel(trigger.then))}'s list that same day.</p>` : ''}
        <p><span class="field-label">Repeats</span>${escapeHtml(repeats)}${automatic ? ` <small>(${pinned ? 'day chosen by you' : review.startOn ? 'from its start date' : 'spread automatically'})</small>` : ''}</p>
        ${review.startOn && !oneOff && !item?.followUp ? `<p><span class="field-label">Starts</span>${escapeHtml(formatDay(dayFromIso(review.startOn), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}</p>` : ''}
        <p><span class="field-label">Estimated time</span>${knownMinutes(task) ? `${escapeHtml(formatMinutes(knownMinutes(task)))} each time` : '<span class="muted-note">Not set yet. Admins can add it in the Gallery.</span>'}</p>
        ${task.standard ? `<p><span class="field-label">What done looks like</span>${escapeHtml(task.standard)}</p>` : ''}
        ${task.checklist?.length ? `<div><span class="field-label">Checklist</span><ul>${task.checklist.map(entry => `<li>${escapeHtml(entry)}</li>`).join('')}</ul></div>` : ''}
        ${item?.followUp ? '' : subtasksHtml(task, { open: true, weekIndex: item && plan.series?.[0]?.unit === 'day' && plan.series[0].every === 7 ? Math.round((item.orig - plan.series[0].anchor) / 7) : null })}
        ${(oneOff ? task.notes : review.notes) && !item?.followUp ? `<p><span class="field-label">Notes</span>${escapeHtml(oneOff ? task.notes : review.notes)}</p>` : ''}
        ${canMove ? `<div class="cal-detail-move">
          <label><span class="field-label">Move to</span><input class="text-input" type="date" id="calMoveDate" value="${isoOf(item.day)}"></label>
          ${oneOff
            ? '<button type="button" class="button button-solid button-small" data-cal-detail="once">Move</button>'
            : `<button type="button" class="button button-quiet button-small" data-cal-detail="once">Just this time</button>
          <button type="button" class="button button-solid button-small" data-cal-detail="always">Every time from now</button>`}
        </div>` : ''}
      </div>
      <footer class="dialog-actions">
        ${(pinned || moved) && !item?.followUp ? `<button type="button" class="button button-quiet" data-cal-detail="reset" data-admin-only>${oneOff ? 'Back to its first day' : 'Back to automatic'}</button>` : ''}
        ${oneOff
          ? '<button type="button" class="button button-quiet chip-danger" data-cal-detail="delete-one-off" data-admin-only>Delete this one-off</button>'
          : '<button type="button" class="button button-quiet" data-cal-detail="open" data-admin-only>Open in Gallery</button>'}
        <button type="button" class="button button-solid" data-cal-detail="close">Close</button>
      </footer>`;
    calDetail.dataset.task = task.id;
    calDetail.dataset.key = item ? item.doneKey : '';
    calDetail.showModal();
  }

  function moveOnce(taskId, index, orig, day) {
    const moves = extras.calendar.moves[taskId] ||= {};
    const key = `${index}|${isoOf(orig)}`;
    if (day === orig) delete moves[key];
    else moves[key] = isoOf(day);
    if (!Object.keys(moves).length) delete extras.calendar.moves[taskId];
    queueSave();
    renderCalendar();
  }

  // Pinning re-bases the whole series on the new date, so one-off moves made
  // against the old pattern no longer line up and are cleared.
  function pinSeries(taskId, index, day) {
    (extras.calendar.pins[taskId] ||= {})[index] = isoOf(day);
    delete extras.calendar.moves[taskId];
    queueSave();
    renderCalendar();
  }

  function resetSchedule(taskId) {
    delete extras.calendar.pins[taskId];
    delete extras.calendar.moves[taskId];
    queueSave();
    renderCalendar();
  }

  function moveSummary(taskId, day) {
    const plan = calPlans.find(item => item.task.id === taskId);
    return `${taskTitle(plan.task)} → ${formatDay(day, { weekday: 'long', month: 'long', day: 'numeric' })}`;
  }

  calWho.addEventListener('change', () => { calendarState.who = calWho.value; renderCalendar(); });
  calSpan.addEventListener('change', () => { calendarState.span = calSpan.value; calendarState.cursor = todayNumber(); renderCalendar(); });
  document.querySelector('#calToday').addEventListener('click', () => { calendarState.cursor = todayNumber(); renderCalendar(); });
  document.querySelectorAll('[data-cal-step]').forEach(button => button.addEventListener('click', () => {
    stepCalendar(Number(button.dataset.calStep));
    renderCalendar();
  }));

  document.querySelector('#calendarView').addEventListener('click', event => {
    const check = event.target.closest('[data-cal-done]');
    if (check) { toggleDone(check.dataset.calDone); return; }
    const zoom = event.target.closest('[data-cal-zoom]');
    if (zoom) {
      calendarState.span = zoom.dataset.calZoom;
      calendarState.cursor = Number(zoom.dataset.calDay);
      renderCalendar();
      return;
    }
    const chip = event.target.closest('[data-cal-key]');
    if (chip) {
      const item = renderedItems.get(chip.dataset.calKey);
      if (item) openCalendarDetail(item.plan.task.id, item);
      return;
    }
    const unscheduled = event.target.closest('[data-cal-task]');
    if (unscheduled) openCalendarDetail(unscheduled.dataset.calTask, null);
  });

  // Drag a chore to another day in the week view, then choose whether that
  // is a one-off or the new usual day.
  let dragging = null;
  calBody.addEventListener('dragstart', event => {
    const chip = event.target.closest('.cal-chip[draggable="true"]');
    const item = chip && renderedItems.get(chip.dataset.calKey);
    if (!item) return;
    dragging = { taskId: item.plan.task.id, index: item.part, orig: item.orig, day: item.day };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.plan.task.id);
    chip.classList.add('is-dragging');
  });
  calBody.addEventListener('dragend', event => {
    event.target.closest('.cal-chip')?.classList.remove('is-dragging');
    calBody.querySelectorAll('.is-drop-target').forEach(el => el.classList.remove('is-drop-target'));
  });
  calBody.addEventListener('dragover', event => {
    const target = event.target.closest('[data-drop-day]');
    if (!target || !dragging) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    calBody.querySelectorAll('.is-drop-target').forEach(el => { if (el !== target) el.classList.remove('is-drop-target'); });
    target.classList.add('is-drop-target');
  });
  calBody.addEventListener('drop', event => {
    const target = event.target.closest('[data-drop-day]');
    if (!target || !dragging) return;
    event.preventDefault();
    target.classList.remove('is-drop-target');
    const day = Number(target.dataset.dropDay);
    // A one-off has no pattern to keep, so it just moves.
    if (day !== dragging.day && extras.oneOffs.some(entry => entry.id === dragging.taskId)) {
      moveOnce(dragging.taskId, dragging.index, dragging.orig, day);
      showToast('Moved.');
    } else if (day !== dragging.day) {
      pendingMove = { ...dragging, to: day };
      document.querySelector('#calMoveText').textContent = moveSummary(dragging.taskId, day);
      calMove.showModal();
    }
    dragging = null;
  });

  calMove.addEventListener('click', event => {
    const choice = event.target.closest('[data-cal-move]')?.dataset.calMove;
    if (!choice) return;
    calMove.close();
    if (!pendingMove || choice === 'cancel') { pendingMove = null; return; }
    const { taskId, index, orig, to } = pendingMove;
    pendingMove = null;
    if (choice === 'once') moveOnce(taskId, index, orig, to);
    else pinSeries(taskId, index, to);
    showToast(choice === 'once' ? 'Moved, just this time.' : 'Moved. It will repeat from the new day.');
  });
  calMove.addEventListener('close', () => { pendingMove = null; });

  calDetail.addEventListener('click', event => {
    const action = event.target.closest('[data-cal-detail]')?.dataset.calDetail;
    if (!action) return;
    const taskId = calDetail.dataset.task;
    const key = calDetail.dataset.key;
    if (action === 'close') { calDetail.close(); return; }
    if (action === 'open') { calDetail.close(); openTaskInRoom(taskId); return; }
    if (action === 'reset') { calDetail.close(); resetSchedule(taskId); showToast('Back to the automatic schedule.'); return; }
    if (action === 'done') { calDetail.close(); if (key) toggleDone(key); return; }
    if (action === 'delete-one-off') {
      const entry = extras.oneOffs.find(item => item.id === taskId);
      if (!entry || !window.confirm(`Delete the one-off “${entry.title}” from ${entry.days.length === 1 ? 'its day' : `all ${entry.days.length} of its days`}? Anything already marked done stays in the done history.`)) return;
      calDetail.close();
      deleteOneOff(taskId);
      renderCalendar();
      showToast('One-off deleted.');
      return;
    }
    const value = document.querySelector('#calMoveDate')?.value;
    if (!value || !key) return;
    const [, part, origIso] = key.split('|');
    const index = Number(part);
    const orig = dayFromIso(origIso);
    calDetail.close();
    if (action === 'once') { moveOnce(taskId, index, orig, dayFromIso(value)); showToast('Moved, just this time.'); }
    if (action === 'always') { pinSeries(taskId, index, dayFromIso(value)); showToast('Moved. It will repeat from the new day.'); }
  });

  // ---- Home: chores done ----

  // One day's completions at a glance -- a total, a bar per person, and what
  // was done when -- plus the seven days ending on that day. A completion
  // counts on the day it was marked done.
  const doneState = { day: todayNumber() };

  function completionMinutes(key) {
    const [taskId, part] = key.split('|');
    const oneOff = extras.oneOffs.find(entry => entry.id === taskId);
    const task = allTasks.find(entry => entry.id === taskId) || (oneOff && oneOffTask(oneOff));
    if (!task) return 0;
    return part === 'then' && task.trigger ? task.trigger.thenEffort || minutesEach(task) : minutesEach(task);
  }

  function completionsOn(iso) {
    return Object.entries(extras.completions)
      .filter(([, entry]) => entry.on === iso)
      .map(([key, entry]) => ({ key, ...entry, minutes: completionMinutes(key) }));
  }

  function renderDoneAnalytics() {
    // A member sees only their own completions; an admin sees everyone's.
    const me = viewerIsAdmin() ? null : viewer();
    const mineOnly = list => me ? list.filter(entry => entry.by === me.name) : list;
    const roster = me ? ownerRoster.filter(owner => owner.value === me.name) : ownerRoster;
    const day = doneState.day;
    const entries = mineOnly(completionsOn(isoOf(day))).sort((a, b) => a.at.localeCompare(b.at));
    const totalMinutes = entries.reduce((sum, entry) => sum + entry.minutes, 0);
    document.querySelector('#doneTitle').textContent = me ? 'Your chores done' : 'Chores done';
    document.querySelector('#doneDay').textContent = formatDay(day, { weekday: 'long', month: 'long', day: 'numeric' });
    document.querySelector('#doneToday').hidden = day === todayNumber();
    document.querySelector('#doneTotal').textContent = entries.length;
    document.querySelector('#doneSummary').textContent = `${entries.length === 1 ? 'chore' : 'chores'} done${entries.length ? ` · ≈ ${formatMinutes(totalMinutes)}` : ''}`;

    const people = roster.map(owner => {
      const mine = entries.filter(entry => entry.by === owner.value);
      return { owner, count: mine.length, minutes: mine.reduce((sum, entry) => sum + entry.minutes, 0) };
    });
    const most = Math.max(1, ...people.map(person => person.count));
    document.querySelector('#doneBars').innerHTML = people.map(({ owner, count, minutes }) => {
      const summary = `${owner.label}: ${count} ${count === 1 ? 'chore' : 'chores'}${count ? `, ≈ ${formatMinutes(minutes)}` : ''}`;
      return `<div class="done-bar-row" role="listitem" title="${escapeHtml(summary)}" aria-label="${escapeHtml(summary)}">
        <span class="done-bar-name">${escapeHtml(owner.label)}</span>
        <span class="done-bar-track" aria-hidden="true"><span class="done-bar" style="width:${(count / most * 100).toFixed(1)}%"></span></span>
        <span class="done-bar-value">${count}${count ? ` <small>≈ ${escapeHtml(formatMinutes(minutes))}</small>` : ''}</span>
      </div>`;
    }).join('');

    const time = iso => {
      const date = new Date(iso);
      return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    };
    document.querySelector('#doneList').innerHTML = entries.length
      ? `<ol class="done-list">${entries.map(entry => `<li><time datetime="${escapeHtml(entry.at)}">${escapeHtml(time(entry.at))}</time><strong>${escapeHtml(ownerLabel(entry.by))}</strong><span>${titleTextHtml(entry.title || entry.key.split('|')[0])}</span></li>`).join('')}</ol>`
      : '<p class="board-empty">Nothing marked done on this day yet. Use the round check on a chore in the Calendar.</p>';

    const days = [...Array(7).keys()].map(offset => day - 6 + offset);
    const perDay = days.map(d => mineOnly(completionsOn(isoOf(d))));
    const head = `<thead><tr><th scope="col">Person</th>${days.map(d => `<th scope="col">${escapeHtml(formatDay(d, { weekday: 'short' }))} ${dateParts(d).d}</th>`).join('')}<th scope="col">Total</th></tr></thead>`;
    const rows = roster.map(owner => {
      const counts = perDay.map(list => list.filter(entry => entry.by === owner.value).length);
      return `<tr><th scope="row">${escapeHtml(owner.label)}</th>${counts.map(n => `<td>${n || '·'}</td>`).join('')}<td><strong>${counts.reduce((a, b) => a + b, 0)}</strong></td></tr>`;
    }).join('');
    const totals = perDay.map(list => list.length);
    const foot = `<tr class="done-week-total"><th scope="row">Everyone</th>${totals.map(n => `<td>${n || '·'}</td>`).join('')}<td><strong>${totals.reduce((a, b) => a + b, 0)}</strong></td></tr>`;
    document.querySelector('#doneWeek').innerHTML = `${head}<tbody>${rows}${me ? '' : foot}</tbody>`;
    // This week's paid-chore earnings: every kid for an admin, a kid's own for
    // them, nothing for a grown-up who isn't an admin.
    const earnings = me && !kids.includes(me.name) ? '' : earningsHtml(weekStartOf(todayNumber()), me ? me.name : '');
    const homeEarnings = document.querySelector('#homeEarnings');
    homeEarnings.innerHTML = earnings;
    homeEarnings.hidden = !earnings;
  }

  // ---- Home: chores overdue ----

  // Everything overdue right now, from the last four weeks: one entry per
  // chore and owner who hasn't done it (a chore nobody owns counts once, as
  // unassigned). The same rule as the red Overdue chips on the Calendar.
  const overdueWindowDays = 28;

  function overdueEntries() {
    const today = todayNumber();
    const entries = [];
    if (overdueFrom === null) return entries;
    for (const item of occurrencesIn(Math.max(today - overdueWindowDays, overdueFrom), today - 1, buildSchedule())) {
      if (item.daily || item.standing) continue;
      const owners = item.plan.owners;
      const minutes = minutesEach(item.plan.task);
      if (!owners.length) {
        if (!doneRecord(item)) entries.push({ item, person: null, day: item.day, minutes });
        continue;
      }
      for (const person of owners) {
        const done = isSharedItem(item) ? personalDone(item, person) : doneRecord(item);
        if (!done) entries.push({ item, person, day: item.day, minutes });
      }
    }
    return entries.sort((a, b) => a.day - b.day || a.item.plan.order - b.item.plan.order);
  }

  function renderOverdueAnalytics() {
    // A member sees only their own; an admin sees everyone's.
    const me = viewerIsAdmin() ? null : viewer();
    const today = todayNumber();
    overdueFrom = trackingStart();
    const all = overdueEntries();
    const entries = me ? all.filter(entry => entry.person === me.name) : all;
    const roster = me ? ownerRoster.filter(owner => owner.value === me.name) : ownerRoster;
    const totalMinutes = entries.reduce((sum, entry) => sum + entry.minutes, 0);
    document.querySelector('#overdueTitle').textContent = me ? 'Your overdue chores' : 'Overdue';
    const since = Math.max(today - overdueWindowDays, overdueFrom ?? today);
    document.querySelector('#overdueWindow').textContent = overdueFrom === null
      ? 'Starts counting once chores are marked done on the Calendar'
      : `Right now · counted from ${formatDay(since, { weekday: 'short', month: 'short', day: 'numeric' })}${since > today - overdueWindowDays ? ', when chores started being marked done' : ` (the last ${overdueWindowDays / 7} weeks)`}`;
    document.querySelector('#overdueTotal').textContent = entries.length;
    document.querySelector('#overdueSummary').textContent = `${entries.length === 1 ? 'chore' : 'chores'} overdue${entries.length ? ` · ≈ ${formatMinutes(totalMinutes)}` : ''}`;

    const people = roster.map(owner => {
      const mine = entries.filter(entry => entry.person === owner.value);
      return { owner, count: mine.length, minutes: mine.reduce((sum, entry) => sum + entry.minutes, 0) };
    });
    const most = Math.max(1, ...people.map(person => person.count));
    document.querySelector('#overdueBars').innerHTML = people.map(({ owner, count, minutes }) => {
      const summary = `${owner.label}: ${count} overdue${count ? `, ≈ ${formatMinutes(minutes)}` : ''}`;
      return `<div class="done-bar-row" role="listitem" title="${escapeHtml(summary)}" aria-label="${escapeHtml(summary)}">
        <span class="done-bar-name">${escapeHtml(owner.label)}</span>
        <span class="done-bar-track" aria-hidden="true"><span class="done-bar" style="width:${(count / most * 100).toFixed(1)}%"></span></span>
        <span class="done-bar-value">${count}${count ? ` <small>≈ ${escapeHtml(formatMinutes(minutes))}</small>` : ''}</span>
      </div>`;
    }).join('');

    const shown = entries.slice(0, 25);
    const late = day => { const n = today - day; return n === 1 ? '1 day late' : `${n} days late`; };
    document.querySelector('#overdueList').innerHTML = entries.length
      ? `<ol class="done-list overdue-list">${shown.map(entry => `<li>
          <time datetime="${escapeHtml(isoOf(entry.day))}">${escapeHtml(formatDay(entry.day, { weekday: 'short', month: 'short', day: 'numeric' }))}</time>
          <strong>${escapeHtml(entry.person ? ownerLabel(entry.person) : 'Unassigned')}</strong>
          <span>${taskTitleHtml(entry.item.plan.task)} <small>· ${escapeHtml(late(entry.day))} · ≈ ${escapeHtml(formatMinutes(entry.minutes))}</small></span>
        </li>`).join('')}</ol>${entries.length > shown.length ? `<p class="allocation-note">And ${entries.length - shown.length} more, oldest first above.</p>` : ''}`
      : `<p class="board-empty">Nothing overdue${me ? ' for you' : ''}. Nice work.</p>`;

    const days = [...Array(7).keys()].map(offset => today - 7 + offset);
    const head = `<thead><tr><th scope="col">Person</th>${days.map(d => `<th scope="col">${escapeHtml(formatDay(d, { weekday: 'short' }))} ${dateParts(d).d}</th>`).join('')}<th scope="col">Total</th></tr></thead>`;
    const rows = roster.map(owner => {
      const counts = days.map(d => entries.filter(entry => entry.person === owner.value && entry.day === d).length);
      return `<tr><th scope="row">${escapeHtml(owner.label)}</th>${counts.map(n => `<td>${n || '·'}</td>`).join('')}<td><strong>${counts.reduce((a, b) => a + b, 0)}</strong></td></tr>`;
    }).join('');
    const totals = days.map(d => entries.filter(entry => entry.day === d).length);
    const foot = `<tr class="done-week-total"><th scope="row">Everyone</th>${totals.map(n => `<td>${n || '·'}</td>`).join('')}<td><strong>${totals.reduce((a, b) => a + b, 0)}</strong></td></tr>`;
    document.querySelector('#overdueWeek').innerHTML = `${head}<tbody>${rows}${me ? '' : foot}</tbody>`;
  }

  document.querySelectorAll('[data-done-step]').forEach(button => button.addEventListener('click', () => {
    doneState.day += Number(button.dataset.doneStep);
    renderDoneAnalytics();
  }));
  document.querySelector('#doneToday').addEventListener('click', () => {
    doneState.day = todayNumber();
    renderDoneAnalytics();
  });

  // ---- Sign-in, roles and simulation ----

  // The signed-in user, and the non-admin an admin is currently viewing the app
  // as. Both last for this browser tab (sessionStorage), so a refresh keeps you
  // signed in and closing the tab signs you out.
  const sessionKey = 'house-manual-session';
  const simulateKey = 'house-manual-simulating';
  const access = { user: null, simulating: null };
  // What a non-admin can open. Admins can open everything.
  const memberViews = new Set(['home', 'owners', 'calendar', 'skills', 'awards', 'maturity']);

  function userById(id) {
    return users.find(user => user.id === id) || null;
  }

  function userByUsername(username) {
    const wanted = String(username ?? '').trim().toLowerCase();
    return users.find(user => usernameOf(user) === wanted) || null;
  }

  // The tab remembers the person's id; a tab signed in before ids existed
  // remembered their original username, which still finds them.
  function userFromSession(value) {
    return userById(value) || users.find(user => user.defaultUsername === value) || null;
  }

  function isAdmin(user) {
    return Boolean(user) && extras.users.admins.includes(user.id);
  }

  // Whose app is showing: the simulated user while an admin simulates one,
  // else whoever signed in.
  function viewer() {
    return access.simulating || access.user;
  }

  function viewerIsAdmin() {
    return isAdmin(viewer());
  }

  function canSee(view) {
    return viewerIsAdmin() || memberViews.has(view);
  }

  function sessionGet(key) {
    try { return sessionStorage.getItem(key); } catch { return null; }
  }

  function sessionSet(key, value) {
    try {
      if (value == null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, value);
    } catch { /* a blocked sessionStorage just means signing in again after a refresh */ }
  }

  // Simulation shows exactly what someone would see, but nothing done there
  // is saved as them.
  function blockedBySimulation() {
    if (!access.simulating) return false;
    showToast('Simulated view: changes are switched off. Return to admin view to make changes.');
    return true;
  }

  // Draws everything that depends on who is signed in and what they may see.
  // Admin-only parts carry data-admin-only and are hidden for everyone else by
  // the stylesheet; views a member may not open fall back to Home.
  function applyAccess() {
    document.body.dataset.auth = access.user ? 'in' : 'out';
    if (!access.user) return;
    const admin = viewerIsAdmin();
    document.body.dataset.role = admin ? 'admin' : 'member';
    document.querySelector('#userName').innerHTML = `${escapeHtml(access.user.label)}<small>${isAdmin(access.user) ? 'Admin' : 'Member'}</small>`;
    const others = users.filter(user => !isAdmin(user));
    document.querySelector('#simulateList').innerHTML = others.length
      ? others.map(user => `<button type="button" class="menu-item" data-simulate="${escapeHtml(user.id)}">${escapeHtml(user.label)} <small>${escapeHtml(usernameOf(user))}</small></button>`).join('')
      : '<p class="menu-note">Everyone is an admin.</p>';
    closeMenus();
    document.querySelector('#simBanner').hidden = !access.simulating;
    document.querySelector('#simName').textContent = access.simulating ? access.simulating.label : '';
    document.querySelector('#ownersTab').textContent = admin ? 'Tasks by owner' : 'My chores';
    document.querySelector('#ownersTitle').textContent = admin ? 'Tasks by owner' : 'My chores';
    if (!admin) calendarState.who = viewer().name;
    showView(canSee(currentView) ? currentView : 'home');
  }

  function signIn(user) {
    access.user = user;
    access.simulating = null;
    sessionSet(sessionKey, user.id);
    sessionSet(simulateKey, null);
    // The home server notes the sign-in itself.
    if (!sync.server) {
      extras.users.lastLogin[user.id] = new Date().toISOString();
      queueSave();
    }
    calendarState.who = '';
    maturityWho = null;
    doneState.day = todayNumber();
    currentView = 'home';
    applyAccess();
    showToast(`Welcome, ${user.label}.`);
  }

  function signOut() {
    if (pendingEdits.size && !discardEdits()) return;
    if (sync.server && hasUnsavedServerChanges() && !window.confirm("Some changes haven't reached the house computer yet. Sign out anyway and lose them?")) return;
    persistState();
    if (sync.server) {
      api('POST', '/api/logout').catch(() => {});
      sessionSet(tokenKey, null);
      clearServerCopy();
    }
    access.user = null;
    access.simulating = null;
    sessionSet(sessionKey, null);
    sessionSet(simulateKey, null);
    applyAccess();
    document.querySelector('#loginForm').elements.username.focus();
  }

  function startSimulation(user) {
    if (!isAdmin(access.user) || !user || isAdmin(user)) return;
    access.simulating = user;
    sessionSet(simulateKey, user.id);
    currentView = 'home';
    applyAccess();
    window.scrollTo({ top: 0 });
  }

  function endSimulation() {
    access.simulating = null;
    sessionSet(simulateKey, null);
    calendarState.who = '';
    currentView = 'home';
    applyAccess();
    showToast('Back to your admin view.');
  }

  const loginForm = document.querySelector('#loginForm');
  // No local config: say how to set up default sign-ins.
  document.querySelector('#loginSetup').hidden = Boolean(localConfig.passwordPattern);
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const error = document.querySelector('#loginError');
    if (sync.server) {
      const fail = message => {
        error.textContent = message;
        error.hidden = false;
        loginForm.elements.password.value = '';
        loginForm.elements.password.focus();
      };
      const reply = await api('POST', '/api/login', { username: loginForm.elements.username.value, password: loginForm.elements.password.value }).catch(() => null);
      if (!reply) return fail("Can't reach the house computer. Is it on, with the House Manual running?");
      if (!reply.ok) return fail(reply.data?.error || "That username and password don't match.");
      sessionSet(tokenKey, reply.data.token);
      if (!await loadServerData()) return fail("Signed in, but the household's data didn't load. Try again.");
      const user = userById(reply.data.userId);
      await offerToMoveOldData(user);
      if (isAdmin(user) && applyDataUpdates()) scheduleServerSave();
      error.hidden = true;
      loginForm.reset();
      signIn(user);
      redrawAfterSync();
      return;
    }
    const user = userByUsername(loginForm.elements.username.value);
    if (!user || !checkPassword(user, loginForm.elements.password.value)) {
      error.textContent = "That username and password don't match.";
      error.hidden = false;
      loginForm.elements.password.value = '';
      loginForm.elements.password.focus();
      return;
    }
    error.hidden = true;
    loginForm.reset();
    signIn(user);
  });
  document.querySelector('#logoutButton').addEventListener('click', signOut);
  document.querySelector('#simulateList').addEventListener('click', event => {
    const choice = event.target.closest('[data-simulate]');
    if (choice) startSimulation(userById(choice.dataset.simulate));
  });
  document.querySelector('#simExit').addEventListener('click', endSimulation);

  // ---- Header menus (Actions, settings gear) ----

  // Both are <details> disclosures: they open and close on their own, and this
  // closes them on a click elsewhere, on Escape, and after a choice is made.
  const headerMenus = [...document.querySelectorAll('.menu')];

  function closeMenus(except = null) {
    for (const menu of headerMenus) if (menu !== except) menu.open = false;
  }

  for (const menu of headerMenus) {
    // Close the other menu as this one is clicked, not on its `toggle` event:
    // that fires later, and two quick clicks would close the wrong menu.
    menu.querySelector('summary').addEventListener('click', () => closeMenus(menu));
    menu.querySelector('.menu-panel').addEventListener('click', event => {
      if (event.target.closest('button')) menu.open = false;
    });
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('.menu')) closeMenus();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const open = headerMenus.find(menu => menu.open);
    if (!open) return;
    open.open = false;
    open.querySelector('summary').focus();
  });

  // ---- Users (admin) ----

  // Admin access can be given or taken away here. You can't change your own --
  // that way nobody demotes themselves by accident -- and the last admin can't
  // be removed. Admins can also change anyone's username and password, or put
  // them back to their default sign-in.
  let editingUser = null;

  function formatWhen(iso) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  function signInEditor(user) {
    const customized = Boolean(extras.users.accounts[user.id]);
    return `<tr class="users-edit"><td colspan="6">
      <form class="users-form" data-user="${escapeHtml(user.id)}" autocomplete="off" novalidate>
        <h3>Change ${escapeHtml(user.label)}'s sign-in</h3>
        <label><span class="field-label">Username</span><input class="text-input" name="username" value="${escapeHtml(usernameOf(user))}" autocomplete="off" autocapitalize="none" spellcheck="false"></label>
        <label><span class="field-label">New password</span><input class="text-input" name="password" type="password" autocomplete="new-password" placeholder="Leave blank to keep the current one"></label>
        <label><span class="field-label">Confirm new password</span><input class="text-input" name="confirm" type="password" autocomplete="new-password"></label>
        <p class="login-error" role="alert" hidden></p>
        <div class="users-form-actions">
          <button type="submit" class="button button-solid button-small">Save</button>
          <button type="button" class="button button-quiet button-small" data-users-cancel>Cancel</button>
          ${customized ? '<button type="button" class="button button-quiet button-small" data-users-default>Back to default sign-in</button>' : ''}
        </div>
        <p class="users-form-note">Usernames are 3–32 lowercase letters, numbers, dots, dashes or underscores. Passwords need at least ${minPasswordLength} characters and are stored scrambled, never as readable text.</p>
      </form>
    </td></tr>`;
  }

  function renderUsers() {
    const adminCount = extras.users.admins.length;
    document.querySelector('#usersRoot').innerHTML = `<div class="allocation-table-wrap"><table class="allocation-table users-table">
      <thead><tr><th scope="col">Name</th><th scope="col">Username</th><th scope="col">Password</th><th scope="col">Access</th><th scope="col">Last signed in</th><th scope="col"><span class="visually-hidden">Change</span></th></tr></thead>
      <tbody>${users.map(user => {
        const admin = isAdmin(user);
        const self = user.id === access.user.id;
        const lastAdmin = admin && adminCount === 1;
        const why = self ? "You can't change your own access." : lastAdmin ? 'There must always be at least one admin.' : '';
        const account = extras.users.accounts[user.id];
        const last = formatWhen(extras.users.lastLogin[user.id]);
        return `<tr>
          <th scope="row">${escapeHtml(user.label)}${self ? ' <small>(you)</small>' : ''}</th>
          <td data-label="Username">${escapeHtml(usernameOf(user))}${account?.username ? '' : ' <small>(default)</small>'}</td>
          <td data-label="Password">${hasCustomPassword(user) ? `Set by an admin${account.changedAt ? `<br><small>${escapeHtml(formatWhen(account.changedAt))}</small>` : ''}` : '<small>Default</small>'}</td>
          <td data-label="Access"><label class="role-toggle"><input type="checkbox" data-admin-toggle="${escapeHtml(user.id)}" ${admin ? 'checked' : ''} ${self || lastAdmin ? 'disabled' : ''}><span>Admin</span></label>${why ? `<br><small>${escapeHtml(why)}</small>` : ''}</td>
          <td data-label="Last signed in">${last ? escapeHtml(last) : '<small>Never</small>'}</td>
          <td><button type="button" class="button button-quiet button-small" data-users-edit="${escapeHtml(user.id)}" aria-expanded="${editingUser === user.id}">Change sign-in</button></td>
        </tr>${editingUser === user.id ? signInEditor(user) : ''}`;
      }).join('')}</tbody></table></div>`;
    if (editingUser) document.querySelector('.users-form [name="username"]')?.focus();
  }

  const usersRoot = document.querySelector('#usersRoot');

  usersRoot.addEventListener('change', event => {
    const box = event.target.closest('[data-admin-toggle]');
    const user = box && userById(box.dataset.adminToggle);
    if (!user || user.id === access.user.id || !viewerIsAdmin()) return;
    const admins = new Set(extras.users.admins);
    if (box.checked) admins.add(user.id);
    else if (admins.size > 1) admins.delete(user.id);
    extras.users.admins = users.map(entry => entry.id).filter(id => admins.has(id));
    queueSave();
    applyAccess();
    showToast(`${user.label} is now ${isAdmin(user) ? 'an admin' : 'a member'}.`);
  });

  usersRoot.addEventListener('click', event => {
    const edit = event.target.closest('[data-users-edit]');
    if (edit) {
      editingUser = editingUser === edit.dataset.usersEdit ? null : edit.dataset.usersEdit;
      renderUsers();
      return;
    }
    if (event.target.closest('[data-users-cancel]')) { editingUser = null; renderUsers(); return; }
    if (event.target.closest('[data-users-default]')) {
      const user = userById(editingUser);
      if (!user || !viewerIsAdmin() || !window.confirm(`Put ${user.label} back to the default username (${user.defaultUsername}) and default password?`)) return;
      if (sync.server) {
        api('POST', '/api/account', { userId: user.id, reset: true }).then(reply => {
          if (!reply.ok) { showToast(reply.data?.error || "That didn't save. Try again."); return; }
          editingUser = null;
          receiveServerData(reply.data);
          redrawAfterSync();
          showToast(`${user.label} is back to the default sign-in.`);
        }).catch(() => showToast("Can't reach the house computer."));
        return;
      }
      delete extras.users.accounts[user.id];
      editingUser = null;
      queueSave();
      renderUsers();
      showToast(`${user.label} is back to the default sign-in.`);
    }
  });

  usersRoot.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target.closest('.users-form');
    const user = form && userById(form.dataset.user);
    if (!user || !viewerIsAdmin()) return;
    const error = form.querySelector('.login-error');
    const fail = message => { error.textContent = message; error.hidden = false; };
    const username = form.elements.username.value.trim().toLowerCase();
    const password = form.elements.password.value;
    const confirm = form.elements.confirm.value;
    if (!usernamePattern.test(username)) return fail('Usernames are 3–32 lowercase letters, numbers, dots, dashes or underscores, starting with a letter or number.');
    const clash = users.find(other => other.id !== user.id && usernameOf(other) === username);
    if (clash) return fail(`${clash.label} already uses that username.`);
    if (password || confirm) {
      if (password.length < minPasswordLength) return fail(`Passwords need at least ${minPasswordLength} characters.`);
      if (password !== confirm) return fail("The two passwords don't match.");
    }
    const usernameChanged = username !== usernameOf(user);
    if (!usernameChanged && !password) { editingUser = null; renderUsers(); return; }
    if (sync.server) {
      // The house computer hashes and keeps the password; it never comes back.
      api('POST', '/api/account', { userId: user.id, username, password }).then(reply => {
        if (!reply.ok) { fail(reply.data?.error || "That didn't save. Try again."); return; }
        editingUser = null;
        receiveServerData(reply.data);
        redrawAfterSync();
        const self = user.id === access.user.id;
        showToast(`Saved ${user.label}'s sign-in.${self ? ' Use the new details next time you sign in.' : ''}`);
      }).catch(() => fail("Can't reach the house computer."));
      return;
    }

    const account = { ...extras.users.accounts[user.id] };
    if (username === user.defaultUsername) delete account.username;
    else account.username = username;
    if (password) {
      account.salt = newSalt();
      account.hash = passwordHash(account.salt, password);
    }
    account.changedAt = new Date().toISOString();
    if (account.username || account.hash) extras.users.accounts[user.id] = account;
    else delete extras.users.accounts[user.id];
    editingUser = null;
    queueSave();
    applyAccess();
    const self = user.id === access.user.id;
    showToast(`Saved ${user.label}'s sign-in.${self ? ' Use the new details next time you sign in.' : ''}`);
  });

  // ---- What a member sees ----

  function renderMySkills() {
    const me = viewer();
    const mine = allSoftSkills().filter(skill => (extras.skillOwners[skill.id] || []).includes(me.name));
    document.querySelector('#skillBoard').innerHTML = mine.length
      ? `<ul class="my-list">${mine.map(skill => `<li><h4>${escapeHtml(skill.title)}</h4>${skill.description ? `<p>${escapeHtml(skill.description)}</p>` : ''}</li>`).join('')}</ul>`
      : '<p class="board-hidden-note">No soft skills for you yet.</p>';
  }

  function renderMyAwards() {
    const me = viewer();
    const mine = extras.awardLog.filter(entry => entry.person === me.name).sort((a, b) => b.at.localeCompare(a.at));
    const month = mine.filter(entry => sameMonth(entry.at)).reduce((sum, entry) => sum + entry.points, 0);
    const all = mine.reduce((sum, entry) => sum + entry.points, 0);
    const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
    awardsRoot.innerHTML = `
      <div class="award-scores"><div class="award-score"><h3>${escapeHtml(me.label)}</h3><strong>${month}</strong><span>points this month · ${all} all time</span></div></div>
      <section class="awards-section"><h3>Ways to earn points</h3>
        <div class="award-types">${extras.awardTypes.map(award => `<article class="award-type">
          <header><h4>${escapeHtml(award.title)}</h4><span class="points">+${award.points}</span></header>
          ${award.description ? `<p>${escapeHtml(award.description)}</p>` : ''}
        </article>`).join('') || '<p class="board-empty">None yet.</p>'}</div>
      </section>
      <section class="awards-section"><h3>Your awards</h3>
        ${mine.length ? `<ol class="award-log">${mine.map(entry => `<li>
          <time datetime="${escapeHtml(entry.at)}">${escapeHtml(dateFormat.format(new Date(entry.at)))}</time>
          <strong>${escapeHtml(me.label)}</strong><span>${escapeHtml(entry.title)}</span><span class="points">+${entry.points}</span><span></span>
        </li>`).join('')}</ol>` : '<p class="board-empty">No awards yet.</p>'}
      </section>`;
  }

  // ---- Maturity Marks ----

  // Expectations, one card per heading, grouped in sections. They start as the
  // Family & Home Needs document (maturity.js), copied into the saved data
  // once; after that they are ordinary data that admins add to, edit and
  // delete here. Everyone sees the cards meant for them; an admin picks a
  // person from User name, or Everyone, and starts on their own cards when
  // they have any.
  const maturitySeed = 'maturity-marks-2026-10';
  let maturityWho = null;

  function seedMaturity(target) {
    if (target.applied.includes(maturitySeed)) return false;
    const source = window.HOUSE_MANUAL_MATURITY || { sections: [] };
    target.maturity = cleanMaturity({ sections: source.sections.map((section, index) => ({ ...section, id: `maturity-section-${index + 1}` })) });
    target.applied.push(maturitySeed);
    return true;
  }

  function maturityData() {
    return extras.maturity || (extras.maturity = { sections: [] });
  }

  function maturitySections(person) {
    return maturityData().sections
      .map(section => ({ ...section, cards: section.cards.filter(card => !person || card.people.includes(person)) }))
      .filter(section => section.cards.length);
  }

  function findMaturityCard(cardId) {
    for (const section of maturityData().sections) {
      const card = section.cards.find(entry => entry.id === cardId);
      if (card) return { section, card };
    }
    return null;
  }

  function maturityItemHtml(item) {
    const label = item.label ? `<strong>${escapeHtml(item.label)}:</strong>${item.text ? ' ' : ''}` : '';
    return `<li${item.kind === 'need' ? ' class="is-need"' : ''}>${label}${escapeHtml(item.text)}${item.subitems?.length ? `<ul>${item.subitems.map(maturityItemHtml).join('')}</ul>` : ''}</li>`;
  }

  // The chores that carry part of a card out, while they are kept.
  function maturityChores(card) {
    return (card.chores || []).map(findTask).filter(task => task && taskState(task.id).decision !== 'remove');
  }

  function maturityCardHtml(card) {
    const people = card.people.map(id => userById(id)?.label || id);
    const chores = maturityChores(card);
    return `<article class="maturity-card">
      <header>
        <h4>${escapeHtml(card.title)}</h4><p class="maturity-people">${people.length ? `For ${escapeHtml(people.join(', '))}` : 'Not shown to anyone yet'}</p>
        <button type="button" class="chip maturity-edit" data-maturity-edit="${escapeHtml(card.id)}" data-admin-only>Edit</button>
      </header>
      ${card.items.length ? `<ul class="maturity-items">${card.items.map(maturityItemHtml).join('')}</ul>` : ''}
      ${chores.length ? `<p class="maturity-chores"><span class="field-label">On the chore list</span>${chores.map(task => `<span class="maturity-chore">${escapeHtml(task.title)} · ${escapeHtml(task.cadence)}</span>`).join('')}</p>` : ''}
    </article>`;
  }

  function renderMaturity() {
    const admin = viewerIsAdmin();
    const me = viewer();
    if (admin && maturityWho === null) maturityWho = maturitySections(me.id).length ? me.id : '';
    // A member (or a simulated one) always sees just their own cards.
    const who = admin ? maturityWho : me.id;
    const select = document.querySelector('#maturityWho');
    select.innerHTML = `<option value="">Everyone</option>${users.map(user => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.label)} (${maturitySections(user.id).reduce((sum, section) => sum + section.cards.length, 0)})</option>`).join('')}`;
    select.value = who;
    const person = who ? userById(who) : null;
    const character = person ? (window.HOUSE_MANUAL_CHARACTERS || {})[person.name] : null;
    // Admins looking at Everyone also see cards that aren't for anyone yet.
    const shown = who ? maturitySections(who) : maturityData().sections.filter(section => section.cards.length);
    document.querySelector('#maturityRoot').innerHTML = `
      ${person ? `<div class="maturity-person">${character ? `<figure class="maturity-character" title="${escapeHtml(`${person.label}: ${character.name}`)}">${character.svg}</figure>` : ''}<h3>${escapeHtml(person.label)}</h3></div>` : ''}
      ${shown.length
        ? shown.map(section => `<section class="maturity-section">
            <div class="maturity-section-head"><h3 class="maturity-section-title">${escapeHtml(section.title || 'Untitled section')}</h3>
              <button type="button" class="chip" data-maturity-add="${escapeHtml(section.id)}" data-admin-only>+ Add a card here</button></div>
            <div class="maturity-grid">${section.cards.map(maturityCardHtml).join('')}</div></section>`).join('')
        : `<p class="board-hidden-note">No Maturity Marks for ${escapeHtml(person ? person.label : 'anyone')} yet.</p>`}`;
  }

  document.querySelector('#maturityWho').addEventListener('change', event => {
    maturityWho = event.target.value;
    renderMaturity();
  });

  // ---- Maturity Marks: adding and editing cards (admins) ----

  // Expectations are edited as text, one per line: "Label: what it means".
  // A line that starts with a space, "-" or "•" is a sub-point of the line
  // above it. A label that mentions "core need" is shown highlighted.
  function maturityItemLine(item) {
    return item.label ? `${item.label}: ${item.text}`.trim() : item.text;
  }

  function maturityItemsToText(items) {
    return items.flatMap(item => [maturityItemLine(item), ...(item.subitems || []).map(sub => `  - ${maturityItemLine(sub)}`)]).join('\n');
  }

  function maturityItemsFromText(value) {
    const items = [];
    for (const raw of value.split(/\r?\n/)) {
      if (!raw.trim()) continue;
      const nested = /^(\s+|\s*[-•*]\s)/.test(raw) && items.length > 0;
      const line = raw.replace(/^\s*[-•*]?\s*/, '').trim();
      const match = /^([^:]{1,90}):\s*(.*)$/.exec(line);
      const item = match ? { label: match[1].trim(), text: match[2].trim() } : { label: '', text: line };
      if (/core need/i.test(item.label)) item.kind = 'need';
      if (nested) (items[items.length - 1].subitems ||= []).push(item);
      else items.push(item);
    }
    return items;
  }

  const maturityDialog = document.querySelector('#maturityDialog');
  const maturityForm = document.querySelector('#maturityForm');
  const maturitySection = document.querySelector('#maturitySection');
  const maturityChoreSearch = document.querySelector('#maturityChoreSearch');
  const maturityChoreList = document.querySelector('#maturityChores');
  const maturityChoreIds = new Set();
  let maturityEditing = null;

  function renderMaturityChores() {
    const words = maturityChoreSearch.value.trim().toLowerCase();
    const kept = allTasks.filter(task => taskState(task.id).decision !== 'remove');
    const linked = kept.filter(task => maturityChoreIds.has(task.id));
    const matches = words
      ? kept.filter(task => !maturityChoreIds.has(task.id) && `${task.title} ${sectionFor(task).name}`.toLowerCase().includes(words)).slice(0, 30)
      : [];
    const row = task => `<label class="pull-item"><input type="checkbox" value="${task.id}" ${maturityChoreIds.has(task.id) ? 'checked' : ''}>
      <span>${taskTitleHtml(task)}</span><small>${escapeHtml(task.cadence || task.frequency)}</small></label>`;
    maturityChoreList.innerHTML = [...linked, ...matches].map(row).join('')
      || `<p class="board-empty">${words ? 'No chores match.' : 'No chores linked. Search to add one.'}</p>`;
  }

  function syncMaturitySection() {
    const isNew = maturitySection.value === '';
    document.querySelector('#maturityNewSection').hidden = !isNew;
    maturityForm.elements.newSection.required = isNew;
  }

  // cardId: the card to edit; otherwise a new card, in sectionId if given.
  function openMaturityEditor({ cardId = null, sectionId = null } = {}) {
    if (!viewerIsAdmin()) return;
    const found = cardId ? findMaturityCard(cardId) : null;
    const sections = maturityData().sections;
    const card = found ? found.card : { title: '', people: maturityWho ? [maturityWho] : [], items: [], chores: [] };
    maturityEditing = found ? card.id : null;
    maturityForm.reset();
    document.querySelector('#maturityDialogTitle').textContent = found ? 'Edit card' : 'Add a card';
    document.querySelector('#maturityDelete').hidden = !found;
    maturityForm.elements.title.value = card.title;
    maturitySection.innerHTML = `${sections.map(section => `<option value="${escapeHtml(section.id)}">${escapeHtml(section.title || 'Untitled section')}</option>`).join('')}<option value="">New section…</option>`;
    maturitySection.value = found ? found.section.id : sectionId || sections[0]?.id || '';
    syncMaturitySection();
    document.querySelector('#maturityPeople').innerHTML = ownerChecks(card.people, users.map(user => user.id), 'name="people"');
    maturityForm.elements.items.value = maturityItemsToText(card.items);
    maturityChoreIds.clear();
    card.chores.forEach(id => maturityChoreIds.add(id));
    maturityChoreSearch.value = '';
    renderMaturityChores();
    maturityDialog.showModal();
    maturityForm.elements.title.focus();
  }

  function saveMaturityCard() {
    const form = new FormData(maturityForm);
    const title = String(form.get('title') ?? '').trim();
    if (!title) return;
    const data = maturityData();
    let section = data.sections.find(entry => entry.id === maturitySection.value);
    if (!section) {
      const name = String(form.get('newSection') ?? '').trim();
      if (!name) return;
      section = { id: newId('maturity-section'), title: name, cards: [] };
      data.sections.push(section);
    }
    const card = {
      id: maturityEditing || newId('maturity-card'),
      title,
      people: form.getAll('people').filter(id => userById(id)),
      items: maturityItemsFromText(String(form.get('items') ?? '')),
      chores: [...maturityChoreIds]
    };
    // Editing: replace in place, or move to the chosen section.
    const previous = maturityEditing ? findMaturityCard(maturityEditing) : null;
    if (previous && previous.section === section) {
      section.cards[section.cards.indexOf(previous.card)] = card;
    } else {
      if (previous) previous.section.cards.splice(previous.section.cards.indexOf(previous.card), 1);
      section.cards.push(card);
    }
    data.sections = data.sections.filter(entry => entry.cards.length);
    queueSave();
    maturityDialog.close();
    renderMaturity();
    showToast(previous ? `Saved “${title}”.` : `Added “${title}”.`);
  }

  function deleteMaturityCard() {
    const found = maturityEditing ? findMaturityCard(maturityEditing) : null;
    if (!found || !window.confirm(`Delete the card “${found.card.title}”? This cannot be undone.`)) return;
    found.section.cards.splice(found.section.cards.indexOf(found.card), 1);
    const data = maturityData();
    data.sections = data.sections.filter(entry => entry.cards.length);
    queueSave();
    maturityDialog.close();
    renderMaturity();
    showToast('Card deleted.');
  }

  document.querySelector('#maturityRoot').addEventListener('click', event => {
    const edit = event.target.closest('[data-maturity-edit]');
    if (edit) { openMaturityEditor({ cardId: edit.dataset.maturityEdit }); return; }
    const add = event.target.closest('[data-maturity-add]');
    if (add) openMaturityEditor({ sectionId: add.dataset.maturityAdd });
  });
  document.querySelector('#maturityAdd').addEventListener('click', () => openMaturityEditor());
  maturitySection.addEventListener('change', syncMaturitySection);
  maturityChoreSearch.addEventListener('input', renderMaturityChores);
  maturityChoreList.addEventListener('change', event => {
    const box = event.target.closest('input[type="checkbox"]');
    if (!box) return;
    if (box.checked) maturityChoreIds.add(box.value); else maturityChoreIds.delete(box.value);
  });
  maturityForm.addEventListener('submit', event => { event.preventDefault(); saveMaturityCard(); });
  document.querySelector('#maturityCancel').addEventListener('click', () => maturityDialog.close());
  document.querySelector('#maturityDelete').addEventListener('click', deleteMaturityCard);

  // ---- Views ----

  const views = ['home', 'review', 'owners', 'assign', 'calendar', 'skills', 'awards', 'maturity', 'users'];

  function renderCurrentView() {
    if (!access.user) return;
    const admin = viewerIsAdmin();
    if (currentView === 'owners') renderOwners();
    if (currentView === 'home') { if (admin) renderDashboard(); renderDoneAnalytics(); renderOverdueAnalytics(); }
    if (currentView === 'assign') renderBoard('chores');
    if (currentView === 'calendar') renderCalendar();
    if (currentView === 'skills') { if (admin) renderBoard('skills'); else renderMySkills(); }
    if (currentView === 'awards') { if (admin) renderAwards(); else renderMyAwards(); }
    if (currentView === 'review') renderSection();
    if (currentView === 'users') renderUsers();
    if (currentView === 'maturity') renderMaturity();
  }

  function showView(view) {
    if (!canSee(view)) view = 'home';
    currentView = view;
    for (const name of views) document.querySelector(`#${name}View`).hidden = name !== view;
    document.body.dataset.view = view;
    document.querySelectorAll('[data-view]').forEach(button => {
      if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    renderCurrentView();
  }
  document.querySelector('.feature-tabs').addEventListener('click', event => {
    const button = event.target.closest('[data-view]');
    if (button) showView(button.dataset.view);
  });
  document.querySelector('#ownerGroups').addEventListener('click', event => {
    const button = event.target.closest('[data-open-task]');
    if (button) openTaskInRoom(button.dataset.openTask);
  });

  function buildPrintView() {
    const today = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date());
    const cover = `<div class="print-cover"><div><p>House Manual</p><h1>Gallery</h1><p>Every chore, room by room</p><p>${reviewedCount()} of ${allTasks.length} tasks reviewed</p><p>Saved ${escapeHtml(today)}</p></div></div>`;
    const printed = sections.map(section => {
      const groups = groupByFrequency(section.tasks).map(({ name, tasks }) => `<h3 class="print-frequency">${escapeHtml(name)} (${tasks.length})</h3>
        <table class="print-table"><thead><tr><th>Task / standard</th><th>Current owner</th><th>Decision</th><th>New owner</th><th>Notes</th></tr></thead><tbody>
        ${tasks.map(task => { const item = taskState(task.id); return `<tr><td><div class="print-task-title">${escapeHtml(taskTitle(task, section))}</div><div class="print-cadence">${escapeHtml(task.cadence)}${task.standard ? ` · ${escapeHtml(task.standard)}` : ''}${task.checklist?.length ? ` · Checklist: ${escapeHtml(task.checklist.join(', '))}` : ''}${subtasksFor(task).length ? ` · Subtasks: ${escapeHtml(subtasksFor(task).map(sub => `${sub.title} (${sub.cadence || sub.frequency})`).join('; '))}` : ''}</div></td><td>${escapeHtml(ownersFor(task).map(ownerLabel).join(', '))}</td><td>${escapeHtml(item.decision ? item.decision[0].toUpperCase() + item.decision.slice(1) : '')}</td><td>${escapeHtml(item.newOwner)}</td><td>${escapeHtml(item.notes)}</td></tr>`; }).join('')}
        </tbody></table>`).join('');
      return `<section class="print-section"><h2>${escapeHtml(section.name)} · ${reviewedCount(section.tasks)}/${section.tasks.length}</h2>${groups}</section>`;
    }).join('');
    printRoot.innerHTML = cover + printed;
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
    if (!file) return;
    // Restore replaces what is saved in this browser and there is no undo, so
    // always confirm. Counting only reviewed tasks would skip the question when
    // the review is empty but chores done, awards or calendar changes are not.
    const reviewed = reviewedCount();
    const proceed = window.confirm(
      `Restore "${file.name}"?\n\n` +
      `This replaces the review in this browser (${reviewed} of ${allTasks.length} tasks have entries right now). ` +
      'A backup saved by this version of the app also replaces added tasks, soft skills, awards, calendar changes, chores marked done and who is an admin. ' +
      'This cannot be undone.\n\n' +
      'To keep the current version, cancel and use Save file first.'
    );
    if (!proceed) { restoreFileInput.value = ''; return; }
    restoreBackup(file);
  });

  function registerWebMcp() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const register = tool => Promise.resolve(context.registerTool(tool)).catch(() => {});
    register({
      name: 'set_task_review', title: 'Set task review',
      description: 'Update the decision, new owner, and notes for one House Manual task.',
      inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, decision: { type: 'string', enum: ['', 'keep', 'remove'] }, newOwner: { type: 'string' }, notes: { type: 'string' } }, required: ['taskId'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!allTasks.some(task => task.id === input.taskId)) throw new Error('Unknown taskId');
        const patch = {};
        if (input.decision !== undefined) patch.decision = normalizeDecision(input.decision);
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
      execute() { return { reviewed: reviewedCount(), total: allTasks.length, sections: sections.map(section => ({ id: section.id, name: section.name, reviewed: reviewedCount(section.tasks), total: section.tasks.length })) }; }
    });
  }

  // ---- Home server: one shared copy of the data ----

  // Opened from the home server (server/server.js), the app keeps no data of
  // its own: it loads the household's data after sign-in, saves every change
  // back, and checks every few seconds for changes made on other devices.
  // Opened any other way (the plain file server, a copy of the files), it
  // works as before, with the data in this browser.
  //
  // Saving sends the whole copy with the version it started from. If someone
  // else saved in between, the server sends back the newer data instead; this
  // device then replays its own changes onto it -- field by field, item by
  // item -- and tries again. A change to something the other person also
  // changed is dropped in favour of theirs, and the person is told.
  const tokenKey = 'house-manual-token';
  const sync = { server: false, version: 0, initialized: true, base: null, timer: null, inFlight: false, again: false, retry: null };

  async function api(method, url, body) {
    const headers = {};
    const token = sessionGet(tokenKey);
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
    let data = null;
    try { data = await response.json(); } catch { data = null; }
    return { ok: response.ok, status: response.status, data };
  }

  async function detectServer() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const response = await fetch('/api/status', { cache: 'no-store', signal: controller.signal });
      clearTimeout(timer);
      const data = response.ok ? await response.json() : null;
      return Boolean(data && data.server === true);
    } catch {
      return false;
    }
  }

  function setSaveStatus(text, error = false) {
    saveStatus.textContent = text;
    if (error) saveStatus.setAttribute('data-error', 'true');
    else saveStatus.removeAttribute('data-error');
  }

  const isPlainObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const isIdList = list => Array.isArray(list) && list.every(item => isPlainObject(item) && typeof item.id === 'string');
  const copyOf = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

  function sameValue(a, b) {
    if (a === b) return true;
    if (Array.isArray(a) || Array.isArray(b)) {
      return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, index) => sameValue(item, b[index]));
    }
    if (!isPlainObject(a) || !isPlainObject(b)) return false;
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) if (!sameValue(a[key], b[key])) return false;
    return true;
  }

  function snapshot() {
    return copyOf({ tasks: state, extras });
  }

  // Every change from `before` to `after`, as small as it can be: a field of
  // an object, or one item of a list of things with ids (one award, one task
  // added in the app). Anything else that changed counts as one change.
  function changesBetween(before, after, path = [], out = []) {
    if (sameValue(before, after)) return out;
    if (isPlainObject(before) && isPlainObject(after)) {
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) changesBetween(before[key], after[key], [...path, key], out);
    } else if (isIdList(before) && isIdList(after)) {
      const byId = list => new Map(list.map(item => [item.id, item]));
      const was = byId(before), now = byId(after);
      for (const id of new Set([...was.keys(), ...now.keys()])) changesBetween(was.get(id), now.get(id), [...path, { id }], out);
    } else {
      out.push({ path, before, after });
    }
    return out;
  }

  function stepInto(node, step) {
    if (node == null || typeof node !== 'object') return undefined;
    return typeof step === 'object' ? (Array.isArray(node) ? node.find(item => item?.id === step.id) : undefined) : node[step];
  }

  function valueAt(root, path) {
    return path.reduce(stepInto, root);
  }

  // Puts a value at a path, making the objects on the way. False when the
  // place has gone (an item someone else deleted).
  function setAt(root, path, value) {
    let node = root;
    for (let index = 0; index < path.length - 1; index++) {
      const step = path[index];
      let next = stepInto(node, step);
      if (next == null) {
        if (typeof step === 'object') return false;
        next = typeof path[index + 1] === 'object' ? [] : {};
        node[step] = next;
      }
      if (typeof next !== 'object') return false;
      node = next;
    }
    const last = path[path.length - 1];
    if (typeof last === 'object') {
      if (!Array.isArray(node)) return false;
      const index = node.findIndex(item => item?.id === last.id);
      if (value === undefined) { if (index >= 0) node.splice(index, 1); }
      else if (index >= 0) node[index] = value;
      else node.push(value);
    } else if (value === undefined) {
      delete node[last];
    } else {
      node[last] = value;
    }
    return true;
  }

  // Replays changes onto newer data. Returns how many could not be kept
  // because someone else changed the same thing.
  function replayChanges(target, changes) {
    let clashes = 0;
    for (const change of changes) {
      const now = valueAt(target, change.path);
      if (sameValue(now, change.after)) continue;
      if (sameValue(now, change.before) && setAt(target, change.path, copyOf(change.after))) continue;
      clashes++;
    }
    return clashes;
  }

  function normalizedServerData(data) {
    const tasks = isPlainObject(data.tasks) ? data.tasks : {};
    for (const record of Object.values(tasks)) {
      if (record && typeof record === 'object') record.decision = normalizeDecision(record.decision);
    }
    return { tasks, extras: cleanExtras(data.extras) };
  }

  // Takes data from the server, keeping any changes made here that it hasn't
  // seen yet. With `replace`, changes made here are dropped (a restore).
  function receiveServerData(data, { replace = false } = {}) {
    const changes = !replace && sync.base ? changesBetween(sync.base, snapshot()) : [];
    const fresh = normalizedServerData(data);
    sync.base = copyOf(fresh);
    sync.version = data.version;
    sync.initialized = data.initialized !== false;
    const clashes = replayChanges(fresh, changes);
    state = fresh.tasks;
    extras = fresh.extras;
    rebuildSections();
    return { pending: changes.length > clashes, clashes };
  }

  function hasUnsavedServerChanges() {
    return sync.server && Boolean(sync.base) && !sameValue(snapshot(), sync.base);
  }

  // The one-time updates the app applies to saved data (owner updates, the
  // starter soft skills and awards, moving old AI notes, the Maturity Marks
  // cards). Only an admin's device applies them to the shared copy.
  function applyDataUpdates() {
    let updated = false;
    if (!extras.applied.includes(reviewUpdate)) {
      applyReviewUpdates(state);
      extras.applied.push(reviewUpdate);
      updated = true;
    }
    if (!extras.applied.includes(starterSeed)) {
      seedStarters(extras);
      updated = true;
    }
    if (moveAiNotes(state, extras)) updated = true;
    if (seedMaturity(extras)) updated = true;
    if (updated) rebuildSections();
    if (seedOwnersFromCatalog()) updated = true;
    return updated;
  }

  function redrawAfterSync() {
    // Only on the home server, for an admin, in a browser that still has data
    // from before it.
    document.querySelector('#moveOldDataButton').hidden = !(sync.server && access.user && isAdmin(access.user) && oldBrowserData());
    renderNav();
    renderPendingBar();
    if (access.user) applyAccess();
  }

  function scheduleServerSave() {
    clearTimeout(sync.timer);
    sync.timer = setTimeout(pushToServer, 300);
  }

  async function pushToServer() {
    if (!sync.server || !access.user || !sync.base) return;
    if (sync.inFlight) { sync.again = true; return; }
    sync.inFlight = true;
    clearTimeout(sync.retry);
    try {
      for (let attempt = 0; attempt < 6; attempt++) {
        const local = snapshot();
        if (sameValue(local, sync.base)) break;
        setSaveStatus('Saving...');
        const reply = await api('PUT', '/api/data', { baseVersion: sync.version, tasks: local.tasks, extras: local.extras });
        if (reply.ok) {
          sync.version = reply.data.version;
          sync.base = local;
          continue;
        }
        if (reply.status === 409) {
          const { clashes } = receiveServerData(reply.data);
          redrawAfterSync();
          if (clashes) showToast(`Someone else changed ${clashes === 1 ? 'the same thing' : `${clashes} of the same things`} at the same time; their version was kept.`);
          continue;
        }
        if (reply.status === 401) { sessionEnded(); return; }
        throw new Error(reply.data?.error || 'Not saved');
      }
      setSaveStatus('Saved on the house computer');
    } catch {
      setSaveStatus("Not saved: can't reach the house computer. Retrying...", true);
      sync.retry = setTimeout(pushToServer, 10000);
    } finally {
      sync.inFlight = false;
      if (sync.again) { sync.again = false; pushToServer(); }
    }
  }

  // Loads the household's data after signing in (or returning to a tab that
  // was signed in). False if the sign-in has run out or the server can't be
  // reached.
  async function loadServerData() {
    const reply = await api('GET', '/api/data').catch(() => null);
    if (!reply || !reply.ok) return false;
    sync.base = null;
    receiveServerData(reply.data, { replace: true });
    return true;
  }

  // The first time an admin signs in, this browser may still hold everything
  // from before the home server existed. Offer to move it into the shared
  // copy, once.
  function oldBrowserData() {
    try {
      const tasks = JSON.parse(localStorage.getItem(storageKey) || 'null');
      const saved = JSON.parse(localStorage.getItem(extrasKey) || 'null');
      if (!isPlainObject(tasks) || !Object.keys(tasks).length) return null;
      return { tasks, extras: cleanExtras(saved) };
    } catch {
      return null;
    }
  }

  // Asked once per browser, at an admin's sign-in, whatever the shared copy
  // already holds; after that (moved, or declined) it is in the Actions menu.
  const movedKey = 'house-manual-moved-to-server';

  function localGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function localSet(key, value) {
    try { localStorage.setItem(key, value); } catch { /* the menu item still works */ }
  }

  async function offerToMoveOldData(user, { fromMenu = false } = {}) {
    if (!isAdmin(user)) return false;
    const old = oldBrowserData();
    if (!old || (!fromMenu && localGet(movedKey))) return false;
    const question = "This browser still has House Manual data from before the house computer kept it.\n\nMove it into the shared copy now, so every device sees it? This replaces what the shared copy holds now (the house computer keeps a backup of it).";
    if (!window.confirm(question)) {
      if (!fromMenu) localSet(movedKey, 'declined');
      if (!fromMenu) showToast("Not moved. You can do it later from Actions → Move this browser's old data in.");
      return false;
    }
    const reply = await api('POST', '/api/import', old).catch(() => null);
    if (reply?.ok) {
      localSet(movedKey, new Date().toISOString());
      pendingEdits.clear();
      receiveServerData(reply.data, { replace: true });
      showToast("Moved this browser's data into the shared copy.");
      return true;
    }
    showToast(reply?.data?.error || "Couldn't move the data. Try Restore file instead.");
    return false;
  }

  document.querySelector('#moveOldDataButton').addEventListener('click', async () => {
    closeMenus();
    if (await offerToMoveOldData(access.user, { fromMenu: true })) redrawAfterSync();
  });

  function sessionEnded() {
    sessionSet(tokenKey, null);
    clearServerCopy();
    access.user = null;
    access.simulating = null;
    sessionSet(sessionKey, null);
    sessionSet(simulateKey, null);
    applyAccess();
    showToast('Signed out. Please sign in again.');
  }

  // Nothing of the household's stays in the page once signed out.
  function clearServerCopy() {
    clearTimeout(sync.timer);
    clearTimeout(sync.retry);
    state = {};
    extras = emptyExtras();
    sync.base = null;
    pendingEdits.clear();
    rebuildSections();
  }

  // Busy typing, in a dialog or a menu: wait, so a refresh can't move things
  // under someone's fingers.
  function busyForRefresh() {
    const active = document.activeElement;
    return Boolean(document.querySelector('dialog[open], details.menu[open]'))
      || Boolean(active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) && !active.closest('#loginForm'));
  }

  async function checkForChanges() {
    if (!sync.server || !access.user || !sync.base || sync.inFlight || document.hidden || busyForRefresh()) return;
    try {
      const status = await api('GET', '/api/status');
      if (!status.ok || status.data.version === sync.version) return;
      const reply = await api('GET', '/api/data');
      if (reply.status === 401) { sessionEnded(); return; }
      if (!reply.ok || sync.inFlight || busyForRefresh()) return;
      const { pending, clashes } = receiveServerData(reply.data);
      redrawAfterSync();
      if (clashes) showToast('Someone else changed the same thing at the same time; their version was kept.');
      if (pending) scheduleServerSave();
      if (!saveStatus.hasAttribute('data-error')) setSaveStatus('Saved on the house computer');
    } catch {
      setSaveStatus("Can't reach the house computer", true);
    }
  }

  setInterval(checkForChanges, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForChanges(); });
  window.addEventListener('beforeunload', event => {
    if (!hasUnsavedServerChanges() && !sync.inFlight) return;
    event.preventDefault();
    event.returnValue = '';
  });

  // ---- Start ----

  async function start() {
    sync.server = await detectServer();
    if (sync.server) {
      // The household's data arrives after sign-in.
      state = {};
      extras = emptyExtras();
      rebuildSections();
      setSaveStatus('Saved on the house computer');
      document.querySelector('#loginSetup').hidden = true;
    } else {
      state = loadState();
      extras = loadExtras();
      rebuildSections();
      if (applyDataUpdates()) writeState();
    }

    document.body.dataset.view = currentView;
    renderNav();
    renderSection();
    updateProgress();
    registerWebMcp();

    // Still signed in from earlier in this tab? Pick up where it left off,
    // including a simulation in progress; otherwise show the sign-in screen.
    let returning = userFromSession(sessionGet(sessionKey));
    if (returning && sync.server && !(sessionGet(tokenKey) && await loadServerData())) {
      sessionSet(tokenKey, null);
      sessionSet(sessionKey, null);
      returning = null;
    }
    if (returning) {
      access.user = returning;
      const simulated = userFromSession(sessionGet(simulateKey));
      if (simulated && isAdmin(returning) && !isAdmin(simulated)) access.simulating = simulated;
      if (sync.server && isAdmin(returning) && applyDataUpdates()) scheduleServerSave();
    }
    if (sync.server) redrawAfterSync();
    applyAccess();
    if (!access.user) loginForm.elements.username.focus();
  }

  start();
})();
