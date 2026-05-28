const express = require("express");
const crypto = require("crypto");
const kbStore = require("./kb-store");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// --- Auth ---

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

// --- HTML helpers ---

function esc(v) {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// --- i18n (Georgian UI strings) ---

const T = {
  brand: "Dentalux ადმინისტრირება",
  nav_dashboard: "მთავარი",
  nav_doctors: "ექიმები",
  nav_services: "მომსახურება",
  nav_insurance: "დაზღვევა",
  nav_clinic: "კლინიკა",
  nav_routing: "ექიმის შერჩევა",
  nav_payment: "გადახდის მეთოდები",

  dashboard_subtitle:
    "ცოცხალი ცოდნის ბაზა. აქ შესრულებული ცვლილებები მაშინვე აისახება ბოტში.",
  count_doctors: "ექიმები",
  count_services: "მომსახურება",
  count_insurance: "დაზღვევის პარტნიორი",
  manage: "მართვა →",

  btn_add: "დამატება",
  btn_save: "შენახვა",
  btn_create: "შექმნა",
  btn_cancel: "გაუქმება",
  btn_edit: "რედაქტირება",
  btn_delete: "წაშლა",
  btn_remove: "ამოშლა",

  confirm_delete_doctor: "ნამდვილად გსურთ ექიმის წაშლა?",
  confirm_delete_service: "ნამდვილად გსურთ ამ მომსახურების წაშლა?",
  confirm_delete_partner: "ნამდვილად გსურთ ამ პარტნიორის ამოშლა?",
  confirm_delete_method: "ნამდვილად გსურთ ამ მეთოდის ამოშლა?",

  required: "აუცილებელია",
  empty_doctors: "ექიმები ჯერ არ არის",
  empty_services: "მომსახურება ჯერ არ არის",
  empty_partners: "დაზღვევის პარტნიორი არ არის",
  empty_methods: "გადახდის მეთოდი არ არის",
  not_found: "ვერ მოიძებნა",
  already_exists: "უკვე არსებობს",

  // Doctors
  doctors_title: "ექიმები",
  doctor_add_title: "ექიმის დამატება",
  doctor_edit_title: (n) => `${n} — რედაქტირება`,
  doctor_add_button: "+ ექიმის დამატება",
  th_name: "სახელი",
  th_specialty: "სპეციალობა",
  th_working_days: "სამუშაო დღეები",

  // Doctor form
  legend_core: "ძირითადი",
  legend_schedule: "განრიგი",
  legend_profile: "პროფილი",
  legend_text: "ბიოგრაფია",

  label_name_en: "სახელი (ინგლისურად) *",
  label_name_ka: "სახელი (ქართულად)",
  label_name_variants: "სახელის ვარიანტები (გამოყავით მძიმეებით)",
  label_specialty: "სპეციალობა *",
  label_level: "სტატუსი / დონე",
  label_experience_years: "გამოცდილება (წელი)",
  label_at_dentalux_since: "Dentalux-ში მუშაობს წლიდან",
  label_working_days: "სამუშაო დღეები",
  label_schedule_note: "განრიგის შენიშვნა",
  label_schedule_hint: "მაგ.: ორშ–პარ 10:00–14:30",
  label_branch: "ფილიალი",
  label_languages: "ენები (გამოყავით მძიმეებით)",
  label_focus: "ფოკუსი (გამოყავით მძიმეებით)",
  label_services_list: "შემოთავაზებული მომსახურება (თითო ხაზზე ერთი)",
  label_education: "განათლება (თითო ხაზზე ერთი)",
  label_certifications: "სერტიფიკატები (თითო ხაზზე ერთი)",
  label_seminars: "ძირითადი სემინარები (თითო ხაზზე ერთი)",
  label_recent_training: "ბოლო ტრენინგი (თითო ხაზზე ერთი)",
  label_tools: "ხელსაწყოები (გამოყავით მძიმეებით)",
  label_philosophy_ka: "მიდგომა / ფილოსოფია (ქართულად)",
  label_philosophy_en: "მიდგომა / ფილოსოფია (ინგლისურად)",
  label_notes: "დამატებითი შენიშვნები",

  // Services
  services_title: "მომსახურება",
  service_add_title: "მომსახურების დამატება",
  service_edit_title: "მომსახურების რედაქტირება",
  service_add_button: "+ მომსახურების დამატება",
  legend_service: "მომსახურება",
  label_service_name: "დასახელება *",
  label_price_from: "მინიმალური ფასი (GEL)",
  label_brands: "ბრენდები (გამოყავით მძიმეებით)",
  label_note: "შენიშვნა",
  th_price_from: "ფასიდან",
  th_brands: "ბრენდები",
  th_note: "შენიშვნა",

  // Insurance
  insurance_title: "დაზღვევის პარტნიორები",
  insurance_add_label: "პარტნიორის დამატება",
  insurance_placeholder: "სადაზღვევო კომპანიის სახელი",
  insurance_current: "ამჟამინდელი პარტნიორები",

  // Clinic
  clinic_title: "კლინიკის ინფორმაცია",
  legend_contact: "კონტაქტი",
  legend_hours: "სამუშაო საათები",
  label_address: "მისამართი",
  label_website: "ვებსაიტი",
  label_email: "ელფოსტა",
  label_founded: "დაარსების წელი",
  label_hours_mon_fri: "ორშაბათი – პარასკევი",
  label_hours_sat: "შაბათი",

  // Routing
  routing_title: "ექიმის შერჩევა შემთხვევის მიხედვით",
  routing_subtitle:
    "თითო კატეგორიისთვის აირჩიეთ რომელი ექიმები ხედავენ ამ ტიპის პაციენტებს. ბოტი ამ რეკომენდაციებს იყენებს, როცა პაციენტი აღნიშნავს სიმპტომს ან მკურნალობას.",
  routing_primary: "ძირითადი ექიმი",
  routing_additional: "დამატებითი ექიმები",
  routing_doctors: "ექიმები",
  routing_none: "(ვერავინ აირჩიეთ)",

  // Payment
  payment_title: "გადახდის მეთოდები",
  payment_add_label: "მეთოდის დამატება",
  payment_placeholder: "მაგ.: cash, card, installment",
  payment_current: "ამჟამინდელი მეთოდები",

  saved: "შენახულია",
  added: "დაემატა",
  removed: "ამოიშალა",
  deleted: "წაიშალა",
};

// Routing categories: technical key + Georgian display label + UI hint.
// `endodontic_pulpitis_root_canal` uses the primary/additional shape; everything else is a plain array.
const ROUTING_CATEGORIES = [
  { key: "therapeutic_caries_pain", label: "კარიესი / ზოგადი ტკივილი" },
  { key: "endodontic_pulpitis_root_canal", label: "არხის მკურნალობა (პულპიტი)", primaryShape: true },
  { key: "implant_or_complex_surgery", label: "იმპლანტი / რთული ქირურგია" },
  { key: "pediatric", label: "ბავშვები / მოზარდები" },
  { key: "orthodontic_braces_aligners", label: "ბრეკეტი / ელაინერი" },
  { key: "aesthetic_or_prosthetic", label: "ესთეტიკა / პროთეზი" },
  { key: "periodontal_gums", label: "ღრძილები / პაროდონტოლოგია" },
  { key: "microscope_assisted_treatment", label: "მიკროსკოპით მკურნალობა" },
];

const DAYS = [
  { code: "Sun", label: "კვი" },
  { code: "Mon", label: "ორშ" },
  { code: "Tue", label: "სამ" },
  { code: "Wed", label: "ოთხ" },
  { code: "Thu", label: "ხუთ" },
  { code: "Fri", label: "პარ" },
  { code: "Sat", label: "შაბ" },
];

const NAV = [
  { path: "doctors", label: T.nav_doctors },
  { path: "services", label: T.nav_services },
  { path: "insurance", label: T.nav_insurance },
  { path: "clinic", label: T.nav_clinic },
  { path: "routing", label: T.nav_routing },
  { path: "payment", label: T.nav_payment },
];

const CSS = `
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Georgian", "BPG Nino Mtavruli", "Sylfaen", Roboto, sans-serif; background: #0f1115; color: #e7e9ee; margin: 0; padding: 0; line-height: 1.5; }
header { background: #161922; border-bottom: 1px solid #232735; padding: 16px 24px; }
header .brand { font-weight: 600; font-size: 18px; }
header .brand a { color: #e7e9ee; text-decoration: none; }
nav { display: flex; gap: 18px; margin-top: 10px; flex-wrap: wrap; }
nav a { color: #9aa3b2; text-decoration: none; font-size: 14px; }
nav a:hover, nav a.active { color: #e7e9ee; }
main { max-width: 1000px; margin: 0 auto; padding: 28px 24px; }
h1 { font-size: 22px; margin: 0 0 6px; }
h2 { font-size: 15px; margin: 26px 0 8px; color: #c4cad6; font-weight: 600; }
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
textarea { min-height: 100px; resize: vertical; line-height: 1.55; }
textarea.tall { min-height: 160px; }
input:focus, textarea:focus, select:focus { outline: none; border-color: #6c8bff; }
.btn { display: inline-block; padding: 9px 16px; background: #4a6cf7; color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; text-decoration: none; font-family: inherit; }
.btn:hover { background: #5a7bff; }
.btn.secondary { background: transparent; color: #c4cad6; border: 1px solid #2c3142; }
.btn.secondary:hover { border-color: #4a6cf7; color: #e7e9ee; }
.btn.danger { background: #b03a3a; }
.btn.danger:hover { background: #c44848; }
.btn-row { margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; margin-top: 12px; }
.card { background: #161922; padding: 18px; border-radius: 8px; border: 1px solid #232735; }
.card a { color: #e7e9ee; text-decoration: none; }
.card .count { font-size: 28px; font-weight: 600; margin: 6px 0 2px; }
.card .label { font-size: 12px; color: #9aa3b2; text-transform: uppercase; letter-spacing: 0.5px; }
.checkboxes { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 6px; }
.checkboxes label { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 14px; color: #e7e9ee; cursor: pointer; }
.checkboxes input { width: auto; margin: 0; }
.hint { font-size: 12px; color: #7a8090; margin-top: 4px; }
.row-form { display: flex; gap: 10px; align-items: flex-end; max-width: 560px; }
.row-form > div { flex: 1; }
.doctor-multi { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px 14px; margin-top: 6px; padding: 10px 12px; background: #131722; border: 1px solid #232735; border-radius: 6px; }
.doctor-multi label { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 14px; color: #e7e9ee; cursor: pointer; }
.doctor-multi input { width: auto; margin: 0; }
.routing-block { margin-bottom: 24px; }
.routing-block h2 { margin: 0 0 6px; color: #e7e9ee; font-size: 15px; }
`;

// --- Layout ---

function layout(req, title, content) {
  const flash = req.query.flash ? `<div class="flash">${esc(req.query.flash)}</div>` : "";
  const error = req.query.error ? `<div class="flash error">${esc(req.query.error)}</div>` : "";
  const navLinks = NAV.map((s) => {
    const active = req.path.startsWith(`/${s.path}`) ? " active" : "";
    return `<a class="nav-link${active}" href="/admin/${s.path}">${s.label}</a>`;
  }).join("");
  const dashActive = req.path === "/" ? ' class="active"' : "";
  return `<!DOCTYPE html><html lang="ka"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — ${esc(T.brand)}</title>
<style>${CSS}</style>
</head><body>
<header>
  <div class="brand"><a href="/admin">${esc(T.brand)}</a></div>
  <nav><a href="/admin"${dashActive}>${esc(T.nav_dashboard)}</a>${navLinks}</nav>
</header>
<main>
  ${flash}${error}
  <h1>${esc(title)}</h1>
  ${content}
</main>
</body></html>`;
}

// --- Page renderers ---

function renderDashboard(req, kb) {
  const cards = [
    { count: (kb.doctors || []).length, label: T.count_doctors, href: "/admin/doctors" },
    { count: (kb.services || []).length, label: T.count_services, href: "/admin/services" },
    { count: (kb.insurance_partners || []).length, label: T.count_insurance, href: "/admin/insurance" },
  ]
    .map(
      (c) =>
        `<div class="card"><a href="${c.href}"><div class="label">${esc(c.label)}</div><div class="count">${c.count}</div><div class="muted">${esc(T.manage)}</div></a></div>`
    )
    .join("");
  const body = `<p class="muted">${esc(T.dashboard_subtitle)}</p><div class="cards">${cards}</div>`;
  return layout(req, T.nav_dashboard, body);
}

function renderDoctorsList(req, doctors) {
  const rows = doctors
    .map(
      (d) => `<tr>
  <td><strong>${esc(d.name || "")}</strong>${d.name_ka ? `<div class="muted">${esc(d.name_ka)}</div>` : ""}</td>
  <td>${esc(d.specialty || "")}</td>
  <td>${esc((d.working_days || []).map((c) => (DAYS.find((x) => x.code === c) || {}).label || c).join(", "))}</td>
  <td class="row-actions">
    <a class="btn secondary" href="/admin/doctors/${esc(d.id)}/edit">${esc(T.btn_edit)}</a>
    <form method="post" action="/admin/doctors/${esc(d.id)}/delete" onsubmit="return confirm('${esc(T.confirm_delete_doctor)}')"><button class="btn danger" type="submit">${esc(T.btn_delete)}</button></form>
  </td>
</tr>`
    )
    .join("");
  const body = `
<div class="btn-row"><a class="btn" href="/admin/doctors/new">${esc(T.doctor_add_button)}</a></div>
<table><thead><tr><th>${esc(T.th_name)}</th><th>${esc(T.th_specialty)}</th><th>${esc(T.th_working_days)}</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="4" class="muted">${esc(T.empty_doctors)}</td></tr>`}</tbody></table>`;
  return layout(req, T.doctors_title, body);
}

// Linkify text: stringify arrays line-per-item, scalars as-is.
function arrToLines(arr) {
  if (!Array.isArray(arr)) return "";
  return arr.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("\n");
}

function csvToLine(arr) {
  if (!Array.isArray(arr)) return "";
  return arr.join(", ");
}

function renderDoctorForm(req, doctor, isNew) {
  const wd = new Set(doctor.working_days || []);
  const dayChecks = DAYS.map(
    (d) =>
      `<label><input type="checkbox" name="working_days" value="${d.code}"${wd.has(d.code) ? " checked" : ""}> ${d.label}</label>`
  ).join("");
  const action = isNew ? "/admin/doctors" : `/admin/doctors/${esc(doctor.id)}`;
  const title = isNew ? T.doctor_add_title : T.doctor_edit_title(doctor.name || "");
  const body = `<form method="post" action="${action}">
<fieldset><legend>${esc(T.legend_core)}</legend>
  <label>${esc(T.label_name_en)}</label>
  <input type="text" name="name" required value="${esc(doctor.name)}">
  <label>${esc(T.label_name_ka)}</label>
  <input type="text" name="name_ka" value="${esc(doctor.name_ka)}">
  <label>${esc(T.label_name_variants)}</label>
  <input type="text" name="name_variants" value="${esc(csvToLine(doctor.name_variants))}">
  <label>${esc(T.label_specialty)}</label>
  <input type="text" name="specialty" required value="${esc(doctor.specialty)}">
  <label>${esc(T.label_level)}</label>
  <input type="text" name="level" value="${esc(doctor.level)}">
  <label>${esc(T.label_experience_years)}</label>
  <input type="number" name="experience_years" min="0" value="${esc(doctor.experience_years)}">
  <label>${esc(T.label_at_dentalux_since)}</label>
  <input type="number" name="at_dentalux_since" min="1900" max="2100" value="${esc(doctor.at_dentalux_since)}">
</fieldset>
<fieldset><legend>${esc(T.legend_schedule)}</legend>
  <label>${esc(T.label_working_days)}</label>
  <div class="checkboxes">${dayChecks}</div>
  <label>${esc(T.label_schedule_note)}</label>
  <input type="text" name="schedule" value="${esc(doctor.schedule)}" placeholder="${esc(T.label_schedule_hint)}">
  <label>${esc(T.label_branch)}</label>
  <input type="text" name="branch" value="${esc(doctor.branch)}">
</fieldset>
<fieldset><legend>${esc(T.legend_profile)}</legend>
  <label>${esc(T.label_languages)}</label>
  <input type="text" name="languages" value="${esc(csvToLine(doctor.languages))}" placeholder="Georgian, English, Russian">
  <label>${esc(T.label_focus)}</label>
  <input type="text" name="focus" value="${esc(csvToLine(doctor.focus))}">
  <label>${esc(T.label_tools)}</label>
  <input type="text" name="tools" value="${esc(csvToLine(doctor.tools))}">
  <label>${esc(T.label_services_list)}</label>
  <textarea name="services">${esc(arrToLines(doctor.services))}</textarea>
</fieldset>
<fieldset><legend>${esc(T.legend_text)}</legend>
  <label>${esc(T.label_education)}</label>
  <textarea name="education">${esc(arrToLines(doctor.education))}</textarea>
  <label>${esc(T.label_certifications)}</label>
  <textarea name="key_certifications">${esc(arrToLines(doctor.key_certifications))}</textarea>
  <label>${esc(T.label_seminars)}</label>
  <textarea name="key_seminars">${esc(arrToLines(doctor.key_seminars))}</textarea>
  <label>${esc(T.label_recent_training)}</label>
  <textarea name="recent_training_2024">${esc(arrToLines(doctor.recent_training_2024))}</textarea>
  <label>${esc(T.label_philosophy_ka)}</label>
  <textarea name="philosophy_ka">${esc(doctor.philosophy_ka)}</textarea>
  <label>${esc(T.label_philosophy_en)}</label>
  <textarea name="philosophy_en">${esc(doctor.philosophy_en)}</textarea>
  <label>${esc(T.label_notes)}</label>
  <textarea name="notes">${esc(doctor.notes)}</textarea>
</fieldset>
<div class="btn-row">
  <button class="btn" type="submit">${isNew ? esc(T.btn_create) : esc(T.btn_save)}</button>
  <a class="btn secondary" href="/admin/doctors">${esc(T.btn_cancel)}</a>
</div>
</form>`;
  return layout(req, title, body);
}

function renderServicesList(req, services) {
  const rows = services
    .map(
      (s) => `<tr>
  <td><strong>${esc(s.name || "")}</strong></td>
  <td>${s.price_from_gel != null ? esc(s.price_from_gel) + " GEL" : ""}</td>
  <td>${esc((s.brands || []).join(", "))}</td>
  <td class="row-actions">
    <a class="btn secondary" href="/admin/services/${esc(s.id)}/edit">${esc(T.btn_edit)}</a>
    <form method="post" action="/admin/services/${esc(s.id)}/delete" onsubmit="return confirm('${esc(T.confirm_delete_service)}')"><button class="btn danger" type="submit">${esc(T.btn_delete)}</button></form>
  </td>
</tr>`
    )
    .join("");
  const body = `
<div class="btn-row"><a class="btn" href="/admin/services/new">${esc(T.service_add_button)}</a></div>
<table><thead><tr><th>${esc(T.th_name)}</th><th>${esc(T.th_price_from)}</th><th>${esc(T.th_brands)}</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="4" class="muted">${esc(T.empty_services)}</td></tr>`}</tbody></table>`;
  return layout(req, T.services_title, body);
}

function renderServiceForm(req, service, isNew) {
  const action = isNew ? "/admin/services" : `/admin/services/${esc(service.id)}`;
  const title = isNew ? T.service_add_title : T.service_edit_title;
  const body = `<form method="post" action="${action}">
<fieldset><legend>${esc(T.legend_service)}</legend>
  <label>${esc(T.label_service_name)}</label>
  <input type="text" name="name" required value="${esc(service.name)}">
  <label>${esc(T.label_price_from)}</label>
  <input type="number" name="price_from_gel" min="0" value="${esc(service.price_from_gel)}">
  <label>${esc(T.label_brands)}</label>
  <input type="text" name="brands" value="${esc((service.brands || []).join(", "))}" placeholder="Damon, Invisalign">
  <label>${esc(T.label_note)}</label>
  <input type="text" name="note" value="${esc(service.note)}">
</fieldset>
<div class="btn-row">
  <button class="btn" type="submit">${isNew ? esc(T.btn_create) : esc(T.btn_save)}</button>
  <a class="btn secondary" href="/admin/services">${esc(T.btn_cancel)}</a>
</div>
</form>`;
  return layout(req, title, body);
}

function renderInsuranceList(req, partners) {
  const items = partners
    .map(
      (p, i) => `<tr>
  <td>${esc(p)}</td>
  <td class="row-actions">
    <form method="post" action="/admin/insurance/${i}/delete" onsubmit="return confirm('${esc(T.confirm_delete_partner)}')"><button class="btn danger" type="submit">${esc(T.btn_remove)}</button></form>
  </td>
</tr>`
    )
    .join("");
  const body = `
<form method="post" action="/admin/insurance" class="row-form">
  <div><label>${esc(T.insurance_add_label)}</label><input type="text" name="name" required placeholder="${esc(T.insurance_placeholder)}"></div>
  <button class="btn" type="submit">${esc(T.btn_add)}</button>
</form>
<h2>${esc(T.insurance_current)}</h2>
<table><tbody>${items || `<tr><td colspan="2" class="muted">${esc(T.empty_partners)}</td></tr>`}</tbody></table>`;
  return layout(req, T.insurance_title, body);
}

function renderPaymentList(req, methods) {
  const items = methods
    .map(
      (p, i) => `<tr>
  <td>${esc(p)}</td>
  <td class="row-actions">
    <form method="post" action="/admin/payment/${i}/delete" onsubmit="return confirm('${esc(T.confirm_delete_method)}')"><button class="btn danger" type="submit">${esc(T.btn_remove)}</button></form>
  </td>
</tr>`
    )
    .join("");
  const body = `
<form method="post" action="/admin/payment" class="row-form">
  <div><label>${esc(T.payment_add_label)}</label><input type="text" name="name" required placeholder="${esc(T.payment_placeholder)}"></div>
  <button class="btn" type="submit">${esc(T.btn_add)}</button>
</form>
<h2>${esc(T.payment_current)}</h2>
<table><tbody>${items || `<tr><td colspan="2" class="muted">${esc(T.empty_methods)}</td></tr>`}</tbody></table>`;
  return layout(req, T.payment_title, body);
}

function renderClinicForm(req, clinic) {
  const wh = clinic.working_hours || {};
  const body = `<form method="post" action="/admin/clinic">
<fieldset><legend>${esc(T.legend_contact)}</legend>
  <label>${esc(T.label_address)}</label>
  <input type="text" name="address" value="${esc(clinic.address)}">
  <label>${esc(T.label_website)}</label>
  <input type="text" name="website" value="${esc(clinic.website)}">
  <label>${esc(T.label_email)}</label>
  <input type="text" name="email" value="${esc(clinic.email)}">
  <label>${esc(T.label_founded)}</label>
  <input type="number" name="founded" value="${esc(clinic.founded)}">
</fieldset>
<fieldset><legend>${esc(T.legend_hours)}</legend>
  <label>${esc(T.label_hours_mon_fri)}</label>
  <input type="text" name="hours_mon_fri" value="${esc(wh.monday_friday)}" placeholder="10:00–19:00">
  <label>${esc(T.label_hours_sat)}</label>
  <input type="text" name="hours_sat" value="${esc(wh.saturday)}" placeholder="10:00–14:00">
</fieldset>
<div class="btn-row"><button class="btn" type="submit">${esc(T.btn_save)}</button></div>
</form>`;
  return layout(req, T.clinic_title, body);
}

function renderRoutingForm(req, routing, doctors) {
  const doctorOptions = doctors.map((d) => d.name).filter(Boolean);
  const opts = (selected) =>
    doctorOptions
      .map(
        (name, i) =>
          `<label><input type="checkbox" name="cat" value="${esc(name)}"${selected.has(name) ? " checked" : ""}> ${esc(name)}</label>`
      )
      .join("");
  const primarySelect = (current) => {
    const options = [
      `<option value="">— ${esc(T.routing_none)} —</option>`,
      ...doctorOptions.map(
        (name) => `<option value="${esc(name)}"${name === current ? " selected" : ""}>${esc(name)}</option>`
      ),
    ].join("");
    return `<select name="primary">${options}</select>`;
  };

  const blocks = ROUTING_CATEGORIES.map((cat) => {
    const cur = routing[cat.key] || (cat.primaryShape ? { primary: "", additional: [] } : []);
    if (cat.primaryShape) {
      const primary = typeof cur === "object" ? cur.primary || "" : "";
      const additional = new Set(typeof cur === "object" ? cur.additional || [] : []);
      const additionalChecks = doctorOptions
        .map(
          (name) =>
            `<label><input type="checkbox" name="cat_${cat.key}_additional" value="${esc(name)}"${additional.has(name) ? " checked" : ""}> ${esc(name)}</label>`
        )
        .join("");
      return `<div class="routing-block">
  <h2>${esc(cat.label)}</h2>
  <label>${esc(T.routing_primary)}</label>
  <select name="cat_${cat.key}_primary">
    <option value="">— ${esc(T.routing_none)} —</option>
    ${doctorOptions.map((name) => `<option value="${esc(name)}"${name === primary ? " selected" : ""}>${esc(name)}</option>`).join("")}
  </select>
  <label>${esc(T.routing_additional)}</label>
  <div class="doctor-multi">${additionalChecks}</div>
</div>`;
    } else {
      const sel = new Set(Array.isArray(cur) ? cur : []);
      const checks = doctorOptions
        .map(
          (name) =>
            `<label><input type="checkbox" name="cat_${cat.key}" value="${esc(name)}"${sel.has(name) ? " checked" : ""}> ${esc(name)}</label>`
        )
        .join("");
      return `<div class="routing-block">
  <h2>${esc(cat.label)}</h2>
  <label>${esc(T.routing_doctors)}</label>
  <div class="doctor-multi">${checks}</div>
</div>`;
    }
  }).join("");

  const body = `<p class="muted">${esc(T.routing_subtitle)}</p>
<form method="post" action="/admin/routing">
  ${blocks}
  <div class="btn-row"><button class="btn" type="submit">${esc(T.btn_save)}</button></div>
</form>`;
  return layout(req, T.routing_title, body);
}

// --- Body parsing helpers ---

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function csvField(v) {
  if (!v || typeof v !== "string") return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

function linesField(v) {
  if (!v || typeof v !== "string") return undefined;
  const items = v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

function nullEmpty(v) {
  if (v == null) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  return typeof v === "string" ? v.trim() : v;
}

// Apply a partial update to an existing doctor object: only sets keys present
// in the form, deletes the key if the form value is empty so we don't write
// empty strings/arrays into the KB.
function mergeDoctorFromBody(existing, body) {
  const next = { ...existing };
  const set = (key, value) => {
    if (value === undefined) delete next[key];
    else next[key] = value;
  };
  set("name", nullEmpty(body.name));
  set("name_ka", nullEmpty(body.name_ka));
  set("name_variants", csvField(body.name_variants));
  set("specialty", nullEmpty(body.specialty));
  set("level", nullEmpty(body.level));
  const exp = parseInt(body.experience_years, 10);
  set("experience_years", Number.isFinite(exp) ? exp : undefined);
  const since = parseInt(body.at_dentalux_since, 10);
  set("at_dentalux_since", Number.isFinite(since) ? since : undefined);
  const wd = asArray(body.working_days).filter(Boolean);
  set("working_days", wd.length ? wd : undefined);
  set("schedule", nullEmpty(body.schedule));
  set("branch", nullEmpty(body.branch));
  set("languages", csvField(body.languages));
  set("focus", csvField(body.focus));
  set("tools", csvField(body.tools));
  set("services", linesField(body.services));
  set("education", linesField(body.education));
  set("key_certifications", linesField(body.key_certifications));
  set("key_seminars", linesField(body.key_seminars));
  set("recent_training_2024", linesField(body.recent_training_2024));
  set("philosophy_ka", nullEmpty(body.philosophy_ka));
  set("philosophy_en", nullEmpty(body.philosophy_en));
  set("notes", nullEmpty(body.notes));
  return next;
}

function parseServiceFromBody(body) {
  const service = {};
  service.name = (body.name || "").trim();
  const price = parseInt(body.price_from_gel, 10);
  if (Number.isFinite(price)) service.price_from_gel = price;
  const brands = csvField(body.brands);
  if (brands) service.brands = brands;
  const note = nullEmpty(body.note);
  if (note) service.note = note;
  return service;
}

// --- Router ---

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
    const doctor = mergeDoctorFromBody({}, req.body);
    if (!doctor.name || !doctor.specialty) {
      return res.redirect(`/admin/doctors/new?error=${encodeURIComponent(T.required + ": " + T.label_name_en + " / " + T.label_specialty)}`);
    }
    const kb = kbStore.load();
    if (!Array.isArray(kb.doctors)) kb.doctors = [];
    doctor.id = crypto.randomUUID();
    kb.doctors.push(doctor);
    kbStore.save(kb);
    res.redirect(`/admin/doctors?flash=${encodeURIComponent(T.added + ": " + doctor.name)}`);
  });
  router.get("/doctors/:id/edit", (req, res) => {
    const kb = kbStore.load();
    const doctor = (kb.doctors || []).find((d) => d.id === req.params.id);
    if (!doctor) return res.redirect("/admin/doctors?error=" + encodeURIComponent(T.not_found));
    res.send(renderDoctorForm(req, doctor, false));
  });
  router.post("/doctors/:id", (req, res) => {
    const kb = kbStore.load();
    const idx = (kb.doctors || []).findIndex((d) => d.id === req.params.id);
    if (idx < 0) return res.redirect("/admin/doctors?error=" + encodeURIComponent(T.not_found));
    const merged = mergeDoctorFromBody(kb.doctors[idx], req.body);
    if (!merged.name || !merged.specialty) {
      return res.redirect(`/admin/doctors/${req.params.id}/edit?error=${encodeURIComponent(T.required + ": " + T.label_name_en + " / " + T.label_specialty)}`);
    }
    merged.id = req.params.id;
    kb.doctors[idx] = merged;
    kbStore.save(kb);
    res.redirect(`/admin/doctors?flash=${encodeURIComponent(T.saved + ": " + merged.name)}`);
  });
  router.post("/doctors/:id/delete", (req, res) => {
    const kb = kbStore.load();
    const before = (kb.doctors || []).length;
    kb.doctors = (kb.doctors || []).filter((d) => d.id !== req.params.id);
    if (kb.doctors.length === before) return res.redirect("/admin/doctors?error=" + encodeURIComponent(T.not_found));
    kbStore.save(kb);
    res.redirect("/admin/doctors?flash=" + encodeURIComponent(T.deleted));
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
    if (!service.name) return res.redirect("/admin/services/new?error=" + encodeURIComponent(T.required + ": " + T.label_service_name));
    const kb = kbStore.load();
    if (!Array.isArray(kb.services)) kb.services = [];
    service.id = crypto.randomUUID();
    kb.services.push(service);
    kbStore.save(kb);
    res.redirect(`/admin/services?flash=${encodeURIComponent(T.added + ": " + service.name)}`);
  });
  router.get("/services/:id/edit", (req, res) => {
    const kb = kbStore.load();
    const svc = (kb.services || []).find((s) => s.id === req.params.id);
    if (!svc) return res.redirect("/admin/services?error=" + encodeURIComponent(T.not_found));
    res.send(renderServiceForm(req, svc, false));
  });
  router.post("/services/:id", (req, res) => {
    const kb = kbStore.load();
    const idx = (kb.services || []).findIndex((s) => s.id === req.params.id);
    if (idx < 0) return res.redirect("/admin/services?error=" + encodeURIComponent(T.not_found));
    const parsed = parseServiceFromBody(req.body);
    if (!parsed.name) return res.redirect(`/admin/services/${req.params.id}/edit?error=${encodeURIComponent(T.required + ": " + T.label_service_name)}`);
    parsed.id = req.params.id;
    kb.services[idx] = parsed;
    kbStore.save(kb);
    res.redirect(`/admin/services?flash=${encodeURIComponent(T.saved + ": " + parsed.name)}`);
  });
  router.post("/services/:id/delete", (req, res) => {
    const kb = kbStore.load();
    const before = (kb.services || []).length;
    kb.services = (kb.services || []).filter((s) => s.id !== req.params.id);
    if (kb.services.length === before) return res.redirect("/admin/services?error=" + encodeURIComponent(T.not_found));
    kbStore.save(kb);
    res.redirect("/admin/services?flash=" + encodeURIComponent(T.deleted));
  });

  // Insurance partners
  router.get("/insurance", (req, res) => {
    res.send(renderInsuranceList(req, kbStore.load().insurance_partners || []));
  });
  router.post("/insurance", (req, res) => {
    const name = (req.body.name || "").trim();
    if (!name) return res.redirect("/admin/insurance?error=" + encodeURIComponent(T.required));
    const kb = kbStore.load();
    if (!Array.isArray(kb.insurance_partners)) kb.insurance_partners = [];
    if (kb.insurance_partners.includes(name)) {
      return res.redirect("/admin/insurance?error=" + encodeURIComponent(T.already_exists));
    }
    kb.insurance_partners.push(name);
    kbStore.save(kb);
    res.redirect(`/admin/insurance?flash=${encodeURIComponent(T.added + ": " + name)}`);
  });
  router.post("/insurance/:idx/delete", (req, res) => {
    const idx = parseInt(req.params.idx, 10);
    const kb = kbStore.load();
    if (!Array.isArray(kb.insurance_partners) || !Number.isFinite(idx) || idx < 0 || idx >= kb.insurance_partners.length) {
      return res.redirect("/admin/insurance?error=" + encodeURIComponent(T.not_found));
    }
    const removed = kb.insurance_partners.splice(idx, 1)[0];
    kbStore.save(kb);
    res.redirect(`/admin/insurance?flash=${encodeURIComponent(T.removed + ": " + removed)}`);
  });

  // Payment methods
  router.get("/payment", (req, res) => {
    res.send(renderPaymentList(req, kbStore.load().payment_methods || []));
  });
  router.post("/payment", (req, res) => {
    const name = (req.body.name || "").trim();
    if (!name) return res.redirect("/admin/payment?error=" + encodeURIComponent(T.required));
    const kb = kbStore.load();
    if (!Array.isArray(kb.payment_methods)) kb.payment_methods = [];
    if (kb.payment_methods.includes(name)) {
      return res.redirect("/admin/payment?error=" + encodeURIComponent(T.already_exists));
    }
    kb.payment_methods.push(name);
    kbStore.save(kb);
    res.redirect(`/admin/payment?flash=${encodeURIComponent(T.added + ": " + name)}`);
  });
  router.post("/payment/:idx/delete", (req, res) => {
    const idx = parseInt(req.params.idx, 10);
    const kb = kbStore.load();
    if (!Array.isArray(kb.payment_methods) || !Number.isFinite(idx) || idx < 0 || idx >= kb.payment_methods.length) {
      return res.redirect("/admin/payment?error=" + encodeURIComponent(T.not_found));
    }
    const removed = kb.payment_methods.splice(idx, 1)[0];
    kbStore.save(kb);
    res.redirect(`/admin/payment?flash=${encodeURIComponent(T.removed + ": " + removed)}`);
  });

  // Clinic info
  router.get("/clinic", (req, res) => {
    res.send(renderClinicForm(req, kbStore.load().clinic || {}));
  });
  router.post("/clinic", (req, res) => {
    const kb = kbStore.load();
    const c = kb.clinic || {};
    if (req.body.address !== undefined) c.address = String(req.body.address).trim();
    if (req.body.website !== undefined) c.website = String(req.body.website).trim();
    if (req.body.email !== undefined) c.email = String(req.body.email).trim();
    const founded = parseInt(req.body.founded, 10);
    if (Number.isFinite(founded)) c.founded = founded;
    else if (req.body.founded === "") delete c.founded;
    c.working_hours = c.working_hours || {};
    if (req.body.hours_mon_fri !== undefined) c.working_hours.monday_friday = String(req.body.hours_mon_fri).trim();
    if (req.body.hours_sat !== undefined) c.working_hours.saturday = String(req.body.hours_sat).trim();
    kb.clinic = c;
    kbStore.save(kb);
    res.redirect("/admin/clinic?flash=" + encodeURIComponent(T.saved));
  });

  // Doctor routing — structured form (no JSON)
  router.get("/routing", (req, res) => {
    const kb = kbStore.load();
    res.send(renderRoutingForm(req, kb.doctor_routing || {}, kb.doctors || []));
  });
  router.post("/routing", (req, res) => {
    const kb = kbStore.load();
    const routing = kb.doctor_routing || {};
    for (const cat of ROUTING_CATEGORIES) {
      if (cat.primaryShape) {
        const primary = nullEmpty(req.body[`cat_${cat.key}_primary`]);
        const additional = asArray(req.body[`cat_${cat.key}_additional`]).filter(Boolean);
        if (primary || additional.length) {
          routing[cat.key] = { primary: primary || "", additional };
        } else {
          delete routing[cat.key];
        }
      } else {
        const selected = asArray(req.body[`cat_${cat.key}`]).filter(Boolean);
        if (selected.length) routing[cat.key] = selected;
        else delete routing[cat.key];
      }
    }
    kb.doctor_routing = routing;
    kbStore.save(kb);
    res.redirect("/admin/routing?flash=" + encodeURIComponent(T.saved));
  });

  return router;
}

module.exports = { buildRouter };
