const { GoogleGenAI } = require("@google/genai");
const Anthropic = require("@anthropic-ai/sdk");
const { buildSystemPrompt } = require("./knowledge-base");

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const conversationHistory = new Map();
const MAX_HISTORY = 20;

const GEMINI_MODEL = "gemini-3.5-flash";
const CLAUDE_MODEL = "claude-opus-4-7";
// Georgian tokenizes at ~6–12 tokens per character, so 1k is far too tight
// and replies were getting truncated mid-word.
const MAX_OUTPUT_TOKENS = 4096;

async function callGemini(history, systemPrompt) {
  const geminiHistory = history.map((turn) => ({
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

async function callClaude(history, systemPrompt) {
  const claudeHistory = history.map((turn) => ({
    role: turn.role,
    content: turn.text,
  }));

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: systemPrompt,
    messages: claudeHistory,
  });

  const text = response.content[0]?.text;
  if (!text) throw new Error("Claude returned empty response");
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
  let reply;

  try {
    reply = await callClaude(history, systemPrompt);
  } catch (claudeErr) {
    console.warn(
      `[LLM] Claude failed, falling back to Gemini: ${claudeErr.message}`
    );
    try {
      reply = await callGemini(history, systemPrompt);
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
