/**
 * POST /api/contacts/webhook
 *
 * Webhook receiver for external data sources (scrapers, CRM exports, N8N flows).
 * Accepts single or batch contact payloads and upserts them via email deduplication.
 *
 * Auth: HMAC-SHA256 via x-webhook-signature header (t=<ms>,v1=<hex>).
 * Secret: CONTACTS_WEBHOOK_SECRET env var (falls back to ADMIN_SECRET).
 */

import { type NextRequest } from "next/server";
import { SHEET, upsertRow } from "@/lib/sheets";
import { verifyWebhookSignature } from "@/lib/webhook-auth";

interface WebhookContact {
  email: string;
  name?: string;
  whatsapp?: string;
  bio?: string;
  business_niche?: string;
  website?: string;
  socials?: string;
  skills?: string[];
  source?: string;
}

interface WebhookPayload {
  contact?: WebhookContact;
  contacts?: WebhookContact[];
}

function normalizeContact(c: WebhookContact) {
  return {
    email: c.email.trim().toLowerCase(),
    name: c.name?.trim() || "",
    whatsapp: c.whatsapp?.trim() || "",
    bio: c.bio?.trim() || "",
    business_niche: c.business_niche?.trim() || "",
    website: c.website?.trim() || "",
    socials: c.socials?.trim() || "",
    skills: c.skills ? JSON.stringify(c.skills) : "",
  };
}

export async function POST(request: NextRequest) {
  const signingSecret = process.env.CONTACTS_WEBHOOK_SECRET || process.env.ADMIN_SECRET;
  if (!signingSecret) {
    return Response.json({ error: "Server misconfiguration: missing webhook secret" }, { status: 500 });
  }

  const { valid, body: rawBody, error } = await verifyWebhookSignature(request, signingSecret);
  if (!valid) {
    return Response.json({ error: error ?? "Unauthorized" }, { status: 401 });
  }

  let body: WebhookPayload;
  try {
    body = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawList: WebhookContact[] = body.contacts
    ? body.contacts
    : body.contact
    ? [body.contact]
    : [];

  if (rawList.length === 0) {
    return Response.json({ error: "Provide contact or contacts array" }, { status: 400 });
  }

  if (rawList.length > 100) {
    return Response.json({ error: "Max 100 contacts per request" }, { status: 400 });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalid = rawList.filter((c) => !emailPattern.test(c.email ?? ""));
  if (invalid.length > 0) {
    return Response.json(
      { error: `Invalid emails: ${invalid.map((c) => c.email).join(", ")}` },
      { status: 400 }
    );
  }

  // Deduplicate within batch by email (last entry wins)
  const deduped = Object.values(
    Object.fromEntries(rawList.map((c) => [c.email.trim().toLowerCase(), c]))
  );

  const normalized = deduped.map(normalizeContact);

  let upserted = 0;
  for (const contact of normalized) {
    await upsertRow(SHEET.contacts, "email", contact);
    upserted++;
  }

  return Response.json({
    received: rawList.length,
    deduplicated: deduped.length,
    upserted,
  });
}
