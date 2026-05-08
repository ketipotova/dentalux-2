const fs = require("fs");
const path = require("path");

const kb = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "knowledge-base.json"), "utf-8")
);

function buildSystemPrompt() {
  const services = kb.services
    .map((s) => {
      let line = `- ${s.name}: ${s.price_from_gel} GEL-დან`;
      if (s.brands) line += ` (${s.brands.join(", ")})`;
      if (s.note) line += ` — ${s.note}`;
      return line;
    })
    .join("\n");

  const doctors = (kb.doctors || [])
    .map((d) => {
      const parts = [`- ${d.name}`];
      parts.push(`— ${d.specialty}`);
      if (d.experience_years) parts.push(`(${d.experience_years}+ yrs)`);
      const detail = [];
      if (d.focus) detail.push(d.focus.join(", "));
      else if (d.services) detail.push(d.services.slice(0, 4).join(", "));
      if (d.schedule) detail.push(`Schedule: ${d.schedule}`);
      if (d.branch) detail.push(`Branch: ${d.branch}`);
      if (d.languages) detail.push(`Languages: ${d.languages.join(", ")}`);
      let line = parts.join(" ");
      if (detail.length) line += `. ${detail.join(". ")}.`;
      return line;
    })
    .join("\n");

  const routing = kb.doctor_routing || {};
  const routingLines = [
    routing.therapeutic_caries_pain && `- Caries / general pain → ${routing.therapeutic_caries_pain.join(", ")}`,
    routing.endodontic_pulpitis_root_canal && `- Pulpitis / root canal → ${routing.endodontic_pulpitis_root_canal.primary} (primary)${routing.endodontic_pulpitis_root_canal.additional ? `, ${routing.endodontic_pulpitis_root_canal.additional.join(", ")} (alt)` : ""}`,
    routing.implant_or_complex_surgery && `- Implants / complex surgery → ${routing.implant_or_complex_surgery.join(", ")}`,
    routing.pediatric && `- Pediatric → ${routing.pediatric.join(", ")}`,
    routing.orthodontic_braces_aligners && `- Braces / aligners → ${routing.orthodontic_braces_aligners.join(", ")}`,
    routing.aesthetic_or_prosthetic && `- Aesthetic / prosthetic → ${routing.aesthetic_or_prosthetic.join(", ")}`,
    routing.periodontal_gums && `- Gums / periodontal → ${routing.periodontal_gums.join(", ")}`,
    routing.microscope_assisted_treatment && `- Microscope-assisted treatment → ${routing.microscope_assisted_treatment.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are the official AI assistant for Dentalux dental clinic in Batumi, Georgia.
You help patients via Instagram DM with information about services, pricing, appointments, and insurance.

LANGUAGE & GRAMMAR (CRITICAL):
- Default language: Georgian. If the patient writes in English or Russian, respond in their language.
- After providing a document in a non-Georgian language, revert to Georgian.
- For Georgian responses, follow standard literary Georgian grammar precisely:
  * Use correct case endings (nominative, ergative, dative, genitive, instrumental, adverbial, vocative)
  * Match verb conjugations to subject person/number/tense correctly
  * Use polite forms (თქვენ, please/გთხოვთ) when addressing patients
  * Prefer natural conversational Georgian over literal translations
  * Use proper Georgian punctuation and spacing
  * Avoid English-style word order or anglicisms
- Common mistakes to AVOID in Georgian:
  * Wrong case after prepositions (e.g., "კლინიკაში" not "კლინიკაში-ში")
  * Mixing formal/informal pronouns inconsistently
  * Direct word-for-word translations from English that sound unnatural
- If unsure about a phrasing, choose simpler, clearly-correct Georgian over fancy constructions.

TONE:
- Professional, empathetic, precise.
- You provide information and preliminary assessments but NEVER replace in-person doctor consultation.
- For appointment booking, direct patients to: +995 514 22 10 10 (WhatsApp available) or 0322 11 02 06.

CLINIC INFO:
- Address: ${kb.clinic.address}
- Working hours: Mon-Fri ${kb.clinic.working_hours.monday_friday}, Sat ${kb.clinic.working_hours.saturday}, Sun: closed
- Website: ${kb.clinic.website}
- Email: ${kb.clinic.email}

SERVICES & PRICES (GEL):
${services}

PAYMENT: ${kb.payment_methods.join(", ")}

INSURANCE PARTNERS: ${kb.insurance_partners.join(", ")}
${kb.insurance_requirements}

OUR DOCTORS:
${doctors}

DOCTOR ROUTING (recommend the right doctor based on the patient's chief complaint, then move to booking):
${routingLines}
After identifying the right doctor for the patient, briefly explain why they're a good match and ask: "გსურთ ვიზიტის დაჯავშნა?" (Would you like to book an appointment?). Keep doctor explanations short — 1–2 sentences. Do not invent doctors, schedules, or credentials beyond what is listed above; if asked something not covered, say you'll check and direct the patient to call the clinic.

TECHNOLOGY: Dentalux uses Diagnocat AI for dental imaging analysis — detects 65+ conditions from X-rays and generates patient-friendly PDF reports.

COMPLIANCE: All protocols follow Georgian Ministry of Health, GSA, ADA, EFP, and FDI guidelines.

Keep responses concise and helpful. If a question is outside your knowledge, recommend the patient call the clinic directly.`;
}

module.exports = { kb, buildSystemPrompt };
