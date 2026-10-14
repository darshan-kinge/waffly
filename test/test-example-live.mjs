import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";

const PORT = 3055;
const VERIFY_TOKEN = "my_sample_verify_token";
const APP_SECRET = "my_sample_app_secret";

console.log("Starting webhook server example on port", PORT);

const serverProcess = spawn("node", ["examples/webhook-server.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(PORT),
    WHATSAPP_VERIFY_TOKEN: VERIFY_TOKEN,
    WHATSAPP_APP_SECRET: APP_SECRET,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

serverProcess.stderr.on("data", (data) => {
  console.error("SERVER ERR:", data.toString());
});

serverProcess.stdout.on("data", (data) => {
  console.log("SERVER OUT:", data.toString().trim());
});

// Wait for server to start
await new Promise((resolve) => setTimeout(resolve, 1500));

try {
  // Test 1: GET /webhook valid challenge
  console.log("\n1. Testing GET /webhook verification challenge...");
  const getRes = await fetch(
    `http://localhost:${PORT}/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=challenge_12345`
  );
  const getText = await getRes.text();
  console.log("Status:", getRes.status, "Body:", getText);
  if (getRes.status !== 200 || getText !== "challenge_12345") {
    throw new Error(`GET challenge failed: expected 200 'challenge_12345', got ${getRes.status} '${getText}'`);
  }
  console.log("✅ GET challenge succeeded!");

  // Test 2: GET /webhook invalid token
  console.log("\n2. Testing GET /webhook with invalid verify token...");
  const invalidGetRes = await fetch(
    `http://localhost:${PORT}/webhook?hub.mode=subscribe&hub.verify_token=WRONG_TOKEN&hub.challenge=challenge_12345`
  );
  console.log("Status:", invalidGetRes.status);
  if (invalidGetRes.status !== 403) {
    throw new Error(`Invalid token check failed: expected 403, got ${invalidGetRes.status}`);
  }
  console.log("✅ Invalid token rejected with 403 as expected!");

  // Test 3: POST /webhook without signature
  console.log("\n3. Testing POST /webhook without signature header...");
  const noSigRes = await fetch(`http://localhost:${PORT}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ object: "whatsapp_business_account", entry: [] }),
  });
  console.log("Status:", noSigRes.status);
  if (noSigRes.status !== 401) {
    throw new Error(`Missing signature check failed: expected 401, got ${noSigRes.status}`);
  }
  console.log("✅ Missing signature rejected with 401 as expected!");

  // Test 4: POST /webhook with valid signature and incoming message event
  console.log("\n4. Testing POST /webhook with valid HMAC-SHA256 signature...");
  const payload = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_ID_TEST",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: "PHONE_ID_TEST" },
              messages: [
                {
                  id: "wamid.TEST_EXAMPLE_MSG",
                  from: "15551234567",
                  timestamp: "1728900000",
                  type: "text",
                  text: { body: "Testing live webhook example!" },
                },
              ],
            },
          },
        ],
      },
    ],
  });

  const validSignature = "sha256=" + createHmac("sha256", APP_SECRET).update(payload).digest("hex");

  const postRes = await fetch(`http://localhost:${PORT}/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hub-signature-256": validSignature,
    },
    body: payload,
  });

  const postText = await postRes.text();
  console.log("Status:", postRes.status, "Body:", postText);
  if (postRes.status !== 200 || postText !== "OK") {
    throw new Error(`Valid POST failed: expected 200 'OK', got ${postRes.status} '${postText}'`);
  }
  console.log("✅ Valid POST accepted with 200 OK!");

  console.log("\n🎉 All live tests for examples/webhook-server.mjs passed successfully!");
} finally {
  serverProcess.kill();
}
