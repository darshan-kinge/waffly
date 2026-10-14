# Webhook Verification & Parsing

Waffly includes utilities to verify subscription challenges, validate HMAC signatures, and parse incoming payloads into clean, strongly-typed events.

---

## 1. Verification Challenge (GET)

When configuring your Webhook URL in the Meta Dashboard, Meta sends a GET request to verify your endpoint:

```typescript
import { verifyWebhookChallenge } from "waffly";

// Express / Node HTTP GET handler:
app.get("/webhook", (req, res) => {
  const challenge = verifyWebhookChallenge({
    mode: req.query["hub.mode"] as string,
    verifyToken: req.query["hub.verify_token"] as string,
    challenge: req.query["hub.challenge"] as string,
    expectedVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN!,
  });

  if (challenge) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send("Forbidden");
  }
});
```

---

## 2. Signature Verification (POST)

Meta signs every POST request using HMAC-SHA256 with your **App Secret** in the `x-hub-signature-256` header.

> [!WARNING]
> Always verify the signature using the **exact raw request bytes** (`Buffer` or raw `string`) before running `JSON.parse`.
>
> If you are using Express, mount `express.raw({ type: "application/json" })` on your webhook endpoint so `req.body` remains an untouched `Buffer`.

```typescript
import { verifyWebhookSignature, parseWebhookEvents } from "waffly";

app.post("/webhook", (req, res) => {
  const rawBody = req.body; // Raw Buffer or string
  const signature = req.headers["x-hub-signature-256"] as string;

  const valid = verifyWebhookSignature({
    rawBody,
    signature,
    appSecret: process.env.WHATSAPP_APP_SECRET!,
  });

  if (!valid) {
    return res.status(401).send("Invalid signature");
  }

  // Parse normalized events
  const events = parseWebhookEvents(rawBody);

  for (const event of events) {
    handleEvent(event);
  }

  res.status(200).send("OK");
});
```

---

## 3. Normalized Event Types

`parseWebhookEvents()` converts Meta's nested envelope into flat, typed event objects:

| Event Name | Fields | Description |
| :--- | :--- | :--- |
| `message.received` | `messageId`, `from`, `timestamp`, `messageType`, content... | Inbound message from a user. |
| `message.sent` | `messageId`, `recipientId`, `status`, `timestamp` | Message successfully sent by Meta. |
| `message.delivered` | `messageId`, `recipientId`, `status`, `timestamp` | Message delivered to recipient device. |
| `message.read` | `messageId`, `recipientId`, `status`, `timestamp` | Message read by recipient. |
| `message.failed` | `messageId`, `recipientId`, `status`, `errors` | Message delivery failed. |
| `webhook.error` | `errors`, `messageId?`, `phoneNumberId?` | Inbound payload or account error. |
| `template.*` | `templateId`, `templateName`, `status`, `category`... | Status, quality, component, or category update for a template. |

### Inbound Message Types (`message.received`)

- **`text`**: Contains `event.text`
- **`image`, `video`, `audio`, `document`**: Contains `event.mediaId`, `caption?`, `filename?`, `mimeType?`
- **`location`**: Contains `event.latitude`, `event.longitude`, `name?`, `address?`
- **`contacts`**: Contains `event.contacts`
- **`interactive` / `button`**: Contains `event.interactionType`, `event.selectionId`, `event.title`
- **Unknown types**: Expose `unsupported: true` and the original `raw` payload.
