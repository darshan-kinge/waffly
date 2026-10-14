import { describe, expect, it, vi } from "vitest";
import { WhatsAppClient, WhatsAppValidationError } from "../src/index.js";

describe("templates", () => {
  it("lists templates with filters and pagination", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "1", name: "hello_world", language: "en_US", status: "APPROVED", category: "UTILITY" }] }), { status: 200 })
    );
    const client = new WhatsAppClient({ accessToken: "secret", fetch });
    const result = await client.templates.list({ wabaId: "waba-1", status: "APPROVED", limit: 20, after: "cursor" });

    expect(result.data[0]?.name).toBe("hello_world");
    const url = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/v26.0/waba-1/message_templates");
    expect(url.searchParams.get("status")).toBe("APPROVED");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(url.searchParams.get("after")).toBe("cursor");
  });

  it("gets a template by Meta template ID", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "template-1", name: "order_update", language: "en_US", status: "APPROVED", category: "UTILITY" }), { status: 200 })
    );
    const client = new WhatsAppClient({ accessToken: "secret", fetch });
    const result = await client.templates.get("template-1");

    expect(result.id).toBe("template-1");
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/v26.0/template-1?fields=");
  });

  it("rejects invalid pagination before requesting Meta", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const client = new WhatsAppClient({ accessToken: "secret", fetch });
    expect(() => client.templates.list({ wabaId: "waba-1", after: "a", before: "b" })).toThrow(WhatsAppValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
