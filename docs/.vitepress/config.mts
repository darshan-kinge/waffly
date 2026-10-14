import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Waffly",
  description: "A typed, lightweight SDK for the Meta WhatsApp Cloud API",
  base: "/waffly/",
  cleanUrls: true,
  srcExclude: [
    "PACKAGE_GUIDE.md",
    "LIVE_VALIDATION.md",
    "WEBHOOK_SIGNATURE_RELEASE_CHECKLIST.md",
    "brand-guidelines.md",
    "v1-planning/**",
  ],
  themeConfig: {
    siteTitle: "Waffly",
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API Reference", link: "/guide/messages" },
      { text: "Webhooks", link: "/guide/webhooks" },
      {
        text: "v0.1.0",
        items: [
          { text: "Changelog", link: "https://github.com/darshan-kinge/waffly/blob/main/CHANGELOG.md" },
          { text: "npm Package", link: "https://www.npmjs.com/package/waffly" },
        ],
      },
    ],
    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Overview & Installation", link: "/guide/getting-started" },
          { text: "Client Configuration", link: "/guide/configuration" },
        ],
      },
      {
        text: "Core APIs",
        items: [
          { text: "Sending Messages", link: "/guide/messages" },
          { text: "Template Parameters", link: "/guide/template-parameters" },
          { text: "Media Management", link: "/guide/media" },
          { text: "Template Catalog", link: "/guide/template-catalog" },
        ],
      },
      {
        text: "Webhooks & Reliability",
        items: [
          { text: "Webhook Verification & Parsing", link: "/guide/webhooks" },
          { text: "Error Taxonomy", link: "/guide/errors" },
          { text: "Rules & Best Practices", link: "/guide/best-practices" },
        ],
      },
      {
        text: "Support",
        items: [
          { text: "Troubleshooting FAQ", link: "/guide/troubleshooting" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/darshan-kinge/waffly" },
      { icon: "npm", link: "https://www.npmjs.com/package/waffly" },
    ],
    search: {
      provider: "local",
    },
    footer: {
      message: "Released under the MIT License. Independent library not affiliated with Meta.",
      copyright: "Copyright © 2026 Darshan Kinge",
    },
  },
});
