# Feedback Templates - Deployment Guide

## Overview

This guide covers the deployment of the Feedback Templates feature to production environments. The templates feature adds document template management capabilities to the FeedbackFlow system.

## Prerequisites

### System Requirements

- **Node.js:** 18.x or higher
- **PostgreSQL:** 13.x or higher
- **Storage:** Minimum 10GB for file storage
- **Memory:** Minimum 2GB RAM
- **CPU:** Minimum 2 cores

### Dependencies

- **Multer:** File upload handling
- **Zod:** Request validation
- **AWS SDK:** For S3 storage (optional)
- **Azure Storage SDK:** For Azure Blob Storage (optional)
- **Google Cloud Storage SDK:** For GCS (optional)

## Database Setup

### 1. Run Migrations

Execute the database migrations in order:

```bash
# Connect to your PostgreSQL database
psql -h localhost -U feedbackflow_app -d feedbackflow_db

# Run migrations
\i database/sql/migrations/005_create_template_documents.sql
\i database/sql/migrations/006_create_template_attachments.sql
\i database/sql/migrations/007_create_template_analytics.sql
```

### 2. Verify Tables

Confirm the tables were created successfully:

```sql
-- Check template documents table
\d feedback_template_documents;

-- Check template attachments table
\d feedback_template_attachments;

-- Check template analytics table
\d feedback_template_analytics;

-- Verify indexes
\di feedback_template_*
```

### 3. Set Permissions

Ensure the application user has proper permissions:

```sql
-- Grant permissions to feedbackflow_app user
GRANT SELECT, INSERT, UPDATE, DELETE ON feedback_template_documents TO feedbackflow_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON feedback_template_attachments TO feedbackflow_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON feedback_template_analytics TO feedbackflow_app;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO feedbackflow_app;
```

## Environment Configuration

### 1. Required Environment Variables

Add these variables to your `.env` file:

```env
# File Storage Configuration
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./uploads
STORAGE_MAX_FILE_SIZE_MB=10

# Template Settings
TEMPLATE_MAX_FILE_SIZE_MB=10
TEMPLATE_ALLOWED_FORMATS=.docx,.pdf,.doc
TEMPLATE_VIRUS_SCANNING_ENABLED=false
TEMPLATE_MAX_PER_ORGANIZATION=100

# Security Settings
TEMPLATE_REQUIRE_VIRUS_SCAN=false
TEMPLATE_MAX_DOWNLOADS_PER_USER=100
TEMPLATE_REQUIRE_AUTH_FOR_DOWNLOADS=true

# Notification Settings
TEMPLATE_NOTIFY_ON_UPLOAD=true
TEMPLATE_NOTIFY_ON_DOWNLOAD=false
TEMPLATE_NOTIFY_ON_ATTACHMENT=true
```

### 2. Cloud Storage Configuration (Optional)

#### AWS S3

```env
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=your-feedbackflow-templates
AWS_S3_REGION=us-east-1
AWS_S3_ACCESS_KEY_ID=your-access-key
AWS_S3_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_ENDPOINT=https://s3.amazonaws.com
```

#### Azure Blob Storage

```env
STORAGE_PROVIDER=azure
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account
AZURE_STORAGE_ACCOUNT_KEY=your-account-key
AZURE_STORAGE_CONTAINER_NAME=templates
AZURE_STORAGE_ENDPOINT=https://your-storage-account.blob.core.windows.net
```

#### Google Cloud Storage

```env
STORAGE_PROVIDER=gcs
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_BUCKET_NAME=your-bucket-name
GOOGLE_CLOUD_KEY_FILENAME=path/to/service-account-key.json
```

### 3. Production Environment Variables

For production deployments, use these additional settings:

```env
# Production Security
NODE_ENV=production
TEMPLATE_VIRUS_SCANNING_ENABLED=true
TEMPLATE_REQUIRE_VIRUS_SCAN=true
TEMPLATE_AUTO_DELETE_AFTER_DAYS=365

# Performance
TEMPLATE_CACHE_ENABLED=true
TEMPLATE_CACHE_TTL_SECONDS=3600

# Monitoring
TEMPLATE_METRICS_ENABLED=true
TEMPLATE_LOG_LEVEL=info
```

## File Storage Setup

### 1. Local Storage (Development)

Create the uploads directory structure:

```bash
# Create directories
mkdir -p uploads/templates
mkdir -p uploads/attachments

# Set permissions
chmod 755 uploads
chmod 755 uploads/templates
chmod 755 uploads/attachments

# Ensure the application user can write
chown -R feedbackflow:feedbackflow uploads/
```

### 2. Cloud Storage Setup

#### AWS S3 Bucket Setup

```bash
# Create S3 bucket
aws s3 mb s3://your-feedbackflow-templates --region us-east-1

# Set bucket policy for public read access to downloads
aws s3api put-bucket-policy --bucket your-feedbackflow-templates --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-feedbackflow-templates/*"
    }
  ]
}'

# Enable CORS
aws s3api put-bucket-cors --bucket your-feedbackflow-templates --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}'
```

#### Azure Blob Storage Setup

```bash
# Create storage account (if not exists)
az storage account create \
  --name your-storage-account \
  --resource-group your-resource-group \
  --location eastus \
  --sku Standard_LRS

# Create container
az storage container create \
  --name templates \
  --account-name your-storage-account \
  --account-key your-account-key
```

## Application Deployment

### 1. Install Dependencies

```bash
# Install new dependencies
npm install multer zod

# Install cloud storage dependencies (if using)
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install @azure/storage-blob
npm install @google-cloud/storage
```

### 2. Update Application Configuration

Add template routes to your main application:

```typescript
// In your main server file (e.g., app.ts or server.ts)
import templateRoutes from './modules/templates/routes/template.routes.js';
import attachmentRoutes from './modules/templates/routes/attachment.routes.js';

// Register routes
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/feedback', attachmentRoutes);
```

### 3. Update Middleware

Ensure the following middleware is properly configured:

```typescript
// Rate limiting for file uploads
import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many upload requests from this IP'
});

// Apply to upload routes
app.use('/api/v1/templates', uploadLimiter);
```

### 4. Health Check Updates

Add template service health checks:

```typescript
// Add to your health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      storage: await checkStorage(),
      templates: await checkTemplateService()
    }
  };
  
  res.json(health);
});

async function checkTemplateService() {
  try {
    // Test template service
    const templateService = new TemplateDocumentService();
    await templateService.findAll({ limit: 1 });
    return 'ok';
  } catch (error) {
    return 'error';
  }
}
```

## Security Configuration

### 1. File Upload Security

Configure file validation middleware:

```typescript
import { createFileValidationMiddleware } from './shared/utils/file-validator.js';

const fileValidation = createFileValidationMiddleware({
  maxSizeMB: 10,
  allowedTypes: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
    'application/msword'
  ],
  allowedExtensions: ['.docx', '.pdf', '.doc']
});

// Apply to upload routes
app.use('/api/v1/templates', fileValidation);
```

### 2. Access Control

Ensure proper role-based access control:

```typescript
// Admin-only routes
app.use('/api/v1/templates', requireRole(['admin']));

// Manager and Admin routes
app.use('/api/v1/templates/analytics', requireRole(['admin', 'manager']));
```

### 3. Virus Scanning (Optional)

If enabling virus scanning:

```bash
# Install ClamAV
sudo apt-get install clamav clamav-daemon

# Update virus definitions
sudo freshclam

# Start ClamAV daemon
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon
```

## Monitoring & Logging

### 1. Application Metrics

Add template-specific metrics:

```typescript
// Using Prometheus metrics
import { register, Counter, Histogram } from 'prom-client';

const templateUploads = new Counter({
  name: 'template_uploads_total',
  help: 'Total number of template uploads',
  labelNames: ['organization_id', 'template_type']
});

const templateDownloads = new Counter({
  name: 'template_downloads_total',
  help: 'Total number of template downloads',
  labelNames: ['template_id', 'user_id']
});

const fileUploadDuration = new Histogram({
  name: 'file_upload_duration_seconds',
  help: 'Duration of file upload operations',
  labelNames: ['file_type', 'file_size_range']
});
```

### 2. Logging Configuration

Configure structured logging:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'feedback-templates' },
  transports: [
    new winston.transports.File({ filename: 'logs/templates-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/templates-combined.log' }),
    new winston.transports.Console()
  ]
});
```

### 3. Health Monitoring

Set up monitoring alerts:

```yaml
# Example Prometheus alert rules
groups:
  - name: template-alerts
    rules:
      - alert: TemplateUploadFailure
        expr: rate(template_uploads_failed_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High template upload failure rate"
          
      - alert: StorageSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/uploads"} / node_filesystem_size_bytes{mountpoint="/uploads"}) < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low storage space for templates"
```

## Performance Optimization

### 1. Caching Strategy

Implement caching for frequently accessed templates:

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});

// Cache template metadata
const cacheTemplate = async (templateId: string, template: any) => {
  await redis.setex(`template:${templateId}`, 3600, JSON.stringify(template));
};

const getCachedTemplate = async (templateId: string) => {
  const cached = await redis.get(`template:${templateId}`);
  return cached ? JSON.parse(cached) : null;
};
```

### 2. CDN Configuration

For cloud storage, configure CDN:

```typescript
// AWS CloudFront
const cloudFrontUrl = 'https://d1234567890.cloudfront.net';

// Generate signed URLs for private templates
const generateSignedUrl = async (templateId: string) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: `templates/${templateId}`
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};
```

### 3. Database Optimization

Add database indexes for performance:

```sql
-- Additional indexes for better performance
CREATE INDEX CONCURRENTLY idx_template_documents_org_active 
ON feedback_template_documents(organization_id, is_active);

CREATE INDEX CONCURRENTLY idx_template_documents_type_active 
ON feedback_template_documents(template_type, is_active);

CREATE INDEX CONCURRENTLY idx_template_attachments_feedback 
ON feedback_template_attachments(feedback_response_id);

CREATE INDEX CONCURRENTLY idx_template_analytics_template_action 
ON feedback_template_analytics(template_document_id, action);
```

## Backup & Recovery

### 1. Database Backup

Include template tables in backup strategy:

```bash
#!/bin/bash
# Backup script for template tables

pg_dump -h localhost -U feedbackflow_app -d feedbackflow_db \
  --table=feedback_template_documents \
  --table=feedback_template_attachments \
  --table=feedback_template_analytics \
  --format=custom \
  --file=templates_backup_$(date +%Y%m%d_%H%M%S).dump
```

### 2. File Storage Backup

#### Local Storage Backup

```bash
#!/bin/bash
# Backup local file storage

tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz uploads/
aws s3 cp uploads_backup_*.tar.gz s3://your-backup-bucket/templates/
```

#### Cloud Storage Backup

```bash
# AWS S3 cross-region replication
aws s3api put-bucket-replication \
  --bucket your-feedbackflow-templates \
  --replication-configuration file://replication-config.json
```

### 3. Recovery Procedures

Document recovery procedures:

```bash
# Restore database tables
pg_restore -h localhost -U feedbackflow_app -d feedbackflow_db \
  --table=feedback_template_documents \
  --table=feedback_template_attachments \
  --table=feedback_template_analytics \
  templates_backup_20240115_120000.dump

# Restore file storage
tar -xzf uploads_backup_20240115_120000.tar.gz
```

## Testing

### 1. Unit Tests

Run unit tests for template functionality:

```bash
# Run template unit tests
npm test -- --testPathPattern=templates

# Run with coverage
npm test -- --coverage --testPathPattern=templates
```

### 2. Integration Tests

Test template API endpoints:

```bash
# Run integration tests
npm run test:integration -- --testPathPattern=templates
```

### 3. Load Testing

Test file upload performance:

```bash
# Using Artillery for load testing
artillery run --config load-test-config.yml template-upload-test.yml
```

## Troubleshooting

### Common Issues

#### 1. File Upload Failures

**Problem:** Files fail to upload with 413 error
**Solution:** Check file size limits and storage space

```bash
# Check available disk space
df -h /uploads

# Check file size limits
grep -r "maxFileSize" .env
```

#### 2. Database Connection Issues

**Problem:** Template operations fail with database errors
**Solution:** Verify database connectivity and permissions

```sql
-- Test database connection
SELECT 1;

-- Check table permissions
SELECT has_table_privilege('feedbackflow_app', 'feedback_template_documents', 'INSERT');
```

#### 3. Storage Provider Issues

**Problem:** Cloud storage operations fail
**Solution:** Verify credentials and bucket configuration

```bash
# Test AWS S3 access
aws s3 ls s3://your-feedbackflow-templates/

# Test Azure Blob access
az storage blob list --container-name templates --account-name your-storage-account
```

### Debug Mode

Enable debug logging:

```env
DEBUG=feedbackflow:templates:*
LOG_LEVEL=debug
```

### Performance Issues

Monitor performance metrics:

```bash
# Check database performance
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%template%' 
ORDER BY mean_time DESC;

# Check file system performance
iostat -x 1
```

## Maintenance

### 1. Regular Cleanup

Set up automated cleanup tasks:

```bash
#!/bin/bash
# Cleanup old analytics data
psql -h localhost -U feedbackflow_app -d feedbackflow_db -c "
DELETE FROM feedback_template_analytics 
WHERE created_at < NOW() - INTERVAL '90 days';
"

# Cleanup orphaned files
find uploads/ -type f -mtime +365 -delete
```

### 2. Storage Monitoring

Monitor storage usage:

```bash
# Check storage usage
du -sh uploads/
aws s3 ls s3://your-feedbackflow-templates/ --recursive --human-readable --summarize
```

### 3. Security Updates

Keep dependencies updated:

```bash
# Check for security vulnerabilities
npm audit

# Update dependencies
npm update
```

## Support

For deployment support:

- **Documentation:** https://docs.feedbackflow.com/templates/deployment
- **Support Email:** deployment-support@feedbackflow.com
- **Emergency Hotline:** +1-800-FEEDBACK
- **Status Page:** https://status.feedbackflow.com

## Changelog

### Version 1.0.0
- Initial release of template management system
- Support for Word and PDF templates
- Basic analytics and reporting
- Local and cloud storage support

### Version 1.1.0 (Planned)
- Enhanced virus scanning
- Advanced permission controls
- Template versioning
- Bulk operations




