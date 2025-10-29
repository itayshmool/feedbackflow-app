-- Create Template Attachments Table
-- This table stores completed template files uploaded by users as feedback attachments

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_attachments_response_id ON feedback_template_attachments(feedback_response_id);
CREATE INDEX IF NOT EXISTS idx_template_attachments_template_id ON feedback_template_attachments(template_document_id);
CREATE INDEX IF NOT EXISTS idx_template_attachments_uploaded_by ON feedback_template_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_template_attachments_virus_scan_status ON feedback_template_attachments(virus_scan_status);
CREATE INDEX IF NOT EXISTS idx_template_attachments_uploaded_at ON feedback_template_attachments(uploaded_at);

-- Add constraint to ensure unique file names per feedback response
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_attachments_unique_filename 
ON feedback_template_attachments(feedback_response_id, file_name);

-- Add constraint to prevent duplicate template attachments for the same template
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_attachments_unique_template 
ON feedback_template_attachments(feedback_response_id, template_document_id) 
WHERE template_document_id IS NOT NULL;
