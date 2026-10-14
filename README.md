# Waffly

**WhatsApp integrations, clearly typed.**

[![npm version](https://img.shields.io/badge/npm-v0.1.0-blue.svg)](https://www.npmjs.com/package/waffly)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

Waffly is a typed, lightweight SDK for the **Meta WhatsApp Cloud API**. Send messages, manage media, inspect templates, and verify incoming webhooks with a clean, developer-friendly TypeScript API.

> *Waffly is an independent open-source library and is not affiliated with or endorsed by Meta.*

---

## Why Waffly?

- ⚡ **Zero Runtime Dependencies**: Built on native `fetch` and Node's built-in crypto. Dual ESM and CommonJS builds.
- 🛡️ **Fully Typed**: Strong typing for messages, media, templates, webhooks, API responses, and errors.
- 💬 **Complete Message Support**: Text, approved templates, media (image, audio, video, document), location pins, and contact cards.
- 🔐 **First-Class Webhook Helpers**: Timing-safe GET challenge verification, HMAC-SHA256 signature checks, and normalized event streams.
- 🧭 **Safe & Conservative Writes**: Zero automatic retries on message sends—preventing duplicate messages to your users.
- 🎯 **Predictable Error Taxonomy**: Distinct error classes (`WhatsAppValidationError`, `WhatsAppApiError`, `WhatsAppRateLimitError`, `WhatsAppAuthenticationError`) with category and retry hints.

---

## Installation

```bash
npm install waffly
```

*Requires Node.js 20 or newer.*

---

## Quickstart

### 1. Set Your Credentials

Create a Meta developer app with the WhatsApp product and collect your credentials:

```env
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_or_temporary_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
WHATSAPP_APP_SECRET=your_meta_app_secret
WHATSAPP_VERIFY_TOKEN=a_secret_token_you_choose
WHATSAPP_API_VERSION=v26.0
```

### 2. Initialize the Client

```typescript
import { WhatsAppClient } from "waffly";

const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
  apiVersion: "v26.0", // default
});
```

### 3. Send a Message

#### Send Text
```typescript
const result = await client.messages.sendText({
  to: "15551234567",
  text: "Hello from Waffly!",
});

console.log("Message accepted with ID:", result.messageId);
```

#### Send an Approved Template
```typescript
await client.messages.sendTemplate({
  to: "15551234567",
  name: "hello_world",
  languageCode: "en_US",
});
```

---

## Core Features

### 1. Sending Messages

All send methods return `{ messageId, recipientId?, raw }`.

```typescript
// 1. Send an image by URL or uploaded ID
await client.messages.sendImage({
  to: "15551234567",
  link: "https://example.com/photo.jpg",
  caption: "Look at this!",
});

// 2. Send a document with a custom filename
await client.messages.sendDocument({
  to: "15551234567",
  id: "UPLOADED_MEDIA_ID",
  filename: "invoice.pdf",
  caption: "Your monthly statement",
});

// 3. Send location coordinates
await client.messages.sendLocation({
  to: "15551234567",
  latitude: 37.7749,
  longitude: -122.4194,
  name: "Meeting Spot",
  address: "Market St, San Francisco, CA",
});

// 4. Send contact cards
await client.messages.sendContacts({
  to: "15551234567",
  contacts: [
    {
      name: { formattedName: "Jane Doe", firstName: "Jane" },
      phones: [{ phone: "+15559876543", type: "WORK" }],
      emails: [{ email: "jane@example.com", type: "WORK" }],
    },
  ],
});
```

### 2. Parameterized Templates

Pass components (header, body, buttons) with text, currency, date, or media parameters:

```typescript
await client.messages.sendTemplate({
  to: "15551234567",
  name: "order_confirmation",
  languageCode: "en_US",
  components: [
    {
      type: "body",
      parameters: [
        { type: "text", text: "ORDER-9921" },
        {
          type: "currency",
          currency: { code: "USD", amount1000: 49990, fallbackValue: "$49.99" },
        },
      ],
    },
    {
      type: "button",
      subType: "url",
      index: 0,
      parameters: [{ type: "text", text: "ORDER-9921" }],
    },
  ],
});
```

### 3. Media Upload & Management

Upload binary media as a `Blob`, fetch download URLs, or delete assets when finished:

```typescript
import { readFile } from "node:fs/promises";

// Upload
const fileBuffer = await readFile("./receipt.pdf");
const { id } = await client.media.upload({
  file: new Blob([fileBuffer], { type: "application/pdf" }),
  mimeType: "application/pdf",
  filename: "receipt.pdf",
});

// Retrieve Meta download URL
const metaMedia = await client.media.retrieve(id);
console.log("Download URL:", metaMedia.url);

// Delete asset from Meta servers
await client.media.delete(id);
```

| Type | Supported Formats | Max File Size |
| :--- | :--- | :--- |
| **Images** | `image/jpeg`, `image/png` | 5 MB |
| **Audio** | `audio/aac`, `audio/amr`, `audio/mpeg`, `audio/mp4`, `audio/ogg` | 16 MB |
| **Video** | `video/mp4`, `video/3gpp` | 16 MB |
| **Documents** | `application/pdf`, `.docx`, `.xlsx`, `.pptx`, `text/plain` | 100 MB |

### 4. Template Catalog

Read approved templates directly from your WhatsApp Business Account (WABA):

```typescript
// List approved templates
const page = await client.templates.list({
  wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID!,
  status: "APPROVED",
  limit: 20,
});

for (const template of page.data) {
  console.log(template.name, template.language, template.status);
}

// Fetch a single template
const details = await client.templates.get("TEMPLATE_ID");
```

### 5. Webhooks

Waffly provides helpers to register, verify, and parse incoming Meta webhooks safely.

#### A. Handle Webhook Verification (GET)
```typescript
import { verifyWebhookChallenge } from "waffly";

const challenge = verifyWebhookChallenge({
  mode: req.query["hub.mode"],
  verifyToken: req.query["hub.verify_token"],
  challenge: req.query["hub.challenge"],
  expectedVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN!,
});

if (challenge) {
  res.status(200).send(challenge);
} else {
  res.status(403).send("Forbidden");
}
```

#### B. Handle Incoming Events (POST)
```typescript
import { verifyWebhookSignature, parseWebhookEvents } from "waffly";

// Note: Pass rawBody (Buffer or string) BEFORE JSON.parse.
// In Express, use: app.use("/webhook", express.raw({ type: "application/json" }))
const isValid = verifyWebhookSignature({
  rawBody,
  signature: req.headers["x-hub-signature-256"] as string,
  appSecret: process.env.WHATSAPP_APP_SECRET!,
});

if (!isValid) {
  return res.status(401).send("Invalid signature");
}

const events = parseWebhookEvents(rawBody);

for (const event of events) {
  switch (event.event) {
    case "message.received":
      if (event.messageType === "text") {
        console.log(`From ${event.from}: ${event.text}`);
      }
      break;

    case "message.delivered":
    case "message.read":
      console.log(`Message ${event.messageId} status: ${event.event}`);
      break;

    case "message.failed":
      console.error(`Message ${event.messageId} failed:`, event.errors);
      break;
  }
}

res.status(200).send("OK");
```

---

## Error Handling

Waffly throws typed errors with classification categories and `retryable` hints:

```typescript
import {
  WhatsAppError,
  WhatsAppApiError,
  WhatsAppRateLimitError,
  WhatsAppAuthenticationError,
} from "waffly";

try {
  await client.messages.sendText({ to: "15551234567", text: "Hello" });
} catch (error) {
  if (error instanceof WhatsAppRateLimitError) {
    console.warn("Hit rate limit. Retry after backoff.");
  } else if (error instanceof WhatsAppAuthenticationError) {
    console.error("Invalid or expired Meta access token.");
  } else if (error instanceof WhatsAppApiError) {
    console.error(`API Error [${error.code}]: ${error.message} (Trace: ${error.fbtraceId})`);
  } else if (error instanceof WhatsAppError) {
    console.error(`Client Error (${error.category}): ${error.message}`);
  }
}
```

---

## In-Depth Documentation

For the complete API reference, advanced parameters, webhook event catalog, and operational guidelines, see the **[Package Guide](docs/PACKAGE_GUIDE.md)**.

---

## Development & Testing

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Run test suite
npm test

# Build dual ESM / CJS output
npm run build
```

---

## License

[MIT](LICENSE)
