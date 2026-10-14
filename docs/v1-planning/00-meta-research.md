# Official Meta Research Baseline

Status: research snapshot, not implementation specification. Recheck before each feature is approved.

Cross-checked through Meta Social Technologies MCP: **2026-09-29**. See [13-meta-mcp-cross-check.md](13-meta-mcp-cross-check.md).

## Version baseline

- The official Graph API changelog identified **v26.0** as the latest Graph API version on 2026-09-29.
- Several WhatsApp guides and reference pages still show examples using v23–v25. An example version does not prove endpoint support on v26.0.
- Decision: pin a tested Graph version in provider configuration. Do not silently follow Meta's newest version.
- **UNKNOWN / REQUIRES VERIFICATION:** run the planned contract suite against a Meta test asset using v26.0 for every V1 endpoint before implementation approval.

## Core official references

| Topic | Official URL | Verified finding |
|---|---|---|
| Platform overview | https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform | Graph API sends; webhooks receive messages/statuses; WABA/phone/template concepts; platform rate-limit overview. |
| Graph versions | https://developers.facebook.com/docs/graph-api/changelog/ | v26.0 reported as latest at research time. |
| Messages API | https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api | `POST /{phone-number-id}/messages`; response includes Meta message ID. |
| Text | https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/text-messages | Body required, maximum 4096 characters; optional link preview. |
| Images | https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/image-messages | Uploaded media ID or public URL; optional caption. |
| Documents | https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/document-messages | Uploaded media ID or public URL; optional caption and filename. |
| Video | https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/video-messages | Uploaded media ID or public URL; optional caption up to 1024 characters. |
| Media | https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media | Upload/retrieve/download/delete; exact MIME and size table; uploaded media persists 30 days; incoming webhook media IDs expire after 7 days; retrieved download URLs expire after 5 minutes. |
| Templates | https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview | Approved templates; language variants; named/positional variables; media headers; review/status model. |
| Template management | https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-management | Template list/create/update/delete behavior and validation. |
| Template API | https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/template-api | Template CRUD endpoints under WABA or template ID. |
| Webhook overview | https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview | Available WABA subscription fields and webhook purpose. |
| Messages webhook | https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages | Incoming messages; outgoing `sent`, `delivered`, `read`, `failed`; errors may appear at three payload levels. |
| Template status webhook | https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/message_template_status_update | Approval, rejection, disabling and associated template identifiers/reasons. |
| Template category webhook | https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/template_category_update/ | Planned and completed category changes. |
| Error codes | https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes | Graph and WhatsApp errors; synchronous and asynchronous failure reporting. |
| Throughput | https://developers.facebook.com/documentation/business-messaging/whatsapp/throughput | 80 messages/sec per registered number by default; possible automatic upgrade to 1,000; webhook retry up to 7 days with exponential backoff. |
| Messaging limits | https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits | Portfolio-level unique-recipient limits outside the customer-service window. |
| Access tokens | https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens/ | Direct developers use System User tokens; providers use business-scoped forms; asset access also matters. |
| Permissions | https://developers.facebook.com/documentation/business-messaging/whatsapp/permissions | `whatsapp_business_messaging` for messages/message webhooks; `whatsapp_business_management` for templates/account metadata/account webhooks. |
| Phone numbers | https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers | WABA phone-number listing; phone-number IDs; registration and throughput fields. |
| Account model evolution | https://developers.facebook.com/documentation/business-messaging/whatsapp/account-model-evolution/ | Legacy WABA is evolving into WhatsApp Account and Messaging Account concepts. |

## Verified message/media constraints

All seven V1 message types use `POST /{VERSION}/{BUSINESS_PHONE_NUMBER_ID}/messages`, Bearer authentication, `messaging_product: whatsapp`, a recipient, and a type-specific object.

| Type | Required content | Optional content | Verified media constraints |
|---|---|---|---|
| Text | `body` | `preview_url`, reply context | Body max 4096 characters. |
| Image | exactly one of media `id` or `link` | caption, reply context | JPEG `image/jpeg` or PNG `image/png`, 5 MB; 8-bit RGB/RGBA. |
| Document | exactly one of media `id` or `link` | caption, filename, reply context | TXT, XLS/XLSX, DOC/DOCX, PPT/PPTX, PDF; 100 MB. |
| Video | exactly one of media `id` or `link` | caption, reply context | MP4 `video/mp4` or 3GPP `video/3gpp`, 16 MB; H.264 video and AAC audio; one or zero audio streams. |
| Audio | exactly one of media `id` or `link` | reply context | AAC, AMR, MP3, M4A, OGG/Opus mono; 16 MB. |
| Location | latitude and longitude | name and address | No media asset. Coordinate range validation is our boundary validation. |
| Contact | one to 257 contact objects; each requires `name.formatted_name` | addresses, birthday, emails, org, phones, URLs | No media asset. Birthday uses `YYYY-MM-DD`; included email, phone, and URL objects require their value field. Meta recommends fewer than 257 for usability and feedback reasons. |

For hosted media URLs, Meta must be able to retrieve the asset. Official guidance recommends uploaded media IDs for performance. The SDK validates mutually exclusive `id`/`url` inputs and documents IDs as the preferred form.

## Verified templates capability

- Send with `type: template`, name, language code, and zero or more component parameters.
- Named and positional parameters are supported; creation examples are required by Meta for variables.
- Parameter kinds documented include text, currency, date/time, image, document, and video. Button/template variants exist beyond V1.
- Media template headers use a media parameter when sending. Template creation uses a resumable-upload asset handle for the review example.
- Templates are language-specific assets; Meta does not translate strings or variables.
- Management endpoints support retrieve/list/create/update/delete. Creation rate documented as 100 templates per WABA per hour.
- Statuses include review and quality-related states; sendability must derive from Meta's current status, not a locally invented list.
- Only API status `APPROVED` is sendable. The user-facing active quality bands map to quality scores `GREEN`, `YELLOW`, `RED`, and `UNKNOWN`; `PAUSED`, `DISABLED`, `REJECTED`, and pending/review states are not sendable.
- Meta requires user opt-in before a business sends template messages. V1 records this as a caller responsibility and does not become a consent-management system.
- Meta applies dynamic per-user marketing-template limits. The platform must treat Meta's decision as authoritative and must not hard-code local eligibility rules.
- Since April 1, 2025, Meta has temporarily paused delivery of marketing templates to WhatsApp users with United States phone numbers. V1 must reject or clearly surface this restriction when identifiable, while preserving Meta's provider error as the final authority.

V1 supports sending ordinary approved templates with the header/body/button parameters needed by those templates, plus direct list/read methods. It does not synchronize or retain a local catalog. Specialized authentication, carousel, catalog, limited-time offer, coupon, calling, and Flow template builders are out of scope.

## Verified webhooks

The webhook parser recognizes these relevant subscription fields when applications receive them:

- `messages`: incoming messages, outgoing statuses, and message errors.
- `message_template_status_update`: approval/rejection/disable and other documented status changes.
- `message_template_quality_update`: quality changes.
- `message_template_components_update`: component changes where available.
- `template_category_update`: planned or completed category changes.
- `phone_number_name_update`: display-name review outcomes.
- `phone_number_quality_update`: throughput/quality-related changes.
- `account_alerts`, `account_review_update`, `account_update`, `business_capability_update`, and `security`: retain and surface operational changes relevant to configured assets.

V1 does not define typed models for unrelated payment, commerce, calling, group, partner, coexistence, history, or user-preference events. It returns unknown variants without hosting or storing them.

Meta message status webhooks can report `sent`, `delivered`, `read`, and `failed`. A sent message may produce up to three success status webhooks. Meta retries failed webhook delivery for up to seven days with exponential backoff and delivers concurrently; duplicates and reordering must be expected. A number using Meta's optional No Storage mode has a one-hour webhook retry/retention window instead; No Storage is outside V1 configuration scope.

Meta does not guarantee delivery order for multiple messages. A caller that needs strict sequencing must wait for the preceding message's `delivered` webhook before submitting the next message. The SDK makes no delivery-order promise.

## Verified limits and errors

- Default registered-number throughput: up to 80 messages/sec, inclusive of inbound/outbound and all types; eligible numbers may upgrade to 1,000.
- Coexistence numbers used by both the WhatsApp Business app and Cloud API are fixed at 20 messages/sec.
- Pair limit: approximately one message every six seconds to the same user; Meta documents bursts up to 45 messages, error `131056`, and retry delay `4^X` seconds with increasing `X` after each failure.
- Throughput exhaustion: error `130429`.
- Oversized incoming media: webhook error `131052` for the documented 100 MB maximum receive constraint.
- Error responses include message, type, code, optional subcode, `error_data`, and `fbtrace_id`.
- Errors can be synchronous, asynchronous via webhook, or both. Both channels must be reconciled.
- Template and portfolio messaging limits are separate from raw throughput.

## Account-model migration constraint

Meta's published transition says:

- Current integrations continue using phone-number IDs and legacy WABA IDs.
- Phase 2, targeted for H1 2027, introduces `waac_id` and new endpoints; multi-Messaging-Account cases require a Messaging Account selector.
- Phase 3, targeted for H1 2028, requires WAAC IDs in paths and Messaging Account IDs in applicable multi-account sends.

V1 therefore treats provider identifiers as opaque typed fields and avoids inventing stable internal account or phone-number IDs. New WAAC or messaging-account selectors enter the public API only after documentation and live contract verification.

## Unknowns requiring a live Meta test asset

1. v26.0 compatibility for each selected endpoint and webhook field.
2. Exact contact-object nested limits and validation behavior.
3. Whether Meta supplies a stable delivery/event identifier suitable for webhook deduplication across every selected field.
4. Complete retry guidance per current error code; Meta documents some codes explicitly but does not provide one universal retry flag.
5. Which account-model evolution phase is enabled for the target app/account at implementation time.
6. Exact typed coverage required for less-common account and phone-number webhook fields; unknown variants remain available to callers.

