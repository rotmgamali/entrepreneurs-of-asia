-- ============================================================
-- EOA Platform – Initial Schema
-- Run this in the Supabase SQL Editor (or via supabase db push)
-- ============================================================

-- ── contacts ────────────────────────────────────────────────
-- Nomad/founder profiles. One row per person.
create table if not exists contacts (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text unique not null,
  whatsapp       text,
  bio            text,
  business_niche text,
  website        text,
  socials        text,            -- comma-separated handles
  skills         text[],          -- e.g. '{SaaS,Marketing,Dev}'
  status         text not null default 'pending'
                   check (status in ('pending', 'approved', 'rejected')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── events ──────────────────────────────────────────────────
-- Weekly or one-off gatherings.
create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  event_date  timestamptz not null,
  venue       text,               -- revealed only to approved attendees
  speakers    text[],             -- names or IDs
  rsvp_count  integer not null default 0,
  is_public   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── event_attendees ──────────────────────────────────────────
-- Junction table: who has RSVPed / attended which event.
create table if not exists event_attendees (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  contact_id  uuid not null references contacts(id) on delete cascade,
  rsvp_status text not null default 'rsvp'
                check (rsvp_status in ('rsvp', 'attended', 'no_show', 'cancelled')),
  created_at  timestamptz not null default now(),
  unique (event_id, contact_id)
);

-- ── updated_at trigger ──────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contacts_updated_at
  before update on contacts
  for each row execute function set_updated_at();

create trigger events_updated_at
  before update on events
  for each row execute function set_updated_at();

-- ── Row Level Security ───────────────────────────────────────
alter table contacts       enable row level security;
alter table events         enable row level security;
alter table event_attendees enable row level security;

-- contacts: only the service role (server-side) can read/write
-- The anon/public role can INSERT (submit an RSVP form)
create policy "public can insert contacts"
  on contacts for insert
  to anon
  with check (true);

create policy "service role full access to contacts"
  on contacts for all
  to service_role
  using (true)
  with check (true);

-- events: anyone can read public events; only service role can write
create policy "public can read public events"
  on events for select
  to anon
  using (is_public = true);

create policy "service role full access to events"
  on events for all
  to service_role
  using (true)
  with check (true);

-- event_attendees: only service role can read/write
create policy "service role full access to event_attendees"
  on event_attendees for all
  to service_role
  using (true)
  with check (true);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists contacts_email_idx    on contacts(email);
create index if not exists contacts_status_idx   on contacts(status);
create index if not exists attendees_event_idx   on event_attendees(event_id);
create index if not exists attendees_contact_idx on event_attendees(contact_id);
create index if not exists events_date_idx       on events(event_date);
