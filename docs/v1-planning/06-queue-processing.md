# Excluded Feature: Queue and Message Processing

## 1. Purpose

Record why a queue and worker do not belong in the V1 SDK.

## 2. Scope

Document the boundary and provide integration guidance only.

## 3. Non-goals

Shipping a queue, worker, scheduler, database adapter, dead-letter store, or process manager.

## 4. Official Documentation Research

Meta publishes throughput and pair limits, but those limits do not require an SDK-owned queue. Applications have different durability and scheduling needs.

## 5. Requirements

1. Every SDK operation is a direct async call.
2. Support cancellation and bounded timeouts.
3. Return sufficient errors for callers to make retry/queue decisions.
4. Document Meta throughput and pair-limit signals.
5. Do not start background processes or retain work after a call returns.

## 6. API Design

No queue API. Examples may show how an application calls the SDK from its own job processor without endorsing a queue product.

## 7. Data Model

None.

## 8. Security

Avoid serializing access tokens into caller job payloads. Applications should resolve credentials securely at execution time.

## 9. Failure Scenarios

Timeouts, throttling, and ambiguous submissions are surfaced to the caller. The SDK never schedules hidden retries after returning.

## 10. Observability

Optional safe request hooks can support application metrics. Queue depth and worker health belong to the application.

## 11. Testing Strategy

Verify that calls terminate on success, error, cancellation, and timeout and leave no timers or background work behind.

## 12. Documentation Review

Decision: excluded from V1. Revisit only if the product becomes a hosted messaging platform.
