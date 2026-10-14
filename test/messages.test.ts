import { describe, expect, it, vi } from "vitest";
import {
  WhatsAppApiError,
  WhatsAppClient,
  WhatsAppValidationError,
} from "../src/index.js";

const successResponse = {
  messaging_product: "whatsapp",
  contacts: [{ input: "15551234567", wa_id: "15551234567" }],
  messages: [{ id: "wamid.test" }],
};

describe("messages.sendText", () => {
  it("sends the documented payload and returns the Meta message ID", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify(successResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const client = new WhatsAppClient({ accessToken: "secret", phoneNumberId: "123", fetch });

    const result = await client.messages.sendText({
      to: "15551234567",
      text: "Hello",
      previewUrl: false,
    });

    expect(result.messageId).toBe("wamid.test");
    expect(result.recipientId).toBe("15551234567");
    expect(fetch).toHaveBeenCalledOnce();
    const [url, request] = fetch.mock.calls[0]!;
    expect(url).toBe("https://graph.facebook.com/v26.0/123/messages");
    expect(request?.headers).toMatchObject({
      Authorization: "Bearer secret",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(request?.body))).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "15551234567",
      type: "text",
      text: { body: "Hello", preview_url: false },
    });
  });

  it("rejects invalid text before making a request", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const client = new WhatsAppClient({ accessToken: "secret", phoneNumberId: "123", fetch });

    await expect(client.messages.sendText({ to: "1555", text: "x".repeat(4097) })).rejects.toBeInstanceOf(
      WhatsAppValidationError
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not retry a failed send", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "Unavailable", type: "OAuthException", code: 2 } }),
        { status: 500 }
      )
    );
    const client = new WhatsAppClient({ accessToken: "secret", phoneNumberId: "123", fetch });

    await expect(client.messages.sendText({ to: "1555", text: "Hello" })).rejects.toBeInstanceOf(
      WhatsAppApiError
    );
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("classifies documented provider failures without retrying requests", async () => {
    const responses = [
      { code: 131026, category: "recipient", retryable: false },
      { code: 132001, category: "template", retryable: false },
      { code: 131053, category: "media", retryable: false },
      { code: 131016, category: "temporary_provider", retryable: true },
      { code: 131056, category: "rate_limited", retryable: true },
    ];
    for (const expected of responses) {
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Meta error", type: "OAuthException", code: expected.code } }), { status: 400 })
      );
      const client = new WhatsAppClient({ accessToken: "secret", phoneNumberId: "123", fetch });
      await expect(client.messages.sendText({ to: "1555", text: "Hello" })).rejects.toMatchObject(expected);
      expect(fetch).toHaveBeenCalledOnce();
    }
  });

  it("supports caller cancellation", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation((_url, request) =>
      new Promise((_resolve, reject) => {
        request?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError"))
        );
      })
    );
    const client = new WhatsAppClient({ accessToken: "secret", phoneNumberId: "123", fetch });
    const controller = new AbortController();
    const request = client.messages.sendText({
      to: "1555",
      text: "Hello",
      signal: controller.signal,
    });

    controller.abort();

    await expect(request).rejects.toMatchObject({ category: "cancelled", retryable: false });
  });

  it("does not send a request with an already aborted signal", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const client = new WhatsAppClient({ accessToken: "secret", phoneNumberId: "123", fetch });
    await expect(client.messages.sendText({ to: "1555", text: "Hello", signal: AbortSignal.abort() }))
      .rejects.toMatchObject({ category: "cancelled", retryable: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports a timeout without retrying", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation((_url, request) =>
      new Promise((_resolve, reject) => {
        request?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError"))
        );
      })
    );
    const client = new WhatsAppClient({
      accessToken: "secret",
      phoneNumberId: "123",
      timeout: 1,
      fetch,
    });

    await expect(client.messages.sendText({ to: "1555", text: "Hello" })).rejects.toMatchObject({
      category: "transport",
      retryable: false,
    });
    expect(fetch).toHaveBeenCalledOnce();
  });
});

describe("messages.sendTemplate", () => {
  it("sends documented template components", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify(successResponse), { status: 200, headers: { "Content-Type": "application/json" } })
    );
    const client = new WhatsAppClient({ accessToken: "secret", phoneNumberId: "123", fetch });

    await client.messages.sendTemplate({
      to: "15551234567",
      name: "order_update",
      languageCode: "en_US",
      components: [
        { type: "header", parameters: [{ type: "image", media: { id: "media-1" } }] },
        { type: "body", parameters: [
          { type: "text", text: "Alex", parameterName: "customer_name" },
          { type: "currency", currency: { fallbackValue: "$12.34", code: "USD", amount1000: 12340 } },
          { type: "date_time", dateTime: { fallbackValue: "October 1" } },
        ] },
        { type: "button", subType: "quick_reply", index: 0, parameters: [{ type: "payload", payload: "track-order" }] },
      ],
    });

    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({
      type: "template",
      template: {
        name: "order_update",
        language: { code: "en_US" },
        components: [
          { type: "header", parameters: [{ type: "image", image: { id: "media-1" } }] },
          { type: "body", parameters: [
            { type: "text", text: "Alex", parameter_name: "customer_name" },
            { type: "currency", currency: { fallback_value: "$12.34", code: "USD", amount_1000: 12340 } },
            { type: "date_time", date_time: { fallback_value: "October 1" } },
          ] },
          { type: "button", sub_type: "quick_reply", index: "0", parameters: [{ type: "payload", payload: "track-order" }] },
        ],
      },
    });
  });

  it("rejects ambiguous media references before sending", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const client = new WhatsAppClient({ accessToken: "secret", phoneNumberId: "123", fetch });
    await expect(client.messages.sendTemplate({
      to: "1555",
      name: "document_template",
      languageCode: "en_US",
      components: [{ type: "header", parameters: [{ type: "document", media: { id: "1", link: "https://example.com/a.pdf" } }] }],
    })).rejects.toBeInstanceOf(WhatsAppValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("media messages", () => {
  it("sends media by ID or public link", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () =>
      new Response(JSON.stringify(successResponse), { status: 200, headers: { "Content-Type": "application/json" } })
    );
    const client = new WhatsAppClient({ accessToken: "secret", phoneNumberId: "123", fetch });

    await client.messages.sendImage({ to: "1555", id: "media-1", caption: "Photo" });
    await client.messages.sendDocument({ to: "1555", link: "https://example.com/file.pdf", filename: "file.pdf" });
    await client.messages.sendVideo({ to: "1555", id: "media-2" });
    await client.messages.sendAudio({ to: "1555", link: "https://example.com/audio.mp3" });

    expect(fetch.mock.calls.map(([, request]) => JSON.parse(String(request?.body)))).toMatchObject([
      { type: "image", image: { id: "media-1", caption: "Photo" } },
      { type: "document", document: { link: "https://example.com/file.pdf", filename: "file.pdf" } },
      { type: "video", video: { id: "media-2" } },
      { type: "audio", audio: { link: "https://example.com/audio.mp3" } },
    ]);
  });

  it("rejects ambiguous media references", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const client = new WhatsAppClient({ accessToken: "secret", phoneNumberId: "123", fetch });
    await expect(client.messages.sendImage({ to: "1555", id: "1", link: "https://example.com/a.jpg" })).rejects.toBeInstanceOf(WhatsAppValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("location and contact messages", () => {
  it("sends documented location and contact payloads", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () =>
      new Response(JSON.stringify(successResponse), { status: 200, headers: { "Content-Type": "application/json" } })
    );
    const client = new WhatsAppClient({ accessToken: "secret", phoneNumberId: "123", fetch });

    await client.messages.sendLocation({ to: "1555", latitude: 28.6139, longitude: 77.209, name: "New Delhi" });
    await client.messages.sendContacts({
      to: "1555",
      contacts: [{
        name: { formattedName: "Alex Doe", firstName: "Alex", lastName: "Doe" },
        phones: [{ phone: "+15551234567", waId: "15551234567", type: "CELL" }],
        emails: [{ email: "alex@example.com", type: "WORK" }],
        organization: { company: "Example" },
      }],
    });

    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toMatchObject({
      type: "location",
      location: { latitude: 28.6139, longitude: 77.209, name: "New Delhi" },
    });
    expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toMatchObject({
      type: "contacts",
      contacts: [{
        name: { formatted_name: "Alex Doe", first_name: "Alex", last_name: "Doe" },
        phones: [{ phone: "+15551234567", wa_id: "15551234567", type: "CELL" }],
        org: { company: "Example" },
      }],
    });
  });

  it("rejects invalid coordinates and contacts before sending", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const client = new WhatsAppClient({ accessToken: "secret", phoneNumberId: "123", fetch });
    await expect(client.messages.sendLocation({ to: "1555", latitude: 91, longitude: 0 })).rejects.toBeInstanceOf(WhatsAppValidationError);
    await expect(client.messages.sendContacts({ to: "1555", contacts: [] })).rejects.toBeInstanceOf(WhatsAppValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
