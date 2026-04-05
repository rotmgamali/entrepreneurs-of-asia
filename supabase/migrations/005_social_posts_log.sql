-- Migration 005: Social posts audit log for Blotato pipeline
-- Tracks every post scheduled via POST /api/social/post

create table if not exists social_posts_log (
  id              uuid primary key default gen_random_uuid(),
  source          text not null default 'api',       -- e.g. 'video-clip-pipeline', 'manual', 'api'
  event_id        uuid references events(id) on delete set null,
  content_preview text,                               -- first 200 chars of the base content
  platforms       text[] not null,                    -- ['facebook','instagram','linkedin','twitter']
  scheduled_at    timestamptz,                        -- null = posted immediately
  blotato_results jsonb,                              -- raw results array from Blotato API
  success_count   int not null default 0,
  failure_count   int not null default 0,
  created_at      timestamptz not null default now()
);

-- Index for querying by event
create index if not exists idx_social_posts_log_event_id on social_posts_log(event_id);

-- Index for recent logs
create index if not exists idx_social_posts_log_created_at on social_posts_log(created_at desc);

-- RLS: server-side audit log, never accessed from the browser
alter table social_posts_log enable row level security;

create policy "service role full access to social_posts_log"
  on social_posts_log for all to service_role
  using (true) with check (true);

comment on table social_posts_log is 'Audit trail for all social media posts scheduled via the Blotato pipeline.';
