import { type NextRequest } from "next/server";
import { SHEET, findRowBy } from "@/lib/sheets";
import { announceEvent as telegramAnnounce } from "@/lib/telegram/bot";
import { announceEvent as facebookAnnounce } from "@/lib/facebook/groups";
import { COMMUNITY_CHANNELS } from "@/config/community-channels";
import { verifyWebhookSignature } from "@/lib/webhook-auth";

// POST /api/events/announce
// Body: { eventId: string }
// Header: x-admin-secret required

export async function POST(request: NextRequest) {
  const signingSecret = process.env.ADMIN_SECRET;
  if (!signingSecret) {
    return Response.json({ error: "Server misconfiguration: missing ADMIN_SECRET" }, { status: 500 });
  }

  const { valid, body: rawBody, error } = await verifyWebhookSignature(request, signingSecret);
  if (!valid) {
    return Response.json({ error: error ?? "Unauthorized" }, { status: 401 });
  }

  let body: { eventId?: string };
  try {
    body = JSON.parse(rawBody) as { eventId?: string };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { eventId } = body;

  if (!eventId) {
    return Response.json({ error: "eventId is required" }, { status: 400 });
  }

  const found = await findRowBy(SHEET.events, "id", eventId);
  if (!found) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  const event = found.row;
  const eventDate = new Date(event.event_date);
  const eventDetails = {
    title: event.title,
    date: eventDate.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    time: eventDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    }),
    venue: event.venue || "Secret Venue, Nimman, Chiang Mai",
    description: event.description || "",
    rsvpUrl: "https://entrepreneursofasia.com/#rsvp",
  };

  const results: Record<string, { ok: boolean; error?: string }> = {};

  // Telegram channel
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChannelId = process.env.TELEGRAM_CHANNEL_ID;

  if (telegramToken && telegramChannelId) {
    try {
      await telegramAnnounce(telegramToken, telegramChannelId, eventDetails);
      results.telegram = { ok: true };
    } catch (err) {
      results.telegram = { ok: false, error: String(err) };
      console.error("[announce] Telegram error:", err);
    }
  } else {
    results.telegram = { ok: false, error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not configured" };
  }

  // Delay between platforms
  if (COMMUNITY_CHANNELS.crossPosting.enabled) {
    await new Promise((r) =>
      setTimeout(r, COMMUNITY_CHANNELS.crossPosting.eventAnnouncement.delayBetweenPlatformsMs)
    );
  }

  // Facebook group
  const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const fbGroupId = process.env.FACEBOOK_GROUP_ID;

  if (fbToken && fbGroupId) {
    try {
      await facebookAnnounce(fbToken, fbGroupId, eventDetails);
      results.facebook = { ok: true };
    } catch (err) {
      results.facebook = { ok: false, error: String(err) };
      console.error("[announce] Facebook error:", err);
    }
  } else {
    results.facebook = { ok: false, error: "FACEBOOK_PAGE_ACCESS_TOKEN or FACEBOOK_GROUP_ID not configured" };
  }

  const allOk = Object.values(results).every((r) => r.ok);
  return Response.json({ results }, { status: allOk ? 200 : 207 });
}
