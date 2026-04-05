/**
 * EOA — Clip Extractor
 *
 * Ingest local event recordings (Zoom/camera), extract highlight clips,
 * detect scene changes, and manage a catalog for social media publishing.
 *
 * Adapted from Demons & Deities clip-extractor.ts for EOA event recordings.
 * Input: Zoom recordings, camera footage, speaker sessions
 * Output: 30-60 second highlight clips of best speaker moments
 *
 * Prerequisites: ffmpeg, ffprobe (system-level installs)
 *
 * Usage (run from project root):
 *   TS="npx ts-node --project tsconfig.json"
 *
 *   # Ingest a local recording (registers it in the catalog)
 *   $TS scripts/video/clip-extractor.ts ingest /path/to/zoom-recording.mp4 [--name "event-2024-01"]
 *
 *   # Analyze scene/speaker changes in a recording
 *   $TS scripts/video/clip-extractor.ts analyze scripts/video/recordings/event.mp4
 *
 *   # Extract a single clip
 *   $TS scripts/video/clip-extractor.ts clip scripts/video/recordings/event.mp4 --start 120 --end 165 [--name "key-insight"]
 *
 *   # Extract multiple clips at once
 *   $TS scripts/video/clip-extractor.ts clip-multi scripts/video/recordings/event.mp4 --clips "120:165,300:345,600:650"
 *
 *   # Auto-sample best N clips based on audio energy (speaker moments)
 *   $TS scripts/video/clip-extractor.ts sample scripts/video/recordings/event.mp4 --count 5 --duration 45
 *
 *   # Extract audio from a recording segment
 *   $TS scripts/video/clip-extractor.ts audio-extract scripts/video/recordings/event.mp4 --start 120 --end 165
 *
 *   # List all recordings and clips
 *   $TS scripts/video/clip-extractor.ts catalog
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, copyFileSync } from 'fs';
import { join, basename, extname, resolve } from 'path';

// ─── Directories ──────────────────────────────────────────────────
const ROOT = process.cwd();
const VIDEO_ROOT = join(ROOT, 'scripts', 'video');
const RECORDINGS_DIR = join(VIDEO_ROOT, 'recordings');
const CLIPS_DIR = join(VIDEO_ROOT, 'clips');
const THUMBNAILS_DIR = join(VIDEO_ROOT, 'thumbnails');
const AUDIO_DIR = join(VIDEO_ROOT, 'audio');

const RECORDINGS_CATALOG = join(RECORDINGS_DIR, 'metadata.json');
const CLIPS_CATALOG = join(CLIPS_DIR, 'metadata.json');

// ─── Exec options ─────────────────────────────────────────────────
const EXEC_OPTS = { encoding: 'utf-8' as const, maxBuffer: 50 * 1024 * 1024 };

// ─── Ensure directories exist ─────────────────────────────────────
function ensureDirs() {
  for (const d of [RECORDINGS_DIR, CLIPS_DIR, THUMBNAILS_DIR, AUDIO_DIR]) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }
}

// ─── Catalog types ────────────────────────────────────────────────
interface RecordingEntry {
  filename: string;
  localPath: string;
  eventName?: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  fileSize: number;
  ingestedAt: string;
}

interface ClipEntry {
  filename: string;
  sourcePath: string;
  localPath: string;
  start: number;
  end: number;
  duration: number;
  fileSize: number;
  thumbnailPath?: string;
  createdAt: string;
  label?: string;
}

function loadRecordingsCatalog(): RecordingEntry[] {
  if (existsSync(RECORDINGS_CATALOG)) return JSON.parse(readFileSync(RECORDINGS_CATALOG, 'utf-8'));
  return [];
}
function saveRecordingsCatalog(catalog: RecordingEntry[]) {
  writeFileSync(RECORDINGS_CATALOG, JSON.stringify(catalog, null, 2));
}

function loadClipsCatalog(): ClipEntry[] {
  if (existsSync(CLIPS_CATALOG)) return JSON.parse(readFileSync(CLIPS_CATALOG, 'utf-8'));
  return [];
}
function saveClipsCatalog(catalog: ClipEntry[]) {
  writeFileSync(CLIPS_CATALOG, JSON.stringify(catalog, null, 2));
}

// ─── Helpers ──────────────────────────────────────────────────────
function resolveVideoPath(input: string): string {
  if (existsSync(input)) return resolve(input);
  const fromVideo = join(ROOT, 'scripts', 'video', input);
  if (existsSync(fromVideo)) return fromVideo;
  const fromRecordings = join(RECORDINGS_DIR, input);
  if (existsSync(fromRecordings)) return fromRecordings;
  return resolve(input);
}

function formatSeconds(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = (s % 60).toFixed(1);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getBaseName(filepath: string): string {
  return basename(filepath, extname(filepath));
}

interface ProbeResult {
  duration: number;
  width: number;
  height: number;
  fps: number;
}

function probeVideo(filepath: string): ProbeResult {
  try {
    const raw = execSync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${filepath}"`,
      EXEC_OPTS
    );
    const data = JSON.parse(raw);
    const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
    const duration = parseFloat(data.format?.duration || '0');
    const width = videoStream?.width || 0;
    const height = videoStream?.height || 0;
    let fps = 0;
    if (videoStream?.r_frame_rate) {
      const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
      fps = den ? Math.round((num / den) * 100) / 100 : num;
    }
    return { duration, width, height, fps };
  } catch (err: any) {
    console.error(`  ffprobe failed: ${err.message}`);
    return { duration: 0, width: 0, height: 0, fps: 0 };
  }
}

// ─── 1. Ingest ────────────────────────────────────────────────────
// Registers a local Zoom/camera recording in the catalog.
// Optionally copies it into the recordings/ directory.
function cmdIngest(sourcePath: string, name?: string, copy?: boolean) {
  ensureDirs();
  const absPath = resolve(sourcePath);
  if (!existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  let finalPath = absPath;

  if (copy) {
    const destName = name ? `${name}${extname(absPath)}` : basename(absPath);
    const destPath = join(RECORDINGS_DIR, destName);
    if (absPath !== destPath) {
      console.log(`\nCopying to recordings/: ${destName}`);
      copyFileSync(absPath, destPath);
      finalPath = destPath;
    }
  }

  console.log(`\nIngesting: ${basename(finalPath)}`);

  const info = probeVideo(finalPath);
  const stat = statSync(finalPath);
  console.log(`  Duration: ${formatSeconds(info.duration)}`);
  console.log(`  Resolution: ${info.width}x${info.height}`);
  console.log(`  FPS: ${info.fps}`);
  console.log(`  File size: ${formatBytes(stat.size)}`);

  const catalog = loadRecordingsCatalog();
  const existing = catalog.findIndex(e => e.localPath === finalPath);
  const entry: RecordingEntry = {
    filename: basename(finalPath),
    localPath: finalPath,
    eventName: name,
    duration: info.duration,
    width: info.width,
    height: info.height,
    fps: info.fps,
    fileSize: stat.size,
    ingestedAt: new Date().toISOString(),
  };
  if (existing >= 0) catalog[existing] = entry;
  else catalog.push(entry);
  saveRecordingsCatalog(catalog);

  console.log(`\n  Registered in catalog.`);
  console.log(`\n  Next steps:`);
  console.log(`    Analyze:  npx ts-node scripts/video/clip-extractor.ts analyze "${finalPath}"`);
  console.log(`    AI clips: npx ts-node scripts/video/video-intelligence.ts find-clips "${finalPath}"`);
}

// ─── 2. Analyze ───────────────────────────────────────────────────
// Detects scene/speaker changes using ffmpeg scene filter.
// For event recordings, "scene changes" often correspond to slide transitions
// or speaker switches — useful for identifying clip boundaries.
interface SceneSegment {
  index: number;
  start: number;
  end: number;
  duration: number;
  thumbnail: string;
}

function cmdAnalyze(inputPath: string): SceneSegment[] | undefined {
  ensureDirs();
  const filepath = resolveVideoPath(inputPath);
  if (!existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    return;
  }

  const info = probeVideo(filepath);
  const baseName = getBaseName(filepath);
  console.log(`\nAnalyzing: ${basename(filepath)}`);
  console.log(`  Duration: ${formatSeconds(info.duration)} | ${info.width}x${info.height} @ ${info.fps}fps`);
  console.log(`  Tip: Use video-intelligence.ts for AI-powered speaker moment detection.\n`);

  // Use a lower threshold for event recordings (0.2 vs 0.3 for action trailers)
  // to catch slide transitions and camera switches
  console.log('  Detecting scene/speaker changes (threshold: 0.2)...');
  let sceneOutput: string;
  try {
    sceneOutput = execSync(
      `ffmpeg -i "${filepath}" -filter:v "select='gt(scene,0.2)',showinfo" -f null - 2>&1`,
      EXEC_OPTS
    );
  } catch (err: any) {
    sceneOutput = err.stdout || err.stderr || err.message || '';
  }

  const timestamps: number[] = [0];
  const lines = sceneOutput.split('\n');
  for (const line of lines) {
    const ptsMatch = line.match(/pts_time:([\d.]+)/);
    if (ptsMatch) {
      const t = parseFloat(ptsMatch[1]);
      if (t > 0 && t < info.duration) timestamps.push(t);
    }
  }
  if (info.duration > 0) timestamps.push(info.duration);

  const uniqueTs = [...new Set(timestamps)].sort((a, b) => a - b);

  const segments: SceneSegment[] = [];
  for (let i = 0; i < uniqueTs.length - 1; i++) {
    const start = uniqueTs[i];
    const end = uniqueTs[i + 1];
    const dur = end - start;
    if (dur < 0.5) continue; // skip micro-segments

    const idx = segments.length + 1;
    const thumbName = `${baseName}-scene-${String(idx).padStart(3, '0')}.jpg`;
    const thumbPath = join(THUMBNAILS_DIR, thumbName);

    try {
      execSync(
        `ffmpeg -y -i "${filepath}" -ss ${start.toFixed(3)} -frames:v 1 -q:v 2 "${thumbPath}" 2>/dev/null`,
        EXEC_OPTS
      );
    } catch { /* thumbnail generation is best-effort */ }

    segments.push({ index: idx, start, end, duration: dur, thumbnail: thumbName });
  }

  console.log(`\n  Found ${segments.length} segments:\n`);
  for (const seg of segments) {
    console.log(
      `  Segment ${String(seg.index).padStart(3, ' ')}: ` +
      `${formatSeconds(seg.start)} - ${formatSeconds(seg.end)} ` +
      `(${seg.duration.toFixed(1)}s)`
    );
  }

  // Identify candidate highlight windows (30-60s speaker moments)
  const TARGET_MIN = 30;
  const TARGET_MAX = 60;
  if (info.duration > TARGET_MIN) {
    console.log(`\n  Candidate highlight windows (${TARGET_MIN}-${TARGET_MAX}s):`);

    // Long stable segments = likely sustained speaker moments
    const longSegs = segments.filter(s => s.duration >= TARGET_MIN && s.duration <= TARGET_MAX);
    for (const s of longSegs.slice(0, 5)) {
      console.log(`    [STABLE] ${formatSeconds(s.start)}-${formatSeconds(s.end)} (${s.duration.toFixed(0)}s stable shot)`);
    }

    // Suggest first 60s, middle section, Q&A region (last 25%)
    const thirds = [
      { label: 'Opening', start: 0, end: Math.min(60, info.duration) },
      { label: 'Middle', start: info.duration * 0.4, end: Math.min(info.duration * 0.4 + 60, info.duration) },
      { label: 'Near end', start: info.duration * 0.75, end: Math.min(info.duration * 0.75 + 60, info.duration) },
    ];
    for (const t of thirds) {
      if (t.end - t.start >= TARGET_MIN) {
        console.log(`    [${t.label}] ${formatSeconds(t.start)}-${formatSeconds(t.end)}`);
      }
    }
  }

  console.log(`\n  Thumbnails saved to: ${THUMBNAILS_DIR}`);
  console.log(`\n  Run AI analysis for speaker moment detection:`);
  console.log(`    npx ts-node scripts/video/video-intelligence.ts find-clips "${filepath}"`);

  return segments;
}

// ─── 3. Clip ──────────────────────────────────────────────────────
function cmdClip(inputPath: string, start: number, end: number, name?: string, label?: string): string | null {
  ensureDirs();
  const filepath = resolveVideoPath(inputPath);
  if (!existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    return null;
  }

  const duration = end - start;
  if (duration <= 0) {
    console.error(`Invalid range: start (${start}) must be before end (${end})`);
    return null;
  }

  const baseName = name || `${getBaseName(filepath)}-${Math.round(start)}s-${Math.round(end)}s`;
  const outFile = join(CLIPS_DIR, `${baseName}.mp4`);
  const thumbFile = join(CLIPS_DIR, `${baseName}-thumb.jpg`);

  console.log(`\nExtracting clip: ${formatSeconds(start)} to ${formatSeconds(end)} (${duration.toFixed(1)}s)`);
  console.log(`  Source: ${basename(filepath)}`);
  if (label) console.log(`  Label: ${label}`);

  try {
    // Re-encode for compatibility and clean playback on all social platforms
    execSync(
      `ffmpeg -y -i "${filepath}" -ss ${start} -to ${end} ` +
      `-c:v libx264 -preset fast -crf 20 -c:a aac -b:a 128k ` +
      `-vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ` +
      `-movflags +faststart "${outFile}" 2>/dev/null`,
      EXEC_OPTS
    );

    try {
      execSync(
        `ffmpeg -y -i "${outFile}" -frames:v 1 -q:v 2 "${thumbFile}" 2>/dev/null`,
        EXEC_OPTS
      );
    } catch { /* best-effort */ }

    const stat = statSync(outFile);
    const probe = probeVideo(outFile);
    console.log(`  Output: ${outFile}`);
    console.log(`  Size: ${formatBytes(stat.size)}`);
    console.log(`  Duration: ${formatSeconds(probe.duration)}`);
    console.log(`  Resolution: ${probe.width}x${probe.height}`);

    const catalog = loadClipsCatalog();
    const entry: ClipEntry = {
      filename: `${baseName}.mp4`,
      sourcePath: filepath,
      localPath: outFile,
      start,
      end,
      duration: probe.duration,
      fileSize: stat.size,
      thumbnailPath: existsSync(thumbFile) ? thumbFile : undefined,
      createdAt: new Date().toISOString(),
      label,
    };
    const existing = catalog.findIndex(e => e.localPath === outFile);
    if (existing >= 0) catalog[existing] = entry;
    else catalog.push(entry);
    saveClipsCatalog(catalog);

    console.log(`\n  Clip saved. Use video-intelligence.ts to rate it:`);
    console.log(`    npx ts-node scripts/video/video-intelligence.ts rate "${outFile}"`);

    return outFile;
  } catch (err: any) {
    console.error(`  Clip extraction failed: ${err.message}`);
    return null;
  }
}

// ─── 4. Clip Multi ────────────────────────────────────────────────
function cmdClipMulti(inputPath: string, clipsStr: string, label?: string) {
  const filepath = resolveVideoPath(inputPath);
  if (!existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    return;
  }

  const pairs = clipsStr.split(',').map(p => p.trim()).filter(Boolean);
  if (pairs.length === 0) {
    console.error('No clips specified. Format: --clips "120:180,300:360"');
    return;
  }

  const baseName = getBaseName(filepath);
  console.log(`\nExtracting ${pairs.length} clips from: ${basename(filepath)}\n`);

  const results: string[] = [];
  for (let i = 0; i < pairs.length; i++) {
    const [startStr, endStr] = pairs[i].split(':');
    const start = parseFloat(startStr);
    const end = parseFloat(endStr);
    if (isNaN(start) || isNaN(end)) {
      console.error(`  Skipping invalid pair: "${pairs[i]}"`);
      continue;
    }

    const clipName = `${baseName}-clip-${String(i + 1).padStart(3, '0')}`;
    console.log(`--- Clip ${i + 1}/${pairs.length} ---`);
    const result = cmdClip(inputPath, start, end, clipName, label);
    if (result) results.push(result);
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Extracted ${results.length}/${pairs.length} clips:`);
  for (const r of results) {
    console.log(`    ${basename(r)}`);
  }
}

// ─── 5. Sample ────────────────────────────────────────────────────
// Auto-samples best N clips from a recording using audio energy detection.
// Higher audio energy often = engaged speaker or applause moments.
function cmdSample(inputPath: string, count: number, clipDuration: number) {
  const filepath = resolveVideoPath(inputPath);
  if (!existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    return;
  }

  console.log(`\nAuto-sampling ${count} clips (${clipDuration}s each) from: ${basename(filepath)}`);
  console.log(`  Detecting audio energy levels...`);

  const info = probeVideo(filepath);
  if (info.duration < clipDuration) {
    console.error(`  Recording too short (${formatSeconds(info.duration)}) for ${clipDuration}s clips.`);
    return;
  }

  // Use ffmpeg astats to measure audio loudness across windows
  // We sample at regular intervals and measure mean volume
  interface AudioWindow {
    center: number;
    start: number;
    end: number;
    score: number;
  }

  const windows: AudioWindow[] = [];
  const step = Math.max(5, clipDuration / 4); // sample every N seconds
  const baseName = getBaseName(filepath);

  for (let t = clipDuration / 2; t < info.duration - clipDuration / 2; t += step) {
    const winStart = Math.max(0, t - clipDuration / 2);
    const winEnd = Math.min(info.duration, t + clipDuration / 2);

    try {
      const statsOut = execSync(
        `ffmpeg -y -i "${filepath}" -ss ${winStart} -to ${winEnd} ` +
        `-vn -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level" ` +
        `-f null - 2>&1`,
        EXEC_OPTS
      );

      // Parse mean volume — higher = more speech/applause energy
      const rmsMatch = statsOut.match(/RMS_level=(-?[\d.]+)/);
      const rms = rmsMatch ? parseFloat(rmsMatch[1]) : -60;
      // Normalize: -20 dB = loud, -60 dB = silent. Score 0-10.
      const score = Math.max(0, Math.min(10, (rms + 60) / 4));

      windows.push({ center: t, start: winStart, end: winEnd, score });
    } catch {
      windows.push({ center: t, start: winStart, end: winEnd, score: 0 });
    }
  }

  // Sort by audio energy score
  windows.sort((a, b) => b.score - a.score);

  // Pick top N non-overlapping windows
  const selected: AudioWindow[] = [];
  for (const w of windows) {
    if (selected.length >= count) break;
    const overlaps = selected.some(s => w.start < s.end && w.end > s.start);
    if (!overlaps) selected.push(w);
  }
  selected.sort((a, b) => a.start - b.start);

  if (selected.length === 0) {
    console.log('  No candidate windows found. Try a shorter --duration or use AI analysis.');
    return;
  }

  console.log(`\n  Selected ${selected.length} high-energy windows:\n`);
  const results: string[] = [];

  for (let i = 0; i < selected.length; i++) {
    const w = selected[i];
    const clipName = `${baseName}-highlight-${String(i + 1).padStart(3, '0')}`;
    console.log(`--- Highlight ${i + 1}/${selected.length} (audio score: ${w.score.toFixed(1)}/10) ---`);
    const result = cmdClip(inputPath, w.start, w.end, clipName, 'auto-sampled');
    if (result) results.push(result);
  }

  console.log(`\n=== Sampling Complete ===`);
  console.log(`  Extracted ${results.length} clips from highest-energy speaker moments.`);
  console.log(`\n  Run AI analysis for better results:`);
  console.log(`    npx ts-node scripts/video/video-intelligence.ts find-clips "${filepath}"`);
}

// ─── 6. Audio Extract ─────────────────────────────────────────────
function cmdAudioExtract(inputPath: string, start?: number, end?: number) {
  ensureDirs();
  const filepath = resolveVideoPath(inputPath);
  if (!existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    return;
  }

  const info = probeVideo(filepath);
  const actualStart = start ?? 0;
  const actualEnd = end ?? info.duration;
  const baseName = getBaseName(filepath);
  const suffix = (start !== undefined || end !== undefined)
    ? `-${Math.round(actualStart)}s-${Math.round(actualEnd)}s`
    : '';
  const outFile = join(AUDIO_DIR, `${baseName}${suffix}.mp3`);

  console.log(`\nExtracting audio: ${formatSeconds(actualStart)} to ${formatSeconds(actualEnd)}`);
  console.log(`  Source: ${basename(filepath)}`);

  try {
    execSync(
      `ffmpeg -y -i "${filepath}" -ss ${actualStart} -to ${actualEnd} ` +
      `-vn -c:a libmp3lame -q:a 2 "${outFile}" 2>/dev/null`,
      EXEC_OPTS
    );

    const stat = statSync(outFile);
    console.log(`  Output: ${outFile}`);
    console.log(`  Size: ${formatBytes(stat.size)}`);
  } catch (err: any) {
    console.error(`  Audio extraction failed: ${err.message}`);
  }
}

// ─── 7. Catalog ───────────────────────────────────────────────────
function cmdCatalog() {
  ensureDirs();
  const recordings = loadRecordingsCatalog();
  const clips = loadClipsCatalog();

  console.log('\n=== EOA Video Catalog ===\n');

  console.log(`--- Recordings (${recordings.length}) ---`);
  if (recordings.length === 0) {
    console.log('  No recordings ingested yet.');
    console.log('  Ingest one: npx ts-node scripts/video/clip-extractor.ts ingest /path/to/zoom.mp4');
  } else {
    for (const r of recordings) {
      const exists = existsSync(r.localPath) ? '' : ' [MISSING]';
      console.log(`  ${r.eventName || r.filename}${exists}`);
      console.log(`    ${r.width}x${r.height} | ${formatSeconds(r.duration)} | ${formatBytes(r.fileSize)}`);
      console.log(`    Path: ${r.localPath}`);
      console.log('');
    }
  }

  console.log(`\n--- Clips (${clips.length}) ---`);
  if (clips.length === 0) {
    console.log('  No clips extracted yet.');
  } else {
    for (const c of clips) {
      const exists = existsSync(c.localPath) ? '' : ' [MISSING]';
      const label = c.label ? ` [${c.label}]` : '';
      console.log(`  ${c.filename}${exists}${label}`);
      console.log(`    ${formatSeconds(c.start)}-${formatSeconds(c.end)} | ${formatSeconds(c.duration)} | ${formatBytes(c.fileSize)}`);
      console.log('');
    }
  }
}

// ─── Arg parsing helpers ──────────────────────────────────────────
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

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

// ─── Main ─────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd) {
    console.log('EOA Clip Extractor — Ingest event recordings and extract speaker highlight clips\n');
    console.log('Commands:');
    console.log('  ingest <file> [--name <name>] [--copy]          Register a Zoom/camera recording');
    console.log('  analyze <file>                                   Detect scene/speaker changes');
    console.log('  clip <file> --start N --end N [--name <n>]      Extract a time range (seconds)');
    console.log('  clip-multi <file> --clips "s:e,s:e,..."         Extract multiple clips');
    console.log('  sample <file> [--count N] [--duration N]        Auto-extract by audio energy');
    console.log('  audio-extract <file> [--start N] [--end N]      Extract audio as MP3');
    console.log('  catalog                                          List all recordings and clips');
    console.log('\nFor AI-powered speaker moment detection:');
    console.log('  npx ts-node scripts/video/video-intelligence.ts find-clips <file>');
    return;
  }

  switch (cmd) {
    case 'ingest': {
      const file = args[1];
      if (!file) { console.error('Usage: ingest <file> [--name <name>] [--copy]'); return; }
      const name = getFlag(args, '--name');
      const copy = hasFlag(args, '--copy');
      cmdIngest(file, name, copy);
      break;
    }

    case 'analyze': {
      const file = args[1];
      if (!file) { console.error('Usage: analyze <file>'); return; }
      cmdAnalyze(file);
      break;
    }

    case 'clip': {
      const file = args[1];
      const start = getFlagNum(args, '--start');
      const end = getFlagNum(args, '--end');
      if (!file || start === undefined || end === undefined) {
        console.error('Usage: clip <file> --start N --end N [--name <name>]');
        return;
      }
      const name = getFlag(args, '--name');
      const label = getFlag(args, '--label');
      cmdClip(file, start, end, name, label);
      break;
    }

    case 'clip-multi': {
      const file = args[1];
      const clips = getFlag(args, '--clips');
      if (!file || !clips) {
        console.error('Usage: clip-multi <file> --clips "120:180,300:360"');
        return;
      }
      const label = getFlag(args, '--label');
      cmdClipMulti(file, clips, label);
      break;
    }

    case 'sample': {
      const file = args[1];
      if (!file) { console.error('Usage: sample <file> [--count N] [--duration N]'); return; }
      const count = getFlagNum(args, '--count') ?? 5;
      const duration = getFlagNum(args, '--duration') ?? 45;
      cmdSample(file, count, duration);
      break;
    }

    case 'audio-extract': {
      const file = args[1];
      if (!file) { console.error('Usage: audio-extract <file> [--start N] [--end N]'); return; }
      const start = getFlagNum(args, '--start');
      const end = getFlagNum(args, '--end');
      cmdAudioExtract(file, start, end);
      break;
    }

    case 'catalog': {
      cmdCatalog();
      break;
    }

    default:
      console.error(`Unknown command: ${cmd}`);
      console.log('Run without arguments for usage info.');
  }
}

main();
