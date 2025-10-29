-- Notifications Schema
-- This file contains tables for managing notifications and communication

-- Notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'in_app', 'slack', 'sms')),
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'feedback', 'cycle', 'system', 'reminder', 'invitation', 'approval'
    )),
    subject VARCHAR(255),
    body TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- Available template variables
    is_active BOOLEAN DEFAULT true,
    is_system_template BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'in_app', 'slack', 'sms')),
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}', -- Additional data for the notification
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'in_app', 'slack', 'sms')),
    category VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    frequency VARCHAR(20) DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily', 'weekly', 'never')),
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id, type, category)
);

-- Notification channels table (for external integrations)
CREATE TABLE IF NOT EXISTS notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('slack', 'teams', 'webhook', 'email_smtp')),
    configuration JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification delivery logs table
CREATE TABLE IF NOT EXISTS notification_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES user_notifications(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES notification_channels(id) ON DELETE SET NULL,
    attempt_number INTEGER DEFAULT 1,
    status VARCHAR(20) NOT NULL CHECK (status IN ('attempting', 'sent', 'delivered', 'failed', 'bounced')),
    response_data JSONB DEFAULT '{}',
    error_message TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Email queue table (for batch email processing)
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
    template_variables JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification subscriptions table (for real-time notifications)
CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_type VARCHAR(50) NOT NULL CHECK (subscription_type IN ('feedback', 'cycle', 'system', 'all')),
    filters JSONB DEFAULT '{}', -- Additional filtering criteria
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id, subscription_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_templates_org_id ON notification_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON notification_templates(category);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_org_id ON user_notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_status ON user_notifications(status);
CREATE INDEX IF NOT EXISTS idx_user_notifications_scheduled ON user_notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_user_notifications_priority ON user_notifications(priority);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_org_id ON notification_preferences(organization_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON notification_preferences(type);

CREATE INDEX IF NOT EXISTS idx_notification_channels_org_id ON notification_channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_notification_channels_type ON notification_channels(type);
CREATE INDEX IF NOT EXISTS idx_notification_channels_active ON notification_channels(is_active);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_notification_id ON notification_delivery_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_channel_id ON notification_delivery_logs(channel_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_status ON notification_delivery_logs(status);

CREATE INDEX IF NOT EXISTS idx_email_queue_org_id ON email_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority);

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user_id ON notification_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_org_id ON notification_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_type ON notification_subscriptions(subscription_type);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notifications_updated_at BEFORE UPDATE ON user_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_channels_updated_at BEFORE UPDATE ON notification_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_queue_updated_at BEFORE UPDATE ON email_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_subscriptions_updated_at BEFORE UPDATE ON notification_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
