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

// One-time taxonomy migration. The original 14 flat services were each
// promoted to their own category by the earlier procedures migration, but
// many of them were really procedures (extractions, restorations, etc.).
// This rewrites them into 7 proper categories, name-matching so any service
// the admin added/renamed after the previous migration is preserved
// untouched. Guarded by kb.schema_version; runs at most once.
function migrateTaxonomy(kb) {
  if ((kb.schema_version || 0) >= 2) return false;
  if (!Array.isArray(kb.services)) {
    kb.schema_version = 2;
    return true;
  }

  // Each target category lists name-matchers; the first matching original
  // service is collapsed into a procedure under the category.
  const TAXONOMY = [
    {
      name: "იმპლანტაცია / Implantation",
      brands: ["Straumann", "Neodent", "X-Gate", "MIS", "MegaGen"],
      sources: [
        { match: /იმპლანტაცია|implantation/i, procName: "სტანდარტული იმპლანტი" },
      ],
    },
    {
      name: "ჰიგიენა / Hygiene",
      sources: [
        { match: /პროფესიული წმენდა|professional cleaning/i, procName: "პროფესიული წმენდა" },
      ],
    },
    {
      name: "თერაპია / Therapeutic Dentistry",
      sources: [
        { match: /კარიესის მკურნალობა|caries treatment/i, procName: "კარიესის მკურნალობა" },
        { match: /რესტავრაცია კომპოზიტით|composite restoration/i, procName: "რესტავრაცია კომპოზიტით" },
      ],
    },
    {
      name: "ქირურგია / Surgery",
      sources: [
        { match: /სიბრძნის კბილის ამოღება|wisdom tooth/i, procName: "სიბრძნის კბილის ამოღება" },
        { match: /(^|[\s\/])კბილის ამოღება|^tooth extraction|\/\s*tooth extraction/i, procName: "კბილის ამოღება" },
        { match: /გინგივოპლასტიკა|gingivoplasty/i, procName: "გინგივოპლასტიკა" },
      ],
    },
    {
      name: "ესთეტიკა / Aesthetic",
      sources: [
        { match: /კბილების გათეთრება|teeth whitening/i, procName: "კბილების გათეთრება" },
        { match: /გრილზი|grillz/i, procName: "გრილზი" },
      ],
    },
    {
      name: "პროთეზირება / Prosthetics",
      brands: ["E-MAX"],
      sources: [
        { match: /ვინირები|veneers/i, procName: "ვინირები" },
        { match: /zirconium/i, procName: "ცირკონიუმის პროთეზი" },
        { match: /e-?max prosthet|პროთეზირება E-?max/i, procName: "E-max პროთეზი" },
      ],
    },
    {
      name: "ორთოდონტია / Orthodontics",
      sources: [
        { match: /ორთოდონტიული კონსულტაცია|orthodontic consultation/i, procName: "ორთოდონტიული კონსულტაცია" },
        { match: /ორთოდონტიული მკურნალობა|braces/i, procName: "ბრეკეტებით მკურნალობა" },
      ],
    },
  ];

  const consumed = new Set();
  const newCategories = [];
  for (const cat of TAXONOMY) {
    const procedures = [];
    for (const source of cat.sources) {
      const match = kb.services.find(
        (s) => !consumed.has(s.id) && source.match.test(s.name || "")
      );
      if (!match) continue;
      consumed.add(match.id);
      const price = (match.procedures || []).find((p) => p.price_from_gel != null)
        ?.price_from_gel;
      const proc = { id: crypto.randomUUID(), name: source.procName };
      if (price != null) proc.price_from_gel = price;
      procedures.push(proc);
    }
    if (!procedures.length) continue;
    const entry = { id: crypto.randomUUID(), name: cat.name, procedures };
    if (cat.brands) entry.brands = cat.brands;
    newCategories.push(entry);
  }

  // Preserve any services the admin added that didn't match a known source.
  const preserved = kb.services.filter((s) => !consumed.has(s.id));
  kb.services = [...newCategories, ...preserved];
  kb.schema_version = 2;
  return true;
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
    if (!Array.isArray(s.procedures)) {
      s.procedures = [
        {
          name: "ძირითადი",
          price_from_gel: s.price_from_gel,
        },
      ];
      delete s.price_from_gel;
      changed = true;
    }
    // Ensure every procedure has a stable id so it can be addressed by URL.
    for (const p of s.procedures) {
      if (!p.id) {
        p.id = crypto.randomUUID();
        changed = true;
      }
    }
  }
  return changed;
}

let cached = null;
function load() {
  if (cached) return cached;
  const path = resolveActivePath();
  const raw = fs.readFileSync(path, "utf8");
  const kb = JSON.parse(raw);
  // Run migrations top-down: structural (procedures, ids) first, then the
  // taxonomy reshuffle. Each returns true if it changed anything. Persist
  // only in production; local-dev mode keeps the tracked seed clean.
  const changedStruct = ensureIds(kb);
  const changedTaxonomy = migrateTaxonomy(kb);
  if ((changedStruct || changedTaxonomy) && !localDevMode) {
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
