import { createHmac } from "crypto";

const WA_API = "https://graph.facebook.com/v19.0";

function phoneNumberId() {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!id) throw new Error("WHATSAPP_PHONE_NUMBER_ID env var not set");
  return id;
}

function accessToken() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error("WHATSAPP_ACCESS_TOKEN env var not set");
  return token;
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${WA_API}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken()}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`WhatsApp API error: ${data.error.message}`);
  }
  return data;
}

function normalizePhone(phone: string): string {
  // Strip non-numeric except leading +, then strip the +
  return phone.replace(/[^\d]/g, "");
}

export async function sendTemplateMessage(
  toPhone: string,
  templateName: string,
  languageCode: string,
  components: unknown[]
) {
  const to = normalizePhone(toPhone);
  return post(`${phoneNumberId()}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  });
}

export async function sendTextMessage(toPhone: string, text: string) {
  const to = normalizePhone(toPhone);
  return post(`${phoneNumberId()}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text, preview_url: false },
  });
}

export async function markAsRead(messageId: string) {
  return post(`${phoneNumberId()}/messages`, {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  });
}

export async function sendCommunityInvite(
  toPhone: string,
  recipientName: string,
  mainGroupLink: string
) {
  return sendTemplateMessage(toPhone, "invite_community", "en", [
    {
      type: "body",
      parameters: [
        { type: "text", text: recipientName },
        { type: "text", text: mainGroupLink },
      ],
    },
  ]);
}

export async function sendSubgroupInvite(
  toPhone: string,
  niche: string,
  groupName: string,
  inviteLink: string
) {
  return sendTemplateMessage(toPhone, "invite_subgroup", "en", [
    {
      type: "body",
      parameters: [
        { type: "text", text: niche },
        { type: "text", text: groupName },
        { type: "text", text: inviteLink },
      ],
    },
  ]);
}

export async function sendEventReminder24h(
  toPhone: string,
  recipientName: string,
  eventDate: string,
  venue: string
) {
  return sendTemplateMessage(toPhone, "event_reminder_24h", "en", [
    {
      type: "body",
      parameters: [
        { type: "text", text: recipientName },
        { type: "text", text: eventDate },
        { type: "text", text: venue },
      ],
    },
  ]);
}

export async function sendEventReminder2h(
  toPhone: string,
  fullVenueAddress: string
) {
  return sendTemplateMessage(toPhone, "event_reminder_2h", "en", [
    {
      type: "body",
      parameters: [{ type: "text", text: fullVenueAddress }],
    },
  ]);
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  appSecret: string
): boolean {
  const expected = createHmac("sha256", appSecret)
    .update(payload)
    .digest("hex");
  return signature === `sha256=${expected}`;
}
