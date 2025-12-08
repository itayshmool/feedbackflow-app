-- AI Insights Schema
-- This file contains tables for managing async AI insight jobs

-- AI Insight Jobs table - tracks async AI generation requests
CREATE TABLE IF NOT EXISTS ai_insight_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL DEFAULT 'team_insights' CHECK (job_type IN ('team_insights', 'feedback_generation')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    insights_data JSONB,                    -- Cached AI response
    error_message TEXT,                      -- Error details if failed
    team_size INTEGER,                       -- Number of team members analyzed
    feedback_count INTEGER,                  -- Number of feedback items analyzed
    ai_provider VARCHAR(20),                 -- 'claude' or 'gemini'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,    -- When processing started
    completed_at TIMESTAMP WITH TIME ZONE,  -- When processing finished
    expires_at TIMESTAMP WITH TIME ZONE     -- Auto-cleanup old insights (default 7 days)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_insight_jobs_user_id ON ai_insight_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insight_jobs_org_id ON ai_insight_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_insight_jobs_status ON ai_insight_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_insight_jobs_created_at ON ai_insight_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insight_jobs_user_status ON ai_insight_jobs(user_id, status);

-- Create trigger for updated_at (if needed in future)
-- Note: We track created_at, started_at, completed_at separately for job lifecycle

