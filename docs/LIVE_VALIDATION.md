# Live SDK validation

Date: 2026-10-12 (Asia/Calcutta)

## Verified

- Meta Social Technologies MCP identifies app `1776047483685130` (`Waffly SDk`) in development mode.
- App-level `whatsapp_business_account` subscription is enabled for `messages`.
- Configured credentials successfully read the test phone and template catalog.
- WABA `subscribed_apps` identifies the same app.
- `hello_world` is approved in `en_US`.
- SDK template send to the user-provided test recipient was accepted once. Message ID: `wamid.HBgMOTE3ODIwOTcwOTg5FQIAERgSM0I3NEUxQzkxQzZENTY5RUUwAA==`.
- Recipient confirmed that the message arrived.
- User started ngrok at the registered domain, forwarding to localhost:3000.
- After restarting the local listener with host network access, the public challenge returned HTTP 200 with the exact challenge.
- A real incoming `SDK test` reply passed signature verification with bypass disabled and parsed as `message.received` with `messageType: text`.
- A follow-up SDK text send succeeded while the webhook was reachable. Message ID: `wamid.HBgMOTE3ODIwOTcwOTg5FQIAERgSNjgwQUNGMjEzRDRENUVGQjY0AA==`.
- Signed `message.sent` and `message.delivered` events were received for that follow-up message with signature bypass disabled.
- The original template's signed `message.delivered` event also arrived via provider retry. The observed webhook POSTs returned HTTP 200 in ngrok.
- Rebuilt and packed `.release-check/whatsapp-business-sdk-0.1.0.tgz`; the archive contains only LICENSE, README, package.json, and build outputs (no `.env`).
- Installed the tarball offline into `.release-check/consumer`; CommonJS and ESM runtime imports passed, and TypeScript NodeNext checking passed for both `.cts` and `.mts` consumers, including the new template event fields.
- Recipient confirmed opening the follow-up message. Delayed signed `message.read` events subsequently arrived for both the follow-up text and the original template (provider timestamp `1791795774`), with signature bypass disabled. The follow-up text's sent/delivered/read cycle is verified.

- Live SDK media upload succeeded for a temporary 35-byte `text/plain` document (`sdk-live-check.txt`, media ID `1462055785840619`).
- Retrieval with explicit phone ownership check returned the matching ID, MIME type, size, SHA-256, and a download URL.
- SDK deletion with the same ownership check returned `success: true`; the temporary test asset was cleaned up.
- A second temporary text document (`sdk-document-check.txt`, media ID `1351165683579142`) was downloaded with Bearer authentication; HTTP 200 and exact content equality passed.
- SDK `sendDocument` succeeded for that asset. Message ID: `wamid.HBgMOTE3ODIwOTcwOTg5FQIAERgSMEQ2RjcxMUZCNjI0RUJCOTRDAA==`. Signed `message.sent` and `message.delivered` events matching that ID arrived with signature bypass disabled.
- After delivery, deletion of the second temporary asset returned `success: true`.
- Live JPEG (674 bytes), MP3 (8,586 bytes), H.264/AAC MP4 (12,340 bytes), and PDF (593 bytes) uploads and metadata reads passed. Authenticated downloads matched every original byte, and SDK image/audio/video/document sends were accepted.
- Signed sent/read events arrived for all four formats with signature bypass disabled. JPEG, MP3, and PDF also had explicit delivered events; MP4 had sent/read events without an intervening delivered event observed at the time of checking.
- Deletion returned `success: true` for all four temporary media assets after their read events arrived. Per-asset results are saved locally in `.release-check/media-format-results.json`.

## Expanded coverage and remaining limits

- Expanded testing covered PNG, AAC, AMR-NB, AAC/M4A, mono Opus/OGG, 3GP, DOC, DOCX, XLS, XLSX, PPT, PPTX, and a 20 MiB text document. All uploads, metadata reads, and authenticated byte-for-byte downloads passed.
- All SDK-supported MIME types now have a successful live send example. The expanded variants produced signed sent/delivered events, except the unsupported H.263/AAC 3GP variant, which failed asynchronously with `131053`. A H.264 Baseline/AAC 3GP retest produced signed sent/delivered events.
- Meta Social Technologies MCP confirmed that video requires H.264 with AAC or no audio; OGG requires mono Opus. MIME support does not imply arbitrary codec support. README now documents this constraint.
- Added exact-limit and limit-plus-one automated checks for the 5/16/100 MiB size classes. Oversized files are rejected before fetch; exact limits pass SDK validation. All 34 tests and TypeScript checking passed. Exact-limit files were not uploaded to Meta.
- Detailed expanded results and normalized status evidence are saved locally in `.release-check/expanded-media-results.json` and `.release-check/expanded-media-events.json`.
- Expanded batch totals: 14 byte-for-byte downloads, 13 delivered messages, one H.263 codec rejection, and 14 successful deletions. No temporary provider assets from this batch remain.
- Remaining coverage: other codec/profile combinations, client playback/rendering, and template parameter combinations. Delivery events do not establish playback quality.

## Live size-limit checks

Upload/download checks used an explicit 120-second timeout and did not send additional WhatsApp messages. Image/video fixtures contain valid container padding to reach exact byte sizes; these checks establish transfer behavior, not client playback or asynchronous message processing at those sizes.

| Fixture | Bytes | Result |
| --- | ---: | --- |
| PNG, exact 5 MiB | 5,242,880 | Upload, metadata, download hash, deletion passed |
| H.264/AAC MP4, exact 16 MiB | 16,777,216 | Upload, metadata, download hash, deletion passed |
| Text, exact 100 MiB | 104,857,600 | Upload rejected with HTTP 413; no media ID returned |
| Text, 100 decimal MB | 100,000,000 | Upload, metadata, download hash, deletion passed |
| Text, 100 MiB minus 64 KiB | 104,792,064 | Upload, metadata, download hash, deletion passed |

Each SDK size class also rejected one byte over its configured limit before fetch. Those oversized files were not uploaded to Meta.

The exact 100 MiB failure alongside success 64 KiB below it suggests a total multipart request size ceiling, rather than a decimal 100 MB file ceiling. The precise provider boundary was not established. README documents leaving headroom; the SDK still uses its existing nominal file-size caps.

All four accepted test uploads were deleted successfully. Machine-readable evidence: `.release-check/live-size-results.json`.

## Large-file message delivery

The user authorized sending three large fixtures to the confirmed test number. Using a 120-second upload timeout, all uploads and SDK sends succeeded:

| Fixture | Bytes | Signed status events |
| --- | ---: | --- |
| PNG | 5,242,880 | sent, delivered |
| H.264/AAC MP4 | 16,777,216 | sent, delivered |
| Text document | 104,792,064 | sent, delivered |

Each status matched the corresponding message ID and passed the running webhook server's signature verification with bypass disabled. All three provider media assets were deleted after delivery. Per-asset results and normalized status evidence: `.release-check/large-delivery-results.json` and `.release-check/large-delivery-events.json`.

These padded fixtures establish delivery at the tested sizes. The recipient subsequently confirmed that the large test files work and open on their phone. This is user-confirmed opening behavior, not an independently observed playback-quality check. The exact 100 MiB document remains rejected at upload, as recorded above.

## Release preparation

- SDK location and synthetic contact sends produced signed sent/delivered events. Results: `.release-check/structured-send-results.json`.
- Template catalog still contains only approved `hello_world` in `en_US`. No parameterized approved template is available; live parameterized template validation remains pending. Existing automated tests verify parameter serialization.
- Retained documented document-size headroom rather than introducing an unverified hardcoded provider cap.
- Added `CHANGELOG.md` to the package allowlist and rebuilt the final 0.1.0 tarball with the current README.
- All 34 automated tests, source type checking, ESM/CJS builds, and declaration generation passed.
- Fresh offline tarball installation into `.release-check/candidate-consumer` passed CommonJS/ESM runtime imports and TypeScript NodeNext checks for `.cts`/`.mts` consumers.
- Package contains 10 allowlisted files. No `.env`, local evidence, or fixtures are included. Scanned contents do not contain the configured access token, app secret, or verify token; all installed files match the scanned source contents byte for byte.
- Artifact: `.release-check/whatsapp-business-sdk-0.1.0.tgz`. SHA-256: `40eeeea6e64247e95996e783b11669dc8b07de55be05970fedc5800d2d44ee3c`.
- Package has not been published. Live parameterized templates and production-account validation remain release coverage limitations.

The local example server was started with signature bypass explicitly disabled. Initial requests returned 502 because the sandboxed listener was unreachable from ngrok; restarting with host network access restored reachability. Its availability and the tunnel must be rechecked in a later session.

Persistence, queues, deduplication, and status reconciliation remain the consuming application's responsibility, consistent with the SDK scope.
