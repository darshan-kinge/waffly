# Client Configuration

Initialize a client using `new WhatsAppClient(options)`:

```typescript
import { WhatsAppClient } from "waffly";

const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN!, // Required: Bearer access token
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID, // Optional: Default sender ID
  apiVersion: "v26.0", // Optional: Default is "v26.0"
  timeout: 15000, // Optional: Request timeout in ms (default: 15000)
  fetch: globalThis.fetch, // Optional: Custom fetch implementation
});
```

---

## Options Reference

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `accessToken` | `string` | *(Required)* | Non-empty Meta System User or User Access Token. |
| `phoneNumberId` | `string` | `undefined` | Default sender Phone Number ID for message sends and media uploads. |
| `apiVersion` | `string` | `"v26.0"` | Meta Graph API version string. |
| `timeout` | `number` | `15000` | Network request timeout in milliseconds (must be positive & finite). |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch function (useful for proxies, testing, or mocking). |

---

## Exported Constants

Waffly exports several default constants for inspection or custom configurations:

```typescript
import {
  DEFAULT_BASE_URL,          // "https://graph.facebook.com"
  DEFAULT_GRAPH_API_VERSION, // "v26.0"
  DEFAULT_TIMEOUT_MS,        // 15000
} from "waffly";
```

---

## Multi-Sender & Per-Request Overrides

If your application manages multiple WhatsApp phone numbers within the same business account, you can override `phoneNumberId` on any individual send or upload call:

```typescript
await client.messages.sendText({
  to: "15551234567",
  text: "Sent from secondary sender",
  phoneNumberId: "SECONDARY_PHONE_NUMBER_ID",
});
```

---

## Request Cancellation (`AbortSignal`)

All network operations accept an optional standard Web `AbortSignal`:

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
