/**
 * Demons & Deities -- Gemini Video Intelligence
 *
 * Uses Google Gemini 2.0 Flash to deeply analyze video content for
 * intelligent clip extraction. Understands what is happening in the video,
 * rates visual quality, and recommends the best clips for trailers.
 *
 * Prerequisites: ffmpeg (system install), GEMINI_API_KEY in .env
 *
 * Usage (run from project root):
 *   TSNODE="npx ts-node --project scripts/tsconfig.json"
 *
 *   # Deep scene-by-scene analysis
 *   $TSNODE scripts/marketing/video-intelligence.ts analyze clips/sources/video.mp4
 *
 *   # Find clips for a specific trailer brief
 *   $TSNODE scripts/marketing/video-intelligence.ts find-clips clips/sources/video.mp4 --brief "45s dark fantasy auto-battler trailer"
 *
 *   # Rate a single clip for trailer use
 *   $TSNODE scripts/marketing/video-intelligence.ts rate clips/extracted/clip.mp4
 *
 *   # Compare and rank multiple clips
 *   $TSNODE scripts/marketing/video-intelligence.ts compare clip1.mp4 clip2.mp4 clip3.mp4
 *
 *   # AI-powered best clip extraction (replaces dumb scene detection)
 *   $TSNODE scripts/marketing/video-intelligence.ts smart-sample clips/sources/video.mp4 --count 5 --duration 3
 *
 *   # Learn from all past analyses
 *   $TSNODE scripts/marketing/video-intelligence.ts learn
 *
 *   # Comprehensive source video audit
 *   $TSNODE scripts/marketing/video-intelligence.ts audit-video clips/sources/video.mp4
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync } from 'fs';
import { join, basename, extname, resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { config } from 'dotenv';

// Load .env from project root
config({ path: join(process.cwd(), '.env') });

// ─── Config ──────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com';
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_SECONDS = 300;
const MAX_RETRIES = 3;

const ROOT = process.cwd();
const CLIPS_ROOT = join(ROOT, 'scripts', 'marketing', 'clips');
const SOURCES_DIR = join(CLIPS_ROOT, 'sources');
const EXTRACTED_DIR = join(CLIPS_ROOT, 'extracted');
const KNOWLEDGE_DIR = join(ROOT, 'scripts', 'marketing', 'knowledge');
const LEARNING_DB_PATH = join(KNOWLEDGE_DIR, 'learning-db.json');

// ─── Types ───────────────────────────────────────────────────────
interface GeminiFileRef {
  name: string;       // e.g. "files/abc123"
  uri: string;        // full URI for fileData
  mimeType: string;
  state: string;
}

interface SceneAnalysis {
  start: number;
  end: number;
  description: string;
  mood: string;
  energy: number;
  quality: number;
  bestUse: string;
  colors: string[];
  standalone: boolean;
  standaloneReason: string;
  [key: string]: any; // allow extra fields from upgraded prompt
}

interface ClipRecommendation {
  start: number;
  end: number;
  reason: string;
  trailerPosition: string;
  suggestedText: string | null;
  suggestedSfx: string;
  suggestedEffect: string;
  suggestedFilter: string;
  [key: string]: any;
}

interface ClipRating {
  score: number;
  strengths: string[];
  weaknesses: string[];
  bestUse: string;
  [key: string]: any;
}

interface SmartMoment {
  start: number;
  end: number;
  description: string;
  quality: number;
  bestUse: string;
}

interface LearningEntry {
  timestamp: string;
  command: string;
  sourceFile: string;
  summary: string;
  techniques?: string[];
  patterns?: string[];
}

interface LearningDB {
  videosAnalyzed: number;
  techniquesDiscovered: string[];
  patternsFound: string[];
  entries: LearningEntry[];
  lastUpdated: string;
}

// ─── Helpers ─────────────────────────────────────────────────────
function ensureDirs() {
  for (const d of [SOURCES_DIR, EXTRACTED_DIR, KNOWLEDGE_DIR]) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }
}

function resolveVideoPath(input: string): string {
  if (existsSync(input)) return resolve(input);
  const fromMarketing = join(ROOT, 'scripts', 'marketing', input);
  if (existsSync(fromMarketing)) return fromMarketing;
  const fromRoot = join(ROOT, input);
  if (existsSync(fromRoot)) return fromRoot;
  return resolve(input);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
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
  // Gemini often wraps JSON in markdown or adds preamble text
  let cleaned = text.trim();

  // Try to extract JSON from markdown code blocks first
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    // Find the first [ or { and last ] or } — extract just the JSON
    const firstBracket = cleaned.search(/[\[{]/);
    const lastBracket = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      cleaned = cleaned.slice(firstBracket, lastBracket + 1);
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Attempt JSON repair: fix common Gemini issues
    let repaired = cleaned;
    // Remove trailing commas before } or ]
    repaired = repaired.replace(/,\s*([}\]])/g, '$1');
    // Fix unescaped newlines in strings
    repaired = repaired.replace(/(?<=:\s*"[^"]*)\n([^"]*")/g, '\\n$1');
    // Truncate at last valid closing bracket if JSON is cut off
    try {
      return JSON.parse(repaired);
    } catch {
      // Last resort: find the last complete object in an array
      const lastGoodClose = repaired.lastIndexOf('},');
      if (lastGoodClose > 0) {
        const truncated = repaired.slice(0, lastGoodClose + 1) + ']';
        try {
          return JSON.parse(truncated);
        } catch {
          // Give up — throw original error
        }
      }
      throw e;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Learning DB helpers ────────────────────────────────────────
function loadLearningDB(): LearningDB {
  ensureDirs();
  if (existsSync(LEARNING_DB_PATH)) {
    try {
      return JSON.parse(readFileSync(LEARNING_DB_PATH, 'utf-8'));
    } catch {
      // corrupted file, start fresh
    }
  }
  return {
    videosAnalyzed: 0,
    techniquesDiscovered: [],
    patternsFound: [],
    entries: [],
    lastUpdated: new Date().toISOString(),
  };
}

function saveLearningDB(db: LearningDB): void {
  ensureDirs();
  db.lastUpdated = new Date().toISOString();
  writeFileSync(LEARNING_DB_PATH, JSON.stringify(db, null, 2));
}

function appendLearningEntry(
  command: string,
  sourceFile: string,
  summary: string,
  techniques: string[] = [],
  patterns: string[] = []
): void {
  const db = loadLearningDB();
  db.videosAnalyzed += 1;

  // Deduplicate techniques and patterns
  for (const t of techniques) {
    if (!db.techniquesDiscovered.includes(t)) {
      db.techniquesDiscovered.push(t);
    }
  }
  for (const p of patterns) {
    if (!db.patternsFound.includes(p)) {
      db.patternsFound.push(p);
    }
  }

  db.entries.push({
    timestamp: new Date().toISOString(),
    command,
    sourceFile,
    summary,
    techniques: techniques.length > 0 ? techniques : undefined,
    patterns: patterns.length > 0 ? patterns : undefined,
  });

  saveLearningDB(db);
  console.log(`  [Learning] Entry saved to ${LEARNING_DB_PATH}`);
}

// ─── Gemini File Upload (Resumable) ──────────────────────────────
async function uploadFileToGemini(filePath: string): Promise<GeminiFileRef> {
  const fileData = readFileSync(filePath);
  const fileSize = fileData.length;
  const mimeType = filePath.endsWith('.webm') ? 'video/webm' : 'video/mp4';
  const displayName = basename(filePath);

  console.log(`  Uploading ${formatBytes(fileSize)} to Gemini...`);

  // Step 1: Initiate resumable upload
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
      body: JSON.stringify({
        file: { display_name: displayName },
      }),
    }
  );

  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`Gemini upload init failed (${initRes.status}): ${err}`);
  }

  const uploadUrl = initRes.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    throw new Error('Gemini did not return an upload URL. Check API key and quota.');
  }

  // Step 2: Upload the actual file bytes
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

  if (!file?.name) {
    throw new Error(`Gemini upload returned unexpected response: ${JSON.stringify(result)}`);
  }

  console.log(`  Uploaded: ${file.name} (${file.state})`);

  return {
    name: file.name,
    uri: file.uri || `${GEMINI_BASE}/v1beta/${file.name}`,
    mimeType,
    state: file.state,
  };
}

// ─── Wait for File Processing ────────────────────────────────────
async function waitForProcessing(fileRef: GeminiFileRef): Promise<GeminiFileRef> {
  if (fileRef.state === 'ACTIVE') return fileRef;

  console.log(`  Waiting for Gemini to process video...`);
  const maxAttempts = Math.ceil(POLL_MAX_SECONDS / (POLL_INTERVAL_MS / 1000));

  for (let i = 0; i < maxAttempts; i++) {
    await sleep(POLL_INTERVAL_MS);

    const res = await fetch(
      `${GEMINI_BASE}/v1beta/${fileRef.name}?key=${GEMINI_API_KEY}`
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini file status check failed (${res.status}): ${err}`);
    }

    const data = await res.json() as any;
    const state = data.state;

    if (state === 'ACTIVE') {
      console.log(`  Video processed and ready.`);
      return {
        ...fileRef,
        uri: data.uri || fileRef.uri,
        state: 'ACTIVE',
      };
    }

    if (state === 'FAILED') {
      throw new Error(`Gemini file processing failed: ${JSON.stringify(data.error || data)}`);
    }

    // Still PROCESSING
    const elapsed = ((i + 1) * POLL_INTERVAL_MS / 1000).toFixed(0);
    process.stdout.write(`\r  Processing... (${elapsed}s)`);
  }

  throw new Error(`Gemini file processing timed out after ${POLL_MAX_SECONDS}s`);
}

// ─── Generate Content with Video (with 429 retry) ───────────────
async function generateWithVideo(fileRef: GeminiFileRef, prompt: string): Promise<string> {
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
              {
                fileData: {
                  mimeType: fileRef.mimeType,
                  fileUri: fileRef.uri,
                },
              },
              { text: prompt },
            ],
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 32000,
          },
        }),
      }
    );

    if (res.status === 429) {
      if (attempt >= MAX_RETRIES) {
        const err = await res.text();
        throw new Error(`Gemini rate limited after ${MAX_RETRIES} retries (429): ${err}`);
      }
      // Parse retry delay from response body
      let retryDelaySec = 10; // default fallback
      try {
        const errBody = await res.json() as any;
        const retryInfo = errBody?.error?.details?.find(
          (d: any) => d.retryDelay || d['@type']?.includes('RetryInfo')
        );
        if (retryInfo?.retryDelay) {
          const parsed = parseFloat(String(retryInfo.retryDelay).replace('s', ''));
          if (!isNaN(parsed) && parsed > 0) retryDelaySec = parsed;
        }
      } catch {
        // use default delay
      }
      console.log(`  Rate limited (429). Waiting ${retryDelaySec}s before retry ${attempt + 1}/${MAX_RETRIES}...`);
      await sleep(retryDelaySec * 1000);
      continue;
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini generateContent failed (${res.status}): ${err}`);
    }

    const data = await res.json() as any;

    // Check for blocked content
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Gemini blocked the request: ${data.promptFeedback.blockReason}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error(`Gemini returned empty response: ${JSON.stringify(data)}`);
    }

    return text;
  }

  throw new Error('Exhausted all retries');
}

// ─── Generate Content with Multiple Videos (with 429 retry) ─────
async function generateWithMultipleVideos(
  fileRefs: GeminiFileRef[],
  prompt: string
): Promise<string> {
  console.log(`  Sending ${fileRefs.length} videos + prompt to ${GEMINI_MODEL}...`);

  const parts: any[] = fileRefs.map(ref => ({
    fileData: {
      mimeType: ref.mimeType,
      fileUri: ref.uri,
    },
  }));
  parts.push({ text: prompt });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(
      `${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 32000,
          },
        }),
      }
    );

    if (res.status === 429) {
      if (attempt >= MAX_RETRIES) {
        const err = await res.text();
        throw new Error(`Gemini rate limited after ${MAX_RETRIES} retries (429): ${err}`);
      }
      let retryDelaySec = 10;
      try {
        const errBody = await res.json() as any;
        const retryInfo = errBody?.error?.details?.find(
          (d: any) => d.retryDelay || d['@type']?.includes('RetryInfo')
        );
        if (retryInfo?.retryDelay) {
          const parsed = parseFloat(String(retryInfo.retryDelay).replace('s', ''));
          if (!isNaN(parsed) && parsed > 0) retryDelaySec = parsed;
        }
      } catch {
        // use default delay
      }
      console.log(`  Rate limited (429). Waiting ${retryDelaySec}s before retry ${attempt + 1}/${MAX_RETRIES}...`);
      await sleep(retryDelaySec * 1000);
      continue;
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini generateContent failed (${res.status}): ${err}`);
    }

    const data = await res.json() as any;
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Gemini blocked the request: ${data.promptFeedback.blockReason}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error(`Gemini returned empty response: ${JSON.stringify(data)}`);
    }

    return text;
  }

  throw new Error('Exhausted all retries');
}

// ─── Upload + Wait helper ────────────────────────────────────────
async function uploadAndWait(filePath: string): Promise<GeminiFileRef> {
  const ref = await uploadFileToGemini(filePath);
  return waitForProcessing(ref);
}

// ═══════════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════════

// ─── 1. analyze ──────────────────────────────────────────────────
async function cmdAnalyze(inputPath: string) {
  ensureDirs();
  const filePath = resolveVideoPath(inputPath);
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const stat = statSync(filePath);
  const name = basename(filePath, extname(filePath));

  console.log(`\n=== Video Intelligence: Analyze ===`);
  console.log(`  File: ${basename(filePath)}`);
  console.log(`  Size: ${formatBytes(stat.size)}`);
  console.log('');

  const fileRef = await uploadAndWait(filePath);

  const prompt = `You are an elite film analyst performing a frame-by-frame study of this video. Extract MAXIMUM DATA with precise timestamps for everything you observe. We will use this data to learn techniques, clip video segments, extract audio samples, and study what makes content effective.

For each distinct scene/shot, provide ALL of the following in a JSON array:

{
  "sceneNumber": 1,
  "startTime": 0.0,
  "endTime": 2.3,

  "VISUAL": {
    "shotType": "extreme wide / wide / medium / close-up / extreme close-up / aerial / POV / over-shoulder",
    "cameraMovement": "static / pan left / pan right / tilt up / tilt down / dolly in / dolly out / crane up / crane down / handheld / tracking / orbit / whip pan / zoom in / zoom out",
    "cameraSpeed": "very slow / slow / normal / fast / whip",
    "subject": "what is the main subject of this shot",
    "action": "what is happening -- be specific",
    "background": "what is behind the subject",
    "foreground": "any foreground elements",
    "vfx": ["list every visual effect: particles, fire, lightning, magic, glow, lens flare, smoke, rain, sparks, energy waves, portals, explosions, none"],
    "lighting": { "direction": "front / side / back / top / ambient", "contrast": 8, "colorTemp": "warm / cool / neutral", "style": "dramatic / flat / rim-lit / silhouette / neon" },
    "colors": { "dominant": ["#hex1", "#hex2", "#hex3"], "accent": ["#hex4"], "mood": "warm / cool / neon / muted / saturated / dark / bright" },
    "composition": "rule of thirds / centered / diagonal / symmetrical / leading lines / frame within frame",
    "depthOfField": "shallow / deep / rack focus",
    "visualComplexity": 7,
    "motionIntensity": 8,
    "hasText": false,
    "textContent": null,
    "hasWatermark": false,
    "hasUI": false
  },

  "AUDIO_AT_THIS_MOMENT": {
    "musicEnergy": 7,
    "musicGenre": "orchestral / electronic / hybrid / ambient / none",
    "musicBeat": "is there a beat drop, swell, or transition at this timestamp?",
    "sfxPresent": ["list any sound effects: explosion, whoosh, impact, sword clash, roar, thunder, none"],
    "sfxTimestamps": [{"time": 0.5, "type": "impact", "description": "heavy bass hit"}],
    "dialogue": null,
    "silenceMoment": false,
    "audioBuildUp": false,
    "audioClimax": false
  },

  "EMOTION": {
    "mood": "epic / mysterious / tense / triumphant / melancholy / peaceful / aggressive / awe / horror / playful / reverent / ominous",
    "energy": 8,
    "tension": 6,
    "narrativeFunction": "establishing / building / rising action / climax / falling action / resolution / transition / hook / reveal",
    "emotionalImpact": 9,
    "audienceReaction": "what would a viewer feel at this moment?"
  },

  "QUALITY": {
    "visualQuality": 9,
    "motionSmoothness": 8,
    "colorGradingQuality": 9,
    "productionValue": 9,
    "wouldStopAScroll": true
  },

  "CLIP_EXTRACTION": {
    "standaloneValue": 9,
    "bestTrailerUse": "hook / atmosphere / action / reveal / emotional / climax / transition / background / cta-backdrop",
    "optimalClipStart": 0.2,
    "optimalClipEnd": 2.1,
    "suggestedShotstack": {
      "effect": "zoomInFast",
      "filter": "boost",
      "speed": 0.7,
      "transition": "fade"
    },
    "textOverlayFriendly": true,
    "suggestedTextOverlay": "text that would pair well or null",
    "suggestedSfx": "bass-impact"
  },

  "AUDIO_EXTRACTION": {
    "worthExtractingAudio": true,
    "audioType": "sfx / music / dialogue / ambient",
    "audioDescription": "deep bass impact hit with reverb tail",
    "audioUsableFor": "trailer transition hit"
  },

  "CREATIVE": {
    "whatMakesThisUnique": "description of what sets this shot apart",
    "repurposeIdeas": ["play in reverse for destruction-to-creation effect", "slow to 0.3x for dramatic emphasis"],
    "transitionInto": "hard cut from black works best",
    "transitionOutOf": "match cut on the golden glow to next scene",
    "pairsWellWith": "wide establishing shots before, close-up action after"
  },

  "LEARNING": {
    "techniqueUsed": "name the cinematographic technique if identifiable",
    "whyItWorks": "why is this shot effective from a filmmaking perspective",
    "whatToAvoid": "any issues with this shot (soft focus, awkward framing, etc.)",
    "applicableToOurBrand": true,
    "brandFitScore": 8
  }
}

ALSO provide a SUMMARY object at the end of the array with:
{
  "type": "summary",
  "totalScenes": 23,
  "totalDuration": 50.8,
  "overallQuality": 8.5,
  "overallEnergy": { "average": 6.5, "peak": 9, "peakTimestamp": 23.5 },
  "dominantMoods": ["epic", "mysterious"],
  "dominantColors": ["#1a0a4e", "#ff6600", "#0a0a1a"],
  "musicAnalysis": {
    "genre": "orchestral hybrid",
    "bpm_estimate": 120,
    "beatDropTimestamps": [12.3, 24.5, 38.1],
    "buildUpTimestamps": [10.0, 22.0],
    "quietMoments": [0.0, 45.0]
  },
  "topClipMoments": [
    {"start": 12.3, "end": 15.1, "reason": "best action shot", "score": 9.5}
  ],
  "techniquesIdentified": [
    {"name": "whip pan transition", "timestamp": 8.5, "effectiveness": 9},
    {"name": "match cut on color", "timestamp": 15.0, "effectiveness": 8}
  ],
  "sfxTimeline": [
    {"time": 0.0, "type": "bass-impact"},
    {"time": 3.5, "type": "whoosh"},
    {"time": 12.3, "type": "explosion"}
  ],
  "overallAssessment": "One-paragraph assessment of this video's quality and usefulness for our project",
  "topLessonsLearned": [
    "This video uses whip pans between characters - we should adopt this for our character showcases",
    "The bass drop at 12.3s perfectly syncs with the visual climax - demonstrates BPM editing"
  ]
}

IMPORTANT CONSTRAINTS:
- Return ONLY valid JSON — no markdown, no commentary, no text outside the JSON
- Limit to the 15 most significant scenes/shots (skip very short transitions under 0.3s)
- Keep string values concise (under 100 chars each)
- Timestamps must be precise to 0.1 seconds
- The summary object MUST be the last element in the array with "type": "summary"
- Ensure ALL brackets and braces are properly closed`;

  const responseText = await generateWithVideo(fileRef, prompt);
  const fullAnalysis: any[] = parseGeminiJson(responseText);

  // Separate scenes from summary object (last element with type: "summary")
  const summaryObj = fullAnalysis.find((item: any) => item.type === 'summary') || null;
  const scenes = fullAnalysis.filter((item: any) => item.type !== 'summary');

  // Save full analysis (scenes + summary)
  const outDir = dirname(filePath);
  const outPath = join(outDir, `${name}-analysis.json`);
  writeFileSync(outPath, JSON.stringify(fullAnalysis, null, 2));

  // Extract and save sfxTimeline, beatDropTimestamps, and techniquesIdentified separately
  if (summaryObj) {
    const extractedData: any = {
      sourceVideo: basename(filePath),
      extractedAt: new Date().toISOString(),
    };

    if (summaryObj.sfxTimeline) {
      extractedData.sfxTimeline = summaryObj.sfxTimeline;
    }
    if (summaryObj.musicAnalysis?.beatDropTimestamps) {
      extractedData.beatDropTimestamps = summaryObj.musicAnalysis.beatDropTimestamps;
    }
    if (summaryObj.musicAnalysis?.buildUpTimestamps) {
      extractedData.buildUpTimestamps = summaryObj.musicAnalysis.buildUpTimestamps;
    }
    if (summaryObj.techniquesIdentified) {
      extractedData.techniquesIdentified = summaryObj.techniquesIdentified;
    }
    if (summaryObj.topClipMoments) {
      extractedData.topClipMoments = summaryObj.topClipMoments;
    }
    if (summaryObj.musicAnalysis) {
      extractedData.musicAnalysis = summaryObj.musicAnalysis;
    }

    const extractedPath = join(outDir, `${name}-extracted-data.json`);
    writeFileSync(extractedPath, JSON.stringify(extractedData, null, 2));
    console.log(`  Extracted data saved: ${extractedPath}`);
  }

  // Print summary
  console.log(`\n  Analysis complete: ${scenes.length} scenes identified\n`);

  for (const scene of scenes) {
    const start = scene.startTime ?? scene.start ?? 0;
    const end = scene.endTime ?? scene.end ?? 0;
    const dur = (end - start).toFixed(1);
    const energy = scene.EMOTION?.energy ?? scene.energy ?? 0;
    const quality = scene.QUALITY?.visualQuality ?? scene.quality ?? 0;
    const bestUse = scene.CLIP_EXTRACTION?.bestTrailerUse ?? scene.bestUse ?? 'n/a';
    const mood = scene.EMOTION?.mood ?? scene.mood ?? 'n/a';
    const shotType = scene.VISUAL?.shotType ?? scene.shotType ?? '';
    const cameraMovement = scene.VISUAL?.cameraMovement ?? scene.cameraMovement ?? 'n/a';
    const complexity = scene.VISUAL?.visualComplexity ?? scene.visualComplexity ?? 'n/a';
    const subject = scene.VISUAL?.subject ?? scene.description ?? '';
    const standaloneVal = scene.CLIP_EXTRACTION?.standaloneValue ?? 0;
    const dominantColors = scene.VISUAL?.colors?.dominant ?? scene.colors ?? [];

    console.log(
      `  [${start.toFixed(1)}s - ${end.toFixed(1)}s] (${dur}s) ` +
      `E:${energy}/10 Q:${quality}/10 | ${bestUse}`
    );
    console.log(`    ${subject}`);
    console.log(`    Mood: ${mood} | Standalone: ${standaloneVal}/10 | Colors: ${(Array.isArray(dominantColors) ? dominantColors : []).join(', ')}`);
    if (shotType) console.log(`    Shot: ${shotType} | Camera: ${cameraMovement} | Complexity: ${complexity}/10`);
    if (scene.LEARNING?.techniqueUsed) console.log(`    Technique: ${scene.LEARNING.techniqueUsed}`);
    console.log('');
  }

  // Stats from scenes
  const sceneCount = scenes.length || 1;
  const avgEnergy = scenes.reduce((s: number, a: any) => s + (a.EMOTION?.energy ?? a.energy ?? 0), 0) / sceneCount;
  const avgQuality = scenes.reduce((s: number, a: any) => s + (a.QUALITY?.visualQuality ?? a.quality ?? 0), 0) / sceneCount;
  const standaloneCount = scenes.filter((a: any) => (a.CLIP_EXTRACTION?.standaloneValue ?? 0) >= 7).length;
  const hookScenes = scenes.filter((a: any) => (a.CLIP_EXTRACTION?.bestTrailerUse ?? a.bestUse) === 'hook').length;
  const climaxScenes = scenes.filter((a: any) => (a.CLIP_EXTRACTION?.bestTrailerUse ?? a.bestUse) === 'climax').length;

  console.log(`  --- Summary ---`);
  console.log(`  Total scenes: ${scenes.length}`);
  console.log(`  Avg energy: ${avgEnergy.toFixed(1)}/10`);
  console.log(`  Avg quality: ${avgQuality.toFixed(1)}/10`);
  console.log(`  Standalone clips (value >= 7): ${standaloneCount}/${scenes.length}`);
  console.log(`  Hook candidates: ${hookScenes} | Climax candidates: ${climaxScenes}`);

  // Print summary object highlights if present
  if (summaryObj) {
    console.log(`\n  --- AI Summary ---`);
    if (summaryObj.overallQuality) console.log(`  Overall quality: ${summaryObj.overallQuality}/10`);
    if (summaryObj.overallEnergy) console.log(`  Energy: avg ${summaryObj.overallEnergy.average}, peak ${summaryObj.overallEnergy.peak} @ ${summaryObj.overallEnergy.peakTimestamp}s`);
    if (summaryObj.dominantMoods) console.log(`  Dominant moods: ${summaryObj.dominantMoods.join(', ')}`);
    if (summaryObj.musicAnalysis?.genre) console.log(`  Music: ${summaryObj.musicAnalysis.genre} (~${summaryObj.musicAnalysis.bpm_estimate} BPM)`);
    if (summaryObj.musicAnalysis?.beatDropTimestamps?.length) {
      console.log(`  Beat drops: ${summaryObj.musicAnalysis.beatDropTimestamps.map((t: number) => `${t}s`).join(', ')}`);
    }
    if (summaryObj.techniquesIdentified?.length) {
      console.log(`  Techniques found: ${summaryObj.techniquesIdentified.length}`);
      for (const t of summaryObj.techniquesIdentified.slice(0, 5)) {
        console.log(`    - ${t.name} @ ${t.timestamp}s (effectiveness: ${t.effectiveness}/10)`);
      }
    }
    if (summaryObj.sfxTimeline?.length) {
      console.log(`  SFX timeline: ${summaryObj.sfxTimeline.length} events`);
    }
    if (summaryObj.topClipMoments?.length) {
      console.log(`  Top clip moments:`);
      for (const m of summaryObj.topClipMoments.slice(0, 5)) {
        console.log(`    [${m.start}s - ${m.end}s] ${m.reason} (score: ${m.score})`);
      }
    }
    if (summaryObj.overallAssessment) {
      console.log(`\n  Assessment: ${summaryObj.overallAssessment}`);
    }
    if (summaryObj.topLessonsLearned?.length) {
      console.log(`\n  Lessons learned:`);
      for (const lesson of summaryObj.topLessonsLearned) {
        console.log(`    * ${lesson}`);
      }
    }
  }

  console.log(`\n  Saved: ${outPath}`);

  // Learning entry -- gather techniques and patterns from both scenes and summary
  const techniques: string[] = [];
  // Techniques from scenes
  for (const scene of scenes) {
    if (scene.LEARNING?.techniqueUsed) techniques.push(String(scene.LEARNING.techniqueUsed));
    if (scene.CREATIVE?.whatMakesThisUnique) techniques.push(String(scene.CREATIVE.whatMakesThisUnique));
  }
  // Techniques from summary
  if (summaryObj?.techniquesIdentified) {
    for (const t of summaryObj.techniquesIdentified) {
      if (t.name && !techniques.includes(t.name)) techniques.push(t.name);
    }
  }

  const patterns: string[] = [
    `avg_energy:${avgEnergy.toFixed(1)}`,
    `avg_quality:${avgQuality.toFixed(1)}`,
    `scenes:${scenes.length}`,
    `standalone_ratio:${(standaloneCount / sceneCount).toFixed(2)}`,
  ];
  if (summaryObj?.musicAnalysis?.genre) patterns.push(`music_genre:${summaryObj.musicAnalysis.genre}`);
  if (summaryObj?.musicAnalysis?.bpm_estimate) patterns.push(`bpm:${summaryObj.musicAnalysis.bpm_estimate}`);
  if (summaryObj?.dominantMoods?.length) patterns.push(`dominant_moods:${summaryObj.dominantMoods.join(',')}`);

  appendLearningEntry(
    'analyze',
    basename(filePath),
    `${scenes.length} scenes, avg Q:${avgQuality.toFixed(1)}, ${standaloneCount} standalone` +
      (summaryObj?.overallAssessment ? ` -- ${summaryObj.overallAssessment}` : ''),
    techniques.slice(0, 20),
    patterns
  );

  // Append key learnings from summary to learning DB for cross-video aggregation
  if (summaryObj) {
    const db = loadLearningDB();

    // Store sfxTimeline, beatDropTimestamps, techniquesIdentified for aggregation
    if (!Array.isArray((db as any).aggregatedSfxTimelines)) {
      (db as any).aggregatedSfxTimelines = [];
    }
    if (summaryObj.sfxTimeline?.length) {
      (db as any).aggregatedSfxTimelines.push({
        sourceVideo: basename(filePath),
        analyzedAt: new Date().toISOString(),
        sfxTimeline: summaryObj.sfxTimeline,
      });
    }

    if (!Array.isArray((db as any).aggregatedBeatDrops)) {
      (db as any).aggregatedBeatDrops = [];
    }
    if (summaryObj.musicAnalysis?.beatDropTimestamps?.length) {
      (db as any).aggregatedBeatDrops.push({
        sourceVideo: basename(filePath),
        analyzedAt: new Date().toISOString(),
        beatDropTimestamps: summaryObj.musicAnalysis.beatDropTimestamps,
        buildUpTimestamps: summaryObj.musicAnalysis.buildUpTimestamps || [],
        genre: summaryObj.musicAnalysis.genre || null,
        bpm_estimate: summaryObj.musicAnalysis.bpm_estimate || null,
      });
    }

    if (!Array.isArray((db as any).aggregatedTechniques)) {
      (db as any).aggregatedTechniques = [];
    }
    if (summaryObj.techniquesIdentified?.length) {
      (db as any).aggregatedTechniques.push({
        sourceVideo: basename(filePath),
        analyzedAt: new Date().toISOString(),
        techniques: summaryObj.techniquesIdentified,
      });
    }

    if (!Array.isArray((db as any).lessonsLearned)) {
      (db as any).lessonsLearned = [];
    }
    if (summaryObj.topLessonsLearned?.length) {
      for (const lesson of summaryObj.topLessonsLearned) {
        if (!(db as any).lessonsLearned.includes(lesson)) {
          (db as any).lessonsLearned.push(lesson);
        }
      }
    }

    saveLearningDB(db);
    console.log(`  [Learning] Key learnings aggregated to ${LEARNING_DB_PATH}`);
  }
}

// ─── 2. find-clips ──────────────────────────────────────────────
async function cmdFindClips(inputPath: string, brief: string) {
  ensureDirs();
  const filePath = resolveVideoPath(inputPath);
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const stat = statSync(filePath);
  const name = basename(filePath, extname(filePath));

  console.log(`\n=== Video Intelligence: Find Clips ===`);
  console.log(`  File: ${basename(filePath)}`);
  console.log(`  Size: ${formatBytes(stat.size)}`);
  console.log(`  Brief: "${brief}"`);
  console.log('');

  const fileRef = await uploadAndWait(filePath);

  const prompt = `You are sourcing clips for this trailer: ${brief}

BRAND CONTEXT: "Demons & Deities" is a dark cosmic fantasy auto-battler NFT card game. The visual brand is gold/purple/blue palette, dark mythological aesthetic, targeting crypto gamers aged 18-35. Think epic celestial battles, glowing runes, cosmic energy, divine beings clashing. Premium, mysterious, powerful.

Watch this video and recommend the 5-8 best clips to extract. For each:
1. Start and end timestamp (seconds, precise to 0.1s)
2. Why this clip works for the trailer
3. Where in the trailer timeline it should go (hook, early, mid, climax, cta-background)
4. What text overlay would pair well with this clip (or null if none needed)
5. What SFX would enhance this clip (impact, whoosh, riser, shimmer, bass-drop, silence)
6. Suggested Shotstack effects (zoomIn, zoomOut, zoomInSlow, zoomOutSlow, slideLeft, slideRight, slideUp, slideDown) and filters (darken, boost, greyscale, contrast)
7. Speed adjustment (0.5 for half speed, 1.0 normal, 1.5 fast)

Also provide:
- A "clipFlow" array: the recommended ORDER these clips should appear in the final trailer (by their index in your recommendations array, 0-based)
- A "rejectedClips" array: clips you considered but rejected, with timestamps and rejection reasons (so we learn what to avoid from this source)
- A "sourceQualityRating" (1-10): overall quality rating of this source video for our brand

Return as JSON object:
{
  "recommendations": [{
    "start": 12.3, "end": 15.1,
    "reason": "Epic sword clash with particle effects -- perfect high-energy moment",
    "trailerPosition": "climax",
    "suggestedText": null,
    "suggestedSfx": "bass-impact",
    "suggestedEffect": "zoomInFast",
    "suggestedFilter": "boost",
    "suggestedSpeed": 1.0
  }, ...],
  "clipFlow": [0, 3, 1, 4, 2, 5],
  "rejectedClips": [{
    "start": 5.0, "end": 7.2,
    "reason": "Washed out colors, doesn't match dark cosmic aesthetic"
  }, ...],
  "sourceQualityRating": 7
}

Return ONLY the JSON object, no other text.`;

  const responseText = await generateWithVideo(fileRef, prompt);
  const result = parseGeminiJson(responseText);

  // Handle both old array format and new object format
  const clips: ClipRecommendation[] = Array.isArray(result) ? result : (result.recommendations || []);
  const clipFlow: number[] = result.clipFlow || [];
  const rejectedClips: any[] = result.rejectedClips || [];
  const sourceQualityRating: number = result.sourceQualityRating || 0;

  // Save recommendations
  const outDir = dirname(filePath);
  const outPath = join(outDir, `${name}-clip-recs.json`);
  const output = {
    brief,
    sourceVideo: basename(filePath),
    analyzedAt: new Date().toISOString(),
    sourceQualityRating,
    recommendations: clips,
    clipFlow,
    rejectedClips,
  };
  writeFileSync(outPath, JSON.stringify(output, null, 2));

  // Print recommendations
  console.log(`\n  Found ${clips.length} clip recommendations:\n`);

  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const dur = (c.end - c.start).toFixed(1);
    console.log(`  ${i + 1}. [${c.start.toFixed(1)}s - ${c.end.toFixed(1)}s] (${dur}s) -- ${c.trailerPosition.toUpperCase()}`);
    console.log(`     ${c.reason}`);
    if (c.suggestedText) console.log(`     Text: "${c.suggestedText}"`);
    console.log(`     SFX: ${c.suggestedSfx} | Effect: ${c.suggestedEffect} | Filter: ${c.suggestedFilter}`);
    console.log('');
  }

  if (clipFlow.length > 0) {
    console.log(`  Recommended clip flow order: ${clipFlow.map(i => `#${i + 1}`).join(' -> ')}`);
    console.log('');
  }

  if (rejectedClips.length > 0) {
    console.log(`  Rejected clips (${rejectedClips.length}):`);
    for (const r of rejectedClips) {
      console.log(`    [${r.start?.toFixed?.(1) ?? r.start}s - ${r.end?.toFixed?.(1) ?? r.end}s] ${r.reason}`);
    }
    console.log('');
  }

  if (sourceQualityRating > 0) {
    console.log(`  Source quality rating: ${sourceQualityRating}/10`);
    console.log('');
  }

  // Generate extract command
  const clipsStr = clips.map(c => `${c.start}:${c.end}`).join(',');
  console.log(`  Saved: ${outPath}`);
  console.log(`\n  Extract all recommended clips:`);
  console.log(`    npx ts-node scripts/marketing/clip-extractor.ts clip-multi "${filePath}" --clips "${clipsStr}"`);

  // Learning entry
  const patterns = [
    `source_quality:${sourceQualityRating}`,
    `clips_found:${clips.length}`,
    `rejected:${rejectedClips.length}`,
  ];
  const avoidPatterns = rejectedClips.map(r => `avoid: ${r.reason}`).slice(0, 5);
  appendLearningEntry('find-clips', basename(filePath), `${clips.length} clips for "${brief}", source Q:${sourceQualityRating}/10`, [], [...patterns, ...avoidPatterns]);
}

// ─── 3. rate ─────────────────────────────────────────────────────
async function cmdRate(inputPath: string) {
  ensureDirs();
  const filePath = resolveVideoPath(inputPath);
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const stat = statSync(filePath);

  console.log(`\n=== Video Intelligence: Rate Clip ===`);
  console.log(`  File: ${basename(filePath)}`);
  console.log(`  Size: ${formatBytes(stat.size)}`);
  console.log('');

  const fileRef = await uploadAndWait(filePath);

  const prompt = `Rate this video clip for use in a cinematic game trailer. Score across 5 dimensions, each 0-20, for a total of 0-100:

1. VISUAL IMPACT (0-20): Is it visually striking? High production value? Dramatic composition? Particle effects, lighting, color grading?
2. MOTION QUALITY (0-20): Smooth camera work? Dynamic action? Good pacing? Professional-feeling movement?
3. BRAND FIT (0-20): Does it match "Demons & Deities" -- a dark cosmic fantasy auto-battler with gold/purple/blue palette? Dark mythology, celestial battles, divine beings, crypto gaming aesthetic?
4. VERSATILITY (0-20): Can this clip be used in multiple contexts (hook, climax, background, social media, etc.)? Does it work at different speeds? Can text overlay on it?
5. UNIQUENESS (0-20): Would this stand out vs generic stock footage or other game trailers? Does it have a distinctive visual signature?

Return JSON (no other text):
{
  "score": 85,
  "visualImpact": 18,
  "motionQuality": 16,
  "brandFit": 19,
  "versatility": 15,
  "uniqueness": 17,
  "strengths": ["Stunning particle effects", "Dynamic camera movement"],
  "weaknesses": ["Slightly too dark in corners"],
  "bestUse": "hook",
  "detailedNotes": "One sentence summary of what makes this clip good or bad for a trailer."
}`;

  const responseText = await generateWithVideo(fileRef, prompt);
  const rating = parseGeminiJson(responseText);

  // Print rating
  console.log(`\n  === RATING: ${rating.score}/100 ===\n`);
  console.log(`  Visual Impact:  ${rating.visualImpact ?? '-'}/20`);
  console.log(`  Motion Quality: ${rating.motionQuality ?? '-'}/20`);
  console.log(`  Brand Fit:      ${rating.brandFit ?? '-'}/20`);
  console.log(`  Versatility:    ${rating.versatility ?? '-'}/20`);
  console.log(`  Uniqueness:     ${rating.uniqueness ?? '-'}/20`);

  console.log(`\n  Best use: ${rating.bestUse}`);

  if (rating.strengths?.length) {
    console.log(`\n  Strengths:`);
    for (const s of rating.strengths) console.log(`    + ${s}`);
  }
  if (rating.weaknesses?.length) {
    console.log(`\n  Weaknesses:`);
    for (const w of rating.weaknesses) console.log(`    - ${w}`);
  }
  if (rating.detailedNotes) {
    console.log(`\n  Notes: ${rating.detailedNotes}`);
  }

  // Save rating
  const name = basename(filePath, extname(filePath));
  const outPath = join(dirname(filePath), `${name}-rating.json`);
  writeFileSync(outPath, JSON.stringify({
    file: basename(filePath),
    ratedAt: new Date().toISOString(),
    ...rating,
  }, null, 2));
  console.log(`\n  Saved: ${outPath}`);

  // Learning entry
  const techniques = (rating.strengths || []).slice(0, 5);
  const patterns = [
    `score:${rating.score}`,
    `best_use:${rating.bestUse}`,
    `visual_impact:${rating.visualImpact}`,
    `brand_fit:${rating.brandFit}`,
  ];
  appendLearningEntry('rate', basename(filePath), `Score ${rating.score}/100, best use: ${rating.bestUse}`, techniques, patterns);
}

// ─── 4. compare ──────────────────────────────────────────────────
async function cmdCompare(inputPaths: string[]) {
  ensureDirs();

  const resolved: { path: string; name: string }[] = [];
  for (const p of inputPaths) {
    const full = resolveVideoPath(p);
    if (!existsSync(full)) {
      console.error(`File not found: ${full}`);
      process.exit(1);
    }
    resolved.push({ path: full, name: basename(full) });
  }

  console.log(`\n=== Video Intelligence: Compare ${resolved.length} Clips ===`);
  for (const r of resolved) {
    const stat = statSync(r.path);
    console.log(`  ${r.name} (${formatBytes(stat.size)})`);
  }
  console.log('');

  // Upload all files
  const fileRefs: GeminiFileRef[] = [];
  for (let i = 0; i < resolved.length; i++) {
    console.log(`  [${i + 1}/${resolved.length}] Uploading ${resolved[i].name}...`);
    const ref = await uploadAndWait(resolved[i].path);
    fileRefs.push(ref);
  }

  // Build clip labels for the prompt
  const clipLabels = resolved.map((r, i) => `Clip ${i + 1}: "${r.name}"`).join('\n');

  const prompt = `You are comparing ${resolved.length} video clips to determine which are best for a cinematic dark fantasy game trailer (auto-battler NFT card game called "Demons & Deities").

The clips are provided in order:
${clipLabels}

For each clip, rate it 1-100 and explain why. Then rank them from best to worst for trailer use.

Return JSON (no other text):
{
  "rankings": [
    {
      "rank": 1,
      "clipNumber": 2,
      "filename": "clip-name.mp4",
      "score": 92,
      "reason": "Why this clip ranked here",
      "bestUse": "hook"
    }
  ],
  "overallNotes": "Brief comparison summary",
  "suggestedOrder": "If using multiple clips together, what order works best and why"
}`;

  const responseText = await generateWithMultipleVideos(fileRefs, prompt);
  const comparison = parseGeminiJson(responseText);

  // Print rankings
  console.log(`\n  === RANKINGS ===\n`);

  for (const r of comparison.rankings) {
    const medal = r.rank === 1 ? '[1st]' : r.rank === 2 ? '[2nd]' : r.rank === 3 ? '[3rd]' : `[${r.rank}th]`;
    console.log(`  ${medal} ${r.filename || `Clip ${r.clipNumber}`} -- ${r.score}/100`);
    console.log(`    ${r.reason}`);
    console.log(`    Best use: ${r.bestUse}`);
    console.log('');
  }

  if (comparison.overallNotes) {
    console.log(`  Notes: ${comparison.overallNotes}`);
  }
  if (comparison.suggestedOrder) {
    console.log(`  Suggested order: ${comparison.suggestedOrder}`);
  }

  // Save comparison
  const outPath = join(EXTRACTED_DIR, `comparison-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify({
    comparedAt: new Date().toISOString(),
    clips: resolved.map(r => r.name),
    ...comparison,
  }, null, 2));
  console.log(`\n  Saved: ${outPath}`);
}

// ─── 5. smart-sample ────────────────────────────────────────────
async function cmdSmartSample(inputPath: string, count: number, clipDuration: number) {
  ensureDirs();
  const filePath = resolveVideoPath(inputPath);
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const stat = statSync(filePath);
  const name = basename(filePath, extname(filePath));

  console.log(`\n=== Video Intelligence: Smart Sample ===`);
  console.log(`  File: ${basename(filePath)}`);
  console.log(`  Size: ${formatBytes(stat.size)}`);
  console.log(`  Extracting: ${count} clips, ~${clipDuration}s each`);
  console.log('');

  // Step 1: Upload to Gemini
  const fileRef = await uploadAndWait(filePath);

  // Step 2: Ask for the best moments
  const prompt = `You are a professional video editor selecting the ${count} most visually impactful moments from this video for a cinematic dark fantasy game trailer.

Find the ${count} best non-overlapping segments, each approximately ${clipDuration} seconds long. Prioritize:
- High visual impact (particle effects, dynamic lighting, dramatic compositions)
- Strong motion (camera movement, action sequences, energy)
- Dark fantasy aesthetic (epic, mysterious, powerful imagery)
- Variety (don't pick 3 similar shots -- each clip should feel different)

Return as JSON array (no other text):
[{
  "start": 12.3, "end": 15.3,
  "description": "Massive energy blast illuminating a dark battlefield",
  "quality": 9,
  "bestUse": "climax"
}, ...]

Timestamps must be precise to 0.1 seconds. Ensure no clips overlap. Order by timestamp (earliest first).`;

  const responseText = await generateWithVideo(fileRef, prompt);
  const moments: SmartMoment[] = parseGeminiJson(responseText);

  console.log(`\n  Gemini identified ${moments.length} best moments:\n`);
  for (let i = 0; i < moments.length; i++) {
    const m = moments[i];
    console.log(`  ${i + 1}. [${m.start.toFixed(1)}s - ${m.end.toFixed(1)}s] Q:${m.quality}/10 | ${m.bestUse}`);
    console.log(`     ${m.description}`);
  }

  // Step 3: Extract clips via ffmpeg
  console.log(`\n  Extracting clips with ffmpeg...\n`);

  const extracted: string[] = [];
  for (let i = 0; i < moments.length; i++) {
    const m = moments[i];
    const clipName = `${name}-smart-${String(i + 1).padStart(3, '0')}`;
    const outFile = join(EXTRACTED_DIR, `${clipName}.mp4`);

    try {
      execSync(
        `ffmpeg -y -i "${filePath}" -ss ${m.start} -to ${m.end} ` +
        `-c:v libx264 -preset fast -crf 18 -c:a aac -b:a 128k ` +
        `-movflags +faststart "${outFile}" 2>/dev/null`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      const clipStat = statSync(outFile);
      console.log(`  [${i + 1}/${moments.length}] ${clipName}.mp4 (${formatBytes(clipStat.size)})`);
      extracted.push(outFile);
    } catch (err: any) {
      console.error(`  [${i + 1}/${moments.length}] FAILED: ${err.message}`);
    }
  }

  // Step 4: Save metadata alongside clips
  const metaPath = join(EXTRACTED_DIR, `${name}-smart-sample-meta.json`);
  writeFileSync(metaPath, JSON.stringify({
    sourceVideo: basename(filePath),
    sampledAt: new Date().toISOString(),
    count,
    clipDuration,
    moments: moments.map((m, i) => ({
      ...m,
      extractedFile: extracted[i] ? basename(extracted[i]) : null,
    })),
  }, null, 2));

  console.log(`\n  === Smart Sample Complete ===`);
  console.log(`  Extracted: ${extracted.length}/${moments.length} clips`);
  console.log(`  Metadata: ${metaPath}`);
  console.log(`  Clips in: ${EXTRACTED_DIR}`);

  if (extracted.length > 1) {
    console.log(`\n  Rate all clips:`);
    for (const e of extracted) {
      console.log(`    npx ts-node scripts/marketing/video-intelligence.ts rate "${e}"`);
    }
    console.log(`\n  Compare all clips:`);
    const compareArgs = extracted.map(e => `"${e}"`).join(' ');
    console.log(`    npx ts-node scripts/marketing/video-intelligence.ts compare ${compareArgs}`);
  }
}

// ─── 6. learn ───────────────────────────────────────────────────
async function cmdLearn() {
  ensureDirs();

  console.log(`\n=== Video Intelligence: Learn from Past Analyses ===\n`);

  // Find all *-analysis.json files in clips/sources/
  const analysisFiles: string[] = [];
  const searchDirs = [SOURCES_DIR, EXTRACTED_DIR, CLIPS_ROOT];

  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;
    try {
      const files = readdirSync(dir);
      for (const f of files) {
        if (f.endsWith('-analysis.json')) {
          analysisFiles.push(join(dir, f));
        }
      }
    } catch {
      // skip unreadable dirs
    }
  }

  if (analysisFiles.length === 0) {
    console.log('  No analysis files found in clips/sources/ or clips/extracted/.');
    console.log('  Run "analyze" on some videos first.');
    return;
  }

  console.log(`  Found ${analysisFiles.length} analysis file(s):\n`);

  // Aggregate data
  let totalScenes = 0;
  const allMoods: Record<string, number> = {};
  const allBestUses: Record<string, number> = {};
  const allColors: Record<string, number> = {};
  const hookShots: { file: string; scene: any }[] = [];
  const climaxShots: { file: string; scene: any }[] = [];
  const avoidPatterns: string[] = [];
  const topQualityScenes: { file: string; scene: any }[] = [];
  let totalEnergy = 0;
  let totalQuality = 0;

  for (const fp of analysisFiles) {
    const fname = basename(fp);
    console.log(`  Processing: ${fname}`);

    try {
      const data: any[] = JSON.parse(readFileSync(fp, 'utf-8'));
      if (!Array.isArray(data)) continue;

      totalScenes += data.length;

      for (const scene of data) {
        // Moods
        if (scene.mood) {
          allMoods[scene.mood] = (allMoods[scene.mood] || 0) + 1;
        }
        // Best uses
        if (scene.bestUse) {
          allBestUses[scene.bestUse] = (allBestUses[scene.bestUse] || 0) + 1;
        }
        // Colors
        if (Array.isArray(scene.colors)) {
          for (const c of scene.colors) {
            allColors[c] = (allColors[c] || 0) + 1;
          }
        }
        // Energy & quality
        totalEnergy += scene.energy || 0;
        totalQuality += scene.quality || 0;

        // Hook shots
        if (scene.bestUse === 'hook' && (scene.quality || 0) >= 7) {
          hookShots.push({ file: fname, scene });
        }
        // Climax shots
        if (scene.bestUse === 'climax' && (scene.quality || 0) >= 7) {
          climaxShots.push({ file: fname, scene });
        }
        // Low quality to avoid
        if ((scene.quality || 0) <= 3) {
          avoidPatterns.push(`${fname}: [${scene.start}-${scene.end}s] Q:${scene.quality} - ${scene.description || 'low quality'}`);
        }
        // Top quality
        if ((scene.quality || 0) >= 8) {
          topQualityScenes.push({ file: fname, scene });
        }
      }
    } catch (err: any) {
      console.log(`    Skipped (parse error): ${err.message}`);
    }
  }

  // Sort and prepare learning results
  const sortedMoods = Object.entries(allMoods).sort((a, b) => b[1] - a[1]);
  const sortedBestUses = Object.entries(allBestUses).sort((a, b) => b[1] - a[1]);
  const sortedColors = Object.entries(allColors).sort((a, b) => b[1] - a[1]).slice(0, 20);
  topQualityScenes.sort((a, b) => (b.scene.quality || 0) - (a.scene.quality || 0));

  const learningResult = {
    aggregatedAt: new Date().toISOString(),
    sourcesAnalyzed: analysisFiles.length,
    totalScenes,
    avgEnergy: totalScenes > 0 ? +(totalEnergy / totalScenes).toFixed(1) : 0,
    avgQuality: totalScenes > 0 ? +(totalQuality / totalScenes).toFixed(1) : 0,
    topMoods: sortedMoods.slice(0, 10),
    topBestUses: sortedBestUses,
    topColorPalette: sortedColors.map(([color, count]) => ({ color, count })),
    bestHookShots: hookShots.slice(0, 10).map(h => ({
      source: h.file,
      start: h.scene.start,
      end: h.scene.end,
      quality: h.scene.quality,
      description: h.scene.description,
    })),
    bestClimaxShots: climaxShots.slice(0, 10).map(c => ({
      source: c.file,
      start: c.scene.start,
      end: c.scene.end,
      quality: c.scene.quality,
      description: c.scene.description,
    })),
    avoidPatterns: avoidPatterns.slice(0, 20),
    topQualityScenes: topQualityScenes.slice(0, 15).map(t => ({
      source: t.file,
      start: t.scene.start,
      end: t.scene.end,
      quality: t.scene.quality,
      description: t.scene.description,
      bestUse: t.scene.bestUse,
    })),
  };

  // Save to learning DB
  const db = loadLearningDB();
  (db as any).aggregatedLearning = learningResult;
  saveLearningDB(db);

  // Console output
  console.log(`\n  === What Was Learned ===\n`);
  console.log(`  Sources analyzed: ${analysisFiles.length}`);
  console.log(`  Total scenes: ${totalScenes}`);
  console.log(`  Avg energy: ${learningResult.avgEnergy}/10`);
  console.log(`  Avg quality: ${learningResult.avgQuality}/10`);

  console.log(`\n  Top moods:`);
  for (const [mood, count] of sortedMoods.slice(0, 5)) {
    console.log(`    ${mood}: ${count} scenes`);
  }

  console.log(`\n  Top clip uses:`);
  for (const [use, count] of sortedBestUses.slice(0, 5)) {
    console.log(`    ${use}: ${count} scenes`);
  }

  console.log(`\n  Top colors:`);
  for (const { color, count } of learningResult.topColorPalette.slice(0, 10)) {
    console.log(`    ${color}: ${count} occurrences`);
  }

  console.log(`\n  Best hook shots: ${hookShots.length}`);
  for (const h of hookShots.slice(0, 3)) {
    console.log(`    ${h.file} [${h.scene.start}s-${h.scene.end}s] Q:${h.scene.quality}`);
  }

  console.log(`\n  Best climax shots: ${climaxShots.length}`);
  for (const c of climaxShots.slice(0, 3)) {
    console.log(`    ${c.file} [${c.scene.start}s-${c.scene.end}s] Q:${c.scene.quality}`);
  }

  if (avoidPatterns.length > 0) {
    console.log(`\n  Patterns to avoid (${avoidPatterns.length}):`);
    for (const p of avoidPatterns.slice(0, 5)) {
      console.log(`    ${p}`);
    }
  }

  console.log(`\n  Saved learning data: ${LEARNING_DB_PATH}`);
}

// ─── 7. audit-video ─────────────────────────────────────────────
async function cmdAuditVideo(inputPath: string) {
  ensureDirs();
  const filePath = resolveVideoPath(inputPath);
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const stat = statSync(filePath);
  const name = basename(filePath, extname(filePath));

  console.log(`\n=== Video Intelligence: Audit Video ===`);
  console.log(`  File: ${basename(filePath)}`);
  console.log(`  Size: ${formatBytes(stat.size)}`);
  console.log('');

  const fileRef = await uploadAndWait(filePath);

  const prompt = `You are a senior creative director auditing this video source for "Demons & Deities" -- a dark cosmic fantasy auto-battler NFT card game (gold/purple/blue brand palette, targeting crypto gamers 18-35).

Provide a comprehensive source audit covering:

1. PRODUCTION VALUE (1-10): Overall production quality, camera work, lighting, VFX, sound design
2. BRAND COMPATIBILITY (1-10): How well does this match our dark cosmic fantasy aesthetic? Color palette alignment? Mood alignment?
3. CLIP EXTRACTION POTENTIAL (1-10): How many usable 2-5 second clips could be pulled? Estimated count of high-quality clips. Any scenes that are trailer gold?
4. CREATIVE POTENTIAL (1-10): Could this footage be creatively repurposed beyond direct clips? (e.g., background loops, texture overlays, color-graded mood shots, reversed/slowed artistic shots)
5. LEGAL NOTES: Any visible logos, watermarks, faces, copyrighted material, or branded content that could cause issues? Any text overlays baked in?
6. RECOMMENDATION: "strongly recommend", "recommend", "conditional" (explain conditions), "skip" (explain why)
7. BEST CLIPS PREVIEW: The top 3 moments in the video with timestamps and why they're the best
8. IMPROVEMENT SUGGESTIONS: What post-processing (color grading, speed changes, cropping, VFX overlay) would make this source significantly better for our brand?

Return JSON (no other text):
{
  "productionValue": 8,
  "brandCompatibility": 7,
  "clipExtractionPotential": 9,
  "estimatedUsableClips": 12,
  "creativePotential": 6,
  "legalNotes": "No watermarks detected, one frame has barely visible logo at 14.2s",
  "recommendation": "strongly recommend",
  "recommendationReason": "High production dark fantasy footage with excellent VFX",
  "bestClips": [
    { "start": 3.2, "end": 6.1, "reason": "Stunning cosmic portal opening" },
    { "start": 22.0, "end": 24.5, "reason": "Epic energy clash between two beings" },
    { "start": 41.3, "end": 44.0, "reason": "Beautiful slow-motion particle dissolve" }
  ],
  "improvementSuggestions": [
    "Apply cool blue/purple color grade to shift warm scenes toward brand palette",
    "Slow motion the portal scene to 0.6x for more dramatic effect"
  ],
  "overallNotes": "Summary of the video's value as source material"
}`;

  const responseText = await generateWithVideo(fileRef, prompt);
  const audit = parseGeminiJson(responseText);

  // Print audit
  console.log(`\n  === AUDIT RESULTS ===\n`);
  console.log(`  Production Value:         ${audit.productionValue ?? '-'}/10`);
  console.log(`  Brand Compatibility:      ${audit.brandCompatibility ?? '-'}/10`);
  console.log(`  Clip Extraction Potential: ${audit.clipExtractionPotential ?? '-'}/10`);
  console.log(`  Estimated Usable Clips:   ${audit.estimatedUsableClips ?? '-'}`);
  console.log(`  Creative Potential:       ${audit.creativePotential ?? '-'}/10`);
  console.log(`\n  Recommendation: ${(audit.recommendation || 'unknown').toUpperCase()}`);
  console.log(`    ${audit.recommendationReason || ''}`);

  if (audit.legalNotes) {
    console.log(`\n  Legal Notes: ${audit.legalNotes}`);
  }

  if (audit.bestClips?.length) {
    console.log(`\n  Best Clips:`);
    for (const c of audit.bestClips) {
      console.log(`    [${c.start}s - ${c.end}s] ${c.reason}`);
    }
  }

  if (audit.improvementSuggestions?.length) {
    console.log(`\n  Improvement Suggestions:`);
    for (const s of audit.improvementSuggestions) {
      console.log(`    - ${s}`);
    }
  }

  if (audit.overallNotes) {
    console.log(`\n  Notes: ${audit.overallNotes}`);
  }

  // Save audit
  const outPath = join(dirname(filePath), `${name}-audit.json`);
  writeFileSync(outPath, JSON.stringify({
    file: basename(filePath),
    auditedAt: new Date().toISOString(),
    ...audit,
  }, null, 2));
  console.log(`\n  Saved: ${outPath}`);

  // Learning entry
  const techniques = (audit.improvementSuggestions || []).slice(0, 5);
  const patterns = [
    `production_value:${audit.productionValue}`,
    `brand_compatibility:${audit.brandCompatibility}`,
    `clip_potential:${audit.clipExtractionPotential}`,
    `recommendation:${audit.recommendation}`,
  ];
  appendLearningEntry('audit-video', basename(filePath), `${audit.recommendation}: PV:${audit.productionValue}/10, Brand:${audit.brandCompatibility}/10, ~${audit.estimatedUsableClips} clips`, techniques, patterns);
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd) {
    console.log('Video Intelligence -- Gemini-powered video analysis for trailer clip extraction\n');
    console.log('Commands:');
    console.log('  analyze <file>                                    Deep scene-by-scene analysis');
    console.log('  find-clips <file> --brief "trailer description"   Find best clips for a trailer brief');
    console.log('  rate <file>                                       Rate a clip for trailer use (0-100)');
    console.log('  compare <file1> <file2> [file3...]                Compare and rank multiple clips');
    console.log('  smart-sample <file> [--count N] [--duration N]    AI-powered best clip extraction');
    console.log('  learn                                             Learn from all past analyses');
    console.log('  audit-video <file>                                Comprehensive source video audit');
    console.log('');
    console.log('Environment: GEMINI_API_KEY (set in .env or export)');
    console.log('');
    console.log('Examples:');
    console.log('  npx ts-node scripts/marketing/video-intelligence.ts analyze clips/sources/trailer.mp4');
    console.log('  npx ts-node scripts/marketing/video-intelligence.ts find-clips clips/sources/trailer.mp4 --brief "45s dark fantasy NFT game trailer"');
    console.log('  npx ts-node scripts/marketing/video-intelligence.ts rate clips/extracted/clip-001.mp4');
    console.log('  npx ts-node scripts/marketing/video-intelligence.ts compare clip1.mp4 clip2.mp4 clip3.mp4');
    console.log('  npx ts-node scripts/marketing/video-intelligence.ts smart-sample clips/sources/trailer.mp4 --count 5 --duration 3');
    console.log('  npx ts-node scripts/marketing/video-intelligence.ts learn');
    console.log('  npx ts-node scripts/marketing/video-intelligence.ts audit-video clips/sources/trailer.mp4');
    return;
  }

  // Validate API key (not needed for learn command)
  if (cmd !== 'learn' && !GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not set.');
    console.error('Add it to your .env file or export it:');
    console.error('  export GEMINI_API_KEY=your-key-here');
    console.error('Get one at: https://aistudio.google.com/apikey');
    process.exit(1);
  }

  switch (cmd) {
    case 'analyze': {
      const file = args[1];
      if (!file) {
        console.error('Usage: analyze <video-file>');
        process.exit(1);
      }
      await cmdAnalyze(file);
      break;
    }

    case 'find-clips': {
      const file = args[1];
      const brief = getFlag(args, '--brief');
      if (!file || !brief) {
        console.error('Usage: find-clips <video-file> --brief "trailer description"');
        process.exit(1);
      }
      await cmdFindClips(file, brief);
      break;
    }

    case 'rate': {
      const file = args[1];
      if (!file) {
        console.error('Usage: rate <clip-file>');
        process.exit(1);
      }
      await cmdRate(file);
      break;
    }

    case 'compare': {
      const files = args.slice(1).filter(a => !a.startsWith('--'));
      if (files.length < 2) {
        console.error('Usage: compare <file1> <file2> [file3...]');
        console.error('Provide at least 2 video files to compare.');
        process.exit(1);
      }
      await cmdCompare(files);
      break;
    }

    case 'smart-sample': {
      const file = args[1];
      if (!file) {
        console.error('Usage: smart-sample <video-file> [--count N] [--duration N]');
        process.exit(1);
      }
      const count = getFlagNum(args, '--count') ?? 5;
      const duration = getFlagNum(args, '--duration') ?? 3;
      await cmdSmartSample(file, count, duration);
      break;
    }

    case 'learn': {
      await cmdLearn();
      break;
    }

    case 'audit-video': {
      const file = args[1];
      if (!file) {
        console.error('Usage: audit-video <video-file>');
        process.exit(1);
      }
      await cmdAuditVideo(file);
      break;
    }

    default:
      console.error(`Unknown command: ${cmd}`);
      console.log('Run without arguments for usage info.');
      process.exit(1);
  }
}

main().catch(err => {
  console.error(`\nError: ${err.message}`);
  if (err.message.includes('403')) {
    console.error('Hint: Your GEMINI_API_KEY may be invalid or have exceeded its quota.');
    console.error('Check at: https://aistudio.google.com/apikey');
  }
  if (err.message.includes('429')) {
    console.error('Hint: Rate limited by Gemini. The script retries automatically, but you may be hitting sustained quota limits.');
    console.error('Wait a minute and try again, or check your quota at: https://aistudio.google.com/apikey');
  }
  if (err.message.includes('413') || err.message.includes('too large')) {
    console.error('Hint: The video file is too large. Try compressing it first:');
    console.error('  ffmpeg -i input.mp4 -vf scale=720:-2 -c:v libx264 -crf 28 output-compressed.mp4');
  }
  if (err.message.includes('JSON')) {
    console.error('Hint: Gemini returned non-JSON response. This sometimes happens with unusual videos.');
    console.error('Try running the command again -- Gemini responses can vary between calls.');
  }
  process.exit(1);
});
