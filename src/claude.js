const Anthropic = require("@anthropic-ai/sdk");
const { buildSystemPrompt } = require("./knowledge-base");

const client = new Anthropic();

const conversationHistory = new Map();

const MAX_HISTORY = 20;

async function getResponse(userId, userMessage) {
  if (!conversationHistory.has(userId)) {
    conversationHistory.set(userId, []);
  }

  const history = conversationHistory.get(userId);
  history.push({ role: "user", content: userMessage });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    system: buildSystemPrompt(),
    messages: history,
  });

  const assistantMessage = response.content[0].text;
  history.push({ role: "assistant", content: assistantMessage });

  return assistantMessage;
}

module.exports = { getResponse };
