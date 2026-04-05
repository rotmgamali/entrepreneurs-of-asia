import { type NextRequest } from "next/server";
import { SHEET, getRows, appendRow, updateRow } from "@/lib/sheets";
import type { EnrichmentStatus, StayPattern } from "@/lib/supabase";

const VALID_ENRICHMENT: EnrichmentStatus[] = ["raw", "partial", "enriched", "verified"];
const VALID_STAY: StayPattern[] = ["permanent", "long-term", "seasonal", "transient"];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// GET /api/nomads — list profiles with optional filters
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const enrichment = searchParams.get("enrichment");
  const stay       = searchParams.get("stay_pattern");
  const skill      = searchParams.get("skill");
  const coworking  = searchParams.get("coworking");
  const q          = searchParams.get("q");
  const limit      = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const offset     = parseInt(searchParams.get("offset") ?? "0", 10);

  const all = await getRows(SHEET.nomads);

  let filtered = all;
  if (enrichment && VALID_ENRICHMENT.includes(enrichment as EnrichmentStatus)) {
    filtered = filtered.filter(({ row }) => row.enrichment_status === enrichment);
  }
  if (stay && VALID_STAY.includes(stay as StayPattern)) {
    filtered = filtered.filter(({ row }) => row.stay_pattern === stay);
  }
  if (skill) {
    filtered = filtered.filter(({ row }) => {
      try { return (JSON.parse(row.skills) as string[]).includes(skill); } catch { return false; }
    });
  }
  if (coworking) {
    filtered = filtered.filter(({ row }) => {
      try { return (JSON.parse(row.coworking_spaces) as string[]).includes(coworking); } catch { return false; }
    });
  }
  if (q) {
    const ql = q.toLowerCase();
    filtered = filtered.filter(({ row }) =>
      row.full_name?.toLowerCase().includes(ql) ||
      row.profession?.toLowerCase().includes(ql) ||
      row.notes?.toLowerCase().includes(ql)
    );
  }

  // Sort by cm_last_active_date desc, then created_at desc
  filtered.sort((a, b) => {
    const d = (b.row.cm_last_active_date || "").localeCompare(a.row.cm_last_active_date || "");
    return d !== 0 ? d : b.row.created_at.localeCompare(a.row.created_at);
  });

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  const fields = [
    "id", "slug", "full_name", "profession", "nationality", "skills",
    "coworking_spaces", "stay_pattern", "linkedin_url", "twitter_x_handle",
    "instagram_handle", "website", "enrichment_status", "cm_last_active_date",
    "community_role", "tags", "notes",
  ];

  return Response.json({
    nomads: paginated.map(({ row }) =>
      Object.fromEntries(fields.map((f) => [f, row[f] ?? ""]))
    ),
    total,
    limit,
    offset,
  });
}

// POST /api/nomads — create or upsert a nomad profile
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.full_name?.trim()) {
    return Response.json({ error: "full_name is required" }, { status: 400 });
  }

  const slug = body.slug?.trim() || toSlug(body.full_name);

  const record: Record<string, unknown> = {
    slug,
    full_name:            body.full_name.trim(),
    first_name:           body.first_name?.trim()            || "",
    last_name:            body.last_name?.trim()             || "",
    nationality:          body.nationality?.trim()            || "",
    languages:            JSON.stringify(Array.isArray(body.languages) ? body.languages : []),
    profession:           body.profession?.trim()             || "",
    skills:               JSON.stringify(Array.isArray(body.skills) ? body.skills : []),
    company_name:         body.company_name?.trim()           || "",
    company_url:          body.company_url?.trim()            || "",
    current_projects:     body.current_projects?.trim()       || "",
    email_primary:        body.email_primary?.trim()          || "",
    email_secondary:      body.email_secondary?.trim()        || "",
    phone_whatsapp:       body.phone_whatsapp?.trim()         || "",
    website:              body.website?.trim()                || "",
    linkedin_url:         body.linkedin_url?.trim()           || "",
    twitter_x_handle:     body.twitter_x_handle?.trim()       || "",
    instagram_handle:     body.instagram_handle?.trim()       || "",
    facebook_profile_url: body.facebook_profile_url?.trim()   || "",
    youtube_channel_url:  body.youtube_channel_url?.trim()    || "",
    tiktok_handle:        body.tiktok_handle?.trim()          || "",
    github_url:           body.github_url?.trim()             || "",
    coworking_spaces:     JSON.stringify(Array.isArray(body.coworking_spaces) ? body.coworking_spaces : []),
    neighborhoods:        JSON.stringify(Array.isArray(body.neighborhoods) ? body.neighborhoods : []),
    stay_pattern:         VALID_STAY.includes(body.stay_pattern) ? body.stay_pattern : "",
    cm_first_seen_date:   body.cm_first_seen_date             || "",
    cm_last_active_date:  body.cm_last_active_date            || "",
    facebook_groups:      JSON.stringify(Array.isArray(body.facebook_groups) ? body.facebook_groups : []),
    community_role:       body.community_role                 || "",
    crm_contact_id:       body.crm_contact_id?.trim()         || "",
    outreach_status:      body.outreach_status                || "not_contacted",
    relationship_strength: String(body.relationship_strength ?? 0),
    data_sources:         JSON.stringify(typeof body.data_sources === "object" ? body.data_sources : {}),
    enrichment_status:    VALID_ENRICHMENT.includes(body.enrichment_status) ? body.enrichment_status : "raw",
    confidence_score:     String(typeof body.confidence_score === "number" ? body.confidence_score : 0),
    verified_at:          body.verified_at                    || "",
    tags:                 JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
    notes:                body.notes?.trim()                  || "",
  };

  // Check if slug already exists for upsert
  const all = await getRows(SHEET.nomads);
  const existing = all.find(({ row }) => row.slug === slug);

  let nomad;
  if (existing) {
    await updateRow(SHEET.nomads, existing.rowIndex, record);
    nomad = { id: existing.row.id, slug, full_name: body.full_name.trim(), enrichment_status: record.enrichment_status };
  } else {
    const row = await appendRow(SHEET.nomads, record);
    nomad = { id: row.id, slug: row.slug, full_name: row.full_name, enrichment_status: row.enrichment_status };
  }

  return Response.json({ success: true, nomad }, { status: 201 });
}
