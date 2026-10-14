import { createServer } from "node:http";
import {
  parseWebhookEvents,
  verifyWebhookChallenge,
  verifyWebhookSignature,
} from "waffly";

const port = Number(process.env.PORT ?? 3000);
const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
const appSecret = process.env.WHATSAPP_APP_SECRET;
const skipSignature = process.env.WHATSAPP_WEBHOOK_SKIP_SIGNATURE === "true";
const maxBodyBytes = 1024 * 1024;

if (!verifyToken) throw new Error("WHATSAPP_VERIFY_TOKEN is required.");
if (skipSignature && process.env.NODE_ENV === "production") {
  throw new Error("WHATSAPP_WEBHOOK_SKIP_SIGNATURE cannot be enabled in production.");
}
if (skipSignature) console.warn("Webhook signature verification is disabled for local testing.");

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname !== "/webhook") {
    response.writeHead(404).end("Not found");
    return;
  }

  if (request.method === "GET") {
    const challenge = verifyWebhookChallenge({
      mode: url.searchParams.get("hub.mode") ?? undefined,
      verifyToken: url.searchParams.get("hub.verify_token") ?? undefined,
      challenge: url.searchParams.get("hub.challenge") ?? undefined,
      expectedVerifyToken: verifyToken,
    });
    if (!challenge) {
      console.warn(JSON.stringify({
        webhookChallengeRejected: true,
        mode: url.searchParams.get("hub.mode"),
        hasChallenge: url.searchParams.has("hub.challenge"),
        suppliedTokenLength: url.searchParams.get("hub.verify_token")?.length ?? 0,
        expectedTokenLength: verifyToken.length,
      }));
    }
    response.writeHead(challenge ? 200 : 403).end(challenge ?? "Forbidden");
    return;
  }

  if (request.method !== "POST" || !appSecret) {
    response.writeHead(appSecret ? 405 : 503).end(appSecret ? "Method not allowed" : "App secret missing");
    return;
  }

  const chunks = [];
  let bodyBytes = 0;
  try {
    for await (const chunk of request) {
      bodyBytes += chunk.length;
      if (bodyBytes > maxBodyBytes) {
        response.writeHead(413, { Connection: "close" }).end("Payload too large");
        return;
      }
      chunks.push(chunk);
    }
  } catch {
    if (!response.destroyed) response.writeHead(400).end("Invalid request body");
    return;
  }
  const rawBody = Buffer.concat(chunks);
  const signature = request.headers["x-hub-signature-256"];
  if (
    !skipSignature &&
    (typeof signature !== "string" ||
      !verifyWebhookSignature({ rawBody, signature, appSecret }))
  ) {
    response.writeHead(401).end("Invalid signature");
    return;
  }

  try {
    const events = parseWebhookEvents(rawBody);
    for (const event of events) {
      console.log(JSON.stringify(event));
    }
    response.writeHead(200).end("OK");
  } catch (error) {
    console.error(error);
    response.writeHead(400).end("Invalid payload");
  }
});

server.listen(port, () => {
  console.log(`Webhook server listening at http://localhost:${port}/webhook`);
});
