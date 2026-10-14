# Error Handling

Waffly organizes errors into an intuitive, typed hierarchy:

```
WhatsAppError (Base)
├── WhatsAppValidationError    (Invalid parameters, MIME type, payload)
└── WhatsAppApiError           (HTTP error from Meta Graph API)
    ├── WhatsAppAuthenticationError (Graph code 190 / Invalid token)
    └── WhatsAppRateLimitError      (HTTP 429 or rate limit code)
```

---

## Catching and Inspecting Errors

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

---

## Error Categories & Retryability

Every `WhatsAppError` includes:
- **`error.category`**: One of `validation`, `authentication`, `authorization`, `recipient`, `template`, `media`, `rate_limited`, `temporary_provider`, `permanent_provider`, `transport`, `cancelled`, or `unknown`.
- **`error.retryable`**: Boolean flag indicating whether the operation is safe to retry.

> [!IMPORTANT]
> **No Automatic Retries:** Waffly does **not** retry message operations automatically. Repeating a timed-out send can produce duplicate messages on the user's phone. Retry policies should be handled carefully at your application layer.
