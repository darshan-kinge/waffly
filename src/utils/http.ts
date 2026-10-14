import type { ResolvedWhatsAppConfig } from "../config.js";
import { parseApiError, WhatsAppError } from "../errors.js";

export interface HttpRequestOptions {
  method: "GET" | "POST" | "DELETE";
  path: string;
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

export class HttpClient {
  constructor(private readonly config: ResolvedWhatsAppConfig) {}

  private buildUrl(path: string): string {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    return new URL(`${this.config.baseURL}/${this.config.apiVersion}/${cleanPath}`).toString();
  }

  async request<T>(options: HttpRequestOptions): Promise<T> {
    if (options.signal?.aborted) {
      throw new WhatsAppError("WhatsApp request was cancelled.", "cancelled", false);
    }
    const url = this.buildUrl(options.path);
    const headers: Record<string, string> = { Authorization: `Bearer ${this.config.accessToken}` };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";

    const bodyPayload = options.form ?? (options.body === undefined ? undefined : JSON.stringify(options.body));

    const controller = new AbortController();
    const abortFromCaller = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
    const timer = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await this.config.fetch(url, {
          method: options.method,
          headers,
          body: bodyPayload,
          signal: controller.signal,
      });

      const responseText = await response.text();
      let data: unknown = responseText;
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          if (response.ok) throw new WhatsAppError("Meta returned an invalid JSON response.");
        }
      }

      if (!response.ok) throw parseApiError(data, response.status);
      return data as T;
    } catch (error) {
      if (error instanceof WhatsAppError) throw error;
      if (controller.signal.aborted) {
        if (options.signal?.aborted) {
          throw new WhatsAppError("WhatsApp request was cancelled.", "cancelled", false);
        }
        throw new WhatsAppError(
          `WhatsApp request timed out after ${this.config.timeout}ms.`,
          "transport",
          false
        );
      }
      throw new WhatsAppError(
        `WhatsApp request failed: ${error instanceof Error ? error.message : String(error)}`,
        "transport",
        false
      );
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abortFromCaller);
    }
  }
}
