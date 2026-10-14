# Sending Messages

The `client.messages` module provides methods for all supported WhatsApp message types.

---

## Response Structure

All message send methods resolve to a `SendMessageResult`:

```typescript
interface SendMessageResult {
  messageId: string; // Meta WhatsApp message ID (e.g., "wamid.HBgM...")
  recipientId?: string; // Normalized recipient WhatsApp ID
  raw: SendMessageResponse; // Original JSON response from Meta
}
```

> [!IMPORTANT]
> A successful response means **Meta accepted the request for processing**. It does not guarantee delivery. Save `messageId` to correlate delivery and read receipts from incoming webhooks.

---

## Method Overview

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

## Examples

### 1. Text Messages & Replies

```typescript
// Simple text with link preview enabled
await client.messages.sendText({
  to: "15551234567",
  text: "Hello! Check out our docs at https://github.com/darshan-kinge/waffly",
  previewUrl: true,
});

// Contextual reply to an incoming message
await client.messages.sendText({
  to: "15551234567",
  text: "Thanks for reaching out! We are on it.",
  replyTo: "wamid.HBgLM...", // Inbound message ID
});
```

### 2. Media Messages (Images, Videos, Audio, Documents)

Media can be sent using either an **uploaded Meta Media ID** (`id`) or an **externally accessible HTTPS URL** (`link`):

```typescript
// Send image via URL
await client.messages.sendImage({
  to: "15551234567",
  link: "https://example.com/banner.png",
  caption: "Welcome to our service!",
});

// Send document via uploaded ID with custom filename
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

### 3. Location Message

```typescript
await client.messages.sendLocation({
  to: "15551234567",
  latitude: 37.7749,
  longitude: -122.4194,
  name: "HQ Office",
  address: "123 Market Street, San Francisco, CA",
});
```

### 4. Contact Cards

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

---

## Local Validation Rules

Waffly validates parameters locally before dispatching network requests to fail fast on invalid inputs:
- **`text`**: Must be non-empty and ≤ 4,096 characters.
- **`caption`**: Up to 1,024 characters.
- **`latitude` / `longitude`**: Must be finite numbers within `[-90, 90]` and `[-180, 180]`.
- **`contacts`**: 1 to 257 cards, each requiring `name.formattedName`. Birthdays must match `YYYY-MM-DD`.
