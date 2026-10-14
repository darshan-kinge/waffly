# Waffly Package Guide

Comprehensive guide and API reference for **Waffly** (`waffly`).

Waffly is a lightweight, zero-dependency TypeScript SDK for the **Meta WhatsApp Cloud API**. It provides typed message sending, media uploads, template catalog reads, and cryptographic webhook verification for Node.js 20+.

---

## Contents

1. [Installation & Setup](#1-installation--setup)
2. [Client Configuration](#2-client-configuration)
3. [Messages API](#3-messages-api)
4. [Template Parameters](#4-template-parameters)
5. [Media Management](#5-media-management)
6. [Template Catalog](#6-template-catalog)
7. [Webhooks](#7-webhooks)
8. [Error Handling](#8-error-handling)
9. [Operational Rules & Best Practices](#9-operational-rules--best-practices)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Installation & Setup

### Requirements
- **Node.js**: `20.0.0` or higher
- Dual builds: Native **ESM** (`import`) and **CommonJS** (`require`)
- TypeScript declaration files included (`.d.ts`, `.d.mts`)
- **Zero runtime dependencies**

### Install

```bash
npm install waffly
```

### Meta Credentials Checklist

Before using Waffly, set up a Meta Developer App with the WhatsApp product and collect the following credentials:

```dotenv
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_or_temporary_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
WHATSAPP_APP_SECRET=your_meta_app_secret
WHATSAPP_VERIFY_TOKEN=a_custom_token_you_choose
WHATSAPP_API_VERSION=v26.0
```

> [!NOTE]
> - **Phone Number ID** is the ID of your sender number (distinct from the actual phone digits and App ID).
> - **WABA ID** is your WhatsApp Business Account ID.
> - Message operations require `whatsapp_business_messaging` permission.
> - Template reads require `whatsapp_business_management` permission.

### Basic Usage

#### ESM (`import`)
```typescript
import { WhatsAppClient } from "waffly";

const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
});

const result = await client.messages.sendText({
  to: "15551234567",
  text: "Hello from Waffly!",
});

console.log("Accepted message ID:", result.messageId);
```

#### CommonJS (`require`)
```javascript
const { WhatsAppClient } = require("waffly");

const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
});
```

---

## 2. Client Configuration

Initialize a client using `new WhatsAppClient(options)`:

```typescript
const client = new WhatsAppClient({
  accessToken: "...",        // Required: Bearer access token
  phoneNumberId: "...",      // Optional: Default Phone Number ID for sends & uploads
  apiVersion: "v26.0",       // Optional: Default is "v26.0"
  timeout: 15000,            // Optional: Request timeout in ms (default: 15000)
  fetch: globalThis.fetch,   // Optional: Custom fetch implementation
});
```

### Options Reference

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `accessToken` | `string` | *(Required)* | Non-empty Meta System User or User Access Token. |
| `phoneNumberId` | `string` | `undefined` | Default sender Phone Number ID for message sends and media uploads. |
| `apiVersion` | `string` | `"v26.0"` | Meta Graph API version string. |
| `timeout` | `number` | `15000` | Network request timeout in milliseconds (must be positive & finite). |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch function (useful for proxies, testing, or mocking). |

### Exported Constants

```typescript
import {
  DEFAULT_BASE_URL,            // "https://graph.facebook.com"
  DEFAULT_GRAPH_API_VERSION,   // "v26.0"
  DEFAULT_TIMEOUT_MS,          // 15000
} from "waffly";
```

### Multi-Sender & Per-Request Overrides
If your application manages multiple WhatsApp phone numbers, you can override `phoneNumberId` on any send or upload:

```typescript
await client.messages.sendText({
  to: "15551234567",
  text: "Sent from secondary sender",
  phoneNumberId: "SECONDARY_PHONE_NUMBER_ID",
});
```

### Request Cancellation (`AbortSignal`)
All network operations accept an optional `signal`:

```typescript
const controller = new AbortController();

const sendPromise = client.messages.sendText({
  to: "15551234567",
  text: "Expiring message",
  signal: controller.signal,
});

// Cancel before or during request
controller.abort();
```

---

## 3. Messages API

The `client.messages` module provides methods for all supported WhatsApp message types.

### Response Structure

All message send methods resolve to a `SendMessageResult`:

```typescript
interface SendMessageResult {
  messageId: string;           // Meta WhatsApp message ID (e.g., "wamid.HBgM...")
  recipientId?: string;        // Normalized recipient WhatsApp ID
  raw: SendMessageResponse;    // Original JSON response from Meta
}
```

> [!IMPORTANT]
> A successful response means **Meta accepted the request for processing**. It does not guarantee delivery. Save `messageId` to correlate delivery and read receipts from incoming webhooks.

### Method Overview

| Method | Required Fields | Optional Fields |
| :--- | :--- | :--- |
| `sendText(input)` | `to`, `text` | `previewUrl`, `replyTo`, `phoneNumberId`, `signal` |
| `sendTemplate(input)` | `to`, `name`, `languageCode` | `components`, `phoneNumberId`, `signal` |
| `sendImage(input)` | `to`, `id` or `link` | `caption`, `replyTo`, `phoneNumberId`, `signal` |
| `sendVideo(input)` | `to`, `id` or `link` | `caption`, `replyTo`, `phoneNumberId`, `signal` |
| `sendAudio(input)` | `to`, `id` or `link` | `replyTo`, `phoneNumberId`, `signal` |
| `sendDocument(input)` | `to`, `id` or `link` | `caption`, `filename`, `replyTo`, `phoneNumberId`, `signal` |
| `sendLocation(input)` | `to`, `latitude`, `longitude` | `name`, `address`, `replyTo`, `phoneNumberId`, `signal` |
| `sendContacts(input)` | `to`, `contacts` | `replyTo`, `phoneNumberId`, `signal` |

---

### Examples

#### 1. Text Message & Replies
```typescript
// Simple text
await client.messages.sendText({
  to: "15551234567",
  text: "Hello! Check out https://example.com",
  previewUrl: true,
});

// Contextual reply to an incoming message
await client.messages.sendText({
  to: "15551234567",
  text: "Thanks for reaching out! We are on it.",
  replyTo: "wamid.HBgLM...", // Inbound message ID
});
```

#### 2. Media Messages (Images, Videos, Audio, Documents)
Media can be specified using either an **uploaded Meta Media ID** (`id`) or an **externally accessible HTTPS URL** (`link`).

```typescript
// Send image via URL
await client.messages.sendImage({
  to: "15551234567",
  link: "https://example.com/banner.png",
  caption: "Welcome to our service!",
});

// Send document via uploaded ID
await client.messages.sendDocument({
  to: "15551234567",
  id: "UPLOADED_MEDIA_ID",
  filename: "statement_march.pdf",
  caption: "Your March account statement",
});

// Send audio
await client.messages.sendAudio({
  to: "15551234567",
  id: "AUDIO_MEDIA_ID",
});
```

#### 3. Location Message
```typescript
await client.messages.sendLocation({
  to: "15551234567",
  latitude: 37.7749,
  longitude: -122.4194,
  name: "HQ Office",
  address: "123 Market Street, San Francisco, CA",
});
```

#### 4. Contact Cards
```typescript
await client.messages.sendContacts({
  to: "15551234567",
  contacts: [
    {
      name: {
        formattedName: "Alice Smith",
        firstName: "Alice",
        lastName: "Smith",
      },
      phones: [
        { phone: "+15550001111", type: "CELL" },
      ],
      emails: [
        { email: "alice@example.com", type: "WORK" },
      ],
      organization: {
        company: "Acme Corp",
        department: "Customer Care",
        title: "Support Lead",
      },
    },
  ],
});
```

### Local Validation Rules
Waffly validates parameters locally before sending network requests:
- **`text`**: Must be non-empty and ≤ 4,096 characters.
- **`caption`**: Up to 1,024 characters.
- **`latitude` / `longitude`**: Must be finite numbers in `[-90, 90]` and `[-180, 180]`.
- **`contacts`**: 1 to 257 cards, each requiring `name.formattedName`. Birthdays must match `YYYY-MM-DD`.

---

## 4. Template Parameters

WhatsApp templates allow businesses to initiate outbound conversations outside the 24-hour customer service window.

### Structure

Templates contain dynamic parameters across `header`, `body`, and `button` components:

```typescript
await client.messages.sendTemplate({
  to: "15551234567",
  name: "shipping_update",
  languageCode: "en_US",
  components: [
    // Header media
    {
      type: "header",
      parameters: [
        {
          type: "document",
          media: { id: "MEDIA_ID", filename: "invoice.pdf" },
        },
      ],
    },
    // Body parameters
    {
      type: "body",
      parameters: [
        { type: "text", text: "Alex" },
        { type: "text", text: "TRK-98421" },
        {
          type: "currency",
          currency: { code: "USD", amount1000: 24990, fallbackValue: "$24.99" },
        },
        {
          type: "date_time",
          dateTime: { fallbackValue: "April 15, 2026" },
        },
      ],
    },
    // Interactive button
    {
      type: "button",
      subType: "url",
      index: 0,
      parameters: [{ type: "text", text: "TRK-98421" }],
    },
  ],
});
```

### Parameter Types

| Type | Structure | Description |
| :--- | :--- | :--- |
| `text` | `{ type: "text", text: string, parameterName?: string }` | Text placeholder replacement. |
| `currency` | `{ type: "currency", currency: { code, amount1000, fallbackValue } }` | Currency value (`amount1000` is integer amount × 1000). |
| `date_time` | `{ type: "date_time", dateTime: { fallbackValue: string } }` | Formatted date/time. |
| `image` / `video` / `document` | `{ type: "image", media: { id?: string, link?: string } }` | Header media replacement. |
| `payload` | `{ type: "payload", payload: string }` | Quick-reply button postback payload. |

---

## 5. Media Management

The `client.media` module manages file uploads, metadata lookups, and deletions.

### Methods

```typescript
// 1. Upload a file
const { id } = await client.media.upload({
  file: new Blob([buffer], { type: "image/jpeg" }),
  mimeType: "image/jpeg",
  filename: "photo.jpg",
});

// 2. Retrieve metadata (including temporary download URL)
const metadata = await client.media.retrieve(id);
console.log(metadata.url, metadata.file_size, metadata.mime_type);

// 3. Delete media
const { success } = await client.media.delete(id);
```

### Supported Media Types and Limits

| Category | MIME Types | Maximum Size |
| :--- | :--- | :--- |
| **Images** | `image/jpeg`, `image/png` | 5 MB |
| **Audio** | `audio/aac`, `audio/amr`, `audio/mpeg`, `audio/mp4`, `audio/ogg` | 16 MB |
| **Video** | `video/mp4`, `video/3gpp` | 16 MB |
| **Documents** | `application/pdf`, `text/plain`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx` | 100 MB |

> [!TIP]
> **Media Format Advice:**
> - Video files should use H.264 video encoding with AAC audio (or no audio track).
> - OGG audio should use mono Opus.
> - For large documents near 100 MB, leave headroom for multipart boundary overhead.

### Downloading Media
The URL returned by `client.media.retrieve(mediaId)` requires authentication with your Meta Bearer token:

```typescript
const { url } = await client.media.retrieve(mediaId);

const response = await fetch(url, {
  headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
});

const arrayBuffer = await response.arrayBuffer();
```

---

## 6. Template Catalog

Read approved templates configured in your WhatsApp Business Account:

### List Templates

```typescript
const page = await client.templates.list({
  wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID!,
  status: "APPROVED",
  limit: 10,
});

for (const tpl of page.data) {
  console.log(`${tpl.name} [${tpl.language}] - Status: ${tpl.status}`);
}

// Fetch next page if available
if (page.paging?.cursors?.after) {
  const nextPage = await client.templates.list({
    wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID!,
    status: "APPROVED",
    after: page.paging.cursors.after,
  });
}
```

### Get Single Template
```typescript
const template = await client.templates.get("TEMPLATE_ID");
console.log(template.name, template.components);
```

---

## 7. Webhooks

Waffly includes utilities to verify subscription challenges, validate HMAC signatures, and parse incoming payloads into clean, strongly-typed events.

### 1. Verification Challenge (GET)

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

### 2. Signature Verification (POST)

Meta signs every POST request using HMAC-SHA256 with your **App Secret** in the `x-hub-signature-256` header.

> [!WARNING]
> Always verify the signature using the **exact raw request bytes** (`Buffer` or raw `string`) before running `JSON.parse`.

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

### 3. Normalized Event Types

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

#### Inbound Message Types (`message.received`)

- **`text`**: Contains `event.text`
- **`image`, `video`, `audio`, `document`**: Contains `event.mediaId`, `caption?`, `filename?`, `mimeType?`
- **`location`**: Contains `event.latitude`, `event.longitude`, `name?`, `address?`
- **`contacts`**: Contains `event.contacts`
- **`interactive` / `button`**: Contains `event.interactionType`, `event.selectionId`, `event.title`
- **Unknown types**: Expose `unsupported: true` and the original `raw` payload.

---

## 8. Error Handling

Waffly organizes errors into an intuitive hierarchy:

```
WhatsAppError (Base)
├── WhatsAppValidationError    (Invalid parameters, MIME type, payload)
└── WhatsAppApiError           (HTTP error from Meta Graph API)
    ├── WhatsAppAuthenticationError (Graph code 190 / Invalid token)
    └── WhatsAppRateLimitError      (HTTP 429 or rate limit code)
```

### Catching and Inspecting Errors

```typescript
import {
  WhatsAppError,
  WhatsAppApiError,
  WhatsAppRateLimitError,
  WhatsAppAuthenticationError,
  WhatsAppValidationError,
} from "waffly";

try {
  await client.messages.sendText({ to: "15551234567", text: "Hello" });
} catch (error) {
  if (error instanceof WhatsAppValidationError) {
    console.error("Local parameter validation failed:", error.message);
  } else if (error instanceof WhatsAppRateLimitError) {
    console.warn("Rate limited by Meta. Retry with exponential backoff.");
  } else if (error instanceof WhatsAppAuthenticationError) {
    console.error("Authentication expired or invalid access token.");
  } else if (error instanceof WhatsAppApiError) {
    console.error(`Meta API Error ${error.statusCode} [${error.code}]:`, error.message);
    console.error("FB Trace ID:", error.fbtraceId);
  } else if (error instanceof WhatsAppError) {
    console.error(`WhatsApp error (${error.category}):`, error.message);
  }
}
```

### Error Categories & Retryability

Every `WhatsAppError` includes:
- **`error.category`**: One of `validation`, `authentication`, `authorization`, `recipient`, `template`, `media`, `rate_limited`, `temporary_provider`, `permanent_provider`, `transport`, `cancelled`, or `unknown`.
- **`error.retryable`**: Boolean flag indicating whether the operation is safe to retry.

> [!IMPORTANT]
> **No Automatic Retries:** Waffly does **not** retry message operations automatically. Repeating a timed-out send can produce duplicate messages on the user's phone. Retry policies should be handled carefully at your application layer.

---

## 9. Operational Rules & Best Practices

### 1. 24-Hour Customer Service Window
- When a user messages your business, a **24-hour service window** opens. Within this window, you can send free-form text, media, location, and contact messages.
- Outside the 24-hour window, you **must use approved templates** (`sendTemplate`) to initiate contact. Attempting to send non-template messages outside the window will fail with a recipient error.

### 2. Delivery Receipts and Statuses
- When `sendText()` returns, Meta has accepted the request. It does **not** mean the message has reached the device.
- Subscribe to the `messages` webhook field to track:
  - `message.sent` → Accepted by network
  - `message.delivered` → Delivered to phone
  - `message.read` → User opened message
  - `message.failed` → Delivery failed (e.g. invalid phone number)

### 3. Webhook Deduplication
- Meta webhooks may occasionally deliver duplicate events or deliver events slightly out of order.
- Always store the `messageId` and timestamp to ensure idempotent processing in your database.

---

## 10. Troubleshooting

| Issue | Likely Cause | Solution |
| :--- | :--- | :--- |
| **`Phone Number ID must be provided`** | Missing Phone Number ID | Pass `phoneNumberId` in client options or directly in the method call. |
| **Error `190` (Authentication)** | Token expired or invalid | Generate a fresh token or use a Permanent System User Token in Meta Business Manager. |
| **Template not found / mismatch** | Language or name mismatch | Verify the exact template name, language code (e.g. `en_US` vs `en`), and status (`APPROVED`). |
| **Non-template message rejected** | Service window closed | Send an approved template to re-open the 24-hour customer service window. |
| **Webhook verification returns 403** | Verify token mismatch | Ensure `WHATSAPP_VERIFY_TOKEN` in your environment matches the token entered in Meta's Dashboard. |
| **Webhook POST returns 401** | Signature mismatch | Ensure you are passing the exact raw request bytes before JSON parsing to `verifyWebhookSignature`. |
| **Media code `131053`** | Incompatible codec | Re-encode videos to H.264 / AAC and audio to mono Opus or AAC. |
| **Large file upload fails** | Timeout or limit exceeded | Increase client `timeout` (e.g. `120000` ms) and keep document uploads under 100 MB. |

---

## License

[MIT](../LICENSE)
