-- Add 'acknowledged' status to feedback_requests table
-- This allows feedback to be acknowledged by recipients
-- NOTE: Includes 'draft' and 'submitted' for feedback workflow

ALTER TABLE feedback_requests 
DROP CONSTRAINT IF EXISTS feedback_requests_status_check;

ALTER TABLE feedback_requests 
ADD CONSTRAINT feedback_requests_status_check 
CHECK (status IN ('draft', 'pending', 'submitted', 'in_progress', 'completed', 'declined', 'expired', 'acknowledged'));


