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
import { SHEET, findRowBy, updateRow } from "@/lib/sheets";

interface EnrichPayload {
  email: string;
  name?: string;
  whatsapp?: string;
  bio?: string;
  business_niche?: string;
  website?: string;
  socials?: string;
  skills?: string[];
  status?: "pending" | "approved" | "rejected";
  force?: boolean;
}

const ENRICHABLE_FIELDS = [
  "name", "whatsapp", "bio", "business_niche", "website", "socials", "skills", "status",
] as const;

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

  const existing = await findRowBy(SHEET.contacts, "email", email);
  if (!existing) {
    return Response.json({ error: "Contact not found" }, { status: 404 });
  }

  // Build update patch — only overwrite if field is blank or force=true
  const patch: Record<string, unknown> = {};
  for (const field of ENRICHABLE_FIELDS) {
    const incoming = body[field as keyof EnrichPayload];
    if (incoming === undefined || incoming === null) continue;
    const current = existing.row[field];
    const isBlank = !current || current === "" || current === "[]";
    if (isBlank || body.force) {
      patch[field] = Array.isArray(incoming) ? JSON.stringify(incoming) : incoming;
    }
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ contact: existing.row, enriched: false });
  }

  await updateRow(SHEET.contacts, existing.rowIndex, patch);

  const updated = { ...existing.row, ...patch };
  return Response.json({ contact: updated, enriched: true, fields: Object.keys(patch) });
}
