# Feature: Template Messaging

## 1. Purpose

Provide typed helpers for sending approved templates and directly calling selected Meta template-management endpoints.

## 2. Scope

Template name/language, named and positional variables, header/body/button components, text/currency/date-time/media parameters, template list/read, and conditional create/update/delete.

## 3. Non-goals

Local catalog, synchronization scheduler, approval workflow, authoring UI, translation, campaigns, or specialized authentication/carousel/catalog/Flow builders.

## 4. Official Documentation Research

Meta sends templates through `POST /{PHONE_NUMBER_ID}/messages`; management uses WABA/template endpoints. Only `APPROVED` templates are sendable. Opt-in, dynamic marketing limits, and the US marketing-template pause apply. See [00-meta-research.md](00-meta-research.md).

`UNKNOWN / REQUIRES VERIFICATION`: exact pinned-version schemas for every selected management and specialized component operation.

## 5. Requirements

1. Validate basic component shape and mutually exclusive media ID/link.
2. Preserve positional order and named parameter names.
3. Return provider IDs/statuses unchanged through typed results.
4. Do not claim a template is approved without caller-supplied metadata or a Meta read.
5. Surface Meta eligibility/policy errors without retry.
6. Keep raw payload escape hatches explicit and bounded.

## 6. API Design

```text
client.messages.sendTemplate(input)
client.templates.list(input)
client.templates.get(templateId)
client.templates.create|update|delete(...)   // conditional V1
```

## 7. Data Model

Immutable request/response types for template identity, language, category, status, quality, components, parameters, and pagination. No persistence.

## 8. Security

Management methods document `whatsapp_business_management`; sends document `whatsapp_business_messaging`. Redact tokens, variables, and media URLs from diagnostics.

## 9. Failure Scenarios

Invalid local shape fails before HTTP. Stale approval, wrong language/components, US marketing restriction, per-user limit, or policy rejection returns typed Meta errors. No background refresh occurs.

## 10. Observability

Expose safe operation, status, duration, Meta code, and trace ID through optional hooks/errors. Do not emit variable values.

## 11. Testing Strategy

Payload fixtures for named/positional parameters and selected components; response/error parsing; pagination; unknown fields; live approved-template send; live management tests only if mutation is approved.

## 12. Documentation Review

Sending and read/list are core. Create/update/delete remain conditional. Template storage, sync, consent management, and eligibility prediction belong to the application/Meta.
