/**
 * Demons & Deities — Reference Video Analyzer
 *
 * Uses Gemini 2.5 Pro to analyze reference trailers/teasers and extract
 * a structured blueprint: scene-by-scene breakdown with timestamps,
 * visual descriptions, motion types, text overlays, audio cues, and pacing.
 *
 * The output blueprint is a JSON file that feeds into the Shotstack renderer.
 *
 * Usage:
 *   # Analyze a YouTube video (downloads first)
 *   npx ts-node scripts/marketing/video-analyze-reference.ts --url "https://youtube.com/watch?v=..."
 *
 *   # Analyze a local video file
 *   npx ts-node scripts/marketing/video-analyze-reference.ts --file /path/to/trailer.mp4
 *
 *   # Analyze with a custom name
 *   npx ts-node scripts/marketing/video-analyze-reference.ts --url "..." --name "tft-set14-trailer"
 *
 * Output: scripts/marketing/blueprints/<name>.blueprint.json
 *
 * Environment:
 *   GEMINI_API_KEY=<your key from aistudio.google.com>
 *
 * Dependencies:
 *   npm install @google/genai
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const BLUEPRINTS_DIR = join(ROOT, 'scripts', 'marketing', 'blueprints');
const DOWNLOADS_DIR = join(ROOT, 'scripts', 'marketing', 'reference-videos');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ─── Gemini API helper ─────────────────────────────────────────────
async function analyzeVideoWithGemini(videoPath: string, customPrompt?: string): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set. Get one at https://aistudio.google.com/apikey');
  }

  const videoData = readFileSync(videoPath);
  const base64Video = videoData.toString('base64');
  const mimeType = videoPath.endsWith('.webm') ? 'video/webm' : 'video/mp4';

  console.log(`  Uploading ${(videoData.length / 1024 / 1024).toFixed(1)}MB to Gemini...`);

  const prompt = customPrompt || `You are a professional video editor and motion graphics designer analyzing a game/cinematic trailer.

Analyze this video frame-by-frame and produce a detailed BLUEPRINT in JSON format. The blueprint will be used to recreate a similar style trailer for a different game called "Demons & Deities" (a TFT-style auto-battler NFT card game on Polygon).

For EACH distinct scene/shot in the video, extract:

1. **timestamp_start** — when the scene starts (seconds, e.g. 0.0)
2. **timestamp_end** — when the scene ends
3. **duration** — length in seconds
4. **scene_type** — one of: "text_reveal", "character_showcase", "gameplay_montage", "cinematic", "logo_reveal", "transition", "environment", "particle_effect", "split_screen", "rapid_cuts", "slow_motion", "title_card"
5. **visual_description** — detailed description of what's on screen (colors, composition, camera movement)
6. **camera_motion** — "static", "zoom_in", "zoom_out", "pan_left", "pan_right", "tilt_up", "tilt_down", "orbit", "dolly", "shake", "parallax"
7. **transition_in** — how this scene starts: "cut", "fade_in", "dissolve", "slide_left", "slide_right", "zoom_in", "wipe", "flash"
8. **transition_out** — how this scene ends (same options)
9. **text_overlay** — any text shown on screen (exact text if readable)
10. **text_style** — "large_title", "subtitle", "small_caption", "floating", "kinetic_typography", "glitch"
11. **color_palette** — dominant colors (list of hex codes)
12. **audio_cue** — description of the sound/music at this point: "bass_drop", "orchestral_swell", "silence", "impact_hit", "whoosh", "electronic_pulse", "vocal", "ambient"
13. **energy_level** — 1-10 (1=calm, 10=intense action)
14. **effects** — list of visual effects: "particles", "lens_flare", "chromatic_aberration", "glow", "sparks", "smoke", "lightning", "holographic", "glitch", "scanlines"
15. **ken_burns** — if applicable, "zoom_in", "zoom_out", "pan_left", "pan_right" with scale amount
16. **speed** — playback speed: "normal", "slow_0.5x", "slow_0.25x", "fast_2x", "fast_4x", "reverse"

Also extract these overall properties:
- **total_duration** — total video length in seconds
- **overall_pacing** — "slow_build", "constant_energy", "build_and_drop", "escalating", "wave"
- **color_grade** — overall color treatment: "warm", "cool", "desaturated", "high_contrast", "neon", "cinematic"
- **aspect_ratio** — "16:9", "9:16", "1:1", "4:5", "21:9"
- **mood** — overall mood: "epic", "mysterious", "dark", "hopeful", "aggressive", "playful"
- **music_style** — "orchestral", "electronic", "hybrid", "ambient", "trap", "cinematic_score"
- **text_frequency** — how often text appears: "minimal", "moderate", "heavy"
- **cut_speed** — average scene duration: "long_holds_5s+", "medium_2-5s", "rapid_under_2s", "mixed"
- **key_techniques** — list of notable techniques used (e.g. "parallax layers", "particle transitions", "kinetic typography")

Return ONLY valid JSON in this structure:
{
  "metadata": {
    "total_duration": number,
    "overall_pacing": string,
    "color_grade": string,
    "aspect_ratio": string,
    "mood": string,
    "music_style": string,
    "text_frequency": string,
    "cut_speed": string,
    "key_techniques": string[]
  },
  "scenes": [
    {
      "scene_number": number,
      "timestamp_start": number,
      "timestamp_end": number,
      "duration": number,
      "scene_type": string,
      "visual_description": string,
      "camera_motion": string,
      "transition_in": string,
      "transition_out": string,
      "text_overlay": string | null,
      "text_style": string | null,
      "color_palette": string[],
      "audio_cue": string,
      "energy_level": number,
      "effects": string[],
      "ken_burns": string | null,
      "speed": string
    }
  ]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-06-05:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType, data: base64Video } },
            { text: prompt },
          ],
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 32000,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json() as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned empty response');
  }

  // Parse JSON from response (may be wrapped in markdown code block)
  const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(jsonStr);
}

// ─── Download YouTube video ────────────────────────────────────────
function downloadYouTube(url: string, outputDir: string): string {
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  // Check for yt-dlp
  try {
    execSync('which yt-dlp', { stdio: 'pipe' });
  } catch {
    console.error('yt-dlp not installed. Install with: brew install yt-dlp');
    process.exit(1);
  }

  const outputTemplate = join(outputDir, '%(title)s.%(ext)s');
  console.log(`  Downloading video...`);

  // Download as mp4, max 720p to keep file size reasonable for Gemini (20MB limit)
  execSync(
    `yt-dlp -f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]" --merge-output-format mp4 -o "${outputTemplate}" "${url}"`,
    { stdio: 'pipe' }
  );

  // Find the downloaded file
  const files = execSync(`ls -t "${outputDir}"/*.mp4 2>/dev/null || ls -t "${outputDir}"/*.webm 2>/dev/null`, { encoding: 'utf-8' })
    .trim().split('\n');

  if (!files[0]) throw new Error('Download failed — no video file found');
  return files[0];
}

// ─── Blueprint post-processing ─────────────────────────────────────
interface Blueprint {
  source: {
    name: string;
    url?: string;
    file?: string;
    analyzed_at: string;
  };
  metadata: any;
  scenes: any[];
  adaptation_notes: {
    total_scenes: number;
    avg_scene_duration: number;
    suggested_dd_assets: string[];
  };
}

function createBlueprint(name: string, analysis: any, source: { url?: string; file?: string }): Blueprint {
  const scenes = analysis.scenes || [];
  const avgDuration = scenes.length > 0
    ? scenes.reduce((sum: number, s: any) => sum + (s.duration || 0), 0) / scenes.length
    : 0;

  // Suggest D&D assets that could fill each scene type
  const assetMap: Record<string, string[]> = {
    text_reveal: ['Logo reveal', 'Title text overlay', 'Tagline text'],
    character_showcase: ['Character portraits from /images/characters/', '3D model turntables from /models/'],
    gameplay_montage: ['Screen recordings of combat', 'Board setup clips', 'Item equip animations'],
    cinematic: ['Cover art (/images/home-cover-art.png)', 'Background scenes (/images/pages/)'],
    logo_reveal: ['DD logo (/images/dd-logo-icon.png)', 'Gold particle effects'],
    transition: ['Flash transitions', 'Particle wipes'],
    environment: ['Arena backgrounds', 'Faction environments'],
    particle_effect: ['Gold particles', 'Cosmic energy', 'Sacred geometry'],
    rapid_cuts: ['Multiple character portraits', 'Rapid faction showcases'],
    title_card: ['Set name cards', 'Founder\'s Pass branding'],
  };

  const usedTypes = new Set(scenes.map((s: any) => s.scene_type));
  const suggestedAssets = Array.from(usedTypes).flatMap((t) => assetMap[t as string] || []);

  return {
    source: {
      name,
      url: source.url,
      file: source.file,
      analyzed_at: new Date().toISOString(),
    },
    metadata: analysis.metadata,
    scenes: scenes.map((scene: any, i: number) => ({
      ...scene,
      scene_number: i + 1,
      dd_adaptation: {
        suggested_asset_type: assetMap[scene.scene_type]?.[0] || 'Custom',
        notes: `Adapt ${scene.scene_type} scene for D&D branding`,
      },
    })),
    adaptation_notes: {
      total_scenes: scenes.length,
      avg_scene_duration: Math.round(avgDuration * 100) / 100,
      suggested_dd_assets: [...new Set(suggestedAssets)],
    },
  };
}

// ─── Main ──────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Video Reference Analyzer — Demons & Deities\n');
    console.log('Analyzes trailers/teasers with Gemini 2.5 Pro and creates scene blueprints.\n');
    console.log('Usage:');
    console.log('  --url "https://youtube.com/watch?v=..."   Analyze a YouTube video');
    console.log('  --file /path/to/video.mp4                 Analyze a local file');
    console.log('  --name "my-reference"                     Custom name for the blueprint');
    console.log('  --prompt "Custom analysis prompt"          Override the analysis prompt');
    console.log('\nOutput: scripts/marketing/blueprints/<name>.blueprint.json');
    console.log('\nEnvironment: GEMINI_API_KEY=<your key>');
    return;
  }

  // Parse args
  let url: string | undefined;
  let file: string | undefined;
  let name: string | undefined;
  let customPrompt: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) url = args[++i];
    if (args[i] === '--file' && args[i + 1]) file = args[++i];
    if (args[i] === '--name' && args[i + 1]) name = args[++i];
    if (args[i] === '--prompt' && args[i + 1]) customPrompt = args[++i];
  }

  if (!url && !file) {
    console.error('Provide --url or --file');
    process.exit(1);
  }

  if (!GEMINI_API_KEY) {
    console.error('Set GEMINI_API_KEY in your environment.');
    console.error('Get one at: https://aistudio.google.com/apikey');
    process.exit(1);
  }

  // Ensure output dir exists
  if (!existsSync(BLUEPRINTS_DIR)) mkdirSync(BLUEPRINTS_DIR, { recursive: true });

  let videoPath: string;

  if (url) {
    console.log(`\n🎬 Analyzing reference: ${url}\n`);
    videoPath = downloadYouTube(url, DOWNLOADS_DIR);
    if (!name) name = basename(videoPath).replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  } else {
    videoPath = file!;
    if (!name) name = basename(videoPath).replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    if (!existsSync(videoPath)) {
      console.error(`File not found: ${videoPath}`);
      process.exit(1);
    }
  }

  // Check file size (Gemini has limits)
  const stats = readFileSync(videoPath);
  const sizeMB = stats.length / 1024 / 1024;
  console.log(`  Video: ${videoPath}`);
  console.log(`  Size: ${sizeMB.toFixed(1)} MB`);

  if (sizeMB > 50) {
    console.warn(`  ⚠️ File is ${sizeMB.toFixed(0)}MB — Gemini may reject files over ~50MB.`);
    console.warn(`  Consider trimming or compressing the video first.`);
  }

  // Analyze with Gemini
  console.log(`\n🔍 Sending to Gemini 2.5 Pro for analysis...\n`);
  const analysis = await analyzeVideoWithGemini(videoPath, customPrompt);

  // Create blueprint
  const blueprint = createBlueprint(name!, analysis, { url, file: file || videoPath });

  // Save
  const outputPath = join(BLUEPRINTS_DIR, `${name}.blueprint.json`);
  writeFileSync(outputPath, JSON.stringify(blueprint, null, 2));

  console.log(`\n✅ Blueprint saved: ${outputPath}`);
  console.log(`   Scenes: ${blueprint.scenes.length}`);
  console.log(`   Duration: ${blueprint.metadata.total_duration}s`);
  console.log(`   Mood: ${blueprint.metadata.mood}`);
  console.log(`   Pacing: ${blueprint.metadata.overall_pacing}`);
  console.log(`   Key techniques: ${blueprint.metadata.key_techniques?.join(', ')}`);
  console.log(`\n   Suggested D&D assets:`);
  blueprint.adaptation_notes.suggested_dd_assets.forEach((a: string) => console.log(`     • ${a}`));
  console.log(`\n   Next: npx ts-node scripts/marketing/video-blueprint-to-shotstack.ts --blueprint "${outputPath}"`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
