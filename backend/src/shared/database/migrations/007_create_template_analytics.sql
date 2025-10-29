-- Create Template Analytics Table
-- This table tracks usage analytics for template documents

CREATE TABLE IF NOT EXISTS feedback_template_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_document_id UUID NOT NULL REFERENCES feedback_template_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('download', 'view', 'attach')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_analytics_template_id ON feedback_template_analytics(template_document_id);
CREATE INDEX IF NOT EXISTS idx_template_analytics_user_id ON feedback_template_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_template_analytics_action ON feedback_template_analytics(action);
CREATE INDEX IF NOT EXISTS idx_template_analytics_created_at ON feedback_template_analytics(created_at);

-- Create composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_template_analytics_template_action_date 
ON feedback_template_analytics(template_document_id, action, created_at);

-- Create index for user analytics queries
CREATE INDEX IF NOT EXISTS idx_template_analytics_user_action_date 
ON feedback_template_analytics(user_id, action, created_at);

-- Add constraint to prevent duplicate analytics entries for the same action within a short time window
-- This prevents spam analytics (e.g., multiple downloads within 1 minute)
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_analytics_unique_action_window 
ON feedback_template_analytics(template_document_id, user_id, action, DATE_TRUNC('minute', created_at));
