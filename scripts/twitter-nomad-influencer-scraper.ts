/**
 * Twitter/X Digital Nomad & Influencer Finder
 *
 * Finds and ranks Chiang Mai-based and digital nomad content creators
 * by engagement rate. Adapted from D&D crypto influencer scraper.
 *
 * Targets: digital nomad creators, CM-based YouTubers/bloggers,
 * travel vloggers, remote work influencers.
 *
 * Setup:
 *   1. Go to developer.twitter.com → create a project/app
 *   2. Get your Bearer Token
 *   3. Add to .env: TWITTER_BEARER_TOKEN=your_token_here
 *   4. Run: npx ts-node scripts/twitter-nomad-influencer-scraper.ts
 *
 * Output: scripts/output/nomad-influencer-targets.md + .json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

if (!BEARER_TOKEN) {
  console.error(`
╔════════════════════════════════════════════════════════════╗
║  TWITTER_BEARER_TOKEN not found in .env                    ║
║                                                            ║
║  1. Go to developer.twitter.com                            ║
║  2. Create a project + app (free tier works)               ║
║  3. Generate a Bearer Token                                ║
║  4. Add to .env: TWITTER_BEARER_TOKEN=your_token           ║
╚════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

// ─── Search Queries ─────────────────────────────────────────
// Free tier = 1,500 tweets/month. Budget ~100 per query.
const SEARCH_QUERIES = [
  // Core nomad + Chiang Mai terms
  '"Chiang Mai" "digital nomad" -is:retweet lang:en',
  '"Chiang Mai" "remote work" OR "working remotely" -is:retweet lang:en',
  // Nomad lifestyle
  '"digital nomad" "Thailand" OR "Southeast Asia" -is:retweet lang:en',
  '"nomad life" OR "nomadic life" "travel" -is:retweet lang:en',
  // Remote work + travel bloggers
  '"remote work" "travel blogger" OR "travel vlog" -is:retweet lang:en',
  '"location independent" OR "work from anywhere" -is:retweet lang:en',
  // Slow travel / expat communities
  '"slow travel" OR "expat life" "Thailand" OR "Chiang Mai" -is:retweet lang:en',
  // EOA-adjacent: entrepreneurs abroad, nomad entrepreneurs
  '"nomad entrepreneur" OR "traveling entrepreneur" -is:retweet lang:en',
];

const TWEETS_PER_QUERY = 100;

// ─── Types ──────────────────────────────────────────────────
interface TweetUser {
  id: string;
  username: string;
  name: string;
  followers: number;
  following: number;
  tweetCount: number;
  description: string;
  verified: boolean;
  createdAt: string;
}

interface TweetData {
  id: string;
  text: string;
  authorId: string;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  createdAt: string;
}

interface InfluencerProfile {
  username: string;
  name: string;
  followers: number;
  following: number;
  description: string;
  verified: boolean;
  accountAge: string;
  totalTweets: number;
  totalLikes: number;
  totalRetweets: number;
  totalReplies: number;
  avgEngagement: number;
  engagementRate: number;
  score: number;
  tier: 'S' | 'A' | 'B' | 'C';
  matchedQueries: string[];
  sampleTweets: string[];
}

// ─── Twitter API Client ─────────────────────────────────────
async function twitterGet(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`https://api.twitter.com/2/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
  });

  if (res.status === 429) {
    const resetTime = res.headers.get('x-rate-limit-reset');
    const waitSec = resetTime ? Math.max(0, parseInt(resetTime) - Math.floor(Date.now() / 1000)) : 60;
    console.log(`  ⏳ Rate limited — waiting ${waitSec}s...`);
    await sleep(waitSec * 1000 + 1000);
    return twitterGet(endpoint, params);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Twitter API ${res.status}: ${body}`);
  }

  return res.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Search Tweets ──────────────────────────────────────────
async function searchTweets(query: string, maxResults: number): Promise<{ tweets: TweetData[]; users: Map<string, TweetUser> }> {
  const tweets: TweetData[] = [];
  const users = new Map<string, TweetUser>();
  let nextToken: string | undefined;
  let fetched = 0;

  while (fetched < maxResults) {
    const batchSize = Math.min(maxResults - fetched, 100);

    const params: Record<string, string> = {
      query,
      max_results: String(Math.max(batchSize, 10)),
      'tweet.fields': 'author_id,public_metrics,created_at',
      'user.fields': 'public_metrics,description,verified,created_at',
      expansions: 'author_id',
    };
    if (nextToken) params.next_token = nextToken;

    const data = await twitterGet('tweets/search/recent', params);

    if (!data.data) break;

    for (const tweet of data.data) {
      tweets.push({
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id,
        likes: tweet.public_metrics?.like_count ?? 0,
        retweets: tweet.public_metrics?.retweet_count ?? 0,
        replies: tweet.public_metrics?.reply_count ?? 0,
        quotes: tweet.public_metrics?.quote_count ?? 0,
        createdAt: tweet.created_at,
      });
    }

    if (data.includes?.users) {
      for (const user of data.includes.users) {
        users.set(user.id, {
          id: user.id,
          username: user.username,
          name: user.name,
          followers: user.public_metrics?.followers_count ?? 0,
          following: user.public_metrics?.following_count ?? 0,
          tweetCount: user.public_metrics?.tweet_count ?? 0,
          description: user.description ?? '',
          verified: user.verified ?? false,
          createdAt: user.created_at,
        });
      }
    }

    fetched += data.data.length;
    nextToken = data.meta?.next_token;
    if (!nextToken) break;

    await sleep(1100);
  }

  return { tweets, users };
}

// ─── Build Influencer Profiles ──────────────────────────────
function buildProfiles(
  allTweets: TweetData[],
  allUsers: Map<string, TweetUser>,
  queryMap: Map<string, string[]>
): InfluencerProfile[] {
  const byAuthor = new Map<string, TweetData[]>();
  for (const tweet of allTweets) {
    const existing = byAuthor.get(tweet.authorId) ?? [];
    existing.push(tweet);
    byAuthor.set(tweet.authorId, existing);
  }

  const profiles: InfluencerProfile[] = [];

  for (const [authorId, tweets] of byAuthor.entries()) {
    const user = allUsers.get(authorId);
    if (!user) continue;

    // Skip tiny accounts (< 500 followers) — nomad niche is smaller than crypto
    if (user.followers < 500) continue;

    const totalLikes = tweets.reduce((s, t) => s + t.likes, 0);
    const totalRetweets = tweets.reduce((s, t) => s + t.retweets, 0);
    const totalReplies = tweets.reduce((s, t) => s + t.replies, 0);
    const totalEngagement = totalLikes + totalRetweets + totalReplies;
    const avgEngagement = totalEngagement / tweets.length;
    const engagementRate = user.followers > 0 ? (avgEngagement / user.followers) * 100 : 0;

    const created = new Date(user.createdAt);
    const months = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const accountAge = months > 12 ? `${Math.floor(months / 12)}y ${months % 12}m` : `${months}m`;

    const score =
      Math.log10(Math.max(user.followers, 500)) *
      engagementRate *
      Math.sqrt(tweets.length) *
      (queryMap.get(authorId)?.length ?? 1);

    let tier: 'S' | 'A' | 'B' | 'C';
    if (user.followers >= 50000 && engagementRate > 1) tier = 'S';
    else if (user.followers >= 10000 && engagementRate > 0.5) tier = 'A';
    else if (user.followers >= 2000 && engagementRate > 0.3) tier = 'B';
    else tier = 'C';

    const matchCount = queryMap.get(authorId)?.length ?? 1;
    if (matchCount >= 3 && tier === 'B') tier = 'A';
    if (matchCount >= 4 && tier === 'A') tier = 'S';

    profiles.push({
      username: user.username,
      name: user.name,
      followers: user.followers,
      following: user.following,
      description: user.description,
      verified: user.verified,
      accountAge,
      totalTweets: tweets.length,
      totalLikes,
      totalRetweets,
      totalReplies,
      avgEngagement,
      engagementRate,
      score,
      tier,
      matchedQueries: queryMap.get(authorId) ?? [],
      sampleTweets: tweets.slice(0, 3).map(t => t.text.substring(0, 140)),
    });
  }

  profiles.sort((a, b) => b.score - a.score);
  return profiles;
}

// ─── Output Results ─────────────────────────────────────────
function outputResults(profiles: InfluencerProfile[]) {
  const outputDir = path.resolve(__dirname, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, 'nomad-influencers.json');
  fs.writeFileSync(jsonPath, JSON.stringify(profiles, null, 2));

  const lines: string[] = [
    '# Digital Nomad & Chiang Mai Influencer Target List',
    `Generated: ${new Date().toISOString().split('T')[0]}`,
    `Total accounts found: ${profiles.length}`,
    '',
    `S-Tier (50K+ followers, high engagement): ${profiles.filter(p => p.tier === 'S').length}`,
    `A-Tier (10K+ followers, good engagement): ${profiles.filter(p => p.tier === 'A').length}`,
    `B-Tier (2K+ followers, decent engagement): ${profiles.filter(p => p.tier === 'B').length}`,
    `C-Tier (rest): ${profiles.filter(p => p.tier === 'C').length}`,
    '',
    '═══════════════════════════════════════════════════════════════',
    '',
  ];

  const tiers: Array<'S' | 'A' | 'B' | 'C'> = ['S', 'A', 'B', 'C'];
  for (const tier of tiers) {
    const tierProfiles = profiles.filter(p => p.tier === tier);
    if (tierProfiles.length === 0) continue;

    const tierLabel = {
      S: 'S-TIER — Top Priority Outreach',
      A: 'A-TIER — High Value Targets',
      B: 'B-TIER — Good Targets',
      C: 'C-TIER — Worth Watching',
    }[tier];

    lines.push(`## ${tierLabel}`);
    lines.push('');

    for (const p of tierProfiles.slice(0, tier === 'C' ? 20 : 50)) {
      lines.push(`### @${p.username} ${p.verified ? '✓' : ''}`);
      lines.push(`   ${p.name} | ${formatNumber(p.followers)} followers | ${p.accountAge} old`);
      lines.push(`   Engagement: ${p.engagementRate.toFixed(2)}% | Avg ${p.avgEngagement.toFixed(0)} per tweet`);
      lines.push(`   Bio: ${p.description.substring(0, 120)}`);
      lines.push(`   Topics: ${p.matchedQueries.join(', ')}`);
      lines.push(`   Score: ${p.score.toFixed(1)}`);
      if (p.sampleTweets.length > 0) {
        lines.push(`   Sample: "${p.sampleTweets[0]}"`);
      }
      lines.push('');
    }
  }

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('## Outreach Templates');
  lines.push('');
  lines.push('### DM Template (for accounts with open DMs)');
  lines.push('');
  lines.push('Hey [name]! Love your content on [specific thing they tweet about].');
  lines.push('');
  lines.push("We run Entrepreneurs of Asia — a community of founders & nomads based in Chiang Mai.");
  lines.push("We host monthly events connecting business owners, remote workers, and creators.");
  lines.push("Would love to have you at our next event — and if you'd like to collaborate,");
  lines.push("we'd love to feature you. No pressure either way!");
  lines.push('');
  lines.push('[event link / EOA website]');
  lines.push('');
  lines.push('### Quote Tweet Hook');
  lines.push('');
  lines.push('"Best city for digital nomads in 2025? Chiang Mai still wins, and here\'s why:');
  lines.push('');
  lines.push('@[influencer] agree?  [EOA link]"');
  lines.push('');

  const mdPath = path.join(outputDir, 'nomad-influencer-targets.md');
  fs.writeFileSync(mdPath, lines.join('\n'));

  // CSV for Google Sheets import
  const csvHeader = 'username,name,followers,engagement_rate,tier,description,topics,sample_tweet';
  const csvRows = profiles.map(p =>
    `"@${p.username}","${p.name.replace(/"/g, '')}",${p.followers},${p.engagementRate.toFixed(2)},"${p.tier}","${p.description.substring(0, 100).replace(/"/g, '')}","${p.matchedQueries.join('; ')}","${(p.sampleTweets[0] ?? '').replace(/"/g, '').substring(0, 100)}"`
  );
  const csvPath = path.join(outputDir, 'nomad-influencers.csv');
  fs.writeFileSync(csvPath, [csvHeader, ...csvRows].join('\n'));

  console.log(`\n✅ Results saved:`);
  console.log(`   ${jsonPath}`);
  console.log(`   ${mdPath}`);
  console.log(`   ${csvPath}`);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  Twitter Nomad & Chiang Mai Influencer Finder      ║');
  console.log('║  Entrepreneurs of Asia — Prospecting Intelligence  ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');

  const allTweets: TweetData[] = [];
  const allUsers = new Map<string, TweetUser>();
  const queryMap = new Map<string, string[]>();

  for (let i = 0; i < SEARCH_QUERIES.length; i++) {
    const query = SEARCH_QUERIES[i];
    const label = query.split('-is:')[0].trim().substring(0, 60);
    console.log(`[${i + 1}/${SEARCH_QUERIES.length}] Searching: ${label}...`);

    try {
      const { tweets, users } = await searchTweets(query, TWEETS_PER_QUERY);
      console.log(`  → Found ${tweets.length} tweets from ${users.size} users`);

      allTweets.push(...tweets);
      users.forEach((user, id) => allUsers.set(id, user));

      for (const tweet of tweets) {
        const existing = queryMap.get(tweet.authorId) ?? [];
        if (!existing.includes(label)) {
          existing.push(label);
          queryMap.set(tweet.authorId, existing);
        }
      }

      if (i < SEARCH_QUERIES.length - 1) {
        await sleep(2000);
      }
    } catch (err: any) {
      console.log(`  ⚠️ Query failed: ${err.message}`);
    }
  }

  console.log(`\n📊 Total: ${allTweets.length} tweets from ${allUsers.size} unique accounts`);

  const profiles = buildProfiles(allTweets, allUsers, queryMap);
  console.log(`📋 Ranked ${profiles.length} influencer profiles (filtered < 500 followers)`);

  outputResults(profiles);

  console.log('\n═══ TOP 10 NOMAD INFLUENCER TARGETS ═══');
  for (const p of profiles.slice(0, 10)) {
    console.log(`  [${p.tier}] @${p.username} — ${formatNumber(p.followers)} followers, ${p.engagementRate.toFixed(2)}% engagement`);
  }
}

main().catch(console.error);
