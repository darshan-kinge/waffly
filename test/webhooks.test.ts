import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  parseWebhookEvents,
  parseWebhookStatusEvents,
  verifyWebhookChallenge,
  verifyWebhookSignature,
  WhatsAppValidationError,
} from "../src/index.js";

describe("webhook helpers", () => {
  it("verifies a subscription challenge", () => {
    expect(verifyWebhookChallenge({
      mode: "subscribe",
      verifyToken: "verify-me",
      challenge: "1158201444",
      expectedVerifyToken: "verify-me",
    })).toBe("1158201444");
    expect(verifyWebhookChallenge({
      mode: "subscribe",
      verifyToken: "wrong",
      challenge: "1158201444",
      expectedVerifyToken: "verify-me",
    })).toBeNull();
  });

  it("verifies the exact raw body signature", () => {
    const rawBody = Buffer.from('{"object":"whatsapp_business_account","entry":[]}');
    const appSecret = "app-secret";
    const signature = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;

    expect(verifyWebhookSignature({ rawBody, signature, appSecret })).toBe(true);
    expect(verifyWebhookSignature({ rawBody: Buffer.from("tampered"), signature, appSecret })).toBe(false);
    expect(verifyWebhookSignature({ rawBody, signature: "invalid", appSecret })).toBe(false);
  });

  it("parses known, failed, and future status values across entries", () => {
    const rawBody = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-1",
          changes: [{
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-1" },
              statuses: [
                { id: "wamid.1", status: "delivered", timestamp: "1750263773", recipient_id: "1555" },
                {
                  id: "wamid.2",
                  status: "failed",
                  timestamp: "1750263774",
                  recipient_id: "1666",
                  errors: [{ code: 131026, title: "Undeliverable", error_data: { details: "Failed" } }],
                },
              ],
            },
          }],
        },
        {
          id: "waba-2",
          changes: [{
            field: "messages",
            value: { statuses: [{ id: "wamid.3", status: "future", timestamp: "1", recipient_id: "1777" }] },
          }],
        },
      ],
    });

    const events = parseWebhookStatusEvents(rawBody);
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ event: "message.delivered", messageId: "wamid.1", status: "delivered", isKnownStatus: true });
    expect(events[1]?.errors?.[0]).toEqual({
      code: 131026,
      title: "Undeliverable",
      message: undefined,
      details: "Failed",
    });
    expect(events[2]).toMatchObject({ event: "message.status", status: "future", isKnownStatus: false });
  });

  it("normalizes incoming text messages and statuses", () => {
    const events = parseWebhookEvents(JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{
        id: "waba-1",
        changes: [{
          field: "messages",
          value: {
            metadata: { phone_number_id: "phone-1" },
            contacts: [{ profile: { name: "Sheena" }, wa_id: "1555" }],
            messages: [{
              from: "1555",
              id: "wamid.incoming",
              timestamp: "1749416383",
              type: "text",
              text: { body: "Hello" },
            }],
            statuses: [{ id: "wamid.sent", status: "sent", timestamp: "1749416384", recipient_id: "1666" }],
          },
        }],
      }],
    }));

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ event: "message.sent", messageId: "wamid.sent" });
    expect(events[1]).toMatchObject({
      event: "message.received",
      messageId: "wamid.incoming",
      from: "1555",
      text: "Hello",
      contactName: "Sheena",
    });
  });

  it("normalizes incoming media, location, and contacts", () => {
    const messages = [
      { from: "1555", id: "image-1", timestamp: "1", type: "image", image: { id: "media-1", mime_type: "image/jpeg", sha256: "hash", caption: "Photo" } },
      { from: "1555", id: "document-1", timestamp: "2", type: "document", document: { id: "media-2", filename: "file.pdf" } },
      { from: "1555", id: "video-1", timestamp: "3", type: "video", video: { id: "media-3" } },
      { from: "1555", id: "audio-1", timestamp: "4", type: "audio", audio: { id: "media-4", voice: true } },
      { from: "1555", id: "location-1", timestamp: "5", type: "location", location: { latitude: 28.6, longitude: 77.2, name: "Delhi" } },
      { from: "1555", id: "contacts-1", timestamp: "6", type: "contacts", contacts: [{ name: { formatted_name: "Alex" } }] },
    ];
    const events = parseWebhookEvents(JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{ id: "waba-1", changes: [{ field: "messages", value: { messages } }] }],
    }));

    expect(events).toHaveLength(6);
    expect(events[0]).toMatchObject({ messageType: "image", mediaId: "media-1", mimeType: "image/jpeg", caption: "Photo" });
    expect(events[1]).toMatchObject({ messageType: "document", filename: "file.pdf" });
    expect(events[2]).toMatchObject({ messageType: "video", mediaId: "media-3" });
    expect(events[3]).toMatchObject({ messageType: "audio", voice: true });
    expect(events[4]).toMatchObject({ messageType: "location", latitude: 28.6, longitude: 77.2, name: "Delhi" });
    expect(events[5]).toMatchObject({ messageType: "contacts", contacts: [{ name: { formatted_name: "Alex" } }] });
  });

  it("normalizes interactive replies, errors, context, and unknown messages", () => {
    const events = parseWebhookEvents(JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{
        id: "waba-1",
        changes: [{
          field: "messages",
          value: {
            metadata: { phone_number_id: "phone-1" },
            errors: [{ code: 131000, title: "Provider error", error_data: { details: "Try later" } }],
            messages: [
              {
                from: "1555", id: "interactive-1", timestamp: "1", type: "interactive",
                context: { id: "original-1", from: "1666" },
                interactive: { type: "list_reply", list_reply: { id: "choice-1", title: "Choice", description: "Details" } },
              },
              { from: "1555", id: "button-1", timestamp: "2", type: "button", button: { payload: "yes", text: "Yes" } },
              { from: "1555", id: "future-1", timestamp: "3", type: "future_type", future_type: { value: true } },
            ],
          },
        }],
      }],
    }));

    expect(events).toHaveLength(4);
    expect(events[0]).toMatchObject({ event: "webhook.error", errors: [{ code: 131000, details: "Try later" }] });
    expect(events[1]).toMatchObject({ messageType: "interactive", interactionType: "list_reply", selectionId: "choice-1", contextMessageId: "original-1" });
    expect(events[2]).toMatchObject({ messageType: "button", interactionType: "quick_reply", selectionId: "yes" });
    expect(events[3]).toMatchObject({ messageType: "future_type", unsupported: true });
  });

  it("normalizes template lifecycle updates without restricting Meta enums", () => {
    const events = parseWebhookEvents(JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{
        id: "waba-1",
        changes: [
          { field: "message_template_status_update", value: { message_template_id: 123, message_template_name: "order_update", message_template_language: "en_US", event: "APPROVED", reason: "NONE" } },
          { field: "message_template_quality_update", value: { message_template_id: "123", new_quality_score: "GREEN", previous_quality_score: "UNKNOWN" } },
          { field: "message_template_components_update", value: { message_template_id: "123", message_template_element: "Updated", message_template_title: "Title", message_template_footer: "Footer", message_template_buttons: [{ message_template_button_type: "URL", message_template_button_text: "Visit", message_template_button_url: "https://example.com" }] } },
          { field: "template_category_update", value: { message_template_id: "123", new_category: "UTILITY", previous_category: "MARKETING" } },
          { field: "template_category_update", value: { message_template_id: "123", new_category: "UTILITY", correct_category: "MARKETING", category_update_timestamp: 1746169200 } },
        ],
      }],
    }));

    expect(events).toHaveLength(5);
    expect(events[0]).toMatchObject({ event: "template.status.updated", templateId: "123", status: "APPROVED" });
    expect(events[1]).toMatchObject({ event: "template.quality.updated", qualityScore: "GREEN", previousQualityScore: "UNKNOWN" });
    expect(events[2]).toMatchObject({ event: "template.components.updated", components: [
      { type: "HEADER", text: "Title" }, { type: "BODY", text: "Updated" }, { type: "FOOTER", text: "Footer" },
      { type: "BUTTONS", buttons: [{ message_template_button_type: "URL", message_template_button_text: "Visit", message_template_button_url: "https://example.com" }] },
    ] });
    expect(events[3]).toMatchObject({ event: "template.category.updated", category: "UTILITY", previousCategory: "MARKETING" });
    expect(events[3]).toMatchObject({ pendingCategory: undefined, categoryUpdateTimestamp: undefined });
    expect(events[4]).toMatchObject({ category: "UTILITY", pendingCategory: "MARKETING", categoryUpdateTimestamp: 1746169200 });
  });

  it("rejects malformed JSON", () => {
    expect(() => parseWebhookStatusEvents("{")).toThrow(WhatsAppValidationError);
  });
});
