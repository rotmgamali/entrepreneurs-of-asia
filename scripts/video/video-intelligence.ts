/**
 * EOA — Gemini Video Intelligence
 *
 * Uses Google Gemini 2.0 Flash to analyze event recordings and identify
 * the best 30-60 second speaker highlight clips for social media.
 *
 * Adapted from Demons & Deities video-intelligence.ts for EOA event recordings.
 * Focus: speaker moments, audience reactions, key insights, quotable lines.
 *
 * Prerequisites: ffmpeg, GEMINI_API_KEY in .env
 *
 * Usage (run from project root):
 *   TS="npx ts-node --project tsconfig.json"
 *
 *   # Find best speaker clips in a recording
 *   $TS scripts/video/video-intelligence.ts find-clips recording.mp4
 *
 *   # Deep scene-by-scene analysis
 *   $TS scripts/video/video-intelligence.ts analyze recording.mp4
 *
 *   # Rate a single extracted clip
 *   $TS scripts/video/video-intelligence.ts rate clips/highlight-001.mp4
 *
 *   # Compare and rank multiple clips
 *   $TS scripts/video/video-intelligence.ts compare clip1.mp4 clip2.mp4 clip3.mp4
 *
 *   # AI smart-sample: extract top N highlights automatically
 *   $TS scripts/video/video-intelligence.ts smart-sample recording.mp4 --count 5 --duration 45
 *
 * Environment:
 *   GEMINI_API_KEY — get one at https://aistudio.google.com/apikey
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join, basename, extname, resolve, dirname } from 'path';
import { execSync } from 'child_process';

// Load .env from project root
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: join(process.cwd(), '.env') });
} catch { /* dotenv optional */ }

// ─── Config ──────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com';
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_SECONDS = 300;
const MAX_RETRIES = 3;

const ROOT = process.cwd();
const VIDEO_ROOT = join(ROOT, 'scripts', 'video');
const CLIPS_DIR = join(VIDEO_ROOT, 'clips');

// ─── Types ───────────────────────────────────────────────────────
interface GeminiFileRef {
  name: string;
  uri: string;
  mimeType: string;
  state: string;
}

interface SpeakerMoment {
  start: number;
  end: number;
  description: string;
  engagementScore: number;
  clipType: string;
  quotableText?: string;
  whyItWorks: string;
  socialPlatforms: string[];
  suggestedCaption?: string;
}

interface ClipRecommendation {
  start: number;
  end: number;
  reason: string;
  clipType: string;
  suggestedCaption: string | null;
  engagementScore: number;
  platforms: string[];
}

interface ClipRating {
  score: number;
  strengths: string[];
  weaknesses: string[];
  bestPlatform: string;
  suggestedCaption: string;
}

// ─── Helpers ─────────────────────────────────────────────────────
function ensureDirs() {
  for (const d of [CLIPS_DIR]) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }
}

function resolveVideoPath(input: string): string {
  if (existsSync(input)) return resolve(input);
  const fromVideo = join(ROOT, 'scripts', 'video', input);
  if (existsSync(fromVideo)) return fromVideo;
  const fromClips = join(CLIPS_DIR, input);
  if (existsSync(fromClips)) return fromClips;
  return resolve(input);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatSeconds(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = (s % 60).toFixed(1);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

function getFlagNum(args: string[], flag: string): number | undefined {
  const val = getFlag(args, flag);
  if (val !== undefined) {
    const n = parseFloat(val);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
}

function parseGeminiJson(text: string): any {
  let cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    const firstBracket = cleaned.search(/[\[{]/);
    const lastBracket = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      cleaned = cleaned.slice(firstBracket, lastBracket + 1);
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    let repaired = cleaned;
    repaired = repaired.replace(/,\s*([}\]])/g, '$1');
    try {
      return JSON.parse(repaired);
    } catch {
      const lastGoodClose = repaired.lastIndexOf('},');
      if (lastGoodClose > 0) {
        const truncated = repaired.slice(0, lastGoodClose + 1) + ']';
        try { return JSON.parse(truncated); } catch { /* give up */ }
      }
      throw e;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Gemini File Upload (Resumable) ──────────────────────────────
async function uploadFileToGemini(filePath: string): Promise<GeminiFileRef> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set. Get one at https://aistudio.google.com/apikey');
  }

  const fileData = readFileSync(filePath);
  const fileSize = fileData.length;
  const mimeType = filePath.endsWith('.webm') ? 'video/webm' : 'video/mp4';
  const displayName = basename(filePath);

  console.log(`  Uploading ${formatBytes(fileSize)} to Gemini...`);

  const initRes = await fetch(
    `${GEMINI_BASE}/upload/v1beta/files?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(fileSize),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    }
  );

  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`Gemini upload init failed (${initRes.status}): ${err}`);
  }

  const uploadUrl = initRes.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Gemini did not return an upload URL.');

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'Content-Length': String(fileSize),
    },
    body: fileData,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Gemini file upload failed (${uploadRes.status}): ${err}`);
  }

  const result = await uploadRes.json() as any;
  const file = result.file;
  if (!file?.name) throw new Error(`Unexpected upload response: ${JSON.stringify(result)}`);

  console.log(`  Uploaded: ${file.name} (${file.state})`);
  return { name: file.name, uri: file.uri || `${GEMINI_BASE}/v1beta/${file.name}`, mimeType, state: file.state };
}

// ─── Wait for File Processing ────────────────────────────────────
async function waitForProcessing(fileRef: GeminiFileRef): Promise<GeminiFileRef> {
  if (fileRef.state === 'ACTIVE') return fileRef;

  console.log(`  Waiting for Gemini to process video...`);
  const maxAttempts = Math.ceil(POLL_MAX_SECONDS / (POLL_INTERVAL_MS / 1000));

  for (let i = 0; i < maxAttempts; i++) {
    await sleep(POLL_INTERVAL_MS);

    const res = await fetch(`${GEMINI_BASE}/v1beta/${fileRef.name}?key=${GEMINI_API_KEY}`);
    if (!res.ok) throw new Error(`File status check failed (${res.status}): ${await res.text()}`);

    const data = await res.json() as any;
    if (data.state === 'ACTIVE') {
      console.log(`  Video processed and ready.`);
      return { ...fileRef, uri: data.uri || fileRef.uri, state: 'ACTIVE' };
    }
    if (data.state === 'FAILED') throw new Error(`Gemini processing failed: ${JSON.stringify(data.error)}`);

    const elapsed = ((i + 1) * POLL_INTERVAL_MS / 1000).toFixed(0);
    process.stdout.write(`\r  Processing... (${elapsed}s)`);
  }

  throw new Error(`Gemini processing timed out after ${POLL_MAX_SECONDS}s`);
}

// ─── Generate Content with Video (with retry) ────────────────────
async function generateWithVideo(fileRef: GeminiFileRef, prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  console.log(`  Sending prompt to ${GEMINI_MODEL}...`);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(
      `${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { fileData: { mimeType: fileRef.mimeType, fileUri: fileRef.uri } },
              { text: prompt },
            ],
          }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 32000 },
        }),
      }
    );

    if (res.status === 429) {
      if (attempt >= MAX_RETRIES) throw new Error(`Rate limited after ${MAX_RETRIES} retries`);
      let delaySec = 10;
      try {
        const body = await res.json() as any;
        const retryInfo = body?.error?.details?.find((d: any) => d.retryDelay);
        if (retryInfo?.retryDelay) delaySec = parseFloat(String(retryInfo.retryDelay).replace('s', '')) || 10;
      } catch { /* use default */ }
      console.log(`  Rate limited. Waiting ${delaySec}s...`);
      await sleep(delaySec * 1000);
      continue;
    }

    if (!res.ok) throw new Error(`Gemini generateContent failed (${res.status}): ${await res.text()}`);

    const data = await res.json() as any;
    if (data.promptFeedback?.blockReason) throw new Error(`Gemini blocked: ${data.promptFeedback.blockReason}`);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error(`Gemini returned empty response: ${JSON.stringify(data)}`);
    return text;
  }

  throw new Error('Exhausted all retries');
}

async function uploadAndWait(filePath: string): Promise<GeminiFileRef> {
  const ref = await uploadFileToGemini(filePath);
  return waitForProcessing(ref);
}

// ═══════════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════════

// ─── 1. find-clips ────────────────────────────────────────────────
// The primary command for EOA: watch a recording and identify the
// best 30-60 second speaker moments for social media clips.
async function cmdFindClips(inputPath: string, brief?: string) {
  ensureDirs();
  const filePath = resolveVideoPath(inputPath);
  if (!existsSync(filePath)) { console.error(`File not found: ${filePath}`); process.exit(1); }

  const stat = statSync(filePath);
  const name = basename(filePath, extname(filePath));

  console.log(`\n=== EOA Video Intelligence: Find Speaker Clips ===`);
  console.log(`  File: ${basename(filePath)}`);
  console.log(`  Size: ${formatBytes(stat.size)}`);
  if (brief) console.log(`  Brief: "${brief}"`);
  console.log('');

  const fileRef = await uploadAndWait(filePath);

  const context = brief || 'engaging speaker content for the EOA Chiang Mai nomad community';

  const prompt = `You are selecting highlight clips from an event recording for Entrepreneurs of Asia (EOA) — a community of digital nomads, entrepreneurs, and remote workers based in Chiang Mai.

CONTEXT: ${context}

BRAND: EOA creates social media content from speaker talks, panels, and networking events. The audience is entrepreneurs, remote workers, and nomads aged 25-45. Content is posted on Facebook, Instagram, LinkedIn, and YouTube Shorts.

TARGET CLIP LENGTH: 30-60 seconds. This is the sweet spot for social media engagement.

Watch this entire recording and identify the 5-8 BEST moments to extract as standalone social media clips. For each moment:

WHAT TO LOOK FOR:
- High-value insights or business advice (quotable, shareable)
- Storytelling moments with a clear arc (setup → punchline or lesson)
- Audience reactions (laughs, applause, visible engagement)
- Surprising statistics or counterintuitive ideas
- Practical "how-to" moments the audience can apply
- Emotional or inspirational peaks
- Clear start and end points (don't cut mid-sentence)

WHAT TO AVOID:
- Introductions and bios (unless unusually compelling)
- Q&A questions without clear answers
- Technical difficulties or dead air
- Transitions or logistics announcements

For each recommended clip, provide:
1. start — timestamp in seconds (precise to 0.5s)
2. end — timestamp in seconds (precise to 0.5s, ensure 30-60s duration)
3. clipType — one of: "key-insight", "storytelling", "audience-reaction", "how-to", "controversial-take", "inspirational", "quotable-line"
4. reason — why this is worth extracting (2-3 sentences)
5. engagementScore — 1-10 predicted engagement score
6. quotableText — if there's a single standout line to use as a caption (or null)
7. suggestedCaption — a ready-to-post social caption (max 150 chars, punchy)
8. platforms — list from: ["facebook", "instagram", "linkedin", "youtube-shorts", "twitter"]

Also provide:
- "rejectedMoments": clips considered but rejected, with timestamps and reasons
- "overallEventRating": 1-10 quality rating of this recording for content production
- "contentSummary": 2-3 sentence summary of what this event was about
- "bestClipIndex": index (0-based) of the single best clip to post first

Return as JSON:
{
  "contentSummary": "...",
  "overallEventRating": 7,
  "bestClipIndex": 2,
  "recommendations": [
    {
      "start": 312.5,
      "end": 368.0,
      "clipType": "key-insight",
      "reason": "Speaker shares a counterintuitive take on remote work productivity...",
      "engagementScore": 8,
      "quotableText": "The best remote workers I know treat their calendar like a product.",
      "suggestedCaption": "The best remote workers treat their calendar like a product 🎯 #RemoteWork #Entrepreneurship",
      "platforms": ["linkedin", "instagram", "youtube-shorts"]
    }
  ],
  "rejectedMoments": [
    { "start": 0.0, "end": 45.0, "reason": "Introduction and bio — low standalone value" }
  ]
}

Return ONLY valid JSON, no other text.`;

  const responseText = await generateWithVideo(fileRef, prompt);
  const result = parseGeminiJson(responseText);

  const clips: ClipRecommendation[] = Array.isArray(result) ? result : (result.recommendations || []);
  const rejected: any[] = result.rejectedMoments || [];
  const eventRating: number = result.overallEventRating || 0;
  const contentSummary: string = result.contentSummary || '';
  const bestClipIndex: number = result.bestClipIndex ?? 0;

  // Save recommendations
  const outDir = dirname(filePath);
  const outPath = join(outDir, `${name}-clip-recs.json`);
  writeFileSync(outPath, JSON.stringify({
    sourceVideo: basename(filePath),
    analyzedAt: new Date().toISOString(),
    brief: brief || null,
    contentSummary,
    overallEventRating: eventRating,
    bestClipIndex,
    recommendations: clips,
    rejectedMoments: rejected,
  }, null, 2));

  // Print results
  if (contentSummary) {
    console.log(`\n  Event summary: ${contentSummary}\n`);
  }
  if (eventRating > 0) {
    console.log(`  Event content rating: ${eventRating}/10`);
  }
  console.log(`\n  Found ${clips.length} clip recommendations:\n`);

  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const dur = (c.end - c.start).toFixed(0);
    const isBest = i === bestClipIndex ? ' *** BEST CLIP ***' : '';
    console.log(`  ${i + 1}.${isBest} [${formatSeconds(c.start)} - ${formatSeconds(c.end)}] (${dur}s) | ${c.clipType?.toUpperCase() || 'CLIP'} | Score: ${c.engagementScore}/10`);
    console.log(`     ${c.reason}`);
    if (c.suggestedCaption) console.log(`     Caption: "${c.suggestedCaption}"`);
    if (c.platforms?.length) console.log(`     Platforms: ${Array.isArray(c.platforms) ? c.platforms.join(', ') : c.platforms}`);
    console.log('');
  }

  if (rejected.length > 0) {
    console.log(`  Rejected moments (${rejected.length}):`);
    for (const r of rejected.slice(0, 5)) {
      console.log(`    [${r.start?.toFixed?.(1) ?? r.start}s-${r.end?.toFixed?.(1) ?? r.end}s] ${r.reason}`);
    }
    console.log('');
  }

  console.log(`  Saved: ${outPath}`);
  console.log(`\n  Extract all recommended clips:`);
  const clipsStr = clips.map(c => `${c.start}:${c.end}`).join(',');
  console.log(`    npx ts-node scripts/video/clip-extractor.ts clip-multi "${filePath}" --clips "${clipsStr}"`);

  if (clips[bestClipIndex]) {
    const best = clips[bestClipIndex];
    console.log(`\n  Extract best clip first (#${bestClipIndex + 1}):`);
    console.log(`    npx ts-node scripts/video/clip-extractor.ts clip "${filePath}" --start ${best.start} --end ${best.end} --name "${name}-best-clip"`);
  }
}

// ─── 2. analyze ──────────────────────────────────────────────────
// Deep scene-by-scene analysis of the recording.
async function cmdAnalyze(inputPath: string) {
  ensureDirs();
  const filePath = resolveVideoPath(inputPath);
  if (!existsSync(filePath)) { console.error(`File not found: ${filePath}`); process.exit(1); }

  const stat = statSync(filePath);
  const name = basename(filePath, extname(filePath));

  console.log(`\n=== EOA Video Intelligence: Deep Analysis ===`);
  console.log(`  File: ${basename(filePath)}`);
  console.log(`  Size: ${formatBytes(stat.size)}`);
  console.log('');

  const fileRef = await uploadAndWait(filePath);

  const prompt = `You are analyzing an event recording for Entrepreneurs of Asia (EOA) — a community of entrepreneurs, digital nomads, and remote workers. Extract detailed data for content production.

For each distinct segment/moment in the recording, provide a JSON array with:

{
  "segmentNumber": 1,
  "startTime": 0.0,
  "endTime": 45.3,
  "CONTENT": {
    "type": "intro / keynote / panel / q-and-a / networking / logistics / break / sponsor",
    "speakerActivity": "presenting / storytelling / answering / interviewing / demonstrating",
    "topic": "main topic being discussed",
    "keyMessage": "the single most important point in this segment (or null)",
    "audienceEngagement": "attentive / laughing / applauding / distracted / asking questions"
  },
  "QUALITY": {
    "audioClarity": 8,
    "videoClarity": 7,
    "speakerEnergy": 8,
    "contentValue": 9,
    "standalonePotential": 8,
    "clipWorthiness": "high / medium / low / skip"
  },
  "SOCIAL": {
    "bestPlatforms": ["linkedin", "instagram", "youtube-shorts", "facebook", "twitter"],
    "contentHook": "what makes this worth watching for a stranger scrolling their feed",
    "suggestedCaption": "ready-to-post caption under 150 chars or null",
    "quotableLine": "most quotable line from this segment or null",
    "predictedEngagement": 7
  }
}

Also provide a SUMMARY object (last in array, "type": "summary"):
{
  "type": "summary",
  "totalSegments": 12,
  "totalDuration": 3600,
  "contentBreakdown": {"keynote": 60, "qa": 20, "networking": 20},
  "topHighlights": [{"start": 312.0, "end": 368.0, "reason": "Best insight of the event"}],
  "overallContentRating": 7.5,
  "productionQuality": 6.5,
  "bestClipWindow": {"start": 312.0, "end": 368.0},
  "contentThemes": ["remote work", "entrepreneurship", "Chiang Mai lifestyle"],
  "speakerAssessment": "description of presentation style and audience impact"
}

IMPORTANT: Return ONLY valid JSON array. No markdown, no text outside JSON.
Limit to 15 most significant segments. Timestamps precise to 0.5 seconds.`;

  const responseText = await generateWithVideo(fileRef, prompt);
  const fullAnalysis: any[] = parseGeminiJson(responseText);

  const summaryObj = fullAnalysis.find((item: any) => item.type === 'summary') || null;
  const segments = fullAnalysis.filter((item: any) => item.type !== 'summary');

  const outDir = dirname(filePath);
  const outPath = join(outDir, `${name}-analysis.json`);
  writeFileSync(outPath, JSON.stringify(fullAnalysis, null, 2));

  console.log(`\n  Analysis: ${segments.length} segments identified\n`);

  for (const seg of segments) {
    const start = seg.startTime ?? seg.start ?? 0;
    const end = seg.endTime ?? seg.end ?? 0;
    const contentVal = seg.QUALITY?.contentValue ?? 0;
    const standalone = seg.QUALITY?.standalonePotential ?? 0;
    const worthy = seg.QUALITY?.clipWorthiness ?? 'unknown';
    const topic = seg.CONTENT?.topic ?? seg.description ?? '';
    const caption = seg.SOCIAL?.suggestedCaption;

    console.log(
      `  [${formatSeconds(start)} - ${formatSeconds(end)}] ` +
      `Value:${contentVal}/10 Standalone:${standalone}/10 | ${worthy.toUpperCase()}`
    );
    if (topic) console.log(`    Topic: ${topic}`);
    if (seg.CONTENT?.keyMessage) console.log(`    Key: ${seg.CONTENT.keyMessage}`);
    if (caption) console.log(`    Caption: "${caption}"`);
    console.log('');
  }

  if (summaryObj) {
    console.log(`  --- Summary ---`);
    if (summaryObj.overallContentRating) console.log(`  Content rating: ${summaryObj.overallContentRating}/10`);
    if (summaryObj.productionQuality) console.log(`  Production quality: ${summaryObj.productionQuality}/10`);
    if (summaryObj.contentThemes?.length) console.log(`  Themes: ${summaryObj.contentThemes.join(', ')}`);
    if (summaryObj.speakerAssessment) console.log(`  Speaker: ${summaryObj.speakerAssessment}`);
    if (summaryObj.topHighlights?.length) {
      console.log(`  Top highlights:`);
      for (const h of summaryObj.topHighlights) {
        console.log(`    [${formatSeconds(h.start)}-${formatSeconds(h.end)}] ${h.reason}`);
      }
    }
  }

  console.log(`\n  Saved: ${outPath}`);
}

// ─── 3. rate ─────────────────────────────────────────────────────
// Rate an extracted clip for social media suitability.
async function cmdRate(inputPath: string) {
  ensureDirs();
  const filePath = resolveVideoPath(inputPath);
  if (!existsSync(filePath)) { console.error(`File not found: ${filePath}`); process.exit(1); }

  const stat = statSync(filePath);
  console.log(`\n=== EOA Video Intelligence: Rate Clip ===`);
  console.log(`  File: ${basename(filePath)}`);
  console.log(`  Size: ${formatBytes(stat.size)}`);
  console.log('');

  const fileRef = await uploadAndWait(filePath);

  const prompt = `Rate this video clip for use as EOA (Entrepreneurs of Asia) social media content. EOA is a community of entrepreneurs and digital nomads in Chiang Mai.

Score across 5 dimensions (each 0-20, total 0-100):

1. CONTENT VALUE (0-20): How insightful, actionable, or valuable is the information? Does it teach something useful?
2. SPEAKER ENERGY (0-20): Is the speaker engaging, energetic, and clear? Good for retention?
3. AUDIO QUALITY (0-20): Is the audio clear and professional enough to post without editing?
4. VIDEO QUALITY (0-20): Is the video sharp enough? Good framing? No distracting backgrounds?
5. SOCIAL FIT (0-20): Would this stop the scroll on LinkedIn, Instagram, or YouTube Shorts?

Also provide:
- strengths: list of 2-4 things working in this clip's favor
- weaknesses: list of 1-3 issues that limit its effectiveness
- bestPlatform: single best platform for this specific clip
- suggestedCaption: punchy ready-to-post caption (max 150 chars)
- postingAdvice: one specific tip for posting this clip effectively
- trimSuggestion: if the clip has a better start/end within the footage (seconds from clip start), or null

Return as JSON:
{
  "scores": {
    "contentValue": 16,
    "speakerEnergy": 14,
    "audioQuality": 15,
    "videoQuality": 12,
    "socialFit": 13
  },
  "total": 70,
  "grade": "B",
  "strengths": ["Clear key message", "Strong closing line"],
  "weaknesses": ["Background noise at 15s", "Abrupt ending"],
  "bestPlatform": "linkedin",
  "suggestedCaption": "The one thing most remote workers get wrong about productivity 👆",
  "postingAdvidence": "Post Tuesday 9am Bangkok time for LinkedIn reach",
  "trimSuggestion": {"newStart": 2.5, "newEnd": 47.0, "reason": "Avoid the awkward pause at the opening"}
}

Return ONLY valid JSON.`;

  const responseText = await generateWithVideo(fileRef, prompt);
  const rating = parseGeminiJson(responseText);

  const total = rating.total ?? Object.values(rating.scores || {}).reduce((a: any, b: any) => a + b, 0);
  const grade = rating.grade || (total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : 'D');

  console.log(`\n  Score: ${total}/100 (${grade})\n`);

  if (rating.scores) {
    const s = rating.scores;
    console.log(`  Content Value:  ${s.contentValue}/20`);
    console.log(`  Speaker Energy: ${s.speakerEnergy}/20`);
    console.log(`  Audio Quality:  ${s.audioQuality}/20`);
    console.log(`  Video Quality:  ${s.videoQuality}/20`);
    console.log(`  Social Fit:     ${s.socialFit}/20`);
    console.log('');
  }

  if (rating.strengths?.length) {
    console.log(`  Strengths:`);
    for (const s of rating.strengths) console.log(`    + ${s}`);
    console.log('');
  }
  if (rating.weaknesses?.length) {
    console.log(`  Weaknesses:`);
    for (const w of rating.weaknesses) console.log(`    - ${w}`);
    console.log('');
  }
  if (rating.bestPlatform) console.log(`  Best platform: ${rating.bestPlatform}`);
  if (rating.suggestedCaption) console.log(`  Caption: "${rating.suggestedCaption}"`);
  if (rating.postingAdvice) console.log(`  Tip: ${rating.postingAdvice}`);
  if (rating.trimSuggestion) {
    const t = rating.trimSuggestion;
    console.log(`\n  Trim suggestion: ${t.newStart}s - ${t.newEnd}s`);
    console.log(`    Reason: ${t.reason}`);
  }
}

// ─── 4. compare ──────────────────────────────────────────────────
// Compare multiple clips and rank them for posting order.
async function cmdCompare(inputPaths: string[]) {
  if (inputPaths.length < 2) {
    console.error('Usage: compare <clip1.mp4> <clip2.mp4> [clip3.mp4...]');
    process.exit(1);
  }

  console.log(`\n=== EOA Video Intelligence: Compare Clips ===`);
  console.log(`  Comparing ${inputPaths.length} clips...\n`);

  // Rate each clip individually
  const ratings: Array<{ file: string; total: number; grade: string; caption: string }> = [];

  for (const inputPath of inputPaths) {
    const filePath = resolveVideoPath(inputPath);
    if (!existsSync(filePath)) { console.error(`File not found: ${filePath}`); continue; }

    const stat = statSync(filePath);
    console.log(`  Rating: ${basename(filePath)} (${formatBytes(stat.size)})`);
    const fileRef = await uploadAndWait(filePath);

    const prompt = `Rate this EOA event clip on a scale of 0-100 for social media effectiveness. Return JSON: {"total": 75, "grade": "B", "topStrength": "Clear insight", "topWeakness": "Audio noise", "bestPlatform": "linkedin", "caption": "..."}. Return ONLY JSON.`;
    try {
      const text = await generateWithVideo(fileRef, prompt);
      const r = parseGeminiJson(text);
      ratings.push({ file: basename(filePath), total: r.total ?? 0, grade: r.grade ?? '?', caption: r.caption ?? '' });
      console.log(`    Score: ${r.total}/100 (${r.grade})`);
      if (r.topStrength) console.log(`    + ${r.topStrength}`);
      if (r.topWeakness) console.log(`    - ${r.topWeakness}`);
    } catch (err: any) {
      console.error(`    Rating failed: ${err.message}`);
    }
    console.log('');
  }

  if (ratings.length > 1) {
    ratings.sort((a, b) => b.total - a.total);
    console.log(`\n  Ranking (best to post first):`);
    for (let i = 0; i < ratings.length; i++) {
      console.log(`  ${i + 1}. ${ratings[i].file} — ${ratings[i].total}/100 (${ratings[i].grade})`);
      if (ratings[i].caption) console.log(`     Caption: "${ratings[i].caption}"`);
    }
  }
}

// ─── 5. smart-sample ─────────────────────────────────────────────
// AI-powered: upload recording, get top N speaker clips, extract them.
async function cmdSmartSample(inputPath: string, count: number, clipDuration: number) {
  ensureDirs();
  const filePath = resolveVideoPath(inputPath);
  if (!existsSync(filePath)) { console.error(`File not found: ${filePath}`); process.exit(1); }

  const stat = statSync(filePath);
  const name = basename(filePath, extname(filePath));

  console.log(`\n=== EOA Video Intelligence: Smart Sample ===`);
  console.log(`  File: ${basename(filePath)} (${formatBytes(stat.size)})`);
  console.log(`  Requesting ${count} clips of ~${clipDuration}s each`);
  console.log('');

  const fileRef = await uploadAndWait(filePath);

  const prompt = `You are extracting the top ${count} highlight clips from an EOA (Entrepreneurs of Asia) event recording. Each clip must be approximately ${clipDuration} seconds long (within ±10 seconds).

Find the ${count} most engaging speaker moments that would work as standalone social media clips. Focus on:
- Complete thoughts with a clear beginning and end
- High speaker energy or audience reaction
- Actionable insights or memorable quotes
- No mid-sentence cuts

Return JSON array of exactly ${count} clips (or fewer if not enough good material):
[
  {
    "start": 312.5,
    "end": 357.0,
    "reason": "Speaker delivers counterintuitive productivity insight with strong close",
    "engagementScore": 9,
    "suggestedCaption": "Stop optimizing your schedule. Optimize your energy instead. 🔋",
    "platforms": ["linkedin", "instagram"]
  }
]

Return ONLY valid JSON array.`;

  const responseText = await generateWithVideo(fileRef, prompt);
  const moments: SpeakerMoment[] = parseGeminiJson(responseText);

  console.log(`\n  AI identified ${moments.length} highlight moments.\n`);

  const results: string[] = [];
  for (let i = 0; i < moments.length; i++) {
    const m = moments[i];
    const clipName = `${name}-highlight-${String(i + 1).padStart(3, '0')}`;
    const dur = (m.end - m.start).toFixed(0);
    console.log(`--- Highlight ${i + 1}/${moments.length} (${dur}s, score: ${m.engagementScore}/10) ---`);
    console.log(`    ${m.reason}`);
    if (m.suggestedCaption) console.log(`    Caption: "${m.suggestedCaption}"`);

    try {
      const outFile = join(CLIPS_DIR, `${clipName}.mp4`);
      execSync(
        `ffmpeg -y -i "${filePath}" -ss ${m.start} -to ${m.end} ` +
        `-c:v libx264 -preset fast -crf 20 -c:a aac -b:a 128k ` +
        `-vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ` +
        `-movflags +faststart "${outFile}" 2>/dev/null`,
        { encoding: 'utf-8' as const, maxBuffer: 50 * 1024 * 1024 }
      );
      console.log(`    Saved: ${outFile}`);
      results.push(outFile);
    } catch (err: any) {
      console.error(`    Extraction failed: ${err.message}`);
    }
    console.log('');
  }

  console.log(`\n=== Smart Sample Complete ===`);
  console.log(`  Extracted ${results.length}/${moments.length} clips to: ${CLIPS_DIR}`);
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd) {
    console.log('EOA Video Intelligence — AI-powered speaker clip extraction for social media\n');
    console.log('Commands:');
    console.log('  find-clips <recording> [--brief "context"]    Find best 30-60s speaker clips');
    console.log('  analyze <recording>                           Deep scene-by-scene analysis');
    console.log('  rate <clip.mp4>                               Rate a clip for social media');
    console.log('  compare <clip1> <clip2> [clip3...]            Compare and rank clips');
    console.log('  smart-sample <recording> [--count N] [--duration N]  Auto-extract top clips');
    console.log('\nEnvironment:');
    console.log('  GEMINI_API_KEY — required (get at https://aistudio.google.com/apikey)');
    return;
  }

  switch (cmd) {
    case 'find-clips': {
      const file = args[1];
      if (!file) { console.error('Usage: find-clips <recording> [--brief "context"]'); return; }
      const brief = getFlag(args, '--brief');
      await cmdFindClips(file, brief);
      break;
    }

    case 'analyze': {
      const file = args[1];
      if (!file) { console.error('Usage: analyze <recording>'); return; }
      await cmdAnalyze(file);
      break;
    }

    case 'rate': {
      const file = args[1];
      if (!file) { console.error('Usage: rate <clip.mp4>'); return; }
      await cmdRate(file);
      break;
    }

    case 'compare': {
      const files = args.slice(1).filter(a => !a.startsWith('--'));
      if (files.length < 2) { console.error('Usage: compare <clip1> <clip2> [clip3...]'); return; }
      await cmdCompare(files);
      break;
    }

    case 'smart-sample': {
      const file = args[1];
      if (!file) { console.error('Usage: smart-sample <recording> [--count N] [--duration N]'); return; }
      const count = getFlagNum(args, '--count') ?? 5;
      const duration = getFlagNum(args, '--duration') ?? 45;
      await cmdSmartSample(file, count, duration);
      break;
    }

    default:
      console.error(`Unknown command: ${cmd}`);
      console.log('Run without arguments for usage info.');
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
