/**
 * POST /api/pipeline/nomads/enrich
 *
 * Given a name (e.g., from an event RSVP), finds the best matching nomad
 * profile and returns enriched data. Optionally updates the record in-place.
 *
 * Auth: X-Admin-Secret header required.
 */

import { type NextRequest } from "next/server";
import { SHEET, getRows, updateRow } from "@/lib/sheets";
import { findBestMatch, mergeNomadRecords, type PartialNomad } from "@/lib/pipeline/dedup";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name: string = body.name?.trim();
  const email: string | undefined = body.email?.trim().toLowerCase();
  const patch: Record<string, unknown> = body.patch ?? {};
  const save: boolean = body.save ?? false;
  const force: boolean = body.force ?? false;

  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  // Step 1: Search Nomads sheet
  const allNomads = await getRows(SHEET.nomads);
  const nameLower = name.toLowerCase();

  const candidates = allNomads.filter(({ row }) => {
    if (email && row.email_primary === email) return true;
    return row.full_name?.toLowerCase().includes(nameLower);
  }).slice(0, 20);

  const candidateObjects = candidates.map(({ row }) => ({
    id: row.id,
    full_name: row.full_name,
    email_primary: row.email_primary,
    linkedin_url: row.linkedin_url,
    twitter_x_handle: row.twitter_x_handle,
    instagram_handle: row.instagram_handle,
    nationality: row.nationality,
  }));

  const incoming = { full_name: name, email_primary: email ?? null, ...patch };
  const match = findBestMatch(incoming, candidateObjects);

  if (match && match.confidence >= 0.7) {
    const existingRow = candidates.find(({ row }) => row.id === match.existing.id);
    let profile: PartialNomad = { full_name: name, ...existingRow?.row };

    if (Object.keys(patch).length > 0) {
      profile = mergeNomadRecords(profile, { ...incoming, ...patch } as PartialNomad, force);
    }

    if (save && existingRow) {
      await updateRow(SHEET.nomads, existingRow.rowIndex, profile);
    }

    return Response.json({
      matched: true,
      profile,
      source: "nomads_sheet",
      matchKind: match.kind,
      confidence: match.confidence,
      saved: save,
    });
  }

  // Step 2: Cross-reference Contacts sheet
  const allContacts = await getRows(SHEET.contacts);
  const crmCandidates = allContacts.filter(({ row }) => {
    if (email && row.email === email) return true;
    return row.name?.toLowerCase().includes(nameLower);
  }).slice(0, 5);

  if (crmCandidates.length > 0) {
    const crm = crmCandidates[0].row;
    const mapped = {
      full_name: crm.name,
      email_primary: crm.email,
      phone_whatsapp: crm.whatsapp,
      website: crm.website,
      notes: crm.bio,
      crm_contact_id: crm.id,
      enrichment_status: "partial",
      ...patch,
    };

    return Response.json({
      matched: true,
      profile: mapped,
      source: "contacts_crm",
      matchKind: "name",
      confidence: 0.75,
      saved: false,
    });
  }

  // Step 3: No match — return stub
  return Response.json({
    matched: false,
    profile: {
      full_name: name,
      email_primary: email ?? null,
      enrichment_status: "raw",
      outreach_status: "not_contacted",
      ...patch,
    },
    source: "none",
    saved: false,
  });
}
