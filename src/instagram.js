const { getResponse } = require("./claude");

async function sendInstagramReply(recipientId, messageText, accessToken) {
  const url = `https://graph.instagram.com/v21.0/me/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: messageText },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("Instagram API error:", error);
    throw new Error(`Instagram send failed: ${res.status}`);
  }

  return res.json();
}

async function handleMessage(senderId, messageText, accessToken) {
  console.log(`Message from ${senderId}: ${messageText}`);

  const reply = await getResponse(senderId, messageText);

  // Instagram has a 1000 char limit per message — split if needed
  const chunks = splitMessage(reply, 1000);
  for (const chunk of chunks) {
    await sendInstagramReply(senderId, chunk, accessToken);
  }
}

function splitMessage(text, maxLength) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf("\n", maxLength);
    if (splitAt === -1 || splitAt < maxLength / 2) {
      splitAt = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitAt === -1) splitAt = maxLength;

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  return chunks;
}

module.exports = { handleMessage };
