import { z } from 'zod';

// Template document validation schemas
export const createTemplateDocumentSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  description: z.string().max(1000).optional(),
  templateType: z.enum(['manager', 'peer', 'self', 'project', '360']),
  tags: z.array(z.string().max(50)).max(10).optional(),
  permissions: z.object({
    roles: z.array(z.string()).min(1),
    departments: z.array(z.string()).optional(),
    cycles: z.array(z.string()).optional(),
  }).optional(),
  availabilityRules: z.object({
    restrictToCycles: z.boolean(),
    restrictToDepartments: z.boolean(),
    restrictToRoles: z.boolean(),
  }).optional(),
  isDefault: z.boolean().optional(),
});

export const updateTemplateDocumentSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(1000).optional(),
  templateType: z.enum(['manager', 'peer', 'self', 'project', '360']).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  permissions: z.object({
    roles: z.array(z.string()).min(1),
    departments: z.array(z.string()).optional(),
    cycles: z.array(z.string()).optional(),
  }).optional(),
  availabilityRules: z.object({
    restrictToCycles: z.boolean(),
    restrictToDepartments: z.boolean(),
    restrictToRoles: z.boolean(),
  }).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const templateFiltersSchema = z.object({
  templateType: z.enum(['manager', 'peer', 'self', 'project', '360']).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  fileFormat: z.enum(['.docx', '.pdf', '.doc']).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().min(1).max(1000).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'downloadCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const duplicateTemplateSchema = z.object({
  newName: z.string().min(1).max(255).trim(),
});

export const templatePermissionsSchema = z.object({
  roles: z.array(z.string()).min(1),
  departments: z.array(z.string()).optional(),
  cycles: z.array(z.string()).optional(),
});

// Template attachment validation schemas
export const createAttachmentSchema = z.object({
  templateDocumentId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
});

export const attachmentFiltersSchema = z.object({
  templateDocumentId: z.string().uuid().optional(),
  uploadedBy: z.string().uuid().optional(),
  virusScanStatus: z.enum(['pending', 'clean', 'infected', 'failed']).optional(),
  page: z.number().int().min(1).max(1000).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sortBy: z.enum(['fileName', 'uploadedAt', 'fileSize']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Template analytics validation schemas
export const analyticsFiltersSchema = z.object({
  templateDocumentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  action: z.enum(['download', 'view', 'attach']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  page: z.number().int().min(1).max(1000).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Template settings validation schemas
export const templateSettingsSchema = z.object({
  maxFileSizeMB: z.number().int().min(1).max(100).optional(),
  allowedFileFormats: z.array(z.enum(['.docx', '.pdf', '.doc'])).min(1).optional(),
  virusScanningEnabled: z.boolean().optional(),
  storageProvider: z.enum(['local', 's3', 'azure', 'gcs']).optional(),
  autoDeleteAfterDays: z.number().int().min(1).max(365).optional(),
  maxTemplatesPerOrganization: z.number().int().min(1).max(1000).optional(),
  allowPublicTemplates: z.boolean().optional(),
  requireApprovalForTemplates: z.boolean().optional(),
});

// File upload validation schemas
export const fileUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().min(1),
  mimeType: z.string().min(1).max(100),
  fileFormat: z.enum(['.docx', '.pdf', '.doc']),
});

// Template search validation schemas
export const templateSearchSchema = z.object({
  query: z.string().min(1).max(100).trim(),
  templateType: z.enum(['manager', 'peer', 'self', 'project', '360']).optional(),
  fileFormat: z.enum(['.docx', '.pdf', '.doc']).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).max(1000).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Template bulk operations validation schemas
export const bulkTemplateOperationSchema = z.object({
  templateIds: z.array(z.string().uuid()).min(1).max(100),
  operation: z.enum(['activate', 'deactivate', 'archive', 'delete']),
  reason: z.string().max(500).optional(),
});

// Template import/export validation schemas
export const templateImportSchema = z.object({
  source: z.enum(['file', 'url', 'template_library']),
  filePath: z.string().optional(),
  url: z.string().url().optional(),
  templateLibraryId: z.string().optional(),
  overwriteExisting: z.boolean().optional(),
});

export const templateExportSchema = z.object({
  templateIds: z.array(z.string().uuid()).optional(),
  format: z.enum(['json', 'csv', 'zip']),
  includeFiles: z.boolean().optional(),
  includeAnalytics: z.boolean().optional(),
});

// Template versioning validation schemas
export const templateVersionSchema = z.object({
  version: z.number().int().min(1),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const templateVersionFiltersSchema = z.object({
  templateId: z.string().uuid(),
  version: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).max(1000).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Template collaboration validation schemas
export const templateCollaborationSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(50),
  permissions: z.enum(['view', 'edit', 'admin']),
  expiresAt: z.string().datetime().optional(),
});

export const templateCommentSchema = z.object({
  content: z.string().min(1).max(1000).trim(),
  isInternal: z.boolean().optional(),
});

// Template approval workflow validation schemas
export const templateApprovalSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_changes']),
  comment: z.string().max(500).optional(),
  changesRequired: z.array(z.string()).optional(),
});

export const templateApprovalFiltersSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'changes_requested']).optional(),
  approverId: z.string().uuid().optional(),
  submittedBy: z.string().uuid().optional(),
  page: z.number().int().min(1).max(1000).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Template notification validation schemas
export const templateNotificationSchema = z.object({
  type: z.enum(['upload', 'download', 'approval', 'comment', 'expiry']),
  templateId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).optional(),
  message: z.string().max(500).optional(),
  scheduledAt: z.string().datetime().optional(),
});

// Template usage analytics validation schemas
export const templateUsageAnalyticsSchema = z.object({
  templateId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  groupBy: z.enum(['day', 'week', 'month', 'user', 'department']).optional(),
  includeDetails: z.boolean().optional(),
});

// Template recommendation validation schemas
export const templateRecommendationSchema = z.object({
  userId: z.string().uuid(),
  context: z.enum(['feedback_type', 'department', 'role', 'recent_activity']).optional(),
  limit: z.number().int().min(1).max(20).optional(),
  excludeUsed: z.boolean().optional(),
});

// Template quality validation schemas
export const templateQualitySchema = z.object({
  templateId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(1000).optional(),
  categories: z.array(z.string()).optional(),
});

export const templateQualityFiltersSchema = z.object({
  minRating: z.number().min(1).max(5).optional(),
  maxRating: z.number().min(1).max(5).optional(),
  hasFeedback: z.boolean().optional(),
  categories: z.array(z.string()).optional(),
  page: z.number().int().min(1).max(1000).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
