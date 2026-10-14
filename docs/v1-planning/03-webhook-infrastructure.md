# Feature: Webhook Helpers

## 1. Purpose

Help applications securely verify Meta webhook requests and parse relevant WhatsApp events.

## 2. Scope

Challenge verification, raw-body HMAC verification, typed parsing of incoming messages, outgoing statuses/errors, interactive responses, and selected template/account/phone events.

## 3. Non-goals

Hosting an HTTP endpoint, storing events, deduplication, retries, normalization delivery, workflow routing, or updating message state.

## 4. Official Documentation Research

Meta signs POST payloads using `X-Hub-Signature-256` and the app secret. Verification must use exact raw bytes. Meta retries failed webhook delivery and may deliver concurrently, duplicated, or reordered. See [00-meta-research.md](00-meta-research.md).

## 5. Requirements

1. Verify GET challenge values using constant-time token comparison.
2. Verify POST signature before JSON parsing.
3. Accept raw bytes, signature header, and app secret explicitly.
4. Parse an envelope into zero or more typed events.
5. Preserve unknown event/status/message variants.
6. Let one malformed item be reported without losing parsed siblings where safe.
7. Document that callers must store/dedupe/process events themselves.

## 6. API Design

```text
webhooks.verifyChallenge(input)
webhooks.verifySignature({ rawBody, signature, appSecret })
webhooks.parse(rawBody)
```

Parsing never implies signature verification; framework guides must show verification first.

## 7. Data Model

Typed event unions containing Meta field name, identifiers, timestamp, parsed data, and optional raw value. No receipt or event tables.

## 8. Security

Exact-byte HMAC-SHA256, strict header parsing, constant-time comparison, bounded payload guidance, no secret/raw-body logging, and framework notes warning against parsed/re-serialized bodies.

## 9. Failure Scenarios

Invalid signature, malformed JSON, unknown field, unknown nested variant, multi-entry envelope, and missing optional identifiers return explicit verification or parse outcomes.

## 10. Observability

Helpers return safe reason codes. Endpoint latency, response status, retries, storage, and processing lag belong to the application.

## 11. Testing Strategy

Known HMAC vectors; tampering; prefix/case/header errors; official fixtures; multi-entry changes; unknown variants; malformed siblings; byte-encoding edge cases.

## 12. Documentation Review

Verified signature and selected event semantics. A stable event ID is not universal, so the SDK cannot promise turnkey deduplication.
