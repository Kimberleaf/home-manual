// House Manual home server.
//
// Serves the app (dist/) to every device on the home network and keeps the one
// shared copy of the household's data in data/ on this computer. No cloud and
// no packages: Node's own http, fs and crypto only.
//
//   node server/server.js            start on port 8347 and open a browser
//   node server/server.js --no-open  start without opening a browser
//   node server/server.js --port 9000
//
// What lives in data/ (accounts.json and sessions.json are git-ignored):
//   household.json   the shared data: review records (`tasks`) and `extras`
//   accounts.json    password salts and hashes an admin has set
//   sessions.json    who is signed in, by token, so a restart keeps them in
//   backups/         a dated copy of household.json at most once an hour
//
// Who can do what is checked here, not just in the page: a password is
// checked against data/accounts.json or the household's default pattern
// (dist/local-config.js), admins may change anything, and everyone else may
// only mark chores done. Password hashes never leave this computer.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');
const crypto = require('crypto');
const { execFile } = require('child_process');

const args = process.argv.slice(2);
const argValue = name => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };

const projectDir = path.resolve(__dirname, '..');
const distDir = path.join(projectDir, 'dist');
// --data <folder> keeps the data somewhere else (a test copy, say).
const dataDir = path.resolve(projectDir, argValue('--data') || 'data');
const backupDir = path.join(dataDir, 'backups');
const files = {
  household: path.join(dataDir, 'household.json'),
  accounts: path.join(dataDir, 'accounts.json'),
  sessions: path.join(dataDir, 'sessions.json')
};

const port = Number(argValue('--port') || process.env.PORT || 8347);
const openBrowser = !args.includes('--no-open');

// The household, as in ownerRoster and defaultAdmins in dist/app.js. Each
// person's id is their first name and never changes.
const roster = ['Kimberly', 'Michael', 'Brighton', 'Oliver', 'Ephraim'];
const defaultAdmins = ['Michael', 'Kimberly'];
const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const minPasswordLength = 8;
const sessionDays = 30;
const maxBody = 8 * 1024 * 1024;

// ---- Local sign-in defaults (dist/local-config.js) ----

function readLocalConfig() {
  const file = path.join(distDir, 'local-config.js');
  if (!fs.existsSync(file)) return {};
  try {
    const sandbox = { window: {} };
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { timeout: 500 });
    const config = sandbox.window.HOUSE_MANUAL_LOCAL || {};
    return {
      familyName: typeof config.familyName === 'string' ? config.familyName.trim().toLowerCase() : '',
      passwordPattern: typeof config.passwordPattern === 'string' ? config.passwordPattern : ''
    };
  } catch (error) {
    console.warn(`  Could not read dist/local-config.js: ${error.message}`);
    return {};
  }
}

const localConfig = readLocalConfig();

function defaultUsername(id) {
  return localConfig.familyName ? `${id[0].toLowerCase()}${localConfig.familyName}` : id.toLowerCase();
}

function defaultPassword(id) {
  const pattern = localConfig.passwordPattern || '';
  if (!pattern) return null;
  return pattern.includes('{name}') ? pattern.split('{name}').join(id) : pattern;
}

// ---- Storage ----

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

// Write to a temporary file and rename it over the old one, so a crash or a
// full disk can never leave half a file behind.
function writeJson(file, value) {
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 1));
  fs.renameSync(temp, file);
}

fs.mkdirSync(backupDir, { recursive: true });

let household = readJson(files.household, null) || { version: 0, initialized: false, updatedAt: null, tasks: {}, extras: {} };
let accounts = readJson(files.accounts, {});
let sessions = readJson(files.sessions, {});

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function usersOf(data) {
  const extras = isObject(data.extras) ? data.extras : {};
  return isObject(extras.users) ? extras.users : {};
}

function adminsOf(data) {
  const admins = Array.isArray(usersOf(data).admins) ? usersOf(data).admins.filter(id => roster.includes(id)) : [];
  return admins.length ? admins : defaultAdmins;
}

function usernameFor(id) {
  const account = usersOf(household).accounts?.[id];
  return (isObject(account) && typeof account.username === 'string' && account.username) || defaultUsername(id);
}

// A dated copy at most once an hour, keeping the latest 200.
function backupIfDue() {
  const stamp = new Date().toISOString().slice(0, 13).replace('T', '-');
  const target = path.join(backupDir, `household-${stamp}.json`);
  if (fs.existsSync(target) || !fs.existsSync(files.household)) return;
  fs.copyFileSync(files.household, target);
  const all = fs.readdirSync(backupDir).filter(name => name.startsWith('household-')).sort();
  for (const old of all.slice(0, Math.max(0, all.length - 200))) fs.unlinkSync(path.join(backupDir, old));
}

function saveHousehold() {
  backupIfDue();
  household.version += 1;
  household.updatedAt = new Date().toISOString();
  writeJson(files.household, household);
}

// What a device is sent: everything except password salts and hashes, with a
// flag saying whether each person has a password an admin set.
function publicData() {
  const extras = JSON.parse(JSON.stringify(isObject(household.extras) ? household.extras : {}));
  extras.users = isObject(extras.users) ? extras.users : {};
  const shown = {};
  for (const id of roster) {
    const kept = {};
    const account = isObject(extras.users.accounts) ? extras.users.accounts[id] : null;
    if (isObject(account) && typeof account.username === 'string' && account.username) kept.username = account.username;
    if (isObject(account) && typeof account.changedAt === 'string') kept.changedAt = account.changedAt;
    if (accounts[id]?.hash) kept.hasPassword = true;
    if (Object.keys(kept).length) shown[id] = kept;
  }
  extras.users.accounts = shown;
  return { version: household.version, initialized: household.initialized, tasks: household.tasks || {}, extras };
}

// ---- Sessions and sign-in ----

const failures = new Map();

function tooManyFailures(ip) {
  const entry = failures.get(ip);
  return entry && entry.count >= 5 && Date.now() - entry.last < 60 * 1000;
}

function noteFailure(ip) {
  const entry = failures.get(ip) || { count: 0, last: 0 };
  if (Date.now() - entry.last > 60 * 1000) entry.count = 0;
  entry.count += 1;
  entry.last = Date.now();
  failures.set(ip, entry);
}

function checkPassword(id, password) {
  const account = accounts[id];
  if (account?.hash) {
    const hash = crypto.createHash('sha256').update(`${account.salt}:${password}`).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(account.hash));
  }
  const fallback = defaultPassword(id);
  return fallback !== null && password === fallback;
}

function sessionFor(request) {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const session = token && sessions[token];
  if (!session) return null;
  if (Date.now() - Date.parse(session.lastSeen) > sessionDays * 864e5) {
    delete sessions[token];
    writeJson(files.sessions, sessions);
    return null;
  }
  session.lastSeen = new Date().toISOString();
  return { ...session, token, admin: adminsOf(household).includes(session.userId) };
}

// ---- HTTP helpers ----

function send(response, status, body, headers = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  response.writeHead(status, {
    'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  response.end(text);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', chunk => {
      size += chunk.length;
      if (size > maxBody) { reject(new Error('too large')); request.destroy(); return; }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(new Error('bad json')); }
    });
    request.on('error', reject);
  });
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png', '.woff2': 'font/woff2'
};

function serveStatic(request, response, pathname) {
  // The page needs the family name for default usernames, but the password
  // pattern stays on this computer: the server checks passwords itself.
  if (pathname === '/local-config.js') {
    send(response, 200, `window.HOUSE_MANUAL_LOCAL = ${JSON.stringify({ familyName: localConfig.familyName || '' })};\n`, { 'Content-Type': mimeTypes['.js'] });
    return;
  }
  const relative = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const file = path.normalize(path.join(distDir, relative));
  if (!file.startsWith(distDir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    send(response, 404, 'Not found');
    return;
  }
  response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(response);
}

// ---- API ----

const routes = {
  // Lets the page know it is talking to the home server, and the latest
  // version of the data, so devices can tell when to fetch it again.
  'GET /api/status': () => [200, { server: true, version: household.version, initialized: household.initialized }],

  'POST /api/login': (body, session, request) => {
    const ip = request.socket.remoteAddress || '';
    if (tooManyFailures(ip)) return [429, { error: 'Too many tries. Wait a minute and try again.' }];
    const username = String(body.username || '').trim().toLowerCase();
    const id = roster.find(person => usernameFor(person) === username);
    if (!id || !checkPassword(id, String(body.password || ''))) {
      noteFailure(ip);
      return [401, { error: "That username and password don't match." }];
    }
    failures.delete(ip);
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date().toISOString();
    sessions[token] = { userId: id, createdAt: now, lastSeen: now };
    writeJson(files.sessions, sessions);
    household.extras = isObject(household.extras) ? household.extras : {};
    household.extras.users = isObject(household.extras.users) ? household.extras.users : {};
    household.extras.users.lastLogin = { ...(household.extras.users.lastLogin || {}), [id]: now };
    saveHousehold();
    return [200, { token, userId: id }];
  },

  'POST /api/logout': (body, session) => {
    if (session) { delete sessions[session.token]; writeJson(files.sessions, sessions); }
    return [200, { ok: true }];
  },

  'GET /api/data': (body, session) => session ? [200, publicData()] : [401, { error: 'Sign in again.' }],

  // Saves a device's copy. `baseVersion` is the version it started from; if
  // someone else saved since, the device is sent the newer data to merge its
  // changes into, and tries again. Admins' copies are taken whole, apart from
  // sign-in details the server keeps itself; everyone else's only for the
  // chores they marked done.
  'PUT /api/data': (body, session) => {
    if (!session) return [401, { error: 'Sign in again.' }];
    if (!isObject(body.tasks) || !isObject(body.extras)) return [400, { error: 'Bad data.' }];
    if (body.baseVersion !== household.version) return [409, publicData()];
    const current = isObject(household.extras) ? household.extras : {};
    const currentUsers = usersOf(household);
    let tasks = household.tasks;
    let extras;
    if (session.admin) {
      extras = body.extras;
      extras.users = isObject(extras.users) ? extras.users : {};
      extras.users.accounts = currentUsers.accounts || {};
      extras.users.lastLogin = currentUsers.lastLogin || {};
      tasks = body.tasks;
    } else {
      extras = { ...current, completions: isObject(body.extras.completions) ? body.extras.completions : {} };
    }
    // Nothing new (a member's copy differing only in what they can't change):
    // keep the version, so other devices don't fetch the same data again.
    if (JSON.stringify(tasks) === JSON.stringify(household.tasks) && JSON.stringify(extras) === JSON.stringify(current)) {
      return [200, { version: household.version }];
    }
    household.tasks = tasks;
    household.extras = extras;
    if (session.admin) household.initialized = true;
    saveHousehold();
    return [200, { version: household.version }];
  },

  // An admin's Restore file, and moving a browser's old data in for the first
  // time: replaces the shared data. Password hashes in the file (an admin set
  // them in the old, browser-only app) move into accounts.json.
  'POST /api/import': (body, session) => {
    if (!session) return [401, { error: 'Sign in again.' }];
    if (!session.admin) return [403, { error: 'Only an admin can do that.' }];
    if (!isObject(body.tasks) || !isObject(body.extras)) return [400, { error: 'Bad data.' }];
    const extras = body.extras;
    extras.users = isObject(extras.users) ? extras.users : {};
    const incoming = isObject(extras.users.accounts) ? extras.users.accounts : {};
    const kept = {};
    for (const id of roster) {
      const account = incoming[id];
      if (!isObject(account)) continue;
      if (/^[0-9a-f]{32}$/.test(account.salt || '') && /^[0-9a-f]{64}$/.test(account.hash || '')) accounts[id] = { salt: account.salt, hash: account.hash };
      const shown = {};
      if (typeof account.username === 'string' && usernamePattern.test(account.username)) shown.username = account.username;
      if (typeof account.changedAt === 'string') shown.changedAt = account.changedAt;
      if (Object.keys(shown).length) kept[id] = shown;
    }
    writeJson(files.accounts, accounts);
    extras.users.accounts = kept;
    extras.users.lastLogin = { ...(extras.users.lastLogin || {}), ...(usersOf(household).lastLogin || {}) };
    household.tasks = body.tasks;
    household.extras = extras;
    household.initialized = true;
    saveHousehold();
    return [200, publicData()];
  },

  // An admin changes someone's username and/or password, or puts them back to
  // the defaults. The password arrives once, is hashed here, and is never
  // stored or sent anywhere readable.
  'POST /api/account': (body, session) => {
    if (!session) return [401, { error: 'Sign in again.' }];
    if (!session.admin) return [403, { error: 'Only an admin can do that.' }];
    const id = roster.find(person => person === body.userId);
    if (!id) return [400, { error: 'Unknown person.' }];
    household.extras = isObject(household.extras) ? household.extras : {};
    household.extras.users = isObject(household.extras.users) ? household.extras.users : {};
    const shown = isObject(household.extras.users.accounts) ? household.extras.users.accounts : {};
    household.extras.users.accounts = shown;
    if (body.reset === true) {
      delete accounts[id];
      delete shown[id];
    } else {
      const username = String(body.username || '').trim().toLowerCase();
      if (!usernamePattern.test(username)) return [400, { error: 'Usernames are 3–32 lowercase letters, numbers, dots, dashes or underscores, starting with a letter or number.' }];
      const clash = roster.find(person => person !== id && usernameFor(person) === username);
      if (clash) return [400, { error: `${clash} already uses that username.` }];
      const password = typeof body.password === 'string' ? body.password : '';
      if (password && password.length < minPasswordLength) return [400, { error: `Passwords need at least ${minPasswordLength} characters.` }];
      const account = { ...(shown[id] || {}) };
      if (username === defaultUsername(id)) delete account.username; else account.username = username;
      if (password) {
        const salt = crypto.randomBytes(16).toString('hex');
        accounts[id] = { salt, hash: crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex') };
      }
      account.changedAt = new Date().toISOString();
      shown[id] = account;
    }
    writeJson(files.accounts, accounts);
    saveHousehold();
    return [200, publicData()];
  }
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://house.local');
  const route = routes[`${request.method} ${url.pathname}`];
  try {
    if (route) {
      const body = request.method === 'GET' ? {} : await readBody(request);
      const [status, result] = route(body, sessionFor(request), request);
      send(response, status, result);
      return;
    }
    if (url.pathname.startsWith('/api/')) { send(response, 404, { error: 'Not found.' }); return; }
    if (request.method !== 'GET' && request.method !== 'HEAD') { send(response, 405, 'Method not allowed'); return; }
    serveStatic(request, response, url.pathname);
  } catch (error) {
    send(response, error.message === 'too large' ? 413 : 400, { error: 'That request could not be read.' });
  }
});

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat()
    .filter(entry => entry && entry.family === 'IPv4' && !entry.internal)
    .map(entry => entry.address);
}

function open(url) {
  if (!openBrowser) return;
  if (process.platform === 'win32') execFile('cmd', ['/c', 'start', '', url]);
  else execFile(process.platform === 'darwin' ? 'open' : 'xdg-open', [url]);
}

// Started twice? If this app is already running on the port, just open it.
server.on('error', error => {
  if (error.code !== 'EADDRINUSE') throw error;
  http.get(`http://localhost:${port}/api/status`, reply => {
    let text = '';
    reply.on('data', chunk => { text += chunk; });
    reply.on('end', () => {
      if (/"server":true/.test(text)) {
        console.log(`\n  House Manual is already running at http://localhost:${port}/ - opening it.\n`);
        open(`http://localhost:${port}/`);
        setTimeout(() => process.exit(0), 1500);
      } else {
        console.error(`\n  Port ${port} is in use by something else. Close it, or start with --port <another number>.\n`);
        process.exit(1);
      }
    });
  }).on('error', () => {
    console.error(`\n  Port ${port} is in use by something else. Close it, or start with --port <another number>.\n`);
    process.exit(1);
  });
});

// No host: Node listens on IPv6 and IPv4 both, so "localhost" works whichever
// one the browser tries first.
server.listen(port, () => {
  console.log('');
  console.log(`  House Manual is running.`);
  console.log(`  On this computer:   http://localhost:${port}/`);
  for (const address of lanAddresses()) console.log(`  On the home Wi-Fi:  http://${address}:${port}/`);
  console.log(`  Shared data:        ${files.household}`);
  if (!localConfig.passwordPattern) console.log('  Note: dist/local-config.js has no passwordPattern, so only passwords an admin set will work.');
  console.log('  Keep this window open; closing it stops the app for everyone.');
  console.log('');
  open(`http://localhost:${port}/`);
});
