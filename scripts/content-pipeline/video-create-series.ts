/**
 * Demons & Deities — Multi-Part Video Series Creator
 *
 * Creates a series of blueprints for a multi-part cinematic trailer.
 * Each part has a different theme/focus while maintaining consistent branding.
 *
 * Usage:
 *   # Generate all 5 parts
 *   npx ts-node scripts/marketing/video-create-series.ts
 *
 *   # Generate a specific part
 *   npx ts-node scripts/marketing/video-create-series.ts --part 1
 *
 *   # Render a part via Shotstack
 *   npx ts-node scripts/marketing/video-blueprint-to-shotstack.ts \
 *     --blueprint scripts/marketing/blueprints/dd-series-part1.blueprint.json \
 *     --part 1 --title "Genesis"
 */

import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const BLUEPRINTS_DIR = join(ROOT, 'scripts', 'marketing', 'blueprints');
const GAME_URL = 'https://play.demonsanddeities.com';

// Get character portraits
function getPortraits(): string[] {
  const dir = join(ROOT, 'frontend', 'public', 'images', 'characters');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.png')).map(f => `${GAME_URL}/images/characters/${f}`);
}

const portraits = getPortraits();

// ─── Series structure ──────────────────────────────────────────────
interface SeriesPart {
  part: number;
  title: string;
  subtitle: string;
  duration: number; // target seconds
  mood: string;
  color_grade: string;
  pacing: string;
  focus: string;
  scenes: Array<{
    scene_type: string;
    duration: number;
    text_overlay: string | null;
    text_style: string | null;
    visual_description: string;
    camera_motion: string;
    transition_in: string;
    transition_out: string;
    energy_level: number;
    effects: string[];
    color_palette: string[];
    audio_cue: string;
    ken_burns: string | null;
    speed: string;
  }>;
}

const SERIES: SeriesPart[] = [
  // ─── PART 1: GENESIS — World introduction ───────────────────────
  {
    part: 1,
    title: 'Genesis',
    subtitle: 'The cosmic war begins',
    duration: 45,
    mood: 'mysterious',
    color_grade: 'cinematic',
    pacing: 'slow_build',
    focus: 'World and lore introduction',
    scenes: [
      { scene_type: 'cinematic', duration: 3, text_overlay: null, text_style: null, visual_description: 'Deep space — stars, nebulae, cosmic void', camera_motion: 'zoom_in', transition_in: 'fade_in', transition_out: 'dissolve', energy_level: 2, effects: ['particles'], color_palette: ['#0a0a0f', '#1a1a2f', '#c89b3c'], audio_cue: 'ambient', ken_burns: 'zoom_in', speed: 'slow_0.5x' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: 'IN THE SPACE BETWEEN WORLDS', text_style: 'large_title', visual_description: 'Dark void with distant golden light', camera_motion: 'static', transition_in: 'fade_in', transition_out: 'fade_out', energy_level: 3, effects: ['glow'], color_palette: ['#0a0a0f', '#c89b3c'], audio_cue: 'orchestral_swell', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: 'A WAR HAS RAGED FOR MILLENNIA', text_style: 'large_title', visual_description: 'Cosmic energy streaks across darkness', camera_motion: 'pan_right', transition_in: 'fade_in', transition_out: 'fade_out', energy_level: 4, effects: ['particles', 'glow'], color_palette: ['#0a0a0f', '#e84040', '#7dc8ff'], audio_cue: 'orchestral_swell', ken_burns: null, speed: 'normal' },
      { scene_type: 'character_showcase', duration: 3, text_overlay: 'DEMONS', text_style: 'large_title', visual_description: 'Dark faction character — menacing, powerful', camera_motion: 'zoom_in', transition_in: 'flash', transition_out: 'dissolve', energy_level: 6, effects: ['glow', 'particles', 'chromatic_aberration'], color_palette: ['#e84040', '#0a0a0f', '#ff6b6b'], audio_cue: 'impact_hit', ken_burns: 'zoom_in', speed: 'normal' },
      { scene_type: 'character_showcase', duration: 3, text_overlay: 'DEITIES', text_style: 'large_title', visual_description: 'Light faction character — radiant, divine', camera_motion: 'zoom_in', transition_in: 'flash', transition_out: 'dissolve', energy_level: 6, effects: ['glow', 'lens_flare', 'particles'], color_palette: ['#7dc8ff', '#c89b3c', '#ffffff'], audio_cue: 'impact_hit', ken_burns: 'zoom_in', speed: 'normal' },
      { scene_type: 'rapid_cuts', duration: 2, text_overlay: null, text_style: null, visual_description: 'Rapid flash of multiple character portraits', camera_motion: 'static', transition_in: 'flash', transition_out: 'flash', energy_level: 8, effects: ['chromatic_aberration'], color_palette: ['#c89b3c', '#8b5cf6', '#10b981'], audio_cue: 'bass_drop', ken_burns: null, speed: 'fast_2x' },
      { scene_type: 'rapid_cuts', duration: 2, text_overlay: null, text_style: null, visual_description: 'More character portraits — different factions', camera_motion: 'static', transition_in: 'flash', transition_out: 'flash', energy_level: 8, effects: ['chromatic_aberration'], color_palette: ['#e84040', '#06b6d4', '#f97316'], audio_cue: 'electronic_pulse', ken_burns: null, speed: 'fast_2x' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: '72 HEROES', text_style: 'kinetic_typography', visual_description: 'Number reveals with particle burst', camera_motion: 'static', transition_in: 'flash', transition_out: 'dissolve', energy_level: 7, effects: ['particles', 'glow'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'impact_hit', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: '14 COSMIC FACTIONS', text_style: 'kinetic_typography', visual_description: 'Faction symbols appearing', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 7, effects: ['particles', 'glow'], color_palette: ['#8b5cf6', '#ffffff'], audio_cue: 'whoosh', ken_burns: null, speed: 'normal' },
      { scene_type: 'character_showcase', duration: 4, text_overlay: 'CHOOSE YOUR CHAMPIONS', text_style: 'subtitle', visual_description: 'Hero character portrait — most striking design', camera_motion: 'zoom_in', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 6, effects: ['glow', 'particles'], color_palette: ['#c89b3c', '#0a0a0f'], audio_cue: 'orchestral_swell', ken_burns: 'zoom_in', speed: 'normal' },
      { scene_type: 'environment', duration: 3, text_overlay: 'FORGE UNBREAKABLE SYNERGIES', text_style: 'subtitle', visual_description: 'Arena board with units — strategic depth', camera_motion: 'pan_right', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 5, effects: ['glow'], color_palette: ['#10b981', '#0a0a0f'], audio_cue: 'ambient', ken_burns: 'pan_left', speed: 'normal' },
      { scene_type: 'text_reveal', duration: 2.5, text_overlay: 'OWN EVERYTHING YOU EARN', text_style: 'large_title', visual_description: 'Golden text on dark background', camera_motion: 'static', transition_in: 'fade_in', transition_out: 'dissolve', energy_level: 7, effects: ['glow', 'particles'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'bass_drop', ken_burns: null, speed: 'normal' },
      { scene_type: 'title_card', duration: 3, text_overlay: 'NFT CARDS ON POLYGON', text_style: 'subtitle', visual_description: 'Founder\'s Pass pack artwork', camera_motion: 'zoom_in', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 6, effects: ['glow', 'holographic'], color_palette: ['#c89b3c', '#0a0a0f'], audio_cue: 'electronic_pulse', ken_burns: 'zoom_in', speed: 'normal' },
      { scene_type: 'logo_reveal', duration: 4, text_overlay: 'DEMONS & DEITIES', text_style: 'large_title', visual_description: 'Logo reveal with cosmic particle explosion', camera_motion: 'static', transition_in: 'flash', transition_out: 'fade_out', energy_level: 9, effects: ['particles', 'glow', 'lens_flare'], color_palette: ['#c89b3c', '#ffffff', '#0a0a0f'], audio_cue: 'bass_drop', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: 'demonsanddeities.com', text_style: 'subtitle', visual_description: 'URL reveal under logo', camera_motion: 'static', transition_in: 'fade_in', transition_out: 'fade_out', energy_level: 5, effects: ['glow'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'ambient', ken_burns: null, speed: 'normal' },
    ],
  },

  // ─── PART 2: THE FACTIONS — Deep dive into each side ────────────
  {
    part: 2,
    title: 'The Factions',
    subtitle: '14 cosmic civilizations collide',
    duration: 60,
    mood: 'epic',
    color_grade: 'high_contrast',
    pacing: 'escalating',
    focus: 'Faction showcase with lore',
    scenes: [
      { scene_type: 'text_reveal', duration: 2, text_overlay: 'PART II', text_style: 'small_caption', visual_description: 'Minimal text on dark', camera_motion: 'static', transition_in: 'fade_in', transition_out: 'dissolve', energy_level: 2, effects: [], color_palette: ['#c89b3c'], audio_cue: 'ambient', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: 'THE FACTIONS', text_style: 'large_title', visual_description: 'Title card with cosmic energy', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 4, effects: ['glow', 'particles'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'orchestral_swell', ken_burns: null, speed: 'normal' },
      // Light factions
      { scene_type: 'text_reveal', duration: 2, text_overlay: 'FORCES OF LIGHT', text_style: 'large_title', visual_description: 'Celestial light bursting through darkness', camera_motion: 'zoom_in', transition_in: 'flash', transition_out: 'dissolve', energy_level: 7, effects: ['lens_flare', 'glow'], color_palette: ['#7dc8ff', '#c89b3c', '#ffffff'], audio_cue: 'impact_hit', ken_burns: null, speed: 'normal' },
      { scene_type: 'character_showcase', duration: 3, text_overlay: 'PLEIADIAN — Star Healers', text_style: 'subtitle', visual_description: 'Pleiadian character — radiant, ethereal', camera_motion: 'zoom_in', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 5, effects: ['glow', 'particles'], color_palette: ['#60a5fa', '#ffffff'], audio_cue: 'orchestral_swell', ken_burns: 'zoom_in', speed: 'normal' },
      { scene_type: 'character_showcase', duration: 3, text_overlay: 'SIRIAN — Ancient Builders', text_style: 'subtitle', visual_description: 'Sirian character — technological, geometric', camera_motion: 'zoom_in', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 5, effects: ['glow'], color_palette: ['#34d399', '#ffffff'], audio_cue: 'electronic_pulse', ken_burns: 'zoom_in', speed: 'normal' },
      { scene_type: 'character_showcase', duration: 3, text_overlay: 'ARCTURIAN — Dimensional Guides', text_style: 'subtitle', visual_description: 'Arcturian character — mystical, ethereal', camera_motion: 'zoom_in', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 5, effects: ['glow', 'particles'], color_palette: ['#a78bfa', '#ffffff'], audio_cue: 'orchestral_swell', ken_burns: 'zoom_in', speed: 'normal' },
      { scene_type: 'character_showcase', duration: 3, text_overlay: 'ASCENDED — Transcended Beings', text_style: 'subtitle', visual_description: 'Ascended character — glowing, powerful', camera_motion: 'zoom_in', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 6, effects: ['glow', 'lens_flare'], color_palette: ['#e879f9', '#ffffff'], audio_cue: 'orchestral_swell', ken_burns: 'zoom_in', speed: 'normal' },
      // Transition
      { scene_type: 'transition', duration: 1.5, text_overlay: 'VS', text_style: 'kinetic_typography', visual_description: 'Flash transition — light to dark', camera_motion: 'static', transition_in: 'flash', transition_out: 'flash', energy_level: 9, effects: ['chromatic_aberration', 'lightning'], color_palette: ['#ffffff', '#e84040'], audio_cue: 'impact_hit', ken_burns: null, speed: 'normal' },
      // Dark factions
      { scene_type: 'text_reveal', duration: 2, text_overlay: 'FORCES OF SHADOW', text_style: 'large_title', visual_description: 'Dark energy consuming light', camera_motion: 'zoom_in', transition_in: 'flash', transition_out: 'dissolve', energy_level: 7, effects: ['smoke', 'glow'], color_palette: ['#e84040', '#0a0a0f', '#c084fc'], audio_cue: 'bass_drop', ken_burns: null, speed: 'normal' },
      { scene_type: 'character_showcase', duration: 3, text_overlay: 'ANUNNAKI — Ancient Gods', text_style: 'subtitle', visual_description: 'Anunnaki character — imposing, golden', camera_motion: 'zoom_in', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 6, effects: ['glow', 'particles'], color_palette: ['#d97706', '#0a0a0f'], audio_cue: 'orchestral_swell', ken_burns: 'zoom_in', speed: 'normal' },
      { scene_type: 'character_showcase', duration: 3, text_overlay: 'LUCIFERIAN — Masters of Duality', text_style: 'subtitle', visual_description: 'Luciferian character — beautiful, dangerous', camera_motion: 'zoom_in', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 6, effects: ['glow', 'chromatic_aberration'], color_palette: ['#c084fc', '#0a0a0f'], audio_cue: 'electronic_pulse', ken_burns: 'zoom_in', speed: 'normal' },
      { scene_type: 'character_showcase', duration: 3, text_overlay: 'REPTILIAN — Ruthless Strategists', text_style: 'subtitle', visual_description: 'Reptilian character — cold, calculating', camera_motion: 'zoom_in', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 6, effects: ['glow'], color_palette: ['#86efac', '#0a0a0f'], audio_cue: 'bass_drop', ken_burns: 'zoom_in', speed: 'normal' },
      { scene_type: 'character_showcase', duration: 3, text_overlay: 'ORION — Forged in War', text_style: 'subtitle', visual_description: 'Orion character — warrior, fierce', camera_motion: 'zoom_in', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 7, effects: ['sparks', 'glow'], color_palette: ['#f87171', '#0a0a0f'], audio_cue: 'impact_hit', ken_burns: 'zoom_in', speed: 'normal' },
      // All factions rapid montage
      { scene_type: 'rapid_cuts', duration: 4, text_overlay: '14 FACTIONS. ONE BATTLEFIELD.', text_style: 'kinetic_typography', visual_description: 'Rapid cuts between all factions', camera_motion: 'static', transition_in: 'flash', transition_out: 'flash', energy_level: 10, effects: ['chromatic_aberration', 'particles', 'glow'], color_palette: ['#c89b3c', '#e84040', '#7dc8ff', '#8b5cf6'], audio_cue: 'bass_drop', ken_burns: null, speed: 'fast_2x' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: 'WHICH SIDE DO YOU CHOOSE?', text_style: 'large_title', visual_description: 'Split screen — light vs dark', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'fade_out', energy_level: 7, effects: ['glow'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'orchestral_swell', ken_burns: null, speed: 'normal' },
      { scene_type: 'logo_reveal', duration: 3, text_overlay: 'DEMONS & DEITIES', text_style: 'large_title', visual_description: 'Logo with factional energy swirling', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'fade_out', energy_level: 8, effects: ['particles', 'glow'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'bass_drop', ken_burns: null, speed: 'normal' },
    ],
  },

  // ─── PART 3: THE GAME — Gameplay showcase ───────────────────────
  {
    part: 3,
    title: 'The Arena',
    subtitle: 'Strategic auto-battler gameplay',
    duration: 45,
    mood: 'aggressive',
    color_grade: 'high_contrast',
    pacing: 'constant_energy',
    focus: 'Gameplay mechanics',
    scenes: [
      { scene_type: 'text_reveal', duration: 2, text_overlay: 'PART III', text_style: 'small_caption', visual_description: 'Minimal', camera_motion: 'static', transition_in: 'fade_in', transition_out: 'dissolve', energy_level: 2, effects: [], color_palette: ['#c89b3c'], audio_cue: 'ambient', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: 'THE ARENA', text_style: 'large_title', visual_description: 'Arena board appearing from void', camera_motion: 'zoom_in', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 5, effects: ['glow', 'particles'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'orchestral_swell', ken_burns: null, speed: 'normal' },
      { scene_type: 'gameplay_montage', duration: 4, text_overlay: 'DRAFT YOUR ARMY', text_style: 'subtitle', visual_description: 'Shop phase — selecting heroes', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 5, effects: [], color_palette: ['#0a0a0f', '#c89b3c'], audio_cue: 'electronic_pulse', ken_burns: null, speed: 'normal' },
      { scene_type: 'gameplay_montage', duration: 4, text_overlay: 'POSITION FOR VICTORY', text_style: 'subtitle', visual_description: 'Placing units on hex grid', camera_motion: 'zoom_in', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 5, effects: ['glow'], color_palette: ['#10b981', '#0a0a0f'], audio_cue: 'ambient', ken_burns: null, speed: 'normal' },
      { scene_type: 'gameplay_montage', duration: 4, text_overlay: 'COMBAT IS AUTOMATIC', text_style: 'subtitle', visual_description: 'Combat phase — units fighting', camera_motion: 'static', transition_in: 'flash', transition_out: 'dissolve', energy_level: 8, effects: ['sparks', 'particles', 'glow'], color_palette: ['#e84040', '#c89b3c'], audio_cue: 'impact_hit', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: 'SYNERGIES WIN WARS', text_style: 'kinetic_typography', visual_description: 'Synergy trait icons activating', camera_motion: 'static', transition_in: 'flash', transition_out: 'dissolve', energy_level: 7, effects: ['glow', 'particles'], color_palette: ['#8b5cf6', '#10b981', '#c89b3c'], audio_cue: 'bass_drop', ken_burns: null, speed: 'normal' },
      { scene_type: 'gameplay_montage', duration: 4, text_overlay: 'FORGE ITEMS', text_style: 'subtitle', visual_description: 'Item combining — component + component = complete', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 6, effects: ['glow'], color_palette: ['#f97316', '#0a0a0f'], audio_cue: 'electronic_pulse', ken_burns: null, speed: 'normal' },
      { scene_type: 'gameplay_montage', duration: 4, text_overlay: 'UPGRADE YOUR STARS', text_style: 'subtitle', visual_description: 'Star upgrade — 3 units merge into star 2', camera_motion: 'zoom_in', transition_in: 'flash', transition_out: 'dissolve', energy_level: 7, effects: ['glow', 'particles', 'lens_flare'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'impact_hit', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: 'LAST PLAYER STANDING WINS', text_style: 'large_title', visual_description: 'Victory screen — crown, particles', camera_motion: 'static', transition_in: 'flash', transition_out: 'dissolve', energy_level: 9, effects: ['particles', 'glow', 'lens_flare'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'bass_drop', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: 'OUTPLAY. OUTBUILD. OUTLAST.', text_style: 'large_title', visual_description: 'Tagline with energy pulse', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 8, effects: ['glow'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'orchestral_swell', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: 'PLAY FREE NOW', text_style: 'large_title', visual_description: 'CTA with game URL', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'fade_out', energy_level: 6, effects: ['glow'], color_palette: ['#22c55e', '#ffffff'], audio_cue: 'electronic_pulse', ken_burns: null, speed: 'normal' },
      { scene_type: 'logo_reveal', duration: 3, text_overlay: 'demonsanddeities.com', text_style: 'subtitle', visual_description: 'Logo + URL', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'fade_out', energy_level: 5, effects: ['glow'], color_palette: ['#c89b3c'], audio_cue: 'ambient', ken_burns: null, speed: 'normal' },
    ],
  },

  // ─── PART 4: THE TOKEN — Web3 / investment pitch ────────────────
  {
    part: 4,
    title: 'The Economy',
    subtitle: 'Own your cards. Earn rewards.',
    duration: 45,
    mood: 'hopeful',
    color_grade: 'warm',
    pacing: 'build_and_drop',
    focus: 'Web3 value proposition + Founder\'s Pass',
    scenes: [
      { scene_type: 'text_reveal', duration: 2, text_overlay: 'PART IV', text_style: 'small_caption', visual_description: 'Minimal', camera_motion: 'static', transition_in: 'fade_in', transition_out: 'dissolve', energy_level: 2, effects: [], color_palette: ['#c89b3c'], audio_cue: 'ambient', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: 'THE ECONOMY', text_style: 'large_title', visual_description: 'Golden particles forming text', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 5, effects: ['particles', 'glow'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'orchestral_swell', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: 'YOUR CARDS ARE NFTs', text_style: 'kinetic_typography', visual_description: 'NFT card with holographic effect', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 6, effects: ['holographic', 'glow'], color_palette: ['#c89b3c', '#8b5cf6'], audio_cue: 'electronic_pulse', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: 'YOUR WINS EARN DDT', text_style: 'kinetic_typography', visual_description: 'DDT token floating with golden particles', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 6, effects: ['glow', 'particles'], color_palette: ['#c89b3c', '#10b981'], audio_cue: 'electronic_pulse', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: '500,000,000 DDT — DEFLATIONARY', text_style: 'subtitle', visual_description: 'Token supply visualization — shrinking', camera_motion: 'zoom_out', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 5, effects: ['glow'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'ambient', ken_burns: null, speed: 'normal' },
      { scene_type: 'title_card', duration: 4, text_overlay: "FOUNDER'S PASS — 200 SUPPLY", text_style: 'large_title', visual_description: 'Founder\'s Pass pack artwork — premium', camera_motion: 'zoom_in', transition_in: 'flash', transition_out: 'dissolve', energy_level: 8, effects: ['glow', 'particles', 'holographic'], color_palette: ['#c89b3c', '#0a0a0f'], audio_cue: 'bass_drop', ken_burns: 'zoom_in', speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: '25,000 DDT AIRDROP', text_style: 'large_title', visual_description: 'Tokens raining down', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 7, effects: ['particles', 'glow'], color_palette: ['#10b981', '#c89b3c'], audio_cue: 'impact_hit', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: '0% MARKETPLACE FEES', text_style: 'large_title', visual_description: 'Fee comparison visual', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 6, effects: ['glow'], color_palette: ['#22c55e', '#ffffff'], audio_cue: 'whoosh', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: '10% REVENUE SHARE — MONTHLY', text_style: 'large_title', visual_description: 'Revenue flowing to holders', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 7, effects: ['glow', 'particles'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'orchestral_swell', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: 'ZERO PAY-TO-WIN', text_style: 'kinetic_typography', visual_description: 'Bold statement — competitive integrity', camera_motion: 'static', transition_in: 'flash', transition_out: 'dissolve', energy_level: 8, effects: ['glow'], color_palette: ['#ef4444', '#ffffff'], audio_cue: 'impact_hit', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: 'COMPETITIVE INTEGRITY. WEB3 OWNERSHIP.', text_style: 'subtitle', visual_description: 'Balanced visual — game + blockchain', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 6, effects: ['glow'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'ambient', ken_burns: null, speed: 'normal' },
      { scene_type: 'logo_reveal', duration: 3, text_overlay: 'MINT YOUR PASS NOW', text_style: 'large_title', visual_description: 'CTA with Founder\'s Pass + logo', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'fade_out', energy_level: 7, effects: ['glow', 'particles'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'bass_drop', ken_burns: null, speed: 'normal' },
    ],
  },

  // ─── PART 5: THE LAUNCH — Full hype trailer ─────────────────────
  {
    part: 5,
    title: 'Rise',
    subtitle: 'The battle begins now',
    duration: 60,
    mood: 'epic',
    color_grade: 'cinematic',
    pacing: 'escalating',
    focus: 'Full hype launch trailer combining all elements',
    scenes: [
      { scene_type: 'cinematic', duration: 2, text_overlay: null, text_style: null, visual_description: 'Black. Silence.', camera_motion: 'static', transition_in: 'fade_in', transition_out: 'dissolve', energy_level: 1, effects: [], color_palette: ['#0a0a0f'], audio_cue: 'silence', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 2, text_overlay: 'WHAT IF YOUR ARMY WAS TRULY YOURS?', text_style: 'large_title', visual_description: 'White text fading in on black', camera_motion: 'static', transition_in: 'fade_in', transition_out: 'dissolve', energy_level: 3, effects: ['glow'], color_palette: ['#ffffff', '#0a0a0f'], audio_cue: 'ambient', ken_burns: null, speed: 'normal' },
      { scene_type: 'character_showcase', duration: 2, text_overlay: null, text_style: null, visual_description: 'Character portrait — dramatic lighting', camera_motion: 'zoom_in', transition_in: 'dissolve', transition_out: 'flash', energy_level: 5, effects: ['glow'], color_palette: ['#c89b3c', '#0a0a0f'], audio_cue: 'orchestral_swell', ken_burns: 'zoom_in', speed: 'normal' },
      { scene_type: 'character_showcase', duration: 2, text_overlay: null, text_style: null, visual_description: 'Another character — different faction', camera_motion: 'zoom_in', transition_in: 'flash', transition_out: 'flash', energy_level: 6, effects: ['glow', 'particles'], color_palette: ['#8b5cf6', '#0a0a0f'], audio_cue: 'impact_hit', ken_burns: 'zoom_in', speed: 'normal' },
      { scene_type: 'rapid_cuts', duration: 3, text_overlay: null, text_style: null, visual_description: 'Rapid character showcase — all factions', camera_motion: 'static', transition_in: 'flash', transition_out: 'flash', energy_level: 9, effects: ['chromatic_aberration', 'glow'], color_palette: ['#c89b3c', '#e84040', '#7dc8ff'], audio_cue: 'bass_drop', ken_burns: null, speed: 'fast_2x' },
      { scene_type: 'text_reveal', duration: 2, text_overlay: '72 HEROES', text_style: 'kinetic_typography', visual_description: 'Number flash', camera_motion: 'static', transition_in: 'flash', transition_out: 'dissolve', energy_level: 8, effects: ['glow'], color_palette: ['#c89b3c'], audio_cue: 'impact_hit', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 2, text_overlay: '14 FACTIONS', text_style: 'kinetic_typography', visual_description: 'Number flash', camera_motion: 'static', transition_in: 'flash', transition_out: 'dissolve', energy_level: 8, effects: ['glow'], color_palette: ['#8b5cf6'], audio_cue: 'impact_hit', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 2, text_overlay: 'INFINITE STRATEGIES', text_style: 'kinetic_typography', visual_description: 'Text explosion', camera_motion: 'static', transition_in: 'flash', transition_out: 'dissolve', energy_level: 8, effects: ['particles', 'glow'], color_palette: ['#10b981'], audio_cue: 'impact_hit', ken_burns: null, speed: 'normal' },
      { scene_type: 'gameplay_montage', duration: 4, text_overlay: null, text_style: null, visual_description: 'Combat montage — abilities, damage numbers', camera_motion: 'static', transition_in: 'flash', transition_out: 'dissolve', energy_level: 9, effects: ['sparks', 'glow', 'particles'], color_palette: ['#e84040', '#c89b3c', '#0a0a0f'], audio_cue: 'bass_drop', ken_burns: null, speed: 'normal' },
      { scene_type: 'character_showcase', duration: 3, text_overlay: 'COLLECT', text_style: 'kinetic_typography', visual_description: 'NFT card reveal', camera_motion: 'zoom_in', transition_in: 'dissolve', transition_out: 'flash', energy_level: 7, effects: ['holographic', 'glow'], color_palette: ['#c89b3c'], audio_cue: 'whoosh', ken_burns: 'zoom_in', speed: 'normal' },
      { scene_type: 'character_showcase', duration: 3, text_overlay: 'STRATEGIZE', text_style: 'kinetic_typography', visual_description: 'Board with units', camera_motion: 'pan_right', transition_in: 'flash', transition_out: 'flash', energy_level: 7, effects: ['glow'], color_palette: ['#10b981'], audio_cue: 'electronic_pulse', ken_burns: null, speed: 'normal' },
      { scene_type: 'character_showcase', duration: 3, text_overlay: 'CONQUER', text_style: 'kinetic_typography', visual_description: 'Victory — cosmic explosion', camera_motion: 'zoom_out', transition_in: 'flash', transition_out: 'dissolve', energy_level: 9, effects: ['particles', 'lens_flare', 'glow'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'bass_drop', ken_burns: null, speed: 'normal' },
      { scene_type: 'title_card', duration: 3, text_overlay: "200 FOUNDER'S PASSES", text_style: 'large_title', visual_description: 'Founder\'s Pass artwork', camera_motion: 'zoom_in', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 7, effects: ['glow', 'holographic'], color_palette: ['#c89b3c', '#0a0a0f'], audio_cue: 'orchestral_swell', ken_burns: 'zoom_in', speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: 'OWN EVERYTHING YOU EARN', text_style: 'large_title', visual_description: 'Golden text — defining statement', camera_motion: 'static', transition_in: 'dissolve', transition_out: 'dissolve', energy_level: 8, effects: ['glow'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'orchestral_swell', ken_burns: null, speed: 'normal' },
      { scene_type: 'logo_reveal', duration: 4, text_overlay: 'DEMONS & DEITIES', text_style: 'large_title', visual_description: 'Full logo reveal — cosmic explosion behind', camera_motion: 'static', transition_in: 'flash', transition_out: 'fade_out', energy_level: 10, effects: ['particles', 'glow', 'lens_flare', 'sparks'], color_palette: ['#c89b3c', '#ffffff', '#0a0a0f'], audio_cue: 'bass_drop', ken_burns: null, speed: 'normal' },
      { scene_type: 'text_reveal', duration: 3, text_overlay: 'PLAY NOW — demonsanddeities.com', text_style: 'subtitle', visual_description: 'CTA under logo', camera_motion: 'static', transition_in: 'fade_in', transition_out: 'fade_out', energy_level: 5, effects: ['glow'], color_palette: ['#c89b3c', '#ffffff'], audio_cue: 'ambient', ken_burns: null, speed: 'normal' },
    ],
  },
];

// ─── Generate blueprints ───────────────────────────────────────────
function generateBlueprint(part: SeriesPart) {
  let currentTime = 0;
  const scenes = part.scenes.map((scene, i) => {
    const start = currentTime;
    currentTime += scene.duration;
    return {
      scene_number: i + 1,
      timestamp_start: start,
      timestamp_end: currentTime,
      ...scene,
    };
  });

  return {
    source: {
      name: `dd-series-part${part.part}`,
      type: 'authored',
      analyzed_at: new Date().toISOString(),
    },
    metadata: {
      total_duration: currentTime,
      overall_pacing: part.pacing,
      color_grade: part.color_grade,
      aspect_ratio: '16:9',
      mood: part.mood,
      music_style: 'hybrid',
      text_frequency: 'moderate',
      cut_speed: 'mixed',
      key_techniques: ['ken_burns', 'kinetic_typography', 'rapid_cuts', 'particle_transitions'],
      series_info: {
        part: part.part,
        title: part.title,
        subtitle: part.subtitle,
        focus: part.focus,
      },
    },
    scenes,
    adaptation_notes: {
      total_scenes: scenes.length,
      avg_scene_duration: Math.round((currentTime / scenes.length) * 100) / 100,
      suggested_dd_assets: ['Character portraits', 'Arena backgrounds', 'Cover art', "Founder's Pass artwork", 'Pack artwork'],
    },
  };
}

// ─── Main ──────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  if (!existsSync(BLUEPRINTS_DIR)) mkdirSync(BLUEPRINTS_DIR, { recursive: true });

  const partFilter = args.indexOf('--part') !== -1 ? parseInt(args[args.indexOf('--part') + 1]) : undefined;

  const parts = partFilter ? SERIES.filter(s => s.part === partFilter) : SERIES;

  if (parts.length === 0) {
    console.error(`Part ${partFilter} not found. Available: 1-${SERIES.length}`);
    process.exit(1);
  }

  console.log(`\n🎬 Demons & Deities — Cinematic Series Generator\n`);

  for (const part of parts) {
    const blueprint = generateBlueprint(part);
    const outPath = join(BLUEPRINTS_DIR, `dd-series-part${part.part}.blueprint.json`);
    writeFileSync(outPath, JSON.stringify(blueprint, null, 2));

    console.log(`  Part ${part.part}: "${part.title}" — ${part.subtitle}`);
    console.log(`    Scenes: ${blueprint.scenes.length} | Duration: ${blueprint.metadata.total_duration}s | Mood: ${part.mood}`);
    console.log(`    Saved: ${outPath}`);
    console.log('');
  }

  console.log('Next steps:');
  console.log('  # Preview a part (outputs Shotstack JSON without rendering):');
  console.log('  npx ts-node scripts/marketing/video-blueprint-to-shotstack.ts \\');
  console.log('    --blueprint scripts/marketing/blueprints/dd-series-part1.blueprint.json \\');
  console.log('    --part 1 --title "Genesis" --preview\n');
  console.log('  # Render a part (requires SHOTSTACK_API_KEY):');
  console.log('  npx ts-node scripts/marketing/video-blueprint-to-shotstack.ts \\');
  console.log('    --blueprint scripts/marketing/blueprints/dd-series-part1.blueprint.json \\');
  console.log('    --part 1 --title "Genesis" --music "https://your-music-url.mp3"\n');
  console.log('  # Render vertical for TikTok/Reels:');
  console.log('  ... --aspect 9:16\n');
}

main();
