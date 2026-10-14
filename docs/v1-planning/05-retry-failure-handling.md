# Feature: Errors and Retry Guidance

## 1. Purpose

Turn Meta and transport failures into stable, useful SDK errors without causing duplicate sends.

## 2. Scope

HTTP/Graph error parsing, validation/configuration/transport errors, normalized categories, retry hints, timeout and cancellation handling, and optional safe retries for idempotent reads.

## 3. Non-goals

Background retries, dead-letter queues, guaranteed delivery, global rate limiting, credential health state, or exhaustive permanent hard-coding of every Meta code.

## 4. Official Documentation Research

Meta errors may include HTTP status, message, type, numeric code/subcode, `error_data`, and `fbtrace_id`; some message failures arrive asynchronously. Selected codes and limits are in [00-meta-research.md](00-meta-research.md).

## 5. Requirements

Categories: `validation`, `authentication`, `authorization`, `recipient`, `template`, `media`, `rate_limited`, `temporary_provider`, `permanent_provider`, `transport`, `cancelled`, and `unknown`.

1. Preserve Meta code/subcode/trace ID and sanitized detail.
2. Mark retry guidance without claiming safety for ambiguous writes.
3. Never automatically retry sends, uploads, or mutations by default.
4. If retry support exists, limit it to explicitly enabled idempotent reads and documented explicit rejections.
5. Respect provider retry guidance when available.

## 6. API Design

```text
WhatsAppApiError {
  category, code, message, retryable,
  httpStatus?, metaCode?, metaSubcode?, traceId?, cause?
}
```

## 7. Data Model

In-memory error objects and a versioned source-code mapping artifact. No attempts table or retry state.

## 8. Security

Sanitize provider text that may echo request content. Never attach authorization headers, tokens, full payloads, or temporary media URLs.

## 9. Failure Scenarios

Explicit 4xx/5xx Meta error, 429/pair limit, DNS/TLS/connect failure, timeout after transmission, caller cancellation, invalid JSON, and unknown Meta code remain distinguishable. Ambiguous writes are returned to the caller without automatic resend.

## 10. Observability

Optional hooks receive category, safe code, status, operation, duration, and trace ID. Application retry and failure metrics are outside the SDK.

## 11. Testing Strategy

Table tests for mapped/unknown codes, sanitization, timeout/cancellation distinction, malformed Meta errors, retry-hint behavior, and assertions that write operations are never retried by default.

## 12. Documentation Review

Verified response structure and selected codes. Exact code-specific guidance remains a release-time review item. Retry scheduling belongs to the application.
