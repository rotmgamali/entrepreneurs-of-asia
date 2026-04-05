/**
 * POST /api/contacts/webhook
 *
 * Webhook receiver for external data sources (scrapers, CRM exports, N8N flows).
 * Accepts single or batch contact payloads and upserts them via email deduplication.
 *
 * Auth: X-Webhook-Secret header must match CONTACTS_WEBHOOK_SECRET env var.
 * This uses a separate secret from ADMIN_SECRET so external scrapers don't
 * need full admin access.
 */

import { type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface WebhookContact {
  email: string;
  name?: string;
  whatsapp?: string;
  bio?: string;
  business_niche?: string;
  website?: string;
  socials?: string;
  skills?: string[];
  /** Source tag for auditing (e.g. "linkedin-scraper", "crm-export") */
  source?: string;
}

interface WebhookPayload {
  /** Single contact */
  contact?: WebhookContact;
  /** Batch of contacts (max 100 per request) */
  contacts?: WebhookContact[];
}

function normalizeContact(c: WebhookContact) {
  return {
    email: c.email.trim().toLowerCase(),
    name: c.name?.trim() || null,
    whatsapp: c.whatsapp?.trim() || null,
    bio: c.bio?.trim() || null,
    business_niche: c.business_niche?.trim() || null,
    website: c.website?.trim() || null,
    socials: c.socials?.trim() || null,
    skills: c.skills ?? null,
  };
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  const expected =
    process.env.CONTACTS_WEBHOOK_SECRET || process.env.ADMIN_SECRET;
  if (!secret || secret !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as WebhookPayload;

  const rawList: WebhookContact[] = body.contacts
    ? body.contacts
    : body.contact
    ? [body.contact]
    : [];

  if (rawList.length === 0) {
    return Response.json(
      { error: "Provide contact or contacts array" },
      { status: 400 }
    );
  }

  if (rawList.length > 100) {
    return Response.json(
      { error: "Max 100 contacts per request" },
      { status: 400 }
    );
  }

  // Validate emails
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalid = rawList.filter((c) => !emailPattern.test(c.email ?? ""));
  if (invalid.length > 0) {
    return Response.json(
      { error: `Invalid emails: ${invalid.map((c) => c.email).join(", ")}` },
      { status: 400 }
    );
  }

  const normalized = rawList.map(normalizeContact);

  // Deduplicate within batch by email (last entry wins)
  const deduped = Object.values(
    Object.fromEntries(normalized.map((c) => [c.email, c]))
  );

  // Upsert — on conflict (email), merge non-null incoming fields
  // Supabase upsert with ignoreDuplicates: false will update existing rows
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .upsert(deduped, { onConflict: "email", ignoreDuplicates: false })
    .select("id, email");

  if (error) {
    console.error("[POST /api/contacts/webhook]", error);
    return Response.json({ error: "Upsert failed", detail: error.message }, { status: 500 });
  }

  return Response.json({
    received: rawList.length,
    deduplicated: deduped.length,
    upserted: data?.length ?? 0,
  });
}
