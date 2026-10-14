import type { ResolvedWhatsAppConfig } from "../config.js";
import { WhatsAppValidationError } from "../errors.js";
import type { HttpClient } from "../utils/http.js";

const limits = new Map<string, number>([
  ["image/jpeg", 5], ["image/png", 5],
  ["audio/aac", 16], ["audio/amr", 16], ["audio/mpeg", 16], ["audio/mp4", 16], ["audio/ogg", 16],
  ["video/mp4", 16], ["video/3gpp", 16],
  ["text/plain", 100], ["application/pdf", 100], ["application/msword", 100],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", 100],
  ["application/vnd.ms-excel", 100],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 100],
  ["application/vnd.ms-powerpoint", 100],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", 100],
]);

export interface UploadMediaInput {
  file: Blob;
  mimeType: string;
  filename?: string;
  phoneNumberId?: string;
  signal?: AbortSignal;
}

export interface MediaMetadata {
  id: string;
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  messaging_product: "whatsapp";
}

export class MediaModule {
  constructor(private readonly http: HttpClient, private readonly config: ResolvedWhatsAppConfig) {}

  async upload(input: UploadMediaInput): Promise<{ id: string }> {
    const phoneNumberId = input.phoneNumberId ?? this.config.phoneNumberId;
    if (!phoneNumberId) throw new WhatsAppValidationError("Phone Number ID must be provided in client configuration or the request.");
    const maxMb = limits.get(input.mimeType);
    if (!maxMb) throw new WhatsAppValidationError(`Unsupported WhatsApp media type: ${input.mimeType}.`);
    if (input.file.size > maxMb * 1024 * 1024) throw new WhatsAppValidationError(`${input.mimeType} media cannot exceed ${maxMb} MB.`);
    const form = new FormData();
    form.set("messaging_product", "whatsapp");
    form.set("type", input.mimeType);
    form.set("file", input.file, input.filename ?? "media");
    return this.http.request({ method: "POST", path: `${phoneNumberId}/media`, form, signal: input.signal });
  }

  retrieve(mediaId: string, input: { phoneNumberId?: string; signal?: AbortSignal } = {}): Promise<MediaMetadata> {
    if (!mediaId.trim()) throw new WhatsAppValidationError("Media ID is required.");
    const query = input.phoneNumberId ? `?phone_number_id=${encodeURIComponent(input.phoneNumberId)}` : "";
    return this.http.request({ method: "GET", path: `${mediaId}${query}`, signal: input.signal });
  }

  delete(mediaId: string, input: { phoneNumberId?: string; signal?: AbortSignal } = {}): Promise<{ success: boolean }> {
    if (!mediaId.trim()) throw new WhatsAppValidationError("Media ID is required.");
    const query = input.phoneNumberId ? `?phone_number_id=${encodeURIComponent(input.phoneNumberId)}` : "";
    return this.http.request({ method: "DELETE", path: `${mediaId}${query}`, signal: input.signal });
  }
}
