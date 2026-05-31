const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Where the live, editable KB lives in production.
const VOLUME_DIR = process.env.KB_DATA_DIR || "/data";
const VOLUME_PATH = path.join(VOLUME_DIR, "knowledge-base.json");

// The repo-tracked copy is the seed for first boot and the local-dev fallback.
const SEED_PATH = path.join(__dirname, "..", "knowledge-base.json");

let activePathCache = null;
let localDevMode = false;
function resolveActivePath() {
  if (activePathCache) return activePathCache;
  try {
    fs.accessSync(VOLUME_DIR, fs.constants.W_OK);
    if (!fs.existsSync(VOLUME_PATH)) {
      const seed = fs.readFileSync(SEED_PATH, "utf8");
      fs.writeFileSync(VOLUME_PATH, seed);
      console.error(`[kb-store] Seeded ${VOLUME_PATH} from ${SEED_PATH}`);
    }
    activePathCache = VOLUME_PATH;
  } catch {
    activePathCache = SEED_PATH;
    localDevMode = true;
    console.error(`[kb-store] Volume ${VOLUME_DIR} not writable, using ${SEED_PATH} (local-dev mode)`);
  }
  return activePathCache;
}

function ensureIds(kb) {
  let changed = false;
  for (const key of ["doctors", "services"]) {
    if (!Array.isArray(kb[key])) continue;
    for (const item of kb[key]) {
      if (!item.id) {
        item.id = crypto.randomUUID();
        changed = true;
      }
    }
  }
  // One-time migration: flat services (price_from_gel at top level) become
  // categories with a single procedure carrying the price. Admin can later
  // add more procedures or rename them.
  for (const s of kb.services || []) {
    if (Array.isArray(s.procedures)) continue;
    s.procedures = [
      {
        name: "ძირითადი",
        price_from_gel: s.price_from_gel,
      },
    ];
    delete s.price_from_gel;
    changed = true;
  }
  return changed;
}

let cached = null;
function load() {
  if (cached) return cached;
  const path = resolveActivePath();
  const raw = fs.readFileSync(path, "utf8");
  const kb = JSON.parse(raw);
  // Auto-migrate IDs onto the volume copy. In local-dev mode we keep the
  // ID assignment in-memory so the tracked seed file stays clean.
  if (ensureIds(kb) && !localDevMode) {
    fs.writeFileSync(path, JSON.stringify(kb, null, 2));
  }
  cached = kb;
  return kb;
}

function save(kb) {
  ensureIds(kb);
  fs.writeFileSync(resolveActivePath(), JSON.stringify(kb, null, 2));
  cached = kb;
}

function reload() {
  cached = null;
  return load();
}

module.exports = { load, save, reload, activePath: resolveActivePath };
