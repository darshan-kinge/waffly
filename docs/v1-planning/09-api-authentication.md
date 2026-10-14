# Feature: Meta Authentication Configuration

## 1. Purpose

Authenticate SDK requests to Meta while keeping access tokens out of public clients, logs, and errors.

## 2. Scope

Bearer-token client configuration, documented token/permission expectations, safe overrides for rotation, and redaction.

## 3. Non-goals

Issuing SDK API keys, accounts/projects, OAuth hosting, token acquisition, token storage, rotation service, quotas, or user authentication.

## 4. Official Documentation Research

Direct developers normally use System User tokens. Provider operating models may use business-scoped token forms. Messaging and management require different permissions plus asset access; see [00-meta-research.md](00-meta-research.md).

## 5. Requirements

1. Require a token when constructing or invoking the client.
2. Send it only through the HTTPS Authorization header to the configured Meta host.
3. Never expose it in stringification, debug output, errors, or hooks.
4. Document required permission per method.
5. Support creating a replacement client for token rotation; mutable secret management is unnecessary.
6. Reject use in documented unsafe browser/mobile environments.

## 6. API Design

```text
new WhatsAppClient({ accessToken, graphVersion, phoneNumberId? })
```

Environment-variable loading belongs in examples or a tiny convenience documented for the target language, not in a custom secret manager.

## 7. Data Model

In-memory configuration only. No token persistence.

## 8. Security

Redact headers and configuration inspection. Prevent ordinary production configuration from changing Meta's host. Avoid token-bearing URLs. Published examples use server-side environment variables.

## 9. Failure Scenarios

Missing token is a local configuration error. Meta auth/permission/asset failures become typed non-retryable errors. Rotation is performed by replacing the client/configuration.

## 10. Observability

Expose safe auth-error category and provider trace ID only. Never expose token fragments as labels.

## 11. Testing Strategy

Missing-token validation, correct header injection, redaction snapshots, hostile error echo, host restriction, and typed auth/permission fixtures.

## 12. Documentation Review

Verified Meta token and permission boundary. SDK-issued authentication is excluded because there is no hosted SDK service.
