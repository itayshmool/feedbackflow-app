-- Feedback Goals Schema
-- This table stores development goals associated with feedback responses

CREATE TABLE IF NOT EXISTS feedback_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_response_id UUID NOT NULL REFERENCES feedback_responses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'development' CHECK (category IN ('development', 'performance', 'skill', 'leadership', 'communication', 'technical')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    target_date DATE,
    status VARCHAR(30) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_goals_response_id ON feedback_goals(feedback_response_id);
CREATE INDEX IF NOT EXISTS idx_feedback_goals_status ON feedback_goals(status);
CREATE INDEX IF NOT EXISTS idx_feedback_goals_target_date ON feedback_goals(target_date);
CREATE INDEX IF NOT EXISTS idx_feedback_goals_category ON feedback_goals(category);
CREATE INDEX IF NOT EXISTS idx_feedback_goals_priority ON feedback_goals(priority);

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_feedback_goals_updated_at BEFORE UPDATE ON feedback_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

