# Excluded Feature: Dashboard

## 1. Purpose

Record why V1 has no dashboard.

## 2. Scope

Documentation decision only.

## 3. Non-goals

Message logs, analytics, configuration UI, credential management, webhook health pages, or template catalog UI.

## 4. Official Documentation Research

Meta exposes data that an application may display, but a client library has no persistence or user interface requirement.

## 5. Requirements

The SDK documentation must show returned data clearly enough for applications to build their own operational interface if needed.

## 6. API Design

No dashboard API.

## 7. Data Model

None.

## 8. Security

Examples must avoid displaying access tokens, temporary media URLs, or unredacted personal data.

## 9. Failure Scenarios

Not applicable to the SDK package.

## 10. Observability

Application-owned. The SDK provides typed results, errors, and optional safe request hooks only.

## 11. Testing Strategy

No dashboard tests. Documentation examples receive compile/type checks with the package.

## 12. Documentation Review

Decision: excluded. Add only as a separate product with its own plan.
