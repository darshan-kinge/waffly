import assert from "node:assert";
import { createHmac } from "node:crypto";
import {
  WhatsAppClient,
  verifyWebhookChallenge,
  verifyWebhookSignature,
  parseWebhookEvents,
  WhatsAppValidationError,
  DEFAULT_GRAPH_API_VERSION,
} from "waffly";

console.log("Testing runtime compatibility with waffly...");

// 1. Export constants
assert.strictEqual(DEFAULT_GRAPH_API_VERSION, "v26.0", "DEFAULT_GRAPH_API_VERSION should be v26.0");

// 2. Client instantiation
const client = new WhatsAppClient({
  accessToken: "test_token_12345",
  phoneNumberId: "1234567890",
});
assert.ok(client.messages, "client.messages must be defined");
assert.ok(client.media, "client.media must be defined");
assert.ok(client.templates, "client.templates must be defined");

// 3. Webhook challenge verification (GET)
const challenge = verifyWebhookChallenge({
  mode: "subscribe",
  verifyToken: "test_verify_token",
  challenge: "challenge_response_code",
  expectedVerifyToken: "test_verify_token",
});
assert.strictEqual(challenge, "challenge_response_code", "Challenge must match");

// 4. Webhook signature verification (POST with timing-safe HMAC)
const rawBody = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA_ID_123",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { phone_number_id: "1234567890" },
            messages: [
              {
                id: "wamid.TEST1234",
                from: "15551234567",
                timestamp: "1728900000",
                type: "text",
                text: { body: "Hello from multi-runtime test" },
              },
            ],
          },
        },
      ],
    },
  ],
});

const appSecret = "super_secret_app_key";
const signature = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");

const isValid = verifyWebhookSignature({
  rawBody,
  signature,
  appSecret,
});
assert.strictEqual(isValid, true, "Signature verification must succeed");

// 5. Parse normalized events
const events = parseWebhookEvents(rawBody);
assert.strictEqual(events.length, 1, "Must parse 1 normalized event");
assert.strictEqual(events[0].event, "message.received");
if (events[0].event === "message.received" && events[0].messageType === "text") {
  assert.strictEqual(events[0].text, "Hello from multi-runtime test");
  assert.strictEqual(events[0].from, "15551234567");
} else {
  assert.fail("Event must be normalized text message");
}

// 6. Error inheritance
assert.throws(
  () => {
    throw new WhatsAppValidationError("Validation test");
  },
  WhatsAppValidationError,
  "Should throw and catch WhatsAppValidationError"
);

console.log("✅ Runtime smoke test passed successfully!");
