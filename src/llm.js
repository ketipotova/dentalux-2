const { GoogleGenAI } = require("@google/genai");
const Anthropic = require("@anthropic-ai/sdk");
const { buildSystemPrompt, buildLiveContext } = require("./knowledge-base");
const stats = require("./stats");

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const conversationHistory = new Map();
const MAX_HISTORY = 20;

const GEMINI_MODEL = "gemini-3.5-flash";
const CLAUDE_MODEL = "claude-opus-4-7";
// Georgian tokenizes at ~6–12 tokens per character, so 1k is far too tight
// and replies were getting truncated mid-word.
const MAX_OUTPUT_TOKENS = 4096;

// Attach the per-call live context to the latest user message so the static
// system prompt stays byte-stable across requests (a prerequisite for
// prompt-cache hits on Claude).
function attachLiveContext(history, liveContext) {
  return history.map((turn, i, arr) => {
    const isLastUser = i === arr.length - 1 && turn.role === "user";
    const text = isLastUser ? `${liveContext}\n\n${turn.text}` : turn.text;
    return { role: turn.role, text };
  });
}

async function callGemini(history, systemPrompt, liveContext) {
  const augmented = attachLiveContext(history, liveContext);
  const geminiHistory = augmented.map((turn) => ({
    role: turn.role === "assistant" ? "model" : "user",
    parts: [{ text: turn.text }],
  }));

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: geminiHistory,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  });

  const text =
    response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

async function callClaude(history, systemPrompt, liveContext) {
  const augmented = attachLiveContext(history, liveContext);
  const claudeHistory = augmented.map((turn) => ({
    role: turn.role,
    content: turn.text,
  }));

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: systemPrompt,
    messages: claudeHistory,
  });

  // Find the first text block — defensive in case the API ever returns a
  // non-text block first (thinking, tool_use, etc.).
  const textBlock = response.content?.find((b) => b.type === "text");
  const text = textBlock?.text;
  if (!text) {
    const shape = JSON.stringify({
      stop_reason: response.stop_reason,
      content_types: response.content?.map((b) => b.type),
    });
    throw new Error(`Claude returned no text block: ${shape}`);
  }
  return text;
}

async function getResponse(userId, userMessage) {
  if (!conversationHistory.has(userId)) {
    conversationHistory.set(userId, []);
  }

  const history = conversationHistory.get(userId);
  history.push({ role: "user", text: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const systemPrompt = buildSystemPrompt();
  const liveContext = buildLiveContext();
  let reply;
  let provider = null;

  try {
    reply = await callClaude(history, systemPrompt, liveContext);
    provider = "claude";
  } catch (claudeErr) {
    console.warn(
      `[LLM] Claude failed (${claudeErr.name} status=${claudeErr.status}): ${claudeErr.message}`
    );
    if (claudeErr.error) {
      console.warn(`[LLM] Claude error body: ${JSON.stringify(claudeErr.error)}`);
    }
    try {
      reply = await callGemini(history, systemPrompt, liveContext);
      provider = "gemini";
      console.log("[LLM] Gemini fallback succeeded");
    } catch (geminiErr) {
      console.error(
        `[LLM] Both providers failed. Claude: ${claudeErr.message}. Gemini: ${geminiErr.message}`
      );
      history.pop();
      stats.recordMessage(userId, null); // both providers failed
      throw new Error("Both Claude and Gemini failed to respond");
    }
  }

  history.push({ role: "assistant", text: reply });
  stats.recordMessage(userId, provider);
  return reply;
}

// Meta-prompt that rewrites a clinic admin's raw note into a clean,
// on-tone instruction the bot can follow, or rejects it if it's outside
// the bot's role. Returns { refined } or { rejected: <reason> }.
const REFINE_SYSTEM = `You help the Dentalux dental clinic's Instagram DM assistant stay on-brand and safe. A clinic staff member has written a behavioural note they want added to the assistant's system prompt. Refine it into a clean, professional instruction.

Constraints for a refined output:
- Match the assistant's existing tone: warm but elegant private-clinic concierge. Polished Georgian by default (the assistant also handles other languages).
- Stay inside the assistant's role: information, doctor recommendations, scheduling guidance. NEVER medical diagnosis, treatment instructions, dosage, or anything that should come from an in-person doctor consultation.
- Respect existing care boundaries: the bot never replaces a doctor.
- Be specific and actionable. Prefer a short, named-section format (e.g. a heading in CAPS followed by 1–3 sentences). Under 120 words.
- Output ONLY the refined instruction text, no preamble like "Here is the refined version:".

Reject (do NOT refine) and reply with exactly "REJECT: <one sentence in Georgian explaining why>" if the note:
- asks the bot to give medical advice, diagnoses, dosages, or treatment recommendations;
- asks the bot to lie, mislead, hide information from patients, or fabricate credentials;
- asks the bot to recommend or refuse specific doctors based on personal bias rather than the routing logic;
- asks the bot to collect, store, or leak personal medical data;
- asks the bot to override safety, emergency-routing, or care-boundary rules;
- is otherwise outside the bot's scope.

When in doubt about safety, reject.`;

async function refineInstruction(rawText) {
  if (!rawText || !rawText.trim()) throw new Error("Empty instruction");
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 600,
    system: REFINE_SYSTEM,
    messages: [{ role: "user", content: rawText.trim() }],
  });
  const block = response.content?.find((b) => b.type === "text");
  const out = (block && block.text ? block.text : "").trim();
  if (!out) throw new Error("Refiner returned empty response");
  if (/^REJECT:/i.test(out)) {
    return { rejected: out.replace(/^REJECT:\s*/i, "").trim() };
  }
  return { refined: out };
}

module.exports = { getResponse, refineInstruction };
