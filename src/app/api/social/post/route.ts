/**
 * POST /api/social/post
 *
 * Webhook endpoint for N8N → Blotato social posting pipeline.
 * Auth: X-Admin-Secret header must match ADMIN_SECRET env var.
 */

import { type NextRequest } from "next/server";
import {
  scheduleBatch,
  formatCaption,
  type BlotatoPlatform,
  type BlotatoPostRequest,
} from "@/lib/blotato";
import { SHEET, appendRow } from "@/lib/sheets";
import { verifyWebhookSignature } from "@/lib/webhook-auth";

const BLOTATO_ACCOUNT_IDS: Partial<Record<BlotatoPlatform, string>> = {
  facebook:  process.env.BLOTATO_ACCOUNT_ID_FACEBOOK  || undefined,
  instagram: process.env.BLOTATO_ACCOUNT_ID_INSTAGRAM || undefined,
  linkedin:  process.env.BLOTATO_ACCOUNT_ID_LINKEDIN  || undefined,
  twitter:   process.env.BLOTATO_ACCOUNT_ID_TWITTER   || undefined,
  tiktok:    process.env.BLOTATO_ACCOUNT_ID_TIKTOK    || undefined,
  threads:   process.env.BLOTATO_ACCOUNT_ID_THREADS   || undefined,
};

interface PostPayload {
  content: string;
  hashtags?: string[];
  mediaUrls?: string[];
  scheduledAt?: string;
  platforms?: BlotatoPlatform[];
  source?: string;
  eventId?: string;
}

export async function POST(request: NextRequest) {
  const signingSecret = process.env.ADMIN_SECRET;
  if (!signingSecret) {
    return Response.json({ error: "Server misconfiguration: missing ADMIN_SECRET" }, { status: 500 });
  }

  const { valid, body: rawBody, error } = await verifyWebhookSignature(request, signingSecret);
  if (!valid) {
    return Response.json({ error: error ?? "Unauthorized" }, { status: 401 });
  }

  let body: PostPayload;
  try {
    body = JSON.parse(rawBody) as PostPayload;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.content?.trim()) {
    return Response.json({ error: "content is required" }, { status: 400 });
  }

  const platforms: BlotatoPlatform[] = body.platforms ?? [
    "facebook", "instagram", "linkedin", "twitter",
  ];

  const hashtags = body.hashtags ?? ["EntrepreneursOfAsia", "ChiangMai", "DigitalNomad"];

  const posts: BlotatoPostRequest[] = platforms
    .filter((p) => BLOTATO_ACCOUNT_IDS[p])
    .map((platform) => ({
      platform,
      accountId: BLOTATO_ACCOUNT_IDS[platform]!,
      content: {
        text: formatCaption(body.content, platform, hashtags),
        mediaUrls: body.mediaUrls,
      },
      scheduledAt: body.scheduledAt,
    }));

  if (posts.length === 0) {
    return Response.json(
      { error: "No Blotato account IDs configured. Set BLOTATO_ACCOUNT_ID_* env vars." },
      { status: 500 }
    );
  }

  const batchResult = await scheduleBatch(posts);

  // Audit log to Social_Posts_Log sheet (best-effort)
  try {
    await appendRow(SHEET.socialLogs, {
      source: body.source ?? "api",
      event_id: body.eventId ?? "",
      content_preview: body.content.slice(0, 200),
      platforms: JSON.stringify(platforms),
      scheduled_at: body.scheduledAt ?? "",
      blotato_results: JSON.stringify(batchResult.results),
      success_count: String(batchResult.successCount),
      failure_count: String(batchResult.failureCount),
    });
  } catch (err) {
    console.warn("[social/post] audit log insert failed:", err);
  }

  return Response.json({
    success: batchResult.failureCount === 0,
    successCount: batchResult.successCount,
    failureCount: batchResult.failureCount,
    results: batchResult.results,
  });
}
