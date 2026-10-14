# Rules & Best Practices

Operational rules and best practices when working with the WhatsApp Cloud API and Waffly.

---

## 1. 24-Hour Customer Service Window

- When a user messages your business, a **24-hour service window** opens. Within this window, you can send free-form text, media, location, and contact messages.
- Outside the 24-hour window, you **must use approved templates** (`sendTemplate`) to initiate contact. Attempting to send non-template messages outside the window will fail with a recipient error.

---

## 2. Delivery Receipts and Statuses

- When `sendText()` returns, Meta has accepted the request. It does **not** mean the message has reached the device.
- Subscribe to the `messages` webhook field to track:
  - `message.sent` → Accepted by WhatsApp network
  - `message.delivered` → Delivered to recipient phone
  - `message.read` → Recipient opened message
  - `message.failed` → Delivery failed (e.g. invalid phone number)

---

## 3. Webhook Deduplication & Ordering

- Meta webhooks may occasionally deliver duplicate events or deliver events slightly out of order.
- Always store the `messageId` and timestamp to ensure idempotent processing in your database.
- Do not blindly assume that the latest callback received represents the newest business state without checking timestamps.
