/**
 * EOA — Audio Pipeline
 *
 * Audio extraction, normalization, and enhancement for event recording clips.
 * Prepares audio tracks for social media posting — clean speech levels,
 * optional background music mixing, and platform-ready exports.
 *
 * Adapted from Demons & Deities audio-pipeline.ts for EOA event recordings.
 * Removed: Pixabay music search, ElevenLabs voiceover, Shotstack, IPFS.
 * Added: speech normalization, noise reduction hints, background music mixing.
 *
 * Prerequisites: ffmpeg (system install)
 *
 * Usage (run from project root):
 *   TS="npx ts-node --project tsconfig.json"
 *
 *   # Extract audio from a clip as MP3
 *   $TS scripts/video/audio-pipeline.ts extract clips/highlight-001.mp4
 *
 *   # Normalize audio loudness to social media standard (-16 LUFS)
 *   $TS scripts/video/audio-pipeline.ts normalize clips/highlight-001.mp4
 *
 *   # Apply normalized audio back to a video clip
 *   $TS scripts/video/audio-pipeline.ts normalize-video clips/highlight-001.mp4
 *
 *   # Mix background music into a clip (lower music under speech)
 *   $TS scripts/video/audio-pipeline.ts mix-music clips/highlight-001.mp4 --music /path/to/track.mp3 [--level 0.15]
 *
 *   # Batch normalize all clips in the clips directory
 *   $TS scripts/video/audio-pipeline.ts batch-normalize
 *
 *   # Get audio stats for a file
 *   $TS scripts/video/audio-pipeline.ts stats clips/highlight-001.mp4
 */

import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join, basename, extname, resolve, dirname } from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const VIDEO_ROOT = join(ROOT, 'scripts', 'video');
const CLIPS_DIR = join(VIDEO_ROOT, 'clips');
const AUDIO_DIR = join(VIDEO_ROOT, 'audio');

const EXEC_OPTS = { encoding: 'utf-8' as const, maxBuffer: 50 * 1024 * 1024 };

// ─── Social media audio standards ────────────────────────────────
// YouTube/Instagram/Facebook: -14 LUFS integrated
// LinkedIn: -16 LUFS integrated
// Twitter: -13 LUFS integrated
// We target -16 LUFS (conservative, works across all platforms)
const TARGET_LUFS = -16;
const TARGET_TRUE_PEAK = -1.5;
const TARGET_LRA = 11; // loudness range

// ─── Helpers ─────────────────────────────────────────────────────
function ensureDirs() {
  for (const d of [AUDIO_DIR, CLIPS_DIR]) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }
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
  return val !== undefined ? (parseFloat(val) || undefined) : undefined;
}

function resolveVideoPath(input: string): string {
  if (existsSync(input)) return resolve(input);
  const fromClips = join(CLIPS_DIR, input);
  if (existsSync(fromClips)) return fromClips;
  const fromVideo = join(VIDEO_ROOT, input);
  if (existsSync(fromVideo)) return fromVideo;
  return resolve(input);
}

interface LoudnessStats {
  integrated: number;  // LUFS
  range: number;       // LU
  truePeak: number;    // dBFS
  threshold: number;   // LUFS
}

function measureLoudness(filePath: string): LoudnessStats | null {
  try {
    const out = execSync(
      `ffmpeg -i "${filePath}" -af loudnorm=print_format=json -f null - 2>&1`,
      EXEC_OPTS
    );
    const jsonMatch = out.match(/\{[\s\S]+?\}/);
    if (!jsonMatch) return null;
    const d = JSON.parse(jsonMatch[0]);
    return {
      integrated: parseFloat(d.input_i ?? '-99'),
      range: parseFloat(d.input_lra ?? '0'),
      truePeak: parseFloat(d.input_tp ?? '-99'),
      threshold: parseFloat(d.input_thresh ?? '-99'),
    };
  } catch {
    return null;
  }
}

// ─── 1. Extract ───────────────────────────────────────────────────
function cmdExtract(inputPath: string, format: 'mp3' | 'wav' = 'mp3') {
  ensureDirs();
  const filePath = resolveVideoPath(inputPath);
  if (!existsSync(filePath)) { console.error(`File not found: ${filePath}`); return; }

  const baseName = basename(filePath, extname(filePath));
  const outFile = join(AUDIO_DIR, `${baseName}.${format}`);

  console.log(`\nExtracting audio: ${basename(filePath)}`);

  try {
    if (format === 'wav') {
      execSync(
        `ffmpeg -y -i "${filePath}" -vn -c:a pcm_s16le -ar 44100 -ac 2 "${outFile}" 2>/dev/null`,
        EXEC_OPTS
      );
    } else {
      execSync(
        `ffmpeg -y -i "${filePath}" -vn -c:a libmp3lame -q:a 2 -ar 44100 "${outFile}" 2>/dev/null`,
        EXEC_OPTS
      );
    }
    console.log(`  Saved: ${outFile}`);
  } catch (err: any) {
    console.error(`  Extraction failed: ${err.message}`);
  }
}

// ─── 2. Stats ────────────────────────────────────────────────────
function cmdStats(inputPath: string) {
  const filePath = resolveVideoPath(inputPath);
  if (!existsSync(filePath)) { console.error(`File not found: ${filePath}`); return; }

  console.log(`\nAudio Stats: ${basename(filePath)}`);
  console.log(`  Measuring loudness (takes a moment)...`);

  const stats = measureLoudness(filePath);
  if (!stats) {
    console.error('  Could not measure loudness. Ensure ffmpeg is installed.');
    return;
  }

  const iGood = stats.integrated >= TARGET_LUFS - 3 && stats.integrated <= TARGET_LUFS + 3;
  const pGood = stats.truePeak <= TARGET_TRUE_PEAK;

  console.log(`\n  Integrated Loudness: ${stats.integrated.toFixed(1)} LUFS (target: ${TARGET_LUFS})`);
  console.log(`    ${iGood ? 'PASS' : 'NEEDS NORMALIZATION'}`);
  console.log(`  True Peak: ${stats.truePeak.toFixed(1)} dBFS (target: < ${TARGET_TRUE_PEAK})`);
  console.log(`    ${pGood ? 'PASS' : 'PEAK TOO HIGH — clips/distortion possible'}`);
  console.log(`  Loudness Range: ${stats.range.toFixed(1)} LU`);

  if (!iGood || !pGood) {
    console.log(`\n  To normalize, run:`);
    console.log(`    npx ts-node scripts/video/audio-pipeline.ts normalize-video "${filePath}"`);
  } else {
    console.log(`\n  Audio levels look good for social media posting.`);
  }
}

// ─── 3. Normalize (audio-only output) ────────────────────────────
function cmdNormalize(inputPath: string) {
  ensureDirs();
  const filePath = resolveVideoPath(inputPath);
  if (!existsSync(filePath)) { console.error(`File not found: ${filePath}`); return; }

  const baseName = basename(filePath, extname(filePath));
  const outFile = join(AUDIO_DIR, `${baseName}-normalized.mp3`);

  console.log(`\nNormalizing audio: ${basename(filePath)}`);
  console.log(`  Target: ${TARGET_LUFS} LUFS / ${TARGET_TRUE_PEAK} dBFS peak`);

  // Two-pass loudnorm for accurate normalization
  // Pass 1: measure
  console.log(`  Pass 1: Measuring...`);
  const stats = measureLoudness(filePath);
  if (!stats) {
    console.error('  Could not measure loudness.');
    return;
  }
  console.log(`  Input: ${stats.integrated.toFixed(1)} LUFS, peak ${stats.truePeak.toFixed(1)} dBFS`);

  // Pass 2: normalize
  console.log(`  Pass 2: Normalizing...`);
  try {
    execSync(
      `ffmpeg -y -i "${filePath}" -vn ` +
      `-af "loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TRUE_PEAK}:LRA=${TARGET_LRA}:` +
      `measured_I=${stats.integrated}:measured_LRA=${stats.range}:` +
      `measured_TP=${stats.truePeak}:measured_thresh=${stats.threshold}:` +
      `offset=0:linear=true:print_format=summary" ` +
      `-c:a libmp3lame -q:a 2 "${outFile}" 2>/dev/null`,
      EXEC_OPTS
    );
    console.log(`  Output: ${outFile}`);
    console.log(`  Done. Audio normalized to ${TARGET_LUFS} LUFS.`);
  } catch (err: any) {
    console.error(`  Normalization failed: ${err.message}`);
  }
}

// ─── 4. Normalize Video ──────────────────────────────────────────
// Normalize audio and produce a new video file with corrected levels.
function cmdNormalizeVideo(inputPath: string) {
  ensureDirs();
  const filePath = resolveVideoPath(inputPath);
  if (!existsSync(filePath)) { console.error(`File not found: ${filePath}`); return; }

  const ext = extname(filePath);
  const baseName = basename(filePath, ext);
  const outDir = dirname(filePath);
  const outFile = join(outDir, `${baseName}-normalized${ext}`);

  console.log(`\nNormalizing video audio: ${basename(filePath)}`);
  console.log(`  Target: ${TARGET_LUFS} LUFS / ${TARGET_TRUE_PEAK} dBFS peak`);

  // Measure first
  console.log(`  Measuring input levels...`);
  const stats = measureLoudness(filePath);
  if (!stats) {
    // Fallback: single-pass normalization without measured values
    console.log(`  Could not measure — using single-pass normalization.`);
    try {
      execSync(
        `ffmpeg -y -i "${filePath}" -c:v copy ` +
        `-af "loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TRUE_PEAK}:LRA=${TARGET_LRA}:print_format=summary" ` +
        `-c:a aac -b:a 128k "${outFile}" 2>/dev/null`,
        EXEC_OPTS
      );
      console.log(`  Output: ${outFile}`);
      return;
    } catch (err: any) {
      console.error(`  Normalization failed: ${err.message}`);
      return;
    }
  }

  console.log(`  Input: ${stats.integrated.toFixed(1)} LUFS, peak ${stats.truePeak.toFixed(1)} dBFS`);

  if (Math.abs(stats.integrated - TARGET_LUFS) < 1.5 && stats.truePeak <= TARGET_TRUE_PEAK) {
    console.log(`  Audio levels already within target range. No changes needed.`);
    return;
  }

  // Two-pass normalization preserving video
  console.log(`  Normalizing...`);
  try {
    execSync(
      `ffmpeg -y -i "${filePath}" -c:v copy ` +
      `-af "loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TRUE_PEAK}:LRA=${TARGET_LRA}:` +
      `measured_I=${stats.integrated}:measured_LRA=${stats.range}:` +
      `measured_TP=${stats.truePeak}:measured_thresh=${stats.threshold}:` +
      `offset=0:linear=true:print_format=summary" ` +
      `-c:a aac -b:a 128k "${outFile}" 2>/dev/null`,
      EXEC_OPTS
    );
    console.log(`  Output: ${outFile}`);
    console.log(`  Done. Use this file for social media posting.`);
  } catch (err: any) {
    console.error(`  Normalization failed: ${err.message}`);
  }
}

// ─── 5. Mix Music ────────────────────────────────────────────────
// Mix background music under speech in a clip.
// The speech stays at full volume; music is ducked significantly.
function cmdMixMusic(inputPath: string, musicPath: string, musicLevel: number = 0.12) {
  ensureDirs();
  const filePath = resolveVideoPath(inputPath);
  if (!existsSync(filePath)) { console.error(`File not found: ${filePath}`); return; }
  if (!existsSync(musicPath)) { console.error(`Music file not found: ${musicPath}`); return; }

  const ext = extname(filePath);
  const baseName = basename(filePath, ext);
  const outDir = dirname(filePath);
  const outFile = join(outDir, `${baseName}-with-music${ext}`);

  console.log(`\nMixing background music into: ${basename(filePath)}`);
  console.log(`  Music: ${basename(musicPath)} @ ${(musicLevel * 100).toFixed(0)}% volume`);

  try {
    // Mix: normalize speech first, then mix with low-volume music
    // Music loops if shorter than the clip, fades out at the end
    execSync(
      `ffmpeg -y -i "${filePath}" -stream_loop -1 -i "${musicPath}" ` +
      `-filter_complex "[0:a]loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TRUE_PEAK}:LRA=${TARGET_LRA}[speech];` +
      `[1:a]volume=${musicLevel},afade=t=out:st=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}" 2>/dev/null | awk '{printf "%.1f", $1-2}'):d=2[music];` +
      `[speech][music]amix=inputs=2:duration=first:weights=1 ${musicLevel}[aout]" ` +
      `-map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 128k ` +
      `-shortest "${outFile}" 2>/dev/null`,
      EXEC_OPTS
    );
    console.log(`  Output: ${outFile}`);
  } catch {
    // Fallback: simpler mix without complex filter
    try {
      execSync(
        `ffmpeg -y -i "${filePath}" -stream_loop -1 -i "${musicPath}" ` +
        `-filter_complex "[1:a]volume=${musicLevel}[music];[0:a][music]amix=inputs=2:duration=first[aout]" ` +
        `-map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 128k ` +
        `-shortest "${outFile}" 2>/dev/null`,
        EXEC_OPTS
      );
      console.log(`  Output: ${outFile}`);
    } catch (err: any) {
      console.error(`  Music mix failed: ${err.message}`);
    }
  }
}

// ─── 6. Batch Normalize ──────────────────────────────────────────
function cmdBatchNormalize() {
  ensureDirs();
  if (!existsSync(CLIPS_DIR)) {
    console.error(`Clips directory not found: ${CLIPS_DIR}`);
    return;
  }

  const files = readdirSync(CLIPS_DIR)
    .filter(f => f.endsWith('.mp4') && !f.includes('-normalized') && !f.includes('-with-music') && !f.includes('-thumb'))
    .sort();

  if (files.length === 0) {
    console.log(`No clips found in ${CLIPS_DIR}`);
    return;
  }

  console.log(`\nBatch normalizing ${files.length} clips...\n`);
  let done = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = join(CLIPS_DIR, file);
    const baseName = basename(file, '.mp4');
    const outFile = join(CLIPS_DIR, `${baseName}-normalized.mp4`);

    if (existsSync(outFile)) {
      console.log(`  SKIP (already exists): ${file}`);
      skipped++;
      continue;
    }

    console.log(`  Normalizing: ${file}`);
    const stats = measureLoudness(filePath);

    if (stats && Math.abs(stats.integrated - TARGET_LUFS) < 1.5 && stats.truePeak <= TARGET_TRUE_PEAK) {
      console.log(`    Levels OK (${stats.integrated.toFixed(1)} LUFS). Skipping.`);
      skipped++;
      continue;
    }

    try {
      const loudnormFilter = stats
        ? `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TRUE_PEAK}:LRA=${TARGET_LRA}:measured_I=${stats.integrated}:measured_LRA=${stats.range}:measured_TP=${stats.truePeak}:measured_thresh=${stats.threshold}:offset=0:linear=true`
        : `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TRUE_PEAK}:LRA=${TARGET_LRA}`;

      execSync(
        `ffmpeg -y -i "${filePath}" -c:v copy -af "${loudnormFilter}" -c:a aac -b:a 128k "${outFile}" 2>/dev/null`,
        EXEC_OPTS
      );
      console.log(`    Saved: ${basename(outFile)}`);
      done++;
    } catch (err: any) {
      console.error(`    Failed: ${err.message}`);
    }
  }

  console.log(`\n  Done: ${done} normalized, ${skipped} skipped.`);
}

// ─── Main ─────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd) {
    console.log('EOA Audio Pipeline — Extract, normalize, and mix audio for social media clips\n');
    console.log('Commands:');
    console.log('  extract <clip.mp4> [--format mp3|wav]    Extract audio track');
    console.log('  stats <clip.mp4>                         Show audio loudness stats');
    console.log('  normalize <clip.mp4>                     Normalize audio (MP3 output)');
    console.log('  normalize-video <clip.mp4>               Normalize audio in-place (MP4 output)');
    console.log('  mix-music <clip.mp4> --music <track.mp3> [--level 0.12]  Add background music');
    console.log('  batch-normalize                          Normalize all clips in clips/');
    console.log('\nAudio standard: EBU R128 (-16 LUFS integrated, -1.5 dBFS true peak)');
    return;
  }

  switch (cmd) {
    case 'extract': {
      const file = args[1];
      if (!file) { console.error('Usage: extract <clip.mp4> [--format mp3|wav]'); return; }
      const format = (getFlag(args, '--format') as 'mp3' | 'wav') || 'mp3';
      cmdExtract(file, format);
      break;
    }

    case 'stats': {
      const file = args[1];
      if (!file) { console.error('Usage: stats <clip.mp4>'); return; }
      cmdStats(file);
      break;
    }

    case 'normalize': {
      const file = args[1];
      if (!file) { console.error('Usage: normalize <clip.mp4>'); return; }
      cmdNormalize(file);
      break;
    }

    case 'normalize-video': {
      const file = args[1];
      if (!file) { console.error('Usage: normalize-video <clip.mp4>'); return; }
      cmdNormalizeVideo(file);
      break;
    }

    case 'mix-music': {
      const file = args[1];
      const music = getFlag(args, '--music');
      if (!file || !music) { console.error('Usage: mix-music <clip.mp4> --music <track.mp3> [--level 0.12]'); return; }
      const level = getFlagNum(args, '--level') ?? 0.12;
      cmdMixMusic(file, music, level);
      break;
    }

    case 'batch-normalize': {
      cmdBatchNormalize();
      break;
    }

    default:
      console.error(`Unknown command: ${cmd}`);
      console.log('Run without arguments for usage info.');
  }
}

main();
