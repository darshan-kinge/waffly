import type { ResolvedWhatsAppConfig } from "../config.js";
import { WhatsAppError, WhatsAppValidationError } from "../errors.js";
import type { SendMessageResponse, SendMessageResult } from "../types/index.js";
import type { HttpClient } from "../utils/http.js";

export interface SendTextInput {
  to: string;
  text: string;
  previewUrl?: boolean;
  replyTo?: string;
  phoneNumberId?: string;
  signal?: AbortSignal;
}

export interface TemplateTextParameter {
  type: "text";
  text: string;
  parameterName?: string;
}

export interface TemplateCurrencyParameter {
  type: "currency";
  currency: { fallbackValue: string; code: string; amount1000: number };
}

export interface TemplateDateTimeParameter {
  type: "date_time";
  dateTime: { fallbackValue: string };
}

export interface TemplateMediaParameter {
  type: "image" | "video" | "document";
  media: { id?: string; link?: string; filename?: string };
}

export interface TemplatePayloadParameter {
  type: "payload";
  payload: string;
}

export type TemplateParameter =
  | TemplateTextParameter
  | TemplateCurrencyParameter
  | TemplateDateTimeParameter
  | TemplateMediaParameter
  | TemplatePayloadParameter;

export type TemplateComponent =
  | { type: "header" | "body"; parameters: TemplateParameter[] }
  | { type: "button"; subType: "quick_reply" | "url"; index: number; parameters: TemplateParameter[] };

export interface SendTemplateInput {
  to: string;
  name: string;
  languageCode: string;
  components?: TemplateComponent[];
  phoneNumberId?: string;
  signal?: AbortSignal;
}

export interface MediaReference {
  id?: string;
  link?: string;
}

interface SendMediaInput extends MediaReference {
  to: string;
  caption?: string;
  replyTo?: string;
  phoneNumberId?: string;
  signal?: AbortSignal;
}

export interface SendImageInput extends SendMediaInput {}
export interface SendVideoInput extends SendMediaInput {}
export interface SendDocumentInput extends SendMediaInput { filename?: string }
export type SendAudioInput = Omit<SendMediaInput, "caption">;

export interface SendLocationInput {
  to: string;
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  replyTo?: string;
  phoneNumberId?: string;
  signal?: AbortSignal;
}

export interface ContactAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  countryCode?: string;
  type?: "HOME" | "WORK";
}

export interface ContactCard {
  name: {
    formattedName: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    suffix?: string;
    prefix?: string;
  };
  addresses?: ContactAddress[];
  birthday?: string;
  emails?: Array<{ email: string; type?: "HOME" | "WORK" }>;
  organization?: { company?: string; department?: string; title?: string };
  phones?: Array<{ phone: string; waId?: string; type?: "CELL" | "MAIN" | "IPHONE" | "HOME" | "WORK" }>;
  urls?: Array<{ url: string; type?: "HOME" | "WORK" }>;
}

export interface SendContactsInput {
  to: string;
  contacts: ContactCard[];
  replyTo?: string;
  phoneNumberId?: string;
  signal?: AbortSignal;
}

function serializeTemplateParameter(parameter: TemplateParameter): Record<string, unknown> {
  if (parameter.type === "text") {
    if (!parameter.text) throw new WhatsAppValidationError("Template text parameters cannot be empty.");
    return { type: "text", text: parameter.text, ...(parameter.parameterName ? { parameter_name: parameter.parameterName } : {}) };
  }
  if (parameter.type === "currency") {
    const { fallbackValue, code, amount1000 } = parameter.currency;
    if (!fallbackValue || !code || !Number.isInteger(amount1000)) {
      throw new WhatsAppValidationError("Template currency parameters require fallbackValue, code, and an integer amount1000.");
    }
    return { type: "currency", currency: { fallback_value: fallbackValue, code, amount_1000: amount1000 } };
  }
  if (parameter.type === "date_time") {
    if (!parameter.dateTime.fallbackValue) throw new WhatsAppValidationError("Template date-time fallbackValue is required.");
    return { type: "date_time", date_time: { fallback_value: parameter.dateTime.fallbackValue } };
  }
  if (parameter.type === "payload") {
    if (!parameter.payload) throw new WhatsAppValidationError("Template button payload cannot be empty.");
    return { type: "payload", payload: parameter.payload };
  }

  const { id, link, filename } = parameter.media;
  if ((!id && !link) || (id && link)) {
    throw new WhatsAppValidationError(`Template ${parameter.type} parameters require exactly one media id or link.`);
  }
  return { type: parameter.type, [parameter.type]: { ...(id ? { id } : { link }), ...(filename ? { filename } : {}) } };
}

export class MessagesModule {
  constructor(
    private readonly http: HttpClient,
    private readonly config: ResolvedWhatsAppConfig
  ) {}

  async sendText(input: SendTextInput): Promise<SendMessageResult> {
    const phoneNumberId = input.phoneNumberId ?? this.config.phoneNumberId;
    if (!phoneNumberId) {
      throw new WhatsAppValidationError(
        "Phone Number ID must be provided in client configuration or the request."
      );
    }

    const to = input.to.trim();
    if (!to) throw new WhatsAppValidationError("Text message recipient is required.");
    if (!input.text) throw new WhatsAppValidationError("Text message body is required.");
    if (input.text.length > 4096) {
      throw new WhatsAppValidationError("Text message body cannot exceed 4096 characters.");
    }

    const raw = await this.http.request<SendMessageResponse>({
      method: "POST",
      path: `${phoneNumberId}/messages`,
      signal: input.signal,
      body: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          body: input.text,
          ...(input.previewUrl === undefined ? {} : { preview_url: input.previewUrl }),
        },
        ...(input.replyTo ? { context: { message_id: input.replyTo } } : {}),
      },
    });

    const messageId = raw.messages?.[0]?.id;
    if (!messageId) {
      throw new WhatsAppError("Meta returned a successful response without a message ID.");
    }

    return { messageId, recipientId: raw.contacts?.[0]?.wa_id, raw };
  }

  async sendTemplate(input: SendTemplateInput): Promise<SendMessageResult> {
    const phoneNumberId = input.phoneNumberId ?? this.config.phoneNumberId;
    if (!phoneNumberId) throw new WhatsAppValidationError("Phone Number ID must be provided in client configuration or the request.");
    const to = input.to.trim();
    const name = input.name.trim();
    const languageCode = input.languageCode.trim();
    if (!to) throw new WhatsAppValidationError("Template message recipient is required.");
    if (!name) throw new WhatsAppValidationError("Template name is required.");
    if (!languageCode) throw new WhatsAppValidationError("Template language code is required.");

    const components = input.components?.map((component) => {
      if (!component.parameters.length) throw new WhatsAppValidationError("Template components must contain parameters.");
      return {
        type: component.type,
        ...(component.type === "button" ? { sub_type: component.subType, index: String(component.index) } : {}),
        parameters: component.parameters.map(serializeTemplateParameter),
      };
    });
    const raw = await this.http.request<SendMessageResponse>({
      method: "POST",
      path: `${phoneNumberId}/messages`,
      signal: input.signal,
      body: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name,
          language: { code: languageCode },
          ...(components?.length ? { components } : {}),
        },
      },
    });
    const messageId = raw.messages?.[0]?.id;
    if (!messageId) throw new WhatsAppError("Meta returned a successful response without a message ID.");
    return { messageId, recipientId: raw.contacts?.[0]?.wa_id, raw };
  }

  sendImage(input: SendImageInput): Promise<SendMessageResult> {
    return this.sendMedia("image", input);
  }

  sendDocument(input: SendDocumentInput): Promise<SendMessageResult> {
    return this.sendMedia("document", input);
  }

  sendVideo(input: SendVideoInput): Promise<SendMessageResult> {
    return this.sendMedia("video", input);
  }

  sendAudio(input: SendAudioInput): Promise<SendMessageResult> {
    return this.sendMedia("audio", input);
  }

  async sendLocation(input: SendLocationInput): Promise<SendMessageResult> {
    if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
      throw new WhatsAppValidationError("Location latitude must be between -90 and 90.");
    }
    if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
      throw new WhatsAppValidationError("Location longitude must be between -180 and 180.");
    }
    return this.sendStructured("location", input, {
      latitude: input.latitude,
      longitude: input.longitude,
      ...(input.name ? { name: input.name } : {}),
      ...(input.address ? { address: input.address } : {}),
    });
  }

  async sendContacts(input: SendContactsInput): Promise<SendMessageResult> {
    if (!input.contacts.length || input.contacts.length > 257) {
      throw new WhatsAppValidationError("Contact messages require between 1 and 257 contacts.");
    }
    const contacts = input.contacts.map((contact) => {
      if (!contact.name.formattedName.trim()) throw new WhatsAppValidationError("Each contact requires name.formattedName.");
      if (contact.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(contact.birthday)) {
        throw new WhatsAppValidationError("Contact birthdays must use YYYY-MM-DD.");
      }
      if (contact.emails?.some(({ email }) => !email.trim())) throw new WhatsAppValidationError("Contact email values cannot be empty.");
      if (contact.phones?.some(({ phone }) => !phone.trim())) throw new WhatsAppValidationError("Contact phone values cannot be empty.");
      if (contact.urls?.some(({ url }) => !url.trim())) throw new WhatsAppValidationError("Contact URL values cannot be empty.");
      return {
        name: {
          formatted_name: contact.name.formattedName,
          ...(contact.name.firstName ? { first_name: contact.name.firstName } : {}),
          ...(contact.name.lastName ? { last_name: contact.name.lastName } : {}),
          ...(contact.name.middleName ? { middle_name: contact.name.middleName } : {}),
          ...(contact.name.suffix ? { suffix: contact.name.suffix } : {}),
          ...(contact.name.prefix ? { prefix: contact.name.prefix } : {}),
        },
        ...(contact.addresses?.length ? { addresses: contact.addresses.map(({ countryCode, ...address }) => ({ ...address, ...(countryCode ? { country_code: countryCode } : {}) })) } : {}),
        ...(contact.birthday ? { birthday: contact.birthday } : {}),
        ...(contact.emails?.length ? { emails: contact.emails } : {}),
        ...(contact.organization ? { org: contact.organization } : {}),
        ...(contact.phones?.length ? { phones: contact.phones.map(({ waId, ...phone }) => ({ ...phone, ...(waId ? { wa_id: waId } : {}) })) } : {}),
        ...(contact.urls?.length ? { urls: contact.urls } : {}),
      };
    });
    return this.sendStructured("contacts", input, contacts);
  }

  private async sendStructured(
    type: "location" | "contacts",
    input: { to: string; replyTo?: string; phoneNumberId?: string; signal?: AbortSignal },
    content: unknown
  ): Promise<SendMessageResult> {
    const phoneNumberId = input.phoneNumberId ?? this.config.phoneNumberId;
    if (!phoneNumberId) throw new WhatsAppValidationError("Phone Number ID must be provided in client configuration or the request.");
    const to = input.to.trim();
    if (!to) throw new WhatsAppValidationError(`${type} message recipient is required.`);
    const raw = await this.http.request<SendMessageResponse>({
      method: "POST",
      path: `${phoneNumberId}/messages`,
      signal: input.signal,
      body: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type,
        [type]: content,
        ...(input.replyTo ? { context: { message_id: input.replyTo } } : {}),
      },
    });
    const messageId = raw.messages?.[0]?.id;
    if (!messageId) throw new WhatsAppError("Meta returned a successful response without a message ID.");
    return { messageId, recipientId: raw.contacts?.[0]?.wa_id, raw };
  }

  private async sendMedia(
    type: "image" | "document" | "video" | "audio",
    input: SendImageInput | SendDocumentInput | SendVideoInput | SendAudioInput
  ): Promise<SendMessageResult> {
    const phoneNumberId = input.phoneNumberId ?? this.config.phoneNumberId;
    if (!phoneNumberId) throw new WhatsAppValidationError("Phone Number ID must be provided in client configuration or the request.");
    const to = input.to.trim();
    if (!to) throw new WhatsAppValidationError(`${type} message recipient is required.`);
    if ((!input.id && !input.link) || (input.id && input.link)) {
      throw new WhatsAppValidationError(`${type} messages require exactly one media id or link.`);
    }
    if ("caption" in input && input.caption && input.caption.length > 1024) {
      throw new WhatsAppValidationError(`${type} message caption cannot exceed 1024 characters.`);
    }
    const media = {
      ...(input.id ? { id: input.id } : { link: input.link }),
      ...("caption" in input && input.caption ? { caption: input.caption } : {}),
      ...(type === "document" && "filename" in input && input.filename ? { filename: input.filename } : {}),
    };
    const raw = await this.http.request<SendMessageResponse>({
      method: "POST",
      path: `${phoneNumberId}/messages`,
      signal: input.signal,
      body: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type,
        [type]: media,
        ...(input.replyTo ? { context: { message_id: input.replyTo } } : {}),
      },
    });
    const messageId = raw.messages?.[0]?.id;
    if (!messageId) throw new WhatsAppError("Meta returned a successful response without a message ID.");
    return { messageId, recipientId: raw.contacts?.[0]?.wa_id, raw };
  }
}
