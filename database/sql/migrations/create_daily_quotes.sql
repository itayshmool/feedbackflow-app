-- Daily Quotes Table for Quote of the Day feature
-- Stores pre-seeded curated quotes (no AI generation at runtime)
-- Migration: create_daily_quotes.sql
-- 
-- Seeding: Run `node scripts/seed-quotes.js <DATABASE_URL>` after migration

CREATE TABLE IF NOT EXISTS daily_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    author_title VARCHAR(255) NOT NULL,
    theme VARCHAR(100) DEFAULT 'growth',
    used_on DATE,  -- Tracks when quote was displayed (NULL = never used)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for finding today's quote and unused quotes
CREATE INDEX IF NOT EXISTS idx_daily_quotes_used ON daily_quotes(used_on);

-- Index for random selection performance
CREATE INDEX IF NOT EXISTS idx_daily_quotes_id ON daily_quotes(id);

COMMENT ON TABLE daily_quotes IS 'Pre-seeded pool of curated growth quotes for daily display. Quotes cycle through pool.';
