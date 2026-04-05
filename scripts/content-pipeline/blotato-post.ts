/**
 * Entrepreneurs of Asia — Blotato Social Media Posting Wrapper
 *
 * Posts content to multiple platforms via Blotato API.
 * Adapted from Demons & Deities production pipeline.
 *
 * Setup:
 *   1. Create Blotato account and connect social platforms
 *   2. Get API key from Blotato dashboard
 *   3. Set BLOTATO_API_KEY in .env
 *
 * Usage:
 *   import { postToAll, schedulePost, formatEventTeaser, formatSpeakerSpotlight } from './blotato-post';
 *
 * CLI usage:
 *   npx ts-node scripts/content-pipeline/blotato-post.ts --text "Hello world!" --platforms twitter,instagram,linkedin
 *   npx ts-node scripts/content-pipeline/blotato-post.ts --text "Scheduled post" --schedule "2026-04-01T12:00:00Z"
 *
 * Dependencies: none (uses native fetch)
 */

// ─── Config ────────────────────────────────────────────────────────
const BLOTATO_API_KEY = process.env.BLOTATO_API_KEY;
const BLOTATO_BASE_URL = process.env.BLOTATO_API_URL || 'https://api.blotato.com/v1';

export type Platform = 'twitter' | 'instagram' | 'tiktok' | 'facebook' | 'linkedin' | 'pinterest' | 'threads';

export interface PostOptions {
  text: string;
  mediaUrls?: string[];
  platforms?: Platform[];
  scheduledAt?: string; // ISO 8601
  replyToId?: string;   // Platform-specific reply threading
  altText?: string;     // Alt text for images (accessibility)
}

export interface PostResult {
  success: boolean;
  postId?: string;
  platformResults?: Record<string, { success: boolean; postId?: string; error?: string }>;
  error?: string;
}

// ─── Default platforms ─────────────────────────────────────────────
const DEFAULT_PLATFORMS: Platform[] = ['twitter', 'instagram', 'tiktok', 'linkedin', 'facebook'];

// ─── Hashtag sets ──────────────────────────────────────────────────
export const HASHTAGS = {
  core: '#EntrepreneursOfAsia #ChiangMaiFounders #DigitalNomads',
  gameplay: '#ChiangMaiEvents #FounderMeetup #NetworkingCM #StartupChiangMai',
  crypto: '#DigitalNomadLife #RemoteWork #LocationIndependent #NomadCommunity',
  launch: '#LocalSEO #ContentCreation #PersonalBranding #GrowthHacking',
  founders: '#FounderStory #StartupAdvice #EntrepreneurMindset #BuildInPublic',
  presale: '#ChiangMai #Thailand #NomadThailand #ExpatsThailand',
};

export function addHashtags(text: string, ...sets: (keyof typeof HASHTAGS)[]): string {
  const tags = sets.map(s => HASHTAGS[s]).join(' ');
  return `${text}\n\n${tags}`;
}

// ─── Core posting function ─────────────────────────────────────────
export async function post(options: PostOptions): Promise<PostResult> {
  if (!BLOTATO_API_KEY) {
    console.warn('[Blotato] No API key set — logging post instead of sending');
    console.log('[Blotato] Would post:', {
      text: options.text.slice(0, 100) + '...',
      platforms: options.platforms || DEFAULT_PLATFORMS,
      scheduledAt: options.scheduledAt || 'now',
      mediaCount: options.mediaUrls?.length || 0,
    });
    return { success: true, postId: 'dry-run' };
  }

  try {
    const res = await fetch(`${BLOTATO_BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BLOTATO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: options.text,
        media_urls: options.mediaUrls,
        platforms: options.platforms || DEFAULT_PLATFORMS,
        scheduled_at: options.scheduledAt,
        alt_text: options.altText,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[Blotato] API error ${res.status}: ${errBody}`);
      return { success: false, error: `API returned ${res.status}: ${errBody}` };
    }

    const data = await res.json() as { id?: string; post_id?: string; results?: Record<string, unknown> };
    console.log(`[Blotato] Posted successfully: ${data.id || data.post_id}`);
    return { success: true, postId: data.id || data.post_id };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Blotato] Request failed: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}

// ─── Convenience functions ─────────────────────────────────────────
export function postToAll(text: string, mediaUrls?: string[]): Promise<PostResult> {
  return post({ text, mediaUrls, platforms: DEFAULT_PLATFORMS });
}

export function postToTwitter(text: string, mediaUrls?: string[]): Promise<PostResult> {
  return post({ text, mediaUrls, platforms: ['twitter'] });
}

export function postToDiscordPlatforms(text: string, mediaUrls?: string[]): Promise<PostResult> {
  // Blotato may not support Discord — use Discord webhook separately
  // This posts to the visual platforms
  return post({ text, mediaUrls, platforms: ['twitter', 'instagram'] });
}

export function schedulePost(text: string, scheduledAt: string, platforms?: Platform[], mediaUrls?: string[]): Promise<PostResult> {
  return post({ text, mediaUrls, platforms, scheduledAt });
}

// ─── Batch scheduler: schedule multiple posts ──────────────────────
export async function scheduleBatch(posts: Array<PostOptions & { label?: string }>): Promise<void> {
  console.log(`[Blotato] Scheduling ${posts.length} posts...`);
  for (const p of posts) {
    const result = await post(p);
    const label = p.label || p.text.slice(0, 40);
    if (result.success) {
      console.log(`  ✅ ${label}${p.scheduledAt ? ` → ${p.scheduledAt}` : ''}`);
    } else {
      console.log(`  ❌ ${label} — ${result.error}`);
    }
    // Small delay between API calls to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
  console.log('[Blotato] Batch complete.');
}

// ─── Character-specific post template ──────────────────────────────
export function formatCharacterReveal(character: {
  name: string;
  origin: string;
  class: string;
  tier: number;
  description: string;
  ability_name: string;
  lore?: string;
}, dayNumber: number, portraitUrl?: string): PostOptions {
  const tierStars = '⭐'.repeat(character.tier);
  const text = addHashtags(
    `🎴 Character Reveal #${dayNumber}\n\n` +
    `${character.name} ${tierStars}\n` +
    `${character.origin} ${character.class}\n\n` +
    `"${character.description}"\n\n` +
    `✨ Ability: ${character.ability_name}\n\n` +
    `72 heroes. 14 factions. Which faction do you main?`,
    'core', 'gameplay'
  );

  return {
    text,
    mediaUrls: portraitUrl ? [portraitUrl] : undefined,
    platforms: DEFAULT_PLATFORMS,
  };
}

// ─── Countdown post template ───────────────────────────────────────
export function formatCountdown(daysLeft: number, highlight: string): PostOptions {
  const emoji = daysLeft <= 3 ? '🔥' : daysLeft <= 7 ? '⏰' : '📅';
  const urgency = daysLeft <= 1 ? 'TOMORROW' : `${daysLeft} DAYS`;

  const text = addHashtags(
    `${emoji} ${urgency} until Founder's Pass mint!\n\n` +
    `${highlight}\n\n` +
    `200 passes. 500 USDC. Revenue share. Governance. Exclusive cosmetics.\n` +
    `When they're gone, they're gone.\n\n` +
    `🏛️ https://demonsanddeities.com/founders-pass`,
    'core', 'founders'
  );

  return { text, platforms: DEFAULT_PLATFORMS };
}

// ─── Dev update post template ──────────────────────────────────────
export function formatDevUpdate(title: string, bullets: string[]): PostOptions {
  const text = addHashtags(
    `🔨 Dev Update: ${title}\n\n` +
    bullets.map(b => `✦ ${b}`).join('\n') +
    `\n\n🎮 https://play.demonsanddeities.com`,
    'core', 'launch'
  );

  return { text, platforms: ['twitter'] };
}

// ─── CLI mode ──────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Blotato Social Posting Tool — Demons & Deities\n');
    console.log('Usage:');
    console.log('  --text "Your post text" [--platforms twitter,instagram] [--schedule "ISO date"] [--media "url1,url2"]');
    console.log('  --test                   Send a test post');
    console.log('\nImport as module:');
    console.log('  import { postToAll, schedulePost, formatCharacterReveal } from "./blotato-post";');
    return;
  }

  if (args[0] === '--test') {
    const result = await postToAll('⚔️ Test post from Demons & Deities bot! 🎮\n\nhttps://demonsanddeities.com');
    console.log('Result:', result);
    return;
  }

  // Parse CLI args
  let text = '';
  let platforms: Platform[] = DEFAULT_PLATFORMS;
  let scheduledAt: string | undefined;
  let mediaUrls: string[] | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--text' && args[i + 1]) { text = args[++i]; }
    if (args[i] === '--platforms' && args[i + 1]) { platforms = args[++i].split(',') as Platform[]; }
    if (args[i] === '--schedule' && args[i + 1]) { scheduledAt = args[++i]; }
    if (args[i] === '--media' && args[i + 1]) { mediaUrls = args[++i].split(','); }
  }

  if (!text) {
    console.error('Missing --text argument');
    process.exit(1);
  }

  const result = await post({ text, platforms, scheduledAt, mediaUrls });
  console.log('Result:', result);
}

main().catch(console.error);
