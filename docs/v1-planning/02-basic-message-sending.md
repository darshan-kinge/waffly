# Feature: Basic Message Sending

## 1. Purpose

Offer typed methods for the seven common Cloud API message types without requiring callers to construct Meta JSON.

## 2. Scope

Text, image, document, video, audio, location, and contacts; reply context where documented; media ID or public URL forms.

## 3. Non-goals

Interactive messages, reactions, stickers, edits, groups, calls, commerce, arbitrary Graph payloads, persistence, queues, or delivery tracking.

## 4. Official Documentation Research

All sends use `POST /{VERSION}/{PHONE_NUMBER_ID}/messages` with `whatsapp_business_messaging`. Limits and formats are in [00-meta-research.md](00-meta-research.md). Meta returns provider message IDs; delivery status arrives by webhook.

`UNKNOWN / REQUIRES VERIFICATION`: leading-plus recipient formatting on the pinned version.

## 5. Requirements

1. One method per included type plus an optional typed discriminated `send` method.
2. Validate required fields and documented length/format/range limits.
3. Require exactly one media ID or URL where applicable.
4. Map to the smallest Meta payload.
5. Return Meta's message ID and typed contact data when present.
6. Never report synchronous acceptance as delivery.
7. Never automatically retry an ambiguous send.

## 6. API Design

```text
messages.sendText({ to, text, previewUrl?, phoneNumberId? })
messages.sendImage|sendDocument|sendVideo|sendAudio(...)
messages.sendLocation(...)
messages.sendContacts(...)
```

## 7. Data Model

Public request types per message kind and a common `SendMessageResult`. No database or internal message identifier.

## 8. Security

Redact token, recipient, message body, captions, contact data, and media URL from errors/hooks by default. SDK does not prefetch caller media URLs.

## 9. Failure Scenarios

Local invalid input throws/returns a validation error without HTTP. Provider rejection, timeout, cancellation, malformed response, and ambiguous connection failure preserve distinct typed causes.

## 10. Observability

Optional safe hooks expose operation, duration, HTTP status, Meta code, and trace ID. Application owns logs and metrics.

## 11. Testing Strategy

Boundary validation and golden Meta payloads for all types; mock success/error/timeout; live smoke sends for included types; secret-redaction tests.

## 12. Documentation Review

Verified endpoint, core fields, limits, formats, ID/URL behavior, and status boundary. The application owns idempotency, ordering, persistence, retries, and delivery state.
