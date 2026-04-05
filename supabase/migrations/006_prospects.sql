-- ============================================================
-- EOA Platform – Prospects Table
-- Website RSVP submissions with auto-scoring
-- ============================================================

CREATE TABLE IF NOT EXISTS prospects (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  email          TEXT,
  whatsapp       TEXT,
  business_niche TEXT,
  website        TEXT,
  socials        TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',
  source         TEXT NOT NULL DEFAULT 'website',
  score          INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row Level Security ─────────────────────────────────────
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

-- Anon can insert (RSVP form submissions)
CREATE POLICY "public can insert prospects"
  ON prospects FOR INSERT
  TO anon
  WITH CHECK (true);

-- Service role has full access
CREATE POLICY "service role full access to prospects"
  ON prospects FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS prospects_email_idx  ON prospects(email);
CREATE INDEX IF NOT EXISTS prospects_status_idx ON prospects(status);
CREATE INDEX IF NOT EXISTS prospects_score_idx  ON prospects(score DESC);
