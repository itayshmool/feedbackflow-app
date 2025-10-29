-- Migration: 001_initial_schema.sql
-- Description: Initial database schema setup
-- Created: 2025-09-29

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create the main database schema files
\i ../../../database/sql/schema/01_users_and_auth.sql
\i ../../../database/sql/schema/02_organizations.sql
\i ../../../database/sql/schema/03_feedback_system.sql
\i ../../../database/sql/schema/04_cycles_and_workflows.sql
\i ../../../database/sql/schema/05_notifications.sql
\i ../../../database/sql/schema/06_analytics_and_audit.sql

-- Create views
\i ../../../database/sql/views/cycle_completion_rates.sql
\i ../../../database/sql/views/team_analytics.sql
\i ../../../database/sql/views/user_feedback_summary.sql

-- Create stored procedures
\i ../../../database/sql/procedures/calculate_completion_rates.sql
\i ../../../database/sql/procedures/generate_cycle_participants.sql

-- Create performance indexes
\i ../../../database/sql/indexes/performance_indexes.sql
\i ../../../database/sql/indexes/search_indexes.sql

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

-- Insert default feedback templates
INSERT INTO feedback_templates (name, description, type, questions, is_default, is_system_template) VALUES
('Default Feedback Template', 'Standard feedback template for general use', 'default', '[
    {
        "id": "strengths",
        "type": "textarea",
        "label": "What are this person''s key strengths?",
        "required": true,
        "placeholder": "Please provide specific examples of their strengths..."
    },
    {
        "id": "improvements",
        "type": "textarea", 
        "label": "What areas could this person improve?",
        "required": true,
        "placeholder": "Please provide constructive feedback on areas for improvement..."
    },
    {
        "id": "rating",
        "type": "rating",
        "label": "Overall performance rating",
        "required": true,
        "scale": 5,
        "labels": ["Needs Improvement", "Below Average", "Average", "Above Average", "Excellent"]
    },
    {
        "id": "additional",
        "type": "textarea",
        "label": "Additional comments",
        "required": false,
        "placeholder": "Any additional feedback or comments..."
    }
]', true, true)
ON CONFLICT DO NOTHING;
