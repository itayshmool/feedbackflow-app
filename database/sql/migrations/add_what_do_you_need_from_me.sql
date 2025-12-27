-- Migration: Add "What do you need from me" field to feedback responses
-- Purpose: Collaborative field for manager-employee feedback meetings
-- Safe for production: nullable column, no data modification, backward compatible
-- Date: 2024-12-27

-- Add the new column to feedback_responses table
-- This is where structured feedback content is stored as JSON
ALTER TABLE feedback_responses 
ADD COLUMN IF NOT EXISTS what_do_you_need_from_me TEXT;

-- Add comment for documentation
COMMENT ON COLUMN feedback_responses.what_do_you_need_from_me IS 
'Optional collaborative field for feedback meetings - captures what support, resources, or actions the employee needs from their manager';

-- Note: This migration is safe to run multiple times due to IF NOT EXISTS
-- No index needed as this field is not used for filtering/searching

