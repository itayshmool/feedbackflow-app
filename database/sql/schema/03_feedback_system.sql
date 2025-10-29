-- Feedback System Schema
-- This file contains the core feedback management tables

-- Feedback cycles table
CREATE TABLE IF NOT EXISTS feedback_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'quarterly' CHECK (type IN ('quarterly', 'annual', 'project', 'custom')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    feedback_start_date DATE,
    feedback_end_date DATE,
    settings JSONB DEFAULT '{
        "allowSelfFeedback": false,
        "allowPeerFeedback": true,
        "allowManagerFeedback": true,
        "allowAnonymousFeedback": false,
        "requireManagerApproval": true,
        "autoReminders": true,
        "reminderFrequency": 3,
        "maxFeedbackPerPerson": 10,
        "feedbackTemplate": "default"
    }',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback requests table
CREATE TABLE IF NOT EXISTS feedback_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES feedback_cycles(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feedback_type VARCHAR(50) DEFAULT 'peer' CHECK (feedback_type IN ('peer', 'manager', 'self', '360')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'declined', 'expired')),
    message TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cycle_id, requester_id, recipient_id, feedback_type)
);

-- Feedback responses table
CREATE TABLE IF NOT EXISTS feedback_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES feedback_requests(id) ON DELETE CASCADE,
    giver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES feedback_cycles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_anonymous BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback templates table
CREATE TABLE IF NOT EXISTS feedback_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'default' CHECK (type IN ('default', 'manager', 'peer', 'self', '360')),
    questions JSONB NOT NULL DEFAULT '[]',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback categories table
CREATE TABLE IF NOT EXISTS feedback_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback tags table
CREATE TABLE IF NOT EXISTS feedback_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280', -- Hex color code
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- Feedback response tags junction table
CREATE TABLE IF NOT EXISTS feedback_response_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES feedback_responses(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES feedback_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(response_id, tag_id)
);

-- Feedback comments table
CREATE TABLE IF NOT EXISTS feedback_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES feedback_responses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false, -- Internal comments not visible to recipient
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback acknowledgments table
CREATE TABLE IF NOT EXISTS feedback_acknowledgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES feedback_responses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(response_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_cycles_org_id ON feedback_cycles(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedback_cycles_status ON feedback_cycles(status);
CREATE INDEX IF NOT EXISTS idx_feedback_cycles_start_date ON feedback_cycles(start_date);
CREATE INDEX IF NOT EXISTS idx_feedback_cycles_end_date ON feedback_cycles(end_date);
CREATE INDEX IF NOT EXISTS idx_feedback_cycles_created_by ON feedback_cycles(created_by);

CREATE INDEX IF NOT EXISTS idx_feedback_requests_cycle_id ON feedback_requests(cycle_id);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_requester_id ON feedback_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_recipient_id ON feedback_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_status ON feedback_requests(status);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_due_date ON feedback_requests(due_date);

CREATE INDEX IF NOT EXISTS idx_feedback_responses_request_id ON feedback_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_giver_id ON feedback_responses(giver_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_recipient_id ON feedback_responses(recipient_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_cycle_id ON feedback_responses(cycle_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_approved ON feedback_responses(is_approved);

CREATE INDEX IF NOT EXISTS idx_feedback_templates_org_id ON feedback_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedback_templates_type ON feedback_templates(type);
CREATE INDEX IF NOT EXISTS idx_feedback_templates_active ON feedback_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_feedback_categories_org_id ON feedback_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedback_categories_active ON feedback_categories(is_active);

CREATE INDEX IF NOT EXISTS idx_feedback_tags_org_id ON feedback_tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedback_tags_active ON feedback_tags(is_active);

CREATE INDEX IF NOT EXISTS idx_feedback_response_tags_response_id ON feedback_response_tags(response_id);
CREATE INDEX IF NOT EXISTS idx_feedback_response_tags_tag_id ON feedback_response_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_feedback_comments_response_id ON feedback_comments(response_id);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_user_id ON feedback_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_acknowledgments_response_id ON feedback_acknowledgments(response_id);
CREATE INDEX IF NOT EXISTS idx_feedback_acknowledgments_user_id ON feedback_acknowledgments(user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_feedback_cycles_updated_at BEFORE UPDATE ON feedback_cycles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_requests_updated_at BEFORE UPDATE ON feedback_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_responses_updated_at BEFORE UPDATE ON feedback_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_templates_updated_at BEFORE UPDATE ON feedback_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_categories_updated_at BEFORE UPDATE ON feedback_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_tags_updated_at BEFORE UPDATE ON feedback_tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_comments_updated_at BEFORE UPDATE ON feedback_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Feedback template documents table (for document templates like Word/PDF)
CREATE TABLE IF NOT EXISTS feedback_template_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) DEFAULT 'peer' CHECK (template_type IN ('manager', 'peer', 'self', 'project', '360')),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_mime_type VARCHAR(100) NOT NULL,
    file_format VARCHAR(10) NOT NULL CHECK (file_format IN ('.docx', '.pdf', '.doc')),
    version INTEGER DEFAULT 1,
    download_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    tags JSONB DEFAULT '[]'::jsonb,
    permissions JSONB DEFAULT '{"roles": ["admin", "manager", "employee"], "departments": [], "cycles": []}'::jsonb,
    availability_rules JSONB DEFAULT '{"restrictToCycles": false, "restrictToDepartments": false, "restrictToRoles": false}'::jsonb,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE NULL
);

-- Feedback template attachments table (for completed template files uploaded by users)
CREATE TABLE IF NOT EXISTS feedback_template_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_response_id UUID NOT NULL REFERENCES feedback_responses(id) ON DELETE CASCADE,
    template_document_id UUID REFERENCES feedback_template_documents(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_mime_type VARCHAR(100) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    virus_scan_status VARCHAR(20) DEFAULT 'pending' CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'failed')),
    virus_scan_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback template analytics table (for tracking usage analytics)
CREATE TABLE IF NOT EXISTS feedback_template_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_document_id UUID NOT NULL REFERENCES feedback_template_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('download', 'view', 'attach')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for template documents
CREATE INDEX IF NOT EXISTS idx_template_docs_org_id ON feedback_template_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_template_docs_type ON feedback_template_documents(template_type);
CREATE INDEX IF NOT EXISTS idx_template_docs_active ON feedback_template_documents(is_active);
CREATE INDEX IF NOT EXISTS idx_template_docs_created_by ON feedback_template_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_template_docs_archived_at ON feedback_template_documents(archived_at);
CREATE INDEX IF NOT EXISTS idx_template_docs_file_format ON feedback_template_documents(file_format);

-- Create indexes for template attachments
CREATE INDEX IF NOT EXISTS idx_template_attachments_response_id ON feedback_template_attachments(feedback_response_id);
CREATE INDEX IF NOT EXISTS idx_template_attachments_template_id ON feedback_template_attachments(template_document_id);
CREATE INDEX IF NOT EXISTS idx_template_attachments_uploaded_by ON feedback_template_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_template_attachments_virus_scan_status ON feedback_template_attachments(virus_scan_status);
CREATE INDEX IF NOT EXISTS idx_template_attachments_uploaded_at ON feedback_template_attachments(uploaded_at);

-- Create indexes for template analytics
CREATE INDEX IF NOT EXISTS idx_template_analytics_template_id ON feedback_template_analytics(template_document_id);
CREATE INDEX IF NOT EXISTS idx_template_analytics_user_id ON feedback_template_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_template_analytics_action ON feedback_template_analytics(action);
CREATE INDEX IF NOT EXISTS idx_template_analytics_created_at ON feedback_template_analytics(created_at);

-- Create composite indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_template_analytics_template_action_date 
ON feedback_template_analytics(template_document_id, action, created_at);

CREATE INDEX IF NOT EXISTS idx_template_analytics_user_action_date 
ON feedback_template_analytics(user_id, action, created_at);

-- Add constraints for template documents
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_docs_unique_default 
ON feedback_template_documents(organization_id, template_type) 
WHERE is_default = true AND archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_template_docs_unique_filename 
ON feedback_template_documents(organization_id, file_name) 
WHERE archived_at IS NULL;

-- Add constraints for template attachments
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_attachments_unique_filename 
ON feedback_template_attachments(feedback_response_id, file_name);

CREATE UNIQUE INDEX IF NOT EXISTS idx_template_attachments_unique_template 
ON feedback_template_attachments(feedback_response_id, template_document_id) 
WHERE template_document_id IS NOT NULL;

-- Add constraint for template analytics (prevent spam)
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_analytics_unique_action_window 
ON feedback_template_analytics(template_document_id, user_id, action, DATE_TRUNC('minute', created_at));

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_template_documents_updated_at BEFORE UPDATE ON feedback_template_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
