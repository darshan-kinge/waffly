# Cross-Cutting SDK Design

## 1. Architecture

```text
public types -> resource methods -> shared HTTP transport -> Meta Graph API
webhook raw bytes -> verification helper -> typed parser
```

Use one concrete Meta client. A generic provider abstraction is outside V1.

## 2. Client configuration

`accessToken` is required. `phoneNumberId` is an optional default. `graphVersion` is explicit or uses a documented pinned default. Timeout and native HTTP transport are configurable for supported runtimes and tests.

Tokens remain in server-side applications. A method call may override the default phone-number ID.

## 3. Send flow

1. Validate documented limits.
2. Resolve the phone-number ID.
3. Map the request to Meta's payload.
4. Execute one bounded, cancellable HTTP request.
5. Return the provider message ID and typed response.
6. Surface a sanitized typed SDK error on failure.

The SDK does not persist state, claim delivery, or invent an internal message ID.

## 4. Modules

```text
client, transport, messages, templates, media, webhooks, errors, types
```

Keep modules internal unless consumers need their public types or helpers.

## 5. Public API conventions

- Async typed methods.
- Clear SDK inputs with Meta wire payloads kept internal.
- Provider IDs returned unchanged.
- Optional raw-response escape hatch without weakening typed fields.
- Native cancellation where available.
- No automatic retries for message sends or uploads.
- Cursor pagination; native async iteration only when the language supports it simply.

## 6. State and data model

There is no SDK database. The application owns persistence, idempotency, queues, histories, and webhook-event storage. Public value types cover configuration, message requests/results, template/media metadata, webhook events, pagination, and errors.

## 7. Security

- Never log or serialize tokens in errors.
- Redact authorization headers and temporary media URLs.
- Verify webhook signatures over exact raw bytes before parsing.
- Use constant-time comparisons.
- Enforce Meta HTTPS endpoints; allow endpoint injection only through an explicit testing seam.
- Document browsers/mobile clients as unsupported because they cannot safely hold Meta tokens.

## 8. Errors

Expose category, SDK code, HTTP status, Meta code/subcode, trace ID, sanitized detail, and retry guidance. Preserve abort/timeout causes without leaking request secrets.

## 9. Observability

No telemetry backend ships with the SDK. Optional hooks may receive safe operation name, duration, HTTP status, Meta trace ID, and error category. Tokens and sensitive payloads are excluded.

## 10. Testing

Unit-test validation, mappings, errors, and signatures. Use official fixtures for contract tests, an injected transport for failure tests, and a small live Meta suite outside normal CI. Test package installation/types in every supported runtime.

## 11. Compatibility

Pin and document supported Graph versions. Review Meta changelogs before each release. Use semantic versioning and never silently advance the default Graph version.

## 12. First implementation slice

Implement configuration, transport, `WhatsAppApiError`, and `messages.sendText`. Verify against a Meta test number, then add signature verification and message-status parsing.
