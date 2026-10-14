import { Readable } from "node:stream";
import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const { server } = vi.hoisted(() => ({ server: { handler: undefined as any } }));
vi.mock("../dist/index.mjs", () => import("../src/index.js"));
vi.mock("node:http", () => ({
  createServer: (handler: unknown) => {
    server.handler = handler;
    return { listen: vi.fn() };
  },
}));

beforeAll(async () => {
  vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "test-token");
  vi.stubEnv("WHATSAPP_APP_SECRET", "test-secret");
  vi.stubEnv("WHATSAPP_WEBHOOK_SKIP_SIGNATURE", "false");
  const example = "../examples/webhook-server.mjs";
  await import(example);
});
afterAll(() => vi.unstubAllEnvs());

async function post(chunks: Buffer[], signature = "") {
  const request = Object.assign(Readable.from(chunks), {
    url: "/webhook", method: "POST", headers: { "x-hub-signature-256": signature },
  });
  const response = { destroyed: false, writeHead: vi.fn().mockReturnThis(), end: vi.fn() };
  await server.handler(request, response);
  return response;
}

describe("webhook example body limit", () => {
  it("accepts a signed payload at the limit", async () => {
    const body = Buffer.from("{}" + " ".repeat(1024 * 1024 - 2));
    const signature = "sha256=" + createHmac("sha256", "test-secret").update(body).digest("hex");
    const response = await post([body], signature);
    expect(response.writeHead).toHaveBeenCalledWith(200);
  });

  it.each([
    [Buffer.alloc(1024 * 1024 + 1)],
    [Buffer.alloc(512 * 1024), Buffer.alloc(512 * 1024), Buffer.alloc(1)],
  ])("rejects oversized input before signature verification", async (...chunks) => {
    const response = await post(chunks);
    expect(response.writeHead).toHaveBeenCalledWith(413, { Connection: "close" });
    expect(response.end).toHaveBeenCalledWith("Payload too large");
  });

  it("still rejects unsigned input below the limit", async () => {
    const response = await post([Buffer.from("{}")]);
    expect(response.writeHead).toHaveBeenCalledWith(401);
  });
});
