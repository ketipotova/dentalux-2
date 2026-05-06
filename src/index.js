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
    const events = entry.messaging || entry.changes || [];
    for (const event of events) {
      if (event.message && !event.message.is_echo) {
        try {
          await handleMessage(
            event.sender.id,
            event.message.text,
            ACCESS_TOKEN
          );
        } catch (err) {
          console.error("Error handling message:", err);
        }
      }
    }
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Dentalux bot running on port ${PORT}`);
});
