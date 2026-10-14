# Overview & Installation

Waffly is a lightweight, zero-dependency TypeScript SDK for the **Meta WhatsApp Cloud API**. It provides typed message sending, media uploads, template catalog reads, and cryptographic webhook verification for Node.js 20+, Bun, and Deno.

---

## Requirements

- **Node.js**: `20.0.0` or higher (also compatible with Bun and Deno)
- Native **ESM** (`import`) and **CommonJS** (`require`) dual builds
- TypeScript declaration files included (`.d.ts`, `.d.mts`)
- **Zero runtime dependencies**

---

## Installation

::: code-group

```bash [npm]
npm install waffly
```

```bash [pnpm]
pnpm add waffly
```

```bash [yarn]
yarn add waffly
```

```bash [bun]
bun add waffly
```

:::

---

## Meta Credentials Checklist

Before using Waffly, set up a Meta Developer App with the WhatsApp product and collect the following credentials:

```dotenv
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_or_temporary_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
WHATSAPP_APP_SECRET=your_meta_app_secret
WHATSAPP_VERIFY_TOKEN=a_custom_token_you_choose
WHATSAPP_API_VERSION=v26.0
```

> [!NOTE]
> - **Phone Number ID** is the ID of your sender number (distinct from the actual phone digits and App ID).
> - **WABA ID** is your WhatsApp Business Account ID.
> - Message operations require `whatsapp_business_messaging` permission.
> - Template reads require `whatsapp_business_management` permission.

---

## Basic Usage

### ESM (`import`)

```typescript
import { WhatsAppClient } from "waffly";

const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
});

const result = await client.messages.sendText({
  to: "15551234567",
  text: "Hello from Waffly!",
});

console.log("Accepted message ID:", result.messageId);
```

### CommonJS (`require`)

```javascript
const { WhatsAppClient } = require("waffly");

const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
});
```
