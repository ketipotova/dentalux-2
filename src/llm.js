const { GoogleGenAI } = require("@google/genai");
const Anthropic = require("@anthropic-ai/sdk");
const { buildSystemPrompt, buildLiveContext } = require("./knowledge-base");

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const conversationHistory = new Map();
const MAX_HISTORY = 20;

const GEMINI_MODEL = "gemini-3.5-flash";
const CLAUDE_MODEL = "claude-opus-4-8";
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

  try {
    reply = await callClaude(history, systemPrompt, liveContext);
  } catch (claudeErr) {
    console.warn(
      `[LLM] Claude failed (${claudeErr.name} status=${claudeErr.status}): ${claudeErr.message}`
    );
    if (claudeErr.error) {
      console.warn(`[LLM] Claude error body: ${JSON.stringify(claudeErr.error)}`);
    }
    try {
      reply = await callGemini(history, systemPrompt, liveContext);
      console.log("[LLM] Gemini fallback succeeded");
    } catch (geminiErr) {
      console.error(
        `[LLM] Both providers failed. Claude: ${claudeErr.message}. Gemini: ${geminiErr.message}`
      );
      history.pop();
      throw new Error("Both Claude and Gemini failed to respond");
    }
  }

  history.push({ role: "assistant", text: reply });
  return reply;
}

module.exports = { getResponse };
