import { WhatsAppValidationError } from "../errors.js";
import type { HttpClient } from "../utils/http.js";

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  quality_score?: { score: string; date?: number };
  components?: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface TemplateListInput {
  wabaId: string;
  name?: string;
  status?: string;
  limit?: number;
  after?: string;
  before?: string;
  signal?: AbortSignal;
}

export interface TemplateListResult {
  data: WhatsAppTemplate[];
  paging?: {
    cursors?: { before?: string; after?: string };
    previous?: string;
    next?: string;
  };
}

const fields = "id,name,language,status,category,quality_score,components";

export class TemplatesModule {
  constructor(private readonly http: HttpClient) {}

  list(input: TemplateListInput): Promise<TemplateListResult> {
    const wabaId = input.wabaId.trim();
    if (!wabaId) throw new WhatsAppValidationError("WABA ID is required.");
    if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit < 1)) {
      throw new WhatsAppValidationError("Template list limit must be a positive integer.");
    }
    if (input.after && input.before) throw new WhatsAppValidationError("Use either after or before, not both.");
    const query = new URLSearchParams({ fields });
    if (input.name) query.set("name", input.name);
    if (input.status) query.set("status", input.status);
    if (input.limit !== undefined) query.set("limit", String(input.limit));
    if (input.after) query.set("after", input.after);
    if (input.before) query.set("before", input.before);
    return this.http.request({ method: "GET", path: `${wabaId}/message_templates?${query}`, signal: input.signal });
  }

  get(templateId: string, input: { signal?: AbortSignal } = {}): Promise<WhatsAppTemplate> {
    const id = templateId.trim();
    if (!id) throw new WhatsAppValidationError("Template ID is required.");
    return this.http.request({ method: "GET", path: `${id}?fields=${encodeURIComponent(fields)}`, signal: input.signal });
  }
}
