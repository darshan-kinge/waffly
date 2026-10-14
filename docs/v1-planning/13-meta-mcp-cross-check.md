# Meta Social MCP Cross-Check

Date: **2026-09-29**  
Source boundary: official Meta developer documentation returned by Meta Social Technologies MCP  
Result: **planning documents corrected; production behavior still requires the live test-asset gate**

## Scope checked

- Graph API version baseline and deprecation schedule.
- Seven V1 message types and their common request endpoint.
- Media operations, formats, limits, ownership checks, and expiry.
- Template send/management capabilities, parameters, statuses, quality, and webhooks.
- Webhook verification, signatures, message statuses, error locations, retries, and latency guidance.
- Permissions, token types, WABA/phone-number relationships, and account-model evolution.
- Throughput, coexistence throughput, pair limiting, and selected error codes.

## Confirmed without plan changes

1. Graph API v26.0 is the latest version as of the audit date. WhatsApp reference examples still span v23–v25, so the plan correctly requires live v26 endpoint tests rather than assuming compatibility from examples.
2. Common sends use `POST /{VERSION}/{PHONE_NUMBER_ID}/messages` and require `whatsapp_business_messaging`.
3. Text body maximum is 4096 characters.
4. Media formats and maxima in the plan match Meta: images 5 MB, audio/video 16 MB, documents 100 MB, with the documented MIME/codec restrictions.
5. Templates support language-specific assets, named/positional variables, ordinary text/currency/date-time/media parameters, management endpoints, and dedicated status/quality/category webhooks.
6. Only `APPROVED` templates are sendable; paused, disabled, rejected, and review states are not.
7. `messages` webhooks carry incoming messages and outgoing `sent`, `delivered`, `read`, and `failed` statuses; errors can occur at value, incoming-message, or status level.
8. Webhook POST verification is HMAC-SHA256 over the exact JSON payload using the Meta app secret, compared with `X-Hub-Signature-256`.
9. Normal webhook delivery is concurrent and retried for up to seven days with exponential backoff. Meta recommends median webhook latency at or below 250 ms and fewer than 1% of requests above one second.
10. Default throughput is 80 messages/sec per registered number, with automatic upgrade eligibility to 1,000; error `130429` reports throughput exhaustion.
11. Pair limiting is about one message per six seconds to one recipient, with error `131056` and documented `4^X` retry guidance.
12. `whatsapp_business_management` and asset access are required for account/template management; direct developers normally use System User tokens.
13. Meta's published account evolution still targets new WAAC/messaging-account behavior in H1 2027 and mandatory transition in H1 2028. The plan's stable internal provider-reference model is appropriate.
14. Meta requires recipient opt-in for template messaging, applies dynamic per-user marketing-template limits, and has paused marketing-template delivery to US WhatsApp numbers since April 1, 2025.
15. Meta does not guarantee delivery order for multiple messages; strict sequencing requires waiting for a `delivered` webhook before sending the next message.

## Corrections made

1. Replaced the unknown media-retention item with verified values: uploaded media persists 30 days; incoming webhook media IDs expire after 7 days; retrieved download URLs expire after 5 minutes.
2. Added optional `phone_number_id` ownership checks to media retrieve/delete planning.
3. Added Meta's No Storage exception: one-hour media/webhook retention by default, with configurable uploaded-media TTL; V1 does not configure No Storage.
4. Replaced the unknown contact limit with the documented maximum of 257 contacts and the required nested value rules.
5. Added the 20 messages/sec fixed throughput for coexistence numbers.
6. Added the documented pair-limit burst and `4^X` retry guidance.
7. Made template sendability and quality-score values explicit.
8. Added the recipient opt-in boundary, dynamic marketing-template limits, and the US marketing-template delivery pause.
9. Removed any implied delivery-order guarantee from the send and status-event plans.
10. After the product was narrowed to an SDK wrapper, removed the hosted database, queue, worker, API-key, dashboard, local tracking, media proxy, and template-sync assumptions. This scope change is architectural rather than a correction to Meta documentation.

## Remaining verification gates

These cannot be closed through documentation search alone:

1. Execute every chosen endpoint against a real Meta test asset using the pinned Graph version.
2. Confirm recipient phone-number normalization behavior for the pinned version because current official examples show both leading-plus and digits-only forms.
3. Capture exact payload fixtures for every selected webhook field and verify whether each offers a stable event identifier.
4. Build a current error-code decision table; Meta has code-specific recommendations and no universal retry flag.
5. Detect the account-model rollout phase and identifiers actually returned for each connected customer asset.

## Review conclusion

The official findings support a stateless wrapper SDK. V1 should provide typed direct calls, conservative error semantics, and webhook verification/parsing helpers. Persistence, idempotency, queues, retries, webhook hosting, and message-state reconciliation belong to the consuming application. Implementation remains gated by [12-review-gate.md](12-review-gate.md).
