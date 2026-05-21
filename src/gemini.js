const { GoogleGenAI } = require("@google/genai");
const { buildSystemPrompt } = require("./knowledge-base");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const conversationHistory = new Map();

const MAX_HISTORY = 20;

async function getResponse(userId, userMessage) {
  if (!conversationHistory.has(userId)) {
    conversationHistory.set(userId, []);
  }

  const history = conversationHistory.get(userId);
  history.push({ role: "user", parts: [{ text: userMessage }] });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: history,
    config: {
      systemInstruction: buildSystemPrompt(),
      maxOutputTokens: 1024,
    },
  });

  const assistantMessage =
    response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  history.push({ role: "model", parts: [{ text: assistantMessage }] });

  return assistantMessage;
}

module.exports = { getResponse };
