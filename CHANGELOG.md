# Changelog

## 0.1.0

- Branded as Waffly with the package identifier `waffly`; public API exports retain their existing names.

- Initial TypeScript SDK for direct WhatsApp Cloud API calls: text, templates, media, location, contacts, and template reads.
- Webhook signature verification and normalized incoming messages, status events, and template lifecycle updates.
- Pre-cancelled requests are rejected before sending; requests are not automatically retried.
- Template component parsing follows Meta's webhook fields; scheduled category changes are separate from the current category.
- Example webhook server rejects bodies over 1 MiB.
- Live validation covers message delivery/read events, supported media MIME types, authenticated downloads, cleanup, and large-file delivery. Document uploads need headroom below 100 MiB; media codecs must meet Meta's requirements.

Known coverage limits: parameterized template sends have automated payload coverage but no live approved parameterized template was available. Live checks use Meta test assets and do not establish production throughput or compatibility with every client/device.
