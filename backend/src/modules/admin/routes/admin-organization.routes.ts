import { Router } from 'express';
import { AdminOrganizationController } from '../controllers/admin-organization.controller';
import { validateRequest } from '../../../shared/middleware/validation.middleware';
import { authenticateToken } from '../../../shared/middleware/auth.middleware';
import { requireRole, requireOrgScopedAdmin, requireOrgAccess } from '../../../shared/middleware/rbac.middleware';
import { rateLimit } from '../../../shared/middleware/rate-limit.middleware';
import { z } from 'zod';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/json', 'application/vnd.ms-excel'];
    const allowedExtensions = ['.csv', '.json'];
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and JSON files are allowed.'));
    }
  },
});

// Validation schemas
const createOrganizationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Organization name is required').max(100, 'Name too long'),
    slug: z.string().min(1, 'Slug is required').max(50, 'Slug too long').regex(/^[a-z0-9_-]+$/, 'Invalid slug format'),
    description: z.string().max(500, 'Description too long').optional(),
    contactEmail: z.string().email('Invalid email format'),
    phone: z.string().max(20, 'Phone too long').optional(),
    address: z.string().max(200, 'Address too long').optional(),
    city: z.string().max(50, 'City name too long').optional(),
    state: z.string().max(50, 'State name too long').optional(),
    zipCode: z.string().max(10, 'Zip code too long').optional(),
    country: z.string().max(50, 'Country name too long').optional(),
    website: z.string().url('Invalid website URL').optional(),
    logoUrl: z.string().url('Invalid logo URL').optional(),
    subscriptionPlan: z.enum(['free', 'basic', 'professional', 'enterprise']),
    maxUsers: z.number().int().min(1, 'Max users must be at least 1'),
    maxCycles: z.number().int().min(1, 'Max cycles must be at least 1'),
    storageLimitGb: z.number().int().min(1, 'Storage limit must be at least 1GB'),
    featureFlags: z.record(z.string(), z.boolean()).optional(),
    settings: z.object({
      timezone: z.string().optional(),
      language: z.string().optional(),
      dateFormat: z.string().optional(),
      currency: z.string().optional(),
      workingDays: z.array(z.number().int().min(0).max(6)).optional(),
      workingHours: z.object({
        start: z.string().optional(),
        end: z.string().optional(),
      }).optional(),
      feedbackSettings: z.object({
        allowAnonymous: z.boolean().optional(),
        requireManagerApproval: z.boolean().optional(),
        autoCloseCycles: z.boolean().optional(),
        reminderFrequency: z.number().int().min(1).optional(),
      }).optional(),
      notificationSettings: z.object({
        emailNotifications: z.boolean().optional(),
        inAppNotifications: z.boolean().optional(),
        smsNotifications: z.boolean().optional(),
        pushNotifications: z.boolean().optional(),
      }).optional(),
      securitySettings: z.object({
        requireMFA: z.boolean().optional(),
        sessionTimeout: z.number().int().min(1).optional(),
        passwordPolicy: z.object({
          minLength: z.number().int().min(1).optional(),
          requireUppercase: z.boolean().optional(),
          requireLowercase: z.boolean().optional(),
          requireNumbers: z.boolean().optional(),
          requireSpecialChars: z.boolean().optional(),
        }).optional(),
      }).optional(),
    }).optional(),
  }),
});

const updateOrganizationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid organization ID'),
  }),
  body: z.object({
    name: z.string().min(1, 'Organization name is required').max(100, 'Name too long').optional(),
    slug: z.string().min(1, 'Slug is required').max(50, 'Slug too long').regex(/^[a-z0-9_-]+$/, 'Invalid slug format').optional(),
    description: z.string().max(500, 'Description too long').optional(),
    contactEmail: z.string().email('Invalid email format').optional(),
    phone: z.string().max(20, 'Phone too long').optional(),
    address: z.string().max(200, 'Address too long').optional(),
    city: z.string().max(50, 'City name too long').optional(),
    state: z.string().max(50, 'State name too long').optional(),
    zipCode: z.string().max(10, 'Zip code too long').optional(),
    country: z.string().max(50, 'Country name too long').optional(),
    website: z.string().url('Invalid website URL').optional(),
    logoUrl: z.string().url('Invalid logo URL').optional(),
    isActive: z.boolean().optional(),
    status: z.enum(['active', 'inactive', 'suspended', 'pending']).optional(),
    subscriptionPlan: z.enum(['free', 'basic', 'professional', 'enterprise']).optional(),
    maxUsers: z.number().int().min(1, 'Max users must be at least 1').optional(),
    maxCycles: z.number().int().min(1, 'Max cycles must be at least 1').optional(),
    storageLimitGb: z.number().int().min(1, 'Storage limit must be at least 1GB').optional(),
    featureFlags: z.record(z.string(), z.boolean()).optional(),
    settings: z.object({
      timezone: z.string().optional(),
      language: z.string().optional(),
      dateFormat: z.string().optional(),
      currency: z.string().optional(),
      workingDays: z.array(z.number().int().min(0).max(6)).optional(),
      workingHours: z.object({
        start: z.string().optional(),
        end: z.string().optional(),
      }).optional(),
      feedbackSettings: z.object({
        allowAnonymous: z.boolean().optional(),
        requireManagerApproval: z.boolean().optional(),
        autoCloseCycles: z.boolean().optional(),
        reminderFrequency: z.number().int().min(1).optional(),
      }).optional(),
      notificationSettings: z.object({
        emailNotifications: z.boolean().optional(),
        inAppNotifications: z.boolean().optional(),
        smsNotifications: z.boolean().optional(),
        pushNotifications: z.boolean().optional(),
      }).optional(),
      securitySettings: z.object({
        requireMFA: z.boolean().optional(),
        sessionTimeout: z.number().int().min(1).optional(),
        passwordPolicy: z.object({
          minLength: z.number().int().min(1).optional(),
          requireUppercase: z.boolean().optional(),
          requireLowercase: z.boolean().optional(),
          requireNumbers: z.boolean().optional(),
          requireSpecialChars: z.boolean().optional(),
        }).optional(),
      }).optional(),
    }).optional(),
  }),
});

const createDepartmentSchema = z.object({
  params: z.object({
    organizationId: z.string().uuid('Invalid organization ID'),
  }),
  body: z.object({
    name: z.string().min(1, 'Department name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    type: z.enum(['executive', 'operations', 'sales', 'marketing', 'engineering', 'hr', 'finance', 'custom']),
    parentDepartmentId: z.string().uuid('Invalid parent department ID').optional(),
    managerId: z.string().uuid('Invalid manager ID').optional(),
    budget: z.number().min(0, 'Budget must be non-negative').optional(),
    settings: z.object({
      allowCrossDepartmentFeedback: z.boolean().optional(),
      requireManagerApproval: z.boolean().optional(),
      customFeedbackTemplates: z.array(z.string()).optional(),
      notificationPreferences: z.object({
        email: z.boolean().optional(),
        inApp: z.boolean().optional(),
        sms: z.boolean().optional(),
      }).optional(),
    }).optional(),
  }),
});

const createTeamSchema = z.object({
  params: z.object({
    organizationId: z.string().uuid('Invalid organization ID'),
  }),
  body: z.object({
    name: z.string().min(1, 'Team name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    type: z.enum(['core', 'project', 'cross_functional', 'temporary', 'custom']),
    departmentId: z.string().uuid('Invalid department ID').optional(),
    teamLeadId: z.string().uuid('Invalid team lead ID').optional(),
    settings: z.object({
      allowPeerFeedback: z.boolean().optional(),
      requireTeamLeadApproval: z.boolean().optional(),
      customWorkflows: z.array(z.string()).optional(),
      collaborationTools: z.array(z.string()).optional(),
    }).optional(),
  }),
});

const bulkImportSchema = z.object({
  body: z.object({
    type: z.enum(['organizations', 'departments', 'teams', 'users']),
    data: z.array(z.any()).min(1, 'Data array cannot be empty'),
    options: z.object({
      updateExisting: z.boolean().optional(),
      skipValidation: z.boolean().optional(),
      dryRun: z.boolean().optional(),
    }),
  }),
});

const bulkExportSchema = z.object({
  body: z.object({
    type: z.enum(['organizations', 'departments', 'teams', 'users']),
    format: z.enum(['csv', 'excel', 'json']),
    filters: z.object({
      organizationId: z.string().uuid('Invalid organization ID').optional(),
      departmentId: z.string().uuid('Invalid department ID').optional(),
      teamId: z.string().uuid('Invalid team ID').optional(),
      isActive: z.boolean().optional(),
      dateRange: z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      }).optional(),
    }).optional(),
  }),
});

const organizationIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid organization ID'),
  }),
});

const organizationSlugSchema = z.object({
  params: z.object({
    slug: z.string().min(1, 'Slug is required'),
  }),
});

const departmentIdSchema = z.object({
  params: z.object({
    organizationId: z.string().uuid('Invalid organization ID'),
    departmentId: z.string().uuid('Invalid department ID'),
  }),
});

const teamIdSchema = z.object({
  params: z.object({
    organizationId: z.string().uuid('Invalid organization ID'),
    teamId: z.string().uuid('Invalid team ID'),
  }),
});

const searchSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search term is required'),
    isActive: z.string().optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    offset: z.string().regex(/^\d+$/).optional(),
  }),
});

const slugAvailabilitySchema = z.object({
  query: z.object({
    slug: z.string().min(1, 'Slug is required'),
    excludeId: z.string().uuid('Invalid exclude ID').optional(),
  }),
});

export function createAdminOrganizationRoutes(controller: AdminOrganizationController): Router {
  const router = Router();

  // Apply authentication middleware to all routes
  router.use(authenticateToken);

  // Organization Management Routes
  // Note: Different routes have different access levels:
  // - Create/Delete organizations: super_admin only
  // - List/View organizations: org-scoped (admin sees their org, super_admin sees all)
  // - Update organization: org-scoped (admin can update their org, super_admin can update any)

  // CREATE - Super admin only (can create any organization)
  router.post(
    '/organizations',
    requireRole(['super_admin']),
    rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), // 10 requests per 15 minutes
    validateRequest(createOrganizationSchema),
    controller.createOrganization
  );

  // LIST - Org-scoped (admin sees their org only, super_admin sees all)
  router.get(
    '/organizations',
    requireOrgScopedAdmin(),
    rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), // 100 requests per 15 minutes
    controller.getOrganizations
  );

  // SEARCH - Super admin only (search across all organizations)
  router.get(
    '/organizations/search',
    requireRole(['super_admin']),
    rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }), // 50 requests per 15 minutes
    validateRequest(searchSchema),
    controller.searchOrganizations
  );

  // STATS - Super admin only (aggregate stats across organizations)
  router.get(
    '/organizations/stats',
    requireRole(['super_admin']),
    rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), // 20 requests per 15 minutes
    controller.getOrganizationStats
  );

  // GET BY SLUG - Org-scoped (admin can only access their org's slug)
  router.get(
    '/organizations/slug/:slug',
    requireOrgScopedAdmin(),
    rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), // 100 requests per 15 minutes
    validateRequest(organizationSlugSchema),
    controller.getOrganizationBySlug
  );

  // GET BY ID - Org-scoped (admin can only access their org)
  router.get(
    '/organizations/:id',
    requireOrgScopedAdmin(),
    rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), // 100 requests per 15 minutes
    validateRequest(organizationIdSchema),
    controller.getOrganizationById
  );

  // UPDATE - Org-scoped (admin can only update their org)
  router.put(
    '/organizations/:id',
    requireOrgScopedAdmin(),
    rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), // 20 requests per 15 minutes
    validateRequest(updateOrganizationSchema),
    controller.updateOrganization
  );

  // DELETE - Super admin only (can delete any organization)
  router.delete(
    '/organizations/:id',
    requireRole(['super_admin']),
    rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), // 5 requests per 15 minutes
    validateRequest(organizationIdSchema),
    controller.deleteOrganization
  );

  // Department Management Routes
  router.post(
    '/organizations/:organizationId/departments',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), // 20 requests per 15 minutes
    validateRequest(createDepartmentSchema),
    controller.createDepartment
  );

  router.get(
    '/organizations/:organizationId/departments',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), // 100 requests per 15 minutes
    controller.getDepartments
  );

  router.get(
    '/organizations/:organizationId/departments/stats',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), // 20 requests per 15 minutes
    controller.getDepartmentStats
  );

  router.get(
    '/organizations/:organizationId/departments/hierarchy',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }), // 50 requests per 15 minutes
    controller.getDepartmentHierarchy
  );

  router.get(
    '/organizations/:organizationId/departments/:departmentId',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), // 100 requests per 15 minutes
    validateRequest(departmentIdSchema),
    controller.getDepartmentById
  );

  router.put(
    '/organizations/:organizationId/departments/:departmentId',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), // 20 requests per 15 minutes
    validateRequest(departmentIdSchema),
    controller.updateDepartment
  );

  router.delete(
    '/organizations/:organizationId/departments/:departmentId',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), // 5 requests per 15 minutes
    validateRequest(departmentIdSchema),
    controller.deleteDepartment
  );

  // Team Management Routes
  router.post(
    '/organizations/:organizationId/teams',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), // 20 requests per 15 minutes
    validateRequest(createTeamSchema),
    controller.createTeam
  );

  router.get(
    '/organizations/:organizationId/teams',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), // 100 requests per 15 minutes
    controller.getTeams
  );

  router.get(
    '/organizations/:organizationId/teams/stats',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), // 20 requests per 15 minutes
    controller.getTeamStats
  );

  router.get(
    '/organizations/:organizationId/departments/:departmentId/teams',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), // 100 requests per 15 minutes
    controller.getTeamsByDepartment
  );

  router.get(
    '/organizations/:organizationId/teams/:teamId',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), // 100 requests per 15 minutes
    validateRequest(teamIdSchema),
    controller.getTeamById
  );

  router.put(
    '/organizations/:organizationId/teams/:teamId',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), // 20 requests per 15 minutes
    validateRequest(teamIdSchema),
    controller.updateTeam
  );

  router.delete(
    '/organizations/:organizationId/teams/:teamId',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), // 5 requests per 15 minutes
    validateRequest(teamIdSchema),
    controller.deleteTeam
  );

  // Bulk Operations Routes
  router.post(
    '/bulk/import',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), // 5 requests per 15 minutes
    validateRequest(bulkImportSchema),
    controller.bulkImport
  );

  router.post(
    '/bulk/export',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), // 10 requests per 15 minutes
    validateRequest(bulkExportSchema),
    controller.bulkExport
  );

  router.post(
    '/bulk/upload',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), // 5 uploads per 15 minutes
    upload.single('file'),
    controller.uploadBulkImport
  );

  router.get(
    '/bulk/template',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), // 20 downloads per 15 minutes
    controller.downloadTemplate
  );

  // Organization Chart Routes
  router.get(
    '/organizations/:organizationId/chart',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), // 20 requests per 15 minutes
    controller.generateOrganizationChart
  );

  // Utility Routes
  router.get(
    '/organizations/check-slug',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }), // 50 requests per 15 minutes
    validateRequest(slugAvailabilitySchema),
    controller.checkSlugAvailability
  );

  return router;
}
