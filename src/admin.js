const express = require("express");
const crypto = require("crypto");
const kbStore = require("./kb-store");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Basic-auth gate. Both env vars must be set or every admin request 503s.
function basicAuth(req, res, next) {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return res
      .status(503)
      .send("Admin panel not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD env vars.");
  }
  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) {
    res.set("WWW-Authenticate", 'Basic realm="Dentalux admin"');
    return res.status(401).send("Authentication required");
  }
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const colon = decoded.indexOf(":");
  if (colon < 0) {
    res.set("WWW-Authenticate", 'Basic realm="Dentalux admin"');
    return res.status(401).send("Authentication required");
  }
  const user = decoded.slice(0, colon);
  const pass = decoded.slice(colon + 1);
  if (!safeEqual(user, ADMIN_USERNAME) || !safeEqual(pass, ADMIN_PASSWORD)) {
    res.set("WWW-Authenticate", 'Basic realm="Dentalux admin"');
    return res.status(401).send("Authentication required");
  }
  next();
}

function safeEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

// ----- HTML helpers -----

function esc(v) {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CSS = `
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f1115; color: #e7e9ee; margin: 0; padding: 0; line-height: 1.5; }
header { background: #161922; border-bottom: 1px solid #232735; padding: 16px 24px; }
header .brand { font-weight: 600; font-size: 18px; }
header .brand a { color: #e7e9ee; text-decoration: none; }
nav { display: flex; gap: 18px; margin-top: 8px; flex-wrap: wrap; }
nav a { color: #9aa3b2; text-decoration: none; font-size: 14px; }
nav a:hover, nav a.active { color: #e7e9ee; }
main { max-width: 960px; margin: 0 auto; padding: 28px 24px; }
h1 { font-size: 22px; margin: 0 0 6px; }
h2 { font-size: 16px; margin: 28px 0 10px; color: #c4cad6; font-weight: 600; }
.muted { color: #7a8090; font-size: 13px; }
.flash { background: #1e3a26; color: #b6f5c8; padding: 10px 14px; border-radius: 6px; margin-bottom: 20px; font-size: 14px; }
.flash.error { background: #3a1e1e; color: #f5b6b6; }
table { width: 100%; border-collapse: collapse; margin-top: 12px; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #232735; vertical-align: top; font-size: 14px; }
th { background: #161922; color: #9aa3b2; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; }
td .row-actions { display: flex; gap: 10px; }
form { margin: 0; }
fieldset { border: 1px solid #232735; border-radius: 8px; padding: 16px 20px 20px; margin: 0 0 18px; }
legend { padding: 0 8px; color: #9aa3b2; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
label { display: block; margin: 12px 0 4px; font-size: 13px; color: #c4cad6; }
input[type="text"], input[type="number"], input[type="password"], textarea, select {
  width: 100%; padding: 9px 11px; background: #1a1e29; color: #e7e9ee; border: 1px solid #2c3142; border-radius: 6px; font-size: 14px; font-family: inherit;
}
textarea { font-family: "SF Mono", Menlo, monospace; font-size: 13px; min-height: 220px; resize: vertical; line-height: 1.55; }
input:focus, textarea:focus, select:focus { outline: none; border-color: #6c8bff; }
.btn { display: inline-block; padding: 9px 16px; background: #4a6cf7; color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; text-decoration: none; font-family: inherit; }
.btn:hover { background: #5a7bff; }
.btn.secondary { background: transparent; color: #c4cad6; border: 1px solid #2c3142; }
.btn.secondary:hover { border-color: #4a6cf7; color: #e7e9ee; }
.btn.danger { background: #b03a3a; }
.btn.danger:hover { background: #c44848; }
.btn-row { margin-top: 18px; display: flex; gap: 10px; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; margin-top: 12px; }
.card { background: #161922; padding: 18px; border-radius: 8px; border: 1px solid #232735; }
.card a { color: #e7e9ee; text-decoration: none; }
.card .count { font-size: 28px; font-weight: 600; margin: 6px 0 2px; }
.card .label { font-size: 12px; color: #9aa3b2; text-transform: uppercase; letter-spacing: 0.5px; }
.checkboxes { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 6px; }
.checkboxes label { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 14px; color: #e7e9ee; }
.checkboxes input { width: auto; margin: 0; }
.hint { font-size: 12px; color: #7a8090; margin-top: 4px; }
`;

const SECTIONS = [
  { path: "doctors", label: "Doctors" },
  { path: "services", label: "Services" },
  { path: "insurance", label: "Insurance" },
  { path: "clinic", label: "Clinic info" },
  { path: "routing", label: "Routing" },
  { path: "raw", label: "Raw JSON" },
];

function layout(req, title, content) {
  const flash = req.query.flash ? `<div class="flash">${esc(req.query.flash)}</div>` : "";
  const error = req.query.error ? `<div class="flash error">${esc(req.query.error)}</div>` : "";
  const navLinks = SECTIONS.map((s) => {
    const active = req.path.startsWith(`/admin/${s.path}`) ? " active" : "";
    return `<a class="nav-link${active}" href="/admin/${s.path}">${s.label}</a>`;
  }).join("");
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Dentalux admin</title>
<style>${CSS}</style>
</head><body>
<header>
  <div class="brand"><a href="/admin">Dentalux admin</a></div>
  <nav><a href="/admin"${req.path === "/admin" ? ' class="active"' : ""}>Dashboard</a>${navLinks}</nav>
</header>
<main>
  ${flash}${error}
  <h1>${esc(title)}</h1>
  ${content}
</main>
</body></html>`;
}

// ----- View renderers -----

function renderDashboard(req, kb) {
  const cards = [
    { count: (kb.doctors || []).length, label: "Doctors", href: "/admin/doctors" },
    { count: (kb.services || []).length, label: "Services", href: "/admin/services" },
    { count: (kb.insurance_partners || []).length, label: "Insurance partners", href: "/admin/insurance" },
  ]
    .map(
      (c) =>
        `<div class="card"><a href="${c.href}"><div class="label">${esc(c.label)}</div><div class="count">${c.count}</div><div class="muted">Manage →</div></a></div>`
    )
    .join("");
  const body = `<p class="muted">Live knowledge base. Edits here are reflected in the bot immediately.</p><div class="cards">${cards}</div>`;
  return layout(req, "Dashboard", body);
}

function renderDoctorsList(req, doctors) {
  const rows = doctors
    .map(
      (d) => `<tr>
  <td><strong>${esc(d.name || "(no name)")}</strong>${d.name_ka ? `<div class="muted">${esc(d.name_ka)}</div>` : ""}</td>
  <td>${esc(d.specialty || "")}</td>
  <td>${esc((d.working_days || []).join(", "))}</td>
  <td class="row-actions">
    <a class="btn secondary" href="/admin/doctors/${esc(d.id)}/edit">Edit</a>
    <form method="post" action="/admin/doctors/${esc(d.id)}/delete" onsubmit="return confirm('Delete ${esc(d.name)}?')"><button class="btn danger" type="submit">Delete</button></form>
  </td>
</tr>`
    )
    .join("");
  const body = `
<div class="btn-row"><a class="btn" href="/admin/doctors/new">+ Add doctor</a></div>
<table><thead><tr><th>Name</th><th>Specialty</th><th>Working days</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="4" class="muted">No doctors yet.</td></tr>`}</tbody></table>`;
  return layout(req, "Doctors", body);
}

function renderDoctorForm(req, doctor, isNew) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const wd = new Set(doctor.working_days || []);
  const checkboxes = days
    .map(
      (d) =>
        `<label><input type="checkbox" name="working_days" value="${d}"${wd.has(d) ? " checked" : ""}> ${d}</label>`
    )
    .join("");
  const action = isNew ? "/admin/doctors" : `/admin/doctors/${esc(doctor.id)}`;
  // Show all the structured fields we surface in forms; everything else
  // (philosophy, certifications, etc.) is editable via the raw JSON textarea.
  const structuredKeys = new Set([
    "id",
    "name",
    "name_ka",
    "specialty",
    "experience_years",
    "branch",
    "schedule",
    "working_days",
    "languages",
    "focus",
  ]);
  const extras = Object.fromEntries(
    Object.entries(doctor).filter(([k]) => !structuredKeys.has(k))
  );
  const extrasJson = isNew ? "{}" : JSON.stringify(extras, null, 2);
  const body = `<form method="post" action="${action}">
<fieldset><legend>Core</legend>
  <label>Name (English) *</label>
  <input type="text" name="name" required value="${esc(doctor.name)}">
  <label>Name (Georgian)</label>
  <input type="text" name="name_ka" value="${esc(doctor.name_ka)}">
  <label>Specialty *</label>
  <input type="text" name="specialty" required value="${esc(doctor.specialty)}">
  <label>Experience (years)</label>
  <input type="number" name="experience_years" min="0" value="${esc(doctor.experience_years)}">
</fieldset>
<fieldset><legend>Schedule</legend>
  <label>Working days</label>
  <div class="checkboxes">${checkboxes}</div>
  <label>Schedule note</label>
  <input type="text" name="schedule" value="${esc(doctor.schedule)}" placeholder="e.g. Mon-Fri 10:00-14:30">
  <label>Branch</label>
  <input type="text" name="branch" value="${esc(doctor.branch)}">
</fieldset>
<fieldset><legend>Detail</legend>
  <label>Languages (comma-separated)</label>
  <input type="text" name="languages" value="${esc((doctor.languages || []).join(", "))}" placeholder="Georgian, English, Russian">
  <label>Focus areas (comma-separated)</label>
  <input type="text" name="focus" value="${esc((doctor.focus || []).join(", "))}" placeholder="implants, complex surgery">
  <label>Additional fields (JSON)</label>
  <textarea name="extras">${esc(extrasJson)}</textarea>
  <div class="hint">Free-form JSON for fields not surfaced above (philosophy, certifications, training, services, etc.). Merged into the doctor record on save.</div>
</fieldset>
<div class="btn-row">
  <button class="btn" type="submit">${isNew ? "Create doctor" : "Save changes"}</button>
  <a class="btn secondary" href="/admin/doctors">Cancel</a>
</div>
</form>`;
  return layout(req, isNew ? "Add doctor" : `Edit ${doctor.name || "doctor"}`, body);
}

function renderServicesList(req, services) {
  const rows = services
    .map(
      (s) => `<tr>
  <td><strong>${esc(s.name || "")}</strong></td>
  <td>${s.price_from_gel != null ? esc(s.price_from_gel) + " GEL" : ""}</td>
  <td>${esc((s.brands || []).join(", "))}</td>
  <td class="row-actions">
    <a class="btn secondary" href="/admin/services/${esc(s.id)}/edit">Edit</a>
    <form method="post" action="/admin/services/${esc(s.id)}/delete" onsubmit="return confirm('Delete this service?')"><button class="btn danger" type="submit">Delete</button></form>
  </td>
</tr>`
    )
    .join("");
  const body = `
<div class="btn-row"><a class="btn" href="/admin/services/new">+ Add service</a></div>
<table><thead><tr><th>Name</th><th>From</th><th>Brands</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="4" class="muted">No services yet.</td></tr>`}</tbody></table>`;
  return layout(req, "Services", body);
}

function renderServiceForm(req, service, isNew) {
  const action = isNew ? "/admin/services" : `/admin/services/${esc(service.id)}`;
  const body = `<form method="post" action="${action}">
<fieldset><legend>Service</legend>
  <label>Name *</label>
  <input type="text" name="name" required value="${esc(service.name)}">
  <label>Starting price (GEL)</label>
  <input type="number" name="price_from_gel" min="0" value="${esc(service.price_from_gel)}">
  <label>Brands (comma-separated)</label>
  <input type="text" name="brands" value="${esc((service.brands || []).join(", "))}" placeholder="Damon, Invisalign">
  <label>Note</label>
  <input type="text" name="note" value="${esc(service.note)}">
</fieldset>
<div class="btn-row">
  <button class="btn" type="submit">${isNew ? "Create service" : "Save changes"}</button>
  <a class="btn secondary" href="/admin/services">Cancel</a>
</div>
</form>`;
  return layout(req, isNew ? "Add service" : "Edit service", body);
}

function renderInsuranceList(req, partners) {
  const items = partners
    .map(
      (p, i) => `<tr>
  <td>${esc(p)}</td>
  <td class="row-actions">
    <form method="post" action="/admin/insurance/${i}/delete" onsubmit="return confirm('Remove ${esc(p)}?')"><button class="btn danger" type="submit">Remove</button></form>
  </td>
</tr>`
    )
    .join("");
  const body = `
<form method="post" action="/admin/insurance" style="display: flex; gap: 10px; align-items: flex-end; max-width: 520px;">
  <div style="flex: 1;"><label>Add partner</label><input type="text" name="name" required placeholder="Insurer name"></div>
  <button class="btn" type="submit">Add</button>
</form>
<h2 style="margin-top: 28px;">Current partners</h2>
<table><tbody>${items || `<tr><td colspan="2" class="muted">No partners yet.</td></tr>`}</tbody></table>`;
  return layout(req, "Insurance partners", body);
}

function renderClinicForm(req, clinic) {
  const wh = clinic.working_hours || {};
  const body = `<form method="post" action="/admin/clinic">
<fieldset><legend>Contact</legend>
  <label>Address</label>
  <input type="text" name="address" value="${esc(clinic.address)}">
  <label>Website</label>
  <input type="text" name="website" value="${esc(clinic.website)}">
  <label>Email</label>
  <input type="text" name="email" value="${esc(clinic.email)}">
  <label>Founded year</label>
  <input type="number" name="founded" value="${esc(clinic.founded)}">
</fieldset>
<fieldset><legend>Working hours</legend>
  <label>Monday – Friday</label>
  <input type="text" name="hours_mon_fri" value="${esc(wh.monday_friday)}" placeholder="10:00–19:00">
  <label>Saturday</label>
  <input type="text" name="hours_sat" value="${esc(wh.saturday)}" placeholder="10:00–14:00">
</fieldset>
<div class="btn-row"><button class="btn" type="submit">Save</button></div>
</form>`;
  return layout(req, "Clinic info", body);
}

function renderJsonEditor(req, title, target, value) {
  const body = `<form method="post" action="/admin/${target}">
<fieldset><legend>JSON</legend>
  <textarea name="json" spellcheck="false">${esc(JSON.stringify(value, null, 2))}</textarea>
  <div class="hint">Must be valid JSON. On save, replaces the entire section.</div>
</fieldset>
<div class="btn-row">
  <button class="btn" type="submit">Save</button>
  <a class="btn secondary" href="/admin">Cancel</a>
</div>
</form>`;
  return layout(req, title, body);
}

// ----- Helpers for parsing form data -----

function csvField(v) {
  if (!v || typeof v !== "string") return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

function nullEmpty(v) {
  if (v == null) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  return v;
}

function parseDoctorFromBody(body) {
  const doctor = {};
  doctor.name = (body.name || "").trim();
  if (body.name_ka) doctor.name_ka = String(body.name_ka).trim() || undefined;
  doctor.specialty = (body.specialty || "").trim();
  const exp = parseInt(body.experience_years, 10);
  if (Number.isFinite(exp)) doctor.experience_years = exp;
  if (body.schedule) doctor.schedule = String(body.schedule).trim() || undefined;
  if (body.branch) doctor.branch = String(body.branch).trim() || undefined;
  const langs = csvField(body.languages);
  if (langs) doctor.languages = langs;
  const focus = csvField(body.focus);
  if (focus) doctor.focus = focus;
  // working_days arrives as either a string (single check) or array.
  let wd = body.working_days;
  if (wd == null) wd = [];
  else if (!Array.isArray(wd)) wd = [wd];
  if (wd.length) doctor.working_days = wd;
  // Free-form extras merged on top — but core fields above always win.
  if (body.extras) {
    let extras;
    try {
      extras = JSON.parse(body.extras);
    } catch (e) {
      throw new Error(`Additional fields JSON is invalid: ${e.message}`);
    }
    if (extras && typeof extras === "object" && !Array.isArray(extras)) {
      // Strip keys we manage in structured fields so they don't double-write.
      for (const k of ["id", "name", "name_ka", "specialty", "experience_years", "branch", "schedule", "working_days", "languages", "focus"]) {
        delete extras[k];
      }
      Object.assign(doctor, extras);
    }
  }
  // Remove undefined keys for a clean record.
  for (const [k, v] of Object.entries(doctor)) {
    if (v === undefined) delete doctor[k];
  }
  return doctor;
}

function parseServiceFromBody(body) {
  const service = {};
  service.name = (body.name || "").trim();
  const price = parseInt(body.price_from_gel, 10);
  if (Number.isFinite(price)) service.price_from_gel = price;
  const brands = csvField(body.brands);
  if (brands) service.brands = brands;
  const note = nullEmpty(body.note);
  if (note) service.note = note.trim();
  return service;
}

// ----- Router -----

function buildRouter() {
  const router = express.Router();
  router.use(basicAuth);
  router.use(express.urlencoded({ extended: true, limit: "1mb" }));

  router.get("/", (req, res) => {
    res.send(renderDashboard(req, kbStore.load()));
  });

  // Doctors
  router.get("/doctors", (req, res) => {
    res.send(renderDoctorsList(req, kbStore.load().doctors || []));
  });
  router.get("/doctors/new", (req, res) => {
    res.send(renderDoctorForm(req, {}, true));
  });
  router.post("/doctors", (req, res) => {
    let doctor;
    try {
      doctor = parseDoctorFromBody(req.body);
    } catch (e) {
      return res.redirect(`/admin/doctors/new?error=${encodeURIComponent(e.message)}`);
    }
    if (!doctor.name || !doctor.specialty) {
      return res.redirect("/admin/doctors/new?error=Name+and+specialty+are+required");
    }
    const kb = kbStore.load();
    if (!Array.isArray(kb.doctors)) kb.doctors = [];
    doctor.id = crypto.randomUUID();
    kb.doctors.push(doctor);
    kbStore.save(kb);
    res.redirect(`/admin/doctors?flash=Added+${encodeURIComponent(doctor.name)}`);
  });
  router.get("/doctors/:id/edit", (req, res) => {
    const kb = kbStore.load();
    const doctor = (kb.doctors || []).find((d) => d.id === req.params.id);
    if (!doctor) return res.redirect("/admin/doctors?error=Doctor+not+found");
    res.send(renderDoctorForm(req, doctor, false));
  });
  router.post("/doctors/:id", (req, res) => {
    const kb = kbStore.load();
    const idx = (kb.doctors || []).findIndex((d) => d.id === req.params.id);
    if (idx < 0) return res.redirect("/admin/doctors?error=Doctor+not+found");
    let parsed;
    try {
      parsed = parseDoctorFromBody(req.body);
    } catch (e) {
      return res.redirect(`/admin/doctors/${req.params.id}/edit?error=${encodeURIComponent(e.message)}`);
    }
    if (!parsed.name || !parsed.specialty) {
      return res.redirect(`/admin/doctors/${req.params.id}/edit?error=Name+and+specialty+are+required`);
    }
    parsed.id = req.params.id;
    kb.doctors[idx] = parsed;
    kbStore.save(kb);
    res.redirect(`/admin/doctors?flash=Saved+${encodeURIComponent(parsed.name)}`);
  });
  router.post("/doctors/:id/delete", (req, res) => {
    const kb = kbStore.load();
    const before = (kb.doctors || []).length;
    kb.doctors = (kb.doctors || []).filter((d) => d.id !== req.params.id);
    if (kb.doctors.length === before) return res.redirect("/admin/doctors?error=Doctor+not+found");
    kbStore.save(kb);
    res.redirect("/admin/doctors?flash=Doctor+removed");
  });

  // Services
  router.get("/services", (req, res) => {
    res.send(renderServicesList(req, kbStore.load().services || []));
  });
  router.get("/services/new", (req, res) => {
    res.send(renderServiceForm(req, {}, true));
  });
  router.post("/services", (req, res) => {
    const service = parseServiceFromBody(req.body);
    if (!service.name) return res.redirect("/admin/services/new?error=Name+is+required");
    const kb = kbStore.load();
    if (!Array.isArray(kb.services)) kb.services = [];
    service.id = crypto.randomUUID();
    kb.services.push(service);
    kbStore.save(kb);
    res.redirect(`/admin/services?flash=Added+${encodeURIComponent(service.name)}`);
  });
  router.get("/services/:id/edit", (req, res) => {
    const kb = kbStore.load();
    const svc = (kb.services || []).find((s) => s.id === req.params.id);
    if (!svc) return res.redirect("/admin/services?error=Service+not+found");
    res.send(renderServiceForm(req, svc, false));
  });
  router.post("/services/:id", (req, res) => {
    const kb = kbStore.load();
    const idx = (kb.services || []).findIndex((s) => s.id === req.params.id);
    if (idx < 0) return res.redirect("/admin/services?error=Service+not+found");
    const parsed = parseServiceFromBody(req.body);
    if (!parsed.name) return res.redirect(`/admin/services/${req.params.id}/edit?error=Name+is+required`);
    parsed.id = req.params.id;
    kb.services[idx] = parsed;
    kbStore.save(kb);
    res.redirect(`/admin/services?flash=Saved+${encodeURIComponent(parsed.name)}`);
  });
  router.post("/services/:id/delete", (req, res) => {
    const kb = kbStore.load();
    const before = (kb.services || []).length;
    kb.services = (kb.services || []).filter((s) => s.id !== req.params.id);
    if (kb.services.length === before) return res.redirect("/admin/services?error=Service+not+found");
    kbStore.save(kb);
    res.redirect("/admin/services?flash=Service+removed");
  });

  // Insurance partners
  router.get("/insurance", (req, res) => {
    res.send(renderInsuranceList(req, kbStore.load().insurance_partners || []));
  });
  router.post("/insurance", (req, res) => {
    const name = (req.body.name || "").trim();
    if (!name) return res.redirect("/admin/insurance?error=Name+is+required");
    const kb = kbStore.load();
    if (!Array.isArray(kb.insurance_partners)) kb.insurance_partners = [];
    if (kb.insurance_partners.includes(name)) {
      return res.redirect(`/admin/insurance?error=Already+exists`);
    }
    kb.insurance_partners.push(name);
    kbStore.save(kb);
    res.redirect(`/admin/insurance?flash=Added+${encodeURIComponent(name)}`);
  });
  router.post("/insurance/:idx/delete", (req, res) => {
    const idx = parseInt(req.params.idx, 10);
    const kb = kbStore.load();
    if (!Array.isArray(kb.insurance_partners) || !Number.isFinite(idx) || idx < 0 || idx >= kb.insurance_partners.length) {
      return res.redirect("/admin/insurance?error=Partner+not+found");
    }
    const removed = kb.insurance_partners.splice(idx, 1)[0];
    kbStore.save(kb);
    res.redirect(`/admin/insurance?flash=Removed+${encodeURIComponent(removed)}`);
  });

  // Clinic info
  router.get("/clinic", (req, res) => {
    res.send(renderClinicForm(req, kbStore.load().clinic || {}));
  });
  router.post("/clinic", (req, res) => {
    const kb = kbStore.load();
    const c = kb.clinic || {};
    if (req.body.address !== undefined) c.address = req.body.address.trim();
    if (req.body.website !== undefined) c.website = req.body.website.trim();
    if (req.body.email !== undefined) c.email = req.body.email.trim();
    const founded = parseInt(req.body.founded, 10);
    if (Number.isFinite(founded)) c.founded = founded;
    else if (req.body.founded === "") delete c.founded;
    c.working_hours = c.working_hours || {};
    if (req.body.hours_mon_fri !== undefined) c.working_hours.monday_friday = req.body.hours_mon_fri.trim();
    if (req.body.hours_sat !== undefined) c.working_hours.saturday = req.body.hours_sat.trim();
    kb.clinic = c;
    kbStore.save(kb);
    res.redirect("/admin/clinic?flash=Clinic+info+saved");
  });

  // Doctor routing (JSON editor)
  router.get("/routing", (req, res) => {
    res.send(renderJsonEditor(req, "Doctor routing", "routing", kbStore.load().doctor_routing || {}));
  });
  router.post("/routing", (req, res) => {
    let value;
    try {
      value = JSON.parse(req.body.json || "{}");
    } catch (e) {
      return res.redirect(`/admin/routing?error=${encodeURIComponent("Invalid JSON: " + e.message)}`);
    }
    const kb = kbStore.load();
    kb.doctor_routing = value;
    kbStore.save(kb);
    res.redirect("/admin/routing?flash=Routing+saved");
  });

  // Raw JSON (the rest)
  router.get("/raw", (req, res) => {
    res.send(renderJsonEditor(req, "Raw KB (advanced)", "raw", kbStore.load()));
  });
  router.post("/raw", (req, res) => {
    let value;
    try {
      value = JSON.parse(req.body.json || "{}");
    } catch (e) {
      return res.redirect(`/admin/raw?error=${encodeURIComponent("Invalid JSON: " + e.message)}`);
    }
    if (!value || typeof value !== "object") {
      return res.redirect("/admin/raw?error=Root+must+be+an+object");
    }
    kbStore.save(value);
    res.redirect("/admin/raw?flash=Knowledge+base+saved");
  });

  return router;
}

module.exports = { buildRouter };
