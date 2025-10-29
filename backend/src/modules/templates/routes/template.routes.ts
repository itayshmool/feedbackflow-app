import { Router } from 'express';
import { TemplateDocumentController } from '../controllers/TemplateDocumentController.js';
import { TemplateSettingsController } from '../controllers/TemplateSettingsController.js';
import { authenticateToken } from '../../../shared/middleware/auth.middleware.js';
import { requireRole } from '../../../shared/middleware/rbac.middleware.js';
import { rateLimit } from '../../../shared/middleware/rate-limit.middleware.js';
import { createFileValidationMiddleware } from '../../../shared/utils/file-validator.js';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_TEMPLATE_SIZE_MB || '10') * 1024 * 1024, // Convert MB to bytes
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/pdf', // .pdf
      'application/msword', // .doc
    ];
    const allowedExtensions = ['.docx', '.pdf', '.doc'];
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Word (.docx, .doc) and PDF files are allowed.'));
    }
  },
});

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// File validation middleware
const fileValidationMiddleware = createFileValidationMiddleware({
  allowedTypes: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
    'application/msword',
  ],
  allowedExtensions: ['.docx', '.pdf', '.doc'],
  maxSizeMB: parseInt(process.env.MAX_TEMPLATE_SIZE_MB || '10'),
  required: true,
});

// Rate limiting for upload operations
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 uploads per windowMs
  message: 'Too many template uploads, please try again later.',
});

// Admin/Manager only routes
const adminRoutes = Router();
adminRoutes.use(requireRole(['admin', 'manager']));

// Upload new template (Admin/Manager only)
adminRoutes.post(
  '/',
  uploadRateLimit,
  upload.single('file'),
  fileValidationMiddleware,
  TemplateDocumentController.uploadTemplate
);

// Update template metadata (Admin/Manager only)
adminRoutes.put('/:id', TemplateDocumentController.updateTemplate);

// Delete template (Admin/Manager only)
adminRoutes.delete('/:id', TemplateDocumentController.deleteTemplate);

// Duplicate template (Admin/Manager only)
adminRoutes.post('/:id/duplicate', TemplateDocumentController.duplicateTemplate);

// Replace template file (Admin/Manager only)
adminRoutes.put(
  '/:id/file',
  uploadRateLimit,
  upload.single('file'),
  fileValidationMiddleware,
  TemplateDocumentController.replaceTemplateFile
);

// Archive template (Admin/Manager only)
adminRoutes.post('/:id/archive', TemplateDocumentController.archiveTemplate);

// Public routes (all authenticated users)

// List templates (filterable)
router.get('/', TemplateDocumentController.listTemplates);

// Get template details
router.get('/:id', TemplateDocumentController.getTemplateById);

// Download template file
router.get('/:id/download', TemplateDocumentController.downloadTemplate);

// Get template usage statistics
router.get('/:id/analytics', TemplateDocumentController.getTemplateStats);

// Get template trends
router.get('/:id/trends', TemplateDocumentController.getTemplateTrends);

// Get template download history
router.get('/:id/downloads', TemplateDocumentController.getDownloadHistory);

// Mount admin routes
router.use('/', adminRoutes);

// Overall analytics (Admin/Manager only)
adminRoutes.get('/analytics', TemplateDocumentController.getOverallAnalytics);

// Generate usage reports (Admin/Manager only)
adminRoutes.get('/reports', TemplateDocumentController.generateUsageReport);

// Settings routes
// Get global settings (Admin only)
adminRoutes.get('/settings', TemplateSettingsController.getGlobalSettings);

// Update global settings (Admin only)
adminRoutes.put('/settings', TemplateSettingsController.updateGlobalSettings);

// Reset settings to defaults (Admin only)
adminRoutes.post('/settings/reset', TemplateSettingsController.resetSettings);

// Get storage configuration (Admin only)
adminRoutes.get('/settings/storage', TemplateSettingsController.getStorageConfig);

// Public settings routes
// Get organization settings
router.get('/settings/organization', TemplateSettingsController.getOrganizationSettings);

// Update organization settings (Admin/Manager only)
adminRoutes.put('/settings/organization', TemplateSettingsController.updateOrganizationSettings);

// Get file validation rules
router.get('/settings/validation', TemplateSettingsController.getValidationRules);

// Check upload permissions
router.get('/settings/permissions', TemplateSettingsController.checkUploadPermissions);

// Get settings summary
router.get('/settings/summary', TemplateSettingsController.getSettingsSummary);

// Get notification settings
router.get('/settings/notifications', TemplateSettingsController.getNotificationSettings);

// Get retention policy
router.get('/settings/retention', TemplateSettingsController.getRetentionPolicy);

// Get security settings
router.get('/settings/security', TemplateSettingsController.getSecuritySettings);

export { router as templateRoutes };
