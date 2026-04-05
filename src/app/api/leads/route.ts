import { type NextRequest } from "next/server";
import { SHEET, getRows, appendRow, updateRow } from "@/lib/sheets";

type Platform = "facebook" | "instagram" | "linkedin" | "twitter" | "whatsapp" | "other";
type OutreachStatus =
  | "identified" | "dm_sent" | "follow_up_1_sent" | "follow_up_2_sent"
  | "replied" | "positive" | "negative" | "rsvp_submitted" | "approved" | "attended" | "cold";
type Campaign = "attendee_recruitment" | "speaker_pipeline" | "sponsor_pipeline";

const VALID_PLATFORMS: Platform[] = ["facebook", "instagram", "linkedin", "twitter", "whatsapp", "other"];
const VALID_STATUSES: OutreachStatus[] = [
  "identified", "dm_sent", "follow_up_1_sent", "follow_up_2_sent",
  "replied", "positive", "negative", "rsvp_submitted", "approved", "attended", "cold",
];
const VALID_CAMPAIGNS: Campaign[] = ["attendee_recruitment", "speaker_pipeline", "sponsor_pipeline"];

// GET /api/leads — list leads with optional filters
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status   = searchParams.get("status");
  const platform = searchParams.get("platform");
  const campaign = searchParams.get("campaign") ?? "attendee_recruitment";
  const limit    = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 500);
  const offset   = parseInt(searchParams.get("offset") ?? "0", 10);

  const all = await getRows(SHEET.leads);

  let filtered = all.filter(({ row }) => row.campaign === campaign);
  if (status)   filtered = filtered.filter(({ row }) => row.outreach_status === status);
  if (platform) filtered = filtered.filter(({ row }) => row.platform === platform);

  // Sort by created_at descending
  filtered.sort((a, b) => b.row.created_at.localeCompare(a.row.created_at));

  const paginated = filtered.slice(offset, offset + limit);
  return Response.json({ leads: paginated.map(({ row }) => row), total: filtered.length });
}

// POST /api/leads — log a new outreach lead
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name?.trim()) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }
  if (!VALID_PLATFORMS.includes(body.platform)) {
    return Response.json({ error: `platform must be one of: ${VALID_PLATFORMS.join(", ")}` }, { status: 400 });
  }

  const campaign: Campaign = VALID_CAMPAIGNS.includes(body.campaign)
    ? body.campaign
    : "attendee_recruitment";

  const now = new Date().toISOString();
  const initialStatus: OutreachStatus = body.outreach_status === "identified" ? "identified" : "dm_sent";

  const lead = await appendRow(SHEET.leads, {
    name:            body.name.trim(),
    platform:        body.platform as Platform,
    profile_url:     body.profile_url?.trim() || "",
    business_niche:  body.business_niche?.trim() || "",
    location:        body.location?.trim() || "",
    outreach_status: initialStatus,
    dm_sent_at:      initialStatus === "dm_sent" ? now : "",
    message_body:    body.message_body?.trim() || "",
    notes:           body.notes?.trim() || "",
    source:          body.source || "manual",
    campaign,
  });

  return Response.json(
    { success: true, lead: { id: lead.id, name: lead.name, platform: lead.platform, outreach_status: lead.outreach_status, dm_sent_at: lead.dm_sent_at } },
    { status: 201 }
  );
}

// PATCH /api/leads — bulk-update status
// Body: { ids: string[], status: OutreachStatus, notes?: string }
export async function PATCH(request: NextRequest) {
  const body = await request.json();

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return Response.json({ error: "ids array is required" }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(body.status)) {
    return Response.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
  }

  const now = new Date().toISOString();
  const patch: Record<string, string> = { outreach_status: body.status };

  if (body.status === "dm_sent")          patch.dm_sent_at      = now;
  if (body.status === "follow_up_1_sent") patch.follow_up_1_at  = now;
  if (body.status === "follow_up_2_sent") patch.follow_up_2_at  = now;
  if (["replied", "positive", "negative"].includes(body.status)) patch.last_reply_at = now;
  if (body.notes) patch.notes = body.notes;

  const all = await getRows(SHEET.leads);
  const targets = all.filter(({ row }) => body.ids.includes(row.id));

  await Promise.all(targets.map(({ rowIndex }) => updateRow(SHEET.leads, rowIndex, patch)));

  return Response.json({ success: true, updated: targets.length });
}
