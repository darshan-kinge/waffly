import { describe, expect, it, vi } from "vitest";
import { WhatsAppClient, WhatsAppValidationError } from "../src/index.js";

describe("media", () => {
  it.each([
    ["image/png", 5], ["audio/ogg", 16], ["text/plain", 100],
  ] as const)("enforces the %s size boundary before fetch", async (mimeType, maxMb) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response('{"id":"boundary"}'));
    const client = new WhatsAppClient({ accessToken: "secret", phoneNumberId: "123", fetch });
    const oversized = new Blob([new Uint8Array(maxMb * 1024 * 1024 + 1)], { type: mimeType });
    await expect(client.media.upload({ file: oversized, mimeType })).rejects.toBeInstanceOf(WhatsAppValidationError);
    expect(fetch).not.toHaveBeenCalled();
    await expect(client.media.upload({ file: oversized.slice(0, -1, mimeType), mimeType })).resolves.toEqual({ id: "boundary" });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("uploads supported media as multipart form data", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "media-1" }), { status: 200, headers: { "Content-Type": "application/json" } })
    );
    const client = new WhatsAppClient({ accessToken: "secret", phoneNumberId: "123", fetch });
    const result = await client.media.upload({
      file: new Blob(["image"], { type: "image/jpeg" }),
      mimeType: "image/jpeg",
      filename: "photo.jpg",
    });

    expect(result.id).toBe("media-1");
    const [url, request] = fetch.mock.calls[0]!;
    expect(url).toBe("https://graph.facebook.com/v26.0/123/media");
    expect(request?.body).toBeInstanceOf(FormData);
    expect(request?.headers).not.toHaveProperty("Content-Type");
  });

  it("retrieves and deletes media with an ownership check", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "media-1", url: "https://lookaside.example/media" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    const client = new WhatsAppClient({ accessToken: "secret", fetch });

    await client.media.retrieve("media-1", { phoneNumberId: "123" });
    await client.media.delete("media-1", { phoneNumberId: "123" });

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "https://graph.facebook.com/v26.0/media-1?phone_number_id=123",
      "https://graph.facebook.com/v26.0/media-1?phone_number_id=123",
    ]);
    expect(fetch.mock.calls[1]?.[1]?.method).toBe("DELETE");
  });

  it("rejects unsupported and oversized media before upload", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const client = new WhatsAppClient({ accessToken: "secret", phoneNumberId: "123", fetch });
    await expect(client.media.upload({ file: new Blob(["x"]), mimeType: "image/gif" })).rejects.toBeInstanceOf(WhatsAppValidationError);
    await expect(client.media.upload({ file: new Blob([new Uint8Array(5 * 1024 * 1024 + 1)]), mimeType: "image/jpeg" })).rejects.toBeInstanceOf(WhatsAppValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
