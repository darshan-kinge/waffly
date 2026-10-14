---
layout: home

hero:
  name: "Waffly"
  text: "WhatsApp integrations, clearly typed."
  tagline: "A lightweight, zero-dependency TypeScript SDK for the Meta WhatsApp Cloud API. Send messages, manage media, inspect templates, and verify webhooks with confidence."
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/darshan-kinge/waffly

features:
  - title: ⚡ Zero Runtime Dependencies
    details: Built on native fetch and standard node:crypto. Dual ESM + CommonJS builds with full Node.js, Bun, and Deno compatibility.
  - title: 🛡️ Fully Typed
    details: Strongly-typed messages, templates, media metadata, webhook events, API responses, and errors.
  - title: 💬 Complete Message Support
    details: Text with link previews and replies, approved templates, media (image, audio, video, doc), locations, and contact cards.
  - title: 🔐 First-Class Webhook Helpers
    details: Timing-safe GET challenge verification, HMAC-SHA256 signature checks, and normalized event streams.
  - title: 🧭 Safe & Conservative Writes
    details: Zero automatic retries on message operations to prevent accidental duplicate message spam or double-charges.
  - title: 🎯 Predictable Error Taxonomy
    details: Distinct error classes (WhatsAppValidationError, WhatsAppApiError, WhatsAppRateLimitError, etc.) with actionable categories.
---
