import { Router } from 'express';
import { TemplateAttachmentController } from '../controllers/TemplateAttachmentController.js';
import { authenticateToken } from '../../../shared/middleware/auth.middleware.js';
import { rateLimit } from '../../../shared/middleware/rate-limit.middleware.js';
import { createFileValidationMiddleware } from '../../../shared/utils/file-validator.js';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_ATTACHMENT_SIZE_MB || '10') * 1024 * 1024, // Convert MB to bytes
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
  maxSizeMB: parseInt(process.env.MAX_ATTACHMENT_SIZE_MB || '10'),
  required: true,
});

// Rate limiting for upload operations
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 uploads per windowMs
  message: 'Too many attachment uploads, please try again later.',
});

// Feedback-specific attachment routes
// Upload attachment to feedback response
router.post(
  '/feedback/:feedbackId/attachments',
  uploadRateLimit,
  upload.single('file'),
  fileValidationMiddleware,
  TemplateAttachmentController.uploadAttachment
);

// List attachments for feedback response
router.get('/feedback/:feedbackId/attachments', TemplateAttachmentController.listAttachments);

// Get attachment details
router.get('/feedback/:feedbackId/attachments/:id', TemplateAttachmentController.getAttachmentById);

// Delete attachment
router.delete('/feedback/:feedbackId/attachments/:id', TemplateAttachmentController.deleteAttachment);

// Download attachment file
router.get('/feedback/:feedbackId/attachments/:id/download', TemplateAttachmentController.downloadAttachment);

// Get attachment statistics for feedback response
router.get('/feedback/:feedbackId/attachments/stats', TemplateAttachmentController.getAttachmentStats);

// Template-specific attachment routes
// Get attachments by template document
router.get('/templates/:templateId/attachments', TemplateAttachmentController.getAttachmentsByTemplate);

// Get template attachment statistics
router.get('/templates/:templateId/attachments/stats', TemplateAttachmentController.getTemplateAttachmentStats);

// General attachment routes
// List all attachments with filters
router.get('/attachments', TemplateAttachmentController.listAllAttachments);

// Get user attachment statistics
router.get('/attachments/stats', TemplateAttachmentController.getUserAttachmentStats);

export { router as attachmentRoutes };
