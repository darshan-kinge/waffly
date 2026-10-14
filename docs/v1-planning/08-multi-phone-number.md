# Feature: Multiple Phone Numbers

## 1. Purpose

Let one application use the SDK with more than one Meta business phone-number ID without adding tenants or configuration storage.

## 2. Scope

Optional default phone-number ID on a client, per-call override, WABA/account identifiers for template methods, and documented account-model types.

## 3. Non-goals

Number onboarding, registration, verification, discovery dashboard, health store, credential vault, tenant isolation, routing service, or automated account migration.

## 4. Official Documentation Research

Message/media paths use a business phone-number ID. Template management uses account/template identifiers. Meta's account-model evolution may introduce WAAC and messaging-account selectors; rollout can vary by asset. See [00-meta-research.md](00-meta-research.md).

## 5. Requirements

1. Allow `phoneNumberId` as client default.
2. Allow an explicit per-call override.
3. Fail locally when neither is available for an operation that requires it.
4. Keep provider identifiers opaque strings.
5. Add optional new account selectors only when documented and live-tested.
6. Never infer tenancy or credential ownership.

## 6. API Design

```text
new WhatsAppClient({ accessToken, phoneNumberId: defaultId })
client.messages.sendText({ phoneNumberId: overrideId, ... })
```

Applications may construct one client per number/token or use explicit overrides.

## 7. Data Model

Configuration and request fields only: phone-number ID, WABA/legacy messaging-account ID, future WAAC ID, and optional messaging-account selector when supported.

## 8. Security

The SDK cannot prove that a token owns a supplied number. Meta permission/asset checks are authoritative. Do not log provider identifiers with sensitive payloads unnecessarily.

## 9. Failure Scenarios

Missing ID, wrong asset, insufficient permission, rollout-specific required selector, or revoked token becomes a typed configuration/provider error. The SDK stores no health state.

## 10. Observability

Safe hooks may include an intentionally redacted/hashable phone-number ID only if the caller opts in. Health and per-number metrics belong to the application.

## 11. Testing Strategy

Default/override resolution, missing ID, two-number mock calls, wrong-asset errors, and live calls on multiple numbers where available.

## 12. Documentation Review

Verified current identifier relationships and published transition. Rollout state and final future field names require release-time verification.
