-- Add 'draft' and 'submitted' statuses to feedback_requests table
-- This migration adds support for the three-state feedback workflow:
-- DRAFT → SUBMITTED → COMPLETED

ALTER TABLE feedback_requests 
DROP CONSTRAINT IF EXISTS feedback_requests_status_check;

ALTER TABLE feedback_requests 
ADD CONSTRAINT feedback_requests_status_check 
CHECK (status IN ('draft', 'pending', 'submitted', 'in_progress', 'completed', 'declined', 'expired', 'acknowledged'));




