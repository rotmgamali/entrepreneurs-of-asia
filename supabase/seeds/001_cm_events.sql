-- ============================================================
-- EOA Platform – Chiang Mai Events Seed Data
-- Requires: 003_nomad_profiles.sql (cm_events table)
-- Source: ENT-20 research catalog (April 2026)
-- ============================================================
-- Run after migrations: psql $DATABASE_URL -f seeds/001_cm_events.sql
-- Or via Supabase CLI: supabase db seed
-- ============================================================

-- Clear existing seed data (safe to re-run)
truncate table cm_events restart identity cascade;

insert into cm_events (name, organizer_name, category, frequency, venue, typical_size, cost_thb, facebook_url, meetup_url, notes, is_active) values

-- ── Tier 1: Core Entrepreneur / Nomad ────────────────────────
(
  'Entrepreneurs of Asia Thursday Meetup',
  'Entrepreneurs of Asia',
  'networking',
  'weekly',
  'Secret venue, Nimman (revealed to approved attendees)',
  50,
  0,
  null,
  null,
  'Every Thursday 6pm arrival, 6:30pm presentations. Curated attendance; 20-min expert talks + revenue-tier segmented networking breakouts. Recorded for social content.',
  true
),
(
  'Chiang Mai Entrepreneurs (CME) Meetup',
  'Community-led',
  'networking',
  'monthly',
  'Rotates — Punspace Nimman, Maya Mall rooftop, local restaurants',
  55,
  0,
  'https://www.facebook.com/groups/chiangmaientrepreneurs',
  null,
  'Usually 1st or 2nd Tuesday. Business networking, pitches, local business updates. Drink minimum may apply.',
  true
),
(
  'Nomad Coffee Club',
  'Community-led',
  'social',
  'weekly',
  'Rotates — CAMP (Maya Mall), Ristr8to, Graph Café',
  20,
  0,
  'https://www.facebook.com/groups/chiangmaidigitalnomads',
  null,
  'Usually Wednesday or Friday mornings. Informal networking, remote work tips, local life. Cost = your coffee.',
  true
),
(
  'Punspace Community Events',
  'Punspace',
  'coworking',
  'other',
  'Punspace Nimman (141/1 Nimman Rd) & Punspace Tha Phae',
  40,
  150,
  'https://www.facebook.com/punspace',
  null,
  '2–4x per month. Tech talks, startup workshops, member networking, wellness. Free for members, 100–200 THB for guests.',
  true
),

-- ── Tier 2: Tech & Startup ────────────────────────────────────
(
  'Chiang Mai Tech Meetup',
  'Community-led',
  'networking',
  'monthly',
  'Rotates — coworking spaces, TCDC',
  35,
  0,
  null,
  'https://www.meetup.com/chiangmai-tech',
  'Web dev, AI/ML, product, devops, open source.',
  true
),
(
  'Startup Grind Chiang Mai',
  'Startup Grind',
  'networking',
  'monthly',
  'Various — TCDC, hotel event rooms, coworking',
  55,
  350,
  null,
  null,
  'Global franchise chapter. Founder interviews, startup ecosystem, fundraising. 200–500 THB entry. Also on Eventbrite.',
  true
),
(
  'ETH Thailand / Web3 Chiang Mai',
  'Local crypto community + ETH Thailand',
  'networking',
  'monthly',
  'Rotates — coworking spaces, crypto-friendly cafes',
  33,
  0,
  'https://www.facebook.com/groups/cryptochiangmai',
  'https://www.meetup.com/eth-thailand',
  'DeFi, NFTs, Web3 dev, blockchain infra. More frequent during bull markets.',
  true
),
(
  'CMSTE Events',
  'CMSTE / Chiang Mai University',
  'workshop',
  'other',
  'CMSTE campus, CMU Innovation Hive',
  65,
  250,
  'https://www.facebook.com/cmste',
  null,
  'Monthly / quarterly. Deep tech, biotech, startup acceleration, government-backed programs. Free–500 THB.',
  true
),

-- ── Tier 3: Creative & Professional Development ───────────────
(
  'CreativeMornings Chiang Mai',
  'CreativeMornings (global franchise)',
  'social',
  'monthly',
  'TCDC Chiang Mai or rotating creative venues',
  70,
  0,
  null,
  null,
  'Last Friday of month, 8:30 AM. Monthly global theme — creativity, design, culture, entrepreneurship. Free breakfast included.',
  true
),
(
  'TCDC Chiang Mai Workshops',
  'Thailand Creative & Design Center',
  'workshop',
  'other',
  'TCDC Chiang Mai, Airport Business Park',
  33,
  150,
  null,
  null,
  '4–8 events per month. Design thinking, branding, creative business, craft industry. Free–300 THB.',
  true
),
(
  'Toastmasters Chiang Mai',
  'Toastmasters International',
  'other',
  'weekly',
  'Various hotels & community centers',
  18,
  0,
  null,
  null,
  'Multiple clubs, each meeting 2x/month. Public speaking, leadership, communication. Free for guests (2–3 visits). Active clubs: CM Toastmasters, Lanna Toastmasters, CMU English Club.',
  true
),

-- ── Tier 4: Networking & Business ────────────────────────────
(
  'BNI Chiang Mai',
  'BNI (Business Network International)',
  'networking',
  'weekly',
  'Hotels in Nimmanhaemin / Santitham area',
  30,
  0,
  'https://www.facebook.com/bnichiangmai',
  null,
  'Several chapters. Tuesday or Wednesday mornings, 7:00–8:30 AM. Structured referral networking, one person per industry per chapter. 1 free visit, ~15,000 THB annual membership.',
  true
),
(
  'AMCHAM Chiang Mai',
  'American Chamber of Commerce Thailand',
  'networking',
  'monthly',
  'Marriott Hotel CM or member venues',
  65,
  550,
  null,
  null,
  'Monthly events + quarterly major events. US–Thailand trade, regulatory updates, business networking. 300–800 THB.',
  true
),
(
  'YEC Chiang Mai (Young Entrepreneurs)',
  'Thai Chamber of Commerce',
  'networking',
  'monthly',
  'Various member venues',
  45,
  0,
  'https://www.facebook.com/yecchiangmai',
  null,
  'Thai business culture, cross-border trade, local economy. Free for members.',
  true
),

-- ── Tier 5: Nomad & Lifestyle ─────────────────────────────────
(
  'Chiang Mai Digital Nomad Meetup',
  'Community-led',
  'social',
  'bi-weekly',
  'Rotates — Nimman cafes, Yellow coworking, MANA',
  50,
  0,
  'https://www.facebook.com/groups/chiangmaidigitalnomads',
  null,
  'Bi-weekly informal + monthly structured event. Remote work, visa tips, housing, local recommendations. 100K+ member Facebook group.',
  true
),
(
  'Ignite Chiang Mai',
  'Community-led',
  'social',
  'quarterly',
  'Rotating event venues / bars',
  100,
  150,
  'https://www.facebook.com/ignitechiangmai',
  null,
  '5-minute rapid presentations on any topic (passion talks). 100–200 THB entry.',
  true
),
(
  'Language Exchange Chiang Mai',
  'Multiple organizers (Café de Nimman, Dada Kafe)',
  'social',
  'weekly',
  'Various cafes in Nimman + Old City',
  40,
  0,
  'https://www.facebook.com/groups/languageexchangechiangmai',
  null,
  'Thai/English/Chinese/Japanese language exchange + cross-cultural networking. Free / drink purchase.',
  true
),

-- ── Annual / Seasonal Events ──────────────────────────────────
(
  'Nomad Summit Chiang Mai',
  'Nomad Summit',
  'conference',
  'other',
  'Chiang Mai (venue varies annually)',
  450,
  3500,
  null,
  null,
  'Annual. January. Remote work, nomad lifestyle, building online businesses. 300–600 attendees. One of the largest nomad-focused conferences in Asia.',
  true
),
(
  'Thailand Blockchain Week',
  'Local crypto community + international partners',
  'conference',
  'other',
  'Various Bangkok + Chiang Mai venues',
  1250,
  0,
  null,
  null,
  'Annual, Oct–Nov. Crypto, DeFi, Web3. 500–2000 attendees across multiple events.',
  true
),
(
  'Chiang Mai Maker Faire',
  'Community-led',
  'other',
  'other',
  'Various — usually TCDC or university venue',
  350,
  0,
  null,
  null,
  'Annual, Jan–Feb. Hardware, DIY, tech art. 200–500 attendees.',
  true
),
(
  'Chiang Mai Design Week',
  'TCDC / City of Chiang Mai',
  'other',
  'other',
  'Old City + Nimman area (city-wide)',
  0,
  0,
  null,
  null,
  'Annual, December. Design, art, creativity. City-wide multi-venue festival.',
  true
);

-- Verify seed count
select count(*) as events_seeded from cm_events;
