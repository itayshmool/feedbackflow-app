-- Analytics and Audit Schema
-- This file contains tables for analytics, reporting, and audit logging

-- Analytics events table (for tracking user actions and system events)
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL CHECK (event_category IN (
        'user_action', 'system_event', 'feedback_event', 'cycle_event', 'error'
    )),
    event_name VARCHAR(255) NOT NULL,
    properties JSONB DEFAULT '{}',
    context JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics metrics table (for storing calculated metrics)
CREATE TABLE IF NOT EXISTS analytics_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram', 'summary')),
    value DECIMAL(15,4) NOT NULL,
    dimensions JSONB DEFAULT '{}', -- Additional dimensions for the metric
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table (for tracking all system changes)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changes JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System health metrics table
CREATE TABLE IF NOT EXISTS system_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50),
    tags JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_time_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'error' CHECK (severity IN ('debug', 'info', 'warn', 'error', 'fatal')),
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report templates table
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('feedback', 'cycle', 'user', 'organization', 'custom')),
    query JSONB NOT NULL, -- Report query configuration
    parameters JSONB DEFAULT '{}', -- Report parameters
    format VARCHAR(20) DEFAULT 'json' CHECK (format IN ('json', 'csv', 'pdf', 'excel')),
    is_scheduled BOOLEAN DEFAULT false,
    schedule_cron VARCHAR(100), -- Cron expression for scheduled reports
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report executions table
CREATE TABLE IF NOT EXISTS report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    executed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    parameters JSONB DEFAULT '{}',
    result_data JSONB,
    file_url TEXT,
    file_size_bytes INTEGER,
    execution_time_ms INTEGER,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data exports table
CREATE TABLE IF NOT EXISTS data_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL CHECK (export_type IN ('organizations', 'users', 'feedback', 'cycles', 'analytics', 'all')),
    format VARCHAR(20) DEFAULT 'json' CHECK (format IN ('json', 'csv', 'excel')),
    filters JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
    file_url TEXT,
    file_size_bytes INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE,
    downloaded_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_org_id ON analytics_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);

CREATE INDEX IF NOT EXISTS idx_analytics_metrics_org_id ON analytics_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_name ON analytics_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_type ON analytics_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_period ON analytics_metrics(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_system_health_metrics_name ON system_health_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_timestamp ON system_health_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_org_id ON performance_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_error_logs_org_id ON error_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_report_templates_org_id ON report_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(type);
CREATE INDEX IF NOT EXISTS idx_report_templates_active ON report_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_report_executions_template_id ON report_executions(template_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_org_id ON report_executions(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_status ON report_executions(status);

CREATE INDEX IF NOT EXISTS idx_data_exports_org_id ON data_exports(organization_id);
CREATE INDEX IF NOT EXISTS idx_data_exports_type ON data_exports(export_type);
CREATE INDEX IF NOT EXISTS idx_data_exports_status ON data_exports(status);
CREATE INDEX IF NOT EXISTS idx_data_exports_expires ON data_exports(expires_at);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON report_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_exports_updated_at BEFORE UPDATE ON data_exports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to automatically clean up old analytics events (older than 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_events()
RETURNS void AS $$
BEGIN
    DELETE FROM analytics_events 
    WHERE timestamp < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Create a function to automatically clean up old audit logs (older than 2 years)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_logs 
    WHERE timestamp < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Create a function to automatically clean up old performance metrics (older than 6 months)
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics()
RETURNS void AS $$
BEGIN
    DELETE FROM performance_metrics 
    WHERE timestamp < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;
