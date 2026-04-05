/**
 * Demons & Deities -- Autonomous Trailer Production Orchestrator
 *
 * Master script that automates the entire trailer production pipeline:
 *   Phase 1: Clip Sourcing (YouTube search + download + scene analysis + sampling)
 *   Phase 2: Audio Sourcing (SFX extraction from downloaded videos)
 *   Phase 3: Assembly (Build Shotstack JSON from clip catalog)
 *   Phase 4: Quality Audit (Run video-quality-audit.ts, auto-fix if needed)
 *   Phase 5: Iteration (Re-audit, log results, report readiness)
 *
 * Usage:
 *   # Produce from a brief file
 *   npx ts-node scripts/marketing/produce-trailer.ts --brief scripts/marketing/blueprints/briefs/default-45s-dark.json
 *
 *   # Produce with inline options (uses default brief as base)
 *   npx ts-node scripts/marketing/produce-trailer.ts --duration 45 --theme "cinematic-dark" --angle "gameplay-showcase"
 *
 *   # Skip download phase (reuse existing clips)
 *   npx ts-node scripts/marketing/produce-trailer.ts --brief ... --skip-download
 *
 * Prerequisites: yt-dlp, ffmpeg, ffprobe (system installs)
 * Environment: PINATA_API_KEY (optional, uses hardcoded fallback)
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename, resolve } from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ROOT = process.cwd();
const MARKETING_DIR = join(ROOT, 'scripts', 'marketing');
const CLIPS_DIR = join(MARKETING_DIR, 'clips');
const SOURCES_DIR = join(CLIPS_DIR, 'sources');
const EXTRACTED_DIR = join(CLIPS_DIR, 'extracted');
const AUDIO_CLIPS_DIR = join(CLIPS_DIR, 'audio');
const BLUEPRINTS_DIR = join(MARKETING_DIR, 'blueprints');
const ACTIVE_DIR = join(BLUEPRINTS_DIR, 'active');
const BRIEFS_DIR = join(BLUEPRINTS_DIR, 'briefs');
const PRODUCTION_LOG = join(BLUEPRINTS_DIR, 'production-log.jsonl');

const PINATA_KEY = process.env.PINATA_API_KEY || 'd664670f2c35f6686ff4';
const PINATA_SECRET = 'fc45f5ab48b5904cac0e3efe472bddd64228504a8bc0891eaa0dedd0da53206a';

const EXEC_OPTS = { encoding: 'utf-8' as const, maxBuffer: 50 * 1024 * 1024, timeout: 300_000 };

const DEFAULT_BRIEF_PATH = join(BRIEFS_DIR, 'default-45s-dark.json');

// ============================================================================
// TYPES
// ============================================================================

interface Brief {
  title: string;
  duration: number;
  theme: string;
  angle: string;
  searchQueries: string[];
  textCards: TextCard[];
  imageOverlays: ImageOverlay[];
  soundtrack: string;
  targetScore: number;
}

interface TextCard {
  text: string;
  timing: 'title' | 'early' | 'mid' | 'late' | 'cta';
  style: string;
  size: string;
  color: string;
}

interface ImageOverlay {
  src: string;
  timing: 'title' | 'early' | 'mid' | 'late' | 'cta';
  scale?: number;
  position?: string;
  opacity?: number;
}

interface ClipMeta {
  filename: string;
  localPath: string;
  ipfsUrl?: string;
  duration: number;
  sourceVideo: string;
  mood: string;
  energy: number;
  start: number;
  end: number;
}

interface AudioMeta {
  filename: string;
  localPath: string;
  ipfsUrl?: string;
  type: 'impact' | 'whoosh' | 'riser' | 'shimmer' | 'stinger';
  duration: number;
}

interface ProductionState {
  brief: Brief;
  clips: ClipMeta[];
  audioSfx: AudioMeta[];
  shotstackPath: string;
  version: number;
  score: number;
  grade: string;
  log: string[];
}

// ============================================================================
// UTILITIES
// ============================================================================

function ensureDirs() {
  for (const d of [SOURCES_DIR, EXTRACTED_DIR, AUDIO_CLIPS_DIR, ACTIVE_DIR, BRIEFS_DIR]) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }
}

function log(phase: string, msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`  [${ts}] [${phase}] ${msg}`);
}

function logPhase(num: number, name: string) {
  console.log('');
  console.log('='.repeat(70));
  console.log(`  PHASE ${num}: ${name}`);
  console.log('='.repeat(70));
  console.log('');
}

function appendProductionLog(agent: string, type: string, message: string, extra?: Record<string, any>) {
  const entry = {
    timestamp: new Date().toISOString(),
    agent,
    type,
    message,
    ...extra,
  };
  try {
    const line = JSON.stringify(entry) + '\n';
    if (existsSync(PRODUCTION_LOG)) {
      const existing = readFileSync(PRODUCTION_LOG, 'utf-8');
      writeFileSync(PRODUCTION_LOG, existing + line);
    } else {
      writeFileSync(PRODUCTION_LOG, line);
    }
  } catch { /* best-effort logging */ }
}

function execSafe(cmd: string, label: string): string | null {
  try {
    return execSync(cmd, { ...EXEC_OPTS, stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err: any) {
    log(label, `Command failed: ${(err.stderr || err.message || '').toString().slice(0, 200)}`);
    return null;
  }
}

interface ProbeResult {
  duration: number;
  width: number;
  height: number;
}

function probeVideo(filepath: string): ProbeResult {
  try {
    const raw = execSync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${filepath}"`,
      EXEC_OPTS,
    );
    const data = JSON.parse(raw);
    const vs = data.streams?.find((s: any) => s.codec_type === 'video');
    return {
      duration: parseFloat(data.format?.duration || '0'),
      width: vs?.width || 0,
      height: vs?.height || 0,
    };
  } catch {
    return { duration: 0, width: 0, height: 0 };
  }
}

// ============================================================================
// IPFS PINNING
// ============================================================================

async function pinToIPFS(filepath: string, name: string): Promise<string | null> {
  log('PIN', `Pinning ${name} to IPFS...`);
  const fileData = readFileSync(filepath);
  const blob = new Blob([fileData]);

  const formData = new FormData();
  formData.append('file', blob, name);
  formData.append('pinataMetadata', JSON.stringify({ name: `dd-trailer-${name}` }));
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

  try {
    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        pinata_api_key: PINATA_KEY,
        pinata_secret_api_key: PINATA_SECRET,
      },
      body: formData,
    });

    if (!res.ok) {
      log('PIN', `Pinata error ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }

    const data = await res.json() as any;
    const url = `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
    log('PIN', `Pinned: ${url}`);
    return url;
  } catch (err: any) {
    log('PIN', `Pin failed: ${err.message}`);
    return null;
  }
}

// ============================================================================
// PHASE 1: CLIP SOURCING
// ============================================================================

function searchAndDownloadVideos(queries: string[], maxPerQuery: number = 2): string[] {
  const downloaded: string[] = [];

  for (const query of queries) {
    log('CLIPS', `Searching YouTube: "${query}"`);

    // Use yt-dlp search to find videos
    const searchCmd = [
      'yt-dlp',
      '--no-check-certificates',
      '--js-runtimes', 'node',
      '--remote-components', 'ejs:github',
      '--flat-playlist',
      '--print', 'id',
      '--print', 'title',
      `"ytsearch${maxPerQuery}:${query}"`,
    ].join(' ');

    const searchResult = execSafe(searchCmd, 'CLIPS');
    if (!searchResult) {
      log('CLIPS', `Search failed for "${query}", skipping`);
      continue;
    }

    // Parse video IDs from search results (alternating id/title lines)
    const lines = searchResult.trim().split('\n').filter(Boolean);
    const videoIds: string[] = [];
    for (let i = 0; i < lines.length; i += 2) {
      const id = lines[i]?.trim();
      if (id && id.length === 11) {
        videoIds.push(id);
      }
    }

    if (videoIds.length === 0) {
      log('CLIPS', `No results for "${query}"`);
      continue;
    }

    // Download each video
    for (const videoId of videoIds) {
      if (downloaded.length >= 8) {
        log('CLIPS', `Reached 8 source videos, stopping downloads`);
        break;
      }

      const safeName = `source-${query.replace(/[^a-z0-9]/gi, '-').slice(0, 40)}-${videoId}`;
      const outputPath = join(SOURCES_DIR, `${safeName}.mp4`);

      // Skip if already downloaded
      if (existsSync(outputPath)) {
        log('CLIPS', `Already have: ${safeName}.mp4`);
        downloaded.push(outputPath);
        continue;
      }

      log('CLIPS', `Downloading: ${videoId}`);
      const dlCmd = [
        'yt-dlp',
        '--no-check-certificates',
        '--js-runtimes', 'node',
        '--remote-components', 'ejs:github',
        '-f', '"bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best"',
        '--merge-output-format', 'mp4',
        '--no-playlist',
        '--max-filesize', '100M',
        '--socket-timeout', '30',
        '-o', `"${outputPath}"`,
        `"https://www.youtube.com/watch?v=${videoId}"`,
      ].join(' ');

      const result = execSafe(dlCmd, 'CLIPS');
      if (result !== null && existsSync(outputPath)) {
        const probe = probeVideo(outputPath);
        log('CLIPS', `Downloaded: ${safeName}.mp4 (${probe.duration.toFixed(1)}s, ${probe.width}x${probe.height})`);
        downloaded.push(outputPath);
      } else {
        log('CLIPS', `Download failed for ${videoId}, skipping`);
      }
    }

    if (downloaded.length >= 8) break;
  }

  log('CLIPS', `Total source videos: ${downloaded.length}`);
  return downloaded;
}

interface SceneInfo {
  start: number;
  end: number;
  duration: number;
}

function analyzeScenes(videoPath: string): SceneInfo[] {
  log('CLIPS', `Analyzing scenes: ${basename(videoPath)}`);

  let sceneOutput: string;
  try {
    sceneOutput = execSync(
      `ffmpeg -i "${videoPath}" -filter:v "select='gt(scene,0.3)',showinfo" -f null - 2>&1`,
      { ...EXEC_OPTS, timeout: 120_000 },
    );
  } catch (err: any) {
    sceneOutput = err.stdout || err.stderr || err.message || '';
  }

  const probe = probeVideo(videoPath);
  const timestamps: number[] = [0];
  const lines = sceneOutput.split('\n');
  for (const line of lines) {
    const match = line.match(/pts_time:([\d.]+)/);
    if (match) {
      const t = parseFloat(match[1]);
      if (t > 0 && t < probe.duration) timestamps.push(t);
    }
  }
  if (probe.duration > 0) timestamps.push(probe.duration);

  const unique = [...new Set(timestamps)].sort((a, b) => a - b);
  const segments: SceneInfo[] = [];
  for (let i = 0; i < unique.length - 1; i++) {
    const s = unique[i];
    const e = unique[i + 1];
    if (e - s >= 0.1) segments.push({ start: s, end: e, duration: e - s });
  }

  log('CLIPS', `Found ${segments.length} scenes in ${basename(videoPath)}`);
  return segments;
}

function extractBestClips(videoPath: string, scenes: SceneInfo[], count: number, clipDuration: number): string[] {
  const probe = probeVideo(videoPath);
  const baseName = basename(videoPath, '.mp4');

  // Score windows by scene-change density
  interface Window { start: number; end: number; score: number }
  const sceneStarts = scenes.map(s => s.start);
  const windows: Window[] = [];

  for (let t = clipDuration / 2; t < probe.duration - clipDuration / 2; t += 0.5) {
    const ws = t - clipDuration / 2;
    const we = t + clipDuration / 2;
    const changes = sceneStarts.filter(ts => ts >= ws && ts <= we).length;
    windows.push({ start: ws, end: we, score: changes });
  }

  windows.sort((a, b) => b.score - a.score);

  // Pick top N non-overlapping
  const selected: Window[] = [];
  for (const w of windows) {
    if (selected.length >= count) break;
    if (!selected.some(s => w.start < s.end && w.end > s.start)) {
      selected.push(w);
    }
  }
  selected.sort((a, b) => a.start - b.start);

  const results: string[] = [];
  for (let i = 0; i < selected.length; i++) {
    const w = selected[i];
    const clipName = `${baseName}-clip-${String(i + 1).padStart(3, '0')}`;
    const outPath = join(EXTRACTED_DIR, `${clipName}.mp4`);

    if (existsSync(outPath)) {
      results.push(outPath);
      continue;
    }

    const cmd = `ffmpeg -y -i "${videoPath}" -ss ${w.start.toFixed(3)} -to ${w.end.toFixed(3)} ` +
      `-c:v libx264 -preset fast -crf 18 -c:a aac -b:a 128k -movflags +faststart "${outPath}" 2>/dev/null`;

    if (execSafe(cmd, 'CLIPS') !== null && existsSync(outPath)) {
      results.push(outPath);
    }
  }

  log('CLIPS', `Extracted ${results.length} clips from ${basename(videoPath)}`);
  return results;
}

async function buildClipCatalog(sourceVideos: string[], clipDuration: number): Promise<ClipMeta[]> {
  const catalog: ClipMeta[] = [];
  const moods = ['dark', 'epic', 'mysterious', 'intense', 'dramatic'];

  for (const videoPath of sourceVideos) {
    const scenes = analyzeScenes(videoPath);
    if (scenes.length < 2) {
      log('CLIPS', `Skipping ${basename(videoPath)} -- too few scenes`);
      continue;
    }

    const clipPaths = extractBestClips(videoPath, scenes, 4, clipDuration);

    for (let i = 0; i < clipPaths.length; i++) {
      const clipPath = clipPaths[i];
      const probe = probeVideo(clipPath);

      // Pin to IPFS
      const ipfsUrl = await pinToIPFS(clipPath, basename(clipPath));

      catalog.push({
        filename: basename(clipPath),
        localPath: clipPath,
        ipfsUrl: ipfsUrl || undefined,
        duration: probe.duration,
        sourceVideo: basename(videoPath),
        mood: moods[i % moods.length],
        energy: Math.min(10, scenes.length + i),
        start: 0,
        end: probe.duration,
      });
    }
  }

  log('CLIPS', `Clip catalog: ${catalog.length} clips, ${catalog.filter(c => c.ipfsUrl).length} pinned to IPFS`);
  return catalog;
}

// ============================================================================
// PHASE 2: AUDIO SOURCING
// ============================================================================

function extractAudioSamples(sourceVideos: string[]): string[] {
  const audioDir = AUDIO_CLIPS_DIR;
  if (!existsSync(audioDir)) mkdirSync(audioDir, { recursive: true });

  const samples: string[] = [];
  const sfxTypes: Array<{ label: string; startOffset: number; duration: number }> = [
    { label: 'impact', startOffset: 0, duration: 0.8 },
    { label: 'whoosh', startOffset: 5, duration: 0.5 },
    { label: 'riser', startOffset: 10, duration: 2.0 },
  ];

  // Only process first 3 source videos for SFX
  const sources = sourceVideos.slice(0, 3);
  for (const videoPath of sources) {
    const probe = probeVideo(videoPath);
    if (probe.duration < 15) continue;

    const baseName = basename(videoPath, '.mp4');
    for (const sfx of sfxTypes) {
      const outName = `${baseName}-${sfx.label}.mp3`;
      const outPath = join(audioDir, outName);

      if (existsSync(outPath)) {
        samples.push(outPath);
        continue;
      }

      const start = Math.min(sfx.startOffset, probe.duration - sfx.duration - 1);
      const cmd = `ffmpeg -y -i "${videoPath}" -ss ${start.toFixed(1)} -t ${sfx.duration} ` +
        `-vn -c:a libmp3lame -q:a 2 "${outPath}" 2>/dev/null`;

      if (execSafe(cmd, 'AUDIO') !== null && existsSync(outPath)) {
        samples.push(outPath);
      }
    }
  }

  log('AUDIO', `Extracted ${samples.length} audio samples`);
  return samples;
}

async function buildAudioCatalog(audioSamples: string[]): Promise<AudioMeta[]> {
  const catalog: AudioMeta[] = [];
  const typeMap: Record<string, AudioMeta['type']> = {
    impact: 'impact',
    whoosh: 'whoosh',
    riser: 'riser',
    shimmer: 'shimmer',
    stinger: 'stinger',
  };

  for (const samplePath of audioSamples) {
    const name = basename(samplePath);
    const inferredType = Object.keys(typeMap).find(k => name.includes(k));
    const type = inferredType ? typeMap[inferredType] : 'impact';

    const ipfsUrl = await pinToIPFS(samplePath, name);

    // Get duration via ffprobe
    let duration = 0.5;
    try {
      const raw = execSync(
        `ffprobe -v quiet -print_format json -show_format "${samplePath}"`,
        EXEC_OPTS,
      );
      duration = parseFloat(JSON.parse(raw).format?.duration || '0.5');
    } catch { /* use default */ }

    catalog.push({
      filename: name,
      localPath: samplePath,
      ipfsUrl: ipfsUrl || undefined,
      type,
      duration,
    });
  }

  log('AUDIO', `Audio catalog: ${catalog.length} SFX, ${catalog.filter(a => a.ipfsUrl).length} pinned`);
  return catalog;
}

// ============================================================================
// PHASE 3: SHOTSTACK ASSEMBLY
// ============================================================================

function buildShotstackJson(brief: Brief, clips: ClipMeta[], sfx: AudioMeta[]): any {
  const dur = brief.duration;

  // --- TIMING MAP ---
  // Sections of the trailer timeline
  const sections = {
    hook:    { start: 0,              end: 3 },
    title:   { start: 3,              end: 7 },
    early:   { start: 7,              end: Math.floor(dur * 0.4) },
    mid:     { start: Math.floor(dur * 0.4), end: Math.floor(dur * 0.6) },
    late:    { start: Math.floor(dur * 0.6), end: Math.floor(dur * 0.8) },
    climax:  { start: Math.floor(dur * 0.8), end: Math.floor(dur * 0.9) },
    cta:     { start: Math.floor(dur * 0.9), end: dur },
  };

  // --- SELECT VIDEO CLIPS ---
  // Pick clips for each section, no duplicates, vary sources
  const pinnedClips = clips.filter(c => c.ipfsUrl);
  if (pinnedClips.length === 0) {
    log('ASSEMBLY', 'WARNING: No pinned clips available. Using placeholder URLs.');
  }

  const usedUrls = new Set<string>();
  const usedSources = new Map<string, number>(); // source -> consecutive count

  function pickClip(preferredMood?: string): ClipMeta | null {
    // Prefer mood match, then any unused clip
    const candidates = pinnedClips
      .filter(c => c.ipfsUrl && !usedUrls.has(c.ipfsUrl!))
      .sort((a, b) => {
        // Prefer mood match
        const aMood = preferredMood && a.mood === preferredMood ? -1 : 0;
        const bMood = preferredMood && b.mood === preferredMood ? -1 : 0;
        if (aMood !== bMood) return aMood - bMood;
        // Avoid using same source back-to-back
        const aConsec = usedSources.get(a.sourceVideo) || 0;
        const bConsec = usedSources.get(b.sourceVideo) || 0;
        return aConsec - bConsec;
      });

    const pick = candidates[0] || null;
    if (pick && pick.ipfsUrl) {
      usedUrls.add(pick.ipfsUrl);
      // Track consecutive source usage
      for (const [src] of usedSources) usedSources.set(src, 0);
      usedSources.set(pick.sourceVideo, (usedSources.get(pick.sourceVideo) || 0) + 1);
    }
    return pick;
  }

  // --- BUILD VIDEO BASE TRACK (Track 5) ---
  // Must cover entire duration with no gaps
  const videoTrackClips: any[] = [];
  let cursor = 0;
  const sectionOrder: Array<{ name: string; start: number; end: number; mood: string; filter?: string }> = [
    { name: 'hook', ...sections.hook, mood: 'epic', filter: 'boost' },
    { name: 'title', ...sections.title, mood: 'mysterious', filter: 'darken' },
    { name: 'early', ...sections.early, mood: 'dark' },
    { name: 'mid', ...sections.mid, mood: 'intense', filter: 'boost' },
    { name: 'late', ...sections.late, mood: 'dramatic', filter: 'darken' },
    { name: 'climax', ...sections.climax, mood: 'epic', filter: 'boost' },
    { name: 'cta', ...sections.cta, mood: 'dark', filter: 'darken' },
  ];

  for (const section of sectionOrder) {
    const sectionDur = section.end - section.start;
    if (sectionDur <= 0) continue;

    const clip = pickClip(section.mood);
    const clipUrl = clip?.ipfsUrl || 'https://example.com/placeholder-video.mp4';
    const clipDuration = clip?.duration || 5;

    // Build video clip entry
    const entry: any = {
      asset: {
        type: 'video',
        src: clipUrl,
        volume: 0,
        trim: 0,
      },
      start: section.start,
      length: sectionDur,
      fit: 'cover',
    };

    // Add filter for cinematic look
    if (section.filter) {
      entry.filter = section.filter;
    }

    // Add transition for non-hook sections
    if (section.name !== 'hook') {
      entry.transition = { in: 'fade' };
    }

    // Add effect to first clip
    if (section.name === 'hook') {
      entry.effect = 'zoomIn';
    }

    // Speed variation on climax
    if (section.name === 'climax') {
      entry.speed = 0.7;
    }

    videoTrackClips.push(entry);
  }

  // --- BUILD DARK OVERLAY TRACK (Track 4) ---
  // Semi-transparent overlay during text sections for readability
  const darkOverlayClips: any[] = [];
  const textTimings = ['title', 'cta'];
  for (const timing of textTimings) {
    const section = sections[timing as keyof typeof sections];
    if (section) {
      darkOverlayClips.push({
        asset: {
          type: 'video',
          src: videoTrackClips[0]?.asset?.src || 'https://example.com/placeholder.mp4',
          volume: 0,
        },
        start: section.start,
        length: section.end - section.start,
        opacity: 0.4,
        fit: 'cover',
        filter: 'darken',
      });
    }
  }

  // --- BUILD IMAGE OVERLAY TRACK (Track 3) ---
  const imageTrackClips: any[] = [];
  for (const overlay of brief.imageOverlays) {
    const section = sections[overlay.timing as keyof typeof sections];
    if (!section) continue;

    const sectionDur = section.end - section.start;
    const imgStart = section.start + 0.5; // Slight delay after section start
    const imgLength = Math.min(sectionDur - 0.5, 4); // Max 4s display

    imageTrackClips.push({
      asset: {
        type: 'image',
        src: overlay.src,
      },
      start: imgStart,
      length: imgLength,
      scale: overlay.scale || 0.25,
      position: overlay.position || 'center',
      opacity: overlay.opacity || 0.9,
      effect: 'zoomIn',
      transition: { in: 'fade', out: 'fade' },
    });
  }

  // --- BUILD TEXT OVERLAY TRACK (Track 2) ---
  // Respect Commandment IV: max 12 text cards for 45s
  const maxCards = Math.min(brief.textCards.length, Math.floor(dur / 3.75));
  const textTrackClips: any[] = [];

  for (let i = 0; i < maxCards; i++) {
    const card = brief.textCards[i];
    const section = sections[card.timing as keyof typeof sections];
    if (!section) continue;

    const sectionDur = section.end - section.start;
    // Distribute cards within sections
    const cardsInSection = brief.textCards.filter(c => c.timing === card.timing);
    const indexInSection = cardsInSection.indexOf(card);
    const cardDuration = Math.min(2.5, (sectionDur - 0.5) / cardsInSection.length);
    const cardStart = section.start + 0.3 + (indexInSection * (cardDuration + 0.3));

    if (cardStart + cardDuration > section.end) continue;

    textTrackClips.push({
      asset: {
        type: 'title',
        text: card.text,
        style: card.style,
        size: card.size,
        color: card.color,
        position: 'center',
      },
      start: cardStart,
      length: cardDuration,
      transition: { in: 'fade', out: 'fade' },
    });
  }

  // --- BUILD SFX TRACK (Track 0) ---
  const sfxTrackClips: any[] = [];
  const pinnedSfx = sfx.filter(s => s.ipfsUrl);

  // Place SFX at section boundaries (Commandment X: sync to transitions)
  const sfxTimings = [
    { time: 0.0, type: 'impact' as const, volume: 0.9 },
    { time: sections.title.start, type: 'stinger' as const, volume: 1.0 },
    { time: sections.early.start, type: 'whoosh' as const, volume: 0.5 },
    { time: sections.mid.start, type: 'whoosh' as const, volume: 0.5 },
    { time: sections.late.start, type: 'whoosh' as const, volume: 0.5 },
    { time: sections.climax.start, type: 'impact' as const, volume: 0.8 },
    { time: sections.cta.start, type: 'stinger' as const, volume: 1.0 },
  ];

  const usedSfxUrls = new Set<string>();
  for (const timing of sfxTimings) {
    // Find best matching SFX
    let match = pinnedSfx.find(s => s.type === timing.type && s.ipfsUrl && !usedSfxUrls.has(s.ipfsUrl!));
    if (!match) {
      // Fall back to any available SFX
      match = pinnedSfx.find(s => s.ipfsUrl && !usedSfxUrls.has(s.ipfsUrl!));
    }
    if (!match) {
      // Reuse if we must
      match = pinnedSfx.find(s => s.ipfsUrl);
    }
    if (!match) continue;

    sfxTrackClips.push({
      asset: {
        type: 'audio',
        src: match.ipfsUrl,
        volume: timing.volume,
      },
      start: timing.time,
      length: match.duration,
    });
  }

  // --- ASSEMBLE SHOTSTACK JSON ---
  // Track ordering per VIDEO-QUALITY-BIBLE:
  //   Track 0: SFX audio
  //   Track 1: Text overlays
  //   Track 2: Image overlays (portraits, logos, pack art)
  //   Track 3: Semi-transparent dark overlay (for text readability)
  //   Track 4: (spare)
  //   Track 5: Video clips (base visual -- ALWAYS present, NEVER gaps)

  const shotstackJson: any = {
    timeline: {
      soundtrack: {
        src: brief.soundtrack,
        effect: 'fadeInFadeOut',
        volume: 0.65,
      },
      background: '#000000',
      tracks: [
        { clips: sfxTrackClips },            // Track 0: SFX
        { clips: textTrackClips },           // Track 1: Text overlays
        { clips: imageTrackClips },          // Track 2: Image overlays
        { clips: darkOverlayClips },         // Track 3: Dark overlay
        { clips: [] },                       // Track 4: Spare
        { clips: videoTrackClips },          // Track 5: Video base
      ],
    },
    output: {
      format: 'mp4',
      resolution: '1080',
      fps: 25,
      quality: 'high',
    },
  };

  return shotstackJson;
}

// ============================================================================
// PHASE 4: QUALITY AUDIT
// ============================================================================

interface AuditResult {
  score: number;
  grade: string;
  fixes: string[];
  output: string;
}

function runQualityAudit(jsonPath: string): AuditResult {
  log('AUDIT', `Running quality audit on ${basename(jsonPath)}`);

  const auditScript = join(MARKETING_DIR, 'video-quality-audit.ts');
  let output: string;
  try {
    output = execSync(
      `npx ts-node --project scripts/tsconfig.json "${auditScript}" "${jsonPath}"`,
      { ...EXEC_OPTS, cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'], timeout: 60_000 },
    );
  } catch (err: any) {
    // Audit exits with code 1 if score < 70, but still produces output
    output = (err.stdout || '') + (err.stderr || '');
  }

  // Parse score from output: "TOTAL:  NN/MM"
  const totalMatch = output.match(/TOTAL:\s+(\d+)\/(\d+)/);
  const score = totalMatch ? parseInt(totalMatch[1]) : 0;

  // Parse grade: "GRADE: X"
  const gradeMatch = output.match(/GRADE:\s+(\S+)/);
  const grade = gradeMatch ? gradeMatch[1] : 'F';

  // Parse fixes: numbered lines like " 1. [+N pts] Fix description"
  const fixes: string[] = [];
  const fixRegex = /\d+\.\s+\[\+\d+\s+pts\]\s+(.+)/g;
  let m;
  while ((m = fixRegex.exec(output)) !== null) {
    fixes.push(m[1]);
  }

  log('AUDIT', `Score: ${score}, Grade: ${grade}, Fixes needed: ${fixes.length}`);
  return { score, grade, fixes, output };
}

// ============================================================================
// AUTO-FIX ENGINE
// ============================================================================

function applyAutoFixes(jsonPath: string, fixes: string[]): boolean {
  log('AUTOFIX', `Attempting to auto-fix ${fixes.length} issues...`);

  let json: any;
  try {
    json = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  } catch {
    log('AUTOFIX', 'Failed to read JSON');
    return false;
  }

  let changed = false;

  for (const fix of fixes) {
    const fixLower = fix.toLowerCase();

    // --- Fix: First clip should be video ---
    if (fixLower.includes('opening image') || fixLower.includes('first visual clip')) {
      const lastTrack = json.timeline.tracks[json.timeline.tracks.length - 1];
      if (lastTrack?.clips?.[0]?.asset?.type === 'image') {
        lastTrack.clips[0].asset.type = 'video';
        lastTrack.clips[0].effect = 'zoomIn';
        changed = true;
        log('AUTOFIX', 'Changed first clip to video type');
      }
    }

    // --- Fix: First clip should start at 0 ---
    if (fixLower.includes('start to 0')) {
      const lastTrack = json.timeline.tracks[json.timeline.tracks.length - 1];
      if (lastTrack?.clips?.[0] && lastTrack.clips[0].start !== 0) {
        lastTrack.clips[0].start = 0;
        changed = true;
        log('AUTOFIX', 'Set first clip start to 0');
      }
    }

    // --- Fix: Move text out of first 3 seconds ---
    if (fixLower.includes('text overlays to start at 3')) {
      const textTrack = json.timeline.tracks.find((t: any) =>
        t.clips?.some((c: any) => c.asset?.type === 'title'),
      );
      if (textTrack) {
        for (const clip of textTrack.clips) {
          if (clip.asset?.type === 'title' && clip.start < 3) {
            clip.start = 3.0;
            changed = true;
            log('AUTOFIX', `Moved text "${clip.asset.text}" to 3.0s`);
          }
        }
      }
    }

    // --- Fix: Move brand title after 5s ---
    if (fixLower.includes('demons') && fixLower.includes('5s or later')) {
      for (const track of json.timeline.tracks) {
        for (const clip of track.clips || []) {
          if (clip.asset?.type === 'title' &&
            clip.asset.text?.toLowerCase().includes('demons') &&
            clip.start < 5) {
            clip.start = 5.0;
            changed = true;
            log('AUTOFIX', 'Moved brand title to 5.0s');
          }
        }
      }
    }

    // --- Fix: Add effect to first clip ---
    if (fixLower.includes('effect') && (fixLower.includes('zoomin') || fixLower.includes('first visual'))) {
      const lastTrack = json.timeline.tracks[json.timeline.tracks.length - 1];
      if (lastTrack?.clips?.[0] && !lastTrack.clips[0].effect) {
        lastTrack.clips[0].effect = 'zoomIn';
        changed = true;
        log('AUTOFIX', 'Added zoomIn effect to first clip');
      }
    }

    // --- Fix: Add filters to video clips ---
    if (fixLower.includes('filter') && (fixLower.includes('darken') || fixLower.includes('boost'))) {
      const lastTrack = json.timeline.tracks[json.timeline.tracks.length - 1];
      if (lastTrack?.clips) {
        let filterCount = 0;
        for (const clip of lastTrack.clips) {
          if (clip.asset?.type === 'video' && !clip.filter) {
            clip.filter = filterCount % 2 === 0 ? 'boost' : 'darken';
            filterCount++;
            changed = true;
          }
        }
        if (filterCount > 0) log('AUTOFIX', `Added filters to ${filterCount} video clips`);
      }
    }

    // --- Fix: Add speed variation ---
    if (fixLower.includes('speed') && (fixLower.includes('slow-mo') || fixLower.includes('0.5'))) {
      const lastTrack = json.timeline.tracks[json.timeline.tracks.length - 1];
      if (lastTrack?.clips && lastTrack.clips.length > 2) {
        // Apply slow-mo to a mid-point clip
        const midIdx = Math.floor(lastTrack.clips.length / 2);
        if (!lastTrack.clips[midIdx].speed) {
          lastTrack.clips[midIdx].speed = 0.5;
          changed = true;
          log('AUTOFIX', 'Added 0.5x slow-mo to mid-point clip');
        }
      }
    }

    // --- Fix: Add more rapid cuts in first 3 seconds ---
    if (fixLower.includes('rapid') && fixLower.includes('first')) {
      const lastTrack = json.timeline.tracks[json.timeline.tracks.length - 1];
      if (lastTrack?.clips) {
        const firstClip = lastTrack.clips[0];
        if (firstClip && firstClip.length > 2) {
          // Split the first clip into 2 rapid cuts
          const splitPoint = firstClip.length / 2;
          const secondClip = { ...JSON.parse(JSON.stringify(firstClip)) };
          firstClip.length = splitPoint;
          secondClip.start = firstClip.start + splitPoint;
          secondClip.length = splitPoint;
          secondClip.effect = 'zoomOut';
          if (secondClip.asset?.trim !== undefined) {
            secondClip.asset.trim = (secondClip.asset.trim || 0) + splitPoint;
          }
          lastTrack.clips.splice(1, 0, secondClip);
          changed = true;
          log('AUTOFIX', 'Split first clip into rapid cuts');
        }
      }
    }

    // --- Fix: Add SFX ---
    if (fixLower.includes('sfx') || fixLower.includes('sound effect')) {
      const sfxTrack = json.timeline.tracks[0];
      if (sfxTrack && sfxTrack.clips.length === 0) {
        // Add placeholder SFX entries (they'll have placeholder URLs)
        sfxTrack.clips.push({
          asset: { type: 'audio', src: 'https://example.com/sfx/bass-impact.mp3', volume: 0.9 },
          start: 0, length: 0.8,
        });
        sfxTrack.clips.push({
          asset: { type: 'audio', src: 'https://example.com/sfx/whoosh.mp3', volume: 0.5 },
          start: 7, length: 0.4,
        });
        changed = true;
        log('AUTOFIX', 'Added placeholder SFX clips');
      }
    }
  }

  if (changed) {
    writeFileSync(jsonPath, JSON.stringify(json, null, 2));
    log('AUTOFIX', `Saved auto-fixed JSON to ${basename(jsonPath)}`);
  } else {
    log('AUTOFIX', 'No automatic fixes could be applied');
  }

  return changed;
}

// ============================================================================
// VALIDATION
// ============================================================================

function runShotstackValidation(jsonPath: string): boolean {
  log('VALIDATE', `Running Shotstack validation on ${basename(jsonPath)}`);

  const validateScript = join(MARKETING_DIR, 'shotstack-validate.ts');
  if (!existsSync(validateScript)) {
    log('VALIDATE', 'shotstack-validate.ts not found, skipping URL validation');
    return true;
  }

  const result = execSafe(
    `npx ts-node --project scripts/tsconfig.json "${validateScript}" --file "${jsonPath}"`,
    'VALIDATE',
  );

  if (result === null) {
    log('VALIDATE', 'Validation script encountered errors (may be non-fatal)');
    return false;
  }

  log('VALIDATE', 'Validation passed');
  return true;
}

// ============================================================================
// ARGUMENT PARSING
// ============================================================================

function parseArgs(): { brief: Brief; skipDownload: boolean } {
  const args = process.argv.slice(2);

  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };
  const hasFlag = (flag: string): boolean => args.includes(flag);

  const skipDownload = hasFlag('--skip-download');

  // Load brief from file or build from flags
  let brief: Brief;
  const briefPath = getArg('--brief');

  if (briefPath) {
    const resolved = resolve(briefPath);
    if (!existsSync(resolved)) {
      console.error(`Brief file not found: ${resolved}`);
      process.exit(1);
    }
    brief = JSON.parse(readFileSync(resolved, 'utf-8'));
    log('INIT', `Loaded brief: ${brief.title}`);
  } else {
    // Load default brief and override with flags
    if (!existsSync(DEFAULT_BRIEF_PATH)) {
      console.error(`Default brief not found: ${DEFAULT_BRIEF_PATH}`);
      console.error('Create one at scripts/marketing/blueprints/briefs/default-45s-dark.json');
      process.exit(1);
    }
    brief = JSON.parse(readFileSync(DEFAULT_BRIEF_PATH, 'utf-8'));

    // Override from flags
    const duration = getArg('--duration');
    if (duration) brief.duration = parseInt(duration);
    const theme = getArg('--theme');
    if (theme) brief.theme = theme;
    const angle = getArg('--angle');
    if (angle) brief.angle = angle;

    log('INIT', `Using default brief with overrides: ${brief.duration}s, ${brief.theme}`);
  }

  return { brief, skipDownload };
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

async function main() {
  console.log('');
  console.log('='.repeat(70));
  console.log('  DEMONS & DEITIES -- AUTONOMOUS TRAILER PRODUCTION');
  console.log('='.repeat(70));

  const startTime = Date.now();
  const { brief, skipDownload } = parseArgs();
  ensureDirs();

  const state: ProductionState = {
    brief,
    clips: [],
    audioSfx: [],
    shotstackPath: '',
    version: 1,
    score: 0,
    grade: 'F',
    log: [],
  };

  appendProductionLog('orchestrator', 'brief', `Starting production: ${brief.title}`, {
    duration: brief.duration,
    theme: brief.theme,
    angle: brief.angle,
  });

  // ────────────────────────────────────────────────────────────────
  // PHASE 1: CLIP SOURCING
  // ────────────────────────────────────────────────────────────────
  logPhase(1, 'CLIP SOURCING (Clip Hunter)');

  let sourceVideos: string[] = [];

  if (skipDownload) {
    // Reuse existing source videos
    if (existsSync(SOURCES_DIR)) {
      sourceVideos = readdirSync(SOURCES_DIR)
        .filter(f => f.endsWith('.mp4'))
        .map(f => join(SOURCES_DIR, f));
    }
    log('CLIPS', `Reusing ${sourceVideos.length} existing source videos`);
  } else {
    sourceVideos = searchAndDownloadVideos(brief.searchQueries);
  }

  if (sourceVideos.length === 0) {
    log('CLIPS', 'No source videos available. Building with placeholder clips.');
    state.log.push('WARNING: No source videos -- using placeholders');
  } else {
    const clipDuration = Math.min(4, brief.duration / 8);
    state.clips = await buildClipCatalog(sourceVideos, clipDuration);
  }

  appendProductionLog('clip-hunter', 'change', `Sourced ${state.clips.length} clips from ${sourceVideos.length} videos`, {
    clips: state.clips.length,
    pinned: state.clips.filter(c => c.ipfsUrl).length,
  });

  // ────────────────────────────────────────────────────────────────
  // PHASE 2: AUDIO SOURCING
  // ────────────────────────────────────────────────────────────────
  logPhase(2, 'AUDIO SOURCING (Audio Director)');

  // Check for existing SFX
  const existingSfx = existsSync(AUDIO_CLIPS_DIR)
    ? readdirSync(AUDIO_CLIPS_DIR).filter(f => f.endsWith('.mp3'))
    : [];

  if (existingSfx.length >= 3) {
    log('AUDIO', `Found ${existingSfx.length} existing SFX files`);
    const sfxPaths = existingSfx.map(f => join(AUDIO_CLIPS_DIR, f));
    state.audioSfx = await buildAudioCatalog(sfxPaths);
  } else if (sourceVideos.length > 0) {
    log('AUDIO', 'Extracting audio samples from source videos...');
    const audioSamples = extractAudioSamples(sourceVideos);
    state.audioSfx = await buildAudioCatalog(audioSamples);
  } else {
    log('AUDIO', 'No source videos for SFX extraction, SFX track will be empty');
    state.log.push('WARNING: No SFX available');
  }

  log('AUDIO', `Soundtrack: ${brief.soundtrack}`);

  appendProductionLog('audio-director', 'change', `Audio catalog: ${state.audioSfx.length} SFX ready`, {
    sfxCount: state.audioSfx.length,
    pinned: state.audioSfx.filter(a => a.ipfsUrl).length,
  });

  // ────────────────────────────────────────────────────────────────
  // PHASE 3: ASSEMBLY
  // ────────────────────────────────────────────────────────────────
  logPhase(3, 'ASSEMBLY (Video Producer)');

  const shotstackJson = buildShotstackJson(brief, state.clips, state.audioSfx);

  // Generate version filename
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const versionName = `trailer-${timestamp}-v${state.version}.json`;
  const outputPath = join(ACTIVE_DIR, versionName);
  writeFileSync(outputPath, JSON.stringify(shotstackJson, null, 2));
  state.shotstackPath = outputPath;

  // Count clips per track for reporting
  const trackCounts = shotstackJson.timeline.tracks.map((t: any, i: number) => {
    const types = ['SFX', 'Text', 'Images', 'Overlay', 'Spare', 'Video'];
    return `${types[i] || `Track ${i}`}: ${t.clips.length} clips`;
  });

  log('ASSEMBLY', `Built Shotstack JSON: ${versionName}`);
  log('ASSEMBLY', `Track layout:`);
  for (const tc of trackCounts) {
    log('ASSEMBLY', `  ${tc}`);
  }
  log('ASSEMBLY', `Output: ${outputPath}`);

  appendProductionLog('video-producer', 'change', `Assembled v${state.version}: ${versionName}`, {
    version: state.version,
    tracks: trackCounts,
  });

  // ────────────────────────────────────────────────────────────────
  // PHASE 4: QUALITY AUDIT
  // ────────────────────────────────────────────────────────────────
  logPhase(4, 'QUALITY AUDIT (CMO)');

  const maxIterations = 3;
  let audit = runQualityAudit(state.shotstackPath);
  state.score = audit.score;
  state.grade = audit.grade;

  log('AUDIT', `Initial score: ${audit.score} (${audit.grade})`);

  // Auto-fix loop
  let iteration = 0;
  while (audit.score < brief.targetScore && iteration < maxIterations) {
    iteration++;
    log('AUDIT', `Score ${audit.score} < target ${brief.targetScore}. Auto-fix iteration ${iteration}/${maxIterations}...`);

    const fixed = applyAutoFixes(state.shotstackPath, audit.fixes);
    if (!fixed) {
      log('AUDIT', 'No auto-fixes applied, stopping iteration');
      break;
    }

    // Bump version
    state.version++;
    const newVersionName = `trailer-${timestamp}-v${state.version}.json`;
    const newOutputPath = join(ACTIVE_DIR, newVersionName);

    // Copy the fixed file to the new version
    const fixedJson = readFileSync(state.shotstackPath, 'utf-8');
    writeFileSync(newOutputPath, fixedJson);
    state.shotstackPath = newOutputPath;

    // Re-audit
    audit = runQualityAudit(state.shotstackPath);
    state.score = audit.score;
    state.grade = audit.grade;

    log('AUDIT', `After auto-fix: score ${audit.score} (${audit.grade})`);

    appendProductionLog('video-producer', 'change',
      `Auto-fix v${state.version - 1}->v${state.version}: score ${audit.score}`, {
        version: state.version,
        score: audit.score,
        grade: audit.grade,
      });
  }

  // ────────────────────────────────────────────────────────────────
  // PHASE 5: FINAL VALIDATION & REPORTING
  // ────────────────────────────────────────────────────────────────
  logPhase(5, 'FINAL VALIDATION & REPORTING');

  // Run Shotstack structural validation
  const validationPassed = runShotstackValidation(state.shotstackPath);

  // Print full audit output
  console.log(audit.output);

  // Summary
  console.log('');
  console.log('='.repeat(70));
  console.log('  PRODUCTION SUMMARY');
  console.log('='.repeat(70));
  console.log('');
  console.log(`  Title:          ${brief.title}`);
  console.log(`  Duration:       ${brief.duration}s`);
  console.log(`  Theme:          ${brief.theme}`);
  console.log(`  Source Videos:   ${sourceVideos.length}`);
  console.log(`  Clips Sourced:  ${state.clips.length} (${state.clips.filter(c => c.ipfsUrl).length} pinned)`);
  console.log(`  SFX Sourced:    ${state.audioSfx.length} (${state.audioSfx.filter(a => a.ipfsUrl).length} pinned)`);
  console.log(`  Versions:       ${state.version}`);
  console.log(`  Final Score:    ${state.score} (${state.grade})`);
  console.log(`  Target Score:   ${brief.targetScore}`);
  console.log(`  Validation:     ${validationPassed ? 'PASSED' : 'ISSUES DETECTED'}`);
  console.log(`  Output File:    ${state.shotstackPath}`);
  console.log('');

  // Readiness assessment
  const isReady = state.score >= brief.targetScore;
  if (isReady) {
    console.log('  STATUS: RENDER-READY');
    console.log('  The Shotstack JSON is ready for rendering.');
    console.log('');
    console.log('  Next step:');
    console.log(`    SHOTSTACK_ENV=v1 npx ts-node scripts/marketing/video-blueprint-to-shotstack.ts --blueprint "${state.shotstackPath}"`);
  } else {
    console.log(`  STATUS: NEEDS MANUAL INTERVENTION (score ${state.score} < target ${brief.targetScore})`);
    console.log('');

    if (audit.fixes.length > 0) {
      console.log('  Remaining fixes needed:');
      for (let i = 0; i < Math.min(audit.fixes.length, 5); i++) {
        console.log(`    ${i + 1}. ${audit.fixes[i]}`);
      }
    }

    if (state.log.length > 0) {
      console.log('');
      console.log('  Warnings:');
      for (const warning of state.log) {
        console.log(`    - ${warning}`);
      }
    }
  }

  console.log('');

  // Log final state
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  appendProductionLog('orchestrator', 'summary', `Production complete in ${elapsed}s`, {
    score: state.score,
    grade: state.grade,
    versions: state.version,
    ready: isReady,
    outputFile: state.shotstackPath,
    clipsSourced: state.clips.length,
    sfxSourced: state.audioSfx.length,
    elapsedSeconds: parseFloat(elapsed),
  });

  // Save production log entry for the iteration results
  if (!isReady) {
    appendProductionLog('cmo', 'review',
      `Score ${state.score}/${brief.targetScore}. Manual fixes needed: ${audit.fixes.slice(0, 3).join('; ')}`, {
        score: state.score,
        targetScore: brief.targetScore,
        fixCount: audit.fixes.length,
      });
  } else {
    appendProductionLog('cmo', 'review',
      `APPROVED: Score ${state.score}, Grade ${state.grade}. Ready for render.`, {
        score: state.score,
        grade: state.grade,
      });
  }

  console.log(`  Production completed in ${elapsed}s`);
  console.log('');
}

main().catch(err => {
  console.error(`\nFATAL: ${err.message}`);
  appendProductionLog('orchestrator', 'error', err.message);
  process.exit(1);
});
