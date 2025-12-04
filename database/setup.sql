-- FeedbackFlow Database Setup Script
-- This script sets up the complete database schema for the FeedbackFlow application

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create the main database schema files
\i sql/schema/01_users_and_auth.sql
\i sql/schema/02_organizations.sql
\i sql/schema/03_feedback_system.sql
\i sql/schema/04_cycles_and_workflows.sql
\i sql/schema/05_organizational_hierarchy.sql
\i sql/schema/05_notifications.sql
\i sql/schema/06_analytics_and_audit.sql

-- Create views
\i sql/views/cycle_completion_rates.sql
\i sql/views/team_analytics.sql
\i sql/views/user_feedback_summary.sql

-- Create stored procedures
\i sql/procedures/calculate_completion_rates.sql
\i sql/procedures/generate_cycle_participants.sql

-- Create performance indexes
\i sql/indexes/performance_indexes.sql
\i sql/indexes/search_indexes.sql

-- Insert initial data
INSERT INTO roles (name, description, permissions, is_system_role) VALUES
('super_admin', 'Super Administrator with full system access', '["*"]', true),
('admin', 'Administrator with organization management access', '["admin:*", "organization:*", "user:*"]', true),
('manager', 'Manager with team and feedback management access', '["feedback:*", "cycle:*", "team:*"]', true),
('employee', 'Regular employee with basic feedback access', '["feedback:read", "feedback:create", "cycle:read"]', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default notification templates
INSERT INTO notification_templates (name, type, category, subject, body, is_system_template) VALUES
('Feedback Request', 'email', 'feedback', 'Feedback Request: {{cycle_name}}', 'You have been requested to provide feedback for {{recipient_name}} in the {{cycle_name}} cycle. Please complete your feedback by {{due_date}}.', true),
('Feedback Reminder', 'email', 'reminder', 'Reminder: Feedback Request Due', 'This is a reminder that you have a pending feedback request for {{recipient_name}} in the {{cycle_name}} cycle. Please complete your feedback by {{due_date}}.', true),
('Cycle Started', 'email', 'cycle', 'Feedback Cycle Started: {{cycle_name}}', 'The feedback cycle "{{cycle_name}}" has started. You can now begin providing feedback to your colleagues.', true),
('Cycle Ending', 'email', 'cycle', 'Feedback Cycle Ending Soon: {{cycle_name}}', 'The feedback cycle "{{cycle_name}}" is ending soon. Please complete any pending feedback requests by {{end_date}}.', true),
('Feedback Received', 'email', 'feedback', 'You Have Received New Feedback', 'You have received new feedback from {{giver_name}} in the {{cycle_name}} cycle.', true),
('Organization Invitation', 'email', 'invitation', 'Invitation to Join {{organization_name}}', 'You have been invited to join {{organization_name}} on FeedbackFlow. Click the link below to accept your invitation: {{invitation_link}}', true)
ON CONFLICT DO NOTHING;

-- Note: Feedback templates are created per-organization when organizations are set up
-- They require organization_id and created_by which are NOT NULL

-- Create a function to get organization statistics
CREATE OR REPLACE FUNCTION get_organization_stats(org_id UUID)
RETURNS TABLE(
    total_users BIGINT,
    active_users BIGINT,
    total_departments BIGINT,
    total_teams BIGINT,
    total_cycles BIGINT,
    active_cycles BIGINT,
    total_feedback_requests BIGINT,
    completed_feedback_requests BIGINT,
    average_rating DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT om.user_id) as total_users,
        COUNT(DISTINCT CASE WHEN om.is_active = true THEN om.user_id END) as active_users,
        COUNT(DISTINCT d.id) as total_departments,
        COUNT(DISTINCT t.id) as total_teams,
        COUNT(DISTINCT fc.id) as total_cycles,
        COUNT(DISTINCT CASE WHEN fc.status = 'active' THEN fc.id END) as active_cycles,
        COUNT(DISTINCT fr.id) as total_feedback_requests,
        COUNT(DISTINCT CASE WHEN fr.status = 'completed' THEN fr.id END) as completed_feedback_requests,
        ROUND(AVG(fres.rating), 2) as average_rating
    FROM organizations o
    LEFT JOIN organization_members om ON o.id = om.organization_id
    LEFT JOIN departments d ON o.id = d.organization_id
    LEFT JOIN teams t ON o.id = t.organization_id
    LEFT JOIN feedback_cycles fc ON o.id = fc.organization_id
    LEFT JOIN feedback_requests fr ON fc.id = fr.cycle_id
    LEFT JOIN feedback_responses fres ON fr.id = fres.request_id
    WHERE o.id = org_id
    GROUP BY o.id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up expired data
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- Clean up expired password reset tokens
    DELETE FROM password_reset_tokens WHERE expires_at < NOW();
    
    -- Clean up expired email verification tokens
    DELETE FROM email_verification_tokens WHERE expires_at < NOW();
    
    -- Clean up expired organization invitations
    DELETE FROM organization_invitations WHERE expires_at < NOW() AND status = 'pending';
    
    -- Clean up expired user sessions
    DELETE FROM user_sessions WHERE expires_at < NOW();
    
    -- Clean up old analytics events (older than 1 year)
    DELETE FROM analytics_events WHERE timestamp < NOW() - INTERVAL '1 year';
    
    -- Clean up old audit logs (older than 2 years)
    DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '2 years';
    
    -- Clean up old performance metrics (older than 6 months)
    DELETE FROM performance_metrics WHERE timestamp < NOW() - INTERVAL '6 months';
    
    -- Clean up old error logs (older than 1 year)
    DELETE FROM error_logs WHERE timestamp < NOW() - INTERVAL '1 year';
    
    -- Clean up expired data exports (older than 30 days)
    DELETE FROM data_exports WHERE expires_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create a function to update all cycle statistics
CREATE OR REPLACE FUNCTION update_all_cycle_statistics()
RETURNS void AS $$
DECLARE
    cycle_record RECORD;
BEGIN
    FOR cycle_record IN SELECT id FROM feedback_cycles WHERE status IN ('active', 'closed') LOOP
        PERFORM update_cycle_statistics(cycle_record.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO feedbackflow_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO feedbackflow_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO feedbackflow_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO feedbackflow_app;

-- Create a database user for the application
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'feedbackflow_app') THEN
        CREATE ROLE feedbackflow_app WITH LOGIN PASSWORD 'feedbackflow_password';
    END IF;
END
$$;

-- Set up row level security (RLS) for multi-tenancy
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic example - should be customized based on requirements)
CREATE POLICY organization_isolation ON organizations
    FOR ALL TO feedbackflow_app
    USING (true); -- This should be customized based on your security requirements

CREATE POLICY department_isolation ON departments
    FOR ALL TO feedbackflow_app
    USING (true); -- This should be customized based on your security requirements

CREATE POLICY team_isolation ON teams
    FOR ALL TO feedbackflow_app
    USING (true); -- This should be customized based on your security requirements

-- Create indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_organizations_rls ON organizations(id);
CREATE INDEX IF NOT EXISTS idx_departments_rls ON departments(id, organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_rls ON teams(id, organization_id);

-- Final message
DO $$
BEGIN
    RAISE NOTICE 'FeedbackFlow database setup completed successfully!';
    RAISE NOTICE 'Database includes:';
    RAISE NOTICE '- 6 core schema files';
    RAISE NOTICE '- 3 analytical views';
    RAISE NOTICE '- 2 stored procedures';
    RAISE NOTICE '- Performance and search indexes';
    RAISE NOTICE '- Default roles and templates';
    RAISE NOTICE '- Row level security policies';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update database connection settings in your application';
    RAISE NOTICE '2. Run database migrations if needed';
    RAISE NOTICE '3. Configure RLS policies based on your security requirements';
    RAISE NOTICE '4. Set up database backups and monitoring';
END
$$;
