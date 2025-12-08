-- Migration: Add color classification to feedback
-- Description: Adds a color classification field (green/yellow/red) for internal feedback triage
-- This field is visible only to the giver and managers, not to the feedback receiver
-- Date: 2024-12-08

-- Add color_classification column to feedback_responses table
ALTER TABLE feedback_responses
ADD COLUMN IF NOT EXISTS color_classification VARCHAR(10)
CHECK (color_classification IS NULL OR color_classification IN ('green', 'yellow', 'red'));

-- Add comment for documentation
COMMENT ON COLUMN feedback_responses.color_classification IS 
'Internal triage color classification (green=exceeds expectations, yellow=meets expectations, red=needs improvement). Hidden from feedback receiver.';

-- Create index for filtering by color classification (useful for manager dashboards)
CREATE INDEX IF NOT EXISTS idx_feedback_responses_color_classification 
ON feedback_responses(color_classification) 
WHERE color_classification IS NOT NULL;

-- Create composite index for common query pattern: filter by cycle + color
CREATE INDEX IF NOT EXISTS idx_feedback_responses_cycle_color 
ON feedback_responses(cycle_id, color_classification) 
WHERE color_classification IS NOT NULL;

-- Verification query (optional - run manually to verify)
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'feedback_responses' AND column_name = 'color_classification';

