-- Search Indexes
-- This file contains indexes optimized for search functionality

-- Full-text search indexes using GIN (Generalized Inverted Index)

-- User search indexes
CREATE INDEX IF NOT EXISTS idx_users_search_name ON users USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_users_search_email ON users USING gin(to_tsvector('english', email));

-- Organization search indexes
CREATE INDEX IF NOT EXISTS idx_organizations_search_name ON organizations USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_organizations_search_description ON organizations USING gin(to_tsvector('english', COALESCE(description, '')));

-- Department search indexes
CREATE INDEX IF NOT EXISTS idx_departments_search_name ON departments USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_departments_search_description ON departments USING gin(to_tsvector('english', COALESCE(description, '')));

-- Team search indexes
CREATE INDEX IF NOT EXISTS idx_teams_search_name ON teams USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_teams_search_description ON teams USING gin(to_tsvector('english', COALESCE(description, '')));

-- Feedback content search indexes
CREATE INDEX IF NOT EXISTS idx_feedback_responses_search_content ON feedback_responses USING gin(to_tsvector('english', content));

-- Feedback comments search indexes
CREATE INDEX IF NOT EXISTS idx_feedback_comments_search_content ON feedback_comments USING gin(to_tsvector('english', content));

-- Notification message search indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_search_title ON user_notifications USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_user_notifications_search_message ON user_notifications USING gin(to_tsvector('english', message));

-- Error message search indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_search_message ON error_logs USING gin(to_tsvector('english', error_message));

-- Audit log search indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_search_action ON audit_logs USING gin(to_tsvector('english', action));

-- Multi-column search indexes for combined searches

-- User search with organization context
CREATE INDEX IF NOT EXISTS idx_users_org_search ON users USING gin(
    to_tsvector('english', name || ' ' || COALESCE(email, ''))
);

-- Organization search with all relevant fields
CREATE INDEX IF NOT EXISTS idx_organizations_full_search ON organizations USING gin(
    to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(contact_email, ''))
);

-- Department search with organization context
CREATE INDEX IF NOT EXISTS idx_departments_org_search ON departments USING gin(
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- Team search with department context
CREATE INDEX IF NOT EXISTS idx_teams_dept_search ON teams USING gin(
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- Feedback search with user context
CREATE INDEX IF NOT EXISTS idx_feedback_responses_full_search ON feedback_responses USING gin(
    to_tsvector('english', content)
);

-- Notification search with user context
CREATE INDEX IF NOT EXISTS idx_user_notifications_full_search ON user_notifications USING gin(
    to_tsvector('english', title || ' ' || message)
);

-- Trigram indexes for fuzzy matching (requires pg_trgm extension)

-- Enable trigram extension if not already enabled
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- User fuzzy search indexes
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON users USING gin(email gin_trgm_ops);

-- Organization fuzzy search indexes
CREATE INDEX IF NOT EXISTS idx_organizations_name_trgm ON organizations USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_organizations_slug_trgm ON organizations USING gin(slug gin_trgm_ops);

-- Department fuzzy search indexes
CREATE INDEX IF NOT EXISTS idx_departments_name_trgm ON departments USING gin(name gin_trgm_ops);

-- Team fuzzy search indexes
CREATE INDEX IF NOT EXISTS idx_teams_name_trgm ON teams USING gin(name gin_trgm_ops);

-- Feedback content fuzzy search
CREATE INDEX IF NOT EXISTS idx_feedback_responses_content_trgm ON feedback_responses USING gin(content gin_trgm_ops);

-- Composite search indexes for complex queries

-- User search with multiple criteria
CREATE INDEX IF NOT EXISTS idx_users_multi_search ON users USING gin(
    to_tsvector('english', name || ' ' || email || ' ' || COALESCE(CAST(id AS TEXT), ''))
);

-- Organization search with multiple criteria
CREATE INDEX IF NOT EXISTS idx_organizations_multi_search ON organizations USING gin(
    to_tsvector('english', name || ' ' || slug || ' ' || COALESCE(description, '') || ' ' || contact_email)
);

-- Feedback search with rating and content
CREATE INDEX IF NOT EXISTS idx_feedback_responses_rating_search ON feedback_responses USING gin(
    to_tsvector('english', content || ' ' || COALESCE(CAST(rating AS TEXT), ''))
);

-- Search optimization indexes for common patterns

-- Case-insensitive search indexes
CREATE INDEX IF NOT EXISTS idx_organizations_name_ci ON organizations(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_users_name_ci ON users(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_users_email_ci ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_departments_name_ci ON departments(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_teams_name_ci ON teams(LOWER(name));

-- Prefix search indexes
CREATE INDEX IF NOT EXISTS idx_organizations_name_prefix ON organizations(name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_users_name_prefix ON users(name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_prefix ON users(email text_pattern_ops);

-- Suffix search indexes (for domain searches)
CREATE INDEX IF NOT EXISTS idx_users_email_suffix ON users(REVERSE(email) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_organizations_contact_email_suffix ON organizations(REVERSE(contact_email) text_pattern_ops);

-- Specialized search indexes for analytics

-- Event search indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_search ON analytics_events USING gin(
    to_tsvector('english', event_name || ' ' || COALESCE(event_type, ''))
);

-- Performance metrics search
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint_search ON performance_metrics USING gin(
    to_tsvector('english', endpoint)
);

-- Error logs search
CREATE INDEX IF NOT EXISTS idx_error_logs_full_search ON error_logs USING gin(
    to_tsvector('english', error_type || ' ' || error_message)
);
