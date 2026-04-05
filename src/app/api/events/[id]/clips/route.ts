/**
 * POST /api/events/:id/clips
 *
 * Called by N8N after clip extraction from an event recording.
 * Posts the clip to configured social platforms via Blotato.
 *
 * Auth: X-Admin-Secret header (matches ADMIN_SECRET env var)
 *
 * Body:
 *   clipUrl      — public URL of the extracted video clip
 *   highlight    — 1-line hook (shown as the post headline)
 *   speakerName  — optional speaker attribution
 *   platforms    — optional subset of platforms to post to
 *   scheduledAt  — optional ISO 8601 datetime to schedule (omit = post now)
 *   hashtags     — optional hashtag sets: "core"|"nomads"|"events"|"community"|"growth"|"asia"
 */

import { type NextRequest } from "next/server";
import {
  postToAll,
  formatEventClip,
  type BlotatoPlatform,
  type HashtagSet,
} from "@/lib/blotato";
import { SHEET, appendRow, findRowBy } from "@/lib/sheets";
import { verifyWebhookSignature } from "@/lib/webhook-auth";

type Params = { params: Promise<{ id: string }> };

interface ClipPayload {
  clipUrl: string;
  highlight: string;
  speakerName?: string;
  platforms?: BlotatoPlatform[];
  scheduledAt?: string;
  hashtags?: HashtagSet[];
}

export async function POST(request: NextRequest, { params }: Params) {
  const signingSecret = process.env.ADMIN_SECRET;
  if (!signingSecret) {
    return Response.json(
      { error: "Server misconfiguration: missing ADMIN_SECRET" },
      { status: 500 }
    );
  }

  const { valid, body: rawBody, error } = await verifyWebhookSignature(
    request,
    signingSecret
  );
  if (!valid) {
    return Response.json({ error: error ?? "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  let body: ClipPayload;
  try {
    body = JSON.parse(rawBody) as ClipPayload;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.clipUrl?.trim()) {
    return Response.json({ error: "clipUrl is required" }, { status: 400 });
  }
  if (!body.highlight?.trim()) {
    return Response.json({ error: "highlight is required" }, { status: 400 });
  }

  // Look up the event to get the title (best-effort — continue even if not found)
  let eventTitle = "EOA Event";
  try {
    const found = await findRowBy(SHEET.events, "id", eventId);
    if (found) eventTitle = found.row.title || eventTitle;
  } catch (err) {
    console.warn("[clips] Could not fetch event row:", err);
  }

  const caption = formatEventClip({
    eventTitle,
    speakerName: body.speakerName,
    highlight: body.highlight,
    clipUrl: body.clipUrl,
  });

  const batchResult = await postToAll(caption, {
    mediaUrls: [body.clipUrl],
    scheduledAt: body.scheduledAt,
    hashtags: body.hashtags ?? ["core", "nomads", "community"],
    platforms: body.platforms,
  });

  // Audit log to Social_Posts_Log sheet (best-effort)
  try {
    await appendRow(SHEET.socialLogs, {
      source: "event_clip",
      event_id: eventId,
      content_preview: body.highlight.slice(0, 200),
      platforms: JSON.stringify(
        batchResult.results.map((r) => r.platform)
      ),
      scheduled_at: body.scheduledAt ?? "",
      blotato_results: JSON.stringify(batchResult.results),
      success_count: String(batchResult.successCount),
      failure_count: String(batchResult.failureCount),
    });
  } catch (err) {
    console.warn("[clips] audit log insert failed:", err);
  }

  return Response.json(
    {
      eventId,
      eventTitle,
      success: batchResult.failureCount === 0,
      successCount: batchResult.successCount,
      failureCount: batchResult.failureCount,
      results: batchResult.results,
    },
    { status: batchResult.failureCount === 0 ? 200 : 207 }
  );
}
