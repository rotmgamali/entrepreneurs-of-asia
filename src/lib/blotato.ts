/**
 * Blotato API client for multi-platform social media scheduling.
 * Docs: https://app.blotato.com/settings → API Keys → View Docs
 *
 * Environment variables required:
 *   BLOTATO_API_KEY              — found in Blotato Settings → API Keys
 *   BLOTATO_ACCOUNT_ID_FACEBOOK  — Blotato account ID for Facebook
 *   BLOTATO_ACCOUNT_ID_INSTAGRAM — Blotato account ID for Instagram
 *   BLOTATO_ACCOUNT_ID_LINKEDIN  — Blotato account ID for LinkedIn
 *   BLOTATO_ACCOUNT_ID_TWITTER   — Blotato account ID for Twitter/X
 *   BLOTATO_ACCOUNT_ID_TIKTOK    — Blotato account ID for TikTok (optional)
 *   BLOTATO_ACCOUNT_ID_THREADS   — Blotato account ID for Threads (optional)
 */

const BLOTATO_BASE_URL = "https://api.blotato.com";

export type BlotatoPlatform =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "twitter"
  | "tiktok"
  | "threads";

// ─── EOA Hashtag sets ────────────────────────────────────────────────────────

export const HASHTAGS = {
  core:      "#EntrepreneursOfAsia #ChiangMai #Founders",
  nomads:    "#DigitalNomad #DigitalNomadLife #NomadLife #RemoteWork",
  events:    "#ChiangMaiEvents #NetworkingEvent #FounderMeetup",
  community: "#ChiangMaiFounders #StartupCommunity #Entrepreneurship",
  growth:    "#GrowthHacking #StartupLife #BusinessGrowth #Bootstrapped",
  asia:      "#AsiaStartups #SEAStartups #ThailandBusiness #SoutheastAsia",
} as const;

export type HashtagSet = keyof typeof HASHTAGS;

/** Append one or more hashtag sets to the end of a post. */
export function addHashtags(text: string, ...sets: HashtagSet[]): string {
  const tags = sets.map((s) => HASHTAGS[s]).join(" ");
  return `${text}\n\n${tags}`;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BlotatoPostContent {
  text: string;
  mediaUrls?: string[]; // public URLs — images or video
}

export interface BlotatoPostRequest {
  /** Platform to post to */
  platform: BlotatoPlatform;
  /** Blotato social account ID for the target platform (from Settings → Accounts) */
  accountId: string;
  content: BlotatoPostContent;
  /** ISO 8601 datetime to schedule. Omit to post immediately. */
  scheduledAt?: string;
}

export interface BlotatoPostResult {
  postId: string;
  platform: BlotatoPlatform;
  status: "scheduled" | "published" | "failed";
  scheduledAt?: string;
  error?: string;
}

export interface BlotatoBatchResult {
  results: BlotatoPostResult[];
  successCount: number;
  failureCount: number;
}

// ─── Account ID registry ─────────────────────────────────────────────────────

export function getAccountIds(): Partial<Record<BlotatoPlatform, string>> {
  return {
    facebook:  process.env.BLOTATO_ACCOUNT_ID_FACEBOOK  || undefined,
    instagram: process.env.BLOTATO_ACCOUNT_ID_INSTAGRAM || undefined,
    linkedin:  process.env.BLOTATO_ACCOUNT_ID_LINKEDIN  || undefined,
    twitter:   process.env.BLOTATO_ACCOUNT_ID_TWITTER   || undefined,
    tiktok:    process.env.BLOTATO_ACCOUNT_ID_TIKTOK    || undefined,
    threads:   process.env.BLOTATO_ACCOUNT_ID_THREADS   || undefined,
  };
}

// ─── Core posting function ───────────────────────────────────────────────────

/**
 * Schedule a single post via Blotato.
 * When BLOTATO_API_KEY is not set, logs the post and returns a dry-run result
 * instead of throwing — safe for development and staging environments.
 */
export async function schedulePost(
  req: BlotatoPostRequest
): Promise<BlotatoPostResult> {
  const apiKey = process.env.BLOTATO_API_KEY;

  if (!apiKey) {
    console.warn(
      `[blotato] No API key — dry-run post to ${req.platform}:`,
      req.content.text.slice(0, 80) + "..."
    );
    return {
      postId: "dry-run",
      platform: req.platform,
      status: "published",
    };
  }

  const body = {
    platform: req.platform,
    accountId: req.accountId,
    content: {
      text: req.content.text,
      ...(req.content.mediaUrls?.length
        ? { mediaUrls: req.content.mediaUrls }
        : {}),
    },
    ...(req.scheduledAt ? { scheduledAt: req.scheduledAt } : {}),
  };

  const res = await fetch(`${BLOTATO_BASE_URL}/v1/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[blotato] POST /v1/posts failed (${res.status}):`, errorText);
    return {
      postId: "",
      platform: req.platform,
      status: "failed",
      error: errorText,
    };
  }

  const data = (await res.json()) as {
    id: string;
    status: "scheduled" | "published" | "failed";
    scheduledAt?: string;
  };

  return {
    postId: data.id,
    platform: req.platform,
    status: data.status,
    scheduledAt: data.scheduledAt,
  };
}

/**
 * Schedule the same content to multiple platforms at once.
 * Only posts to platforms that have a configured Blotato account ID.
 * Posts fire in parallel — failures are captured per-platform, not thrown.
 */
export async function scheduleBatch(
  posts: BlotatoPostRequest[]
): Promise<BlotatoBatchResult> {
  const results = await Promise.all(posts.map(schedulePost));
  return {
    results,
    successCount: results.filter((r) => r.status !== "failed").length,
    failureCount: results.filter((r) => r.status === "failed").length,
  };
}

/**
 * Post to all configured platforms with per-platform caption formatting.
 * Skips platforms without a configured BLOTATO_ACCOUNT_ID_* env var.
 */
export async function postToAll(
  text: string,
  options: {
    mediaUrls?: string[];
    scheduledAt?: string;
    hashtags?: HashtagSet[];
    platforms?: BlotatoPlatform[];
  } = {}
): Promise<BlotatoBatchResult> {
  const accountIds = getAccountIds();
  const targetPlatforms = options.platforms ?? (Object.keys(accountIds) as BlotatoPlatform[]);
  const hashtagSets = options.hashtags ?? (["core"] as HashtagSet[]);

  const posts: BlotatoPostRequest[] = targetPlatforms
    .filter((p) => accountIds[p])
    .map((platform) => ({
      platform,
      accountId: accountIds[platform]!,
      content: {
        text: formatCaption(text, platform, hashtagSets),
        mediaUrls: options.mediaUrls,
      },
      scheduledAt: options.scheduledAt,
    }));

  if (posts.length === 0) {
    console.warn("[blotato] postToAll: no platforms configured — check BLOTATO_ACCOUNT_ID_* env vars");
    return { results: [], successCount: 0, failureCount: 0 };
  }

  return scheduleBatch(posts);
}

// ─── Caption formatter ───────────────────────────────────────────────────────

/**
 * Format platform-specific caption from raw content.
 * Applies character limits and hashtag placement rules per platform.
 */
export function formatCaption(
  rawText: string,
  platform: BlotatoPlatform,
  hashtagSets: HashtagSet[] | string[] = ["core"]
): string {
  // Resolve HashtagSet keys vs raw hashtag strings
  const tagString = hashtagSets
    .map((t) => (t in HASHTAGS ? HASHTAGS[t as HashtagSet] : t.startsWith("#") ? t : `#${t}`))
    .join(" ");

  const hashtags = tagString.split(/\s+/).filter(Boolean);

  switch (platform) {
    case "twitter": {
      // Twitter/X: 280 chars, max 2 hashtags inline
      const topTags = hashtags.slice(0, 2).join(" ");
      const withTags = topTags ? `${rawText.trim()} ${topTags}` : rawText.trim();
      return withTags.slice(0, 280);
    }
    case "linkedin": {
      // LinkedIn: 3000 chars, 3–5 hashtags at end
      const topTags = hashtags.slice(0, 5).join(" ");
      return `${rawText.trim()}\n\n${topTags}`.slice(0, 3000);
    }
    case "instagram": {
      // Instagram: 2200 chars, hashtags at end of caption
      return `${rawText.trim()}\n\n${tagString}`.slice(0, 2200);
    }
    case "tiktok": {
      // TikTok: 2200 chars, hashtags inline/end
      return `${rawText.trim()}\n\n${tagString}`.slice(0, 2200);
    }
    case "threads": {
      // Threads: 500 chars
      const topTags = hashtags.slice(0, 3).join(" ");
      const withTags = topTags ? `${rawText.trim()}\n\n${topTags}` : rawText.trim();
      return withTags.slice(0, 500);
    }
    case "facebook":
    default: {
      // Facebook: 63,206 chars, minimal hashtags
      const topTags = hashtags.slice(0, 3).join(" ");
      return topTags ? `${rawText.trim()}\n\n${topTags}` : rawText.trim();
    }
  }
}

// ─── EOA post templates ───────────────────────────────────────────────────────

/**
 * Format an event announcement post.
 * Returns ready-to-post text with EOA branding.
 */
export function formatEventAnnouncement(event: {
  title: string;
  date: string;   // human-readable, e.g. "Thursday 10 April"
  time: string;   // e.g. "6:00 PM"
  venue: string;
  description?: string;
  rsvpUrl?: string;
}): string {
  const lines = [
    `📅 ${event.title}`,
    ``,
    `📆 ${event.date} @ ${event.time} (ICT)`,
    `📍 ${event.venue}`,
  ];

  if (event.description) {
    lines.push(``, event.description);
  }

  if (event.rsvpUrl) {
    lines.push(``, `🎟 RSVP: ${event.rsvpUrl}`);
  }

  return addHashtags(lines.join("\n"), "core", "events", "community");
}

/**
 * Format a post for an event clip/recording snippet.
 * Used when N8N extracts clips from event recordings and posts them.
 */
export function formatEventClip(clip: {
  eventTitle: string;
  speakerName?: string;
  highlight: string;   // 1-line hook for the clip
  clipUrl?: string;    // public URL of the clip (if hosted)
}): string {
  const speakerLine = clip.speakerName ? `🎤 ${clip.speakerName}` : "";
  const lines = [
    `🎬 ${clip.highlight}`,
    ...(speakerLine ? [speakerLine] : []),
    ``,
    `From our ${clip.eventTitle} event`,
    ...(clip.clipUrl ? [``, `▶️ ${clip.clipUrl}`] : []),
  ];

  return addHashtags(lines.join("\n"), "core", "nomads", "community");
}

/**
 * Format a founder spotlight post.
 */
export function formatFounderSpotlight(founder: {
  name: string;
  company: string;
  oneliner: string;
  quote?: string;
}): string {
  const lines = [
    `🌟 Founder Spotlight: ${founder.name}`,
    ``,
    `${founder.company} — ${founder.oneliner}`,
    ...(founder.quote ? [``, `"${founder.quote}"`] : []),
  ];

  return addHashtags(lines.join("\n"), "core", "community", "growth");
}
