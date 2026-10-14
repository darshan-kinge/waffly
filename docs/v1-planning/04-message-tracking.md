# Feature: Message Results and Status Events

## 1. Purpose

Give SDK users typed provider message IDs and webhook status events without pretending the SDK tracks state.

## 2. Scope

Send-result types, provider message IDs, parsed `sent`, `delivered`, `read`, and `failed` events, provider timestamps, recipients, conversation/pricing fields where documented, and typed errors.

## 3. Non-goals

Internal message IDs, database records, current-status projection, histories, event deduplication, reconciliation, polling service, or delivery guarantees.

## 4. Official Documentation Research

Meta returns a message ID from sends and later reports status through `messages` webhooks. Events may be duplicated or reordered, and multiple-message delivery order is not guaranteed.

## 5. Requirements

1. Return Meta's message ID unchanged.
2. Parse all four documented status values.
3. Preserve unknown status values through a forward-compatible representation.
4. Keep Meta timestamp and identifiers available.
5. Clearly document that application code owns storage, deduplication, ordering, and current-state calculation.

## 6. API Design

```text
SendMessageResult { messageId, recipientId?, raw? }
MessageStatusEvent { messageId, status, timestamp, recipientId, errors?, raw? }
```

## 7. Data Model

Public immutable value types only. No persistence schema.

## 8. Security

Do not include tokens or authorization headers in raw results. Document that webhook events may contain personal data and that applications control retention.

## 9. Failure Scenarios

Missing message ID, malformed status, unknown status, absent optional fields, and error-only webhook payloads return a typed parse result or parse error without crashing on unrelated valid entries.

## 10. Observability

The SDK may expose provider trace IDs and event metadata. Application monitoring and state metrics are outside the SDK.

## 11. Testing Strategy

Official send/status fixtures, all four statuses, unknown status, malformed sibling, duplicated fixture, and reordered fixture parsing.

## 12. Documentation Review

Verified provider IDs and four status values. The SDK makes no persistence, exactly-once, ordering, or delivery guarantee.
