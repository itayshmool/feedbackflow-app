-- Create Template Documents Table
-- This table stores metadata about feedback template documents uploaded by admins

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_docs_org_id ON feedback_template_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_template_docs_type ON feedback_template_documents(template_type);
CREATE INDEX IF NOT EXISTS idx_template_docs_active ON feedback_template_documents(is_active);
CREATE INDEX IF NOT EXISTS idx_template_docs_created_by ON feedback_template_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_template_docs_archived_at ON feedback_template_documents(archived_at);
CREATE INDEX IF NOT EXISTS idx_template_docs_file_format ON feedback_template_documents(file_format);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_template_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_documents_updated_at
    BEFORE UPDATE ON feedback_template_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_template_documents_updated_at();

-- Add constraint to ensure only one default template per organization per type
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_docs_unique_default 
ON feedback_template_documents(organization_id, template_type) 
WHERE is_default = true AND archived_at IS NULL;

-- Add constraint to ensure unique file names per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_docs_unique_filename 
ON feedback_template_documents(organization_id, file_name) 
WHERE archived_at IS NULL;
