export type ApiVersion = `v${number}.${number}` | string;

export interface WhatsAppClientOptions {
  /**
   * Meta access token (User access token or System User token).
   */
  accessToken: string;

  /**
   * Default Phone Number ID associated with the WhatsApp Business Account.
   */
  phoneNumberId?: string;

  /** Meta Graph API version. Defaults to the SDK's documented pinned version. */
  apiVersion?: ApiVersion;

  /**
   * Request timeout in milliseconds. Defaults to 15000 (15s).
   */
  timeout?: number;

  /**
   * Custom fetch implementation (optional, defaults to global fetch).
   */
  fetch?: typeof globalThis.fetch;
}
