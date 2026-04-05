-- ============================================================
-- EOA Platform – Nomad Profile Database
-- Requires: 001_initial_schema.sql (set_updated_at, contacts)
-- ============================================================
-- Two new tables:
--   nomad_profiles  – enriched research records (OSINT + self-registration)
--   cm_events       – Chiang Mai event catalog (feeds nomad event history)
--
-- Design principle: contacts = self-registered intake form.
--   nomad_profiles = the full research database (may or may not have
--   a matching contacts row). contact_id links them when known.
-- ============================================================

-- ── nomad_profiles ───────────────────────────────────────────
create table if not exists nomad_profiles (
  id                    uuid primary key default gen_random_uuid(),

  -- Link to self-registered contact (optional)
  contact_id            uuid references contacts(id) on delete set null,

  -- Identity
  slug                  text unique,  -- URL-safe identifier, e.g. "jake-thornton"
  full_name             text not null,
  first_name            text,
  last_name             text,
  nationality           text,
  languages             text[] not null default '{}',

  -- Professional
  profession            text,
  skills                text[] not null default '{}',
  company_name          text,
  company_url           text,
  current_projects      text,

  -- Contact
  email_primary         text,
  email_secondary       text,
  phone_whatsapp        text,
  website               text,

  -- Social profiles
  linkedin_url          text,
  twitter_x_handle      text,
  instagram_handle      text,
  facebook_profile_url  text,
  youtube_channel_url   text,
  tiktok_handle         text,
  github_url            text,

  -- Chiang Mai presence
  coworking_spaces      text[] not null default '{}',
  -- values: CAMP | Punspace | MANA | Yellow | Hub53 | Think Park | other
  neighborhoods         text[] not null default '{}',
  -- values: Nimman | Old City | Santitham | Hang Dong | other
  stay_pattern          text check (stay_pattern in ('permanent', 'long-term', 'seasonal', 'transient')),
  cm_first_seen_date    date,
  cm_last_active_date   date,

  -- Community engagement
  event_history         jsonb not null default '[]',
  -- format: [{"event_id": "uuid", "event_name": "...", "date": "YYYY-MM-DD", "role": "attendee|speaker|organizer"}]
  facebook_groups       text[] not null default '{}',
  community_role        text check (community_role in ('organizer', 'speaker', 'regular', 'occasional', 'lurker')),

  -- CRM linkage (existing 30K contact list)
  crm_contact_id        text,
  outreach_status       text not null default 'not_contacted'
                          check (outreach_status in ('not_contacted', 'contacted', 'responded', 'member', 'inactive')),
  relationship_strength integer not null default 0
                          check (relationship_strength between 0 and 5),

  -- Data quality & provenance
  data_sources          jsonb not null default '{}',
  -- format: {"facebook": true, "linkedin": "https://...", "manual": true, "crm": true}
  enrichment_status     text not null default 'raw'
                          check (enrichment_status in ('raw', 'partial', 'enriched', 'verified')),
  confidence_score      integer not null default 0
                          check (confidence_score between 0 and 100),
  verified_at           timestamptz,
  tags                  text[] not null default '{}',
  notes                 text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ── cm_events ────────────────────────────────────────────────
-- Catalog of recurring and one-off CM entrepreneur/nomad events.
-- Separate from the `events` table (which tracks EOA's own events).
create table if not exists cm_events (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  organizer_name text,
  organizer_id   uuid references nomad_profiles(id) on delete set null,
  category       text check (category in ('networking', 'workshop', 'social', 'coworking', 'conference', 'other')),
  frequency      text check (frequency in ('one-off', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'other')),
  venue          text,
  typical_size   integer,
  cost_thb       integer not null default 0,
  facebook_url   text,
  meetup_url     text,
  eventbrite_url text,
  luma_url       text,
  notes          text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── updated_at triggers ──────────────────────────────────────
-- Reuse set_updated_at() from 001_initial_schema.sql
create trigger nomad_profiles_updated_at
  before update on nomad_profiles
  for each row execute function set_updated_at();

create trigger cm_events_updated_at
  before update on cm_events
  for each row execute function set_updated_at();

-- ── Row Level Security ───────────────────────────────────────
alter table nomad_profiles enable row level security;
alter table cm_events      enable row level security;

-- nomad_profiles: service role only (research data, never public)
create policy "service role full access to nomad_profiles"
  on nomad_profiles for all to service_role
  using (true) with check (true);

-- cm_events: public can read active events; service role can write
create policy "public can read active cm_events"
  on cm_events for select to anon
  using (is_active = true);

create policy "service role full access to cm_events"
  on cm_events for all to service_role
  using (true) with check (true);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists idx_nomad_slug            on nomad_profiles(slug) where slug is not null;
create index if not exists idx_nomad_contact_id      on nomad_profiles(contact_id) where contact_id is not null;
create index if not exists idx_nomad_email           on nomad_profiles(email_primary) where email_primary is not null;
create index if not exists idx_nomad_full_name       on nomad_profiles(full_name);
create index if not exists idx_nomad_crm             on nomad_profiles(crm_contact_id) where crm_contact_id is not null;
create index if not exists idx_nomad_enrichment      on nomad_profiles(enrichment_status);
create index if not exists idx_nomad_outreach        on nomad_profiles(outreach_status);
create index if not exists idx_nomad_last_active     on nomad_profiles(cm_last_active_date) where cm_last_active_date is not null;
create index if not exists idx_nomad_stay_pattern    on nomad_profiles(stay_pattern) where stay_pattern is not null;
create index if not exists idx_nomad_tags            on nomad_profiles using gin(tags);
create index if not exists idx_nomad_skills          on nomad_profiles using gin(skills);
create index if not exists idx_nomad_coworking       on nomad_profiles using gin(coworking_spaces);

create index if not exists idx_cm_events_active      on cm_events(is_active);
create index if not exists idx_cm_events_category    on cm_events(category) where category is not null;
create index if not exists idx_cm_events_organizer   on cm_events(organizer_id) where organizer_id is not null;
