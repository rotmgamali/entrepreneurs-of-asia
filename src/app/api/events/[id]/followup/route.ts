// POST /api/events/:id/followup
// Triggers post-event follow-up sequences for all attendees of a given event.
// Protected by ADMIN_SECRET header.
//
// Body: { segment_overrides?: Record<contactId, SequenceSegment> }

import { type NextRequest } from "next/server";
import { SHEET, findRowBy, getRows } from "@/lib/sheets";
import {
  FOLLOWUP_SEQUENCES,
  getWebhookEnvKey,
  type SequenceSegment,
} from "@/config/followup-sequences";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && request.headers.get("x-admin-secret") !== adminSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const body = await request.json().catch(() => ({}));
  const segmentOverrides: Record<string, SequenceSegment> = body.segment_overrides ?? {};

  // Fetch event
  const eventFound = await findRowBy(SHEET.events, "id", eventId);
  if (!eventFound) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }
  const event = eventFound.row;

  // Fetch attendees who actually attended, then load their contact records
  const allAttendees = await getRows(SHEET.attendees);
  const eventAttendees = allAttendees.filter(
    ({ row }) => row.event_id === eventId && row.rsvp_status === "attended"
  );

  if (eventAttendees.length === 0) {
    return Response.json({ message: "No attended records found — nothing to trigger." });
  }

  // Load all contacts and partners for join + classification
  const [allContacts, allPartners] = await Promise.all([
    getRows(SHEET.contacts),
    getRows(SHEET.partners),
  ]);

  const contactMap = new Map(allContacts.map(({ row }) => [row.id, row]));

  const speakerEmails = new Set(
    allPartners
      .filter(({ row }) => row.type === "speaker" && row.email)
      .map(({ row }) => row.email.toLowerCase())
  );
  const sponsorEmails = new Set(
    allPartners
      .filter(({ row }) => row.type === "sponsor" && row.email)
      .map(({ row }) => row.email.toLowerCase())
  );

  // Determine returning attendees (attended other events before)
  const contactIds = eventAttendees.map(({ row }) => row.contact_id);
  const returningIds = new Set(
    allAttendees
      .filter(({ row }) =>
        row.rsvp_status === "attended" &&
        row.event_id !== eventId &&
        contactIds.includes(row.contact_id)
      )
      .map(({ row }) => row.contact_id)
  );

  // Classify attendees into segments
  type AttendeeWithContact = { contact: { id: string; name: string; email: string } };
  const groups: Record<SequenceSegment, AttendeeWithContact[]> = {
    new_attendee: [],
    returning_attendee: [],
    speaker: [],
    sponsor: [],
  };

  for (const { row: attendee } of eventAttendees) {
    const contact = contactMap.get(attendee.contact_id);
    if (!contact) continue;

    const email = contact.email?.toLowerCase() ?? "";
    let segment: SequenceSegment;

    if (segmentOverrides[contact.id]) {
      segment = segmentOverrides[contact.id];
    } else if (sponsorEmails.has(email)) {
      segment = "sponsor";
    } else if (speakerEmails.has(email)) {
      segment = "speaker";
    } else if (returningIds.has(contact.id)) {
      segment = "returning_attendee";
    } else {
      segment = "new_attendee";
    }

    groups[segment].push({ contact: { id: contact.id, name: contact.name, email: contact.email } });
  }

  // Fire N8N webhooks per segment
  const results: Record<string, { fired: number; skipped: boolean; reason?: string }> = {};

  for (const segment of Object.keys(groups) as SequenceSegment[]) {
    const group = groups[segment];
    const envKey = getWebhookEnvKey(segment);
    const webhookUrl = process.env[envKey];
    const sequence = FOLLOWUP_SEQUENCES[segment];

    if (group.length === 0) {
      results[segment] = { fired: 0, skipped: true, reason: "no attendees in segment" };
      continue;
    }

    if (!webhookUrl) {
      console.warn(`[followup] ${envKey} not set — skipping ${segment}`);
      results[segment] = { fired: 0, skipped: true, reason: `${envKey} env var not set` };
      continue;
    }

    const payload = {
      event: { id: event.id, title: event.title, event_date: event.event_date },
      sequence: { segment, label: sequence.label, steps: sequence.steps },
      attendees: group.map(({ contact }) => contact),
      triggered_at: new Date().toISOString(),
    };

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error(`[followup] N8N ${segment} webhook error:`, res.status, await res.text());
        results[segment] = { fired: 0, skipped: true, reason: `N8N returned ${res.status}` };
      } else {
        results[segment] = { fired: group.length, skipped: false };
      }
    } catch (err) {
      console.error(`[followup] fetch error for ${segment}:`, err);
      results[segment] = { fired: 0, skipped: true, reason: "network error" };
    }
  }

  return Response.json({ eventId, results });
}
