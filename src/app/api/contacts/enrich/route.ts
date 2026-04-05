/**
 * POST /api/contacts/enrich
 *
 * Enriches an existing contact record with additional data.
 * Looks up by email (primary key) and merges non-null fields.
 * Safe to call repeatedly — only overwrites blank fields unless force=true.
 *
 * Auth: X-Admin-Secret header required.
 */

import { type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface EnrichPayload {
  /** Required — used as the lookup key */
  email: string;
  /** Optional enrichment fields — null/missing values are skipped */
  name?: string;
  whatsapp?: string;
  bio?: string;
  business_niche?: string;
  website?: string;
  socials?: string;
  skills?: string[];
  status?: "pending" | "approved" | "rejected";
  /** If true, overwrite existing non-null values with new data (default: false) */
  force?: boolean;
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as EnrichPayload;

  if (!body.email?.trim()) {
    return Response.json({ error: "email is required" }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();

  // Fetch existing contact
  const { data: existing } = await supabaseAdmin
    .from("contacts")
    .select("*")
    .eq("email", email)
    .single();

  if (!existing) {
    return Response.json({ error: "Contact not found" }, { status: 404 });
  }

  // Build update patch — only overwrite if field is blank or force=true
  const enrichableFields = [
    "name",
    "whatsapp",
    "bio",
    "business_niche",
    "website",
    "socials",
    "skills",
    "status",
  ] as const;

  const patch: Record<string, unknown> = {};
  for (const field of enrichableFields) {
    const incoming = body[field as keyof EnrichPayload];
    if (incoming === undefined || incoming === null) continue;
    // Only update if existing value is blank, or force flag is set
    const current = existing[field];
    const isBlank =
      current === null ||
      current === undefined ||
      current === "" ||
      (Array.isArray(current) && current.length === 0);
    if (isBlank || body.force) {
      patch[field] = incoming;
    }
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ contact: existing, enriched: false });
  }

  const { data: updated, error } = await supabaseAdmin
    .from("contacts")
    .update(patch)
    .eq("email", email)
    .select()
    .single();

  if (error || !updated) {
    console.error("[POST /api/contacts/enrich]", error);
    return Response.json({ error: "Failed to enrich contact" }, { status: 500 });
  }

  return Response.json({ contact: updated, enriched: true, fields: Object.keys(patch) });
}
