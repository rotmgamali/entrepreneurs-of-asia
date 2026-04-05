/**
 * YouTube Nomad Channel Email Scraper
 *
 * Scrapes business emails from YouTube channel "About" pages
 * and digital nomad / remote work websites.
 *
 * Targets: digital nomad YouTubers, Thailand/CM travel vloggers,
 * remote work educators, expat community sites.
 *
 * YouTube channels publicly display business inquiry emails.
 * No API key needed — just fetches public pages.
 *
 * Usage: npx ts-node scripts/youtube-nomad-email-scraper.ts
 *
 * Output feeds into the Leads sheet in Google Sheets.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const OUTPUT_DIR = path.resolve(__dirname, 'output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── Types ──────────────────────────────────────────────────
interface Contact {
  name: string;
  email: string;
  platform: string;
  url: string;
  category: string;
  source: string;
}

// ─── Email Regex ────────────────────────────────────────────
const EMAIL_REGEX = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;
const EMAIL_BLACKLIST = [
  'example.com', 'email.com', 'domain.com', 'yoursite.com',
  'sentry.io', 'w3.org', 'schema.org', 'cloudflare.com',
  'wordpress.org', 'github.com', 'placeholder.com',
  'wixpress.com', 'squarespace.com', 'google.com',
  'apple.com', 'mozilla.org', 'facebook.com', 'twitter.com',
  'privacy@', 'abuse@', 'noreply@', 'no-reply@', 'support@',
  'webmaster@', 'postmaster@', 'admin@', 'info@localhost',
  'youtube.com', 'instagram.com', 'tiktok.com', 'linkedin.com',
];

function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) ?? [];
  return [...new Set(matches)].filter(email => {
    const lower = email.toLowerCase();
    return !EMAIL_BLACKLIST.some(bl => lower.includes(bl));
  });
}

// ─── Targets ────────────────────────────────────────────────

// YouTube channels in the digital nomad / travel / remote work space
const YOUTUBE_CHANNELS = [
  // Digital nomad lifestyle — large channels
  { handle: '@ReiRinaldi', category: 'digital nomad lifestyle' },
  { handle: '@NomadCapitalist', category: 'offshore/nomad entrepreneur' },
  { handle: '@LearningSustainability', category: 'nomad slow travel' },
  { handle: '@NotQuiteNiall', category: 'long-term travel vlogger' },
  { handle: '@ChristheFreelancer', category: 'freelance/nomad' },
  { handle: '@ProjectEngineer', category: 'remote engineering' },
  { handle: '@GonnaFlyNow', category: 'digital nomad vlog' },
  { handle: '@MaxFisch', category: 'nomad entrepreneur' },
  { handle: '@LiveAndWorkAnywhere', category: 'remote work educator' },
  { handle: '@TheProfessionalHobo', category: 'long-term travel' },
  { handle: '@TravelTomTom', category: 'travel vlogger' },
  // Chiang Mai / Thailand specific
  { handle: '@ExpatKings', category: 'Thailand expat' },
  { handle: '@TaylorandSamantha', category: 'Thailand expat vlog' },
  { handle: '@BenAndJess', category: 'Thailand slow travel' },
  { handle: '@ThailandLifeTV', category: 'Thailand lifestyle' },
  { handle: '@LiveInThailand', category: 'Thailand expat' },
  { handle: '@ChiangMaiExpatLife', category: 'Chiang Mai expat' },
  { handle: '@NomadThailand', category: 'Thailand nomad' },
  { handle: '@TheThailandLife', category: 'Thailand expat' },
  { handle: '@ExpatInThailand', category: 'Thailand expat' },
  { handle: '@ThailandExpat', category: 'Thailand expat' },
  // Remote work / freelance educators
  { handle: '@MorganMakesMotion', category: 'freelance creative nomad' },
  { handle: '@JarrodsTech', category: 'remote tech work' },
  { handle: '@SelfMadeMillennial', category: 'remote career' },
  { handle: '@RemoteWorkLife', category: 'remote work educator' },
  { handle: '@DariusForoux', category: 'productivity/remote work' },
  { handle: '@Thomas_Frank', category: 'productivity/work' },
  { handle: '@mkbhd', category: 'tech YouTuber (nomad adjacent)' },
  // Travel bloggers / slow travel
  { handle: '@KaraAndNate', category: 'full-time travel couple' },
  { handle: '@ErikExplores', category: 'slow travel' },
  { handle: '@Kristen_Sarah', category: 'vegan travel nomad' },
  { handle: '@HerPackingList', category: 'female travel' },
  { handle: '@BrennanBirthplace', category: 'travel vlogger' },
  { handle: '@Lost_LeBlancs', category: 'travel couple' },
  { handle: '@DomJolly', category: 'travel vlogger' },
  { handle: '@HumphreyYang', category: 'finance + travel' },
  { handle: '@GottaHaveIt', category: 'nomad vlog' },
  { handle: '@MieskeFilms', category: 'nomad filmmaker' },
  // Entrepreneur / business nomads
  { handle: '@GrahamStephan', category: 'entrepreneur finance' },
  { handle: '@AlexHormozi', category: 'entrepreneur' },
  { handle: '@BusinessInsider', category: 'business media' },
  { handle: '@StartupTips', category: 'startup/entrepreneur' },
  { handle: '@HaraldBaldr', category: 'expat entrepreneur vlog' },
  { handle: '@NarrateurDeVie', category: 'nomad entrepreneur French' },
  // Southeast Asia focused
  { handle: '@SEAsiaTraveller', category: 'SE Asia travel' },
  { handle: '@AsiaTravelHubs', category: 'Asia travel guide' },
  { handle: '@NomadList', category: 'nomad community media' },
  { handle: '@BangkokNomad', category: 'Bangkok/Thailand nomad' },
];

// Nomad / remote work ecosystem websites
const PROJECT_WEBSITES = [
  // Nomad communities and directories
  { url: 'https://nomadlist.com/about', name: 'Nomad List', category: 'nomad directory' },
  { url: 'https://www.workfrom.co/about', name: 'Workfrom', category: 'coworking directory' },
  { url: 'https://coworker.com/about', name: 'Coworker.com', category: 'coworking directory' },
  { url: 'https://www.remoteyear.com/contact', name: 'Remote Year', category: 'nomad program' },
  { url: 'https://www.wifi-tribe.com/contact', name: 'WiFi Tribe', category: 'nomad community' },
  { url: 'https://www.hacker-paradise.org/contact', name: 'Hacker Paradise', category: 'nomad program' },
  { url: 'https://www.remotebase.com/about', name: 'Remotebase', category: 'remote jobs' },
  { url: 'https://www.escapartist.com/contact/', name: 'Escapartist', category: 'expat media' },
  // Thailand / Chiang Mai coworking & nomad hubs
  { url: 'https://chiangmaiworkspace.com', name: 'CM Workspace', category: 'Chiang Mai coworking' },
  { url: 'https://www.punspace.com', name: 'PunSpace', category: 'Chiang Mai coworking' },
  { url: 'https://www.camp.co.th', name: 'CAMP', category: 'Chiang Mai coworking' },
  { url: 'https://www.mana-coworking.com', name: 'MANA', category: 'Chiang Mai coworking' },
  // Digital nomad media / blogs
  { url: 'https://www.theprofessionalhobo.com/contact/', name: 'The Professional Hobo', category: 'nomad blog' },
  { url: 'https://expertvagabond.com/contact/', name: 'Expert Vagabond', category: 'nomad blog' },
  { url: 'https://www.nomadicmatt.com/contact/', name: 'Nomadic Matt', category: 'travel blog' },
  { url: 'https://www.liveandletsjump.com/contact', name: 'Live and Let\'s Jump', category: 'nomad blog' },
  { url: 'https://www.becomingdigitalnomad.com/contact', name: 'Becoming DN', category: 'nomad education' },
  { url: 'https://digitalnomadwannabe.com/about/', name: 'DN Wannabe', category: 'nomad blog' },
  { url: 'https://www.goats-on-the-road.com/contact/', name: 'Goats on the Road', category: 'travel blog' },
  { url: 'https://www.travelfreak.com/contact/', name: 'Travel Freak', category: 'travel blog' },
  // Remote work tools and platforms (have partnership/press contacts)
  { url: 'https://remote.com/contact', name: 'Remote.com', category: 'remote work platform' },
  { url: 'https://www.deel.com/contact', name: 'Deel', category: 'remote work platform' },
  { url: 'https://www.rippling.com/about', name: 'Rippling', category: 'remote HR' },
  { url: 'https://remote.co/contact-us/', name: 'Remote.co', category: 'remote job board' },
  { url: 'https://weworkremotely.com/pages/contact', name: 'We Work Remotely', category: 'remote job board' },
  { url: 'https://remoteok.com', name: 'Remote OK', category: 'remote job board' },
  { url: 'https://www.flexjobs.com/contact', name: 'FlexJobs', category: 'flexible job board' },
  // Thailand expat media
  { url: 'https://thethaiger.com/contact', name: 'The Thaiger', category: 'Thailand media' },
  { url: 'https://coconuts.co/contact/', name: 'Coconuts', category: 'SE Asia media' },
  { url: 'https://www.bangkokpost.com/about/contact-us', name: 'Bangkok Post', category: 'Thailand media' },
  { url: 'https://www.chiangmaicitynews.com/contact/', name: 'CM City News', category: 'Chiang Mai media' },
  { url: 'https://www.chiangmainews.com/contact', name: 'CM News', category: 'Chiang Mai media' },
  // Entrepreneur / startup media for nomads
  { url: 'https://www.indiehackers.com/about', name: 'Indie Hackers', category: 'indie entrepreneur' },
  { url: 'https://www.producthunt.com/contact', name: 'Product Hunt', category: 'startup platform' },
  { url: 'https://www.starterstory.com/contact', name: 'Starter Story', category: 'entrepreneur media' },
  // Podcast networks
  { url: 'https://www.tropicalmba.com/contact/', name: 'Tropical MBA', category: 'nomad entrepreneur podcast' },
  { url: 'https://www.locationrebel.com/contact/', name: 'Location Rebel', category: 'remote work community' },
  { url: 'https://www.onlinedispatch.com', name: 'Online Dispatch', category: 'nomad podcast' },
];

// ─── Fetcher ────────────────────────────────────────────────
async function fetchPage(url: string, timeout = 10000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── YouTube About Page Scraper ─────────────────────────────
async function scrapeYouTubeAbout(handle: string): Promise<{ emails: string[]; description: string }> {
  const url = `https://www.youtube.com/${handle}/about`;
  const html = await fetchPage(url, 12000);
  if (!html) return { emails: [], description: '' };

  const emails = extractEmails(html);
  const descMatch = html.match(/"description":"((?:[^"\\]|\\.)*)"/);
  const description = descMatch?.[1]?.replace(/\\n/g, ' ').substring(0, 200) ?? '';

  return { emails, description };
}

// ─── Website Scraper ────────────────────────────────────────
async function scrapeWebsite(url: string): Promise<string[]> {
  const allEmails: string[] = [];

  const html = await fetchPage(url);
  if (!html) return [];
  allEmails.push(...extractEmails(html));

  const baseUrl = new URL(url).origin;
  const contactPaths = ['/contact', '/contact-us', '/about', '/press', '/partnerships', '/advertise'];

  for (const p of contactPaths) {
    const contactUrl = `${baseUrl}${p}`;
    if (contactUrl === url) continue;
    await sleep(500);
    const contactHtml = await fetchPage(contactUrl, 5000);
    if (contactHtml) {
      allEmails.push(...extractEmails(contactHtml));
    }
  }

  return [...new Set(allEmails)];
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Digital Nomad & Chiang Mai Contact Finder                 ║');
  console.log('║  YouTube channels + Nomad/Remote websites                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const contacts: Contact[] = [];
  const seenEmails = new Set<string>();

  // ─── Phase 1: YouTube channels ────────────────────────────
  console.log('═══ PHASE 1: YouTube Channel Emails ═══');
  let ytFound = 0;

  for (let i = 0; i < YOUTUBE_CHANNELS.length; i++) {
    const ch = YOUTUBE_CHANNELS[i];
    process.stdout.write(`  [${i + 1}/${YOUTUBE_CHANNELS.length}] ${ch.handle}... `);

    const { emails, description } = await scrapeYouTubeAbout(ch.handle);

    if (emails.length > 0) {
      for (const email of emails) {
        if (!seenEmails.has(email.toLowerCase())) {
          seenEmails.add(email.toLowerCase());
          contacts.push({
            name: ch.handle.replace('@', ''),
            email,
            platform: 'youtube',
            url: `https://youtube.com/${ch.handle}`,
            category: ch.category,
            source: 'youtube about page',
          });
          ytFound++;
          console.log(`✅ ${email}`);
        }
      }
    } else {
      console.log('no email found');
    }

    await sleep(1500 + Math.random() * 1500);
  }

  console.log(`\n  YouTube emails found: ${ytFound}\n`);

  // ─── Phase 2: Nomad/remote work websites ──────────────────
  console.log('═══ PHASE 2: Nomad & Remote Work Website Emails ═══');
  let webFound = 0;

  for (let i = 0; i < PROJECT_WEBSITES.length; i++) {
    const site = PROJECT_WEBSITES[i];
    process.stdout.write(`  [${i + 1}/${PROJECT_WEBSITES.length}] ${site.name}... `);

    const emails = await scrapeWebsite(site.url);

    if (emails.length > 0) {
      for (const email of emails) {
        if (!seenEmails.has(email.toLowerCase())) {
          seenEmails.add(email.toLowerCase());
          contacts.push({
            name: site.name,
            email,
            platform: 'website',
            url: site.url,
            category: site.category,
            source: 'website contact page',
          });
          webFound++;
          console.log(`✅ ${email}`);
        }
      }
      if (emails.length === 0 || emails.every(e => seenEmails.has(e.toLowerCase()))) {
        console.log('(already seen or none)');
      }
    } else {
      console.log('no email found');
    }

    await sleep(2000 + Math.random() * 2000);
  }

  console.log(`\n  Website emails found: ${webFound}\n`);

  // ─── Phase 3: X/Twitter bio scraping (nomad accounts) ────
  console.log('═══ PHASE 3: X/Twitter Bio Emails (nomad accounts) ═══');
  const NOMAD_TWITTER_ACCOUNTS = [
    'nomadlist', 'NomadCapitalist', 'tropicalmba', 'levelsio', 'hnshah',
    'patio11', 'DHH', 'JasonFried', 'KarinaKatrina', 'Pieter_Levels',
    'NomadicMatt', 'oneadventurer', 'remoteyw', 'workfrom_hq',
    'coworker_com', 'RemoteOK', 'WeWorkRemotely', 'flexjobs',
    'remotedotcom', 'deelHQ', 'rippling', 'remoteyear',
    'HackerParadise', 'WiFiTribe', 'SafetyWing', 'WanderersWealth',
    'ExpatKings', 'ThailandLife', 'ChiangMaiMag', 'TheThaiger',
    'coconutsco', 'BangkokPostNews',
  ];

  let xFound = 0;
  for (const account of NOMAD_TWITTER_ACCOUNTS) {
    const url = `https://x.com/${account}`;
    const html = await fetchPage(url, 8000);

    if (html) {
      const emails = extractEmails(html);
      for (const email of emails) {
        if (!seenEmails.has(email.toLowerCase())) {
          seenEmails.add(email.toLowerCase());
          contacts.push({
            name: account,
            email,
            platform: 'twitter/x',
            url,
            category: 'nomad/remote work',
            source: 'twitter bio',
          });
          xFound++;
          console.log(`  ✅ @${account}: ${email}`);
        }
      }
    }

    await sleep(1000 + Math.random() * 1000);
  }

  console.log(`\n  Twitter/X emails found: ${xFound}\n`);

  // ─── Output ───────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`TOTAL CONTACTS: ${contacts.length}`);
  console.log(`UNIQUE EMAILS:  ${seenEmails.size}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // JSON
  const jsonPath = path.join(OUTPUT_DIR, 'nomad-contacts.json');
  fs.writeFileSync(jsonPath, JSON.stringify(contacts, null, 2));

  // CSV for Google Sheets Leads import
  const csvHeader = 'name,email,platform,url,category,source';
  const csvRows = contacts.map(c =>
    `"${c.name}","${c.email}","${c.platform}","${c.url}","${c.category}","${c.source}"`
  );
  const csvPath = path.join(OUTPUT_DIR, 'nomad-contacts.csv');
  fs.writeFileSync(csvPath, [csvHeader, ...csvRows].join('\n'));

  // Plain email list
  const emailPath = path.join(OUTPUT_DIR, 'nomad-emails.txt');
  fs.writeFileSync(emailPath, contacts.map(c => c.email).join('\n'));

  console.log('Saved:');
  console.log(`  ${jsonPath}`);
  console.log(`  ${csvPath}`);
  console.log(`  ${emailPath}`);

  console.log('\n═══ CONTACTS FOUND ═══');
  for (const c of contacts) {
    console.log(`  ${c.name.padEnd(30)} ${c.email.padEnd(40)} [${c.category}]`);
  }
}

main().catch(console.error);
