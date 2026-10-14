import { createHmac, timingSafeEqual } from "node:crypto";
import { WhatsAppValidationError } from "./errors.js";

export type WhatsAppMessageStatus = "sent" | "delivered" | "read" | "failed";

export interface WebhookStatusError {
  code: number;
  title?: string;
  message?: string;
  details?: string;
}

export interface WebhookStatusEvent {
  event: "message.sent" | "message.delivered" | "message.read" | "message.failed" | "message.status";
  wabaId: string;
  phoneNumberId?: string;
  messageId: string;
  recipientId: string;
  status: string;
  isKnownStatus: boolean;
  timestamp: string;
  errors?: WebhookStatusError[];
  raw: Record<string, unknown>;
}

interface WebhookReceivedMessageEvent {
  event: "message.received";
  wabaId: string;
  phoneNumberId?: string;
  messageId: string;
  from: string;
  timestamp: string;
  contactName?: string;
  contextMessageId?: string;
  contextFrom?: string;
  raw: Record<string, unknown>;
}

export interface WebhookTextMessageEvent extends WebhookReceivedMessageEvent {
  messageType: "text";
  text: string;
}

export interface WebhookMediaMessageEvent extends WebhookReceivedMessageEvent {
  messageType: "image" | "document" | "video" | "audio";
  mediaId: string;
  mimeType?: string;
  sha256?: string;
  caption?: string;
  filename?: string;
  voice?: boolean;
}

export interface WebhookLocationMessageEvent extends WebhookReceivedMessageEvent {
  messageType: "location";
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface WebhookContactsMessageEvent extends WebhookReceivedMessageEvent {
  messageType: "contacts";
  contacts: Record<string, unknown>[];
}

export interface WebhookInteractiveMessageEvent extends WebhookReceivedMessageEvent {
  messageType: "interactive" | "button";
  interactionType: "button_reply" | "list_reply" | "quick_reply";
  selectionId: string;
  title: string;
  description?: string;
}

export interface WebhookUnknownMessageEvent extends WebhookReceivedMessageEvent {
  messageType: string;
  unsupported: true;
}

export interface WebhookErrorEvent {
  event: "webhook.error";
  wabaId: string;
  phoneNumberId?: string;
  messageId?: string;
  errors: WebhookStatusError[];
  raw: Record<string, unknown>;
}

export interface WebhookTemplateEvent {
  event: "template.status.updated" | "template.quality.updated" | "template.components.updated" | "template.category.updated";
  wabaId: string;
  templateId?: string;
  templateName?: string;
  language?: string;
  status?: string;
  reason?: string;
  qualityScore?: string;
  previousQualityScore?: string;
  category?: string;
  previousCategory?: string;
  pendingCategory?: string;
  categoryUpdateTimestamp?: number;
  components?: unknown[];
  raw: Record<string, unknown>;
}

export type WebhookEvent =
  | WebhookStatusEvent
  | WebhookTextMessageEvent
  | WebhookMediaMessageEvent
  | WebhookLocationMessageEvent
  | WebhookContactsMessageEvent
  | WebhookInteractiveMessageEvent
  | WebhookUnknownMessageEvent
  | WebhookErrorEvent
  | WebhookTemplateEvent;

export interface WebhookChallengeInput {
  mode?: string;
  verifyToken?: string;
  challenge?: string;
  expectedVerifyToken: string;
}

function equalSecret(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyWebhookChallenge(input: WebhookChallengeInput): string | null {
  if (
    input.mode !== "subscribe" ||
    !input.verifyToken ||
    !input.challenge ||
    !equalSecret(input.verifyToken, input.expectedVerifyToken)
  ) {
    return null;
  }
  return input.challenge;
}

export function verifyWebhookSignature(input: {
  rawBody: string | Uint8Array;
  signature: string;
  appSecret: string;
}): boolean {
  if (!input.signature.startsWith("sha256=") || !input.appSecret) return false;
  const suppliedHex = input.signature.slice(7);
  if (!/^[a-f0-9]{64}$/i.test(suppliedHex)) return false;

  const expected = createHmac("sha256", input.appSecret).update(input.rawBody).digest();
  const supplied = Buffer.from(suppliedHex, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

const knownStatuses = new Set<WhatsAppMessageStatus>(["sent", "delivered", "read", "failed"]);

function parsePayload(rawBody: string | Uint8Array): Record<string, unknown> {
  let payload: unknown;
  try {
    payload = JSON.parse(typeof rawBody === "string" ? rawBody : Buffer.from(rawBody).toString("utf8"));
  } catch {
    throw new WhatsAppValidationError("Webhook body is not valid JSON.");
  }

  if (!payload || typeof payload !== "object") {
    throw new WhatsAppValidationError("Webhook payload must be an object.");
  }
  return payload as Record<string, unknown>;
}

function parseErrors(value: unknown): WebhookStatusError[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((error): WebhookStatusError[] => {
    if (!error || typeof error !== "object") return [];
    const item = error as Record<string, unknown>;
    if (typeof item.code !== "number") return [];
    const errorData = item.error_data as Record<string, unknown> | undefined;
    return [{
      code: item.code,
      title: typeof item.title === "string" ? item.title : undefined,
      message: typeof item.message === "string" ? item.message : undefined,
      details: typeof errorData?.details === "string" ? errorData.details : undefined,
    }];
  });
}

export function parseWebhookStatusEvents(rawBody: string | Uint8Array): WebhookStatusEvent[] {
  const root = parsePayload(rawBody);
  if (root.object !== "whatsapp_business_account") return [];
  const events: WebhookStatusEvent[] = [];

  for (const entry of Array.isArray(root.entry) ? root.entry : []) {
    if (!entry || typeof entry !== "object") continue;
    const entryRecord = entry as Record<string, unknown>;
    const wabaId = typeof entryRecord.id === "string" ? entryRecord.id : "";
    for (const change of Array.isArray(entryRecord.changes) ? entryRecord.changes : []) {
      if (!change || typeof change !== "object") continue;
      const changeRecord = change as Record<string, unknown>;
      if (changeRecord.field !== "messages" || !changeRecord.value || typeof changeRecord.value !== "object") {
        continue;
      }
      const value = changeRecord.value as Record<string, unknown>;
      const metadata = value.metadata as Record<string, unknown> | undefined;
      const phoneNumberId = typeof metadata?.phone_number_id === "string" ? metadata.phone_number_id : undefined;

      for (const statusValue of Array.isArray(value.statuses) ? value.statuses : []) {
        if (!statusValue || typeof statusValue !== "object") continue;
        const status = statusValue as Record<string, unknown>;
        if (
          typeof status.id !== "string" ||
          typeof status.status !== "string" ||
          typeof status.timestamp !== "string" ||
          typeof status.recipient_id !== "string"
        ) {
          continue;
        }
        const errors = parseErrors(status.errors);

        events.push({
          event: knownStatuses.has(status.status as WhatsAppMessageStatus)
            ? `message.${status.status}` as WebhookStatusEvent["event"]
            : "message.status",
          wabaId,
          phoneNumberId,
          messageId: status.id,
          recipientId: status.recipient_id,
          status: status.status,
          isKnownStatus: knownStatuses.has(status.status as WhatsAppMessageStatus),
          timestamp: status.timestamp,
          errors: errors.length ? errors : undefined,
          raw: status,
        });
      }
    }
  }

  return events;
}

export function parseWebhookEvents(rawBody: string | Uint8Array): WebhookEvent[] {
  const root = parsePayload(rawBody);
  if (root.object !== "whatsapp_business_account") return [];
  const events: WebhookEvent[] = [...parseWebhookStatusEvents(rawBody)];

  for (const entry of Array.isArray(root.entry) ? root.entry : []) {
    if (!entry || typeof entry !== "object") continue;
    const entryRecord = entry as Record<string, unknown>;
    const wabaId = typeof entryRecord.id === "string" ? entryRecord.id : "";
    for (const change of Array.isArray(entryRecord.changes) ? entryRecord.changes : []) {
      if (!change || typeof change !== "object") continue;
      const changeRecord = change as Record<string, unknown>;
      const templateEventNames: Record<string, WebhookTemplateEvent["event"]> = {
        message_template_status_update: "template.status.updated",
        message_template_quality_update: "template.quality.updated",
        message_template_components_update: "template.components.updated",
        template_category_update: "template.category.updated",
      };
      const templateEvent = typeof changeRecord.field === "string" ? templateEventNames[changeRecord.field] : undefined;
      if (templateEvent && changeRecord.value && typeof changeRecord.value === "object") {
        const value = changeRecord.value as Record<string, unknown>;
        events.push({
          event: templateEvent,
          wabaId,
          templateId: typeof value.message_template_id === "string" || typeof value.message_template_id === "number" ? String(value.message_template_id) : undefined,
          templateName: typeof value.message_template_name === "string" ? value.message_template_name : undefined,
          language: typeof value.message_template_language === "string" ? value.message_template_language : undefined,
          status: typeof value.event === "string" ? value.event : undefined,
          reason: typeof value.reason === "string" ? value.reason : undefined,
          qualityScore: typeof value.new_quality_score === "string" ? value.new_quality_score : undefined,
          previousQualityScore: typeof value.previous_quality_score === "string" ? value.previous_quality_score : undefined,
          category: typeof value.new_category === "string" ? value.new_category : undefined,
          previousCategory: typeof value.previous_category === "string" ? value.previous_category : undefined,
          pendingCategory: typeof value.correct_category === "string" ? value.correct_category : undefined,
          categoryUpdateTimestamp: typeof value.category_update_timestamp === "number" ? value.category_update_timestamp : undefined,
          components: templateEvent === "template.components.updated" ? [
            ...(typeof value.message_template_title === "string" ? [{ type: "HEADER", text: value.message_template_title }] : []),
            ...(typeof value.message_template_element === "string" ? [{ type: "BODY", text: value.message_template_element }] : []),
            ...(typeof value.message_template_footer === "string" ? [{ type: "FOOTER", text: value.message_template_footer }] : []),
            ...(Array.isArray(value.message_template_buttons) ? [{ type: "BUTTONS", buttons: value.message_template_buttons }] : []),
          ] : undefined,
          raw: value,
        });
        continue;
      }
      if (changeRecord.field !== "messages" || !changeRecord.value || typeof changeRecord.value !== "object") continue;
      const value = changeRecord.value as Record<string, unknown>;
      const metadata = value.metadata as Record<string, unknown> | undefined;
      const contact = Array.isArray(value.contacts) && value.contacts[0] && typeof value.contacts[0] === "object"
        ? value.contacts[0] as Record<string, unknown>
        : undefined;
      const profile = contact?.profile as Record<string, unknown> | undefined;
      const valueErrors = parseErrors(value.errors);
      if (valueErrors.length) events.push({
        event: "webhook.error",
        wabaId,
        phoneNumberId: typeof metadata?.phone_number_id === "string" ? metadata.phone_number_id : undefined,
        errors: valueErrors,
        raw: value,
      });

      for (const item of Array.isArray(value.messages) ? value.messages : []) {
        if (!item || typeof item !== "object") continue;
        const message = item as Record<string, unknown>;
        const messageErrors = parseErrors(message.errors);
        if (messageErrors.length) events.push({
          event: "webhook.error",
          wabaId,
          phoneNumberId: typeof metadata?.phone_number_id === "string" ? metadata.phone_number_id : undefined,
          messageId: typeof message.id === "string" ? message.id : undefined,
          errors: messageErrors,
          raw: message,
        });
        if (
          typeof message.id !== "string" ||
          typeof message.from !== "string" ||
          typeof message.timestamp !== "string" ||
          typeof message.type !== "string"
        ) continue;
        const context = message.context as Record<string, unknown> | undefined;
        const base = {
          event: "message.received",
          wabaId,
          phoneNumberId: typeof metadata?.phone_number_id === "string" ? metadata.phone_number_id : undefined,
          messageId: message.id,
          from: message.from,
          timestamp: message.timestamp,
          contactName: typeof profile?.name === "string" ? profile.name : undefined,
          contextMessageId: typeof context?.id === "string" ? context.id : undefined,
          contextFrom: typeof context?.from === "string" ? context.from : undefined,
          raw: message,
        } as const;

        if (message.type === "text") {
          const text = message.text as Record<string, unknown> | undefined;
          if (typeof text?.body === "string") events.push({ ...base, messageType: "text", text: text.body });
          continue;
        }
        if (["image", "document", "video", "audio"].includes(message.type)) {
          const media = message[message.type] as Record<string, unknown> | undefined;
          if (typeof media?.id !== "string") continue;
          events.push({
            ...base,
            messageType: message.type as WebhookMediaMessageEvent["messageType"],
            mediaId: media.id,
            mimeType: typeof media.mime_type === "string" ? media.mime_type : undefined,
            sha256: typeof media.sha256 === "string" ? media.sha256 : undefined,
            caption: typeof media.caption === "string" ? media.caption : undefined,
            filename: typeof media.filename === "string" ? media.filename : undefined,
            voice: typeof media.voice === "boolean" ? media.voice : undefined,
          });
          continue;
        }
        if (message.type === "location") {
          const location = message.location as Record<string, unknown> | undefined;
          if (typeof location?.latitude !== "number" || typeof location.longitude !== "number") continue;
          events.push({
            ...base,
            messageType: "location",
            latitude: location.latitude,
            longitude: location.longitude,
            name: typeof location.name === "string" ? location.name : undefined,
            address: typeof location.address === "string" ? location.address : undefined,
          });
          continue;
        }
        if (message.type === "contacts" && Array.isArray(message.contacts)) {
          events.push({
            ...base,
            messageType: "contacts",
            contacts: message.contacts.filter((item): item is Record<string, unknown> => !!item && typeof item === "object"),
          });
          continue;
        }
        if (message.type === "interactive") {
          const interactive = message.interactive as Record<string, unknown> | undefined;
          const interactionType = interactive?.type;
          if (interactionType === "button_reply" || interactionType === "list_reply") {
            const selection = interactive?.[interactionType] as Record<string, unknown> | undefined;
            if (typeof selection?.id === "string" && typeof selection.title === "string") events.push({
              ...base,
              messageType: "interactive",
              interactionType,
              selectionId: selection.id,
              title: selection.title,
              description: typeof selection.description === "string" ? selection.description : undefined,
            });
            continue;
          }
        }
        if (message.type === "button") {
          const button = message.button as Record<string, unknown> | undefined;
          if (typeof button?.payload === "string" && typeof button.text === "string") {
            events.push({ ...base, messageType: "button", interactionType: "quick_reply", selectionId: button.payload, title: button.text });
            continue;
          }
        }
        events.push({ ...base, messageType: message.type, unsupported: true });
      }
    }
  }
  return events;
}
