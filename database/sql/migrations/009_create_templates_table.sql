-- Migration: Create templates table for file-based template documents
-- Purpose: Support admin upload of Word/PDF templates for users to download
-- Date: 2025-11-30

-- Create templates table for file-based document templates
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) DEFAULT 'peer' CHECK (template_type IN ('peer', 'manager', 'self', 'project', '360')),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    file_mime_type VARCHAR(100) NOT NULL,
    file_format VARCHAR(10) NOT NULL,
    download_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    tags JSONB DEFAULT '[]',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_organization ON templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(template_type);
CREATE INDEX IF NOT EXISTS idx_templates_active ON templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);

-- Add comments for documentation
COMMENT ON TABLE templates IS 'File-based template documents (Word/PDF) that users can download';
COMMENT ON COLUMN templates.template_type IS 'Type of feedback the template is for: peer, manager, self, project, 360';
COMMENT ON COLUMN templates.file_path IS 'File system path where the template file is stored';
COMMENT ON COLUMN templates.download_count IS 'Number of times this template has been downloaded';
COMMENT ON COLUMN templates.tags IS 'JSON array of tags for categorization and search';


