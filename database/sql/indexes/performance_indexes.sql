-- Performance Indexes
-- This file contains additional indexes for optimizing query performance

-- Composite indexes for common query patterns

-- Organization-related composite indexes
CREATE INDEX IF NOT EXISTS idx_organizations_active_status ON organizations(is_active, status);
CREATE INDEX IF NOT EXISTS idx_organizations_plan_status ON organizations(subscription_plan, status);
CREATE INDEX IF NOT EXISTS idx_organizations_created_updated ON organizations(created_at, updated_at);

-- User-related composite indexes
CREATE INDEX IF NOT EXISTS idx_users_active_verified ON users(is_active, email_verified);
CREATE INDEX IF NOT EXISTS idx_users_created_login ON users(created_at, last_login_at);

-- Organization members composite indexes
CREATE INDEX IF NOT EXISTS idx_org_members_org_active ON organization_members(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_org_members_user_active ON organization_members(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_org_members_dept_team ON organization_members(department_id, team_id);

-- Feedback cycle composite indexes
CREATE INDEX IF NOT EXISTS idx_feedback_cycles_org_status ON feedback_cycles(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_cycles_status_dates ON feedback_cycles(status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_feedback_cycles_created_by ON feedback_cycles(created_by, created_at);

-- Feedback requests composite indexes
CREATE INDEX IF NOT EXISTS idx_feedback_requests_cycle_status ON feedback_requests(cycle_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_requester_status ON feedback_requests(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_recipient_status ON feedback_requests(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_due_status ON feedback_requests(due_date, status);

-- Feedback responses composite indexes
CREATE INDEX IF NOT EXISTS idx_feedback_responses_request_giver ON feedback_responses(request_id, giver_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_recipient_approved ON feedback_responses(recipient_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_cycle_approved ON feedback_responses(cycle_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_rating_approved ON feedback_responses(rating, is_approved);

-- Cycle participants composite indexes
CREATE INDEX IF NOT EXISTS idx_cycle_participants_cycle_status ON cycle_participants(cycle_id, status);
CREATE INDEX IF NOT EXISTS idx_cycle_participants_user_status ON cycle_participants(user_id, status);
CREATE INDEX IF NOT EXISTS idx_cycle_participants_org_status ON cycle_participants(organization_id, status);

-- Analytics events composite indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_org_type ON analytics_events(organization_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_type ON analytics_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp_type ON analytics_events(timestamp, event_type);

-- Audit logs composite indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_action ON audit_logs(organization_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_action ON audit_logs(resource_type, resource_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp_action ON audit_logs(timestamp, action);

-- Notification composite indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_status ON user_notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_notifications_org_status ON user_notifications(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_user_notifications_scheduled_status ON user_notifications(scheduled_at, status);

-- Performance metrics composite indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_org_endpoint ON performance_metrics(organization_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint_timestamp ON performance_metrics(endpoint, timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_status_code_timestamp ON performance_metrics(status_code, timestamp);

-- Error logs composite indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_org_severity ON error_logs(organization_id, severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_type_severity ON error_logs(error_type, severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved_timestamp ON error_logs(resolved, timestamp);

-- Partial indexes for better performance on filtered queries

-- Active organizations only
CREATE INDEX IF NOT EXISTS idx_organizations_active_only ON organizations(id) WHERE is_active = true;

-- Active users only
CREATE INDEX IF NOT EXISTS idx_users_active_only ON users(id) WHERE is_active = true;

-- Active organization members only
CREATE INDEX IF NOT EXISTS idx_org_members_active_only ON organization_members(user_id, organization_id) WHERE is_active = true;

-- Active feedback cycles only
CREATE INDEX IF NOT EXISTS idx_feedback_cycles_active_only ON feedback_cycles(id) WHERE status = 'active';

-- Pending feedback requests only
CREATE INDEX IF NOT EXISTS idx_feedback_requests_pending_only ON feedback_requests(id) WHERE status = 'pending';

-- Unread notifications only
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread_only ON user_notifications(user_id) WHERE status = 'pending';

-- Unresolved errors only
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved_only ON error_logs(id) WHERE resolved = false;

-- Expression indexes for common calculations

-- Organization name search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_organizations_name_lower ON organizations(LOWER(name));

-- User name search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_users_name_lower ON users(LOWER(name));

-- User email search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- Feedback content search (for full-text search)
CREATE INDEX IF NOT EXISTS idx_feedback_responses_content_gin ON feedback_responses USING gin(to_tsvector('english', content));

-- Organization description search
CREATE INDEX IF NOT EXISTS idx_organizations_description_gin ON organizations USING gin(to_tsvector('english', description));

-- Covering indexes for common queries (include frequently accessed columns)

-- Organization list with key fields
CREATE INDEX IF NOT EXISTS idx_organizations_covering ON organizations(id, name, slug, status, subscription_plan, created_at) WHERE is_active = true;

-- User list with key fields
CREATE INDEX IF NOT EXISTS idx_users_covering ON users(id, name, email, is_active, last_login_at) WHERE is_active = true;

-- Feedback cycle list with key fields
CREATE INDEX IF NOT EXISTS idx_feedback_cycles_covering ON feedback_cycles(id, organization_id, name, status, start_date, end_date) WHERE status IN ('active', 'draft');

-- Feedback request list with key fields
CREATE INDEX IF NOT EXISTS idx_feedback_requests_covering ON feedback_requests(id, cycle_id, requester_id, recipient_id, status, due_date) WHERE status IN ('pending', 'in_progress');
