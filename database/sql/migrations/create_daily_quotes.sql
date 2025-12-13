-- Daily Quotes Table for Quote of the Day feature
-- Stores AI-generated inspirational quotes with a 300 record limit (FIFO)
-- Migration: create_daily_quotes.sql

CREATE TABLE IF NOT EXISTS daily_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    author_title VARCHAR(255) NOT NULL,
    theme VARCHAR(100) DEFAULT 'growth',
    generated_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient date lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_daily_quotes_date ON daily_quotes(generated_date DESC);

-- Index for cleanup queries (oldest first for FIFO deletion)
CREATE INDEX IF NOT EXISTS idx_daily_quotes_created ON daily_quotes(created_at ASC);

COMMENT ON TABLE daily_quotes IS 'Stores AI-generated growth quotes for dashboard. Limited to 300 records (FIFO).';
