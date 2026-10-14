# Feature: Media Methods

## 1. Purpose

Wrap Meta media upload, metadata retrieval, authenticated download, and deletion with typed methods and streaming behavior.

## 2. Scope

Upload for a phone-number ID, retrieve metadata/download URL, stream download, delete media, and validate documented MIME/size constraints when knowable.

## 3. Non-goals

Internal media IDs, metadata database, storage/CDN, caching, transcoding, resizing, virus scanning, deduplication, or URL proxy service.

## 4. Official Documentation Research

Meta supports `POST /{PHONE_NUMBER_ID}/media`, `GET /{MEDIA_ID}`, authenticated download from a five-minute URL, and `DELETE /{MEDIA_ID}`. Uploaded media persists 30 days; incoming webhook media IDs expire after seven days. See [00-meta-research.md](00-meta-research.md).

## 5. Requirements

1. Accept stream/file types native to the selected language.
2. Avoid buffering large files unnecessarily.
3. Validate declared MIME and size where available.
4. Return Meta media IDs unchanged.
5. Support optional `phone_number_id` ownership checks on retrieve/delete.
6. Fetch a fresh URL when the caller explicitly downloads; do not cache it.
7. Do not automatically retry ambiguous upload/delete writes.

## 6. API Design

```text
media.upload({ phoneNumberId?, file, mimeType })
media.retrieve({ mediaId, phoneNumberId? })
media.download({ mediaId, phoneNumberId? })
media.delete({ mediaId, phoneNumberId? })
```

## 7. Data Model

Typed upload result and metadata containing provider media ID, MIME, size, checksum/URL where documented. No local record or byte storage.

## 8. Security

Treat download URLs as bearer-like secrets, redact them, authenticate downloads, and avoid unsafe filenames in examples. Caller controls downloaded bytes and any malware scanning.

## 9. Failure Scenarios

Invalid size/MIME, interrupted stream, upload ambiguity, expired URL, missing media, download abort, delete rejection, and malformed metadata become typed errors. Download may re-retrieve metadata once when expiry is clear.

## 10. Observability

Safe hooks may report operation, byte count, duration, MIME, status, and provider trace ID without filenames, URLs, tokens, or content.

## 11. Testing Strategy

Boundary validation, streaming memory behavior, interrupted streams, URL refresh, ownership parameter, error parsing, and live upload/retrieve/download/delete smoke tests.

## 12. Documentation Review

Verified operations, permissions, limits, and expiry. Application storage and lifecycle management remain outside the SDK.
