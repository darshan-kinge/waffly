import type { WhatsAppGraphErrorPayload } from "./types/responses.js";

export class WhatsAppError extends Error {
  constructor(
    message: string,
    public readonly category: WhatsAppErrorCategory = "unknown",
    public readonly retryable = false
  ) {
    super(message);
    this.name = "WhatsAppError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type WhatsAppErrorCategory =
  | "validation"
  | "authentication"
  | "authorization"
  | "recipient"
  | "template"
  | "media"
  | "rate_limited"
  | "temporary_provider"
  | "permanent_provider"
  | "transport"
  | "cancelled"
  | "unknown";

export class WhatsAppValidationError extends WhatsAppError {
  constructor(message: string) {
    super(message, "validation", false);
    this.name = "WhatsAppValidationError";
  }
}

export class WhatsAppApiError extends WhatsAppError {
  public readonly code: number;
  public readonly subcode?: number;
  public readonly errorType: string;
  public readonly fbtraceId?: string;
  public readonly errorUserTitle?: string;
  public readonly errorUserMsg?: string;
  public readonly errorData?: Record<string, unknown>;
  public readonly statusCode: number;

  constructor(payload: WhatsAppGraphErrorPayload, statusCode: number) {
    const err = payload.error;
    const [category, retryable] = classifyApiError(err.code, statusCode);
    super(
      err.message || `WhatsApp API error (status ${statusCode})`,
      category,
      retryable
    );
    this.name = "WhatsAppApiError";
    this.code = err.code;
    this.subcode = err.error_subcode;
    this.errorType = err.type;
    this.fbtraceId = err.fbtrace_id;
    this.errorUserTitle = err.error_user_title;
    this.errorUserMsg = err.error_user_msg;
    this.errorData = err.error_data;
    this.statusCode = statusCode;
  }
}

function classifyApiError(code: number, statusCode: number): [WhatsAppErrorCategory, boolean] {
  if (code === 190 || statusCode === 401) return ["authentication", false];
  if (code === 10 || code === 200 || statusCode === 403) return ["authorization", false];
  if ([4, 17, 32, 613, 80007, 130429, 131056].includes(code) || statusCode === 429) return ["rate_limited", true];
  if (code === 131026 || code === 131030) return ["recipient", false];
  if (code >= 132000 && code < 133000) return ["template", false];
  if (code === 131052 || code === 131053) return ["media", false];
  if (code === 1 || code === 2 || code === 131016 || statusCode >= 500) return ["temporary_provider", true];
  if (code === 100 || code === 131008 || code === 131009) return ["validation", false];
  return ["permanent_provider", false];
}

export class WhatsAppAuthenticationError extends WhatsAppApiError {
  constructor(payload: WhatsAppGraphErrorPayload, statusCode: number) {
    super(payload, statusCode);
    this.name = "WhatsAppAuthenticationError";
  }
}

export class WhatsAppRateLimitError extends WhatsAppApiError {
  constructor(payload: WhatsAppGraphErrorPayload, statusCode: number) {
    super(payload, statusCode);
    this.name = "WhatsAppRateLimitError";
  }
}

export function parseApiError(data: unknown, statusCode: number): WhatsAppApiError {
  const isGraphError = (obj: any): obj is WhatsAppGraphErrorPayload =>
    Boolean(obj && typeof obj === "object" && obj.error && typeof obj.error.message === "string");

  if (isGraphError(data)) {
    const code = data.error.code;
    if (code === 190) {
      return new WhatsAppAuthenticationError(data, statusCode);
    }
    if ([4, 17, 32, 613, 80007, 130429, 131056].includes(code) || statusCode === 429) {
      return new WhatsAppRateLimitError(data, statusCode);
    }
    return new WhatsAppApiError(data, statusCode);
  }

  return new WhatsAppApiError(
    {
      error: {
        message: typeof data === "string" ? data : JSON.stringify(data),
        type: "UnknownError",
        code: statusCode,
      },
    },
    statusCode
  );
}
