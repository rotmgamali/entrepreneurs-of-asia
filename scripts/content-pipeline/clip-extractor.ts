/**
 * Demons & Deities -- Clip Extractor
 *
 * Download videos from YouTube (or any yt-dlp source), extract clips,
 * analyze scene changes, and pin to IPFS for Shotstack trailers.
 *
 * Prerequisites: yt-dlp, ffmpeg, ffprobe (system-level installs)
 *
 * Usage (run from project root):
 *   TSNODE="npx ts-node --project scripts/tsconfig.json"
 *
 *   # Download a video
 *   $TSNODE scripts/marketing/clip-extractor.ts download "https://youtube.com/watch?v=..." [--name "tft-trailer"]
 *
 *   # Analyze scene changes
 *   $TSNODE scripts/marketing/clip-extractor.ts analyze clips/sources/tft-trailer.mp4
 *
 *   # Extract a single clip
 *   $TSNODE scripts/marketing/clip-extractor.ts clip clips/sources/tft-trailer.mp4 --start 12.5 --end 17.0 [--name "epic-combat"]
 *
 *   # Extract multiple clips at once
 *   $TSNODE scripts/marketing/clip-extractor.ts clip-multi clips/sources/tft-trailer.mp4 --clips "0:2.5,12.5:17,23:26.5"
 *
 *   # Pin a clip to IPFS
 *   $TSNODE scripts/marketing/clip-extractor.ts pin clips/extracted/epic-combat.mp4
 *
 *   # Auto-sample best N clips from a video
 *   $TSNODE scripts/marketing/clip-extractor.ts sample clips/sources/tft-trailer.mp4 --count 5 --duration 3
 *
 *   # Extract audio from a video
 *   $TSNODE scripts/marketing/clip-extractor.ts audio-extract clips/sources/trailer.mp4 --start 5 --end 15
 *
 *   # List all sources and clips
 *   $TSNODE scripts/marketing/clip-extractor.ts catalog
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join, basename, extname } from 'path';

// ─── Directories ──────────────────────────────────────────────────
const ROOT = process.cwd();
const CLIPS_ROOT = join(ROOT, 'scripts', 'marketing', 'clips');
const SOURCES_DIR = join(CLIPS_ROOT, 'sources');
const EXTRACTED_DIR = join(CLIPS_ROOT, 'extracted');
const THUMBNAILS_DIR = join(CLIPS_ROOT, 'thumbnails');
const AUDIO_DIR = join(CLIPS_ROOT, 'audio');

const SOURCES_CATALOG = join(SOURCES_DIR, 'metadata.json');
const EXTRACTED_CATALOG = join(EXTRACTED_DIR, 'metadata.json');

// ─── API keys ─────────────────────────────────────────────────────
const PINATA_KEY = process.env.PINATA_API_KEY || 'd664670f2c35f6686ff4';
const PINATA_SECRET = 'fc45f5ab48b5904cac0e3efe472bddd64228504a8bc0891eaa0dedd0da53206a';

// ─── Exec options ─────────────────────────────────────────────────
const EXEC_OPTS = { encoding: 'utf-8' as const, maxBuffer: 50 * 1024 * 1024 };

// ─── Ensure all directories exist ─────────────────────────────────
function ensureDirs() {
  for (const d of [SOURCES_DIR, EXTRACTED_DIR, THUMBNAILS_DIR, AUDIO_DIR]) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }
}

// ─── Catalog types ────────────────────────────────────────────────
interface SourceEntry {
  filename: string;
  url?: string;
  localPath: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  fileSize: number;
  downloadedAt: string;
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
  ipfsUrl?: string;
  createdAt: string;
}

function loadSourcesCatalog(): SourceEntry[] {
  if (existsSync(SOURCES_CATALOG)) return JSON.parse(readFileSync(SOURCES_CATALOG, 'utf-8'));
  return [];
}
function saveSourcesCatalog(catalog: SourceEntry[]) {
  writeFileSync(SOURCES_CATALOG, JSON.stringify(catalog, null, 2));
}

function loadExtractedCatalog(): ClipEntry[] {
  if (existsSync(EXTRACTED_CATALOG)) return JSON.parse(readFileSync(EXTRACTED_CATALOG, 'utf-8'));
  return [];
}
function saveExtractedCatalog(catalog: ClipEntry[]) {
  writeFileSync(EXTRACTED_CATALOG, JSON.stringify(catalog, null, 2));
}

// ─── Helpers ──────────────────────────────────────────────────────
function resolveClipPath(input: string): string {
  // Allow paths relative to scripts/marketing/ or absolute
  if (existsSync(input)) return input;
  const fromMarketing = join(ROOT, 'scripts', 'marketing', input);
  if (existsSync(fromMarketing)) return fromMarketing;
  const fromRoot = join(ROOT, input);
  if (existsSync(fromRoot)) return fromRoot;
  return input; // return as-is, will fail with a clear message later
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

// ─── 1. Download ──────────────────────────────────────────────────
function cmdDownload(url: string, name?: string) {
  ensureDirs();
  console.log(`\nDownloading: ${url}`);

  const outputTemplate = name
    ? join(SOURCES_DIR, `${name}.mp4`)
    : join(SOURCES_DIR, '%(title)s.%(ext)s');

  const cmd = [
    'yt-dlp',
    '--no-check-certificates',
    '--js-runtimes', 'node',
    '--remote-components', 'ejs:github',
    '-f', '"bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]"',
    '--merge-output-format', 'mp4',
    '--no-playlist',
    '-o', `"${outputTemplate}"`,
    `"${url}"`,
  ].join(' ');

  try {
    console.log(`  Running yt-dlp...`);
    const output = execSync(cmd, { ...EXEC_OPTS, stdio: ['pipe', 'pipe', 'pipe'] });

    // Find the actual output file
    let filepath: string;
    if (name) {
      filepath = join(SOURCES_DIR, `${name}.mp4`);
    } else {
      // Parse yt-dlp output to find the merged/downloaded filename
      const destMatch = output.match(/Merging formats into "([^"]+)"/);
      const dlMatch = output.match(/\[download\] Destination: (.+\.mp4)/);
      const alreadyMatch = output.match(/\[download\] (.+\.mp4) has already been downloaded/);
      if (destMatch) filepath = destMatch[1];
      else if (dlMatch) filepath = dlMatch[1];
      else if (alreadyMatch) filepath = alreadyMatch[1];
      else {
        // Fallback: find most recent mp4 in sources
        const files = execSync(`ls -t "${SOURCES_DIR}"/*.mp4 2>/dev/null || true`, EXEC_OPTS).trim().split('\n');
        filepath = files[0] || '';
      }
    }

    if (!filepath || !existsSync(filepath)) {
      console.error('  Could not find downloaded file. Check sources/ directory.');
      return;
    }

    console.log(`  Saved: ${filepath}`);

    // Probe for metadata
    const info = probeVideo(filepath);
    const stat = statSync(filepath);
    console.log(`  Duration: ${formatSeconds(info.duration)}`);
    console.log(`  Resolution: ${info.width}x${info.height}`);
    console.log(`  FPS: ${info.fps}`);
    console.log(`  File size: ${formatBytes(stat.size)}`);

    // Update catalog
    const catalog = loadSourcesCatalog();
    const existing = catalog.findIndex(e => e.localPath === filepath);
    const entry: SourceEntry = {
      filename: basename(filepath),
      url,
      localPath: filepath,
      duration: info.duration,
      width: info.width,
      height: info.height,
      fps: info.fps,
      fileSize: stat.size,
      downloadedAt: new Date().toISOString(),
    };
    if (existing >= 0) catalog[existing] = entry;
    else catalog.push(entry);
    saveSourcesCatalog(catalog);

    console.log(`\n  Next steps:`);
    console.log(`    Analyze:  npx ts-node scripts/marketing/clip-extractor.ts analyze "${filepath}"`);
    console.log(`    Clip:     npx ts-node scripts/marketing/clip-extractor.ts clip "${filepath}" --start 0 --end 5`);
  } catch (err: any) {
    console.error(`  Download failed. Make sure yt-dlp is installed.`);
    console.error(`  Error: ${err.stderr?.slice(0, 500) || err.message}`);
  }
}

// ─── 2. Analyze ───────────────────────────────────────────────────
interface SceneSegment {
  index: number;
  start: number;
  end: number;
  duration: number;
  thumbnail: string;
}

function cmdAnalyze(inputPath: string) {
  ensureDirs();
  const filepath = resolveClipPath(inputPath);
  if (!existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    return;
  }

  const info = probeVideo(filepath);
  const baseName = getBaseName(filepath);
  console.log(`\nAnalyzing: ${basename(filepath)}`);
  console.log(`  Duration: ${formatSeconds(info.duration)} | ${info.width}x${info.height} @ ${info.fps}fps\n`);

  // Scene detection
  console.log('  Detecting scene changes...');
  let sceneOutput: string;
  try {
    sceneOutput = execSync(
      `ffmpeg -i "${filepath}" -filter:v "select='gt(scene,0.3)',showinfo" -f null - 2>&1`,
      EXEC_OPTS
    );
  } catch (err: any) {
    // ffmpeg writes to stderr even on success, execSync may throw
    sceneOutput = err.stdout || err.stderr || err.message || '';
  }

  // Parse scene change timestamps from showinfo output
  const timestamps: number[] = [0]; // always start at 0
  const lines = sceneOutput.split('\n');
  for (const line of lines) {
    const ptsMatch = line.match(/pts_time:([\d.]+)/);
    if (ptsMatch) {
      const t = parseFloat(ptsMatch[1]);
      if (t > 0 && t < info.duration) timestamps.push(t);
    }
  }
  // Add final timestamp
  if (info.duration > 0) timestamps.push(info.duration);

  // Deduplicate and sort
  const uniqueTs = [...new Set(timestamps)].sort((a, b) => a - b);

  // Build segments
  const segments: SceneSegment[] = [];
  for (let i = 0; i < uniqueTs.length - 1; i++) {
    const start = uniqueTs[i];
    const end = uniqueTs[i + 1];
    const dur = end - start;
    if (dur < 0.05) continue; // skip micro-segments

    const idx = segments.length + 1;
    const thumbName = `${baseName}-scene-${String(idx).padStart(3, '0')}.jpg`;
    const thumbPath = join(THUMBNAILS_DIR, thumbName);

    // Generate thumbnail
    try {
      execSync(
        `ffmpeg -y -i "${filepath}" -ss ${start.toFixed(3)} -frames:v 1 -q:v 2 "${thumbPath}" 2>/dev/null`,
        EXEC_OPTS
      );
    } catch { /* thumbnail generation is best-effort */ }

    segments.push({
      index: idx,
      start,
      end,
      duration: dur,
      thumbnail: thumbName,
    });
  }

  // Print segments
  console.log(`\n  Found ${segments.length} scenes:\n`);
  for (const seg of segments) {
    console.log(
      `  Scene ${String(seg.index).padStart(3, ' ')}: ` +
      `${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s ` +
      `(${seg.duration.toFixed(1)}s) ` +
      `-- thumbnail: ${seg.thumbnail}`
    );
  }

  // Find interesting moments
  if (segments.length >= 3) {
    console.log('\n  Best moments for clips:');

    // High energy: windows with most scene changes (rapid cuts)
    const windowSize = 5; // seconds
    let bestDensity = 0;
    let bestDensityStart = 0;
    for (let t = 0; t < info.duration - windowSize; t += 0.5) {
      const count = uniqueTs.filter(ts => ts >= t && ts <= t + windowSize).length;
      if (count > bestDensity) {
        bestDensity = count;
        bestDensityStart = t;
      }
    }
    if (bestDensity > 2) {
      console.log(
        `    - High energy: ${bestDensityStart.toFixed(1)}s-${(bestDensityStart + windowSize).toFixed(1)}s ` +
        `(${bestDensity} scene changes in ${windowSize}s -- rapid cuts)`
      );
    }

    // Dramatic pause: longest single segment (static shot)
    const longest = segments.reduce((a, b) => a.duration > b.duration ? a : b);
    if (longest.duration > 2) {
      console.log(
        `    - Dramatic pause: ${longest.start.toFixed(1)}s-${longest.end.toFixed(1)}s ` +
        `(${longest.duration.toFixed(1)}s static shot)`
      );
    }

    // Short punchy: shortest segments (quick cuts)
    const shortest = [...segments].sort((a, b) => a.duration - b.duration).slice(0, 3);
    const shortRange = shortest.length
      ? `${Math.min(...shortest.map(s => s.start)).toFixed(1)}s area`
      : '';
    if (shortRange) {
      console.log(`    - Quick cuts: around ${shortRange} (${shortest.length} sub-second cuts)`);
    }
  }

  console.log(`\n  Thumbnails saved to: ${THUMBNAILS_DIR}`);
  console.log(`\n  Extract a clip:`);
  if (segments.length > 1) {
    const sample = segments[Math.min(1, segments.length - 1)];
    console.log(
      `    npx ts-node scripts/marketing/clip-extractor.ts clip "${filepath}" ` +
      `--start ${sample.start.toFixed(1)} --end ${sample.end.toFixed(1)}`
    );
  }

  return segments;
}

// ─── 3. Clip ──────────────────────────────────────────────────────
function cmdClip(inputPath: string, start: number, end: number, name?: string): string | null {
  ensureDirs();
  const filepath = resolveClipPath(inputPath);
  if (!existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    return null;
  }

  const duration = end - start;
  if (duration <= 0) {
    console.error(`Invalid range: start (${start}) must be before end (${end})`);
    return null;
  }

  const baseName = name || `${getBaseName(filepath)}-${start.toFixed(1)}s-${end.toFixed(1)}s`;
  const outFile = join(EXTRACTED_DIR, `${baseName}.mp4`);
  const thumbFile = join(EXTRACTED_DIR, `${baseName}-thumb.jpg`);

  console.log(`\nExtracting clip: ${start}s to ${end}s (${duration.toFixed(1)}s)`);
  console.log(`  Source: ${basename(filepath)}`);

  try {
    // Extract clip
    execSync(
      `ffmpeg -y -i "${filepath}" -ss ${start} -to ${end} ` +
      `-c:v libx264 -preset fast -crf 18 -c:a aac -b:a 128k ` +
      `-movflags +faststart "${outFile}" 2>/dev/null`,
      EXEC_OPTS
    );

    // Generate thumbnail of first frame
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

    // Add to catalog
    const catalog = loadExtractedCatalog();
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
    };
    const existing = catalog.findIndex(e => e.localPath === outFile);
    if (existing >= 0) catalog[existing] = entry;
    else catalog.push(entry);
    saveExtractedCatalog(catalog);

    console.log(`\n  Next steps:`);
    console.log(`    Pin to IPFS:  npx ts-node scripts/marketing/clip-extractor.ts pin "${outFile}"`);
    console.log(`    Add to trailer: use the IPFS URL in your Shotstack JSON`);

    return outFile;
  } catch (err: any) {
    console.error(`  Clip extraction failed: ${err.message}`);
    return null;
  }
}

// ─── 4. Clip Multi ────────────────────────────────────────────────
function cmdClipMulti(inputPath: string, clipsStr: string) {
  const filepath = resolveClipPath(inputPath);
  if (!existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    return;
  }

  const pairs = clipsStr.split(',').map(p => p.trim()).filter(Boolean);
  if (pairs.length === 0) {
    console.error('No clips specified. Format: --clips "0:2.5,12.5:17,23:26.5"');
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
    const result = cmdClip(inputPath, start, end, clipName);
    if (result) results.push(result);
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Extracted ${results.length}/${pairs.length} clips:`);
  for (const r of results) {
    console.log(`    ${basename(r)}`);
  }
}

// ─── 5. Pin ───────────────────────────────────────────────────────
async function cmdPin(inputPath: string) {
  const filepath = resolveClipPath(inputPath);
  if (!existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    return;
  }

  const name = basename(filepath);
  const stat = statSync(filepath);
  console.log(`\nPinning to IPFS: ${name} (${formatBytes(stat.size)})`);

  const fileData = readFileSync(filepath);
  const blob = new Blob([fileData]);

  const formData = new FormData();
  formData.append('file', blob, name);
  formData.append('pinataMetadata', JSON.stringify({ name: `dd-clip-${name}` }));
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
      console.error(`  Pinata error (${res.status}): ${await res.text()}`);
      return;
    }

    const data = await res.json() as any;
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
    console.log(`  Pinned successfully!`);
    console.log(`  IPFS Hash: ${data.IpfsHash}`);
    console.log(`  Gateway URL: ${gatewayUrl}`);

    // Update extracted catalog
    const catalog = loadExtractedCatalog();
    const entry = catalog.find(e => e.localPath === filepath || e.filename === name);
    if (entry) {
      entry.ipfsUrl = gatewayUrl;
      saveExtractedCatalog(catalog);
      console.log(`  Catalog updated.`);
    }

    console.log(`\n  Use in Shotstack JSON:`);
    console.log(`    "src": "${gatewayUrl}"`);
  } catch (err: any) {
    console.error(`  Pin failed: ${err.message}`);
  }
}

// ─── 6. Sample ────────────────────────────────────────────────────
function cmdSample(inputPath: string, count: number, clipDuration: number) {
  const filepath = resolveClipPath(inputPath);
  if (!existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    return;
  }

  console.log(`\nAuto-sampling ${count} best clips (${clipDuration}s each) from: ${basename(filepath)}`);

  // Run scene detection
  const segments = cmdAnalyze(inputPath);
  if (!segments || segments.length < 2) {
    console.log('\n  Not enough scene data to auto-sample. Try manual clipping.');
    return;
  }

  const info = probeVideo(filepath);

  // Score each possible window by scene change density
  interface ScoredMoment {
    center: number;
    start: number;
    end: number;
    score: number;
  }

  const sceneTimestamps = segments.map(s => s.start);
  const moments: ScoredMoment[] = [];
  const step = 0.5;

  for (let t = clipDuration / 2; t < info.duration - clipDuration / 2; t += step) {
    const winStart = t - clipDuration / 2;
    const winEnd = t + clipDuration / 2;
    const changesInWindow = sceneTimestamps.filter(ts => ts >= winStart && ts <= winEnd).length;
    moments.push({ center: t, start: winStart, end: winEnd, score: changesInWindow });
  }

  // Sort by score descending
  moments.sort((a, b) => b.score - a.score);

  // Pick top N non-overlapping moments
  const selected: ScoredMoment[] = [];
  for (const m of moments) {
    if (selected.length >= count) break;
    const overlaps = selected.some(
      s => m.start < s.end && m.end > s.start
    );
    if (!overlaps) selected.push(m);
  }

  // Sort selected by time order
  selected.sort((a, b) => a.start - b.start);

  if (selected.length === 0) {
    console.log('\n  Could not find distinct moments. Try a shorter --duration.');
    return;
  }

  console.log(`\n  Selected ${selected.length} moments:\n`);
  const baseName = getBaseName(filepath);
  const results: string[] = [];

  for (let i = 0; i < selected.length; i++) {
    const m = selected[i];
    const clipName = `${baseName}-sample-${String(i + 1).padStart(3, '0')}`;
    console.log(`--- Sample ${i + 1}/${selected.length} (score: ${m.score} scene changes) ---`);
    const result = cmdClip(inputPath, m.start, m.end, clipName);
    if (result) results.push(result);
  }

  console.log(`\n=== Sampling Complete ===`);
  console.log(`  Extracted ${results.length} clips from the most visually dynamic moments.`);
}

// ─── 7. Catalog ───────────────────────────────────────────────────
function cmdCatalog() {
  ensureDirs();

  const sources = loadSourcesCatalog();
  const clips = loadExtractedCatalog();

  console.log('\n=== Clip Extractor Catalog ===\n');

  // Sources
  console.log(`--- Source Videos (${sources.length}) ---`);
  if (sources.length === 0) {
    console.log('  No source videos downloaded yet.');
    console.log('  Download one: npx ts-node scripts/marketing/clip-extractor.ts download "https://..."');
  } else {
    for (const s of sources) {
      const exists = existsSync(s.localPath) ? '' : ' [MISSING]';
      console.log(`  ${s.filename}${exists}`);
      console.log(`    ${s.width}x${s.height} | ${formatSeconds(s.duration)} | ${formatBytes(s.fileSize)}`);
      if (s.url) console.log(`    URL: ${s.url}`);
      console.log('');
    }
  }

  // Extracted clips
  console.log(`\n--- Extracted Clips (${clips.length}) ---`);
  if (clips.length === 0) {
    console.log('  No clips extracted yet.');
  } else {
    let pinnedCount = 0;
    for (const c of clips) {
      const pinned = c.ipfsUrl ? '[PINNED]' : '[LOCAL]';
      if (c.ipfsUrl) pinnedCount++;
      const exists = existsSync(c.localPath) ? '' : ' [MISSING]';
      console.log(`  ${pinned} ${c.filename}${exists}`);
      console.log(`    ${c.start.toFixed(1)}s-${c.end.toFixed(1)}s | ${formatSeconds(c.duration)} | ${formatBytes(c.fileSize)}`);
      if (c.ipfsUrl) console.log(`    IPFS: ${c.ipfsUrl}`);
      console.log('');
    }
    console.log(`  Ready for Shotstack: ${pinnedCount}/${clips.length} pinned to IPFS`);
  }
}

// ─── 8. Audio Extract ─────────────────────────────────────────────
function cmdAudioExtract(inputPath: string, start?: number, end?: number) {
  ensureDirs();
  const filepath = resolveClipPath(inputPath);
  if (!existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    return;
  }

  const baseName = getBaseName(filepath);
  const info = probeVideo(filepath);
  const actualStart = start ?? 0;
  const actualEnd = end ?? info.duration;
  const duration = actualEnd - actualStart;

  const suffix = (start !== undefined || end !== undefined)
    ? `-${actualStart.toFixed(0)}s-${actualEnd.toFixed(0)}s`
    : '';
  const outFile = join(AUDIO_DIR, `${baseName}${suffix}.mp3`);

  console.log(`\nExtracting audio: ${actualStart}s to ${actualEnd}s (${duration.toFixed(1)}s)`);
  console.log(`  Source: ${basename(filepath)}`);

  try {
    const timeArgs = [
      `-ss ${actualStart}`,
      `-to ${actualEnd}`,
    ].join(' ');

    execSync(
      `ffmpeg -y -i "${filepath}" ${timeArgs} -vn -c:a libmp3lame -q:a 2 "${outFile}" 2>/dev/null`,
      EXEC_OPTS
    );

    const stat = statSync(outFile);
    console.log(`  Output: ${outFile}`);
    console.log(`  Size: ${formatBytes(stat.size)}`);
    console.log(`  Duration: ${formatSeconds(duration)}`);

    console.log(`\n  Next steps:`);
    console.log(`    Pin: npx ts-node scripts/marketing/clip-extractor.ts pin "${outFile}"`);
    console.log(`    Use as background music or SFX in Shotstack JSON`);
  } catch (err: any) {
    console.error(`  Audio extraction failed: ${err.message}`);
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

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd) {
    console.log('Clip Extractor -- Download, analyze, and clip videos for Shotstack trailers\n');
    console.log('Commands:');
    console.log('  download <url> [--name <name>]                         Download a video via yt-dlp');
    console.log('  analyze <file>                                         Detect scene changes + thumbnails');
    console.log('  clip <file> --start N --end N [--name <name>]          Extract a time range');
    console.log('  clip-multi <file> --clips "s:e,s:e,..."               Extract multiple clips');
    console.log('  pin <file>                                             Pin to IPFS via Pinata');
    console.log('  sample <file> [--count N] [--duration N]               Auto-extract best N clips');
    console.log('  catalog                                                List all sources + clips');
    console.log('  audio-extract <file> [--start N] [--end N]             Extract audio as MP3');
    return;
  }

  switch (cmd) {
    case 'download': {
      const url = args[1];
      if (!url) { console.error('Usage: download <url> [--name <name>]'); return; }
      const name = getFlag(args, '--name');
      cmdDownload(url, name);
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
      cmdClip(file, start, end, name);
      break;
    }

    case 'clip-multi': {
      const file = args[1];
      const clips = getFlag(args, '--clips');
      if (!file || !clips) {
        console.error('Usage: clip-multi <file> --clips "0:2.5,12.5:17,23:26.5"');
        return;
      }
      cmdClipMulti(file, clips);
      break;
    }

    case 'pin': {
      const file = args[1];
      if (!file) { console.error('Usage: pin <file>'); return; }
      await cmdPin(file);
      break;
    }

    case 'sample': {
      const file = args[1];
      if (!file) { console.error('Usage: sample <file> [--count N] [--duration N]'); return; }
      const count = getFlagNum(args, '--count') ?? 5;
      const duration = getFlagNum(args, '--duration') ?? 3;
      cmdSample(file, count, duration);
      break;
    }

    case 'catalog': {
      cmdCatalog();
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

    default:
      console.error(`Unknown command: ${cmd}`);
      console.log('Run without arguments for usage info.');
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
