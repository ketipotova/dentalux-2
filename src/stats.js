const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Persisted to the same Railway volume as the knowledge base.
const DIR = process.env.KB_DATA_DIR || "/data";
const FILE = path.join(DIR, "stats.json");
const MAX_RECENT = 50; // rolling activity feed
const MAX_DAILY = 45; // keep ~6 weeks of daily counts

function tbilisiDate(d = new Date()) {
  // en-CA gives YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tbilisi" }).format(d);
}

// Store a short hash of the Instagram user id, never the raw id — and never
// any message text. We only ever need counts.
function hashUser(id) {
  return crypto.createHash("sha256").update(String(id)).digest("hex").slice(0, 12);
}

let persistable = null;
function canPersist() {
  if (persistable !== null) return persistable;
  try {
    fs.accessSync(DIR, fs.constants.W_OK);
    persistable = true;
  } catch {
    persistable = false;
  }
  return persistable;
}

function blank() {
  return {
    since: new Date().toISOString(),
    totals: { messages: 0, claude: 0, gemini: 0, failures: 0, ig_send_failures: 0 },
    daily: {}, // { "YYYY-MM-DD": count }
    users: {}, // { hash: { count, first, last } }
    recent: [], // [{ ts, type, provider }]
  };
}

let cache = null;
function load() {
  if (cache) return cache;
  if (canPersist() && fs.existsSync(FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(FILE, "utf8"));
    } catch {
      cache = blank();
    }
  } else {
    cache = blank();
  }
  return cache;
}

function save() {
  if (!canPersist() || !cache) return;
  const tmp = `${FILE}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(cache));
    fs.renameSync(tmp, FILE); // atomic replace
  } catch (e) {
    console.error("[stats] write failed:", e.message);
  }
}

function pushRecent(s, evt) {
  s.recent.unshift(evt);
  if (s.recent.length > MAX_RECENT) s.recent.length = MAX_RECENT;
}

function pruneDaily(s) {
  const keys = Object.keys(s.daily).sort();
  while (keys.length > MAX_DAILY) delete s.daily[keys.shift()];
}

// provider: "claude" | "gemini" | null (both providers failed)
function recordMessage(userId, provider) {
  try {
    const s = load();
    const day = tbilisiDate();
    s.totals.messages++;
    if (provider === "claude") s.totals.claude++;
    else if (provider === "gemini") s.totals.gemini++;
    else s.totals.failures++;
    s.daily[day] = (s.daily[day] || 0) + 1;
    pruneDaily(s);
    if (userId != null) {
      const h = hashUser(userId);
      const now = new Date().toISOString();
      const u = s.users[h] || { count: 0, first: now, last: now };
      u.count++;
      u.last = now;
      s.users[h] = u;
    }
    pushRecent(s, { ts: new Date().toISOString(), type: "message", provider: provider || "failed" });
    save();
  } catch (e) {
    console.error("[stats] recordMessage failed:", e.message);
  }
}

function recordIgFailure() {
  try {
    const s = load();
    s.totals.ig_send_failures++;
    pushRecent(s, { ts: new Date().toISOString(), type: "ig_send_failure" });
    save();
  } catch (e) {
    console.error("[stats] recordIgFailure failed:", e.message);
  }
}

function summary() {
  const s = load();
  const today = tbilisiDate();
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const key = tbilisiDate(new Date(Date.now() - i * 86400000));
    days.push({ day: key, count: s.daily[key] || 0 });
  }
  const userVals = Object.values(s.users);
  const activeToday = userVals.filter(
    (u) => u.last && tbilisiDate(new Date(u.last)) === today
  ).length;
  return {
    since: s.since,
    totals: s.totals,
    uniqueUsers: userVals.length,
    activeToday,
    messagesToday: s.daily[today] || 0,
    last7: days.slice(-7).reduce((a, d) => a + d.count, 0),
    days,
    recent: s.recent.slice(0, 20),
    persistent: canPersist(),
  };
}

module.exports = { recordMessage, recordIgFailure, summary };
