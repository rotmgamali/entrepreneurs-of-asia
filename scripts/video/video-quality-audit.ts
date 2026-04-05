/**
 * EOA — Video Quality Audit
 *
 * Audits extracted video clips for social media readiness using ffprobe.
 * Scores clips across resolution, audio levels, duration, codec, and more.
 * Outputs a detailed scorecard with actionable fix recommendations.
 *
 * Adapted from Demons & Deities video-quality-audit.ts for EOA event clips.
 * Unlike the D&D version (which audited Shotstack JSON), this audits actual
 * video files directly using ffprobe metrics.
 *
 * Usage (run from project root):
 *   TS="npx ts-node --project tsconfig.json"
 *
 *   # Audit a single clip
 *   $TS scripts/video/video-quality-audit.ts scripts/video/clips/highlight-001.mp4
 *
 *   # Audit all clips in the clips directory
 *   $TS scripts/video/video-quality-audit.ts --all
 *
 *   # Audit with verbose output
 *   $TS scripts/video/video-quality-audit.ts clip.mp4 --verbose
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, basename, resolve } from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const VIDEO_ROOT = join(ROOT, 'scripts', 'video');
const CLIPS_DIR = join(VIDEO_ROOT, 'clips');

const EXEC_OPTS = { encoding: 'utf-8' as const, maxBuffer: 10 * 1024 * 1024 };

// ─── Types ─────────────────────────────────────────────────────────
interface CheckResult {
  name: string;
  category: string;
  maxPoints: number;
  earned: number;
  passed: boolean;
  detail: string;
  fix?: string;
}

interface ProbeData {
  format: any;
  streams: any[];
  videoStream: any;
  audioStream: any;
  duration: number;
  fileSize: number;
}

// ─── Helpers ───────────────────────────────────────────────────────
function probeFile(filePath: string): ProbeData | null {
  try {
    const raw = execSync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`,
      EXEC_OPTS
    );
    const data = JSON.parse(raw);
    const videoStream = data.streams?.find((s: any) => s.codec_type === 'video') || null;
    const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio') || null;
    const duration = parseFloat(data.format?.duration || '0');
    const fileSize = parseInt(data.format?.size || '0', 10);
    return { format: data.format, streams: data.streams || [], videoStream, audioStream, duration, fileSize };
  } catch {
    return null;
  }
}

function measureAudioLoudness(filePath: string): { integrated: number; peak: number } | null {
  try {
    const out = execSync(
      `ffmpeg -i "${filePath}" -af loudnorm=print_format=json -f null - 2>&1`,
      EXEC_OPTS
    );
    const jsonMatch = out.match(/\{[\s\S]+\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return {
        integrated: parseFloat(data.input_i ?? '-99'),
        peak: parseFloat(data.input_tp ?? '-99'),
      };
    }
  } catch { /* best-effort */ }
  return null;
}

function getVideoFps(stream: any): number {
  if (!stream?.r_frame_rate) return 0;
  const [num, den] = stream.r_frame_rate.split('/').map(Number);
  return den ? Math.round((num / den) * 100) / 100 : num;
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

// ─── Quality Checks ────────────────────────────────────────────────
function runChecks(filePath: string, verbose: boolean): { checks: CheckResult[]; probe: ProbeData } {
  const probe = probeFile(filePath);
  if (!probe) {
    return {
      checks: [{
        name: 'File readable',
        category: 'Structure',
        maxPoints: 100,
        earned: 0,
        passed: false,
        detail: 'ffprobe could not read this file.',
        fix: 'Check the file is a valid MP4/MOV and not corrupted.',
      }],
      probe: { format: {}, streams: [], videoStream: null, audioStream: null, duration: 0, fileSize: 0 },
    };
  }

  const { videoStream: v, audioStream: a, duration, fileSize } = probe;
  const checks: CheckResult[] = [];

  // ─── Structure Checks ─────────────────────────────────────────

  checks.push({
    name: 'Has video stream',
    category: 'Structure',
    maxPoints: 10,
    earned: v ? 10 : 0,
    passed: !!v,
    detail: v ? `Video codec: ${v.codec_name}` : 'No video stream found.',
    fix: v ? undefined : 'This file has no video track. Re-export from source.',
  });

  checks.push({
    name: 'Has audio stream',
    category: 'Structure',
    maxPoints: 8,
    earned: a ? 8 : 0,
    passed: !!a,
    detail: a ? `Audio codec: ${a.codec_name}, channels: ${a.channels}` : 'No audio stream found.',
    fix: a ? undefined : 'No audio detected. Event recordings should have speaker audio.',
  });

  const hasFaststart = probe.format?.tags?.['major_brand'] !== undefined ||
    String(probe.format?.format_name || '').includes('mp4');
  checks.push({
    name: 'MP4 container',
    category: 'Structure',
    maxPoints: 5,
    earned: hasFaststart ? 5 : 2,
    passed: hasFaststart,
    detail: `Format: ${probe.format?.format_name || 'unknown'}`,
    fix: hasFaststart ? undefined : 'Re-encode to MP4: ffmpeg -i input.mov -c:v libx264 -c:a aac output.mp4',
  });

  // ─── Video Checks ─────────────────────────────────────────────

  const width = v?.width || 0;
  const height = v?.height || 0;

  // Minimum 720p for social media
  const minDim = Math.min(width, height);
  const resScore = minDim >= 1080 ? 10 : minDim >= 720 ? 8 : minDim >= 480 ? 4 : 0;
  checks.push({
    name: 'Resolution (min 720p)',
    category: 'Video',
    maxPoints: 10,
    earned: resScore,
    passed: minDim >= 720,
    detail: `${width}x${height} (${minDim >= 1080 ? '1080p+' : minDim >= 720 ? '720p' : minDim >= 480 ? '480p' : 'too low'})`,
    fix: minDim < 720 ? 'Source recording is too low resolution. Use 720p or 1080p Zoom settings.' : undefined,
  });

  // Aspect ratio check — 16:9 or 9:16 for social
  const aspectRatio = height > 0 ? width / height : 0;
  const is16x9 = aspectRatio > 1.7 && aspectRatio < 1.85;
  const is9x16 = aspectRatio > 0.55 && aspectRatio < 0.58;
  const is1x1 = aspectRatio > 0.95 && aspectRatio < 1.05;
  const goodAspect = is16x9 || is9x16 || is1x1;
  const aspectLabel = is16x9 ? '16:9 (landscape)' : is9x16 ? '9:16 (portrait/Reels)' : is1x1 ? '1:1 (square)' : `${aspectRatio.toFixed(2)} (non-standard)`;
  checks.push({
    name: 'Aspect ratio',
    category: 'Video',
    maxPoints: 8,
    earned: goodAspect ? 8 : 4,
    passed: goodAspect,
    detail: aspectLabel,
    fix: goodAspect ? undefined : 'Crop to 16:9, 9:16, or 1:1 for platform compatibility.',
  });

  // FPS
  const fps = getVideoFps(v);
  const fpsGood = fps >= 24 && fps <= 60;
  const fpsScore = fps >= 29 && fps <= 31 ? 8 : fps >= 24 ? 6 : fps > 0 ? 3 : 0;
  checks.push({
    name: 'Frame rate (24-60fps)',
    category: 'Video',
    maxPoints: 8,
    earned: fpsScore,
    passed: fpsGood,
    detail: `${fps > 0 ? fps.toFixed(2) : 'unknown'} fps`,
    fix: !fpsGood && fps > 0 ? `Re-encode at 30fps: ffmpeg -i input.mp4 -r 30 output.mp4` : undefined,
  });

  // Video codec — H.264 preferred for widest compatibility
  const vcodec = v?.codec_name || '';
  const codecGood = ['h264', 'avc'].some(c => vcodec.includes(c));
  checks.push({
    name: 'Video codec (H.264)',
    category: 'Video',
    maxPoints: 6,
    earned: codecGood ? 6 : vcodec.includes('h265') || vcodec.includes('hevc') ? 3 : 1,
    passed: codecGood,
    detail: `Codec: ${vcodec || 'unknown'}`,
    fix: !codecGood ? 'Re-encode to H.264: ffmpeg -i input.mp4 -c:v libx264 -crf 20 output.mp4' : undefined,
  });

  // Video bitrate
  const vBitrate = parseInt(v?.bit_rate || '0', 10) / 1000; // kbps
  const bitrateGood = vBitrate >= 1500;
  const bitrateScore = vBitrate >= 4000 ? 6 : vBitrate >= 2000 ? 5 : vBitrate >= 1000 ? 3 : 1;
  checks.push({
    name: 'Video bitrate (min 1500kbps)',
    category: 'Video',
    maxPoints: 6,
    earned: vBitrate > 0 ? bitrateScore : 3, // 3 points if unknown (container-level bitrate)
    passed: bitrateGood || vBitrate === 0,
    detail: vBitrate > 0 ? `${vBitrate.toFixed(0)} kbps` : 'Bitrate in container (not stream-level)',
    fix: !bitrateGood && vBitrate > 0 ? 'Bitrate may cause quality issues. Re-encode with -crf 18-22.' : undefined,
  });

  // ─── Audio Checks ─────────────────────────────────────────────

  if (a) {
    // Audio codec — AAC preferred
    const acodec = a.codec_name || '';
    const acodecGood = acodec.includes('aac') || acodec.includes('mp3');
    checks.push({
      name: 'Audio codec (AAC/MP3)',
      category: 'Audio',
      maxPoints: 5,
      earned: acodecGood ? 5 : 2,
      passed: acodecGood,
      detail: `Codec: ${acodec || 'unknown'}, ${a.channels} ch, ${parseInt(a.sample_rate || '0', 10)}Hz`,
      fix: !acodecGood ? 'Re-encode audio: ffmpeg -i input.mp4 -c:a aac -b:a 128k output.mp4' : undefined,
    });

    // Audio bitrate
    const aBitrate = parseInt(a.bit_rate || '0', 10) / 1000;
    const aBitrateGood = aBitrate >= 96 || aBitrate === 0;
    checks.push({
      name: 'Audio bitrate (min 96kbps)',
      category: 'Audio',
      maxPoints: 5,
      earned: aBitrateGood ? 5 : 2,
      passed: aBitrateGood,
      detail: aBitrate > 0 ? `${aBitrate.toFixed(0)} kbps` : 'Bitrate in container',
      fix: !aBitrateGood ? 'Increase audio bitrate: -b:a 128k' : undefined,
    });

    // Audio channels (mono or stereo, not 5.1)
    const channels = a.channels || 0;
    const channelsGood = channels >= 1 && channels <= 2;
    checks.push({
      name: 'Audio channels (mono/stereo)',
      category: 'Audio',
      maxPoints: 5,
      earned: channelsGood ? 5 : channels > 2 ? 3 : 0,
      passed: channelsGood,
      detail: `${channels} channel(s) — ${channels === 1 ? 'mono' : channels === 2 ? 'stereo' : channels + '.1 surround'}`,
      fix: channels > 2 ? 'Downmix to stereo: -ac 2' : undefined,
    });

    // Loudness check (requires ffmpeg with loudnorm)
    if (verbose) {
      console.log('  Measuring audio loudness (this takes a moment)...');
      const loudness = measureAudioLoudness(filePath);
      if (loudness) {
        // Target: -16 LUFS integrated (YouTube/social standard), -1dBFS peak
        const integratedGood = loudness.integrated >= -20 && loudness.integrated <= -10;
        const peakGood = loudness.peak <= -1;
        const loudScore = integratedGood && peakGood ? 8 : integratedGood || peakGood ? 5 : 2;
        checks.push({
          name: 'Audio loudness (target: -16 LUFS)',
          category: 'Audio',
          maxPoints: 8,
          earned: loudScore,
          passed: integratedGood && peakGood,
          detail: `Integrated: ${loudness.integrated.toFixed(1)} LUFS | Peak: ${loudness.peak.toFixed(1)} dBFS`,
          fix: !integratedGood ? `Normalize: ffmpeg -i input.mp4 -af "loudnorm=I=-16:TP=-1.5:LRA=11" output.mp4` : undefined,
        });
      }
    } else {
      checks.push({
        name: 'Audio loudness',
        category: 'Audio',
        maxPoints: 8,
        earned: 5, // Assume acceptable, use --verbose to measure
        passed: true,
        detail: 'Not measured (run with --verbose to check loudness)',
        fix: 'Run with --verbose flag to measure actual loudness levels.',
      });
    }
  }

  // ─── Duration Checks ──────────────────────────────────────────

  // EOA target: 30-60 seconds for social clips
  const TARGET_MIN = 30;
  const TARGET_MAX = 60;
  const TARGET_IDEAL_MIN = 35;
  const TARGET_IDEAL_MAX = 55;

  const durScore = duration >= TARGET_IDEAL_MIN && duration <= TARGET_IDEAL_MAX ? 10
    : duration >= TARGET_MIN && duration <= TARGET_MAX ? 7
    : duration > 0 && duration < TARGET_MIN ? 4
    : duration > TARGET_MAX ? 5 : 0;

  const durLabel = duration < TARGET_MIN ? `too short (${formatSeconds(duration)} — aim for ${TARGET_MIN}-${TARGET_MAX}s)`
    : duration > TARGET_MAX ? `too long (${formatSeconds(duration)} — trim to under ${TARGET_MAX}s)`
    : `${formatSeconds(duration)} (good)`;

  checks.push({
    name: `Duration (target: ${TARGET_MIN}-${TARGET_MAX}s)`,
    category: 'Duration',
    maxPoints: 10,
    earned: durScore,
    passed: duration >= TARGET_MIN && duration <= TARGET_MAX,
    detail: durLabel,
    fix: duration > TARGET_MAX
      ? `Trim to best ${TARGET_MAX}s: npx ts-node scripts/video/clip-extractor.ts clip "${filePath}" --start 0 --end ${TARGET_MAX}`
      : duration < TARGET_MIN ? `Clip too short. Extract a longer segment from the source recording.`
      : undefined,
  });

  // File size check — social platforms have upload limits
  const maxSizeMB = 100; // Conservative limit for most platforms
  const sizeMB = fileSize / (1024 * 1024);
  const sizeGood = sizeMB <= maxSizeMB;
  checks.push({
    name: `File size (max ${maxSizeMB}MB)`,
    category: 'Distribution',
    maxPoints: 5,
    earned: sizeGood ? 5 : sizeMB <= 200 ? 3 : 1,
    passed: sizeGood,
    detail: formatBytes(fileSize),
    fix: !sizeGood ? `Compress: ffmpeg -i input.mp4 -c:v libx264 -crf 28 -c:a aac -b:a 96k output.mp4` : undefined,
  });

  return { checks, probe };
}

// ─── Audit a single file ──────────────────────────────────────────
function auditFile(filePath: string, verbose: boolean): void {
  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    return;
  }

  console.log(`\n=== EOA Video Quality Audit ===`);
  console.log(`  File: ${basename(absPath)}\n`);

  const { checks, probe } = runChecks(absPath, verbose);

  // Group by category
  const categories = [...new Set(checks.map(c => c.category))];
  let totalEarned = 0;
  let totalMax = 0;
  const failures: CheckResult[] = [];

  for (const cat of categories) {
    const catChecks = checks.filter(c => c.category === cat);
    const catEarned = catChecks.reduce((s, c) => s + c.earned, 0);
    const catMax = catChecks.reduce((s, c) => s + c.maxPoints, 0);
    totalEarned += catEarned;
    totalMax += catMax;

    console.log(`  [${cat}] ${catEarned}/${catMax} pts`);
    for (const c of catChecks) {
      const icon = c.passed ? '✓' : '✗';
      const pts = c.earned < c.maxPoints ? ` (${c.earned}/${c.maxPoints})` : '';
      console.log(`    ${icon} ${c.name}${pts}: ${c.detail}`);
      if (!c.passed) failures.push(c);
    }
    console.log('');
  }

  const pct = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;
  const grade = pct >= 90 ? 'A' : pct >= 75 ? 'B' : pct >= 60 ? 'C' : pct >= 45 ? 'D' : 'F';

  console.log(`  ─── Score: ${totalEarned}/${totalMax} (${pct.toFixed(0)}%) — Grade: ${grade} ───\n`);

  if (failures.length > 0) {
    console.log(`  Fixes needed (${failures.length}):`);
    for (const f of failures) {
      if (f.fix) {
        console.log(`    [${f.category}] ${f.name}:`);
        console.log(`      ${f.fix}`);
      }
    }
    console.log('');
  }

  if (grade === 'A' || grade === 'B') {
    console.log(`  Ready to post! ${grade === 'A' ? 'Excellent quality.' : 'Good quality with minor issues.'}`);
  } else if (grade === 'C') {
    console.log(`  Acceptable. Address the listed fixes before posting to premium channels.`);
  } else {
    console.log(`  Needs work. Resolve the critical issues before posting.`);
  }

  // Save report
  const reportPath = absPath.replace(/\.mp4$/i, '-quality-report.json');
  writeFileSync(reportPath, JSON.stringify({
    file: basename(absPath),
    auditedAt: new Date().toISOString(),
    score: totalEarned,
    maxScore: totalMax,
    pct: Math.round(pct),
    grade,
    checks,
    probe: {
      duration: probe.duration,
      width: probe.videoStream?.width || 0,
      height: probe.videoStream?.height || 0,
      fps: getVideoFps(probe.videoStream),
      vcodec: probe.videoStream?.codec_name || 'unknown',
      acodec: probe.audioStream?.codec_name || 'unknown',
      fileSize: probe.fileSize,
    },
  }, null, 2));
  console.log(`  Report saved: ${reportPath}`);
}

// ─── Audit all clips ──────────────────────────────────────────────
function auditAll(verbose: boolean): void {
  if (!existsSync(CLIPS_DIR)) {
    console.error(`Clips directory not found: ${CLIPS_DIR}`);
    console.log('Run clip-extractor.ts first to create clips.');
    return;
  }

  const files = readdirSync(CLIPS_DIR)
    .filter(f => f.endsWith('.mp4') && !f.includes('-thumb'))
    .sort();

  if (files.length === 0) {
    console.log(`No MP4 clips found in ${CLIPS_DIR}`);
    return;
  }

  console.log(`\nAuditing ${files.length} clips...\n`);
  const results: Array<{ file: string; grade: string; score: number; max: number }> = [];

  for (const file of files) {
    const filePath = join(CLIPS_DIR, file);
    const { checks } = runChecks(filePath, verbose);
    const score = checks.reduce((s, c) => s + c.earned, 0);
    const max = checks.reduce((s, c) => s + c.maxPoints, 0);
    const pct = max > 0 ? (score / max) * 100 : 0;
    const grade = pct >= 90 ? 'A' : pct >= 75 ? 'B' : pct >= 60 ? 'C' : pct >= 45 ? 'D' : 'F';
    results.push({ file, grade, score, max });
    console.log(`  ${grade} (${score}/${max}) — ${file}`);
  }

  console.log(`\n=== Summary ===`);
  const gradeCount: Record<string, number> = {};
  for (const r of results) gradeCount[r.grade] = (gradeCount[r.grade] || 0) + 1;
  for (const [g, count] of Object.entries(gradeCount).sort()) {
    console.log(`  ${g}: ${count} clips`);
  }

  const readyToPost = results.filter(r => r.grade === 'A' || r.grade === 'B');
  console.log(`\n  Ready to post: ${readyToPost.length}/${files.length}`);
  for (const r of readyToPost) {
    console.log(`    ${r.grade} — ${r.file}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('EOA Video Quality Audit — Check clips for social media readiness\n');
    console.log('Usage:');
    console.log('  npx ts-node scripts/video/video-quality-audit.ts <clip.mp4>    Audit a single clip');
    console.log('  npx ts-node scripts/video/video-quality-audit.ts --all         Audit all clips');
    console.log('  npx ts-node scripts/video/video-quality-audit.ts <clip.mp4> --verbose  Full loudness check');
    return;
  }

  const verbose = args.includes('--verbose');

  if (args.includes('--all')) {
    auditAll(verbose);
  } else {
    const filePath = args.find(a => !a.startsWith('--'));
    if (!filePath) { console.error('Usage: video-quality-audit.ts <clip.mp4>'); return; }
    auditFile(filePath, verbose);
  }
}

main();
