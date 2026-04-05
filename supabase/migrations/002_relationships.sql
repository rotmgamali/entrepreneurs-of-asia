-- ============================================================
-- EOA Platform – Relationship Tracking (partners, touchpoints, commitments)
-- Requires: 001_initial_schema.sql (set_updated_at function must exist)
-- ============================================================

-- ── partners ─────────────────────────────────────────────────
-- Master record per sponsor / venue / speaker / collaborator
create table if not exists partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text not null,
  type           text not null check (type in ('sponsor', 'venue', 'speaker', 'collaborator')),
  company        text,
  email          text,
  phone          text,
  status         text not null default 'active'
                   check (status in ('active', 'warm', 'cold', 'inactive')),
  notes          text,
  renewal_date   date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── touchpoints ──────────────────────────────────────────────
-- Immutable log of every interaction with a partner
create table if not exists touchpoints (
  id             uuid primary key default gen_random_uuid(),
  partner_id     uuid not null references partners(id) on delete cascade,
  type           text not null check (type in ('email', 'call', 'meeting', 'event', 'message')),
  summary        text not null,
  occurred_at    timestamptz not null default now(),
  created_by     text,
  created_at     timestamptz not null default now()
);

-- ── commitments ──────────────────────────────────────────────
-- Tracked deliverables / mutual commitments with due dates
create table if not exists commitments (
  id              uuid primary key default gen_random_uuid(),
  partner_id      uuid not null references partners(id) on delete cascade,
  title           text not null,
  description     text,
  due_date        date,
  status          text not null default 'pending'
                    check (status in ('pending', 'delivered', 'overdue', 'cancelled')),
  deliverable_url text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── updated_at triggers ──────────────────────────────────────
-- Reuse set_updated_at() from 001_initial_schema.sql
create trigger partners_updated_at
  before update on partners
  for each row execute function set_updated_at();

create trigger commitments_updated_at
  before update on commitments
  for each row execute function set_updated_at();

-- ── Row Level Security ───────────────────────────────────────
alter table partners    enable row level security;
alter table touchpoints enable row level security;
alter table commitments enable row level security;

-- All three tables: service role only (admin-facing data, never public)
create policy "service role full access to partners"
  on partners for all to service_role
  using (true) with check (true);

create policy "service role full access to touchpoints"
  on touchpoints for all to service_role
  using (true) with check (true);

create policy "service role full access to commitments"
  on commitments for all to service_role
  using (true) with check (true);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists idx_partners_type         on partners(type);
create index if not exists idx_partners_status       on partners(status);
create index if not exists idx_partners_renewal_date on partners(renewal_date) where renewal_date is not null;
create index if not exists idx_touchpoints_partner   on touchpoints(partner_id);
create index if not exists idx_commitments_partner   on commitments(partner_id);
create index if not exists idx_commitments_status    on commitments(status);
