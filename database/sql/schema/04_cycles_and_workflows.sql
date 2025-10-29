-- Cycles and Workflows Schema
-- This file contains tables for managing feedback cycles and workflow automation

-- Cycle participants table (who participates in which cycle)
CREATE TABLE IF NOT EXISTS cycle_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES feedback_cycles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    role VARCHAR(50) DEFAULT 'participant' CHECK (role IN ('participant', 'manager', 'admin')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'excluded')),
    participation_type VARCHAR(50) DEFAULT 'full' CHECK (participation_type IN ('full', 'self_only', 'manager_only', 'peer_only')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cycle_id, user_id)
);

-- Cycle milestones table
CREATE TABLE IF NOT EXISTS cycle_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES feedback_cycles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    milestone_type VARCHAR(50) DEFAULT 'deadline' CHECK (milestone_type IN ('deadline', 'reminder', 'milestone', 'checkpoint')),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow templates table
CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'feedback_cycle' CHECK (type IN ('feedback_cycle', 'onboarding', 'offboarding', 'review', 'custom')),
    steps JSONB NOT NULL DEFAULT '[]',
    triggers JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow instances table
CREATE TABLE IF NOT EXISTS workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'paused', 'cancelled')),
    current_step INTEGER DEFAULT 0,
    context JSONB DEFAULT '{}',
    started_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow step executions table
CREATE TABLE IF NOT EXISTS workflow_step_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    step_index INTEGER NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    step_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cycle automation rules table
CREATE TABLE IF NOT EXISTS cycle_automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_event VARCHAR(100) NOT NULL, -- e.g., 'cycle_started', 'feedback_due', 'cycle_ending'
    conditions JSONB DEFAULT '{}',
    actions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cycle notifications table
CREATE TABLE IF NOT EXISTS cycle_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES feedback_cycles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'cycle_started', 'cycle_ending', 'feedback_due', 'feedback_overdue', 
        'feedback_received', 'feedback_approved', 'cycle_completed'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cycle statistics table (for caching performance)
CREATE TABLE IF NOT EXISTS cycle_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES feedback_cycles(id) ON DELETE CASCADE,
    total_participants INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    completed_requests INTEGER DEFAULT 0,
    pending_requests INTEGER DEFAULT 0,
    overdue_requests INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2),
    completion_rate DECIMAL(5,2),
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cycle_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cycle_participants_cycle_id ON cycle_participants(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_participants_user_id ON cycle_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_cycle_participants_org_id ON cycle_participants(organization_id);
CREATE INDEX IF NOT EXISTS idx_cycle_participants_status ON cycle_participants(status);

CREATE INDEX IF NOT EXISTS idx_cycle_milestones_cycle_id ON cycle_milestones(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_milestones_due_date ON cycle_milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_cycle_milestones_completed ON cycle_milestones(is_completed);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_org_id ON workflow_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_type ON workflow_templates(type);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_active ON workflow_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_template_id ON workflow_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_org_id ON workflow_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);

CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_instance_id ON workflow_step_executions(instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_status ON workflow_step_executions(status);

CREATE INDEX IF NOT EXISTS idx_cycle_automation_rules_org_id ON cycle_automation_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_cycle_automation_rules_active ON cycle_automation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_cycle_automation_rules_trigger ON cycle_automation_rules(trigger_event);

CREATE INDEX IF NOT EXISTS idx_cycle_notifications_cycle_id ON cycle_notifications(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_notifications_user_id ON cycle_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_cycle_notifications_type ON cycle_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_cycle_notifications_read ON cycle_notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_cycle_statistics_cycle_id ON cycle_statistics(cycle_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_cycle_participants_updated_at BEFORE UPDATE ON cycle_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cycle_milestones_updated_at BEFORE UPDATE ON cycle_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON workflow_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_instances_updated_at BEFORE UPDATE ON workflow_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_step_executions_updated_at BEFORE UPDATE ON workflow_step_executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cycle_automation_rules_updated_at BEFORE UPDATE ON cycle_automation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cycle_statistics_updated_at BEFORE UPDATE ON cycle_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
