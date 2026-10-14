import type { ApiVersion, WhatsAppClientOptions } from "./types/common.js";

export const DEFAULT_GRAPH_API_VERSION: ApiVersion = "v26.0";
export const DEFAULT_BASE_URL = "https://graph.facebook.com";
export const DEFAULT_TIMEOUT_MS = 15000;

interface ResolvedWhatsAppConfig {
  accessToken: string;
  phoneNumberId?: string;
  apiVersion: ApiVersion;
  baseURL: string;
  timeout: number;
  fetch: typeof globalThis.fetch;
}

function resolveConfig(options: WhatsAppClientOptions): ResolvedWhatsAppConfig {
  if (!options.accessToken?.trim()) {
    throw new Error("WhatsAppClient requires an accessToken.");
  }

  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new Error("WhatsAppClient timeout must be a positive number.");
  }

  const fetchImplementation = options.fetch ?? globalThis.fetch;
  if (!fetchImplementation) {
    throw new Error("WhatsAppClient requires a fetch implementation.");
  }

  return {
    accessToken: options.accessToken,
    phoneNumberId: options.phoneNumberId,
    apiVersion: options.apiVersion ?? DEFAULT_GRAPH_API_VERSION,
    baseURL: DEFAULT_BASE_URL,
    timeout,
    fetch: fetchImplementation.bind(globalThis),
  };
}

export type { ResolvedWhatsAppConfig };
export { resolveConfig };
