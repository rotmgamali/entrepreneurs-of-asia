/**
 * Demons & Deities — Audio Pipeline
 *
 * Handles music sourcing (Pixabay), voiceover generation (ElevenLabs),
 * and audio integration into Shotstack trailer JSON.
 *
 * Usage:
 *   # Search Pixabay for cinematic music
 *   npx ts-node scripts/marketing/audio-pipeline.ts search-music --query "epic cinematic orchestral"
 *
 *   # Download a Pixabay track
 *   npx ts-node scripts/marketing/audio-pipeline.ts download-music --id 12345
 *
 *   # Generate voiceover with ElevenLabs
 *   npx ts-node scripts/marketing/audio-pipeline.ts voiceover --text "In the space between worlds..."
 *
 *   # Generate all trailer voiceover lines
 *   npx ts-node scripts/marketing/audio-pipeline.ts voiceover-all
 *
 *   # Add audio to Shotstack JSON
 *   npx ts-node scripts/marketing/audio-pipeline.ts add-audio \
 *     --trailer scripts/marketing/blueprints/cinematic-trailer-2min-clean.json \
 *     --music-url "https://..." \
 *     --voiceover-dir scripts/marketing/audio/voiceover/
 *
 * Environment:
 *   PIXABAY_API_KEY, ELEVENLABS_API_KEY, PINATA_API_KEY + pinata secret
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const AUDIO_DIR = join(ROOT, 'scripts', 'marketing', 'audio');
const VO_DIR = join(AUDIO_DIR, 'voiceover');
const MUSIC_DIR = join(AUDIO_DIR, 'music');

const PIXABAY_KEY = process.env.PIXABAY_API_KEY;
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET = 'fc45f5ab48b5904cac0e3efe472bddd64228504a8bc0891eaa0dedd0da53206a';

// ─── Pixabay Music Search ──────────────────────────────────────────
async function searchMusic(query: string, minDuration = 120): Promise<void> {
  if (!PIXABAY_KEY) { console.error('Missing PIXABAY_API_KEY'); return; }

  const url = `https://pixabay.com/api/music/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&min_duration=${minDuration}&order=popular&per_page=10`;
  const res = await fetch(url);
  const data = await res.json() as any;

  if (!data.hits?.length) {
    console.log('No results found. Try different search terms.');
    return;
  }

  console.log(`\n🎵 Found ${data.totalHits} tracks (showing top ${data.hits.length}):\n`);
  for (const hit of data.hits) {
    const mins = Math.floor(hit.duration / 60);
    const secs = hit.duration % 60;
    console.log(`  ID: ${hit.id}`);
    console.log(`  Title: ${hit.title || 'Untitled'}`);
    console.log(`  Duration: ${mins}:${String(secs).padStart(2, '0')}`);
    console.log(`  Tags: ${hit.tags}`);
    console.log(`  User: ${hit.user}`);
    console.log(`  Preview: ${hit.audio}`);
    console.log(`  Download: npx ts-node scripts/marketing/audio-pipeline.ts download-music --id ${hit.id}`);
    console.log('');
  }
}

async function downloadMusic(id: number): Promise<string | null> {
  if (!PIXABAY_KEY) { console.error('Missing PIXABAY_API_KEY'); return null; }
  if (!existsSync(MUSIC_DIR)) mkdirSync(MUSIC_DIR, { recursive: true });

  // Fetch track details
  const url = `https://pixabay.com/api/music/?key=${PIXABAY_KEY}&id=${id}`;
  const res = await fetch(url);
  const data = await res.json() as any;

  if (!data.hits?.length) { console.error('Track not found'); return null; }

  const track = data.hits[0];
  const audioUrl = track.audio;
  console.log(`\n  Downloading: ${track.title || 'Track'} (${track.duration}s)`);

  const audioRes = await fetch(audioUrl);
  const buffer = Buffer.from(await audioRes.arrayBuffer());
  const filename = `pixabay-${id}.mp3`;
  const filepath = join(MUSIC_DIR, filename);
  writeFileSync(filepath, buffer);
  console.log(`  Saved: ${filepath} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);

  return filepath;
}

// ─── ElevenLabs Voiceover ──────────────────────────────────────────
async function generateVoiceover(text: string, filename: string, voiceId?: string): Promise<string | null> {
  if (!ELEVENLABS_KEY) { console.error('Missing ELEVENLABS_API_KEY'); return null; }
  if (!existsSync(VO_DIR)) mkdirSync(VO_DIR, { recursive: true });

  // Default voice: use a deep cinematic male voice
  // List voices first if needed: GET https://api.elevenlabs.io/v1/voices
  const voice = voiceId || 'pNInz6obpgDQGcFmaJgB'; // "Adam" — deep male narrator

  console.log(`  Generating voiceover: "${text.slice(0, 50)}..."`);

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.6,
        similarity_boost: 0.8,
        style: 0.4,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  ElevenLabs error ${res.status}: ${err.slice(0, 200)}`);
    return null;
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const filepath = join(VO_DIR, filename);
  writeFileSync(filepath, buffer);
  console.log(`  Saved: ${filepath} (${(buffer.length / 1024).toFixed(0)}KB)`);
  return filepath;
}

async function listVoices(): Promise<void> {
  if (!ELEVENLABS_KEY) { console.error('Missing ELEVENLABS_API_KEY'); return; }

  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': ELEVENLABS_KEY },
  });
  const data = await res.json() as any;

  console.log('\n🎤 Available ElevenLabs Voices:\n');
  for (const voice of (data.voices || []).slice(0, 20)) {
    console.log(`  ${voice.voice_id} — ${voice.name} (${voice.labels?.accent || 'neutral'}, ${voice.labels?.age || '?'}, ${voice.labels?.gender || '?'})`);
  }
}

// ─── Trailer voiceover lines ───────────────────────────────────────
const VOICEOVER_LINES = [
  { id: 'intro-1', text: 'In the space between worlds...', timestamp: 1 },
  { id: 'intro-2', text: 'A war has raged for millennia.', timestamp: 5.5 },
  { id: 'demons', text: 'Demons.', timestamp: 10 },
  { id: 'deities', text: 'Deities.', timestamp: 13 },
  { id: 'heroes', text: 'Seventy-two heroes.', timestamp: 20 },
  { id: 'factions', text: 'Fourteen cosmic factions.', timestamp: 23 },
  { id: 'choose', text: 'Choose your champions.', timestamp: 53 },
  { id: 'synergies', text: 'Forge unbreakable synergies.', timestamp: 57 },
  { id: 'depth', text: 'Strategic depth.', timestamp: 62 },
  { id: 'outplay', text: 'Outplay. Outbuild. Outlast.', timestamp: 73 },
  { id: 'nfts', text: 'Your cards are N.F.T.s on Polygon.', timestamp: 80 },
  { id: 'earn', text: 'Your wins earn D.D.T.', timestamp: 84 },
  { id: 'deflationary', text: 'Deflationary by design.', timestamp: 88 },
  { id: 'founders', text: "Founder's Pass. Two hundred ever made.", timestamp: 93 },
  { id: 'paytwin', text: 'Zero pay to win. Competitive integrity first.', timestamp: 111 },
  { id: 'logo', text: 'Demons and Deities.', timestamp: 116 },
];

async function generateAllVoiceovers(voiceId?: string): Promise<void> {
  console.log(`\n🎤 Generating ${VOICEOVER_LINES.length} voiceover lines...\n`);

  for (const line of VOICEOVER_LINES) {
    await generateVoiceover(line.text, `${line.id}.mp3`, voiceId);
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ All voiceovers generated in ${VO_DIR}`);
}

// ─── Pin audio to IPFS ─────────────────────────────────────────────
async function pinToIPFS(filepath: string, name: string): Promise<string | null> {
  if (!PINATA_API_KEY) { console.error('Missing PINATA_API_KEY'); return null; }

  const fileData = readFileSync(filepath);
  const blob = new Blob([fileData]);

  const formData = new FormData();
  formData.append('file', blob, name);
  formData.append('pinataMetadata', JSON.stringify({ name }));
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'pinata_api_key': PINATA_API_KEY,
      'pinata_secret_api_key': PINATA_SECRET,
    },
    body: formData,
  });

  if (!res.ok) {
    console.error(`Pinata error: ${await res.text()}`);
    return null;
  }

  const data = await res.json() as any;
  const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
  console.log(`  Pinned: ${gatewayUrl}`);
  return gatewayUrl;
}

// ─── Add audio to Shotstack trailer ────────────────────────────────
function addAudioToTrailer(trailerPath: string, musicUrl: string, voiceoverUrls?: Record<string, string>): void {
  const trailer = JSON.parse(readFileSync(trailerPath, 'utf-8'));

  // Add soundtrack (background music)
  trailer.timeline.soundtrack = {
    src: musicUrl,
    effect: 'fadeInFadeOut',
  };

  // Add voiceover clips as a new audio track (if provided)
  if (voiceoverUrls && Object.keys(voiceoverUrls).length > 0) {
    const voTrack: any = { clips: [] };

    for (const line of VOICEOVER_LINES) {
      const url = voiceoverUrls[line.id];
      if (!url) continue;

      voTrack.clips.push({
        asset: {
          type: 'audio',
          src: url,
          volume: 1,
        },
        start: line.timestamp,
        length: Math.max(line.text.length * 0.08, 1.5), // rough estimate: ~0.08s per char
      });
    }

    // Insert voiceover track at position 0 (highest priority audio)
    trailer.timeline.tracks.unshift(voTrack);
  }

  // Save updated trailer
  const outputPath = trailerPath.replace('.json', '-with-audio.json');
  writeFileSync(outputPath, JSON.stringify(trailer, null, 2));
  console.log(`\n✅ Saved trailer with audio: ${outputPath}`);
}

// ─── Main ──────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd) {
    console.log('Audio Pipeline — Demons & Deities\n');
    console.log('Commands:');
    console.log('  search-music --query "epic cinematic" [--min-duration 120]');
    console.log('  download-music --id <pixabay-id>');
    console.log('  list-voices');
    console.log('  voiceover --text "..." [--voice <voice-id>] [--filename out.mp3]');
    console.log('  voiceover-all [--voice <voice-id>]');
    console.log('  pin --file <path> --name <name>');
    console.log('  add-audio --trailer <path> --music-url <url> [--vo-dir <path>]');
    return;
  }

  // Parse common flags
  const getArg = (flag: string) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : undefined; };

  switch (cmd) {
    case 'search-music': {
      const query = getArg('--query') || 'epic cinematic orchestral trailer';
      const minDur = parseInt(getArg('--min-duration') || '120');
      await searchMusic(query, minDur);
      break;
    }
    case 'download-music': {
      const id = parseInt(getArg('--id') || '0');
      if (!id) { console.error('Missing --id'); break; }
      const path = await downloadMusic(id);
      if (path) console.log(`\nNext: pin to IPFS with:\n  npx ts-node scripts/marketing/audio-pipeline.ts pin --file "${path}" --name "trailer-music.mp3"`);
      break;
    }
    case 'list-voices':
      await listVoices();
      break;
    case 'voiceover': {
      const text = getArg('--text');
      if (!text) { console.error('Missing --text'); break; }
      const voice = getArg('--voice');
      const filename = getArg('--filename') || 'voiceover.mp3';
      await generateVoiceover(text, filename, voice);
      break;
    }
    case 'voiceover-all': {
      const voice = getArg('--voice');
      await generateAllVoiceovers(voice);
      break;
    }
    case 'pin': {
      const file = getArg('--file');
      const name = getArg('--name');
      if (!file || !name) { console.error('Missing --file or --name'); break; }
      await pinToIPFS(file, name);
      break;
    }
    case 'add-audio': {
      const trailer = getArg('--trailer');
      const musicUrl = getArg('--music-url');
      if (!trailer || !musicUrl) { console.error('Missing --trailer or --music-url'); break; }
      // For voiceovers, we'd need to pin them first and collect URLs
      addAudioToTrailer(trailer, musicUrl);
      break;
    }
    default:
      console.error(`Unknown command: ${cmd}`);
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
