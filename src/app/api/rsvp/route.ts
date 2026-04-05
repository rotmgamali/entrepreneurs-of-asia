import { type NextRequest } from "next/server";
import { SHEET, appendRow, upsertRow, updateRow, getRows } from "@/lib/sheets";
import { signWebhookPayload } from "@/lib/webhook-auth";

interface RSVPPayload {
  name: string;
  email: string;
  whatsapp: string;
  businessNiche: string;
  website?: string;
  socials?: string;
}

const NICHE_KEYWORDS = ["saas", "ecomm", "founder", "agency", "consultant", "developer"];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function computeScore(payload: RSVPPayload): number {
  let score = 0;
  if (payload.website?.trim()) score += 1;
  if (payload.socials?.trim()) score += 1;
  const niche = payload.businessNiche.toLowerCase();
  if (NICHE_KEYWORDS.some((kw) => niche.includes(kw))) score += 1;
  return score;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RSVPPayload;

  if (
    !body.name?.trim() ||
    !body.email?.trim() ||
    !body.whatsapp?.trim() ||
    !body.businessNiche?.trim()
  ) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!isValidEmail(body.email)) {
    return Response.json({ error: "Invalid email address" }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const score = computeScore(body);

  try {
    // Insert prospect
    await appendRow(SHEET.prospects, {
      name: body.name.trim(),
      email,
      whatsapp: body.whatsapp.trim(),
      business_niche: body.businessNiche.trim(),
      website: body.website?.trim() || "",
      socials: body.socials?.trim() || "",
      status: "pending",
      source: "website",
      score: String(score),
    });

    // Upsert contact
    const contact = await upsertRow(SHEET.contacts, "email", {
      name: body.name.trim(),
      email,
      whatsapp: body.whatsapp.trim(),
      business_niche: body.businessNiche.trim(),
      website: body.website?.trim() || "",
      socials: body.socials?.trim() || "",
      status: "pending",
    });

    // Register attendance for next upcoming event (best-effort)
    const now = new Date().toISOString();
    const allEvents = await getRows(SHEET.events);
    const upcomingEvents = allEvents
      .filter(({ row }) => row.is_public === "true" && row.event_date >= now)
      .sort((a, b) => a.row.event_date.localeCompare(b.row.event_date));
    const nextEvent = upcomingEvents[0];

    if (nextEvent && contact.id) {
      const attendees = await getRows(SHEET.attendees);
      const alreadyRsvp = attendees.find(
        ({ row }) => row.event_id === nextEvent.row.id && row.contact_id === contact.id
      );
      if (!alreadyRsvp) {
        await appendRow(SHEET.attendees, {
          event_id: nextEvent.row.id,
          contact_id: contact.id,
          rsvp_status: "rsvp",
        });
        const currentCount = parseInt(nextEvent.row.rsvp_count || "0", 10);
        await updateRow(SHEET.events, nextEvent.rowIndex, {
          rsvp_count: String(currentCount + 1),
        });
      }
    }
  } catch (err) {
    console.error("[POST /api/rsvp] sheets error:", err);
    return Response.json({ error: "Failed to save submission" }, { status: 500 });
  }

  // Forward to N8N RSVP webhook
  const webhookUrl = process.env.N8N_RSVP_WEBHOOK_URL;
  if (webhookUrl) {
    const payload = {
      name: body.name.trim(),
      email,
      whatsapp: body.whatsapp.trim(),
      business_niche: body.businessNiche.trim(),
      website: body.website?.trim() || null,
      socials: body.socials?.trim() || null,
      status: "pending",
      source: "website",
      score,
      submitted_at: new Date().toISOString(),
    };
    const payloadStr = JSON.stringify(payload);
    const n8nSecret = process.env.N8N_WEBHOOK_SIGNING_SECRET;
    const sigHeaders = n8nSecret ? signWebhookPayload(payloadStr, n8nSecret) : {};
    const webhookRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...sigHeaders },
      body: payloadStr,
    });
    if (!webhookRes.ok) {
      console.error("[POST /api/rsvp] N8N webhook error:", webhookRes.status, await webhookRes.text());
    }
  } else {
    console.log("[RSVP submission]", { email, name: body.name.trim(), score });
  }

  return Response.json({ success: true });
}
