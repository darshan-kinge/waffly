# Troubleshooting FAQ

Common issues and solutions when working with Waffly and Meta's WhatsApp Cloud API.

---

## Quick Diagnostic Matrix

| Issue | Likely Cause | Solution |
| :--- | :--- | :--- |
| **`Phone Number ID must be provided`** | Missing Phone Number ID | Pass `phoneNumberId` in client options or directly in the method call. |
| **Error `190` (Authentication)** | Token expired or invalid | Generate a fresh token or use a Permanent System User Token in Meta Business Manager. |
| **Template not found / mismatch** | Language or name mismatch | Verify the exact template name, language code (e.g. `en_US` vs `en`), and status (`APPROVED`). |
| **Non-template message rejected** | Service window closed | Send an approved template to re-open the 24-hour customer service window. |
| **Webhook verification returns 403** | Verify token mismatch | Ensure `WHATSAPP_VERIFY_TOKEN` in your environment matches the token entered in Meta's Dashboard. |
| **Webhook POST returns 401** | Signature mismatch | Ensure you are passing the exact raw request bytes before JSON parsing to `verifyWebhookSignature`. |
| **Media code `131053`** | Incompatible codec | Re-encode videos to H.264 / AAC and audio to mono Opus or AAC. |
| **Large file upload fails** | Timeout or limit exceeded | Increase client `timeout` (e.g. `120000` ms) and keep document uploads under 100 MB. |
