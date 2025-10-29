# Feedback Templates API Documentation

## Overview

The Feedback Templates API provides comprehensive functionality for managing document templates (Word, PDF) in the FeedbackFlow system. This includes template upload, management, download, attachment handling, analytics, and configuration.

## Base URL

```
https://api.feedbackflow.com/api/v1/templates
```

## Authentication

All endpoints require authentication via Bearer token:

```http
Authorization: Bearer <jwt-token>
```

## Template Document Management

### Upload Template Document

Upload a new template document (Admin/Manager only).

**Endpoint:** `POST /api/v1/templates`

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (required): Template file (.docx, .pdf, .doc)
  - `name` (required): Template name
  - `description` (optional): Template description
  - `templateType` (required): Template type (manager, peer, self, project, 360)
  - `tags` (optional): Array of tags
  - `permissions` (optional): Permission settings
  - `availabilityRules` (optional): Availability restrictions
  - `isDefault` (optional): Whether this is the default template

**Example Request:**
```bash
curl -X POST "https://api.feedbackflow.com/api/v1/templates" \
  -H "Authorization: Bearer <token>" \
  -F "file=@template.docx" \
  -F "name=Peer Feedback Template" \
  -F "description=Standard peer feedback template" \
  -F "templateType=peer" \
  -F "tags=[\"standard\", \"peer\"]" \
  -F "isDefault=false"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "template": {
      "id": "template-123",
      "organizationId": "org-456",
      "name": "Peer Feedback Template",
      "description": "Standard peer feedback template",
      "templateType": "peer",
      "fileName": "template.docx",
      "filePath": "templates/org-456/template_123456.docx",
      "fileSize": 1024000,
      "fileMimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "fileFormat": ".docx",
      "version": 1,
      "downloadCount": 0,
      "isActive": true,
      "isDefault": false,
      "tags": ["standard", "peer"],
      "permissions": {
        "roles": ["admin", "manager", "employee"],
        "departments": [],
        "cycles": []
      },
      "availabilityRules": {
        "restrictToCycles": false,
        "restrictToDepartments": false,
        "restrictToRoles": false
      },
      "createdBy": "user-789",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    "fileUrl": "/uploads/templates/org-456/template_123456.docx"
  }
}
```

### List Template Documents

Get a list of template documents with filtering options.

**Endpoint:** `GET /api/v1/templates`

**Query Parameters:**
- `templateType` (optional): Filter by template type
- `isActive` (optional): Filter by active status
- `isDefault` (optional): Filter by default status
- `fileFormat` (optional): Filter by file format
- `tags` (optional): Filter by tags
- `search` (optional): Search in name and description
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `sortBy` (optional): Sort field (name, createdAt, updatedAt, downloadCount)
- `sortOrder` (optional): Sort order (asc, desc)

**Example Request:**
```bash
curl -X GET "https://api.feedbackflow.com/api/v1/templates?templateType=peer&isActive=true&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "template-123",
        "name": "Peer Feedback Template",
        "templateType": "peer",
        "downloadCount": 25,
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### Get Template Document

Get details of a specific template document.

**Endpoint:** `GET /api/v1/templates/:id`

**Example Request:**
```bash
curl -X GET "https://api.feedbackflow.com/api/v1/templates/template-123" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "template-123",
    "organizationId": "org-456",
    "name": "Peer Feedback Template",
    "description": "Standard peer feedback template",
    "templateType": "peer",
    "fileName": "template.docx",
    "filePath": "templates/org-456/template_123456.docx",
    "fileSize": 1024000,
    "fileMimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "fileFormat": ".docx",
    "version": 1,
    "downloadCount": 25,
    "isActive": true,
    "isDefault": false,
    "tags": ["standard", "peer"],
    "permissions": {
      "roles": ["admin", "manager", "employee"],
      "departments": [],
      "cycles": []
    },
    "availabilityRules": {
      "restrictToCycles": false,
      "restrictToDepartments": false,
      "restrictToRoles": false
    },
    "createdBy": "user-789",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Update Template Document

Update template document metadata (Admin/Manager only).

**Endpoint:** `PUT /api/v1/templates/:id`

**Request Body:**
```json
{
  "name": "Updated Template Name",
  "description": "Updated description",
  "templateType": "manager",
  "tags": ["updated", "manager"],
  "permissions": {
    "roles": ["admin", "manager"],
    "departments": ["engineering"],
    "cycles": []
  },
  "isActive": true
}
```

**Example Request:**
```bash
curl -X PUT "https://api.feedbackflow.com/api/v1/templates/template-123" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Template Name",
    "description": "Updated description",
    "isActive": true
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "template-123",
    "name": "Updated Template Name",
    "description": "Updated description",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

### Delete Template Document

Delete a template document (Admin/Manager only).

**Endpoint:** `DELETE /api/v1/templates/:id`

**Example Request:**
```bash
curl -X DELETE "https://api.feedbackflow.com/api/v1/templates/template-123" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "message": "Template document deleted successfully"
}
```

### Download Template File

Download the template file.

**Endpoint:** `GET /api/v1/templates/:id/download`

**Example Request:**
```bash
curl -X GET "https://api.feedbackflow.com/api/v1/templates/template-123/download" \
  -H "Authorization: Bearer <token>" \
  -o "template.docx"
```

**Response:**
- **Content-Type:** File MIME type
- **Content-Disposition:** `attachment; filename="template.docx"`
- **Body:** File binary data

### Duplicate Template Document

Create a copy of an existing template (Admin/Manager only).

**Endpoint:** `POST /api/v1/templates/:id/duplicate`

**Request Body:**
```json
{
  "newName": "Copy of Peer Feedback Template"
}
```

**Example Request:**
```bash
curl -X POST "https://api.feedbackflow.com/api/v1/templates/template-123/duplicate" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "newName": "Copy of Peer Feedback Template"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "originalTemplate": {
      "id": "template-123",
      "name": "Peer Feedback Template"
    },
    "duplicatedTemplate": {
      "id": "template-456",
      "name": "Copy of Peer Feedback Template",
      "description": "Copy of Peer Feedback Template"
    }
  }
}
```

### Replace Template File

Replace the template file (Admin/Manager only).

**Endpoint:** `PUT /api/v1/templates/:id/file`

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (required): New template file

**Example Request:**
```bash
curl -X PUT "https://api.feedbackflow.com/api/v1/templates/template-123/file" \
  -H "Authorization: Bearer <token>" \
  -F "file=@new-template.docx"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "template-123",
    "fileName": "new-template.docx",
    "fileSize": 2048000,
    "updatedAt": "2024-01-15T11:30:00Z"
  }
}
```

## Template Attachments

### Upload Attachment to Feedback

Upload a completed template as attachment to a feedback response.

**Endpoint:** `POST /api/v1/feedback/:feedbackId/attachments`

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (required): Completed template file
  - `templateDocumentId` (optional): ID of the original template
  - `description` (optional): Attachment description

**Example Request:**
```bash
curl -X POST "https://api.feedbackflow.com/api/v1/feedback/feedback-123/attachments" \
  -H "Authorization: Bearer <token>" \
  -F "file=@completed-feedback.docx" \
  -F "templateDocumentId=template-123" \
  -F "description=Completed peer feedback"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "attachment": {
      "id": "attachment-456",
      "feedbackResponseId": "feedback-123",
      "templateDocumentId": "template-123",
      "fileName": "completed-feedback.docx",
      "filePath": "attachments/feedback-123/completed-feedback_123456.docx",
      "fileSize": 1536000,
      "fileMimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "uploadedBy": "user-789",
      "uploadedAt": "2024-01-15T12:00:00Z",
      "virusScanStatus": "pending",
      "createdAt": "2024-01-15T12:00:00Z"
    },
    "fileUrl": "/uploads/attachments/feedback-123/completed-feedback_123456.docx"
  }
}
```

### List Attachments for Feedback

Get all attachments for a feedback response.

**Endpoint:** `GET /api/v1/feedback/:feedbackId/attachments`

**Example Request:**
```bash
curl -X GET "https://api.feedbackflow.com/api/v1/feedback/feedback-123/attachments" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "attachment-456",
      "feedbackResponseId": "feedback-123",
      "templateDocumentId": "template-123",
      "fileName": "completed-feedback.docx",
      "fileSize": 1536000,
      "uploadedBy": "user-789",
      "uploadedAt": "2024-01-15T12:00:00Z",
      "virusScanStatus": "clean"
    }
  ]
}
```

### Download Attachment

Download an attachment file.

**Endpoint:** `GET /api/v1/feedback/:feedbackId/attachments/:id/download`

**Example Request:**
```bash
curl -X GET "https://api.feedbackflow.com/api/v1/feedback/feedback-123/attachments/attachment-456/download" \
  -H "Authorization: Bearer <token>" \
  -o "completed-feedback.docx"
```

**Response:**
- **Content-Type:** File MIME type
- **Content-Disposition:** `attachment; filename="completed-feedback.docx"`
- **Body:** File binary data

### Delete Attachment

Delete an attachment (uploader only).

**Endpoint:** `DELETE /api/v1/feedback/:feedbackId/attachments/:id`

**Example Request:**
```bash
curl -X DELETE "https://api.feedbackflow.com/api/v1/feedback/feedback-123/attachments/attachment-456" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "message": "Attachment deleted successfully"
}
```

## Analytics & Reporting

### Get Template Analytics

Get usage analytics for a specific template.

**Endpoint:** `GET /api/v1/templates/:id/analytics`

**Query Parameters:**
- `startDate` (optional): Start date for analytics (YYYY-MM-DD)
- `endDate` (optional): End date for analytics (YYYY-MM-DD)

**Example Request:**
```bash
curl -X GET "https://api.feedbackflow.com/api/v1/templates/template-123/analytics?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTemplates": 5,
    "activeTemplates": 4,
    "totalDownloads": 150,
    "totalViews": 300,
    "totalAttachments": 45,
    "uniqueUsers": 25,
    "averageTemplatesPerUser": 0.2,
    "mostPopularTemplates": [
      {
        "templateId": "template-123",
        "templateName": "Peer Feedback Template",
        "downloadCount": 50,
        "attachmentCount": 15
      }
    ],
    "usageByTemplateType": {
      "peer": 100,
      "manager": 30,
      "self": 20
    },
    "usageByFileFormat": {
      ".docx": 120,
      ".pdf": 30
    },
    "timeSeriesData": [
      {
        "date": "2024-01-15",
        "downloads": 10,
        "views": 20,
        "attachments": 3
      }
    ]
  }
}
```

### Get Template Trends

Get usage trends for a template over time.

**Endpoint:** `GET /api/v1/templates/:id/trends`

**Query Parameters:**
- `period` (optional): Time period (daily, weekly, monthly)
- `limit` (optional): Number of data points (default: 30)

**Example Request:**
```bash
curl -X GET "https://api.feedbackflow.com/api/v1/templates/template-123/trends?period=weekly&limit=12" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "period": "2024-01-15T00:00:00Z",
      "downloads": 15,
      "views": 30,
      "attachments": 5,
      "uniqueUsers": 8
    }
  ]
}
```

### Get Download History

Get download history for a template.

**Endpoint:** `GET /api/v1/templates/:id/downloads`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Example Request:**
```bash
curl -X GET "https://api.feedbackflow.com/api/v1/templates/template-123/downloads?page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "downloads": [
      {
        "userId": "user-789",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "downloadedAt": "2024-01-15T10:30:00Z",
        "metadata": {
          "timestamp": "2024-01-15T10:30:00Z"
        }
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

### Generate Usage Report

Generate a usage report for the organization (Admin/Manager only).

**Endpoint:** `GET /api/v1/templates/reports`

**Query Parameters:**
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)
- `format` (optional): Report format (json, csv)

**Example Request:**
```bash
curl -X GET "https://api.feedbackflow.com/api/v1/templates/reports?startDate=2024-01-01&endDate=2024-01-31&format=csv" \
  -H "Authorization: Bearer <token>" \
  -o "template-usage-report.csv"
```

**Response (CSV):**
```csv
Metric,Value
Total Templates,5
Active Templates,4
Total Downloads,150
Total Views,300
Total Attachments,45
Unique Users,25
Average Templates Per User,0.20

Most Popular Templates,,
Template Name,Downloads,Attachments
Peer Feedback Template,50,15
Manager Feedback Template,30,10
```

## Settings & Configuration

### Get Global Settings

Get global template settings (Admin only).

**Endpoint:** `GET /api/v1/templates/settings`

**Example Request:**
```bash
curl -X GET "https://api.feedbackflow.com/api/v1/templates/settings" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "maxFileSizeMB": 10,
    "allowedFileFormats": [".docx", ".pdf", ".doc"],
    "virusScanningEnabled": true,
    "storageProvider": "local",
    "autoDeleteAfterDays": 365,
    "maxTemplatesPerOrganization": 100,
    "allowPublicTemplates": false,
    "requireApprovalForTemplates": false,
    "defaultPermissions": {
      "roles": ["admin", "manager", "employee"],
      "departments": [],
      "cycles": []
    },
    "notificationSettings": {
      "notifyOnUpload": true,
      "notifyOnDownload": false,
      "notifyOnAttachment": true,
      "notifyOnApproval": true
    },
    "retentionPolicy": {
      "keepTemplatesForDays": 365,
      "keepAttachmentsForDays": 180,
      "keepAnalyticsForDays": 90
    },
    "securitySettings": {
      "requireVirusScan": true,
      "allowAnonymousDownloads": false,
      "requireAuthenticationForDownloads": true,
      "maxDownloadsPerUser": 100
    }
  }
}
```

### Update Global Settings

Update global template settings (Admin only).

**Endpoint:** `PUT /api/v1/templates/settings`

**Request Body:**
```json
{
  "maxFileSizeMB": 15,
  "virusScanningEnabled": false,
  "maxTemplatesPerOrganization": 150,
  "securitySettings": {
    "requireVirusScan": false,
    "maxDownloadsPerUser": 200
  }
}
```

**Example Request:**
```bash
curl -X PUT "https://api.feedbackflow.com/api/v1/templates/settings" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "maxFileSizeMB": 15,
    "virusScanningEnabled": false,
    "maxTemplatesPerOrganization": 150
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "maxFileSizeMB": 15,
    "virusScanningEnabled": false,
    "maxTemplatesPerOrganization": 150,
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

### Get Organization Settings

Get organization-specific template settings.

**Endpoint:** `GET /api/v1/templates/settings/organization`

**Example Request:**
```bash
curl -X GET "https://api.feedbackflow.com/api/v1/templates/settings/organization" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "maxFileSizeMB": 10,
    "allowedFileFormats": [".docx", ".pdf", ".doc"],
    "virusScanningEnabled": true,
    "storageProvider": "local",
    "maxTemplatesPerOrganization": 100,
    "defaultPermissions": {
      "roles": ["admin", "manager", "employee"],
      "departments": ["engineering", "marketing"],
      "cycles": []
    }
  }
}
```

### Get File Validation Rules

Get current file validation rules.

**Endpoint:** `GET /api/v1/templates/settings/validation`

**Example Request:**
```bash
curl -X GET "https://api.feedbackflow.com/api/v1/templates/settings/validation" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "maxSizeMB": 10,
    "allowedTypes": [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/pdf",
      "application/msword"
    ],
    "allowedExtensions": [".docx", ".pdf", ".doc"]
  }
}
```

### Check Upload Permissions

Check if the current user can upload templates.

**Endpoint:** `GET /api/v1/templates/settings/permissions`

**Example Request:**
```bash
curl -X GET "https://api.feedbackflow.com/api/v1/templates/settings/permissions" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "canUpload": true
  }
}
```

**Response (when not allowed):**
```json
{
  "success": true,
  "data": {
    "canUpload": false,
    "reason": "Organization template limit reached"
  }
}
```

## Error Responses

### Common Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 413 | Payload Too Large - File size exceeds limit |
| 415 | Unsupported Media Type - Invalid file format |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "details": [
    {
      "field": "name",
      "message": "Name is required"
    }
  ]
}
```

### Example Error Responses

**File too large:**
```json
{
  "success": false,
  "error": "File validation failed: File size exceeds maximum allowed size of 10MB"
}
```

**Invalid file type:**
```json
{
  "success": false,
  "error": "File validation failed: Invalid file type. Allowed types: application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/pdf, application/msword"
}
```

**Insufficient permissions:**
```json
{
  "success": false,
  "error": "Access denied: Admin role required"
}
```

**Template not found:**
```json
{
  "success": false,
  "error": "Template document not found"
}
```

## Rate Limiting

- **Upload operations:** 10 requests per 15 minutes per IP
- **Download operations:** 100 requests per hour per user
- **API requests:** 1000 requests per hour per user

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## File Storage

### Supported Storage Providers

1. **Local Filesystem** (default)
   - Files stored in `./uploads/` directory
   - Suitable for development and small deployments

2. **AWS S3**
   - Environment variables required:
     - `AWS_S3_BUCKET`
     - `AWS_S3_REGION`
     - `AWS_S3_ACCESS_KEY_ID`
     - `AWS_S3_SECRET_ACCESS_KEY`

3. **Azure Blob Storage**
   - Environment variables required:
     - `AZURE_STORAGE_ACCOUNT_NAME`
     - `AZURE_STORAGE_ACCOUNT_KEY`
     - `AZURE_STORAGE_CONTAINER_NAME`

4. **Google Cloud Storage**
   - Environment variables required:
     - `GOOGLE_CLOUD_PROJECT_ID`
     - `GOOGLE_CLOUD_BUCKET_NAME`
     - `GOOGLE_CLOUD_KEY_FILENAME`

### File Organization

```
uploads/
├── templates/
│   └── {organizationId}/
│       └── {uniqueFileName}
└── attachments/
    └── {feedbackResponseId}/
        └── {uniqueFileName}
```

## Security Features

### Virus Scanning

- Optional virus scanning for uploaded files
- Supported providers: ClamAV, AWS S3 Malware scanning
- Files marked as `pending` until scan completes
- Infected files are automatically quarantined

### File Validation

- File type validation (MIME type + extension)
- File size limits (configurable per organization)
- File name sanitization (removes path traversal attempts)
- Content validation for supported formats

### Access Control

- Role-based access control (RBAC)
- Organization-scoped templates
- Permission-based template access
- User-specific download limits

## Best Practices

### File Upload

1. **Validate files client-side** before upload
2. **Use appropriate file names** (descriptive, no special characters)
3. **Compress large files** when possible
4. **Include meaningful descriptions** for templates

### Template Management

1. **Use consistent naming conventions** for templates
2. **Tag templates appropriately** for easy filtering
3. **Set appropriate permissions** based on use case
4. **Regularly review and archive** unused templates

### Security

1. **Enable virus scanning** in production
2. **Set appropriate file size limits**
3. **Regularly audit template permissions**
4. **Monitor download patterns** for anomalies

### Performance

1. **Use pagination** for large template lists
2. **Cache frequently accessed templates**
3. **Implement CDN** for template downloads
4. **Monitor storage usage** and implement cleanup policies

## Migration Guide

### Database Migration

Run the following SQL migrations in order:

```sql
-- 1. Create template documents table
\i database/sql/migrations/005_create_template_documents.sql

-- 2. Create template attachments table
\i database/sql/migrations/006_create_template_attachments.sql

-- 3. Create template analytics table
\i database/sql/migrations/007_create_template_analytics.sql
```

### Environment Configuration

Add the following environment variables:

```env
# File Storage
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./uploads
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=us-east-1

# Template Settings
MAX_TEMPLATE_SIZE_MB=10
MAX_ATTACHMENT_SIZE_MB=10
ALLOWED_TEMPLATE_FORMATS=.docx,.pdf,.doc
VIRUS_SCANNING_ENABLED=false

# Security
REQUIRE_VIRUS_SCAN=true
MAX_DOWNLOADS_PER_USER=100
```

### API Integration

1. **Update authentication** to include template permissions
2. **Add template routes** to your Express app
3. **Configure file storage** based on your needs
4. **Set up monitoring** for template usage

## Support

For technical support or questions about the Template API:

- **Documentation:** https://docs.feedbackflow.com/templates
- **API Status:** https://status.feedbackflow.com
- **Support Email:** api-support@feedbackflow.com
- **Community Forum:** https://community.feedbackflow.com
