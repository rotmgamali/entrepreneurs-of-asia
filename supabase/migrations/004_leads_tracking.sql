-- ============================================================
-- EOA Platform – Outbound Leads & DM Campaign Tracking
-- Requires: 001_initial_schema.sql (set_updated_at function)
-- ============================================================

-- ── leads ─────────────────────────────────────────────────
-- Outbound prospecting targets for DM campaigns.
-- Populated by NomadResearcher; worked by OutreachAgent.
create table if not exists leads (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  platform        text not null
                    check (platform in ('facebook', 'instagram', 'linkedin', 'twitter', 'whatsapp', 'other')),
  profile_url     text,
  business_niche  text,
  location        text,                         -- "Chiang Mai" or more specific
  -- outreach state
  outreach_status text not null default 'identified'
                    check (outreach_status in (
                      'identified',             -- found, not yet messaged
                      'dm_sent',                -- initial DM sent
                      'follow_up_1_sent',       -- day 3 follow-up sent
                      'follow_up_2_sent',       -- day 7 follow-up sent
                      'replied',                -- responded (any reply)
                      'positive',               -- expressed interest
                      'negative',               -- declined or uninterested
                      'rsvp_submitted',         -- submitted RSVP form
                      'approved',               -- approved attendee
                      'attended',               -- showed up at event
                      'cold'                    -- no reply after all follow-ups
                    )),
  -- timing
  dm_sent_at      timestamptz,
  follow_up_1_at  timestamptz,
  follow_up_2_at  timestamptz,
  last_reply_at   timestamptz,
  -- enrichment
  message_body    text,                         -- actual message sent (for reference)
  notes           text,                         -- manual notes from outreach agent
  -- metadata
  source          text default 'manual'
                    check (source in ('manual', 'facebook_group', 'linkedin_search', 'instagram_hashtag', 'n8n_automation')),
  campaign        text default 'attendee_recruitment'
                    check (campaign in ('attendee_recruitment', 'speaker_pipeline', 'sponsor_pipeline')),
  event_id        uuid references events(id) on delete set null,  -- target event, if specific
  contact_id      uuid references contacts(id) on delete set null, -- linked once they RSVP
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── updated_at trigger ───────────────────────────────────
create trigger leads_updated_at
  before update on leads
  for each row execute function set_updated_at();

-- ── Row Level Security ───────────────────────────────────
alter table leads enable row level security;

create policy "service role full access to leads"
  on leads for all to service_role
  using (true) with check (true);

-- ── Indexes ──────────────────────────────────────────────
create index if not exists idx_leads_status   on leads(outreach_status);
create index if not exists idx_leads_platform on leads(platform);
create index if not exists idx_leads_campaign on leads(campaign);
create index if not exists idx_leads_dm_sent  on leads(dm_sent_at) where dm_sent_at is not null;
create index if not exists idx_leads_contact  on leads(contact_id) where contact_id is not null;

-- ── Follow-up queue view ─────────────────────────────────
-- Returns leads that are due for follow-up 1 (3 days after DM) or follow-up 2 (7 days after DM)
create or replace view leads_due_for_followup as
select
  id,
  name,
  platform,
  profile_url,
  business_niche,
  outreach_status,
  dm_sent_at,
  follow_up_1_at,
  case
    when outreach_status = 'dm_sent'
         and dm_sent_at <= now() - interval '3 days'
      then 'follow_up_1'
    when outreach_status = 'follow_up_1_sent'
         and follow_up_1_at <= now() - interval '4 days'  -- 7 days total from initial DM
      then 'follow_up_2'
  end as next_action
from leads
where outreach_status in ('dm_sent', 'follow_up_1_sent')
  and (
    (outreach_status = 'dm_sent'         and dm_sent_at      <= now() - interval '3 days')
    or
    (outreach_status = 'follow_up_1_sent' and follow_up_1_at  <= now() - interval '4 days')
  );

-- ── Daily outreach stats view ────────────────────────────
create or replace view daily_outreach_stats as
select
  date_trunc('day', dm_sent_at) as day,
  platform,
  count(*) filter (where outreach_status != 'identified')           as dms_sent,
  count(*) filter (where outreach_status in ('replied', 'positive', 'rsvp_submitted', 'approved', 'attended')) as replies,
  count(*) filter (where outreach_status in ('rsvp_submitted', 'approved', 'attended'))                         as conversions
from leads
where dm_sent_at is not null
group by 1, 2
order by 1 desc, 2;
