/**
 * Demons & Deities — Video Quality Audit
 *
 * Scores a Shotstack JSON file against ~45 professional quality checks.
 * Outputs a detailed scorecard (0-115, with penalty deductions) with letter grade and actionable fixes.
 * Base: 100 pts (structural) + Content Quality: 15 pts (clip diversity, source quality).
 * Penalty checks (v5 learned failures): screen recordings, Ken Burns, freeze detection,
 * text overlay bleed, and opening SFX — these deduct points from the total.
 *
 * Usage:
 *   npx ts-node scripts/marketing/video-quality-audit.ts \
 *     scripts/marketing/blueprints/cinematic-trailer-v7-45s.shotstack.json
 */

import { readFileSync } from 'fs';
import { basename, resolve } from 'path';

// ─── Types ─────────────────────────────────────────────────────────

interface Asset {
  type: string;
  src?: string;
  text?: string;
  style?: string;
  size?: string;
  color?: string;
  position?: string;
  volume?: number;
  trim?: number;
}

interface Clip {
  asset: Asset;
  start: number;
  length: number;
  effect?: string;
  filter?: string;
  transition?: { in?: string; out?: string };
  fit?: string;
  position?: string;
  offset?: { x: number; y: number };
  scale?: number;
  opacity?: number;
  speed?: number;
  [key: string]: any;
}

interface Track { clips: Clip[] }

interface Timeline {
  background?: string;
  soundtrack?: { src: string; effect?: string; volume?: number };
  fonts?: Array<{ src: string }>;
  tracks: Track[];
}

interface ShotstackEdit {
  timeline: Timeline;
  output: { format: string; resolution: string; fps?: number; aspectRatio?: string };
  [key: string]: any;
}

// ─── Check Result ──────────────────────────────────────────────────

interface CheckResult {
  name: string;
  category: string;
  maxPoints: number;
  earned: number;
  passed: boolean;
  detail: string;
  fix?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────

function getAllClips(edit: ShotstackEdit): Clip[] {
  return edit.timeline.tracks.flatMap(t => t.clips);
}

function getClipsByType(edit: ShotstackEdit, type: string): Clip[] {
  return getAllClips(edit).filter(c => c.asset?.type === type);
}

function getTotalDuration(edit: ShotstackEdit): number {
  return Math.max(...getAllClips(edit).map(c => c.start + c.length), 0);
}

function getVideoClips(edit: ShotstackEdit): Clip[] {
  return getClipsByType(edit, 'video');
}

function getImageClips(edit: ShotstackEdit): Clip[] {
  return getClipsByType(edit, 'image');
}

function getTitleClips(edit: ShotstackEdit): Clip[] {
  return getClipsByType(edit, 'title');
}

function getAudioClips(edit: ShotstackEdit): Clip[] {
  return getClipsByType(edit, 'audio');
}

function getVisualClips(edit: ShotstackEdit): Clip[] {
  return getAllClips(edit).filter(c => c.asset?.type === 'video' || c.asset?.type === 'image');
}

/** Get all visual clips sorted by start time from a specific track (the main visual track) */
function getMainVisualTrack(edit: ShotstackEdit): Clip[] {
  // Find the track with the most video/image clips
  let best: Clip[] = [];
  for (const track of edit.timeline.tracks) {
    const visuals = track.clips.filter(c => c.asset?.type === 'video' || c.asset?.type === 'image');
    if (visuals.length > best.length) best = visuals;
  }
  return best.sort((a, b) => a.start - b.start);
}

function resolutionToPixels(res: string): number {
  const map: Record<string, number> = {
    'sd': 480, '480': 480,
    'hd': 720, '720': 720,
    '1080': 1080,
    '4k': 2160, '2160': 2160,
  };
  return map[res?.toLowerCase()] || 0;
}

// ─── Check Implementations ────────────────────────────────────────

function isWatermark(c: Clip): boolean {
  return (c.scale !== undefined && c.scale <= 0.15) || (c.opacity !== undefined && c.opacity <= 0.5);
}

function runHookPowerChecks(edit: ShotstackEdit): CheckResult[] {
  const results: CheckResult[] = [];
  const totalDuration = getTotalDuration(edit);
  // Exclude tiny watermark/logo overlays from "visual" analysis
  const allVisuals = getVisualClips(edit).filter(c => !isWatermark(c)).sort((a, b) => a.start - b.start);
  const titleClips = getTitleClips(edit).sort((a, b) => a.start - b.start);
  const mainVisuals = getMainVisualTrack(edit);

  // 1. First clip is video (not image) — 3 pts
  const firstVisual = allVisuals[0];
  const firstIsVideo = firstVisual?.asset?.type === 'video';
  results.push({
    name: 'First clip is video (not image)',
    category: 'HOOK POWER',
    maxPoints: 3,
    earned: firstIsVideo ? 3 : 0,
    passed: firstIsVideo,
    detail: firstIsVideo
      ? `First visual clip is video`
      : `First visual clip is ${firstVisual?.asset?.type || 'missing'} — video grabs attention faster`,
    fix: firstIsVideo ? undefined : 'Replace the opening image clip with a short, high-energy stock video clip',
  });

  // 2. First clip starts at time 0.0 — 2 pts
  const firstAt0 = firstVisual?.start === 0;
  results.push({
    name: 'First clip starts at time 0.0',
    category: 'HOOK POWER',
    maxPoints: 2,
    earned: firstAt0 ? 2 : 0,
    passed: firstAt0,
    detail: firstAt0
      ? 'No dead time before first visual'
      : `First visual starts at ${firstVisual?.start ?? '?'}s — dead air loses viewers`,
    fix: firstAt0 ? undefined : `Set the first visual clip start to 0.0`,
  });

  // 3. No text overlays in first 3 seconds — 3 pts
  const textInFirst3 = titleClips.filter(c => c.start < 3);
  const noTextFirst3 = textInFirst3.length === 0;
  results.push({
    name: 'No text overlays in first 3 seconds',
    category: 'HOOK POWER',
    maxPoints: 3,
    earned: noTextFirst3 ? 3 : 0,
    passed: noTextFirst3,
    detail: noTextFirst3
      ? 'First 3s are pure visual — good hook'
      : `${textInFirst3.length} text card(s) appear before 3s: "${textInFirst3.map(c => c.asset.text).join('", "')}"`,
    fix: noTextFirst3 ? undefined : 'Move all text overlays to start at 3.0s or later — let visuals hook the viewer first',
  });

  // 4. Title/logo does NOT appear in first 5 seconds — 2 pts
  const brandTexts = titleClips.filter(c => {
    const t = (c.asset.text || '').toLowerCase();
    return (t.includes('demons') && t.includes('deities')) || t.includes('logo');
  });
  const brandBefore5 = brandTexts.filter(c => c.start < 5);
  const noBrandFirst5 = brandBefore5.length === 0;
  results.push({
    name: 'Title/logo not in first 5 seconds',
    category: 'HOOK POWER',
    maxPoints: 2,
    earned: noBrandFirst5 ? 2 : 0,
    passed: noBrandFirst5,
    detail: noBrandFirst5
      ? 'Brand reveal is delayed — builds curiosity'
      : `Brand title appears at ${brandBefore5[0].start}s — too early, show the world first`,
    fix: noBrandFirst5 ? undefined : 'Move the "DEMONS & DEITIES" title card to 5s or later',
  });

  // 5. At least 2 cuts in first 3 seconds — 3 pts
  const cutsIn3s = mainVisuals.filter(c => c.start < 3).length;
  const has2cuts = cutsIn3s >= 2;
  results.push({
    name: 'At least 2 cuts in first 3 seconds',
    category: 'HOOK POWER',
    maxPoints: 3,
    earned: has2cuts ? 3 : 0,
    passed: has2cuts,
    detail: has2cuts
      ? `${cutsIn3s} visual cuts in first 3s — fast-paced hook`
      : `Only ${cutsIn3s} cut(s) in first 3s — needs rapid-fire opening`,
    fix: has2cuts ? undefined : 'Add 2-3 short (0.8-1.2s) video clips at the very start for a rapid montage hook',
  });

  // 6. First clip has an effect — 2 pts
  const firstHasEffect = !!(firstVisual?.effect);
  results.push({
    name: 'First clip has an effect (zoomIn, etc)',
    category: 'HOOK POWER',
    maxPoints: 2,
    earned: firstHasEffect ? 2 : 0,
    passed: firstHasEffect,
    detail: firstHasEffect
      ? `First clip uses "${firstVisual!.effect}" effect`
      : 'First visual has no motion effect — feels static',
    fix: firstHasEffect ? undefined : 'Add effect: "zoomIn" or "slideUp" to the first visual clip',
  });

  return results;
}

function runVisualQualityChecks(edit: ShotstackEdit): CheckResult[] {
  const results: CheckResult[] = [];
  const totalDuration = getTotalDuration(edit);
  const videoClips = getVideoClips(edit);
  const imageClips = getImageClips(edit);
  const allVisuals = getVisualClips(edit);

  // 1. At least 30% of video clips have a filter — 4 pts
  const filteredClips = videoClips.filter(c => c.filter);
  const filterPct = videoClips.length > 0 ? filteredClips.length / videoClips.length : 0;
  const hasFilters = filterPct >= 0.3;
  results.push({
    name: 'At least 30% of video clips have a filter',
    category: 'VISUAL QUALITY',
    maxPoints: 4,
    earned: hasFilters ? 4 : 0,
    passed: hasFilters,
    detail: hasFilters
      ? `${filteredClips.length}/${videoClips.length} clips (${(filterPct * 100).toFixed(0)}%) have color grading`
      : `${filteredClips.length}/${videoClips.length} clips have filters (${(filterPct * 100).toFixed(0)}%) — needs 30%+`,
    fix: hasFilters ? undefined : `Add filter: "darken" or "boost" to at least ${Math.ceil(videoClips.length * 0.3)} video clips for cinematic color grading`,
  });

  // 2. No image assets on the SAME track as video — 3 pts
  // Images as overlays on SEPARATE tracks from video are fine (that's proper compositing)
  const videoTrackIndices = new Set<number>();
  const imageTrackIndices = new Set<number>();
  (edit.timeline?.tracks || []).forEach((track: any, idx: number) => {
    for (const clip of (track.clips || [])) {
      if (clip.asset?.type === 'video') videoTrackIndices.add(idx);
      if (clip.asset?.type === 'image') imageTrackIndices.add(idx);
    }
  });
  const sharedTracks = [...imageTrackIndices].filter(i => videoTrackIndices.has(i));
  const noMidImages = sharedTracks.length === 0;
  results.push({
    name: 'Images and video on separate tracks (proper compositing)',
    category: 'VISUAL QUALITY',
    maxPoints: 3,
    earned: noMidImages ? 3 : 0,
    passed: noMidImages,
    detail: noMidImages
      ? 'Images are on overlay tracks, video is on base track — proper compositing'
      : `${sharedTracks.length} track(s) mix image and video clips — separate them for proper layering`,
    fix: noMidImages ? undefined : 'Move image clips to a separate overlay track (lower track number than video)',
  });

  // 3. At least one clip has speed != 1.0 — 2 pts
  const speedClips = allVisuals.filter(c => (c.speed !== undefined && c.speed !== 1.0) || ((c.asset as any)?.speed !== undefined && (c.asset as any).speed !== 1.0));
  const hasSpeed = speedClips.length > 0;
  results.push({
    name: 'At least one clip has speed variation',
    category: 'VISUAL QUALITY',
    maxPoints: 2,
    earned: hasSpeed ? 2 : 0,
    passed: hasSpeed,
    detail: hasSpeed
      ? `${speedClips.length} clip(s) use speed ramping`
      : 'All clips at default speed — no slow-mo or fast-forward',
    fix: hasSpeed ? undefined : 'Add speed: 0.5 to a dramatic moment for slow-mo, or speed: 1.5 to an action montage',
  });

  // 4. Max 2 transition types for video clips — 3 pts
  const transitionTypes = new Set<string>();
  videoClips.forEach(c => {
    if (c.transition?.in) transitionTypes.add(c.transition.in);
    if (c.transition?.out) transitionTypes.add(c.transition.out);
  });
  const has2Transitions = transitionTypes.size <= 2;
  // Award partial: 3 if <=2, 1 if <=4, 0 if >4
  const transPoints = transitionTypes.size <= 2 ? 3 : transitionTypes.size <= 4 ? 1 : 0;
  results.push({
    name: 'Video clips use max 2 transition types',
    category: 'VISUAL QUALITY',
    maxPoints: 3,
    earned: transPoints,
    passed: has2Transitions,
    detail: has2Transitions
      ? `Using ${transitionTypes.size} transition type(s): ${[...transitionTypes].join(', ')}`
      : `Using ${transitionTypes.size} transition types (${[...transitionTypes].join(', ')}) — feels chaotic, pick 2`,
    fix: has2Transitions ? undefined : 'Standardize on "fade" + one other transition (e.g., "zoom") — remove the rest',
  });

  // 5. At least one black gap between sections — 3 pts
  const mainVisuals = getMainVisualTrack(edit);
  let hasGap = false;
  for (let i = 1; i < mainVisuals.length; i++) {
    const prevEnd = mainVisuals[i - 1].start + mainVisuals[i - 1].length;
    const gap = mainVisuals[i].start - prevEnd;
    if (gap >= 0.2 && gap <= 0.5) { hasGap = true; break; }
  }
  results.push({
    name: 'Black gap (0.2-0.5s) between sections',
    category: 'VISUAL QUALITY',
    maxPoints: 3,
    earned: hasGap ? 3 : 0,
    passed: hasGap,
    detail: hasGap
      ? 'Found a breath gap between visual sections'
      : 'No short black gaps — add breathing room between acts',
    fix: hasGap ? undefined : 'Insert a 0.3s gap (no clip) between the hook and mid-section to create a visual beat',
  });

  // 6. No persistent watermark covering >50% of duration — 3 pts
  const watermarks = allVisuals.filter(c => {
    const coversPct = c.length / totalDuration;
    const isSmall = (c.scale ?? 1) <= 0.15 || (c.opacity ?? 1) <= 0.5;
    return coversPct > 0.5 && !isSmall;
  });
  const noLargeWatermark = watermarks.length === 0;
  results.push({
    name: 'No persistent watermark covering >50% of duration',
    category: 'VISUAL QUALITY',
    maxPoints: 3,
    earned: noLargeWatermark ? 3 : 0,
    passed: noLargeWatermark,
    detail: noLargeWatermark
      ? 'No large persistent overlays detected'
      : `${watermarks.length} clip(s) span >50% of the video at full size — distracting`,
    fix: noLargeWatermark ? undefined : 'Reduce watermark scale to <= 0.1 and opacity to <= 0.4, or shorten its duration',
  });

  // 7. Resolution is 1080 or higher — 2 pts
  const resPx = resolutionToPixels(edit.output?.resolution || '');
  const is1080 = resPx >= 1080;
  results.push({
    name: 'Resolution is 1080 or higher',
    category: 'VISUAL QUALITY',
    maxPoints: 2,
    earned: is1080 ? 2 : 0,
    passed: is1080,
    detail: is1080
      ? `Output resolution: ${edit.output.resolution} (${resPx}p)`
      : `Output resolution: ${edit.output.resolution} (${resPx}p) — should be 1080 or 4k`,
    fix: is1080 ? undefined : 'Set output.resolution to "1080" or "4k" for professional quality',
  });

  return results;
}

function runAudioQualityChecks(edit: ShotstackEdit): CheckResult[] {
  const results: CheckResult[] = [];
  const soundtrackSrc = edit.timeline.soundtrack?.src;
  const sfxClips = getAudioClips(edit);
  const sfxUrls = [...new Set(sfxClips.map(c => c.asset.src).filter(Boolean))];
  const videoClips = getVideoClips(edit);

  // 1. Soundtrack src is different from all SFX srcs — 5 pts (critical)
  const sfxMatchesSoundtrack = soundtrackSrc && sfxUrls.some(u => u === soundtrackSrc);
  const soundtrackDistinct = soundtrackSrc ? !sfxMatchesSoundtrack : false;
  results.push({
    name: 'Soundtrack src differs from all SFX clip srcs',
    category: 'AUDIO QUALITY',
    maxPoints: 5,
    earned: soundtrackDistinct ? 5 : 0,
    passed: soundtrackDistinct,
    detail: soundtrackDistinct
      ? 'Soundtrack and SFX use different audio files'
      : soundtrackSrc
        ? 'Soundtrack URL is reused as SFX — they will sound identical'
        : 'No soundtrack defined',
    fix: soundtrackDistinct ? undefined : 'Use different audio files for soundtrack vs SFX — search Pixabay for "cinematic impact" or "whoosh" for SFX',
  });

  // 2. At least 3 distinct SFX audio URLs — 3 pts
  const has3sfx = sfxUrls.length >= 3;
  results.push({
    name: 'At least 3 distinct SFX audio URLs',
    category: 'AUDIO QUALITY',
    maxPoints: 3,
    earned: has3sfx ? 3 : (sfxUrls.length >= 2 ? 1 : 0),
    passed: has3sfx,
    detail: has3sfx
      ? `${sfxUrls.length} distinct SFX sources used`
      : `Only ${sfxUrls.length} distinct SFX URL(s) — needs variety (impact, whoosh, riser)`,
    fix: has3sfx ? undefined : 'Add at least 3 different SFX files: cinematic impact, whoosh/swoosh, and riser/tension',
  });

  // 3. SFX clips align within 0.5s of video clip transitions — 4 pts
  const videoTransitionPoints = new Set<number>();
  videoClips.forEach(c => {
    videoTransitionPoints.add(c.start);
    videoTransitionPoints.add(c.start + c.length);
  });
  const transPoints = [...videoTransitionPoints];
  let alignedSfx = 0;
  sfxClips.forEach(sfx => {
    const isAligned = transPoints.some(tp => Math.abs(sfx.start - tp) <= 0.5);
    if (isAligned) alignedSfx++;
  });
  const alignPct = sfxClips.length > 0 ? alignedSfx / sfxClips.length : 0;
  const sfxAligned = alignPct >= 0.6;
  results.push({
    name: 'SFX aligned with video transitions (within 0.5s)',
    category: 'AUDIO QUALITY',
    maxPoints: 4,
    earned: sfxAligned ? 4 : Math.round(alignPct * 4),
    passed: sfxAligned,
    detail: sfxAligned
      ? `${alignedSfx}/${sfxClips.length} SFX clips are synced to cuts`
      : `${alignedSfx}/${sfxClips.length} SFX clips align to cuts — impacts should land on transitions`,
    fix: sfxAligned ? undefined : 'Move SFX clip start times to match video cut points (within 0.3s) for punchy transitions',
  });

  // 4. Soundtrack volume <= 0.8 — 3 pts
  const stVolume = edit.timeline.soundtrack?.volume;
  // Shotstack default soundtrack volume is 1.0 if not specified
  const effectiveVolume = stVolume ?? 1.0;
  const volumeOk = effectiveVolume <= 0.8;
  results.push({
    name: 'Soundtrack volume <= 0.8 (room for SFX)',
    category: 'AUDIO QUALITY',
    maxPoints: 3,
    earned: volumeOk ? 3 : 0,
    passed: volumeOk,
    detail: volumeOk
      ? `Soundtrack volume: ${effectiveVolume} — leaves headroom for SFX/VO`
      : `Soundtrack volume: ${effectiveVolume} — too loud, will drown out SFX`,
    fix: volumeOk ? undefined : 'Add volume: 0.6 to the soundtrack object to leave headroom for SFX and voiceover',
  });

  return results;
}

function runPacingChecks(edit: ShotstackEdit): CheckResult[] {
  const results: CheckResult[] = [];
  const totalDuration = getTotalDuration(edit);
  const titleClips = getTitleClips(edit);
  const mainVisuals = getMainVisualTrack(edit);
  const sfxClips = getAudioClips(edit);

  // 1. Total text cards <= duration / 3.5 — 3 pts
  const maxCards = Math.floor(totalDuration / 3.5);
  const cardCountOk = titleClips.length <= maxCards;
  results.push({
    name: `Text cards <= ${maxCards} (duration/3.5)`,
    category: 'PACING & ARC',
    maxPoints: 3,
    earned: cardCountOk ? 3 : 0,
    passed: cardCountOk,
    detail: cardCountOk
      ? `${titleClips.length} text cards for ${totalDuration.toFixed(0)}s video (max ${maxCards})`
      : `${titleClips.length} text cards for ${totalDuration.toFixed(0)}s video — too many (max ${maxCards})`,
    fix: cardCountOk ? undefined : `Remove ${titleClips.length - maxCards} text cards — combine short phrases or cut filler text`,
  });

  // 2. Average text card duration >= 2.0s — 3 pts
  const avgTextDur = titleClips.length > 0
    ? titleClips.reduce((s, c) => s + c.length, 0) / titleClips.length
    : 0;
  const avgDurOk = titleClips.length === 0 || avgTextDur >= 2.0;
  results.push({
    name: 'Average text card duration >= 2.0 seconds',
    category: 'PACING & ARC',
    maxPoints: 3,
    earned: avgDurOk ? 3 : 0,
    passed: avgDurOk,
    detail: avgDurOk
      ? `Average text duration: ${avgTextDur.toFixed(1)}s`
      : `Average text duration: ${avgTextDur.toFixed(1)}s — too fast to read comfortably`,
    fix: avgDurOk ? undefined : 'Increase short text clip lengths to at least 2.0s or reduce the number of text cards',
  });

  // 3. Shortest text card >= 1.5s — 2 pts
  const shortestText = titleClips.length > 0
    ? Math.min(...titleClips.map(c => c.length))
    : Infinity;
  const shortestOk = titleClips.length === 0 || shortestText >= 1.5;
  results.push({
    name: 'Shortest text card >= 1.5 seconds',
    category: 'PACING & ARC',
    maxPoints: 2,
    earned: shortestOk ? 2 : 0,
    passed: shortestOk,
    detail: shortestOk
      ? `Shortest text card: ${shortestText === Infinity ? 'N/A' : shortestText.toFixed(1) + 's'}`
      : `Shortest text card is ${shortestText.toFixed(1)}s — will flash past viewers`,
    fix: shortestOk ? undefined : `Increase the shortest text card to at least 1.5s`,
  });

  // 4. Climax moment in 60-80% of timeline — 4 pts
  const climaxStart = totalDuration * 0.6;
  const climaxEnd = totalDuration * 0.8;
  // Detect climax: rapid cuts (short clips) or loud SFX in the window
  const climaxVisuals = mainVisuals.filter(c => c.start >= climaxStart && c.start < climaxEnd);
  const climaxAvgDur = climaxVisuals.length > 1
    ? climaxVisuals.reduce((s, c) => s + c.length, 0) / climaxVisuals.length
    : Infinity;
  const climaxSfx = sfxClips.filter(c => c.start >= climaxStart && c.start < climaxEnd);
  const hasClimax = climaxAvgDur < 2.0 || climaxSfx.length >= 2;
  results.push({
    name: 'Climax moment exists in 60-80% of timeline',
    category: 'PACING & ARC',
    maxPoints: 4,
    earned: hasClimax ? 4 : 0,
    passed: hasClimax,
    detail: hasClimax
      ? `Climax zone (${climaxStart.toFixed(0)}-${climaxEnd.toFixed(0)}s): ${climaxVisuals.length} cuts, ${climaxSfx.length} SFX`
      : `No intensity build-up in ${climaxStart.toFixed(0)}-${climaxEnd.toFixed(0)}s zone`,
    fix: hasClimax ? undefined : `Add rapid cuts (1-1.5s each) and a big SFX hit between ${climaxStart.toFixed(0)}s and ${climaxEnd.toFixed(0)}s`,
  });

  // 5. CTA section is last 15-20% — 3 pts
  const ctaStart = totalDuration * 0.80;
  const ctaEnd = totalDuration * 0.85;
  const ctaTexts = titleClips.filter(c => {
    const t = (c.asset.text || '').toLowerCase();
    return t.includes('demonsanddeities') || t.includes('.com') || t.includes('mint') || t.includes('join') || t.includes('play now') || t.includes('sign up');
  });
  const hasCta = ctaTexts.some(c => c.start >= ctaStart);
  results.push({
    name: 'CTA section is in last 15-20% of timeline',
    category: 'PACING & ARC',
    maxPoints: 3,
    earned: hasCta ? 3 : 0,
    passed: hasCta,
    detail: hasCta
      ? `CTA found at ${ctaTexts.filter(c => c.start >= ctaStart)[0]?.start.toFixed(1)}s (last ${((1 - ctaStart / totalDuration) * 100).toFixed(0)}%)`
      : 'No CTA text found in the final section of the video',
    fix: hasCta ? undefined : `Add a clear CTA ("MINT YOUR PASS" or URL) starting at ${ctaStart.toFixed(0)}s or later`,
  });

  return results;
}

function runTextCopyChecks(edit: ShotstackEdit): CheckResult[] {
  const results: CheckResult[] = [];
  const titleClips = getTitleClips(edit);

  // 1. Uses at least 2 different title styles — 3 pts
  const styles = new Set(titleClips.map(c => c.asset.style || 'default'));
  const has2styles = styles.size >= 2;
  results.push({
    name: 'Uses at least 2 different title styles',
    category: 'TEXT & COPY',
    maxPoints: 3,
    earned: has2styles ? 3 : 0,
    passed: has2styles,
    detail: has2styles
      ? `${styles.size} styles used: ${[...styles].join(', ')}`
      : `Only "${[...styles][0] || 'none'}" style — lacks visual variety`,
    fix: has2styles ? undefined : 'Use style: "minimal" or "blockbuster" for some text cards alongside "future"',
  });

  // 2. Semi-transparent overlay track behind text — 4 pts
  // Look for an HTML clip or image clip with low opacity behind text
  const allClips = getAllClips(edit);
  const overlayClips = allClips.filter(c => {
    if (c.asset.type === 'html') return true;
    if (c.asset.type === 'image' && (c.opacity ?? 1) < 0.8 && (c.opacity ?? 1) > 0) return true;
    return false;
  });
  // Check if any overlay spans text areas
  const hasOverlay = overlayClips.length > 0;
  results.push({
    name: 'Semi-transparent overlay behind text sections',
    category: 'TEXT & COPY',
    maxPoints: 4,
    earned: hasOverlay ? 4 : 0,
    passed: hasOverlay,
    detail: hasOverlay
      ? `${overlayClips.length} overlay clip(s) found for text readability`
      : 'No background overlay behind text — text may be hard to read over bright video',
    fix: hasOverlay ? undefined : 'Add an HTML overlay track with a semi-transparent dark bar behind text sections for contrast',
  });

  // 3. Max 3 colors used for text — 3 pts
  const textColors = new Set(titleClips.map(c => (c.asset.color || '#ffffff').toLowerCase()));
  const max3colors = textColors.size <= 3;
  results.push({
    name: 'Max 3 text colors (brand consistency)',
    category: 'TEXT & COPY',
    maxPoints: 3,
    earned: max3colors ? 3 : 0,
    passed: max3colors,
    detail: max3colors
      ? `${textColors.size} text color(s): ${[...textColors].join(', ')}`
      : `${textColors.size} text colors used (${[...textColors].join(', ')}) — too many, pick 3`,
    fix: max3colors ? undefined : `Reduce to 3 brand colors (e.g., #c89b3c gold, #ffffff white, #8b5cf6 purple)`,
  });

  // 4. No text card has more than 6 words — 2 pts
  const longTexts = titleClips.filter(c => {
    const words = (c.asset.text || '').trim().split(/\s+/).length;
    return words > 6;
  });
  const noLongText = longTexts.length === 0;
  results.push({
    name: 'No text card has more than 6 words',
    category: 'TEXT & COPY',
    maxPoints: 2,
    earned: noLongText ? 2 : 0,
    passed: noLongText,
    detail: noLongText
      ? 'All text cards are punchy and concise'
      : `${longTexts.length} card(s) exceed 6 words: "${longTexts[0]?.asset.text}"`,
    fix: noLongText ? undefined : 'Shorten long text cards to 6 words max — trailer text should be punchy fragments',
  });

  // 5. Text sizes follow hierarchy — 3 pts
  const sizeOrder: Record<string, number> = {
    'xx-small': 1, 'x-small': 2, 'small': 3, 'medium': 4, 'large': 5, 'x-large': 6, 'xx-large': 7,
  };
  const titleSizes = titleClips.filter(c => {
    const t = (c.asset.text || '').toLowerCase();
    return (t.includes('demons') && t.includes('deities')) || t.length <= 15;
  }).map(c => sizeOrder[c.asset.size || 'medium'] || 4);
  const descSizes = titleClips.filter(c => {
    const t = (c.asset.text || '').toLowerCase();
    return t.length > 15 && !(t.includes('demons') && t.includes('deities'));
  }).map(c => sizeOrder[c.asset.size || 'medium'] || 4);

  const avgTitleSize = titleSizes.length > 0 ? titleSizes.reduce((a, b) => a + b, 0) / titleSizes.length : 0;
  const avgDescSize = descSizes.length > 0 ? descSizes.reduce((a, b) => a + b, 0) / descSizes.length : 0;
  const hierarchyOk = descSizes.length === 0 || avgTitleSize > avgDescSize;
  results.push({
    name: 'Text sizes follow hierarchy (titles > descriptions)',
    category: 'TEXT & COPY',
    maxPoints: 3,
    earned: hierarchyOk ? 3 : 0,
    passed: hierarchyOk,
    detail: hierarchyOk
      ? 'Title text is visually larger than descriptive text'
      : 'Titles and descriptions use similar sizes — no visual hierarchy',
    fix: hierarchyOk ? undefined : 'Use xx-large/x-large for key titles, medium/large for supporting text',
  });

  return results;
}

function runBrandCtaChecks(edit: ShotstackEdit): CheckResult[] {
  const results: CheckResult[] = [];
  const totalDuration = getTotalDuration(edit);
  const titleClips = getTitleClips(edit);
  const allVisuals = getVisualClips(edit);

  // 1. Last section contains URL or social handle — 3 pts
  const lastTitles = titleClips.filter(c => c.start + c.length >= totalDuration - 5);
  const hasUrl = lastTitles.some(c => {
    const t = (c.asset.text || '').toLowerCase();
    return t.includes('.com') || t.includes('@') || t.includes('http') || t.includes('.io') || t.includes('.gg');
  });
  results.push({
    name: 'Last section contains URL or social handle',
    category: 'BRAND & CTA',
    maxPoints: 3,
    earned: hasUrl ? 3 : 0,
    passed: hasUrl,
    detail: hasUrl
      ? 'URL/handle found in final section'
      : 'No URL or social handle in final 5 seconds — viewers have nowhere to go',
    fix: hasUrl ? undefined : 'Add a text card with "demonsanddeities.com" or "@DemonsDeities" in the last 5 seconds',
  });

  // 2. CTA text size is xx-large or x-large — 2 pts
  const ctaCards = titleClips.filter(c => {
    const t = (c.asset.text || '').toLowerCase();
    return t.includes('mint') || t.includes('join') || t.includes('play') || t.includes('.com') || t.includes('sign up');
  });
  const ctaSizeLarge = ctaCards.some(c => {
    const s = c.asset.size || '';
    return s === 'xx-large' || s === 'x-large';
  });
  results.push({
    name: 'CTA text size is xx-large or x-large',
    category: 'BRAND & CTA',
    maxPoints: 2,
    earned: ctaSizeLarge ? 2 : 0,
    passed: ctaSizeLarge,
    detail: ctaSizeLarge
      ? 'CTA text is large and prominent'
      : `CTA text size is ${ctaCards[0]?.asset.size || 'not found'} — needs to be xx-large`,
    fix: ctaSizeLarge ? undefined : 'Set CTA text size to "xx-large" so it dominates the end card',
  });

  // 3. Logo appears prominently at start AND end — 3 pts
  const logoClips = allVisuals.filter(c => {
    const src = (c.asset.src || '').toLowerCase();
    return src.includes('logo');
  });
  const brandTitles = titleClips.filter(c => {
    const t = (c.asset.text || '').toLowerCase();
    return t.includes('demons') && t.includes('deities');
  });
  const hasStart = logoClips.some(c => c.start < 5) || brandTitles.some(c => c.start < 5);
  const hasEnd = logoClips.some(c => c.start + c.length >= totalDuration - 6) || brandTitles.some(c => c.start + c.length >= totalDuration - 6);
  const logoBoth = hasStart && hasEnd;
  results.push({
    name: 'Logo/brand appears at start AND end',
    category: 'BRAND & CTA',
    maxPoints: 3,
    earned: logoBoth ? 3 : (hasStart || hasEnd ? 1 : 0),
    passed: logoBoth,
    detail: logoBoth
      ? 'Brand is bookended at open and close'
      : `Brand at start: ${hasStart ? 'yes' : 'NO'}, Brand at end: ${hasEnd ? 'yes' : 'NO'}`,
    fix: logoBoth ? undefined : `Add brand ${!hasStart ? 'at the start (first 5s)' : ''}${!hasStart && !hasEnd ? ' and ' : ''}${!hasEnd ? 'at the end (last 6s)' : ''} of the video`,
  });

  // 4. CTA duration is 4-6 seconds — 2 pts
  const ctaSection = titleClips.filter(c => c.start >= totalDuration * 0.85);
  const ctaDuration = ctaSection.length > 0
    ? Math.max(...ctaSection.map(c => c.start + c.length)) - Math.min(...ctaSection.map(c => c.start))
    : 0;
  const ctaDurOk = ctaDuration >= 4 && ctaDuration <= 6;
  results.push({
    name: 'CTA duration is 4-6 seconds',
    category: 'BRAND & CTA',
    maxPoints: 2,
    earned: ctaDurOk ? 2 : (ctaDuration >= 3 ? 1 : 0),
    passed: ctaDurOk,
    detail: ctaDurOk
      ? `CTA section spans ${ctaDuration.toFixed(1)}s`
      : `CTA section spans ${ctaDuration.toFixed(1)}s — ${ctaDuration < 4 ? 'too short, viewers need time to read' : 'too long, loses urgency'}`,
    fix: ctaDurOk ? undefined : `Adjust CTA section to be 4-6 seconds (currently ${ctaDuration.toFixed(1)}s)`,
  });

  return results;
}

function runTechnicalChecks(edit: ShotstackEdit): CheckResult[] {
  const results: CheckResult[] = [];
  const videoClips = getVideoClips(edit);

  // 1. FPS >= 60 — 3 pts
  const fps = edit.output?.fps ?? 25;
  const fps60 = fps >= 60;
  results.push({
    name: 'FPS >= 60',
    category: 'TECHNICAL',
    maxPoints: 3,
    earned: fps60 ? 3 : (fps >= 30 ? 1 : 0),
    passed: fps60,
    detail: fps60
      ? `Output FPS: ${fps}`
      : `Output FPS: ${fps} — ${fps < 30 ? 'too low, will look choppy' : 'acceptable but 60fps is smoother'}`,
    fix: fps60 ? undefined : 'Set output.fps to 60 for smooth playback',
  });

  // 2. No _comment or unknown keys — 2 pts
  let badKeys: string[] = [];
  function scanKeys(obj: any, path: string) {
    if (obj && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        if (key.startsWith('_')) badKeys.push(`${path}.${key}`);
        if (Array.isArray(obj[key])) obj[key].forEach((item: any, i: number) => scanKeys(item, `${path}.${key}[${i}]`));
        else if (typeof obj[key] === 'object' && obj[key] !== null) scanKeys(obj[key], `${path}.${key}`);
      }
    }
  }
  scanKeys(edit, 'root');
  const noUnknownKeys = badKeys.length === 0;
  results.push({
    name: 'No _comment or underscore-prefixed keys',
    category: 'TECHNICAL',
    maxPoints: 2,
    earned: noUnknownKeys ? 2 : 0,
    passed: noUnknownKeys,
    detail: noUnknownKeys
      ? 'Clean JSON — no underscore-prefixed keys'
      : `Found ${badKeys.length} forbidden key(s): ${badKeys.slice(0, 3).join(', ')}${badKeys.length > 3 ? '...' : ''}`,
    fix: noUnknownKeys ? undefined : `Remove these keys: ${badKeys.join(', ')} — Shotstack rejects underscore-prefixed properties`,
  });

  // 3. All video clips have volume: 0 — 3 pts
  const unmutedVideos = videoClips.filter(c => c.asset.volume !== 0);
  const allMuted = unmutedVideos.length === 0;
  results.push({
    name: 'All video clips have volume: 0 (muted source audio)',
    category: 'TECHNICAL',
    maxPoints: 3,
    earned: allMuted ? 3 : 0,
    passed: allMuted,
    detail: allMuted
      ? `All ${videoClips.length} video clips are muted`
      : `${unmutedVideos.length} video clip(s) have source audio enabled — will clash with soundtrack`,
    fix: allMuted ? undefined : 'Add volume: 0 to every video clip asset to mute stock footage source audio',
  });

  // 4. Output format is mp4 — 2 pts
  const isMp4 = edit.output?.format === 'mp4';
  results.push({
    name: 'Output format is mp4',
    category: 'TECHNICAL',
    maxPoints: 2,
    earned: isMp4 ? 2 : 0,
    passed: isMp4,
    detail: isMp4
      ? 'Output format: mp4'
      : `Output format: ${edit.output?.format || 'unknown'} — mp4 is universally compatible`,
    fix: isMp4 ? undefined : 'Set output.format to "mp4"',
  });

  return results;
}

// ─── Banned Asset IDs ─────────────────────────────────────────────

const SCREEN_RECORDING_IDS = [
  '34n1r', '34sed', '34xw8', '351k1', '358yx', '35jqt', '3ahfr', '3avzy',
  '3b6d3', '3bhk6', '3bwjd', '3c7h2', '3cjq8', '3cyme', '3d97v', 'kkznr',
  'knga2', 'kphkc', '1jfeg', '1jsqy', '1k0yc', '1k92f', '1kq23', '3q8yy',
  '3qn9b', '3r318', '3rhss',
];

const KEN_BURNS_IDS = ['x0tgh', 'x19tk', 'x108a', 'kq4zh', 'kqgdz'];

const THREE_SECOND_SOURCE_IDS = [
  'k86nd', 'k8awc', 'k8frk', 'k8mkk', 'k8rjv', 'k8wgp', 'k90pf', 'k95q1',
  'k9aqg', 'k9gc4', 'k9xr6', 'ka1zc', 'tzr6n', 'v00ys', 'v0bkx', 'v0k08',
  'kangd', 'kasza', 'v0rm2', 'tytgn', 'tzajj', 'tzjym', 'txtqw', 'tyc6m',
  'tyhy5', 'keb9q', 'kg6aq',
];

function urlContainsId(url: string, id: string): boolean {
  return url.includes(id);
}

function urlMatchesAnyId(url: string, ids: string[]): boolean {
  return ids.some(id => urlContainsId(url, id));
}

// ─── V5 Learned-Failure Checks ───────────────────────────────────

function runLearnedFailureChecks(edit: ShotstackEdit): CheckResult[] {
  const results: CheckResult[] = [];
  const allClips = getAllClips(edit);
  const totalDuration = getTotalDuration(edit);

  // ── 1. Screen Recording Detection (-5 pts each) ────────────────
  const screenRecClips: string[] = [];
  allClips.forEach(c => {
    const src = c.asset?.src || '';
    if (src && urlMatchesAnyId(src, SCREEN_RECORDING_IDS)) {
      screenRecClips.push(src);
    }
  });
  const screenRecPenalty = screenRecClips.length * 5;
  results.push({
    name: 'No screen recording clips (all confirmed failures)',
    category: 'CONTENT QUALITY',
    maxPoints: 0,
    earned: -screenRecPenalty,
    passed: screenRecClips.length === 0,
    detail: screenRecClips.length === 0
      ? 'No banned screen recording sources detected'
      : `${screenRecClips.length} screen recording clip(s) found — ALL are confirmed failures (broken pages, loading states, wrong content). -${screenRecPenalty} pts`,
    fix: screenRecClips.length > 0
      ? `Remove ALL screen recording clips. Replace with Segmind P2V animations or cinematic clips. Banned IDs found: ${screenRecClips.map(u => '...' + u.slice(-30)).join(', ')}`
      : undefined,
  });

  // ── 2. Ken Burns Detection (-3 pts each) ───────────────────────
  const kenBurnsClips: string[] = [];
  allClips.forEach(c => {
    const src = c.asset?.src || '';
    if (src && urlMatchesAnyId(src, KEN_BURNS_IDS)) {
      kenBurnsClips.push(src);
    }
  });
  const kenBurnsPenalty = kenBurnsClips.length * 3;
  results.push({
    name: 'No Ken Burns zoom clips (founder banned)',
    category: 'CONTENT QUALITY',
    maxPoints: 0,
    earned: -kenBurnsPenalty,
    passed: kenBurnsClips.length === 0,
    detail: kenBurnsClips.length === 0
      ? 'No banned Ken Burns zoom sources detected'
      : `${kenBurnsClips.length} Ken Burns zoom clip(s) found — BANNED by founder. Use Segmind P2V instead. -${kenBurnsPenalty} pts`,
    fix: kenBurnsClips.length > 0
      ? `Replace ALL Ken Burns clips with Segmind P2V (photo-to-video) animations. Banned IDs found: ${kenBurnsClips.map(u => '...' + u.slice(-30)).join(', ')}`
      : undefined,
  });

  // ── 3. Freeze Detection (3s source overrun) ────────────────────
  const freezeClips: Clip[] = [];
  allClips.forEach(c => {
    const src = c.asset?.src || '';
    if (src && urlMatchesAnyId(src, THREE_SECOND_SOURCE_IDS)) {
      // Known 3s source — flag if clip length >= 3 (will freeze at the end)
      if (c.length >= 3) {
        freezeClips.push(c);
      }
      // Also flag if trim is set AND length >= 3 (trim + length will overrun)
      if (c.asset?.trim !== undefined && c.length >= 3) {
        if (!freezeClips.includes(c)) freezeClips.push(c);
      }
    }
  });
  const freezePenalty = freezeClips.length * 3;
  results.push({
    name: 'No frozen-frame clips (3s source overrun)',
    category: 'CONTENT QUALITY',
    maxPoints: 0,
    earned: -freezePenalty,
    passed: freezeClips.length === 0,
    detail: freezeClips.length === 0
      ? 'No freeze-prone clips detected'
      : `${freezeClips.length} clip(s) will freeze — length >= 3s on a known 3-second source. -${freezePenalty} pts`,
    fix: freezeClips.length > 0
      ? `Shorten these clips to < 3s or replace with longer source footage. Frozen frames at the end of a clip are immediately noticeable.`
      : undefined,
  });

  // ── 4. Text Overlay Bleed Detection ────────────────────────────
  // For each HTML/title text clip, check if it extends past the underlying visual
  const textClips = allClips.filter(c => c.asset?.type === 'html' || c.asset?.type === 'title');
  const visualClips = allClips.filter(c => c.asset?.type === 'video' || c.asset?.type === 'image').sort((a, b) => a.start - b.start);
  let bleedCount = 0;
  textClips.forEach(tc => {
    const textEnd = tc.start + tc.length;
    // Find the visual clip that this text is supposed to overlay (closest start time <= text start)
    const underlying = visualClips.filter(vc => vc.start <= tc.start).pop();
    if (underlying) {
      const visualEnd = underlying.start + underlying.length;
      if (textEnd > visualEnd + 0.1) { // 0.1s tolerance
        bleedCount++;
      }
    }
  });
  const bleedPenalty = bleedCount * 2;
  results.push({
    name: 'No text overlay bleed past underlying scene',
    category: 'CONTENT QUALITY',
    maxPoints: 0,
    earned: -bleedPenalty,
    passed: bleedCount === 0,
    detail: bleedCount === 0
      ? 'All text overlays end within their underlying visual clips'
      : `${bleedCount} text overlay(s) extend past their underlying scene — text will appear over a black frame or wrong scene. -${bleedPenalty} pts`,
    fix: bleedCount > 0
      ? `Shorten text overlays so they end BEFORE their underlying video/image clip ends. Check start + length for each HTML/title clip.`
      : undefined,
  });

  // ── 5. Opening SFX Detection ───────────────────────────────────
  const sfxClips = getAudioClips(edit);
  const openingSfx = sfxClips.filter(c => c.start === 0);
  const openingSfxPenalty = openingSfx.length > 0 ? 2 : 0;
  results.push({
    name: 'No SFX at 0.0s (founder directive)',
    category: 'CONTENT QUALITY',
    maxPoints: 0,
    earned: -openingSfxPenalty,
    passed: openingSfx.length === 0,
    detail: openingSfx.length === 0
      ? 'No SFX starts at 0.0s — clean opening'
      : `${openingSfx.length} SFX clip(s) start at 0.0s — founder does not want SFX at the start. -${openingSfxPenalty} pts`,
    fix: openingSfx.length > 0
      ? `Move opening SFX to start at 0.5s or later. The video should open with music + visuals, not a jarring sound effect.`
      : undefined,
  });

  return results;
}

function runContentQualityChecks(edit: ShotstackEdit): CheckResult[] {
  const results: CheckResult[] = [];
  const tracks = edit.timeline.tracks;
  const totalDuration = getTotalDuration(edit);

  // Collect video clips with their track index for track-level analysis
  const videoClipsByTrack = new Map<number, Clip[]>();
  const imageClipsByTrack = new Map<number, Clip[]>();
  tracks.forEach((track, idx) => {
    const vids = track.clips.filter(c => c.asset?.type === 'video');
    const imgs = track.clips.filter(c => c.asset?.type === 'image');
    if (vids.length > 0) videoClipsByTrack.set(idx, vids);
    if (imgs.length > 0) imageClipsByTrack.set(idx, imgs);
  });

  const allVideoClips = getVideoClips(edit);
  const videoUrls = allVideoClips.map(c => c.asset.src || '').filter(Boolean);

  // ── 1. Unique video clips (0-5 pts) ──────────────────────────────
  const uniqueVideoUrls = new Set(videoUrls);
  const uniqueCount = uniqueVideoUrls.size;

  let uniquePts = 0;
  if (uniqueCount >= 11) uniquePts = 5;
  else if (uniqueCount >= 8) uniquePts = 3;
  else if (uniqueCount >= 5) uniquePts = 2;

  // Deduct 2 points if any single clip URL appears more than twice
  const videoUrlCounts = new Map<string, number>();
  videoUrls.forEach(url => videoUrlCounts.set(url, (videoUrlCounts.get(url) || 0) + 1));
  const overusedClips = [...videoUrlCounts.entries()].filter(([, count]) => count > 2);
  if (overusedClips.length > 0) {
    uniquePts = Math.max(0, uniquePts - 2);
  }

  results.push({
    name: 'Unique video clips in timeline',
    category: 'CONTENT QUALITY',
    maxPoints: 5,
    earned: uniquePts,
    passed: uniquePts >= 3,
    detail: uniqueCount >= 5
      ? `${uniqueCount} unique video clip URLs${overusedClips.length > 0 ? ` (WARNING: ${overusedClips.length} clip(s) used 3+ times — -2 pts)` : ''}`
      : `Only ${uniqueCount} unique video clip URLs — trailer will feel repetitive`,
    fix: uniquePts < 5
      ? `Add more unique video clips — currently ${uniqueCount}, aim for 11+ unique sources${overusedClips.length > 0 ? '. Remove clips used 3+ times: ' + overusedClips.map(([url]) => '"...' + url.slice(-35) + '"').join(', ') : ''}`
      : undefined,
  });

  // ── 2. Clip source diversity (0-3 pts) ───────────────────────────
  // Group by first 30 chars of URL path after the domain
  function extractSourceKey(url: string): string {
    try {
      const u = new URL(url);
      return u.hostname + '/' + u.pathname.slice(1, 31);
    } catch {
      // Fallback: first 40 chars
      return url.slice(0, 40);
    }
  }

  const sourceKeys = new Set(videoUrls.map(extractSourceKey));
  const sourceCount = sourceKeys.size;

  let diversityPts = 0;
  if (sourceCount >= 4) diversityPts = 3;
  else if (sourceCount >= 2) diversityPts = 1;

  results.push({
    name: 'Clip source diversity (different source videos)',
    category: 'CONTENT QUALITY',
    maxPoints: 3,
    earned: diversityPts,
    passed: diversityPts >= 1,
    detail: sourceCount >= 2
      ? `Video clips come from ${sourceCount} different source(s)`
      : `All video clips come from the same source — likely cut from one video`,
    fix: diversityPts < 3
      ? `Use clips from at least 4 different source videos/URLs — currently ${sourceCount} source(s)`
      : undefined,
  });

  // ── 3. No Pixabay video (0-3 pts) ───────────────────────────────
  const pixabayVideoClips = videoUrls.filter(url =>
    url.includes('pixabay.com') || url.includes('cdn.pixabay.com')
  );
  const noPixabayVideo = pixabayVideoClips.length === 0;

  results.push({
    name: 'No Pixabay video clips (banned source)',
    category: 'CONTENT QUALITY',
    maxPoints: 3,
    earned: noPixabayVideo ? 3 : 0,
    passed: noPixabayVideo,
    detail: noPixabayVideo
      ? 'No Pixabay video URLs detected — using original or premium footage'
      : `${pixabayVideoClips.length} video clip(s) use Pixabay footage — BANNED for trailers`,
    fix: noPixabayVideo
      ? undefined
      : 'Replace ALL Pixabay video clips with original game footage, IPFS-hosted clips, or premium stock. Pixabay video is banned.',
  });

  // ── 4. Image overlays properly layered (0-2 pts) ────────────────
  // Images should NOT share a track with video clips
  const tracksWithBoth = [...videoClipsByTrack.keys()].filter(idx => imageClipsByTrack.has(idx));
  const imagesProperlyLayered = tracksWithBoth.length === 0 && imageClipsByTrack.size > 0;
  // If there are no image clips at all, give full marks (no layering issue)
  const noImageClips = imageClipsByTrack.size === 0;
  const layerPts = noImageClips || imagesProperlyLayered ? 2 : 0;

  results.push({
    name: 'Image overlays on separate tracks from video',
    category: 'CONTENT QUALITY',
    maxPoints: 2,
    earned: layerPts,
    passed: layerPts === 2,
    detail: noImageClips
      ? 'No image clips (video-only timeline) — OK'
      : imagesProperlyLayered
        ? `Images on ${imageClipsByTrack.size} track(s), video on ${videoClipsByTrack.size} track(s) — properly layered`
        : `${tracksWithBoth.length} track(s) mix video and image clips — images should overlay on higher tracks`,
    fix: layerPts < 2
      ? 'Move image assets (logos, portraits) to a separate higher track (lower index) so they overlay the video base layer'
      : undefined,
  });

  // ── 5. Video base layer coverage (0-2 pts) ──────────────────────
  // Find the highest-numbered (deepest) track that contains video clips = base layer
  let baseTrackIdx = -1;
  for (let i = tracks.length - 1; i >= 0; i--) {
    if (tracks[i].clips.some(c => c.asset?.type === 'video')) {
      baseTrackIdx = i;
      break;
    }
  }

  let coveragePts = 0;
  let coveragePct = 0;
  if (baseTrackIdx >= 0 && totalDuration > 0) {
    const baseClips = tracks[baseTrackIdx].clips
      .filter(c => c.asset?.type === 'video')
      .sort((a, b) => a.start - b.start);

    // Merge overlapping intervals to compute total covered time
    const intervals: Array<[number, number]> = baseClips.map(c => [c.start, c.start + c.length]);
    const merged: Array<[number, number]> = [];
    for (const [s, e] of intervals) {
      if (merged.length > 0 && s <= merged[merged.length - 1][1] + 0.5) {
        // Allow 0.5s gap as intentional black beat
        merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
      } else {
        merged.push([s, e]);
      }
    }
    const coveredTime = merged.reduce((sum, [s, e]) => sum + (e - s), 0);
    coveragePct = coveredTime / totalDuration;

    if (coveragePct >= 0.95) coveragePts = 2;
    else if (coveragePct >= 0.80) coveragePts = 1;
  }

  results.push({
    name: 'Video base layer covers full timeline',
    category: 'CONTENT QUALITY',
    maxPoints: 2,
    earned: coveragePts,
    passed: coveragePts === 2,
    detail: baseTrackIdx >= 0
      ? `Base video track (track ${baseTrackIdx}) covers ${(coveragePct * 100).toFixed(0)}% of ${totalDuration.toFixed(1)}s timeline`
      : 'No video track found — cannot assess coverage',
    fix: coveragePts < 2
      ? `Fill gaps in the base video track — currently ${(coveragePct * 100).toFixed(0)}% coverage, need 95%+`
      : undefined,
  });

  return results;
}

// ─── Scoring & Output ──────────────────────────────────────────────

interface CategoryScore {
  name: string;
  earned: number;
  max: number;
}

function getLetterGrade(score: number): string {
  if (score >= 105) return 'A+';
  if (score >= 95) return 'A';
  if (score >= 85) return 'B';
  if (score >= 75) return 'C';
  if (score >= 65) return 'D';
  return 'F';
}

function renderBar(earned: number, max: number, barWidth: number): string {
  const filled = Math.round((earned / max) * barWidth);
  return '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);
}

function formatOutput(filename: string, allResults: CheckResult[]): string {
  const lines: string[] = [];
  const SEP = '\u2550'.repeat(45);

  // Group by category
  const categories = [
    'HOOK POWER', 'VISUAL QUALITY', 'AUDIO QUALITY',
    'PACING & ARC', 'TEXT & COPY', 'BRAND & CTA', 'TECHNICAL',
    'CONTENT QUALITY',
  ];

  const catScores: CategoryScore[] = categories.map(cat => {
    const checks = allResults.filter(r => r.category === cat);
    return {
      name: cat,
      earned: checks.reduce((s, c) => s + c.earned, 0),
      max: checks.reduce((s, c) => s + c.maxPoints, 0),
    };
  });

  const totalEarned = catScores.reduce((s, c) => s + c.earned, 0);
  const totalMax = catScores.reduce((s, c) => s + c.max, 0);
  const grade = getLetterGrade(totalEarned);

  lines.push('');
  lines.push(SEP);
  lines.push(`  VIDEO QUALITY AUDIT -- ${filename}`);
  lines.push(SEP);
  lines.push('');

  // Category bars
  for (const cat of catScores) {
    const label = `${cat.name}:`.padEnd(22);
    const score = `${cat.earned}/${cat.max}`.padStart(6);
    const bar = renderBar(cat.earned, cat.max, cat.max);
    lines.push(`${label} ${score}  ${bar}`);
  }

  lines.push('');
  // Separate base score (first 7 categories) from content quality
  const baseCategories = catScores.filter(c => c.name !== 'CONTENT QUALITY');
  const contentCategories = catScores.filter(c => c.name === 'CONTENT QUALITY');
  const baseEarned = baseCategories.reduce((s, c) => s + c.earned, 0);
  const baseMax = baseCategories.reduce((s, c) => s + c.max, 0);
  const contentEarned = contentCategories.reduce((s, c) => s + c.earned, 0);
  const contentMax = contentCategories.reduce((s, c) => s + c.max, 0);

  const totalLabel = 'TOTAL:'.padEnd(22);
  const totalScore = `${totalEarned}/${totalMax}`.padStart(6);
  const totalBar = renderBar(totalEarned, totalMax, 50);
  lines.push(`${totalLabel} ${totalScore}  ${totalBar}`);
  lines.push(`  (Base: ${baseEarned}/${baseMax} + Content Quality: ${contentEarned}/${contentMax})`);
  lines.push(`GRADE: ${grade}  (A+: 105+ | A: 95-104 | B: 85-94 | C: 75-84 | D: 65-74 | F: <65)`);

  // Critical failures
  const failures = allResults.filter(r => !r.passed).sort((a, b) => b.maxPoints - a.maxPoints);
  if (failures.length > 0) {
    lines.push('');
    lines.push(`${'='.repeat(3)} CRITICAL FAILURES ${'='.repeat(3)}`);
    for (const f of failures) {
      const lost = f.maxPoints - f.earned;
      lines.push(`  x ${f.category}: ${f.detail} (-${lost} pts)`);
    }
  }

  // Fixes ordered by point impact
  const fixes = failures.filter(f => f.fix).sort((a, b) => {
    const aImpact = a.maxPoints - a.earned;
    const bImpact = b.maxPoints - b.earned;
    return bImpact - aImpact;
  });
  if (fixes.length > 0) {
    lines.push('');
    lines.push(`${'='.repeat(3)} FIXES (ordered by point impact) ${'='.repeat(3)}`);
    fixes.forEach((f, i) => {
      const impact = f.maxPoints - f.earned;
      lines.push(`${(i + 1).toString().padStart(2)}. [+${impact} pts] ${f.fix}`);
    });
  }

  // What 100+ looks like
  lines.push('');
  lines.push(`${'='.repeat(3)} WHAT A 105+ SCORE (A+) LOOKS LIKE ${'='.repeat(3)}`);
  lines.push('  - 3+ rapid cuts in first 3 seconds, zero text');
  lines.push('  - 11+ unique video clips from 4+ different sources');
  lines.push('  - NO Pixabay video footage (use IPFS, game assets, premium stock)');
  lines.push('  - ZERO screen recordings (all confirmed failures — use P2V or cinematic clips)');
  lines.push('  - ZERO Ken Burns zoom clips (banned — use Segmind P2V instead)');
  lines.push('  - ZERO frozen frames (clip length must be < source duration)');
  lines.push('  - ZERO text overlays bleeding past their underlying scene');
  lines.push('  - No SFX at 0.0s (clean opening with music + visuals only)');
  lines.push('  - Video base layer covering 95%+ of the timeline');
  lines.push('  - Images on separate overlay tracks, not mixed with video');
  lines.push('  - 3+ distinct SFX types (impact, whoosh, riser)');
  lines.push('  - 8-10 text cards using 2+ styles');
  lines.push('  - Clean CTA with URL in xx-large text');
  lines.push('  - No clip reused more than twice');
  lines.push('');

  return lines.join('\n');
}

// ─── Main ──────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Video Quality Audit\n');
    console.log('Usage:');
    console.log('  npx ts-node scripts/marketing/video-quality-audit.ts <shotstack-json-file>');
    console.log('');
    console.log('Example:');
    console.log('  npx ts-node scripts/marketing/video-quality-audit.ts scripts/marketing/blueprints/cinematic-trailer-v7-45s.shotstack.json');
    process.exit(0);
  }

  const filePath = resolve(args[0]);
  const filename = basename(filePath);

  let edit: ShotstackEdit;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    edit = JSON.parse(raw);
  } catch (err: any) {
    console.error(`Failed to read/parse ${filePath}: ${err.message}`);
    process.exit(1);
  }

  if (!edit.timeline || !edit.timeline.tracks) {
    console.error('Invalid Shotstack JSON: missing timeline or tracks');
    process.exit(1);
  }

  // Run all checks
  const allResults: CheckResult[] = [
    ...runHookPowerChecks(edit),
    ...runVisualQualityChecks(edit),
    ...runAudioQualityChecks(edit),
    ...runPacingChecks(edit),
    ...runTextCopyChecks(edit),
    ...runBrandCtaChecks(edit),
    ...runTechnicalChecks(edit),
    ...runContentQualityChecks(edit),
    ...runLearnedFailureChecks(edit),
  ];

  // Output
  const output = formatOutput(filename, allResults);
  console.log(output);

  // Exit code: 0 if 70+, 1 if below
  const total = allResults.reduce((s, c) => s + c.earned, 0);
  process.exit(total >= 75 ? 0 : 1);
}

main();
