/**
 * Demons & Deities — Blueprint to Shotstack Renderer
 *
 * Takes a scene blueprint (from video-analyze-reference.ts) and converts it
 * into a Shotstack Edit API payload using D&D game assets.
 *
 * The blueprint defines structure/pacing/mood. This script maps each scene
 * to actual game assets (portraits, backgrounds, 3D renders, text) and
 * produces a renderable Shotstack timeline.
 *
 * Usage:
 *   # Render from a blueprint
 *   npx ts-node scripts/marketing/video-blueprint-to-shotstack.ts \
 *     --blueprint scripts/marketing/blueprints/my-reference.blueprint.json
 *
 *   # Preview without rendering (outputs JSON)
 *   npx ts-node scripts/marketing/video-blueprint-to-shotstack.ts \
 *     --blueprint scripts/marketing/blueprints/my-reference.blueprint.json --preview
 *
 *   # Render a specific part (for multi-part series)
 *   npx ts-node scripts/marketing/video-blueprint-to-shotstack.ts \
 *     --blueprint ... --part 1 --title "Chapter I: Genesis"
 *
 *   # Render vertical (TikTok/Reels)
 *   npx ts-node scripts/marketing/video-blueprint-to-shotstack.ts \
 *     --blueprint ... --aspect 9:16
 *
 * Environment:
 *   SHOTSTACK_API_KEY=<your key from shotstack.io>
 *   SHOTSTACK_ENV=stage|v1 (stage for testing, v1 for production renders)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const SHOTSTACK_API_KEY = process.env.SHOTSTACK_API_KEY;
const SHOTSTACK_ENV = process.env.SHOTSTACK_ENV || 'stage';
const SHOTSTACK_BASE = `https://api.shotstack.io/${SHOTSTACK_ENV}`;

// ─── D&D Asset Library ─────────────────────────────────────────────
const GAME_URL = 'https://play.demonsanddeities.com';
const WEBSITE_URL = 'https://demonsanddeities.com';

// Discover character portraits dynamically
function getCharacterPortraits(): string[] {
  const portraitsDir = join(ROOT, 'frontend', 'public', 'images', 'characters');
  if (!existsSync(portraitsDir)) return [];
  return readdirSync(portraitsDir)
    .filter(f => f.endsWith('.png'))
    .map(f => `${GAME_URL}/images/characters/${f}`);
}

// Key visual assets
const ASSETS = {
  logo: `${GAME_URL}/images/dd-logo-icon.png`,
  coverArt: `${GAME_URL}/images/home-cover-art.png`,
  foundersPass: `${WEBSITE_URL}/images/founders-pass-final.png`,
  backgrounds: [
    `${GAME_URL}/images/pages/home-cover-art.png`,
    `${GAME_URL}/images/pages/arena-bg.jpg`,
    `${GAME_URL}/images/pages/collection-bg.jpg`,
    `${GAME_URL}/images/pages/marketplace-bg.jpg`,
    `${GAME_URL}/images/pages/shop-bg.jpg`,
    `${GAME_URL}/images/pages/leaderboard-bg.jpg`,
  ],
  packs: [
    `${GAME_URL}/images/packs/genesis-crystal.png`,
    `${GAME_URL}/images/packs/cosmic-crystal.png`,
    `${GAME_URL}/images/packs/soul-crystal.png`,
    `${GAME_URL}/images/packs/void-crystal.png`,
  ],
  portraits: getCharacterPortraits(),
};

// Pick N random portraits, shuffled
function pickPortraits(n: number): string[] {
  const shuffled = [...ASSETS.portraits].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

// ─── D&D text overlays for each scene type ─────────────────────────
const DD_TEXT: Record<string, string[]> = {
  text_reveal: [
    'DEMONS AND DEITIES',
    '72 HEROES. 14 FACTIONS.',
    'YOUR ARMY. YOUR CARDS. YOUR GAME.',
    'THE COSMIC AUTO-BATTLER',
    'COLLECT. STRATEGIZE. CONQUER.',
    'OWN EVERYTHING YOU EARN.',
  ],
  character_showcase: [
    'CHOOSE YOUR CHAMPIONS',
    'FORGE UNBREAKABLE SYNERGIES',
    '14 COSMIC FACTIONS',
    'EVERY HERO HAS A STORY',
  ],
  gameplay_montage: [
    'STRATEGIC DEPTH',
    'EVERY ROUND MATTERS',
    'OUTPLAY. OUTBUILD. OUTLAST.',
    'TFT-STYLE COMBAT',
  ],
  cinematic: [
    'A WAR ACROSS DIMENSIONS',
    'LIGHT AND SHADOW COLLIDE',
    'THE BATTLE FOR ETERNITY',
  ],
  logo_reveal: [
    'DEMONS & DEITIES',
    'PLAY NOW',
    'demonsanddeities.com',
  ],
  title_card: [
    "FOUNDER'S PASS — 200 SUPPLY",
    'DDT TOKEN — 500M SUPPLY',
    'NFT CARDS ON POLYGON',
    'ZERO PAY-TO-WIN',
  ],
  particle_effect: [],
  transition: [],
  environment: [],
  rapid_cuts: [
    'PLEIADIAN • SIRIAN • ARCTURIAN',
    'ANUNNAKI • LUCIFERIAN • REPTILIAN',
    'ORION • LEMURIAN • ATLANTEAN',
  ],
  split_screen: [],
  slow_motion: [],
};

// ─── Scene to Shotstack clip mapper ────────────────────────────────
interface SceneBlueprint {
  scene_number: number;
  timestamp_start: number;
  timestamp_end: number;
  duration: number;
  scene_type: string;
  visual_description: string;
  camera_motion: string;
  transition_in: string;
  transition_out: string;
  text_overlay: string | null;
  text_style: string | null;
  color_palette: string[];
  audio_cue: string;
  energy_level: number;
  effects: string[];
  ken_burns: string | null;
  speed: string;
}

function mapTransition(t: string): string | undefined {
  const map: Record<string, string> = {
    fade_in: 'fade', fade_out: 'fade',
    dissolve: 'fade',
    slide_left: 'slideLeft', slide_right: 'slideRight',
    zoom_in: 'zoom', zoom_out: 'zoom',
    flash: 'fade',
    wipe: 'slideRight',
    cut: 'fade', // Shotstack doesn't have "cut" — use very short fade
  };
  return map[t] || 'fade';
}

function mapEffect(scene: SceneBlueprint): string | undefined {
  if (scene.ken_burns?.includes('zoom_in') || scene.camera_motion === 'zoom_in') return 'zoomIn';
  if (scene.ken_burns?.includes('zoom_out') || scene.camera_motion === 'zoom_out') return 'zoomOut';
  if (scene.camera_motion === 'pan_left') return 'slideLeft';
  if (scene.camera_motion === 'pan_right') return 'slideRight';
  return undefined;
}

function mapTextSize(style: string | null, energy: number): string {
  if (style === 'large_title' || style === 'kinetic_typography') return 'xx-large';
  if (style === 'subtitle') return 'large';
  if (style === 'small_caption') return 'small';
  if (energy >= 8) return 'xx-large';
  if (energy >= 5) return 'large';
  return 'medium';
}

// Pick the most luminous (visible on dark background) color from the palette
function pickTextColor(palette: string[]): string {
  if (!palette || palette.length === 0) return '#ffffff';
  let best = palette[0];
  let bestLum = 0;
  for (const hex of palette) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum > bestLum) { bestLum = lum; best = hex; }
  }
  // If the brightest color is still very dark, fall back to white
  return bestLum < 40 ? '#ffffff' : best;
}

let portraitIndex = 0;
let bgIndex = 0;
let textIndex: Record<string, number> = {};

function getNextText(sceneType: string, originalText: string | null): string | null {
  // Use D&D branded text instead of reference video text
  const pool = DD_TEXT[sceneType] || [];
  if (pool.length === 0) return originalText;
  if (!textIndex[sceneType]) textIndex[sceneType] = 0;
  const text = pool[textIndex[sceneType] % pool.length];
  textIndex[sceneType]++;
  return text;
}

function getAssetForScene(scene: SceneBlueprint): string {
  switch (scene.scene_type) {
    case 'character_showcase':
    case 'rapid_cuts': {
      const portraits = ASSETS.portraits;
      if (portraits.length === 0) return ASSETS.coverArt;
      const p = portraits[portraitIndex % portraits.length];
      portraitIndex++;
      return p;
    }
    case 'cinematic':
    case 'environment':
    case 'slow_motion':
      return ASSETS.backgrounds[bgIndex++ % ASSETS.backgrounds.length];
    case 'logo_reveal':
      return ASSETS.logo;
    case 'title_card':
      return ASSETS.foundersPass;
    default:
      return ASSETS.backgrounds[bgIndex++ % ASSETS.backgrounds.length];
  }
}

// ─── Build Shotstack timeline from blueprint ───────────────────────
interface ShotstackEdit {
  timeline: {
    soundtrack?: { src: string; effect?: string };
    background: string;
    tracks: Array<{ clips: any[] }>;
  };
  output: {
    format: string;
    resolution: string;
    fps?: number;
    aspectRatio?: string;
  };
}

function blueprintToShotstack(
  blueprint: any,
  options: { part?: number; partTitle?: string; aspectRatio?: string; musicUrl?: string }
): ShotstackEdit {
  const scenes: SceneBlueprint[] = blueprint.scenes;

  // Reset indices
  portraitIndex = 0;
  bgIndex = 0;
  textIndex = {};

  // Track 1: Visual content (backgrounds, portraits, etc.)
  const visualClips: any[] = [];

  // Track 2: Text overlays
  const textClips: any[] = [];

  // Track 3: Logo watermark (persistent — covers full video including end card)
  const blueprintDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const endCardDuration = 3.5;
  const partOffset = (options.part && options.partTitle) ? 3 : 0;
  const fullVideoDuration = blueprintDuration + partOffset + endCardDuration;
  const logoClips: any[] = [{
    asset: { type: 'image', src: ASSETS.logo },
    start: 0,
    length: fullVideoDuration,
    position: 'topRight',
    offset: { x: -0.03, y: 0.03 },
    scale: 0.06,
    opacity: 0.5,
    fit: 'contain',
  }];

  // Part title card (if multi-part series)
  if (options.part && options.partTitle) {
    textClips.push({
      asset: {
        type: 'title',
        text: `Part ${options.part}`,
        style: 'future',
        size: 'large',
        color: '#c89b3c',
      },
      start: 0,
      length: 2,
      transition: { in: 'fade', out: 'fade' },
    });
    textClips.push({
      asset: {
        type: 'title',
        text: options.partTitle,
        style: 'future',
        size: 'xx-large',
        color: '#ffffff',
      },
      start: 0.5,
      length: 2.5,
      transition: { in: 'fade', out: 'fade' },
    });
    // Dark background for title card
    visualClips.push({
      asset: { type: 'image', src: ASSETS.coverArt },
      start: 0,
      length: 3,
      effect: 'zoomIn',
      transition: { out: 'fade' },
      fit: 'cover',
    });
  }

  // Map each blueprint scene to Shotstack clips
  for (const scene of scenes) {
    const start = (options.part && options.partTitle) ? scene.timestamp_start + 3 : scene.timestamp_start;
    const duration = Math.max(scene.duration, 0.5); // minimum 0.5s

    // Visual clip
    const assetUrl = getAssetForScene(scene);
    const effect = mapEffect(scene);

    visualClips.push({
      asset: { type: 'image', src: assetUrl },
      start,
      length: duration,
      ...(effect ? { effect } : {}),
      transition: {
        in: mapTransition(scene.transition_in),
        out: mapTransition(scene.transition_out),
      },
      fit: 'cover',
    });

    // Text overlay clip (if scene has text)
    const ddText = getNextText(scene.scene_type, scene.text_overlay);
    if (ddText) {
      const textStart = start + 0.2; // slight delay after visual
      const textDuration = Math.max(duration - 0.4, 0.5);

      textClips.push({
        asset: {
          type: 'title',
          text: ddText,
          style: 'future',
          size: mapTextSize(scene.text_style, scene.energy_level),
          color: pickTextColor(scene.color_palette),
          position: scene.text_style === 'small_caption' ? 'bottom' : 'center',
        },
        start: textStart,
        length: textDuration,
        transition: {
          in: 'fade',
          out: 'fade',
        },
      });
    }
  }

  // End card: logo reveal + CTA
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0) + (options.part ? 3 : 0);
  textClips.push({
    asset: {
      type: 'title',
      text: 'DEMONS & DEITIES',
      style: 'future',
      size: 'xx-large',
      color: '#c89b3c',
    },
    start: totalDuration,
    length: 3,
    transition: { in: 'fade', out: 'fade' },
  });
  textClips.push({
    asset: {
      type: 'title',
      text: 'demonsanddeities.com',
      style: 'future',
      size: 'medium',
      color: '#ffffff',
      position: 'bottom',
    },
    start: totalDuration + 0.5,
    length: 3,
    transition: { in: 'fade', out: 'fade' },
  });
  visualClips.push({
    asset: { type: 'image', src: ASSETS.coverArt },
    start: totalDuration,
    length: 3.5,
    effect: 'zoomIn',
    transition: { in: 'fade' },
    fit: 'cover',
  });

  return {
    timeline: {
      ...(options.musicUrl ? { soundtrack: { src: options.musicUrl, effect: 'fadeInFadeOut' } } : {}),
      background: '#0a0a0f',
      tracks: [
        { clips: textClips },   // foreground: text
        { clips: logoClips },   // mid: watermark
        { clips: visualClips }, // background: images
      ],
    },
    output: {
      format: 'mp4',
      resolution: 'hd',
      fps: 30,
      ...(options.aspectRatio ? { aspectRatio: options.aspectRatio } : {}),
    },
  };
}

// ─── Render via Shotstack API ──────────────────────────────────────
async function renderOnShotstack(edit: ShotstackEdit): Promise<string | null> {
  if (!SHOTSTACK_API_KEY) {
    console.warn('[Shotstack] No API key — outputting JSON instead');
    return null;
  }

  const res = await fetch(`${SHOTSTACK_BASE}/render`, {
    method: 'POST',
    headers: {
      'x-api-key': SHOTSTACK_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(edit),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Shotstack error ${res.status}: ${err}`);
    return null;
  }

  const data = await res.json() as any;
  return data.response?.id || null;
}

async function checkRenderStatus(renderId: string): Promise<void> {
  if (!SHOTSTACK_API_KEY) return;

  const res = await fetch(`${SHOTSTACK_BASE}/render/${renderId}`, {
    headers: { 'x-api-key': SHOTSTACK_API_KEY },
  });

  const data = await res.json() as any;
  const status = data.response?.status;
  const url = data.response?.url;

  console.log(`  Status: ${status}`);
  if (url) console.log(`  📥 Download: ${url}`);
}

// ─── Main ──────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Blueprint to Shotstack Renderer — Demons & Deities\n');
    console.log('Usage:');
    console.log('  --blueprint <path>     Blueprint JSON file (required)');
    console.log('  --shotstack <path>     Pre-built Shotstack JSON file (render directly)');
    console.log('  --preview              Output Shotstack JSON without rendering');
    console.log('  --part <n>             Part number (for series: Part 1, Part 2, etc.)');
    console.log('  --title "Chapter I"    Part title');
    console.log('  --aspect 9:16          Aspect ratio (default: 16:9)');
    console.log('  --music <url>          Background music URL');
    console.log('  --status <render-id>   Check render status');
    console.log('\nEnvironment: SHOTSTACK_API_KEY, SHOTSTACK_ENV (stage|v1)');
    return;
  }

  // Check render status
  if (args[0] === '--status' && args[1]) {
    await checkRenderStatus(args[1]);
    return;
  }

  // Parse args
  let blueprintPath: string | undefined;
  let shotstackPath: string | undefined;
  let preview = false;
  let part: number | undefined;
  let partTitle: string | undefined;
  let aspectRatio: string | undefined;
  let musicUrl: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--blueprint' && args[i + 1]) blueprintPath = args[++i];
    if (args[i] === '--shotstack' && args[i + 1]) shotstackPath = args[++i];
    if (args[i] === '--preview') preview = true;
    if (args[i] === '--part' && args[i + 1]) part = parseInt(args[++i]);
    if (args[i] === '--title' && args[i + 1]) partTitle = args[++i];
    if (args[i] === '--aspect' && args[i + 1]) aspectRatio = args[++i];
    if (args[i] === '--music' && args[i + 1]) musicUrl = args[++i];
  }

  // Direct render of a pre-built .shotstack.json
  if (shotstackPath) {
    if (!existsSync(shotstackPath)) {
      console.error(`Shotstack file not found: ${shotstackPath}`);
      process.exit(1);
    }
    const edit = JSON.parse(readFileSync(shotstackPath, 'utf-8')) as ShotstackEdit;
    const totalClips = edit.timeline.tracks.reduce((sum, t) => sum + t.clips.length, 0);
    console.log(`\n🎬 Shotstack direct render: ${shotstackPath}`);
    console.log(`   Tracks: ${edit.timeline.tracks.length}, Clips: ${totalClips}\n`);
    if (preview || !SHOTSTACK_API_KEY) {
      console.log('📄 Preview mode — set SHOTSTACK_API_KEY to render.');
      console.log(JSON.stringify(edit, null, 2));
      return;
    }
    console.log('🚀 Submitting to Shotstack...\n');
    const renderId = await renderOnShotstack(edit);
    if (renderId) {
      console.log(`✅ Render submitted! ID: ${renderId}`);
      console.log(`   Check status: npx ts-node scripts/marketing/video-blueprint-to-shotstack.ts --status ${renderId}`);
    } else {
      console.log('❌ Render failed');
    }
    return;
  }

  if (!blueprintPath) {
    console.error('Missing --blueprint <path> or --shotstack <path>');
    process.exit(1);
  }

  if (!existsSync(blueprintPath)) {
    console.error(`Blueprint not found: ${blueprintPath}`);
    process.exit(1);
  }

  const blueprint = JSON.parse(readFileSync(blueprintPath, 'utf-8'));

  console.log(`\n🎬 Converting blueprint to Shotstack edit\n`);
  console.log(`  Source: ${blueprint.source?.name || 'unknown'}`);
  console.log(`  Scenes: ${blueprint.scenes?.length || 0}`);
  console.log(`  Duration: ${blueprint.metadata?.total_duration || '?'}s`);
  console.log(`  Mood: ${blueprint.metadata?.mood || '?'}`);
  if (part) console.log(`  Part: ${part} — ${partTitle || 'Untitled'}`);
  console.log('');

  const edit = blueprintToShotstack(blueprint, { part, partTitle, aspectRatio, musicUrl });

  if (preview || !SHOTSTACK_API_KEY) {
    // Output JSON
    const outPath = blueprintPath.replace('.blueprint.json', '.shotstack.json');
    writeFileSync(outPath, JSON.stringify(edit, null, 2));
    console.log(`📄 Shotstack edit saved: ${outPath}`);
    console.log(`   Tracks: ${edit.timeline.tracks.length}`);
    console.log(`   Total clips: ${edit.timeline.tracks.reduce((sum, t) => sum + t.clips.length, 0)}`);
    if (!SHOTSTACK_API_KEY) {
      console.log('\n   Set SHOTSTACK_API_KEY to render. Using --preview mode.');
    }
    console.log(`\n   To render: remove --preview flag (or set SHOTSTACK_API_KEY)`);
    return;
  }

  // Render
  console.log('🚀 Submitting to Shotstack...\n');
  const renderId = await renderOnShotstack(edit);
  if (renderId) {
    console.log(`✅ Render submitted! ID: ${renderId}`);
    console.log(`   Check status: npx ts-node scripts/marketing/video-blueprint-to-shotstack.ts --status ${renderId}`);
  } else {
    console.log('❌ Render failed');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
