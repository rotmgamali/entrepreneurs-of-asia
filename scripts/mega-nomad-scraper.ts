/**
 * Mega Nomad Contact Scraper
 *
 * Bulk contact harvesting for Chiang Mai nomad/entrepreneur database.
 * Adapted from D&D mega-scraper-10k.ts.
 *
 * Sources:
 *   1. Digital nomad directories & community sites
 *   2. Coworking space directories (global + CM)
 *   3. Remote work job boards & platforms
 *   4. Thailand expat / nomad media
 *   5. Nomad-adjacent SaaS tools (partnerships contacts)
 *
 * Output: CSV/JSON files + optional push to Google Sheets Leads tab.
 *
 * Usage:
 *   npx ts-node scripts/mega-nomad-scraper.ts
 *   npx ts-node scripts/mega-nomad-scraper.ts --push-sheets   (push to Leads sheet)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const PUSH_SHEETS = process.argv.includes('--push-sheets');
const OUTPUT_DIR = path.resolve(__dirname, 'output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── State Management ───────────────────────────────────────
const STATE_FILE = path.join(OUTPUT_DIR, 'nomad-scraper-state.json');
const CONTACTS_FILE = path.join(OUTPUT_DIR, 'mega-nomad-contacts.json');

interface Contact {
  name: string;
  email: string;
  website: string;
  category: string;
  source: string;
}

interface ScraperState {
  contacts: Contact[];
  seenEmails: string[];
  seenDomains: string[];
  phase: string;
  totalScraped: number;
}

function loadState(): ScraperState {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  }
  return {
    contacts: [],
    seenEmails: [],
    seenDomains: [],
    phase: 'direct',
    totalScraped: 0,
  };
}

function saveState(state: ScraperState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(state.contacts, null, 2));

  const csv = [
    'Name,Email,Website,Category,Source',
    ...state.contacts.map(c =>
      `"${c.name.replace(/"/g, '""')}","${c.email}","${c.website}","${c.category}","${c.source}"`
    ),
  ].join('\n');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'mega-nomad-contacts.csv'), csv);
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'mega-nomad-emails.txt'),
    state.contacts.map(c => c.email).join('\n')
  );
}

// ─── Email Extraction ───────────────────────────────────────
const EMAIL_REGEX = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;

const BLACKLIST_DOMAINS = new Set([
  'example.com', 'email.com', 'domain.com', 'yoursite.com', 'sentry.io',
  'w3.org', 'schema.org', 'cloudflare.com', 'wordpress.org', 'github.com',
  'wixpress.com', 'squarespace.com', 'google.com', 'apple.com', 'mozilla.org',
  'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'youtube.com',
  'gstatic.com', 'googleapis.com', 'jquery.com', 'jsdelivr.net', 'unpkg.com',
  'fontawesome.com', 'bootstrapcdn.com', 'cdnjs.com', 'amazonaws.com',
  'intercom.io', 'hubspot.com', 'mailchimp.com', 'sendgrid.net',
  'zendesk.com', 'crisp.chat', 'drift.com', 'livechat.com',
  'gravatar.com', 'wp.com', 'shopify.com', 'netlify.com', 'vercel.com',
  'heroku.com', 'digitalocean.com', 'godaddy.com', 'namecheap.com',
  'outlook.com', 'hotmail.com', 'proton.me', 'linkedin.com',
  'pngegg.com', 'cleanpng.com', 'imgix.net', 'twimg.com',
]);

const BLACKLIST_PREFIXES = [
  'noreply@', 'no-reply@', 'support@', 'abuse@', 'postmaster@',
  'webmaster@', 'mailer-daemon@', 'donotreply@', 'unsubscribe@',
  'bounce@', 'feedback@', 'auto@', 'system@', 'notifications@',
  'privacy@', 'security@', 'compliance@', 'legal@', 'dmca@',
  'test@', 'demo@', 'example@', 'root@', 'hostmaster@',
];

function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) ?? [];
  return [...new Set(matches)].filter(email => {
    const lower = email.toLowerCase();
    const domain = lower.split('@')[1];
    if (!domain) return false;
    if (BLACKLIST_DOMAINS.has(domain)) return false;
    if (BLACKLIST_PREFIXES.some(p => lower.startsWith(p))) return false;
    if (lower.length > 60) return false;
    if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i.test(lower)) return false;
    return true;
  });
}

// ─── HTTP ───────────────────────────────────────────────────
let totalRequests = 0;
let successRequests = 0;

async function fetchPage(url: string, timeout = 8000): Promise<string | null> {
  totalRequests++;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    successRequests++;
    const text = await res.text();
    return text.substring(0, 50000);
  } catch {
    return null;
  }
}

async function fetchJSON(url: string, timeout = 10000): Promise<any> {
  totalRequests++;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept': 'application/json',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    successRequests++;
    return await res.json();
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Website Scraper ────────────────────────────────────────
async function scrapeWebsiteEmails(baseUrl: string): Promise<string[]> {
  const allEmails: string[] = [];

  const html = await fetchPage(baseUrl);
  if (html) {
    allEmails.push(...extractEmails(html));
  }

  try {
    const origin = new URL(baseUrl).origin;
    const paths = ['/contact', '/about', '/team', '/contact-us', '/about-us'];
    for (const p of paths.slice(0, 2)) {
      const subHtml = await fetchPage(`${origin}${p}`, 5000);
      if (subHtml) {
        allEmails.push(...extractEmails(subHtml));
      }
      await sleep(200);
    }
  } catch {}

  return [...new Set(allEmails)];
}

// ─── Nomad Ecosystem Website Lists ──────────────────────────
function getNomadWebsites(): Array<{ name: string; website: string; category: string }> {
  return [
    // ── Nomad directories & communities ──────────────────────
    ...[
      'https://nomadlist.com', 'https://www.workfrom.co', 'https://coworker.com',
      'https://www.coworkingmap.org', 'https://coworkinginsider.com', 'https://coworkingtoolbox.com',
      'https://outsite.co', 'https://www.selina.com', 'https://draper.com',
      'https://www.iqoffices.com', 'https://andco.com', 'https://www.thehub.io',
      'https://www.betahaus.com', 'https://www.impact-hub.net',
    ].map(u => ({ name: hostname(u), website: u, category: 'coworking/nomad directory' })),

    // ── Nomad programs & retreats ─────────────────────────────
    ...[
      'https://www.remoteyear.com', 'https://www.wifi-tribe.com',
      'https://www.hacker-paradise.org', 'https://www.noma.co',
      'https://www.roamingremote.com', 'https://www.remoteworkretreat.com',
      'https://www.beachbum.io', 'https://www.pack-up-and-go.com',
      'https://dynamitecircle.com', 'https://onlinenomads.com',
      'https://www.locationindependent.co',
    ].map(u => ({ name: hostname(u), website: u, category: 'nomad program' })),

    // ── Thailand / Chiang Mai coworking spaces ────────────────
    ...[
      'https://www.punspace.com', 'https://chiangmaiworkspace.com',
      'https://www.mana-coworking.com', 'https://nimman.club',
      'https://www.camp.co.th', 'https://www.garage.co.th',
      'https://www.thestarterlab.com', 'https://www.truerocketcoffeehouse.com',
    ].map(u => ({ name: hostname(u), website: u, category: 'Chiang Mai coworking' })),

    // ── Remote job boards ─────────────────────────────────────
    ...[
      'https://remoteok.com', 'https://weworkremotely.com', 'https://remote.co',
      'https://www.flexjobs.com', 'https://www.justremote.co', 'https://himalayas.app',
      'https://www.jobspresso.co', 'https://www.eureka.io', 'https://www.pangian.com',
      'https://remotehub.io', 'https://www.workingnomads.com',
      'https://www.nodesk.co', 'https://www.jobstoremote.co',
    ].map(u => ({ name: hostname(u), website: u, category: 'remote job board' })),

    // ── Remote work SaaS & platforms ─────────────────────────
    ...[
      'https://remote.com', 'https://www.deel.com', 'https://www.rippling.com',
      'https://www.gusto.com', 'https://www.oysterhr.com', 'https://www.remofirst.com',
      'https://www.papayaglobal.com', 'https://www.safetywing.com',
      'https://www.heymondo.com', 'https://www.worldpackers.com',
      'https://www.workaway.info', 'https://helpx.net',
    ].map(u => ({ name: hostname(u), website: u, category: 'remote work platform' })),

    // ── Nomad & travel blogs (high DA, partnership contacts) ──
    ...[
      'https://www.nomadicmatt.com', 'https://expertvagabond.com',
      'https://www.theprofessionalhobo.com', 'https://www.goats-on-the-road.com',
      'https://thetravelingnomad.com', 'https://becomingdigitalnomad.com',
      'https://www.makingsenseofcents.com', 'https://www.twentysomethingtraveler.com',
      'https://www.theblondeabroad.com', 'https://www.adventurouskate.com',
      'https://www.wanderlust.co.uk', 'https://lostgirlsguide.com',
      'https://www.travelfreak.com', 'https://www.worldpackers.com',
      'https://www.vagabondish.com', 'https://www.travlinmad.com',
      'https://digitalnomadwannabe.com', 'https://www.liveandletsjump.com',
      'https://www.locationrebel.com', 'https://www.onlinedispatch.com',
      'https://www.tropicalmba.com',
    ].map(u => ({ name: hostname(u), website: u, category: 'nomad/travel blog' })),

    // ── Thailand / Chiang Mai expat media ────────────────────
    ...[
      'https://thethaiger.com', 'https://coconuts.co',
      'https://www.bangkokpost.com', 'https://www.chiangmaicitylife.com',
      'https://www.chiangmainews.com', 'https://www.chiangmaimail.com',
      'https://www.expatinfothailand.com', 'https://www.thaivisa.com',
      'https://www.internations.org', 'https://www.expat.com',
      'https://www.expatica.com', 'https://www.livinginthai.com',
    ].map(u => ({ name: hostname(u), website: u, category: 'Thailand/expat media' })),

    // ── Nomad entrepreneur / indie hacker media ───────────────
    ...[
      'https://www.indiehackers.com', 'https://www.starterstory.com',
      'https://www.producthunt.com', 'https://hackernoon.com',
      'https://www.entrepreneur.com', 'https://www.inc.com',
      'https://www.fastcompany.com', 'https://foundr.com',
      'https://www.businessinsider.com', 'https://www.sideprojectclub.com',
      'https://makerpad.co', 'https://www.nomadentrepreneur.com',
      'https://www.dynamitecircle.com', 'https://www.founderpath.com',
    ].map(u => ({ name: hostname(u), website: u, category: 'entrepreneur media' })),

    // ── Coworking & nomad conferences / events ────────────────
    ...[
      'https://www.gno.global', 'https://www.coworkingeurope.net',
      'https://www.gnas.global', 'https://nomadsummit.com',
      'https://www.digitalnomadsummit.com', 'https://www.remotecon.co',
      'https://www.remoteworkconference.com', 'https://nomadtopia.com',
    ].map(u => ({ name: hostname(u), website: u, category: 'nomad conference/event' })),

    // ── Asia startup / tech media ─────────────────────────────
    ...[
      'https://e27.co', 'https://techinasia.com', 'https://kr-asia.com',
      'https://www.dealstreetasia.com', 'https://www.thestraitstimes.com',
      'https://www.bangkokinsider.com', 'https://www.dtnext.in',
      'https://www.elevate.in.th', 'https://techsauce.co',
    ].map(u => ({ name: hostname(u), website: u, category: 'Asia tech/startup media' })),
  ];
}

function hostname(u: string): string {
  try { return new URL(u).hostname.replace('www.', ''); } catch { return u; }
}

// ─── Nomad List API ─────────────────────────────────────────
// Nomad List has a public explore page with city data.
// We can use city-specific pages to find community contacts.
async function getNomadListCityContacts(): Promise<Array<{ name: string; website: string; category: string }>> {
  const cmCities = [
    'chiang-mai', 'bangkok', 'bali', 'medellín', 'lisbon', 'tbilisi', 'playa-del-carmen',
  ];

  const sites: Array<{ name: string; website: string; category: string }> = [];

  for (const city of cmCities) {
    const url = `https://nomadlist.com/${city}`;
    const html = await fetchPage(url, 10000);
    if (!html) continue;

    // Extract coworking space links from Nomad List city pages
    const coworkingLinks = [...html.matchAll(/href="(https?:\/\/[^"]+)"[^>]*>[^<]*cowork/gi)];
    for (const match of coworkingLinks.slice(0, 5)) {
      const siteUrl = match[1];
      try {
        const domain = new URL(siteUrl).hostname;
        sites.push({ name: domain, website: siteUrl, category: `coworking (${city})` });
      } catch {}
    }

    await sleep(2000);
  }

  return sites;
}

// ─── Google Sheets Push ──────────────────────────────────────
async function pushToSheets(contacts: Contact[]) {
  if (!process.env.GOOGLE_SPREADSHEET_ID) {
    console.log('  ⚠️ GOOGLE_SPREADSHEET_ID not set — skipping Sheets push');
    return;
  }

  console.log(`\n═══ PUSHING ${contacts.length} contacts to Google Sheets Leads tab ═══`);

  // Dynamically import sheets lib (requires googleapis installed)
  try {
    const { appendRow } = await import('../src/lib/sheets');
    let pushed = 0;
    let skipped = 0;

    for (const c of contacts) {
      try {
        await appendRow('Leads', {
          name: c.name,
          platform: c.platform ?? 'website',
          profile_url: c.website,
          business_niche: c.category,
          location: c.category.includes('Chiang Mai') ? 'Chiang Mai, Thailand' : '',
          outreach_status: 'new',
          source: c.source,
          campaign: 'mega-nomad-scraper',
          notes: `email: ${c.email}`,
        });
        pushed++;
        if (pushed % 10 === 0) process.stdout.write(`  ... ${pushed} pushed\r`);
      } catch (err: any) {
        skipped++;
      }
      await sleep(300); // Sheets API rate limit
    }

    console.log(`\n  ✅ Pushed ${pushed} rows, skipped ${skipped}`);
  } catch (err: any) {
    console.log(`  ❌ Sheets push failed: ${err.message}`);
    console.log('     Make sure googleapis is installed: npm install googleapis');
  }
}

// ─── Main Pipeline ──────────────────────────────────────────
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  MEGA NOMAD CONTACT SCRAPER                                   ║');
  console.log('║  Target: bulk contacts from nomad/remote work ecosystem       ║');
  if (PUSH_SHEETS) {
    console.log('║  Mode: SCRAPE + PUSH TO GOOGLE SHEETS                        ║');
  }
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const state = loadState();
  const seenEmails = new Set(state.seenEmails);
  const seenDomains = new Set(state.seenDomains);
  const contacts = state.contacts;

  function addContact(name: string, email: string, website: string, category: string, source: string): boolean {
    const lower = email.toLowerCase();
    if (seenEmails.has(lower)) return false;
    seenEmails.add(lower);
    contacts.push({ name, email, website, category, source });
    return true;
  }

  function saveProgress() {
    state.contacts = contacts;
    state.seenEmails = [...seenEmails];
    state.seenDomains = [...seenDomains];
    state.totalScraped = seenDomains.size;
    saveState(state);
  }

  // ═══ PHASE 1: Direct nomad website list ═══════════════════
  console.log('═══ PHASE 1: Direct Nomad Website Scraping ═══');
  const websites = getNomadWebsites();

  const newWebsites = websites.filter(w => {
    try {
      const domain = new URL(w.website).hostname;
      return !seenDomains.has(domain);
    } catch { return false; }
  });

  console.log(`  ${newWebsites.length} new sites to scrape (${websites.length - newWebsites.length} already done)`);

  for (let i = 0; i < newWebsites.length; i += 5) {
    const batch = newWebsites.slice(i, i + 5);

    const results = await Promise.all(batch.map(async site => {
      const emails = await scrapeWebsiteEmails(site.website);
      return { site, emails };
    }));

    for (const { site, emails } of results) {
      try {
        const domain = new URL(site.website).hostname;
        seenDomains.add(domain);
      } catch {}

      for (const email of emails) {
        if (addContact(site.name, email, site.website, site.category, 'website')) {
          console.log(`  ✅ ${site.name}: ${email}`);
        }
      }
    }

    if ((i + 5) % 25 === 0 || i + 5 >= newWebsites.length) {
      const done = Math.min(i + 5, newWebsites.length);
      console.log(`  ... ${done}/${newWebsites.length} scraped | ${contacts.length} total emails`);
      saveProgress();
    }

    await sleep(1000);
  }

  console.log(`\n  Phase 1 complete: ${contacts.length} total emails\n`);

  // ═══ PHASE 2: Nomad List city-specific contacts ════════════
  console.log('═══ PHASE 2: Nomad List City Pages ═══');
  const nlSites = await getNomadListCityContacts();
  const newNLSites = nlSites.filter(w => {
    try { return !seenDomains.has(new URL(w.website).hostname); } catch { return false; }
  });

  console.log(`  Found ${newNLSites.length} new coworking sites from Nomad List`);

  for (let i = 0; i < newNLSites.length; i += 3) {
    const batch = newNLSites.slice(i, i + 3);
    const results = await Promise.all(batch.map(async site => ({
      site,
      emails: await scrapeWebsiteEmails(site.website),
    })));

    for (const { site, emails } of results) {
      try { seenDomains.add(new URL(site.website).hostname); } catch {}
      for (const email of emails) {
        if (addContact(site.name, email, site.website, site.category, 'nomadlist-city')) {
          console.log(`  ✅ ${site.name}: ${email}`);
        }
      }
    }

    await sleep(1500);
  }

  saveProgress();
  console.log(`\n  Phase 2 complete: ${contacts.length} total emails\n`);

  // ═══ PHASE 3: Coworker.com directory ══════════════════════
  // Coworker.com has a public JSON API for coworking spaces
  if (contacts.length < 5000) {
    console.log('═══ PHASE 3: Coworker.com Directory ═══');

    const coworkerCities = [
      'chiang-mai', 'bangkok', 'bali', 'lisbon', 'medellin',
      'berlin', 'barcelona', 'ho-chi-minh-city', 'singapore', 'taipei',
    ];

    for (const city of coworkerCities) {
      if (contacts.length >= 5000) break;

      const data = await fetchJSON(
        `https://www.coworker.com/api/v1/spaces?city=${encodeURIComponent(city)}&per_page=50`,
        10000
      );

      if (data?.spaces) {
        console.log(`  ${city}: ${data.spaces.length} spaces`);
        for (const space of data.spaces) {
          const website = space.website || space.url;
          if (!website) continue;
          try {
            const domain = new URL(website).hostname;
            if (seenDomains.has(domain)) continue;
            seenDomains.add(domain);
          } catch { continue; }

          const emails = await scrapeWebsiteEmails(website);
          for (const email of emails) {
            if (addContact(space.name || hostname(website), email, website, `coworking (${city})`, 'coworker.com')) {
              console.log(`    ✅ ${space.name}: ${email}`);
            }
          }
          await sleep(500);
        }
      }

      saveProgress();
      await sleep(2000);
    }

    console.log(`\n  Phase 3 complete: ${contacts.length} total emails\n`);
  }

  // ═══ FINAL OUTPUT ══════════════════════════════════════════
  saveProgress();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  TOTAL CONTACTS: ${contacts.length}`);
  console.log(`  TOTAL SITES SCRAPED: ${seenDomains.size}`);
  console.log(`  HTTP REQUESTS: ${totalRequests} (${successRequests} succeeded)`);

  // Breakdown by category
  const byCat = new Map<string, number>();
  for (const c of contacts) {
    byCat.set(c.category, (byCat.get(c.category) ?? 0) + 1);
  }
  console.log('\n  By category:');
  for (const [cat, count] of [...byCat.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat}: ${count}`);
  }

  console.log('\n  Files:');
  console.log(`    ${CONTACTS_FILE}`);
  console.log(`    ${path.join(OUTPUT_DIR, 'mega-nomad-contacts.csv')}`);
  console.log(`    ${path.join(OUTPUT_DIR, 'mega-nomad-emails.txt')}`);
  console.log('═══════════════════════════════════════════════════════════');

  // Push to Google Sheets if flag set
  if (PUSH_SHEETS && contacts.length > 0) {
    await pushToSheets(contacts);
  } else if (!PUSH_SHEETS && contacts.length > 0) {
    console.log('\n  Tip: Re-run with --push-sheets to push results to Google Sheets Leads tab.');
  }
}

main().catch(console.error);
