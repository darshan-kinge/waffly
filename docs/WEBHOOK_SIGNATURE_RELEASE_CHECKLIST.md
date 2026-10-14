# Webhook Signature and Release Checklist

Use this checklist to isolate Meta webhook-signature problems and verify the SDK before publishing.

## 1. Create a fresh Meta test app

A fresh app eliminates stale webhook signing state.

1. Open the [Meta App Dashboard](https://developers.facebook.com/apps).
2. Select **Create App**.
3. Choose the WhatsApp business use case.
4. Add the **WhatsApp** product.
5. Open **App settings → Basic** and record the App ID and App Secret.
6. Open **WhatsApp → API Setup** and record:
   - Temporary access token
   - Phone Number ID
   - WhatsApp Business Account ID
   - Test business phone number
7. Add the intended recipient as an allowed test recipient if Meta requests it.

Use Meta's test number initially. Do not change the existing app until the fresh app passes.

## 2. Configure the local environment

Update `.env` using credentials from the same Meta app and WABA:

```env
WHATSAPP_ACCESS_TOKEN=your_new_access_token
WHATSAPP_PHONE_NUMBER_ID=your_new_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_new_waba_id
WHATSAPP_APP_SECRET=your_new_app_secret
WHATSAPP_VERIFY_TOKEN=choose_a_long_random_value
WHATSAPP_API_VERSION=v26.0
WHATSAPP_WEBHOOK_SKIP_SIGNATURE=false
PORT=3000
```

Never commit the app secret or access token.

## 3. Remove stale session variables

Existing Windows environment variables can override `.env`. In a new PowerShell window, run:

```powershell
Remove-Item Env:WHATSAPP_ACCESS_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:WHATSAPP_PHONE_NUMBER_ID -ErrorAction SilentlyContinue
Remove-Item Env:WHATSAPP_BUSINESS_ACCOUNT_ID -ErrorAction SilentlyContinue
Remove-Item Env:WHATSAPP_APP_SECRET -ErrorAction SilentlyContinue
Remove-Item Env:WHATSAPP_VERIFY_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:WHATSAPP_WEBHOOK_SKIP_SIGNATURE -ErrorAction SilentlyContinue
```

This clears variables only from the current terminal session.

## 4. Build and start the webhook server

From the repository root:

```powershell
npm run build
node --env-file=.env examples/webhook-server.mjs
```

Expected output:

```text
Webhook server listening at http://localhost:3000/webhook
```

The following warning must not appear:

```text
Webhook signature verification is disabled for local testing.
```

If it appears, confirm `WHATSAPP_WEBHOOK_SKIP_SIGNATURE=false` and restart the server.

## 5. Start ngrok

In another terminal:

```powershell
ngrok http 3000
```

Copy the HTTPS forwarding address. If ngrok gives you:

```text
https://example.ngrok-free.app
```

use this callback URL:

```text
https://example.ngrok-free.app/webhook
```

Keep ngrok and the webhook server running.

## 6. Configure the Meta webhook

1. Open **WhatsApp → Configuration** in the new Meta app.
2. Configure the webhook callback.
3. Set **Callback URL** to the ngrok URL ending in `/webhook`.
4. Set **Verify token** to the exact `WHATSAPP_VERIFY_TOKEN` value from `.env`.
5. Select **Verify and save**.
6. Find the `messages` field.
7. Select Graph API version `v26.0`.
8. Enable **Subscribed**.

Meta verifies the endpoint using a GET request containing `hub.mode`, `hub.verify_token`, and `hub.challenge`. The endpoint must validate the token and return the challenge with HTTP 200.

Official reference: [Create a webhook endpoint](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint).

## 7. Subscribe the app to the WABA

The app-level field subscription and WABA subscription are separate.

```http
POST https://graph.facebook.com/v26.0/{WABA_ID}/subscribed_apps
Authorization: Bearer {ACCESS_TOKEN}
```

Expected response:

```json
{
  "success": true
}
```

Verify the subscription:

```http
GET https://graph.facebook.com/v26.0/{WABA_ID}/subscribed_apps
Authorization: Bearer {ACCESS_TOKEN}
```

The response should identify the new app.

Official reference: [Subscribed Apps API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/subscribed-apps-api).

## 8. Run the dashboard webhook test

1. Find the `messages` webhook field.
2. Select **Test**.
3. Choose **Incoming Message**.
4. Select **Send to server v26.0**.

The local server should print a normalized event containing:

```json
{
  "event": "message.received",
  "messageType": "text"
}
```

Open the ngrok inspector at `http://127.0.0.1:4040`. The newest request must show:

```text
POST /webhook
200 OK
```

The request must pass while `WHATSAPP_WEBHOOK_SKIP_SIGNATURE=false`. A 200 response with the bypass enabled does not validate Meta's signature.

## 9. Test real messages and statuses

Send an approved template through the SDK:

```typescript
const result = await client.messages.sendTemplate({
  to: "RECIPIENT_NUMBER",
  name: "hello_world",
  languageCode: "en_US",
});

console.log(result.messageId);
```

Confirm:

1. Meta accepts the request.
2. The phone receives the message.
3. The webhook receives `message.sent`.
4. The webhook receives `message.delivered`.
5. Reading the message produces `message.read` when read receipts are available.
6. Every webhook POST returns HTTP 200 with signature bypass disabled.
7. Replying from the recipient produces a verified `message.received` event.

## 10. Diagnose continued signature failures

Verify:

- App ID and App Secret belong to the same app.
- The callback is configured inside that app.
- The access token belongs to that app.
- The WABA subscription identifies that app.
- The webhook process was restarted after `.env` changed.
- The handler hashes the original raw bytes before parsing JSON.
- Ngrok forwards directly to port 3000.
- No proxy or middleware decompresses, parses, or rewrites the body.

Do not enable the signature bypass as a production workaround.

If a fresh app's dashboard test still fails, retain this diagnostic information for Meta Support:

- Meta App ID
- Graph API version
- UTC timestamp
- `fbtrace_id`, when provided
- ngrok request ID
- SHA-256 hash of the received body
- Received webhook signature
- Locally computed signature

Never include the App Secret or access token in a support request.

## 11. Run release checks

After signature verification succeeds:

```powershell
npm test
npm run typecheck
npm run build
```

Expected results:

- All tests pass.
- Type checking passes.
- ESM and CommonJS builds pass.
- Declaration generation passes.

Rebuild the package:

```powershell
npm pack
```

Install it into a clean sample project:

```powershell
npm install C:\whatsapp_api\waffly-0.1.0.tgz
```

Verify ESM:

```javascript
import { WhatsAppClient } from "waffly";
```

Verify CommonJS:

```javascript
const { WhatsAppClient } = require("waffly");
```

## 12. Final release gate

Publish only when all conditions are satisfied:

- Dashboard test webhook returns HTTP 200 without bypass.
- Real incoming webhook returns HTTP 200 without bypass.
- Sent and delivered statuses are received.
- Text and template live sends succeed.
- Media upload, retrieval, and deletion succeed.
- Tests, type checking, and build pass.
- The tarball works with ESM, CommonJS, and TypeScript.
- No credentials are included in the package.
- `.env` is excluded.
- `WHATSAPP_WEBHOOK_SKIP_SIGNATURE` is false.

Stop after creating and reviewing the verified tarball. Publishing to npm requires explicit approval.
