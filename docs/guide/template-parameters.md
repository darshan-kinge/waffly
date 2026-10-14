# Template Parameters

WhatsApp templates allow businesses to initiate outbound conversations outside the 24-hour customer service window.

---

## Template Structure

Templates contain dynamic parameters across `header`, `body`, and `button` components:

```typescript
await client.messages.sendTemplate({
  to: "15551234567",
  name: "shipping_update",
  languageCode: "en_US",
  components: [
    // Header media component
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
    // Interactive button component
    {
      type: "button",
      subType: "url",
      index: 0,
      parameters: [{ type: "text", text: "TRK-98421" }],
    },
  ],
});
```

---

## Parameter Types

| Type | Structure | Description |
| :--- | :--- | :--- |
| `text` | `{ type: "text", text: string, parameterName?: string }` | Text placeholder replacement. |
| `currency` | `{ type: "currency", currency: { code, amount1000, fallbackValue } }` | Currency value (`amount1000` is integer amount × 1000). |
| `date_time` | `{ type: "date_time", dateTime: { fallbackValue: string } }` | Formatted date/time. |
| `image` / `video` / `document` | `{ type: "image", media: { id?: string, link?: string } }` | Header media replacement. |
| `payload` | `{ type: "payload", payload: string }` | Quick-reply button postback payload. |

> [!TIP]
> The template name, language code, component layout, and parameter count must match the exact approved template registered in your Meta Business Account.
