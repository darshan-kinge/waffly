export interface WhatsAppMessageResponseContact {
  input: string;
  wa_id: string;
}

export interface WhatsAppMessageResponseItem {
  id: string;
  message_status?: string;
}

export interface SendMessageResponse {
  messaging_product: "whatsapp";
  contacts: WhatsAppMessageResponseContact[];
  messages: WhatsAppMessageResponseItem[];
}

export interface SendMessageResult {
  messageId: string;
  recipientId?: string;
  raw: SendMessageResponse;
}

export interface WhatsAppGraphErrorPayload {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    error_user_title?: string;
    error_user_msg?: string;
    fbtrace_id?: string;
    error_data?: {
      messaging_product?: string;
      details?: string;
    };
  };
}

