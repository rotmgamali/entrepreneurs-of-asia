/**
 * Demons & Deities — Pixabay Media Pipeline
 *
 * Search, preview, and download videos + sound effects from Pixabay.
 * Downloads go to content-assets/ and get pinned to IPFS for Shotstack.
 *
 * Usage:
 *   # Search videos
 *   npx ts-node scripts/marketing/pixabay-media.ts video-search "cosmic particles dark"
 *   npx ts-node scripts/marketing/pixabay-media.ts video-search "golden energy abstract" --min-duration 5
 *
 *   # Download a video by ID
 *   npx ts-node scripts/marketing/pixabay-media.ts video-download 339360
 *
 *   # Search sound effects
 *   npx ts-node scripts/marketing/pixabay-media.ts sfx-search "whoosh impact"
 *   npx ts-node scripts/marketing/pixabay-media.ts sfx-search "explosion epic"
 *
 *   # Download sound effect
 *   npx ts-node scripts/marketing/pixabay-media.ts sfx-download 12345
 *
 *   # Pin a downloaded file to IPFS
 *   npx ts-node scripts/marketing/pixabay-media.ts pin <filepath>
 *
 *   # Bulk search for trailer needs
 *   npx ts-node scripts/marketing/pixabay-media.ts trailer-search
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

const ROOT = process.cwd();
const STOCK_DIR = join(ROOT, 'scripts', 'marketing', 'audio', 'stock-footage');
const SFX_DIR = join(ROOT, 'scripts', 'marketing', 'audio', 'sfx');
const PINATA_API_KEY = process.env.PIXABAY_API_KEY || '54252024-c7cea17dce196b25667f98697';
const PIXABAY_KEY = '54252024-c7cea17dce196b25667f98697';
const PINATA_KEY = process.env.PINATA_API_KEY || 'd664670f2c35f6686ff4';
const PINATA_SECRET = 'fc45f5ab48b5904cac0e3efe472bddd64228504a8bc0891eaa0dedd0da53206a';

// ─── Asset catalog ─────────────────────────────────────────────────
interface CatalogEntry {
  id: string;
  source: 'pixabay' | 'local' | 'game';
  type: 'video' | 'sfx' | 'music' | 'image' | 'voiceover';
  filename: string;
  localPath: string;
  ipfsUrl?: string;
  duration?: number;
  tags: string[];
  mood: string;
  energy: number; // 1-10
  description: string;
}

const CATALOG_PATH = join(ROOT, 'scripts', 'marketing', 'audio', 'media-catalog.json');

function loadCatalog(): CatalogEntry[] {
  if (existsSync(CATALOG_PATH)) return JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));
  return [];
}
function saveCatalog(catalog: CatalogEntry[]) {
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
}

// ─── Pixabay Video Search ──────────────────────────────────────────
async function videoSearch(query: string, minDuration = 0, maxDuration = 60) {
  const url = `https://pixabay.com/api/videos/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&per_page=12&min_width=1280&order=popular${minDuration ? `&min_duration=${minDuration}` : ''}${maxDuration ? `&max_duration=${maxDuration}` : ''}`;
  const res = await fetch(url);
  const data = await res.json() as any;

  if (!data.hits?.length) { console.log('No results.'); return; }

  console.log(`\n🎬 ${data.totalHits} videos found for "${query}" (showing ${data.hits.length}):\n`);
  for (const h of data.hits) {
    const vid = h.videos?.medium || h.videos?.small || {};
    console.log(`  ID: ${h.id} | ${h.duration}s | ${h.tags}`);
    console.log(`  Preview: ${vid.url || 'N/A'}`);
    console.log(`  Download: npx ts-node scripts/marketing/pixabay-media.ts video-download ${h.id}`);
    console.log('');
  }
}

async function videoDownload(id: number): Promise<string | null> {
  if (!existsSync(STOCK_DIR)) mkdirSync(STOCK_DIR, { recursive: true });

  const url = `https://pixabay.com/api/videos/?key=${PIXABAY_KEY}&id=${id}`;
  const res = await fetch(url);
  const data = await res.json() as any;
  if (!data.hits?.length) { console.error('Video not found'); return null; }

  const hit = data.hits[0];
  // Prefer medium quality for balance of size/quality
  const vidUrl = hit.videos?.medium?.url || hit.videos?.large?.url || hit.videos?.small?.url;
  if (!vidUrl) { console.error('No download URL'); return null; }

  console.log(`  Downloading: ${hit.tags} (${hit.duration}s)...`);
  const vidRes = await fetch(vidUrl);
  const buffer = Buffer.from(await vidRes.arrayBuffer());
  const filename = `pixabay-${id}.mp4`;
  const filepath = join(STOCK_DIR, filename);
  writeFileSync(filepath, buffer);
  console.log(`  Saved: ${filepath} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);

  // Add to catalog
  const catalog = loadCatalog();
  catalog.push({
    id: `pixabay-video-${id}`,
    source: 'pixabay',
    type: 'video',
    filename,
    localPath: filepath,
    duration: hit.duration,
    tags: hit.tags.split(', '),
    mood: 'cinematic',
    energy: 5,
    description: hit.tags,
  });
  saveCatalog(catalog);

  return filepath;
}

// ─── Pixabay SFX Search (uses the standard API with type filter) ──
async function sfxSearch(query: string) {
  // Pixabay doesn't have a dedicated SFX API, but we can search their video API
  // for very short clips that work as sound effects
  const url = `https://pixabay.com/api/videos/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&per_page=10&max_duration=10&order=popular`;
  const res = await fetch(url);
  const data = await res.json() as any;

  if (!data.hits?.length) { console.log('No SFX results. Try broader terms.'); return; }

  console.log(`\n🔊 ${data.totalHits} short clips for "${query}" (showing ${data.hits.length}):\n`);
  for (const h of data.hits) {
    const vid = h.videos?.small || {};
    console.log(`  ID: ${h.id} | ${h.duration}s | ${h.tags}`);
    console.log(`  Download: npx ts-node scripts/marketing/pixabay-media.ts sfx-download ${h.id}`);
    console.log('');
  }
}

// ─── Pin to IPFS ───────────────────────────────────────────────────
async function pinFile(filepath: string): Promise<string | null> {
  const fileData = readFileSync(filepath);
  const blob = new Blob([fileData]);
  const name = basename(filepath);

  const formData = new FormData();
  formData.append('file', blob, name);
  formData.append('pinataMetadata', JSON.stringify({ name: `dd-trailer-${name}` }));
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { pinata_api_key: PINATA_KEY, pinata_secret_api_key: PINATA_SECRET },
    body: formData,
  });

  if (!res.ok) { console.error(`Pinata error: ${await res.text()}`); return null; }
  const data = await res.json() as any;
  const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
  console.log(`  Pinned: ${gatewayUrl}`);

  // Update catalog
  const catalog = loadCatalog();
  const entry = catalog.find(e => e.localPath === filepath);
  if (entry) { entry.ipfsUrl = gatewayUrl; saveCatalog(catalog); }

  return gatewayUrl;
}

// ─── Bulk trailer search ───────────────────────────────────────────
async function trailerSearch() {
  const searches = [
    { query: 'cosmic particles gold dark', use: 'Intro/transitions — golden cosmic dust' },
    { query: 'dark space nebula stars', use: 'Act 1 — cosmic void, world building' },
    { query: 'lightning energy electric dark', use: 'DEMONS reveal — aggressive energy' },
    { query: 'light rays divine celestial', use: 'DEITIES reveal — divine light' },
    { query: 'ancient temple ruins dark', use: 'Faction showcase backgrounds' },
    { query: 'magic spell cast fantasy dark', use: 'Gameplay section — abilities/combat' },
    { query: 'sword battle warrior dark', use: 'Combat montage' },
    { query: 'explosion fire dark epic', use: 'Climax/impact moments' },
    { query: 'crown gold royal luxury', use: 'Founder\'s Pass / economy section' },
    { query: 'blockchain digital technology', use: 'Web3/NFT section' },
    { query: 'galaxy formation cosmic creation', use: 'Logo reveal background' },
    { query: 'smoke dark atmospheric', use: 'Transition overlays' },
  ];

  console.log('\n🎬 TRAILER FOOTAGE SEARCH — Finding clips for each scene:\n');
  for (const s of searches) {
    console.log(`━━━ ${s.use} ━━━`);
    console.log(`  Query: "${s.query}"`);
    const url = `https://pixabay.com/api/videos/?key=${PIXABAY_KEY}&q=${encodeURIComponent(s.query)}&per_page=3&min_width=1280&order=popular&max_duration=30`;
    try {
      const res = await fetch(url);
      const data = await res.json() as any;
      if (data.hits?.length) {
        for (const h of data.hits.slice(0, 2)) {
          console.log(`  → ID:${h.id} | ${h.duration}s | ${h.tags.slice(0, 60)}`);
        }
      } else {
        console.log('  → No results');
      }
    } catch { console.log('  → Search failed'); }
    console.log('');
    await new Promise(r => setTimeout(r, 200)); // rate limit courtesy
  }
}

// ─── List catalog ──────────────────────────────────────────────────
function listCatalog() {
  const catalog = loadCatalog();
  if (catalog.length === 0) { console.log('Catalog is empty.'); return; }

  console.log(`\n📦 Media Catalog (${catalog.length} items):\n`);
  for (const e of catalog) {
    const pinned = e.ipfsUrl ? '✅' : '⏳';
    console.log(`  ${pinned} [${e.type}] ${e.filename} — ${e.description.slice(0, 50)} ${e.ipfsUrl ? `\n     IPFS: ${e.ipfsUrl}` : ''}`);
  }
}

// ─── Main ──────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd) {
    console.log('Pixabay Media Pipeline\n');
    console.log('Commands:');
    console.log('  video-search "query" [--min-duration N] [--max-duration N]');
    console.log('  video-download <pixabay-id>');
    console.log('  sfx-search "query"');
    console.log('  sfx-download <pixabay-id>');
    console.log('  pin <filepath>');
    console.log('  trailer-search          (bulk search for all trailer scenes)');
    console.log('  catalog                 (list all downloaded media)');
    return;
  }

  switch (cmd) {
    case 'video-search': {
      const query = args[1] || 'cinematic dark';
      const minD = args.includes('--min-duration') ? parseInt(args[args.indexOf('--min-duration') + 1]) : 0;
      const maxD = args.includes('--max-duration') ? parseInt(args[args.indexOf('--max-duration') + 1]) : 60;
      await videoSearch(query, minD, maxD);
      break;
    }
    case 'video-download':
      await videoDownload(parseInt(args[1]));
      break;
    case 'sfx-search':
      await sfxSearch(args[1] || 'impact whoosh');
      break;
    case 'sfx-download':
      await videoDownload(parseInt(args[1])); // same API
      break;
    case 'pin':
      if (!args[1]) { console.error('Usage: pin <filepath>'); break; }
      await pinFile(args[1]);
      break;
    case 'trailer-search':
      await trailerSearch();
      break;
    case 'catalog':
      listCatalog();
      break;
    default:
      console.error(`Unknown: ${cmd}`);
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
