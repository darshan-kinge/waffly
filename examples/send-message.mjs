import { WhatsAppClient } from "waffly";

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const apiVersion = process.env.WHATSAPP_API_VERSION || "v26.0";

const to = process.argv[2] || process.env.WHATSAPP_TO || process.env.RECIPIENT_PHONE;
const mode = process.argv[3] || "template"; // "template" | "text"

if (!accessToken || !phoneNumberId) {
  console.error("❌ Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID in environment.");
  process.exit(1);
}

if (!to) {
  console.error("❌ No recipient phone number provided.");
  console.log("\nUsage:");
  console.log("  node --env-file=.env examples/send-message.mjs <phoneNumber> [template|text]");
  console.log("Example:");
  console.log("  node --env-file=.env examples/send-message.mjs 919876543210 template");
  process.exit(1);
}

const client = new WhatsAppClient({
  accessToken,
  phoneNumberId,
  apiVersion,
});

async function main() {
  console.log(`🚀 Sending ${mode} message to ${to}...`);
  try {
    let result;
    if (mode === "text") {
      result = await client.messages.sendText({
        to,
        text: "Hello from Waffly! 🧇✨ Sent using the published waffly package.",
      });
    } else {
      // Default pre-approved Meta Cloud API test template
      result = await client.messages.sendTemplate({
        to,
        name: "hello_world",
        languageCode: "en_US",
      });
    }

    console.log("\n🎉 Message accepted by Meta WhatsApp Cloud API!");
    console.log("-----------------------------------------------");
    console.log("Message ID (wamid) :", result.messageId);
    console.log("Recipient ID       :", result.recipientId);
    console.log("-----------------------------------------------");
  } catch (error) {
    console.error("\n❌ Error sending message:");
    if (error.name === "WhatsAppApiError") {
      console.error(`- Status Code : ${error.statusCode}`);
      console.error(`- Error Code  : ${error.code} (Subcode: ${error.subcode ?? "none"})`);
      console.error(`- Error Type  : ${error.errorType}`);
      console.error(`- Category    : ${error.category}`);
      console.error(`- Message     : ${error.message}`);
      if (error.errorUserMsg) {
        console.error(`- User Note   : ${error.errorUserMsg}`);
      }
      if (error.fbtraceId) {
        console.error(`- FB Trace ID : ${error.fbtraceId}`);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
