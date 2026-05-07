const express = require("express");
const { handleMessage } = require("./instagram");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

// Webhook verification (GET)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Webhook events (POST)
app.post("/webhook", async (req, res) => {
  const body = req.body;

  console.log("📥 INCOMING WEBHOOK:", JSON.stringify(body, null, 2));

  res.sendStatus(200);

  if (body.object !== "instagram" && body.object !== "page") {
    console.log(`Ignored object type: ${body.object}`);
    return;
  }

  for (const entry of body.entry || []) {
    // Old Messenger-style format: entry.messaging[]
    for (const event of entry.messaging || []) {
      if (event.message && !event.message.is_echo && event.message.text) {
        try {
          console.log(`💬 Messaging event from ${event.sender.id}: ${event.message.text}`);
          await handleMessage(event.sender.id, event.message.text, ACCESS_TOKEN);
        } catch (err) {
          console.error("Error handling messaging event:", err);
        }
      }
    }

    // New IG-login format: entry.changes[].value
    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;
      const event = change.value;
      if (!event) continue;
      if (event.message && !event.message.is_echo && event.message.text) {
        try {
          console.log(`💬 IG message from ${event.sender?.id}: ${event.message.text}`);
          await handleMessage(event.sender.id, event.message.text, ACCESS_TOKEN);
        } catch (err) {
          console.error("Error handling IG change event:", err);
        }
      }
    }
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Dentalux bot running on port ${PORT}`);
});
