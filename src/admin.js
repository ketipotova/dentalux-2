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
  search_placeholder: "ძებნა სახელით ან სპეციალობით…",
  section_essentials: "ძირითადი ინფორმაცია",
  section_profile: "სრული პროფილი",
  section_bio: "ბიოგრაფია და კვალიფიკაცია",
  section_hint: "არასავალდებულო — დააჭირეთ გასახსნელად",
  inline_error: "გთხოვთ შეავსოთ აუცილებელი ველები (მონიშნულია *).",
  today_title: "დღეს მუშაობენ",
  today_none: "დღეს ექიმები არ მუშაობენ — კვირას კლინიკა დაკეტილია.",
  overview_title: "მიმოხილვა",

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
  label_phones: "ტელეფონები (გამოყავით მძიმეებით)",
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
:root{
  --bg:#F6F4EF; --surface:#FFFFFF; --surface-2:#FBFAF6;
  --ink:#20242B; --ink-2:#5A6470; --muted:#8C95A1;
  --line:#ECE7DC; --line-2:#E0DACE;
  --accent:#A9793F; --accent-d:#8F6431; --accent-tint:#F4ECDF; --accent-ring:rgba(169,121,63,.22);
  --ok-bg:#E9F2EC; --ok-fg:#1F7A45;
  --danger:#BB4A30; --danger-bg:#FBEAE5; --danger-fg:#9E3A22;
  --radius:12px; --radius-sm:9px;
  --shadow:0 1px 2px rgba(32,36,43,.04),0 4px 14px rgba(32,36,43,.05);
  --shadow-lg:0 8px 30px rgba(32,36,43,.10);
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans Georgian","BPG Nino Mtavruli","Sylfaen",Roboto,sans-serif;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:var(--sans);background:var(--bg);color:var(--ink);line-height:1.55;-webkit-font-smoothing:antialiased;font-size:15px}
a{color:inherit}

/* App shell */
.app{display:grid;grid-template-columns:248px 1fr;min-height:100vh}
.sidebar{background:var(--surface);border-right:1px solid var(--line);padding:22px 16px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto}
.brand{display:block;text-decoration:none;padding:6px 8px 18px}
.brand-row{display:flex;align-items:center;gap:10px}
.brand-mark{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--accent),var(--accent-d));color:#fff;display:grid;place-items:center;font-weight:700;font-size:15px;letter-spacing:.5px;box-shadow:var(--shadow)}
.brand-name{font-weight:700;font-size:16px;letter-spacing:.2px;color:var(--ink)}
.brand-sub{font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;margin:6px 0 0 40px}
.nav{display:flex;flex-direction:column;gap:2px;margin-top:6px}
.nav a{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:var(--radius-sm);color:var(--ink-2);text-decoration:none;font-size:14.5px;font-weight:500;position:relative;transition:background .12s,color .12s}
.nav a svg{width:18px;height:18px;flex:none;stroke-width:1.9}
.nav a:hover{background:var(--surface-2);color:var(--ink)}
.nav a.active{background:var(--accent-tint);color:var(--accent-d)}
.nav a.active::before{content:"";position:absolute;left:-16px;top:8px;bottom:8px;width:3px;border-radius:0 3px 3px 0;background:var(--accent)}
.nav-foot{margin-top:auto;padding:14px 12px 4px;font-size:12px;color:var(--muted);border-top:1px solid var(--line)}

.content{min-width:0;display:flex;flex-direction:column}
.topbar{display:none}
main{width:100%;max-width:980px;margin:0 auto;padding:30px 28px 64px}
.page-head{margin-bottom:22px}
h1{font-size:25px;line-height:1.25;margin:0;font-weight:680;letter-spacing:-.2px}
.page-sub,.muted{color:var(--ink-2);font-size:13.5px}
.muted{color:var(--muted)}
.page-sub{margin:6px 0 0}
h2{font-size:12px;margin:28px 0 10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.9px}

/* Buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 17px;background:var(--accent);color:#fff;border:1px solid transparent;border-radius:var(--radius-sm);font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:inherit;transition:background .12s,box-shadow .12s,transform .04s;white-space:nowrap}
.btn:hover{background:var(--accent-d);box-shadow:var(--shadow)}
.btn:active{transform:translateY(1px)}
.btn.secondary{background:var(--surface);color:var(--ink);border-color:var(--line-2)}
.btn.secondary:hover{background:var(--surface-2);border-color:var(--accent);color:var(--accent-d);box-shadow:none}
.btn.danger{background:var(--surface);color:var(--danger-fg);border-color:#E6CFC7}
.btn.danger:hover{background:var(--danger);color:#fff;border-color:transparent}
.btn-row{margin-top:20px;display:flex;gap:10px;flex-wrap:wrap}

/* Cards (dashboard) */
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;margin-top:14px}
.card{background:var(--surface);padding:20px;border-radius:var(--radius);border:1px solid var(--line);box-shadow:var(--shadow);transition:transform .12s,box-shadow .12s,border-color .12s}
.card:hover{transform:translateY(-2px);box-shadow:var(--shadow-lg);border-color:var(--line-2)}
.card a{text-decoration:none;display:block}
.card .label{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;font-weight:600}
.card .count{font-size:34px;font-weight:720;margin:8px 0 2px;color:var(--ink);letter-spacing:-.5px}
.card .muted{color:var(--accent-d);font-weight:600;font-size:13px}

/* Toolbar above tables */
.toolbar{display:flex;align-items:center;gap:12px;margin:4px 0 16px;flex-wrap:wrap}
.toolbar .btn{margin-left:auto}
.search{position:relative;flex:1;min-width:200px;max-width:340px}
.search input{padding-left:38px}
.search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:17px;height:17px;color:var(--muted);stroke-width:2;pointer-events:none}

/* Tables */
.table-wrap{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:13px 16px;border-bottom:1px solid var(--line);vertical-align:middle;font-size:14px}
th{background:var(--surface-2);color:var(--muted);font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.7px}
tbody tr:last-child td{border-bottom:none}
tbody tr{transition:background .1s}
tbody tr:hover{background:var(--surface-2)}
td strong{font-weight:650}
.row-actions{display:flex;gap:8px;justify-content:flex-end}
.row-actions .btn{padding:7px 13px;font-size:13px}
.empty{color:var(--muted);text-align:center;padding:34px 16px!important}

/* Forms */
form{margin:0}
fieldset{border:1px solid var(--line);border-radius:var(--radius);padding:8px 22px 22px;margin:0 0 18px;background:var(--surface);box-shadow:var(--shadow)}
legend{padding:0 8px;margin-left:-4px;color:var(--accent-d);font-size:11px;text-transform:uppercase;letter-spacing:.9px;font-weight:700}
label{display:block;margin:16px 0 6px;font-size:13.5px;color:var(--ink-2);font-weight:600}
input[type="text"],input[type="number"],input[type="password"],textarea,select{width:100%;padding:11px 13px;background:var(--surface);color:var(--ink);border:1px solid var(--line-2);border-radius:var(--radius-sm);font-size:14.5px;font-family:inherit;transition:border-color .12s,box-shadow .12s}
input::placeholder,textarea::placeholder{color:#B4BBC4}
textarea{min-height:104px;resize:vertical;line-height:1.6}
textarea.tall{min-height:160px}
input:focus,textarea:focus,select:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-ring)}
select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238C95A1' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 13px center;padding-right:36px}
.hint{font-size:12.5px;color:var(--muted);margin-top:6px}

/* Chips / day toggles */
.checkboxes{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.checkboxes label{margin:0;cursor:pointer;border:1px solid var(--line-2);background:var(--surface);padding:8px 14px;border-radius:999px;font-size:13.5px;color:var(--ink-2);font-weight:600;user-select:none;transition:all .12s}
.checkboxes label:hover{border-color:var(--accent)}
.checkboxes input{position:absolute;opacity:0;width:0;height:0}
.checkboxes label:has(input:checked){background:var(--accent-tint);border-color:var(--accent);color:var(--accent-d)}

/* Inline add form (insurance/payment) */
.row-form{display:flex;gap:12px;align-items:flex-end;max-width:560px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:18px 20px;box-shadow:var(--shadow)}
.row-form > div{flex:1}
.row-form label{margin-top:0}

/* Routing multi-select */
.doctor-multi{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;margin-top:8px}
.doctor-multi label{display:flex;align-items:center;gap:9px;margin:0;font-size:14px;color:var(--ink);cursor:pointer;border:1px solid var(--line-2);background:var(--surface);padding:9px 12px;border-radius:var(--radius-sm);font-weight:500;transition:all .12s}
.doctor-multi label:hover{border-color:var(--accent)}
.doctor-multi input{width:auto;margin:0;accent-color:var(--accent)}
.doctor-multi label:has(input:checked){background:var(--accent-tint);border-color:var(--accent)}
.routing-block{margin-bottom:26px}
.routing-block h2{margin:0 0 4px;color:var(--ink);font-size:15.5px;text-transform:none;letter-spacing:0;font-weight:650}
.routing-block label{font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin-top:14px}

/* Toast flash */
.toast{position:fixed;top:18px;left:50%;transform:translateX(-50%) translateY(-12px);z-index:60;display:flex;align-items:center;gap:10px;padding:13px 18px;border-radius:var(--radius);font-size:14px;font-weight:600;box-shadow:var(--shadow-lg);opacity:0;transition:opacity .25s,transform .25s;max-width:90vw}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.toast.ok{background:var(--ok-bg);color:var(--ok-fg);border:1px solid #C9E3D2}
.toast.err{background:var(--danger-bg);color:var(--danger-fg);border:1px solid #E6CFC7}
.toast svg{width:18px;height:18px;flex:none}

/* Mobile */
.nav-toggle{display:none}
.scrim{display:none}
@media (max-width:820px){
  .app{grid-template-columns:1fr}
  .sidebar{position:fixed;left:0;top:0;bottom:0;width:264px;z-index:50;transform:translateX(-100%);transition:transform .22s ease;box-shadow:var(--shadow-lg);height:100%}
  .sidebar.open{transform:translateX(0)}
  .topbar{display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:30;background:var(--surface);border-bottom:1px solid var(--line);padding:12px 16px}
  .topbar-brand{font-weight:700;font-size:16px;text-decoration:none;color:var(--ink);display:flex;align-items:center;gap:9px}
  .nav-toggle{display:inline-grid;place-items:center;width:38px;height:38px;border:1px solid var(--line-2);background:var(--surface);border-radius:9px;cursor:pointer;color:var(--ink)}
  .nav-toggle svg{width:20px;height:20px}
  .scrim.show{display:block;position:fixed;inset:0;background:rgba(20,18,14,.34);z-index:45}
  main{padding:20px 16px 56px}
  h1{font-size:22px}
  /* table -> stacked cards */
  table,thead,tbody,th,td,tr{display:block}
  thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  .table-wrap{background:transparent;border:none;box-shadow:none;overflow:visible}
  tbody tr{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);margin-bottom:12px;padding:6px 4px}
  tbody tr:hover{background:var(--surface)}
  td{border-bottom:1px solid var(--line);padding:11px 16px;display:flex;justify-content:space-between;gap:14px;text-align:right}
  td:last-child{border-bottom:none}
  td::before{content:attr(data-label);text-align:left;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.6px;font-weight:700;flex:none;align-self:center}
  td:not([data-label]){justify-content:flex-end}
  .row-actions{justify-content:flex-end}
  .row-form{flex-direction:column;align-items:stretch;max-width:none}
  .row-form .btn{width:100%}
}
@media (min-width:821px){ .sidebar{transform:none!important} }

/* Two-column field rows (collapse on mobile) */
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}
.field label{margin-top:16px}
.req{color:var(--danger);margin-left:3px;font-weight:700}
@media (max-width:620px){ .grid2{grid-template-columns:1fr} }

/* Collapsible form sections (progressive disclosure) */
details.section{border:1px solid var(--line);border-radius:var(--radius);background:var(--surface);box-shadow:var(--shadow);margin:0 0 18px;overflow:hidden}
details.section>summary{list-style:none;cursor:pointer;padding:16px 20px;display:flex;align-items:center;gap:12px;font-weight:650;color:var(--ink);font-size:15px}
details.section>summary::-webkit-details-marker{display:none}
details.section>summary:hover{background:var(--surface-2)}
details.section>summary .sub{font-weight:500;color:var(--muted);font-size:12.5px}
details.section>summary .chev{margin-left:auto;width:18px;height:18px;color:var(--muted);transition:transform .15s}
details.section[open]>summary .chev{transform:rotate(90deg)}
.section-body{padding:4px 20px 20px}
.section-body label:first-child{margin-top:6px}

/* Sticky save/cancel bar on forms */
.form-actions{position:sticky;bottom:0;z-index:10;display:flex;gap:10px;flex-wrap:wrap;margin:6px -28px 0;padding:14px 28px;background:linear-gradient(to top,var(--bg) 72%,transparent);border-top:1px solid var(--line)}
@media (max-width:820px){ .form-actions{margin:6px -16px 0;padding:14px 16px} .form-actions .btn{flex:1} }

/* Inline error banner inside a form */
.inline-error{display:flex;align-items:center;gap:9px;background:var(--danger-bg);color:var(--danger-fg);border:1px solid #E6CFC7;border-radius:var(--radius-sm);padding:12px 15px;margin-bottom:18px;font-size:14px;font-weight:600}
.inline-error svg{width:18px;height:18px;flex:none}

/* Dashboard: quick actions, today roster */
.quick{display:flex;gap:10px;flex-wrap:wrap;margin:4px 0 20px}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:18px 20px;margin-bottom:8px}
.panel-head{display:flex;align-items:baseline;gap:10px;margin-bottom:2px}
.panel-head h2{margin:0;color:var(--ink);text-transform:none;letter-spacing:0;font-size:16px;font-weight:680}
.panel-head .when{color:var(--accent-d);font-weight:650;font-size:13px}
.roster{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:9px;margin-top:12px}
.ritem{display:flex;flex-direction:column;gap:2px;padding:11px 13px;border:1px solid var(--line);border-radius:9px;background:var(--surface-2)}
.rname{font-weight:650;font-size:14px}
.rspec{font-size:12.5px;color:var(--muted)}
`;

// --- Layout ---

// Inline stroke icons (Lucide-style), keyed by nav path. currentColor stroke.
const ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  doctors: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  services: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 3h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2V4a1 1 0 0 1 1-1z"/><path d="M9 12h6M9 16h4"/></svg>',
  insurance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>',
  clinic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21h18M5 21V8l7-4 7 4v13"/><path d="M12 8v4M10 10h4"/></svg>',
  routing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M8.3 6.7l7.4 4M8.3 17.3l7.4-4"/></svg>',
  payment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></svg>',
};
const ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>';
const ICON_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';

function navItem(req, path, label) {
  const active = path === "" ? req.path === "/" : req.path.startsWith(`/${path}`);
  const href = path === "" ? "/admin" : `/admin/${path}`;
  const icon = ICONS[path || "dashboard"] || "";
  return `<a href="${href}"${active ? ' class="active"' : ""}>${icon}<span>${esc(label)}</span></a>`;
}

function layout(req, title, content, opts = {}) {
  const links = [
    navItem(req, "", T.nav_dashboard),
    ...NAV.map((s) => navItem(req, s.path, s.label)),
  ].join("");

  // Flash/error become a toast surfaced + auto-dismissed client-side.
  const okIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>';
  const errIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/></svg>';
  let toast = "";
  if (req.query.flash) toast = `<div class="toast ok" id="toast">${okIcon}<span>${esc(req.query.flash)}</span></div>`;
  else if (req.query.error) toast = `<div class="toast err" id="toast">${errIcon}<span>${esc(req.query.error)}</span></div>`;

  const sub = opts.subtitle ? `<p class="page-sub">${esc(opts.subtitle)}</p>` : "";

  return `<!DOCTYPE html><html lang="ka"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — ${esc(T.brand)}</title>
<style>${CSS}</style>
</head><body>
<div class="app">
  <aside class="sidebar" id="sidebar">
    <a class="brand" href="/admin">
      <span class="brand-row"><span class="brand-mark">D</span><span class="brand-name">Dentalux</span></span>
      <span class="brand-sub">ადმინისტრირება</span>
    </a>
    <nav class="nav">${links}</nav>
    <div class="nav-foot">ცვლილებები მაშინვე აისახება ბოტში.</div>
  </aside>
  <div class="content">
    <header class="topbar">
      <button class="nav-toggle" id="navToggle" aria-label="Menu">${ICON_MENU}</button>
      <a class="topbar-brand" href="/admin"><span class="brand-mark">D</span> Dentalux</a>
    </header>
    <main>
      <div class="page-head"><h1>${esc(title)}</h1>${sub}</div>
      ${content}
    </main>
  </div>
</div>
<div class="scrim" id="scrim"></div>
${toast}
<script>
(function(){
  var sb=document.getElementById('sidebar'),sc=document.getElementById('scrim'),tg=document.getElementById('navToggle');
  function close(){sb&&sb.classList.remove('open');sc&&sc.classList.remove('show');}
  if(tg)tg.addEventListener('click',function(){sb.classList.toggle('open');sc.classList.toggle('show');});
  if(sc)sc.addEventListener('click',close);
  var t=document.getElementById('toast');
  if(t){requestAnimationFrame(function(){t.classList.add('show');});
    setTimeout(function(){t.classList.remove('show');},4200);
    if(history.replaceState)history.replaceState(null,'',location.pathname);}
  var q=document.getElementById('q');
  if(q){q.addEventListener('input',function(){
    var v=q.value.trim().toLowerCase();
    document.querySelectorAll('[data-search]').forEach(function(r){
      r.style.display=r.getAttribute('data-search').indexOf(v)>-1?'':'none';
    });
  });}
})();
</script>
</body></html>`;
}

// --- Page renderers ---

// Current weekday in Tbilisi as a short code (Sun..Sat), matching DAYS codes.
function tbilisiWeekdayCode() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tbilisi",
    weekday: "short",
  }).format(new Date());
}
// Full Georgian weekday name for the dashboard header.
const WEEKDAY_KA = {
  Sun: "კვირა", Mon: "ორშაბათი", Tue: "სამშაბათი", Wed: "ოთხშაბათი",
  Thu: "ხუთშაბათი", Fri: "პარასკევი", Sat: "შაბათი",
};

function renderDashboard(req, kb) {
  const today = tbilisiWeekdayCode();
  const working = (kb.doctors || []).filter((d) =>
    (d.working_days || []).includes(today)
  );
  const roster = working.length
    ? `<div class="roster">${working
        .map(
          (d) =>
            `<div class="ritem"><span class="rname">${esc(d.name || "")}</span><span class="rspec">${esc(d.specialty || "")}</span></div>`
        )
        .join("")}</div>`
    : `<p class="muted" style="margin:10px 0 0">${esc(T.today_none)}</p>`;

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

  const body = `
<div class="quick">
  <a class="btn" href="/admin/doctors/new">${esc(T.doctor_add_button)}</a>
  <a class="btn secondary" href="/admin/services/new">${esc(T.service_add_button)}</a>
</div>
<div class="panel">
  <div class="panel-head"><h2>${esc(T.today_title)}</h2><span class="when">${esc(WEEKDAY_KA[today] || today)}</span></div>
  ${roster}
</div>
<h2>${esc(T.overview_title)}</h2>
<div class="cards">${cards}</div>`;
  return layout(req, T.nav_dashboard, body, { subtitle: T.dashboard_subtitle });
}

function renderDoctorsList(req, doctors) {
  const rows = doctors
    .map((d) => {
      const days = (d.working_days || [])
        .map((c) => (DAYS.find((x) => x.code === c) || {}).label || c)
        .join(", ");
      const search = `${d.name || ""} ${d.name_ka || ""} ${d.specialty || ""}`.toLowerCase();
      return `<tr data-search="${esc(search)}">
  <td data-label="${esc(T.th_name)}"><strong>${esc(d.name || "")}</strong>${d.name_ka ? `<div class="muted">${esc(d.name_ka)}</div>` : ""}</td>
  <td data-label="${esc(T.th_specialty)}">${esc(d.specialty || "")}</td>
  <td data-label="${esc(T.th_working_days)}">${esc(days)}</td>
  <td class="row-actions">
    <a class="btn secondary" href="/admin/doctors/${esc(d.id)}/edit">${esc(T.btn_edit)}</a>
    <form method="post" action="/admin/doctors/${esc(d.id)}/delete" onsubmit="return confirm('${esc(T.confirm_delete_doctor)}')"><button class="btn danger" type="submit">${esc(T.btn_delete)}</button></form>
  </td>
</tr>`;
    })
    .join("");
  const body = `
<div class="toolbar">
  <div class="search">${ICON_SEARCH}<input type="text" id="q" placeholder="${esc(T.search_placeholder)}" autocomplete="off"></div>
  <a class="btn" href="/admin/doctors/new">${esc(T.doctor_add_button)}</a>
</div>
<div class="table-wrap"><table><thead><tr><th>${esc(T.th_name)}</th><th>${esc(T.th_specialty)}</th><th>${esc(T.th_working_days)}</th><th></th></tr></thead><tbody>${rows || `<tr><td class="empty" colspan="4">${esc(T.empty_doctors)}</td></tr>`}</tbody></table></div>`;
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

const ICON_CHEV = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>';
const ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 9v4M12 16.5v.5"/><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';

function renderDoctorForm(req, doctor, isNew, errorMsg) {
  const wd = new Set(doctor.working_days || []);
  const dayChecks = DAYS.map(
    (d) =>
      `<label><input type="checkbox" name="working_days" value="${d.code}"${wd.has(d.code) ? " checked" : ""}> ${d.label}</label>`
  ).join("");
  const action = isNew ? "/admin/doctors" : `/admin/doctors/${esc(doctor.id)}`;
  const title = isNew ? T.doctor_add_title : T.doctor_edit_title(doctor.name || "");
  const errBanner = errorMsg
    ? `<div class="inline-error">${ICON_WARN}<span>${esc(errorMsg)}</span></div>`
    : "";
  // If the user is re-shown the form after an error, keep optional sections
  // open only if they already contain data, so nothing they typed is hidden.
  const profileHasData = !!(
    doctor.name_variants || doctor.level || doctor.experience_years ||
    doctor.at_dentalux_since || doctor.branch || doctor.languages ||
    doctor.focus || doctor.tools || doctor.services
  );
  const bioHasData = !!(
    doctor.education || doctor.key_certifications || doctor.key_seminars ||
    doctor.recent_training_2024 || doctor.philosophy_ka || doctor.philosophy_en || doctor.notes
  );
  const body = `<form method="post" action="${action}">
${errBanner}
<fieldset><legend>${esc(T.section_essentials)}</legend>
  <div class="grid2">
    <div class="field"><label>${esc(T.label_name_en)}<span class="req">*</span></label>
      <input type="text" name="name" required value="${esc(doctor.name)}"></div>
    <div class="field"><label>${esc(T.label_name_ka)}</label>
      <input type="text" name="name_ka" value="${esc(doctor.name_ka)}"></div>
  </div>
  <label>${esc(T.label_specialty)}<span class="req">*</span></label>
  <input type="text" name="specialty" required value="${esc(doctor.specialty)}">
  <label>${esc(T.label_working_days)}</label>
  <div class="checkboxes">${dayChecks}</div>
  <label>${esc(T.label_schedule_note)}</label>
  <input type="text" name="schedule" value="${esc(doctor.schedule)}" placeholder="${esc(T.label_schedule_hint)}">
</fieldset>

<details class="section"${profileHasData ? " open" : ""}>
  <summary>${esc(T.section_profile)} <span class="sub">${esc(T.section_hint)}</span>${ICON_CHEV}</summary>
  <div class="section-body">
    <div class="grid2">
      <div class="field"><label>${esc(T.label_level)}</label>
        <input type="text" name="level" value="${esc(doctor.level)}"></div>
      <div class="field"><label>${esc(T.label_branch)}</label>
        <input type="text" name="branch" value="${esc(doctor.branch)}"></div>
      <div class="field"><label>${esc(T.label_experience_years)}</label>
        <input type="number" name="experience_years" min="0" value="${esc(doctor.experience_years)}"></div>
      <div class="field"><label>${esc(T.label_at_dentalux_since)}</label>
        <input type="number" name="at_dentalux_since" min="1900" max="2100" value="${esc(doctor.at_dentalux_since)}"></div>
    </div>
    <label>${esc(T.label_name_variants)}</label>
    <input type="text" name="name_variants" value="${esc(csvToLine(doctor.name_variants))}">
    <label>${esc(T.label_languages)}</label>
    <input type="text" name="languages" value="${esc(csvToLine(doctor.languages))}" placeholder="Georgian, English, Russian">
    <label>${esc(T.label_focus)}</label>
    <input type="text" name="focus" value="${esc(csvToLine(doctor.focus))}">
    <label>${esc(T.label_tools)}</label>
    <input type="text" name="tools" value="${esc(csvToLine(doctor.tools))}">
    <label>${esc(T.label_services_list)}</label>
    <textarea name="services">${esc(arrToLines(doctor.services))}</textarea>
  </div>
</details>

<details class="section"${bioHasData ? " open" : ""}>
  <summary>${esc(T.section_bio)} <span class="sub">${esc(T.section_hint)}</span>${ICON_CHEV}</summary>
  <div class="section-body">
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
  </div>
</details>

<div class="form-actions">
  <button class="btn" type="submit">${isNew ? esc(T.btn_create) : esc(T.btn_save)}</button>
  <a class="btn secondary" href="/admin/doctors">${esc(T.btn_cancel)}</a>
</div>
</form>`;
  return layout(req, title, body);
}

function renderServicesList(req, services) {
  const rows = services
    .map((s) => {
      const search = `${s.name || ""} ${(s.brands || []).join(" ")}`.toLowerCase();
      return `<tr data-search="${esc(search)}">
  <td data-label="${esc(T.th_name)}"><strong>${esc(s.name || "")}</strong></td>
  <td data-label="${esc(T.th_price_from)}">${s.price_from_gel != null ? esc(s.price_from_gel) + " GEL" : ""}</td>
  <td data-label="${esc(T.th_brands)}">${esc((s.brands || []).join(", "))}</td>
  <td class="row-actions">
    <a class="btn secondary" href="/admin/services/${esc(s.id)}/edit">${esc(T.btn_edit)}</a>
    <form method="post" action="/admin/services/${esc(s.id)}/delete" onsubmit="return confirm('${esc(T.confirm_delete_service)}')"><button class="btn danger" type="submit">${esc(T.btn_delete)}</button></form>
  </td>
</tr>`;
    })
    .join("");
  const body = `
<div class="toolbar">
  <div class="search">${ICON_SEARCH}<input type="text" id="q" placeholder="${esc(T.search_placeholder)}" autocomplete="off"></div>
  <a class="btn" href="/admin/services/new">${esc(T.service_add_button)}</a>
</div>
<div class="table-wrap"><table><thead><tr><th>${esc(T.th_name)}</th><th>${esc(T.th_price_from)}</th><th>${esc(T.th_brands)}</th><th></th></tr></thead><tbody>${rows || `<tr><td class="empty" colspan="4">${esc(T.empty_services)}</td></tr>`}</tbody></table></div>`;
  return layout(req, T.services_title, body);
}

function renderServiceForm(req, service, isNew, errorMsg) {
  const action = isNew ? "/admin/services" : `/admin/services/${esc(service.id)}`;
  const title = isNew ? T.service_add_title : T.service_edit_title;
  const errBanner = errorMsg
    ? `<div class="inline-error">${ICON_WARN}<span>${esc(errorMsg)}</span></div>`
    : "";
  const body = `<form method="post" action="${action}">
${errBanner}
<fieldset><legend>${esc(T.legend_service)}</legend>
  <label>${esc(T.label_service_name)}<span class="req">*</span></label>
  <input type="text" name="name" required value="${esc(service.name)}">
  <label>${esc(T.label_price_from)}</label>
  <input type="number" name="price_from_gel" min="0" value="${esc(service.price_from_gel)}">
  <label>${esc(T.label_brands)}</label>
  <input type="text" name="brands" value="${esc((service.brands || []).join(", "))}" placeholder="Damon, Invisalign">
  <label>${esc(T.label_note)}</label>
  <input type="text" name="note" value="${esc(service.note)}">
</fieldset>
<div class="form-actions">
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
  <td data-label="${esc(T.insurance_title)}">${esc(p)}</td>
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
<div class="table-wrap"><table><tbody>${items || `<tr><td class="empty" colspan="2">${esc(T.empty_partners)}</td></tr>`}</tbody></table></div>`;
  return layout(req, T.insurance_title, body);
}

function renderPaymentList(req, methods) {
  const items = methods
    .map(
      (p, i) => `<tr>
  <td data-label="${esc(T.payment_title)}">${esc(p)}</td>
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
<div class="table-wrap"><table><tbody>${items || `<tr><td class="empty" colspan="2">${esc(T.empty_methods)}</td></tr>`}</tbody></table></div>`;
  return layout(req, T.payment_title, body);
}

function renderClinicForm(req, clinic) {
  const wh = clinic.working_hours || {};
  const body = `<form method="post" action="/admin/clinic">
<fieldset><legend>${esc(T.legend_contact)}</legend>
  <label>${esc(T.label_address)}</label>
  <input type="text" name="address" value="${esc(clinic.address)}">
  <label>${esc(T.label_phones)}</label>
  <input type="text" name="phones" value="${esc((clinic.phones || []).join(", "))}" placeholder="+995 514 22 10 10, 0322 11 02 06">
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
      // Re-render with the submitted values so nothing typed is lost.
      return res.status(400).send(renderDoctorForm(req, doctor, true, T.inline_error));
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
    merged.id = req.params.id;
    if (!merged.name || !merged.specialty) {
      // Re-render with the submitted values so nothing typed is lost.
      return res.status(400).send(renderDoctorForm(req, merged, false, T.inline_error));
    }
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
    if (!service.name) return res.status(400).send(renderServiceForm(req, service, true, T.inline_error));
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
    parsed.id = req.params.id;
    if (!parsed.name) return res.status(400).send(renderServiceForm(req, parsed, false, T.inline_error));
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
    if (req.body.phones !== undefined) {
      c.phones = String(req.body.phones)
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
    }
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
