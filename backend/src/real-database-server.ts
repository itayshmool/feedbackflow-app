// @ts-nocheck
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { query, testConnection, pool } from './config/real-database.js';
import { DatabaseOrganizationService } from './services/DatabaseOrganizationService.js';
import { AdminUserService } from './modules/admin/services/admin-user.service.js';
import { createAdminUserRoutes } from './modules/admin/routes/admin-user.routes.js';
import { DepartmentModelClass } from './modules/admin/models/department.model.js';
import { TeamModelClass } from './modules/admin/models/team.model.js';
import { CSVParser } from './shared/utils/csv-parser.js';
import { authenticateToken } from './shared/middleware/auth.middleware.js';
import { getCookieOptions } from './shared/utils/cookie-helper.js';
import dbConfig from './config/real-database.js';
import { generateAIContent, parseAIJsonResponse, getAIConfig } from './services/ai-provider.service.js';

// Transform database data to frontend format
const transformOrganizationForFrontend = (dbOrg: any) => ({
  id: dbOrg.id,
  name: dbOrg.name,
  slug: dbOrg.slug,
  description: dbOrg.description,
  contactEmail: dbOrg.contact_email,
  phone: dbOrg.phone,
  address: dbOrg.address,
  city: dbOrg.city,
  state: dbOrg.state,
  zipCode: dbOrg.zip_code,
  country: dbOrg.country,
  website: dbOrg.website,
  logoUrl: dbOrg.logo_url,
  isActive: dbOrg.is_active,
  status: dbOrg.status,
  subscriptionPlan: dbOrg.subscription_plan,
  planStartDate: dbOrg.plan_start_date,
  planEndDate: dbOrg.plan_end_date,
  maxUsers: dbOrg.max_users,
  maxCycles: dbOrg.max_cycles,
  storageLimitGb: dbOrg.storage_limit_gb,
  featureFlags: dbOrg.feature_flags,
  settings: dbOrg.settings,
  createdAt: dbOrg.created_at,
  updatedAt: dbOrg.updated_at
});

// Helper function to create notifications for feedback events
async function createFeedbackNotification(
  userId: string,
  organizationId: string | null,
  title: string,
  message: string,
  data: Record<string, any>
): Promise<void> {
  try {
    const insertQuery = `
      INSERT INTO user_notifications (
        user_id, organization_id, type, category, title, message, data, priority, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING id
    `;
    const result = await query(insertQuery, [
      userId,
      organizationId,
      'in_app',
      'feedback',
      title,
      message,
      JSON.stringify(data),
      'normal'
    ]);
    console.log('📬 Notification created:', { notificationId: result.rows[0]?.id, userId, title });
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    // Don't throw - notification failure shouldn't break the main operation
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3006',
      'http://localhost:3000',
      'http://localhost:5173',
      process.env.FRONTEND_URL,
    ].filter(Boolean) as string[];
    
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Enable cookies to be sent cross-origin
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition']
}));
app.use(express.json());
app.use(cookieParser());

// Test database connection on startup
testConnection().then((connected) => {
  if (connected) {
    console.log('✅ Real PostgreSQL database connected successfully');
  } else {
    console.error('❌ Failed to connect to PostgreSQL database');
    process.exit(1);
  }
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL (Real)'
  });
});

app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL (Real)',
    version: '1.0.0'
  });
});

// Configure multer for template file uploads - use memory storage to store in database
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory, then save to database
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'), false);
    }
  }
});

// CSV upload configuration for bulk imports
const csvUpload = multer({
  storage: multer.memoryStorage(), // Store in memory for CSV parsing
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for CSV
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'text/plain', // CSV files sometimes detected as text/plain
      'application/octet-stream' // Generic binary
    ];
    const isCsvExtension = file.originalname.toLowerCase().endsWith('.csv');
    if (allowedTypes.includes(file.mimetype) || isCsvExtension) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed for bulk import'), false);
    }
  }
});

// Avatar upload configuration for profile images
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for avatar images
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
    }
  }
});

// Templates API endpoints
app.get('/api/v1/templates', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id,
        name,
        description,
        template_type,
        file_name,
        file_size,
        file_mime_type,
        file_format,
        download_count,
        is_active,
        is_default,
        tags,
        created_at,
        updated_at
      FROM templates 
      WHERE is_active = true
      ORDER BY created_at DESC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

app.post('/api/v1/templates', authenticateToken, (req, res, next) => {
  // Wrap multer with error handling
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ success: false, error: err.message || 'File upload error' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { name, description, templateType, isDefault, tags } = req.body;
    const authUser = (req as any).user;

    console.log('Template upload - authUser:', authUser?.email);

    // Fetch user's id and organizationId from database (JWT may not have organizationId)
    const userResult = await query(
      'SELECT id, organization_id FROM users WHERE email = $1',
      [authUser.email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'User not found in database' });
    }
    
    const dbUser = userResult.rows[0];

    // Parse tags if provided as JSON string
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        parsedTags = [];
      }
    }

    // Determine file format from extension
    const fileFormat = path.extname(file.originalname).toLowerCase();
    
    // Store file content as base64 in database (for persistence on Render)
    const fileContentBase64 = file.buffer.toString('base64');

    // Insert template into database with file content
    const result = await query(`
      INSERT INTO templates (
        name, description, template_type, file_name, file_path, 
        file_size, file_mime_type, file_format, is_default, 
        tags, created_by, organization_id, file_content
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      name,
      description || '',
      templateType || 'peer',
      file.originalname,
      '', // file_path no longer used, content stored in database
      file.size,
      file.mimetype,
      fileFormat,
      isDefault === 'true' || isDefault === true,
      parsedTags,
      dbUser.id,
      dbUser.organization_id,
      fileContentBase64
    ]);

    const newTemplate = result.rows[0];
    
    res.status(201).json({ success: true, data: newTemplate });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
});

app.delete('/api/v1/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // First, get the template to find the file path
    // For now, allow deletion if user is admin or created the template
    const templateResult = await query(`
      SELECT file_path FROM templates 
      WHERE id = $1
    `, [id]);

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found or access denied' });
    }

    const filePath = templateResult.rows[0].file_path;

    // Delete from database
    await query('DELETE FROM templates WHERE id = $1', [id]);

    // Delete the actual file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.warn('Could not delete file:', fileError);
      // Continue even if file deletion fails
    }

    res.json({ success: true, message: `Template ${id} deleted successfully` });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
});

app.get('/api/v1/templates/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Get template info and content from database
    const result = await query(`
      SELECT file_name, file_mime_type, file_content, download_count
      FROM templates 
      WHERE id = $1 AND is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const { file_name, file_mime_type, file_content } = result.rows[0];

    // Check if file content exists in database
    if (!file_content) {
      return res.status(404).json({ success: false, error: 'File content not found. Template may need to be re-uploaded.' });
    }

    // Increment download count
    await query(`
      UPDATE templates 
      SET download_count = download_count + 1 
      WHERE id = $1
    `, [id]);

    // Decode base64 content
    const fileBuffer = Buffer.from(file_content, 'base64');

    // Set headers for file download
    res.setHeader('Content-Type', file_mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file_name}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    
    // Send the file buffer
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error downloading template:', error);
    res.status(500).json({ success: false, error: 'Failed to download template' });
  }
});

// Initialize services
const organizationService = new DatabaseOrganizationService();
const departmentModel = new DepartmentModelClass(dbConfig.pool);
const teamModel = new TeamModelClass(dbConfig.pool);

// GET assignable organizations - MUST be registered BEFORE admin user routes
// Returns orgs the current user can grant admin access to
// Super admin: all orgs, Org-scoped admin: only their managed orgs, Others: empty
app.get('/api/v1/admin/assignable-organizations', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const userRoles = user?.roles || [];
    const isSuperAdmin = userRoles.includes('super_admin');
    const isAdmin = userRoles.includes('admin');
    const adminOrganizations = user?.adminOrganizations || [];
    
    // Non-admin users cannot assign admin roles
    if (!isSuperAdmin && !isAdmin) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    if (isSuperAdmin) {
      // Super admin can assign any organization
      const result = await query(`
        SELECT id, name, slug
        FROM organizations
        WHERE is_active = true
        ORDER BY name ASC
      `);
      
      return res.json({
        success: true,
        data: result.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          slug: row.slug
        }))
      });
    }
    
    // Org-scoped admin can only assign their managed organizations
    return res.json({
      success: true,
      data: adminOrganizations.map((org: any) => ({
        id: org.id,
        name: org.name,
        slug: org.slug
      }))
    });
  } catch (error) {
    console.error('Error fetching assignable organizations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assignable organizations'
    });
  }
});

// Mount admin user routes
app.use('/api/v1/admin', createAdminUserRoutes());

// Organization API routes - specific routes first, then parameterized routes
app.get('/api/v1/admin/organizations', authenticateToken, async (req, res) => {
  try {
    // Check if user is super_admin (can see all orgs) or org-scoped admin (only their org)
    const userRoles = (req as any).user?.roles || [];
    const isSuperAdmin = userRoles.includes('super_admin');
    const adminOrgId = (req as any).user?.adminOrganizationId;
    
    // If org-scoped admin (not super_admin), only return their organization
    if (!isSuperAdmin && adminOrgId) {
      const orgResult = await query(`
        SELECT id, name, slug, description, contact_email, phone, address, city, state, 
               zip_code, country, website, logo_url, is_active, status, subscription_plan,
               max_users, max_cycles, storage_limit_gb, feature_flags, settings,
               created_at, updated_at
        FROM organizations WHERE id = $1
      `, [adminOrgId]);
      
      if (orgResult.rows.length > 0) {
        const org = orgResult.rows[0];
        res.json({
          data: [transformOrganizationForFrontend(org)],
          pagination: { total: 1, limit: 10, offset: 0, hasMore: false }
        });
      } else {
        res.json({
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false }
        });
      }
      return;
    }
    
    // Super admin sees all organizations
    const { page = 1, limit = 10, search = '' } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    
    const result = await organizationService.getOrganizations({
      offset,
      limit: limitNum,
      search: search as string,
      status: req.query.status as string,
      subscription_plan: req.query.subscription_plan as string,
      is_active: req.query.is_active ? req.query.is_active === 'true' : undefined
    });
    
    // Transform data for frontend
    const transformedResult = {
      ...result,
      data: result.data.map(transformOrganizationForFrontend)
    };
    
    res.json(transformedResult);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch organizations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/v1/admin/organizations/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await organizationService.getOrganizationStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching organization stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch organization statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Slug availability check - must come before /:id route
app.get('/api/v1/admin/organizations/check-slug', authenticateToken, async (req, res) => {
  try {
    const slug = req.query.slug;
    if (!slug) {
      return res.status(400).json({
        success: false,
        error: 'Slug parameter is required'
      });
    }
    const isAvailable = await organizationService.checkSlugAvailability(slug as string);
    res.json({
      success: true,
      data: { available: isAvailable }
    });
  } catch (error) {
    console.error('Error checking slug availability:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check slug availability',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test endpoint
app.get('/api/v1/admin/organizations/test', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM organizations');
    res.json({
      success: true,
      message: 'Real database connection working!',
      organizationCount: result.rows[0].count
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/v1/admin/organizations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const organization = await organizationService.getOrganizationById(id);
    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        error: 'Organization not found' 
      });
    }
    res.json({
      success: true,
      data: organization
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch organization',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/v1/admin/organizations', authenticateToken, async (req, res) => {
  try{
    const frontendData = req.body;
    
    // Transform camelCase to snake_case for database
    const organizationData = {
      name: frontendData.name,
      slug: frontendData.slug,
      description: frontendData.description,
      contact_email: frontendData.contactEmail,
      phone: frontendData.phone,
      address: frontendData.address,
      city: frontendData.city,
      state: frontendData.state,
      zip_code: frontendData.zipCode,
      country: frontendData.country,
      website: frontendData.website,
      logo_url: frontendData.logoUrl,
      subscription_plan: frontendData.subscriptionPlan,
      max_users: frontendData.maxUsers,
      max_cycles: frontendData.maxCycles,
      storage_limit_gb: frontendData.storageLimitGb,
      feature_flags: frontendData.featureFlags,
      settings: frontendData.settings
    };
    
    const newOrganization = await organizationService.createOrganization(organizationData);
    res.status(201).json({
      success: true,
      data: transformOrganizationForFrontend(newOrganization)
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create organization',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.put('/api/v1/admin/organizations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedOrganization = await organizationService.updateOrganization(id, updateData);
    if (!updatedOrganization) {
      return res.status(404).json({ 
        success: false, 
        error: 'Organization not found' 
      });
    }
    res.json({
      success: true,
      data: updatedOrganization
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update organization',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.delete('/api/v1/admin/organizations/:id', authenticateToken, async (req, res) => {
  console.log('🗑️  DELETE organization endpoint hit', { id: req.params.id });
  try {
    const { id } = req.params;
    console.log('🗑️  Calling organizationService.deleteOrganization', { id });
    await organizationService.deleteOrganization(id);
    console.log('🗑️  organizationService.deleteOrganization completed successfully', { id });
    res.status(204).send(); // No content for successful delete
  } catch (error) {
    console.error('❌ Error deleting organization:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete organization',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Authentication endpoints
app.post('/api/v1/auth/login/mock', async (req, res) => {
  try {
    // Check if mock login is enabled via environment variable
    // Set ENABLE_MOCK_LOGIN=true in environment to allow mock login
    if (process.env.ENABLE_MOCK_LOGIN !== 'true') {
      return res.status(403).json({
        success: false,
        error: 'Demo login is disabled. Set ENABLE_MOCK_LOGIN=true to enable.'
      });
    }

    // Mock authentication - accept any credentials (development only)
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    // Try to get user from database first
    let user;
    try {
      const userQuery = `
        SELECT 
          u.id,
          u.email,
          u.name,
          u.avatar_url,
          u.is_active,
          u.email_verified,
          u.last_login_at,
          u.created_at,
          u.updated_at,
          u.organization_id,
          u.department,
          u.position,
          o.name as organization_name,
          COALESCE(
            JSON_AGG(r.name) FILTER (WHERE r.name IS NOT NULL),
            '[]'
          ) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
        LEFT JOIN roles r ON ur.role_id = r.id
        LEFT JOIN organizations o ON u.organization_id = o.id
        LEFT JOIN organizations o2 ON ur.organization_id = o2.id
        WHERE u.email = $1
        GROUP BY u.id, u.email, u.name, u.avatar_url, u.is_active, u.email_verified, 
                 u.last_login_at, u.created_at, u.updated_at, u.organization_id, u.department, u.position, o.name
      `;
      
      const result = await query(userQuery, [email]);
      
      if (result.rows.length > 0) {
        const dbUser = result.rows[0];
        user = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          avatarUrl: dbUser.avatar_url,
          isActive: dbUser.is_active,
          emailVerified: dbUser.email_verified,
          lastLoginAt: dbUser.last_login_at,
          createdAt: dbUser.created_at,
          updatedAt: dbUser.updated_at,
          organizationId: dbUser.organization_id,
          organizationName: dbUser.organization_name,
          department: dbUser.department,
          position: dbUser.position,
          roles: dbUser.roles || []
        };
      }
    } catch (dbError) {
      console.log('Database query failed, using mock user:', dbError);
    }
    
    // If no user found in database, create mock user
    if (!user) {
      // Mock user data based on email
      if (email === 'admin@example.com') {
        user = {
          id: '1',
          email: email,
          name: 'Admin User',
          roles: ['admin'],
          organizationId: '1',
          isActive: true
        };
      } else if (email === 'manager@example.com') {
        user = {
          id: '2',
          email: email,
          name: 'Manager User',
          roles: ['manager'],
          organizationId: '1',
          isActive: true
        };
      } else if (email === 'employee@example.com') {
        user = {
          id: '3',
          email: email,
          name: 'Employee User',
          roles: ['employee'],
          organizationId: '1',
          isActive: true
        };
      } else {
        // Default to employee for any other email
        user = {
          id: '4',
          email: email,
          name: 'Employee User',
          roles: ['employee'],
          organizationId: '1',
          isActive: true
        };
      }
    }
    
    // Mock JWT token with email embedded
    const mockToken = `mock-jwt-token-${email}-${Date.now()}`;
    
    // Set authentication cookie (automatically overwrites existing cookie)
    const cookieOptions = getCookieOptions(req);
    console.log('🔐 LOGIN: Setting cookie for', email, 'with options:', cookieOptions);
    res.cookie('authToken', mockToken, cookieOptions);
    
    res.json({
      success: true,
      data: {
        user: user,
        token: mockToken,
        expiresIn: '24h'
      }
    });
  } catch (error) {
    console.error('Error in mock login:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Google OAuth login endpoint
app.post('/api/v1/auth/login/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'ID token is required'
      });
    }

    // Verify Google token
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('Google token verification failed:', verifyError);
      return res.status(401).json({
        success: false,
        error: 'Invalid Google token'
      });
    }

    if (!payload || !payload.email) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload'
      });
    }

    const email = payload.email;
    const name = payload.name || email.split('@')[0];

    // Restrict to @wix.com organization in production
    const allowedDomain = 'wix.com';
    const emailDomain = email.split('@')[1]?.toLowerCase();
    
    if (process.env.NODE_ENV === 'production' && emailDomain !== allowedDomain) {
      console.log(`Google login rejected: ${email} is not from @${allowedDomain}`);
      return res.status(403).json({
        success: false,
        error: `Access restricted to @${allowedDomain} organization members only.`
      });
    }

    // Find or create user with roles from user_roles table
    let user: any = null;
    try {
      // Query user with roles from user_roles table
      // Also fetches admin organization assignment for org-scoped admins
      const userQuery = `
        SELECT 
          u.id, u.email, u.name, u.avatar_url, u.is_active, u.email_verified,
          u.last_login_at, u.created_at, u.updated_at, u.organization_id, u.department, u.position,
          o.name as organization_name,
          COALESCE(
            json_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL),
            '[]'
          ) as roles,
          -- Get admin organization assignment (for org-scoped admin role)
          (
            SELECT ur2.organization_id 
            FROM user_roles ur2 
            JOIN roles r2 ON ur2.role_id = r2.id 
            WHERE ur2.user_id = u.id 
              AND ur2.is_active = true 
              AND r2.name = 'admin'
            LIMIT 1
          ) as admin_organization_id,
          (
            SELECT o2.slug 
            FROM user_roles ur2 
            JOIN roles r2 ON ur2.role_id = r2.id 
            JOIN organizations o2 ON ur2.organization_id = o2.id
            WHERE ur2.user_id = u.id 
              AND ur2.is_active = true 
              AND r2.name = 'admin'
            LIMIT 1
          ) as admin_organization_slug
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
        LEFT JOIN roles r ON ur.role_id = r.id
        LEFT JOIN organizations o ON u.organization_id = o.id
        WHERE u.email = $1
        GROUP BY u.id, u.email, u.name, u.avatar_url, u.is_active, u.email_verified, 
                 u.last_login_at, u.created_at, u.updated_at, u.organization_id, u.department, u.position, o.name
      `;
      
      const userResult = await query(userQuery, [email]);
      
      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
      } else {
        // Create new user from Google account
        const insertResult = await query(
          `INSERT INTO users (email, name, role, is_active, email_verified, created_at, updated_at)
           VALUES ($1, $2, 'employee', true, true, NOW(), NOW())
           RETURNING *`,
          [email, name]
        );
        const newUser = insertResult.rows[0];
        
        // Add 'employee' role to user_roles table
        const employeeRoleResult = await query('SELECT id FROM roles WHERE LOWER(name) = $1', ['employee']);
        if (employeeRoleResult.rows.length > 0) {
          const employeeRoleId = employeeRoleResult.rows[0].id;
          await query(
            'INSERT INTO user_roles (user_id, role_id, is_active, granted_at) VALUES ($1, $2, true, NOW()) ON CONFLICT DO NOTHING',
            [newUser.id, employeeRoleId]
          );
        }
        
        user = {
          ...newUser,
          roles: ['employee']
        };
        console.log('Created new user from Google login:', email, 'with role: employee');
      }
    } catch (dbError) {
      console.error('Database error during Google login:', dbError);
      // Fall back to mock user if database fails
      user = {
        id: 'google-' + Date.now(),
        email: email,
        name: name,
        roles: ['employee'],
        isActive: true
      };
    }

    // Generate token (same format as mock login for compatibility)
    const token = `mock-jwt-token-${email}-${Date.now()}`;

    // Set cookie
    const cookieOptions = getCookieOptions(req);
    console.log('🔐 GOOGLE LOGIN: Setting cookie for', email);
    res.cookie('authToken', token, cookieOptions);

    // Ensure roles is always an array
    const userRoles = Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : ['employee']);

    // Check if user is super_admin (no org scope needed)
    const isSuperAdmin = userRoles.includes('super_admin');
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: userRoles,
          organizationId: user.organization_id,
          organizationName: user.organization_name,
          department: user.department,
          position: user.position,
          // Admin organization scope (null for super_admin, org ID for org-scoped admin)
          adminOrganizationId: isSuperAdmin ? null : user.admin_organization_id,
          adminOrganizationSlug: isSuperAdmin ? null : user.admin_organization_slug,
          isSuperAdmin: isSuperAdmin,
        },
        token
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({
      success: false,
      error: 'Google login failed'
    });
  }
});

app.post('/api/v1/auth/logout', async (req, res) => {
  try {
    // Clear authentication cookie with same options used when setting
    const cookieOptions = getCookieOptions(req);
    console.log('🚪 LOGOUT: Clearing cookie with options:', cookieOptions);
    res.clearCookie('authToken', cookieOptions);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Error in logout:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

app.get('/api/v1/auth/me', authenticateToken, async (req, res) => {
  try {
    // authenticateToken middleware has already verified the token from cookie
    // and populated req.user
    const userEmail = (req as any).user?.email;
    
    if (!userEmail) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token or user not found'
      });
    }

    // Get user from database with basic info and roles
    const userQuery = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.avatar_url,
        u.is_active,
        u.email_verified,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        u.organization_id,
        u.department,
        u.position,
        o.name as organization_name,
        COALESCE(
          JSON_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL),
          '[]'
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.email = $1
      GROUP BY u.id, u.email, u.name, u.avatar_url, u.is_active, u.email_verified, 
               u.last_login_at, u.created_at, u.updated_at, u.organization_id, u.department, u.position, o.name
    `;
    
    const result = await query(userQuery, [userEmail]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = result.rows[0];
    const userRoles = user.roles || [];
    const isSuperAdmin = userRoles.includes('super_admin');
    
    // Fetch ALL admin organizations for multi-org admin support
    const adminOrgsQuery = `
      SELECT 
        o.id,
        o.slug,
        o.name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN organizations o ON ur.organization_id = o.id
      WHERE ur.user_id = $1 
        AND ur.is_active = true 
        AND r.name = 'admin'
      ORDER BY o.name
    `;
    
    const adminOrgsResult = await query(adminOrgsQuery, [user.id]);
    const adminOrganizations = adminOrgsResult.rows.map((row: any) => ({
      id: row.id,
      slug: row.slug,
      name: row.name
    }));
    
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      organizationId: user.organization_id,
      organizationName: user.organization_name,
      department: user.department,
      position: user.position,
      roles: userRoles,
      // Multi-org admin support: array of all managed organizations
      adminOrganizations: adminOrganizations,
      isSuperAdmin: isSuperAdmin,
      // Backward compatibility: keep singular fields for first org
      adminOrganizationId: isSuperAdmin ? null : (adminOrganizations[0]?.id || null),
      adminOrganizationSlug: isSuperAdmin ? null : (adminOrganizations[0]?.slug || null),
    };
    
    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info'
    });
  }
});

// Department API routes
app.get('/api/v1/admin/organizations/:id/departments', authenticateToken, async (req, res) => {
  try {
    const { id: organizationId } = req.params;
    const { isActive, type, parentDepartmentId, limit, offset } = req.query;
    
    const filters = {
      isActive: isActive ? isActive === 'true' : undefined,
      type: type as any, // DepartmentType
      parentDepartmentId: parentDepartmentId as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };
    
    const departments = await departmentModel.getDepartments(organizationId, filters);
    
    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch departments',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/v1/admin/organizations/:id/departments/stats', authenticateToken, async (req, res) => {
  try {
    const { id: organizationId } = req.params;
    const stats = await departmentModel.getDepartmentStats(organizationId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching department stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch department statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/v1/admin/organizations/:id/departments/hierarchy', authenticateToken, async (req, res) => {
  try {
    const { id: organizationId } = req.params;
    const hierarchy = await departmentModel.getDepartmentHierarchy(organizationId);
    
    res.json({
      success: true,
      data: hierarchy
    });
  } catch (error) {
    console.error('Error fetching department hierarchy:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch department hierarchy',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/v1/admin/organizations/:id/departments', authenticateToken, async (req, res) => {
  try {
    const { id: organizationId } = req.params;
    const departmentData = req.body;
    
    // Validate department data
    await departmentModel.validateDepartmentData(organizationId, departmentData);
    
    const newDepartment = await departmentModel.createDepartment(organizationId, departmentData);
    
    res.status(201).json({
      success: true,
      data: newDepartment
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create department',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/v1/admin/organizations/:id/departments/:departmentId', authenticateToken, async (req, res) => {
  try {
    const { id: organizationId, departmentId } = req.params;
    const department = await departmentModel.getDepartmentById(departmentId, organizationId);
    
    if (department) {
      res.json({
        success: true,
        data: department
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Department not found' 
      });
    }
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch department',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.put('/api/v1/admin/organizations/:id/departments/:departmentId', authenticateToken, async (req, res) => {
  try {
    const { id: organizationId, departmentId } = req.params;
    const updateData = req.body;
    
    const updatedDepartment = await departmentModel.updateDepartment(
      departmentId, 
      organizationId, 
      updateData
    );
    
    res.json({
      success: true,
      data: updatedDepartment
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update department',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.delete('/api/v1/admin/organizations/:id/departments/:departmentId', authenticateToken, async (req, res) => {
  try {
    const { id: organizationId, departmentId } = req.params;
    
    await departmentModel.deleteDepartment(departmentId, organizationId);
    
    res.status(204).send(); // No content
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete department',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Team API routes
app.get('/api/v1/admin/organizations/:id/teams', authenticateToken, async (req, res) => {
  try {
    const { id: organizationId } = req.params;
    const { isActive, type, departmentId, limit, offset } = req.query;
    
    const filters = {
      isActive: isActive ? isActive === 'true' : undefined,
      type: type as any, // TeamType
      departmentId: departmentId as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };
    
    const teams = await teamModel.getTeams(organizationId, filters);
    
    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch teams',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/v1/admin/organizations/:id/teams/stats', authenticateToken, async (req, res) => {
  try {
    const { id: organizationId } = req.params;
    const stats = await teamModel.getTeamStats(organizationId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching team stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch team statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/v1/admin/organizations/:id/teams', authenticateToken, async (req, res) => {
  try {
    const { id: organizationId } = req.params;
    const teamData = req.body;
    
    // Validate team data
    await teamModel.validateTeamData(organizationId, teamData);
    
    const newTeam = await teamModel.createTeam(organizationId, teamData);
    
    res.status(201).json({
      success: true,
      data: newTeam
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create team',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/v1/admin/organizations/:id/teams/:teamId', authenticateToken, async (req, res) => {
  try {
    const { id: organizationId, teamId } = req.params;
    const team = await teamModel.getTeamById(teamId, organizationId);
    
    if (team) {
      res.json({
        success: true,
        data: team
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Team not found' 
      });
    }
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch team',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.put('/api/v1/admin/organizations/:id/teams/:teamId', authenticateToken, async (req, res) => {
  try {
    const { id: organizationId, teamId } = req.params;
    const updateData = req.body;
    
    const updatedTeam = await teamModel.updateTeam(
      teamId, 
      organizationId, 
      updateData
    );
    
    res.json({
      success: true,
      data: updatedTeam
    });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update team',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.delete('/api/v1/admin/organizations/:id/teams/:teamId', authenticateToken, async (req, res) => {
  try {
    const { id: organizationId, teamId } = req.params;
    
    await teamModel.deleteTeam(teamId, organizationId);
    
    res.status(204).send(); // No content
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete team',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Organization Chart Route
app.get('/api/v1/admin/organizations/:organizationId/chart', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    // Get organization, departments and teams
    const organizationsResult = await query('SELECT * FROM organizations WHERE id = $1', [organizationId]);
    if (organizationsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }
    const organization = organizationsResult.rows[0];
    
    const departmentsResult = await query('SELECT * FROM departments WHERE organization_id = $1', [organizationId]);
    const departments = departmentsResult.rows;
    
    const teamsResult = await query('SELECT * FROM teams WHERE organization_id = $1 AND is_active = true', [organizationId]);
    const teams = teamsResult.rows;
    
    // Build organization chart structure
    const chartNode = {
      id: organizationId,
      type: 'organization',
      name: organization.name,
      children: [],
      metadata: { level: 0 },
    };

    // Add departments to chart
    const deptMap = new Map<string, any>();
    
    // First pass: create department nodes
    departments.forEach((dept: any) => {
      const deptNode = {
        id: dept.id,
        type: 'department',
        name: dept.name,
        children: [] as any[],
        metadata: {
          departmentId: dept.id,
          level: 1,
          isActive: dept.is_active,
        },
      };
      deptMap.set(dept.id, deptNode);
    });

    // Second pass: build hierarchy
    departments.forEach((dept: any) => {
      const deptNode = deptMap.get(dept.id);
      
      if (dept.parent_department_id) {
        const parentNode = deptMap.get(dept.parent_department_id);
        if (parentNode) {
          parentNode.children.push(deptNode);
        }
      } else {
        (chartNode.children as any[]).push(deptNode);
      }
    });

    // Add teams to departments
    teams.forEach((team: any) => {
      const teamNode = {
        id: team.id,
        type: 'team',
        name: team.name,
        children: [] as any[],
        metadata: {
          teamId: team.id,
          departmentId: team.department_id,
          type: team.type,
          level: 2,
          isActive: team.is_active,
        },
      };

      if (team.department_id) {
        const deptNode = deptMap.get(team.department_id);
        if (deptNode) {
          deptNode.children.push(teamNode);
        }
      } else {
        // Team without department - add directly to organization
        (chartNode.children as any[]).push(teamNode);
      }
    });

    // Return chart
    res.json({
      success: true,
      data: {
        id: `${organizationId}-chart`,
        organizationId,
        version: 1,
        isActive: true,
        structure: chartNode,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });
  } catch (error) {
    console.error('Error generating organization chart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate organization chart',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// Bulk Operations Routes
app.get('/api/v1/admin/bulk/template', authenticateToken, async (req, res) => {
  try {
    const type = req.query.type as string || 'organizations';
    
    if (type === 'organizations') {
      const csv = CSVParser.generateOrganizationTemplate();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="organization-import-template.csv"');
      res.send(csv);
    } else if (type === 'users') {
      const csv = CSVParser.generateUserTemplate();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="users-template.csv"');
      res.send(csv);
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid template type. Supported types: organizations, users' 
      });
    }
  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate template',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/v1/admin/bulk/upload', authenticateToken, csvUpload.single('file'), async (req, res) => {
  try {
    const file = (req as any).file;
    
    if (!file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const fileContent = file.buffer.toString('utf-8');
    const fileType = file.originalname.endsWith('.csv') ? 'csv' : 'json';
    const importType = req.body.type || 'organizations'; // Default to organizations for backward compatibility
    
    // Parse the file based on type
    let parsedData: any[];
    let errors: any[] = [];

    if (fileType === 'csv') {
      if (importType === 'users') {
        const result = CSVParser.parseUsers(fileContent);
        parsedData = result.data;
        errors = result.errors;
      } else {
        const result = CSVParser.parseOrganizations(fileContent);
        parsedData = result.data;
        errors = result.errors;
      }
    } else {
      const result = CSVParser.parseJSON<any>(fileContent);
      parsedData = result.data;
      errors = result.errors;
    }

    // Check for parsing errors
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'File parsing failed',
        results: {
          total: parsedData.length + errors.length,
          successful: 0,
          failed: errors.length,
          errors,
        },
      });
    }

    // Get options from request body
    const dryRun = req.body.dryRun === 'true' || req.body.dryRun === true;
    const skipValidation = req.body.skipValidation === 'true' || req.body.skipValidation === true;

    if (dryRun) {
      return res.json({
        success: true,
        message: 'Dry run completed successfully',
        results: {
          total: parsedData.length,
          successful: parsedData.length,
          failed: 0,
          errors: [],
        },
      });
    }

    // Perform bulk import
    const results = {
      total: parsedData.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    for (let i = 0; i < parsedData.length; i++) {
      try {
        const item = parsedData[i];
        
        if (importType === 'users') {
          // Import users using the user service
          const userService = new AdminUserService();
          await userService.importUsers([item]);
        } else {
          // Import organizations (default behavior)
          await organizationService.createOrganization(item);
        }
        
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: (error as Error).message,
        });
        
        if (!skipValidation) {
          break; // Stop on first error if validation is not skipped
        }
      }
    }

    res.json({
      success: results.failed === 0,
      message: `Import completed: ${results.successful} successful, ${results.failed} failed`,
      results,
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process bulk upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/v1/admin/bulk/export', authenticateToken, async (req, res) => {
  try {
    const { type, format, filters } = req.body;
    
    if (type !== 'organizations') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only organization export is currently supported' 
      });
    }

    const organizations = await organizationService.getOrganizations(filters || {});
    
    if (format === 'csv') {
      const csv = CSVParser.organizationsToCSV(organizations.data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="organizations-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        message: `Export completed: ${organizations.data.length} records`,
        data: organizations.data,
        format: 'json',
      });
    }
  } catch (error) {
    console.error('Bulk export error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to export data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/admin/bulk/template/users - Download user CSV template
app.get('/api/v1/admin/bulk/template/users', authenticateToken, (req, res) => {
  try {
    const csv = CSVParser.generateUserTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users-template.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate template',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/admin/bulk/export/users - Export users to CSV/JSON
app.post('/api/v1/admin/bulk/export/users', authenticateToken, async (req, res) => {
  try {
    const { format = 'csv', filters = {} } = req.body;
    
    const userService = new AdminUserService();
    const users = await userService.exportUsers(filters);
    
    if (format === 'csv') {
      const csv = CSVParser.usersToCSV(users);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="users-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        message: `Export completed: ${users.length} records`,
        data: users,
        format: 'json',
      });
    }
  } catch (error) {
    console.error('Bulk export error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to export users',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================
// ADMIN USER API ROUTES
// ==================

// GET /api/v1/admin/roles - Get all roles
app.get('/api/v1/admin/roles', authenticateToken, async (req, res) => {
  try {
    const rolesQuery = `
      SELECT 
        id,
        name,
        description,
        is_system_role,
        permissions,
        created_at,
        updated_at
      FROM roles 
      ORDER BY is_system_role DESC, name ASC
    `;
    
    const result = await query(rolesQuery);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch roles' });
  }
});

// GET /api/v1/admin/users - Get users with filters and pagination
app.get('/api/v1/admin/users', authenticateToken, async (req, res) => {
  console.log('🚀 Admin users endpoint called with query:', req.query);
  try {
    // Check if user is super_admin (can see all users) or org-scoped admin (only their org's users)
    const userRoles = (req as any).user?.roles || [];
    const isSuperAdmin = userRoles.includes('super_admin');
    const adminOrgId = (req as any).user?.adminOrganizationId;
    
    console.log('🔐 Admin users access check:', { isSuperAdmin, adminOrgId, userRoles });

    const {
      page = 1,
      limit = 10,
      search,
      organizationId,
      role,
      status,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    
    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Determine organization filter:
    // - For org-scoped admin: always filter by their assigned org (enforced)
    // - For super_admin: use requested organizationId filter, or no filter for all orgs
    let effectiveOrgId = organizationId as string | undefined;
    if (!isSuperAdmin && adminOrgId) {
      // Org-scoped admin - enforce their org regardless of query param
      effectiveOrgId = adminOrgId;
      console.log('🔐 Org-scoped admin: enforcing org filter:', effectiveOrgId);
    }

    if (effectiveOrgId) {
      whereClause += ` AND u.organization_id = $${paramIndex}`;
      queryParams.push(effectiveOrgId);
      paramIndex++;
    }

    if (status) {
      if (status === 'active') {
        whereClause += ` AND u.is_active = true`;
      } else if (status === 'inactive') {
        whereClause += ` AND u.is_active = false`;
      } else if (status === 'verified') {
        whereClause += ` AND u.email_verified = true`;
      } else if (status === 'unverified') {
        whereClause += ` AND u.email_verified = false`;
      }
    }

    // Role filter: support role name via ?role=manager and role id via ?roleId=<uuid>
    let effectiveRoleId: string | undefined = (req.query as any).roleId as string | undefined;
    console.log('🔍 Role filter debug:', { role, roleId: (req.query as any).roleId, effectiveRoleId });
    
    if (role && !effectiveRoleId) {
      try {
        console.log('🔍 Looking up role name:', role);
        const roleLookup = await query(`SELECT id FROM roles WHERE LOWER(name) = LOWER($1) LIMIT 1`, [String(role)]);
        console.log('🔍 Role lookup result:', roleLookup.rows);
        if (roleLookup.rows[0]?.id) {
          effectiveRoleId = roleLookup.rows[0].id;
          console.log('🔍 Resolved role name to ID:', effectiveRoleId);
        } else {
          // No such role name: force empty result set by filtering to impossible role id
          effectiveRoleId = '00000000-0000-0000-0000-000000000000';
          console.log('🔍 Role name not found, using impossible ID');
        }
      } catch (e) {
        console.error('Role name lookup failed:', e);
      }
    }
    if (effectiveRoleId) {
      console.log('🔍 Adding role filter to WHERE clause:', effectiveRoleId);
      whereClause += ` AND EXISTS (
        SELECT 1 FROM user_roles ur3
        WHERE ur3.user_id = u.id AND ur3.is_active = true AND ur3.role_id = $${paramIndex}
      )`;
      queryParams.push(effectiveRoleId);
      paramIndex++;
    }

    // Count query
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
      ${whereClause}
    `;
    
    console.log('📊 Executed users COUNT query (admin/users):', { text: countQuery, params: queryParams });
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Main query - create separate params array for main query
    const mainQueryParams = [...queryParams];
    mainQueryParams.push(Number(limit), offset);
    
    const mainQuery = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.avatar_url,
        u.is_active,
        u.email_verified,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        u.organization_id,
        u.department,
        u.position,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', ur.id,
              'roleId', ur.role_id,
              'roleName', r.name,
              'organizationId', ur.organization_id,
              'organizationName', o.name,
              'organizationSlug', o.slug,
              'grantedAt', ur.granted_at,
              'expiresAt', ur.expires_at,
              'isActive', ur.is_active
            )
          ) FILTER (WHERE ur.id IS NOT NULL),
          '[]'
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN organizations o ON ur.organization_id = o.id
      ${whereClause}
      GROUP BY u.id, u.email, u.name, u.avatar_url, u.is_active, u.email_verified, 
               u.last_login_at, u.created_at, u.updated_at, u.organization_id, u.department, u.position
      ORDER BY u.${sortBy} ${String(sortOrder).toUpperCase()}
      LIMIT $${mainQueryParams.length - 1} OFFSET $${mainQueryParams.length}
    `;
    
    console.log('📊 Executed users MAIN query (admin/users):', { text: mainQuery, params: mainQueryParams });
    const result = await query(mainQuery, mainQueryParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        offset: offset,
        total,
        totalPages: Math.ceil(total / Number(limit)),
        hasNext: offset + Number(limit) < total,
        hasPrev: Number(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// GET /api/v1/admin/users/:id - Get user by ID
app.get('/api/v1/admin/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const userQuery = `
      SELECT
        u.id,
        u.email,
        u.name,
        u.avatar_url,
        u.is_active,
        u.email_verified,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        u.organization_id,
        u.department,
        u.position,
        o.name as organization_name,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', ur.id,
              'roleId', ur.role_id,
              'roleName', r.name,
              'organizationId', ur.organization_id,
              'organizationName', o.name,
              'grantedAt', ur.granted_at,
              'expiresAt', ur.expires_at,
              'isActive', ur.is_active
            )
          ) FILTER (WHERE ur.id IS NOT NULL),
          '[]'
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN organizations o ON ur.organization_id = o.id
      WHERE u.id = $1
      GROUP BY u.id, u.email, u.name, u.avatar_url, u.is_active, u.email_verified, 
               u.last_login_at, u.created_at, u.updated_at, u.organization_id, u.department, u.position, o.name
    `;
    
    const result = await query(userQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// POST /api/v1/admin/users - Create new user
app.post('/api/v1/admin/users', authenticateToken, async (req, res) => {
  try {
    const { 
      name, 
      email, 
      organizationId, 
      department, 
      position, 
      roles = [],
      adminOrganizationIds, // NEW: Array of org IDs for admin role assignments
      isActive = true,
      emailVerified = false
    } = req.body;
    const grantedBy = (req as any).user?.id;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and email are required' 
      });
    }

    // Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this email already exists' 
      });
    }

    // SUPER_ADMIN ROLE PROTECTION: Only super_admin can assign super_admin role
    const currentUserRoles = (req as any).user?.roles || [];
    const isCurrentUserSuperAdmin = currentUserRoles.includes('super_admin');
    
    if (!isCurrentUserSuperAdmin && roles.includes('super_admin')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Permission denied',
        message: 'Only super administrators can assign the super_admin role'
      });
    }

    // Validate admin role requires organizations
    if (roles.includes('admin') && adminOrganizationIds !== undefined) {
      const orgIds = Array.isArray(adminOrganizationIds) ? adminOrganizationIds : [];
      if (orgIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Admin role requires at least one organization',
          message: 'Please select at least one organization for the admin role'
        });
      }
    }

    // Create user
    const userQuery = `
      INSERT INTO users (name, email, organization_id, department, position, is_active, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const userResult = await query(userQuery, [
      name, email, organizationId, department, position, isActive, emailVerified
    ]);
    
    const newUser = userResult.rows[0];

    // Get admin role ID for special handling
    const adminRoleResult = await query("SELECT id FROM roles WHERE name = 'admin'");
    const adminRoleId = adminRoleResult.rows[0]?.id;

    // Assign roles if provided
    if (roles.length > 0) {
      for (const roleName of roles) {
        // Skip 'admin' role here if we're handling it via adminOrganizationIds
        if (roleName === 'admin' && adminOrganizationIds !== undefined && adminRoleId) {
          continue;
        }
        
        // Get role ID
        const roleResult = await query('SELECT id FROM roles WHERE name = $1', [roleName]);
        if (roleResult.rows.length > 0) {
          const roleId = roleResult.rows[0].id;
          
          // Assign role
          await query(`
            INSERT INTO user_roles (user_id, role_id, organization_id, granted_by, granted_at, is_active)
            VALUES ($1, $2, $3, $4, NOW(), true)
          `, [newUser.id, roleId, organizationId, grantedBy]);
        }
      }
      
      // Handle admin role with multi-org support
      if (roles.includes('admin') && adminOrganizationIds !== undefined && adminRoleId) {
        const orgIds = Array.isArray(adminOrganizationIds) ? adminOrganizationIds : [];
        
        for (const orgId of orgIds) {
          await query(`
            INSERT INTO user_roles (user_id, role_id, organization_id, granted_by, granted_at, is_active)
            VALUES ($1, $2, $3, $4, NOW(), true)
          `, [newUser.id, adminRoleId, orgId, grantedBy]);
        }
        
        console.log(`🔐 Multi-org admin created: userId=${newUser.id}, orgs=${orgIds.length}`);
      }
    }

    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// PUT /api/v1/admin/users/:id - Update user
app.put('/api/v1/admin/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      email, 
      organizationId, 
      department, 
      position, 
      roles = [],
      adminOrganizationIds, // NEW: Array of org IDs for admin role assignments
      isActive,
      emailVerified
    } = req.body;
    const grantedBy = (req as any).user?.id;

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if email is being changed and if it already exists
    if (email) {
      const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'User with this email already exists' 
        });
      }
    }

    // SUPER_ADMIN ROLE PROTECTION: Only super_admin can assign super_admin role
    // Check this BEFORE any updates to ensure atomicity
    if (roles !== undefined && roles.includes('super_admin')) {
      const currentUserRoles = (req as any).user?.roles || [];
      const isCurrentUserSuperAdmin = currentUserRoles.includes('super_admin');
      
      if (!isCurrentUserSuperAdmin) {
        return res.status(403).json({ 
          success: false, 
          error: 'Permission denied',
          message: 'Only super administrators can assign the super_admin role'
        });
      }
    }

    // Update user
    const updateQuery = `
      UPDATE users 
      SET 
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        organization_id = COALESCE($3, organization_id),
        department = COALESCE($4, department),
        position = COALESCE($5, position),
        is_active = COALESCE($6, is_active),
        email_verified = COALESCE($7, email_verified),
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;
    
    const result = await query(updateQuery, [
      name, email, organizationId, department, position, isActive, emailVerified, id
    ]);

    // Update roles if provided
    if (roles !== undefined) {
      // Get admin role ID for special handling
      const adminRoleResult = await query("SELECT id FROM roles WHERE name = 'admin'");
      const adminRoleId = adminRoleResult.rows[0]?.id;
      
      // Deactivate ALL existing roles first (except admin roles if we're syncing them separately)
      if (adminOrganizationIds !== undefined && adminRoleId) {
        // If admin org sync is happening, don't touch admin role assignments here
        await query(`
          UPDATE user_roles SET is_active = false 
          WHERE user_id = $1 AND role_id != $2
        `, [id, adminRoleId]);
      } else {
        // Traditional behavior: deactivate all roles
        await query('UPDATE user_roles SET is_active = false WHERE user_id = $1', [id]);
      }
      
      // Add new roles (except 'admin' if adminOrganizationIds is provided)
      for (const roleName of roles) {
        // Skip 'admin' role here if we're handling it via adminOrganizationIds
        if (roleName === 'admin' && adminOrganizationIds !== undefined) {
          continue;
        }
        
        const roleResult = await query('SELECT id FROM roles WHERE name = $1', [roleName]);
        if (roleResult.rows.length > 0) {
          const roleId = roleResult.rows[0].id;
          
          // Check if role already exists for this user
          const existingRole = await query(
            'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2',
            [id, roleId]
          );
          
          if (existingRole.rows.length > 0) {
            // Reactivate existing role
            await query(
              'UPDATE user_roles SET is_active = true, granted_at = NOW() WHERE user_id = $1 AND role_id = $2',
              [id, roleId]
            );
          } else {
            // Create new role assignment
            await query(`
              INSERT INTO user_roles (user_id, role_id, organization_id, granted_by, granted_at, is_active)
              VALUES ($1, $2, $3, $4, NOW(), true)
            `, [id, roleId, organizationId, grantedBy]);
          }
        }
      }
      
      // Handle admin role with multi-org support
      if (adminOrganizationIds !== undefined && adminRoleId) {
        // Sync admin role across the specified organizations
        const orgIds = Array.isArray(adminOrganizationIds) ? adminOrganizationIds : [];
        
        // If admin role is being assigned, sync the org assignments
        if (roles.includes('admin')) {
          // Validation: admin role requires at least one organization
          if (orgIds.length === 0) {
            return res.status(400).json({
              success: false,
              error: 'Admin role requires at least one organization',
              message: 'Please select at least one organization for the admin role'
            });
          }
          
          // Deactivate admin roles for orgs NOT in the list
          await query(`
            UPDATE user_roles 
            SET is_active = false 
            WHERE user_id = $1 
              AND role_id = $2 
              AND organization_id IS NOT NULL
              AND organization_id != ALL($3)
              AND is_active = true
          `, [id, adminRoleId, orgIds]);
          
          // Add/reactivate admin roles for orgs IN the list
          for (const orgId of orgIds) {
            await query(`
              INSERT INTO user_roles (user_id, role_id, organization_id, granted_by, is_active)
              VALUES ($1, $2, $3, $4, true)
              ON CONFLICT (user_id, role_id, organization_id) 
              DO UPDATE SET 
                is_active = true,
                granted_by = COALESCE($4, user_roles.granted_by),
                granted_at = CASE 
                  WHEN user_roles.is_active = false THEN NOW() 
                  ELSE user_roles.granted_at 
                END
            `, [id, adminRoleId, orgId, grantedBy]);
          }
          
          console.log(`🔐 Multi-org admin sync: userId=${id}, orgs=${orgIds.length}`);
        } else {
          // Admin role is being removed - deactivate all admin org assignments
          await query(`
            UPDATE user_roles 
            SET is_active = false 
            WHERE user_id = $1 AND role_id = $2 AND is_active = true
          `, [id, adminRoleId]);
          
          console.log(`🔐 Admin role removed: userId=${id}`);
        }
      }
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// DELETE /api/v1/admin/users/:id - Delete user
app.delete('/api/v1/admin/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Soft delete - deactivate user and roles
    await query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);
    await query('UPDATE user_roles SET is_active = false WHERE user_id = $1', [id]);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// GET /api/v1/admin/users/stats - Get user statistics
app.get('/api/v1/admin/users/stats', authenticateToken, async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN email_verified = false THEN 1 END) as unverified_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_signups
      FROM users
    `;
    
    const statsResult = await query(statsQuery);
    const stats = statsResult.rows[0];

    // Get role distribution
    const roleQuery = `
      SELECT r.name, COUNT(ur.user_id) as count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = true
      GROUP BY r.id, r.name
    `;
    
    const roleResult = await query(roleQuery);
    const roleDistribution = roleResult.rows;

    // Get organization distribution
    const orgQuery = `
      SELECT o.name, COUNT(DISTINCT u.id) as count
      FROM organizations o
      LEFT JOIN users u ON o.id = u.organization_id
      GROUP BY o.id, o.name
    `;
    
    const orgResult = await query(orgQuery);
    const organizationDistribution = orgResult.rows;

    // Get department distribution
    const deptQuery = `
      SELECT department, COUNT(*) as count
      FROM users
      WHERE department IS NOT NULL
      GROUP BY department
    `;
    
    const deptResult = await query(deptQuery);
    const departmentDistribution = deptResult.rows;

    res.json({
      success: true,
      data: {
        ...stats,
        roleDistribution,
        organizationDistribution,
        departmentDistribution
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user statistics' });
  }
});


// ==================
// NOTIFICATIONS API ROUTES
// ==================

// GET /api/v1/notifications - Get user notifications
app.get('/api/v1/notifications', authenticateToken, async (req, res) => {
  try {
    const { userId, userEmail, isRead, type, limit = 50, offset = 0 } = req.query;
    
    // Build the WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;
    
    // Filter by user
    if (userId) {
      paramCount++;
      whereConditions.push(`un.user_id = $${paramCount}`);
      queryParams.push(userId);
    } else if (userEmail) {
      paramCount++;
      whereConditions.push(`u.email = $${paramCount}`);
      queryParams.push(userEmail);
    }
    
    // Filter by read status
    if (isRead !== undefined) {
      whereConditions.push(`un.read_at IS ${isRead === 'true' ? 'NOT NULL' : 'NULL'}`);
    }
    
    // Filter by type
    if (type) {
      paramCount++;
      whereConditions.push(`un.category = $${paramCount}`);
      queryParams.push(type);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Add pagination parameters
    paramCount++;
    const limitParam = `$${paramCount}`;
    queryParams.push(Number(limit));
    
    paramCount++;
    const offsetParam = `$${paramCount}`;
    queryParams.push(Number(offset));
    
    // Query notifications from database
    const notificationsQuery = `
      SELECT 
        un.id,
        un.user_id as "userId",
        u.email as "userEmail",
        un.type,
        un.category,
        un.title,
        un.message,
        un.data,
        un.status,
        un.priority,
        un.scheduled_at as "scheduledAt",
        un.sent_at as "sentAt",
        un.delivered_at as "deliveredAt",
        un.read_at as "readAt",
        un.failed_at as "failedAt",
        un.error_message as "errorMessage",
        un.retry_count as "retryCount",
        un.max_retries as "maxRetries",
        un.created_at as "createdAt",
        un.updated_at as "updatedAt",
        CASE WHEN un.read_at IS NOT NULL THEN true ELSE false END as "isRead"
      FROM user_notifications un
      LEFT JOIN users u ON un.user_id = u.id
      ${whereClause}
      ORDER BY un.created_at DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;
    
    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM user_notifications un
      LEFT JOIN users u ON un.user_id = u.id
      ${whereClause}
    `;
    
    const [notificationsResult, countResult] = await Promise.all([
      query(notificationsQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset params
    ]);
    
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: notificationsResult.rows,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

// GET /api/v1/notifications/stats - Get notification statistics
app.get('/api/v1/notifications/stats', authenticateToken, async (req, res) => {
  try {
    const { userId, userEmail } = req.query;
    
    // Build the WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;
    
    // Filter by user
    if (userId) {
      paramCount++;
      whereConditions.push(`un.user_id = $${paramCount}`);
      queryParams.push(userId);
    } else if (userEmail) {
      paramCount++;
      whereConditions.push(`u.email = $${paramCount}`);
      queryParams.push(userEmail);
    }
    
    // Query notification statistics from database
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN un.read_at IS NULL THEN 1 END) as unread,
        COUNT(CASE WHEN un.read_at IS NOT NULL THEN 1 END) as read
      FROM user_notifications un
      LEFT JOIN users u ON un.user_id = u.id
      ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
    `;
    
    // Query category statistics
    const categoryQuery = `
      SELECT 
        un.category,
        COUNT(*) as count
      FROM user_notifications un
      LEFT JOIN users u ON un.user_id = u.id
      ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')} AND un.category IS NOT NULL` : 'WHERE un.category IS NOT NULL'}
      GROUP BY un.category
    `;
    
    // Query priority statistics
    const priorityQuery = `
      SELECT 
        un.priority,
        COUNT(*) as count
      FROM user_notifications un
      LEFT JOIN users u ON un.user_id = u.id
      ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')} AND un.priority IS NOT NULL` : 'WHERE un.priority IS NOT NULL'}
      GROUP BY un.priority
    `;
    
    const [statsResult, categoryResult, priorityResult] = await Promise.all([
      query(statsQuery, queryParams),
      query(categoryQuery, queryParams),
      query(priorityQuery, queryParams)
    ]);
    
    const stats = statsResult.rows[0];
    const categories = categoryResult.rows;
    const priorities = priorityResult.rows;
    
    // Build JSON objects for by_type and by_priority
    const byType = {};
    const byPriority = {};
    
    categories.forEach(row => {
      byType[row.category] = parseInt(row.count);
    });
    
    priorities.forEach(row => {
      byPriority[row.priority] = parseInt(row.count);
    });
    
    res.json({ 
      success: true, 
      data: {
        total: parseInt(stats.total),
        unread: parseInt(stats.unread),
        read: parseInt(stats.read),
        byType: byType,
        byPriority: byPriority
      }
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notification stats' });
  }
});

// PUT /api/v1/notifications/:id/read - Mark notification as read
app.put('/api/v1/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Update notification in database
    const updateQuery = `
      UPDATE user_notifications 
      SET read_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND read_at IS NULL
      RETURNING *
    `;
    
    const result = await query(updateQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notification not found or already read' });
    }
    
    const notification = result.rows[0];
    
    res.json({ 
      success: true, 
      data: {
        id: notification.id,
        userId: notification.user_id,
        type: notification.type,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        status: notification.status,
        priority: notification.priority,
        isRead: true,
        readAt: notification.read_at,
        createdAt: notification.created_at,
        updatedAt: notification.updated_at
      }
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

// PUT /api/v1/notifications/read-all - Mark all notifications as read
app.put('/api/v1/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const { userId, userEmail } = req.body;
    
    // Build the WHERE clause
    let whereConditions = ['read_at IS NULL'];
    let queryParams = [];
    let paramCount = 0;
    
    // Filter by user
    if (userId) {
      paramCount++;
      whereConditions.push(`user_id = $${paramCount}`);
      queryParams.push(userId);
    } else if (userEmail) {
      paramCount++;
      whereConditions.push(`user_id = (SELECT id FROM users WHERE email = $${paramCount})`);
      queryParams.push(userEmail);
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    // Update all unread notifications for the user
    const updateQuery = `
      UPDATE user_notifications 
      SET read_at = NOW(), updated_at = NOW()
      ${whereClause}
      RETURNING id
    `;
    
    const result = await query(updateQuery, queryParams);
    
    res.json({ 
      success: true, 
      data: { count: result.rows.length } 
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all notifications as read' });
  }
});

// DELETE /api/v1/notifications/:id - Delete notification
app.delete('/api/v1/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete notification from database
    const deleteQuery = `
      DELETE FROM user_notifications 
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await query(deleteQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
});

// POST /api/v1/notifications - Create notification (for testing)
app.post('/api/v1/notifications', authenticateToken, async (req, res) => {
  try {
    const { userId, userEmail, type, title, message, data, priority = 'normal' } = req.body;
    
    // Determine user ID
    let targetUserId = userId;
    if (!targetUserId && userEmail) {
      const userResult = await query('SELECT id FROM users WHERE email = $1', [userEmail]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      targetUserId = userResult.rows[0].id;
    }
    
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'userId or userEmail is required' });
    }
    
    // Get user's organization
    const userResult = await query('SELECT organization_id FROM users WHERE id = $1', [targetUserId]);
    const organizationId = userResult.rows[0]?.organization_id;
    
    // Insert notification into database
    const insertQuery = `
      INSERT INTO user_notifications (
        user_id, organization_id, type, category, title, message, data, priority, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *
    `;
    
    const result = await query(insertQuery, [
      targetUserId,
      organizationId,
      type || 'in_app',
      type || 'system',
      title,
      message,
      JSON.stringify(data || {}),
      priority
    ]);
    
    const notification = result.rows[0];
    
    res.status(201).json({ 
      success: true, 
      data: {
        id: notification.id,
        userId: notification.user_id,
        type: notification.type,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        status: notification.status,
        priority: notification.priority,
        isRead: false,
        createdAt: notification.created_at,
        updatedAt: notification.updated_at
      }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, error: 'Failed to create notification' });
  }
});

// GET /api/v1/users/search - Search users by email/name within organization
app.get('/api/v1/users/search', authenticateToken, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.length < 3) {
      return res.json({ success: true, data: [] });
    }
    
    // Get current user's organization from the authenticated user
    const currentUserEmail = (req as any).user?.email;
    if (!currentUserEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    // Get user's organization
    const userQuery = `
      SELECT u.organization_id
      FROM users u
      WHERE u.email = $1
    `;
    const userResult = await query(userQuery, [currentUserEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const organizationId = userResult.rows[0].organization_id;
    
    // Search users in database
    const searchQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        u.department,
        u.position,
        u.is_active
      FROM users u
      WHERE u.organization_id = $1
        AND (u.name ILIKE $2 OR u.email ILIKE $2)
        AND u.is_active = true
      ORDER BY u.name ASC
      LIMIT $3
    `;
    
    const result = await query(searchQuery, [organizationId, `%${q}%`, limit]);
    const users = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatar_url || null,
      department: row.department || '',
      position: row.position || '',
      isActive: row.is_active
    }));
    
    console.log('Searching users with:', { q, organizationId, limit });
    console.log('Database search result:', users.length, 'users found');
    
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ success: false, error: 'Failed to search users' });
  }
});

// ==================
// PROFILE API ROUTES
// ==================

// GET /api/v1/profile - Get current user profile
app.get('/api/v1/profile', authenticateToken, async (req, res) => {
  try {
    // Get user email from request (set by auth middleware)
    const userEmail = (req as any).user?.email;
    
    if (!userEmail) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Get user profile from database
    const profileQuery = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.avatar_url,
        u.is_active,
        u.email_verified,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        u.organization_id,
        u.department,
        u.position,
        o.name as organization_name,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', ur.id,
              'roleId', ur.role_id,
              'roleName', r.name,
              'organizationId', ur.organization_id,
              'organizationName', o2.name,
              'grantedAt', ur.granted_at,
              'expiresAt', ur.expires_at,
              'isActive', ur.is_active
            )
          ) FILTER (WHERE ur.id IS NOT NULL),
          '[]'
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      LEFT JOIN organizations o2 ON ur.organization_id = o2.id
      WHERE u.email = $1
      GROUP BY u.id, u.email, u.name, u.avatar_url, u.is_active, u.email_verified, 
               u.last_login_at, u.created_at, u.updated_at, u.organization_id, u.department, u.position, o.name
    `;
    
    const result = await query(profileQuery, [userEmail]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = result.rows[0];
    
    // Transform relative avatar URL to absolute URL
    let avatarUrl = user.avatar_url;
    if (avatarUrl && avatarUrl.startsWith('/api/')) {
      const backendUrl = process.env.BACKEND_URL || 'https://feedbackflow-backend.onrender.com';
      avatarUrl = `${backendUrl}${avatarUrl}`;
    }
    
    const profile = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: avatarUrl,
      department: user.department,
      position: user.position,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      organizationId: user.organization_id,
      organizationName: user.organization_name,
      roles: user.roles || []
    };
    
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// PUT /api/v1/profile - Update current user profile
app.put('/api/v1/profile', authenticateToken, async (req, res) => {
  try {
    const userEmail = (req as any).user?.email;
    if (!userEmail) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    const { name, department, position, phone, bio, location, timezone } = req.body;
    
    const updateQuery = `
      UPDATE users 
      SET 
        name = COALESCE($1, name),
        department = COALESCE($2, department),
        position = COALESCE($3, position),
        phone = COALESCE($4, phone),
        bio = COALESCE($5, bio),
        location = COALESCE($6, location),
        timezone = COALESCE($7, timezone),
        updated_at = NOW()
      WHERE email = $8
      RETURNING *
    `;
    
    const result = await query(updateQuery, [
      name, department, position, phone, bio, location, timezone, userEmail
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    
    const user = result.rows[0];
    
    // Transform relative avatar URL to absolute URL
    let avatarUrl = user.avatar_url;
    if (avatarUrl && avatarUrl.startsWith('/api/')) {
      const backendUrl = process.env.BACKEND_URL || 'https://feedbackflow-backend.onrender.com';
      avatarUrl = `${backendUrl}${avatarUrl}`;
    }
    
    const profile = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: avatarUrl,
      department: user.department,
      position: user.position,
      phone: user.phone,
      bio: user.bio,
      location: user.location,
      timezone: user.timezone,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      organizationId: user.organization_id,
      organizationName: user.organization_name,
      roles: []
    };
    
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// POST /api/v1/profile/avatar - Upload avatar
app.post('/api/v1/profile/avatar', authenticateToken, avatarUpload.single('avatar'), async (req: any, res: any) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }

    // Convert image to base64 and store in database
    const base64Image = file.buffer.toString('base64');
    const avatarDataUrl = `data:${file.mimetype};base64,${base64Image}`;
    
    // Also create a URL that serves the avatar from our API
    // Get user ID first
    const userResult = await query('SELECT id FROM users WHERE email = $1', [userEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const userId = userResult.rows[0].id;
    
    // Update both avatar_url and avatar_data
    const updateQuery = `
      UPDATE users 
      SET avatar_url = $1, avatar_data = $2, avatar_mime_type = $3, updated_at = NOW()
      WHERE email = $4
      RETURNING avatar_url
    `;
    
    const apiAvatarUrl = `/api/v1/users/${userId}/avatar`;
    const result = await query(updateQuery, [apiAvatarUrl, base64Image, file.mimetype, userEmail]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    
    // Return full URL for immediate display
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    res.json({ 
      success: true, 
      data: { 
        avatarUrl: `${baseUrl}${apiAvatarUrl}`,
        // Also return data URL for immediate preview
        avatarDataUrl: avatarDataUrl
      } 
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ success: false, error: 'Failed to upload avatar' });
  }
});

// GET /api/v1/users/:id/avatar - Serve user avatar from database
app.get('/api/v1/users/:id/avatar', async (req: any, res: any) => {
  try {
    const userId = req.params.id;
    
    const result = await query(
      'SELECT avatar_data, avatar_mime_type, name FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const { avatar_data, avatar_mime_type, name } = result.rows[0];
    
    // If no avatar data, return a default generated avatar
    if (!avatar_data) {
      // Redirect to a placeholder avatar service
      const initials = encodeURIComponent(name || 'U');
      return res.redirect(`https://ui-avatars.com/api/?name=${initials}&background=4F46E5&color=fff&size=200`);
    }
    
    // Serve the image from database with CORS headers for cross-origin access
    const imageBuffer = Buffer.from(avatar_data, 'base64');
    res.setHeader('Content-Type', avatar_mime_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow any origin to load this image
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Allow cross-origin embedding
    res.send(imageBuffer);
  } catch (error) {
    console.error('Error serving avatar:', error);
    res.status(500).json({ success: false, error: 'Failed to load avatar' });
  }
});

// GET /api/v1/profile/stats - Get profile statistics
app.get('/api/v1/profile/stats', authenticateToken, async (req, res) => {
  try {
    const userEmail = (req as any).user?.email;
    if (!userEmail) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    // Get user ID from email
    const userQuery = `SELECT id FROM users WHERE email = $1`;
    const userResult = await query(userQuery, [userEmail]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;

    // Calculate real statistics from database
    const statsQuery = `
      SELECT 
        -- Count feedback given (as giver)
        (SELECT COUNT(*) 
         FROM feedback_responses 
         WHERE giver_id = $1) as total_feedback_given,
        
        -- Count feedback received
        (SELECT COUNT(*) 
         FROM feedback_responses 
         WHERE recipient_id = $1) as total_feedback_received,
        
        -- Calculate average rating received
        (SELECT COALESCE(AVG(rating), 0) 
         FROM feedback_responses 
         WHERE recipient_id = $1 AND rating IS NOT NULL) as average_rating,
        
        -- Count active cycles (user is participant)
        (SELECT COUNT(DISTINCT fc.id)
         FROM feedback_cycles fc
         WHERE fc.status = 'active'
           AND (
             EXISTS (SELECT 1 FROM feedback_requests fr WHERE fr.cycle_id = fc.id AND (fr.requester_id = $1 OR fr.recipient_id = $1))
             OR EXISTS (SELECT 1 FROM feedback_responses fr WHERE fr.cycle_id = fc.id AND (fr.giver_id = $1 OR fr.recipient_id = $1))
           )) as active_cycles,
        
        -- Count completed cycles (user was participant)
        (SELECT COUNT(DISTINCT fc.id)
         FROM feedback_cycles fc
         WHERE fc.status = 'closed'
           AND (
             EXISTS (SELECT 1 FROM feedback_requests fr WHERE fr.cycle_id = fc.id AND (fr.requester_id = $1 OR fr.recipient_id = $1))
             OR EXISTS (SELECT 1 FROM feedback_responses fr WHERE fr.cycle_id = fc.id AND (fr.giver_id = $1 OR fr.recipient_id = $1))
           )) as completed_cycles
    `;
    
    const statsResult = await query(statsQuery, [userId]);
    
    if (statsResult.rows.length === 0) {
      return res.status(500).json({ success: false, error: 'Failed to calculate stats' });
    }
    
    const dbStats = statsResult.rows[0];
    
    const stats = {
      totalFeedbackGiven: parseInt(dbStats.total_feedback_given) || 0,
      totalFeedbackReceived: parseInt(dbStats.total_feedback_received) || 0,
      averageRating: parseFloat(dbStats.average_rating) || 0,
      totalGoals: 0, // Goals table doesn't exist yet
      completedGoals: 0,
      activeCycles: parseInt(dbStats.active_cycles) || 0,
      completedCycles: parseInt(dbStats.completed_cycles) || 0
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching profile stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile stats' });
  }
});

// ==================
// SETTINGS API ROUTES
// ==================

// GET /api/v1/settings - Get current user settings
app.get('/api/v1/settings', authenticateToken, async (req, res) => {
  try {
    const userEmail = (req as any).user?.email;
    if (!userEmail) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    // Query user settings from database
    const settingsQuery = `
      SELECT 
        id,
        settings,
        timezone,
        created_at,
        updated_at
      FROM users
      WHERE email = $1
    `;
    
    const result = await query(settingsQuery, [userEmail]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // Default settings in case settings column is null
    const defaultSettings = {
      emailNotifications: true,
      pushNotifications: true,
      feedbackNotifications: true,
      cycleNotifications: true,
      reminderNotifications: true,
      weeklyDigest: false,
      profileVisibility: 'organization',
      showEmail: false,
      showPhone: false,
      showDepartment: true,
      showPosition: true,
      theme: 'system',
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      autoSaveDrafts: true,
      draftSaveInterval: 5,
      feedbackReminders: true,
      reminderFrequency: 'weekly',
      twoFactorEnabled: false,
      sessionTimeout: 60,
      loginNotifications: true,
      dataRetention: 24,
      analyticsOptIn: true,
      marketingEmails: false
    };
    
    // Merge default settings with user settings
    const userSettings = {
      id: user.id,
      userId: user.id,
      ...defaultSettings,
      ...(user.settings || {}),
      timezone: user.timezone || 'UTC',
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
    
    res.json({ success: true, data: userSettings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// PUT /api/v1/settings - Update current user settings
app.put('/api/v1/settings', authenticateToken, async (req, res) => {
  try {
    const userEmail = (req as any).user?.email;
    if (!userEmail) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    // Get current user to merge settings
    const getCurrentQuery = `
      SELECT id, settings, timezone
      FROM users
      WHERE email = $1
    `;
    
    const currentResult = await query(getCurrentQuery, [userEmail]);
    
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const currentUser = currentResult.rows[0];
    const currentSettings = currentUser.settings || {};
    
    // Extract timezone separately if provided
    const { timezone, ...settingsUpdate } = req.body;
    
    // Merge current settings with updates (only update provided fields)
    const mergedSettings = {
      ...currentSettings,
      ...settingsUpdate
    };
    
    // Update user settings in database
    const updateQuery = `
      UPDATE users
      SET 
        settings = $1,
        timezone = COALESCE($2, timezone),
        updated_at = NOW()
      WHERE email = $3
      RETURNING id, settings, timezone, updated_at
    `;
    
    const result = await query(updateQuery, [
      JSON.stringify(mergedSettings),
      timezone,
      userEmail
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const updatedUser = result.rows[0];
    
    const updatedSettings = {
      id: updatedUser.id,
      userId: updatedUser.id,
      ...updatedUser.settings,
      timezone: updatedUser.timezone,
      updatedAt: updatedUser.updated_at,
    };
    
    res.json({ success: true, data: updatedSettings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// POST /api/v1/settings/reset - Reset settings to defaults
app.post('/api/v1/settings/reset', async (req, res) => {
  try {
    const defaultSettings = {
      id: 'settings-1',
      userId: 'mock-user-1',
      
      // Notification Settings
      emailNotifications: true,
      pushNotifications: true,
      feedbackNotifications: true,
      cycleNotifications: true,
      reminderNotifications: true,
      weeklyDigest: false,
      
      // Privacy Settings
      profileVisibility: 'organization',
      showEmail: false,
      showPhone: false,
      showDepartment: true,
      showPosition: true,
      
      // Application Settings
      theme: 'system',
      language: 'en',
      timezone: 'America/Los_Angeles',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      
      // Feedback Settings
      autoSaveDrafts: true,
      draftSaveInterval: 5,
      feedbackReminders: true,
      reminderFrequency: 'weekly',
      
      // Security Settings
      twoFactorEnabled: false,
      sessionTimeout: 60,
      loginNotifications: true,
      
      // Data & Privacy
      dataRetention: 24,
      analyticsOptIn: true,
      marketingEmails: false,
      
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    res.json({ success: true, data: defaultSettings });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({ success: false, error: 'Failed to reset settings' });
  }
});

// POST /api/v1/settings/password - Change password
app.post('/api/v1/settings/password', async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Mock validation
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'New passwords do not match' 
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 8 characters long' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// POST /api/v1/settings/export - Export user data
app.post('/api/v1/settings/export', async (req, res) => {
  try {
    const { format, includeFeedback, includeProfile, includeActivity } = req.body;
    
    // Mock export response
    const mockDownloadUrl = `https://api.feedbackflow.com/exports/user-data-${Date.now()}.${format}`;
    
    res.json({ 
      success: true, 
      data: {
        downloadUrl: mockDownloadUrl,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      }
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ success: false, error: 'Failed to export data' });
  }
});

// POST /api/v1/settings/delete-account - Delete user account
app.post('/api/v1/settings/delete-account', async (req, res) => {
  try {
    const { password, reason, confirmDeletion } = req.body;
    
    if (!confirmDeletion) {
      return res.status(400).json({ 
        success: false, 
        error: 'Account deletion must be confirmed' 
      });
    }
    
    // Mock account deletion
    res.json({ 
      success: true, 
      message: 'Account deletion request submitted. You will receive an email confirmation.' 
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
});

// ==================
// HIERARCHY API ROUTES
// ==================

// Database-backed hierarchy relationships
type HierarchyRelationship = {
  id: string;
  organizationId: string;
  managerId: string;
  employeeId: string;
  level: number;
  isDirectReport: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// DELETE /api/v1/hierarchy/clear/:organizationId - Clear all relationships for an org (database)
app.delete('/api/v1/hierarchy/clear/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    // Delete all hierarchy relationships for the organization
    const result = await query(
      'DELETE FROM organizational_hierarchy WHERE organization_id = $1',
      [organizationId]
    );
    
    res.json({ success: true, data: { removed: result.rowCount } });
  } catch (error) {
    console.error('Error clearing hierarchy relationships:', error);
    res.status(500).json({ success: false, error: 'Failed to clear hierarchy relationships' });
  }
});

// GET /api/v1/hierarchy/tree/:organizationId - Get organizational hierarchy tree
app.get('/api/v1/hierarchy/tree/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;

    // First, get the organization by ID to get the slug
    const orgQuery = 'SELECT id, name, slug FROM organizations WHERE id = $1';
    const orgResult = await query(orgQuery, [organizationId]);
    
    if (orgResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }
    
    const organization = orgResult.rows[0];

    // Fetch users in organization filtered by slug
    const usersResult = await query(
      `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.position,
        u.department,
        u.avatar_url,
        EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = u.id AND ur.is_active = true AND r.name = 'manager'
        ) as is_manager
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE o.slug = $1
      `,
      [organization.slug]
    );

    const userIdToNode = new Map<string, any>();
    usersResult.rows.forEach((row: any) => {
      userIdToNode.set(row.id, {
        id: row.id,
        name: row.name,
        email: row.email,
        position: row.position || '',
        department: row.department || '',
        avatarUrl: row.avatar_url || undefined,
        level: 0,
        isManager: row.is_manager === true,
        directReports: [] as any[],
      });
    });

    // Build edges from database relationships filtered by organization slug
    const relsResult = await query(
      `SELECT oh.manager_id, oh.employee_id 
       FROM organizational_hierarchy oh
       LEFT JOIN organizations o ON oh.organization_id = o.id
       WHERE o.slug = $1 AND oh.is_active = true`,
      [organization.slug]
    );
    
    const hasManager = new Set<string>();
    const hasEmployee = new Set<string>();

    for (const rel of relsResult.rows) {
      const managerNode = userIdToNode.get(rel.manager_id);
      const employeeNode = userIdToNode.get(rel.employee_id);
      if (!managerNode || !employeeNode) continue;
      employeeNode.managerId = managerNode.id;
      employeeNode.managerName = managerNode.name;
      managerNode.directReports.push(employeeNode);
      hasManager.add(managerNode.id);
      hasEmployee.add(employeeNode.id);
    }

    // Determine roots (managers who are not employees in any relationship)
    const roots: any[] = [];
    for (const [id, node] of userIdToNode.entries()) {
      if (node.isManager && !hasEmployee.has(id)) {
        roots.push(node);
      }
    }

    // Check if there are any actual manager-employee relationships
    const hasAnyRelationships = relsResult.rows.length > 0;
    
    // If no relationships exist, show empty hierarchy
    if (!hasAnyRelationships) {
      // No relationships exist - show empty hierarchy
      roots.length = 0;
    } else if (roots.length === 0) {
      // There are relationships but no root managers, pick all users without managerId as roots
      for (const node of userIdToNode.values()) {
        if (!node.managerId) roots.push(node);
      }
    }

    // Assign levels via BFS
    const assignLevels = (rootNodes: any[]) => {
      const queue: Array<{ node: any; level: number }> = [];
      for (const r of rootNodes) queue.push({ node: r, level: 0 });
      const visited = new Set<string>();
      while (queue.length) {
        const { node, level } = queue.shift()!;
        if (visited.has(node.id)) continue;
        visited.add(node.id);
        node.level = level;
        for (const child of node.directReports) {
          queue.push({ node: child, level: level + 1 });
        }
      }
    };
    assignLevels(roots);

    // Calculate total employee counts (direct + indirect)
    const calculateEmployeeCount = (node: any): number => {
      if (!node.directReports || node.directReports.length === 0) {
        return 0;
      }
      
      let count = node.directReports.length; // Direct reports
      
      // Add indirect reports recursively
      for (const child of node.directReports) {
        count += calculateEmployeeCount(child);
      }
      
      return count;
    };

    // Add employeeCount to each node
    const addEmployeeCounts = (node: any) => {
      node.employeeCount = calculateEmployeeCount(node);
      for (const child of node.directReports) {
        addEmployeeCounts(child);
      }
    };

    // Apply employee counts to all roots
    for (const root of roots) {
      addEmployeeCounts(root);
    }

    // Wrap under organization root for chart stability
    const tree = {
      id: organizationId,
      name: organization.name,
      email: '',
      position: 'Organization',
      department: '',
      avatarUrl: undefined,
      level: 0,
      isManager: true,
      directReports: roots,
    };

    // Calculate employee count for the organization root
    addEmployeeCounts(tree);

    res.json({ success: true, data: tree });
  } catch (error) {
    console.error('Error fetching hierarchy tree:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hierarchy tree' });
  }
});

// GET /api/v1/hierarchy/direct-reports/:managerId - Get direct reports for a manager
app.get('/api/v1/hierarchy/direct-reports/:managerId', async (req, res) => {
  try {
    const { managerId } = req.params;
    
    // Get direct reports from database
    const result = await query(
      `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.position,
        u.department,
        u.avatar_url,
        oh.level,
        oh.is_direct_report,
        oh.created_at,
        oh.updated_at,
        EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = u.id AND ur.is_active = true AND r.name = 'manager'
        ) as is_manager
      FROM organizational_hierarchy oh
      JOIN users u ON oh.employee_id = u.id
      WHERE oh.manager_id = $1 
        AND oh.is_active = true
        AND u.is_active = true
      ORDER BY u.name ASC
      `,
      [managerId]
    );
    
    const directReports = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      position: row.position || '',
      department: row.department || '',
      avatarUrl: row.avatar_url || undefined,
      level: row.level,
      isDirectReport: row.is_direct_report,
      isManager: row.is_manager === true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      directReports: []
    }));
    
    res.json({ 
      success: true, 
      data: { 
        items: directReports, 
        total: directReports.length 
      } 
    });
  } catch (error) {
    console.error('Error fetching direct reports:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch direct reports' });
  }
});

// GET /api/v1/hierarchy/manager-chain/:employeeId - Get manager chain for an employee
app.get('/api/v1/hierarchy/manager-chain/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    // Mock manager chain based on employee ID
    const mockManagerChains = {
      'dev-1': [
        {
          id: 'manager-1',
          name: 'Alice Manager',
          email: 'alice@example.com',
          position: 'Frontend Team Lead',
          department: 'Engineering',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
          level: 3,
          isManager: true,
          directReports: []
        },
        {
          id: 'director-1',
          name: 'Mike Director',
          email: 'mike@example.com',
          position: 'Director of Frontend',
          department: 'Engineering',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike',
          level: 2,
          isManager: true,
          directReports: []
        },
        {
          id: 'vp-1',
          name: 'Sarah VP',
          email: 'sarah@example.com',
          position: 'VP of Engineering',
          department: 'Engineering',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
          level: 1,
          isManager: true,
          directReports: []
        },
        {
          id: 'ceo-1',
          name: 'John CEO',
          email: 'ceo@example.com',
          position: 'Chief Executive Officer',
          department: 'Executive',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ceo',
          level: 0,
          isManager: true,
          directReports: []
        }
      ],
      'dev-2': [
        {
          id: 'manager-1',
          name: 'Alice Manager',
          email: 'alice@example.com',
          position: 'Frontend Team Lead',
          department: 'Engineering',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
          level: 3,
          isManager: true,
          directReports: []
        },
        {
          id: 'director-1',
          name: 'Mike Director',
          email: 'mike@example.com',
          position: 'Director of Frontend',
          department: 'Engineering',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike',
          level: 2,
          isManager: true,
          directReports: []
        },
        {
          id: 'vp-1',
          name: 'Sarah VP',
          email: 'sarah@example.com',
          position: 'VP of Engineering',
          department: 'Engineering',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
          level: 1,
          isManager: true,
          directReports: []
        },
        {
          id: 'ceo-1',
          name: 'John CEO',
          email: 'ceo@example.com',
          position: 'Chief Executive Officer',
          department: 'Executive',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ceo',
          level: 0,
          isManager: true,
          directReports: []
        }
      ],
      'dev-3': [
        {
          id: 'manager-2',
          name: 'Eve Manager',
          email: 'eve@example.com',
          position: 'Backend Team Lead',
          department: 'Engineering',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=eve',
          level: 3,
          isManager: true,
          directReports: []
        },
        {
          id: 'director-2',
          name: 'David Director',
          email: 'david@example.com',
          position: 'Director of Backend',
          department: 'Engineering',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david',
          level: 2,
          isManager: true,
          directReports: []
        },
        {
          id: 'vp-1',
          name: 'Sarah VP',
          email: 'sarah@example.com',
          position: 'VP of Engineering',
          department: 'Engineering',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
          level: 1,
          isManager: true,
          directReports: []
        },
        {
          id: 'ceo-1',
          name: 'John CEO',
          email: 'ceo@example.com',
          position: 'Chief Executive Officer',
          department: 'Executive',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ceo',
          level: 0,
          isManager: true,
          directReports: []
        }
      ],
      'marketer-1': [
        {
          id: 'manager-3',
          name: 'Henry Manager',
          email: 'henry@example.com',
          position: 'Marketing Manager',
          department: 'Marketing',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=henry',
          level: 2,
          isManager: true,
          directReports: []
        },
        {
          id: 'vp-2',
          name: 'Grace VP',
          email: 'grace@example.com',
          position: 'VP of Marketing',
          department: 'Marketing',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=grace',
          level: 1,
          isManager: true,
          directReports: []
        },
        {
          id: 'ceo-1',
          name: 'John CEO',
          email: 'ceo@example.com',
          position: 'Chief Executive Officer',
          department: 'Executive',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ceo',
          level: 0,
          isManager: true,
          directReports: []
        }
      ]
    };
    
    const managerChain = mockManagerChains[employeeId] || [];
    
    res.json({ 
      success: true, 
      data: { 
        chain: managerChain, 
        levels: managerChain.length 
      } 
    });
  } catch (error) {
    console.error('Error fetching manager chain:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch manager chain' });
  }
});

// GET /api/v1/hierarchy/stats/:organizationId - Get hierarchy statistics
app.get('/api/v1/hierarchy/stats/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    // First, get the organization by ID to get the slug
    const orgQuery = 'SELECT id, slug FROM organizations WHERE id = $1';
    const orgResult = await query(orgQuery, [organizationId]);
    
    if (orgResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }
    
    const organization = orgResult.rows[0];
    
    // Get real hierarchy stats from database filtered by organization slug
    const statsQuery = `
      WITH role_counts AS (
        SELECT 
          r.name as role_name,
          COUNT(ur.user_id) as user_count
        FROM roles r
        LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = true
        LEFT JOIN users u ON ur.user_id = u.id 
        LEFT JOIN organizations o ON u.organization_id = o.id
        WHERE o.slug = $1
        GROUP BY r.id, r.name
      ),
      manager_count AS (
        SELECT COALESCE(user_count, 0) as count
        FROM role_counts 
        WHERE role_name = 'manager'
      ),
      employee_count AS (
        SELECT COALESCE(user_count, 0) as count
        FROM role_counts 
        WHERE role_name = 'employee'
      ),
      hierarchy_levels AS (
        WITH RECURSIVE hierarchy_tree AS (
          -- Find root managers (managers who are not employees in any relationship)
          SELECT 
            u.id,
            u.name,
            0 as level
          FROM users u
          LEFT JOIN organizations o ON u.organization_id = o.id
          WHERE o.slug = $1
            AND EXISTS (
              SELECT 1 FROM user_roles ur
              JOIN roles r ON ur.role_id = r.id
              WHERE ur.user_id = u.id AND ur.is_active = true AND r.name = 'manager'
            )
            AND NOT EXISTS (
              SELECT 1 FROM organizational_hierarchy oh
              LEFT JOIN organizations o2 ON oh.organization_id = o2.id
              WHERE oh.employee_id = u.id AND oh.is_active = true AND o2.slug = $1
            )
          
          UNION ALL
          
          -- Find employees reporting to managers
          SELECT 
            u.id,
            u.name,
            ht.level + 1
          FROM hierarchy_tree ht
          JOIN organizational_hierarchy oh ON oh.manager_id = ht.id
          JOIN users u ON oh.employee_id = u.id
          LEFT JOIN organizations o ON u.organization_id = o.id
          WHERE oh.is_active = true AND o.slug = $1
        )
        SELECT MAX(level) as max_depth
        FROM hierarchy_tree
      ),
      orphaned_employees AS (
        SELECT COUNT(*) as count
        FROM users u
        LEFT JOIN organizations o ON u.organization_id = o.id
        WHERE o.slug = $1
          AND NOT EXISTS (
            SELECT 1 FROM organizational_hierarchy oh
            LEFT JOIN organizations o2 ON oh.organization_id = o2.id
            WHERE oh.employee_id = u.id AND oh.is_active = true AND o2.slug = $1
          )
          AND NOT EXISTS (
            SELECT 1 FROM organizational_hierarchy oh
            LEFT JOIN organizations o2 ON oh.organization_id = o2.id
            WHERE oh.manager_id = u.id AND oh.is_active = true AND o2.slug = $1
          )
      )
      SELECT 
        (SELECT count FROM employee_count) as total_employees,
        (SELECT count FROM manager_count) as total_managers,
        CASE 
          WHEN (SELECT count FROM manager_count) > 0 
          THEN ROUND((SELECT count FROM employee_count)::numeric / (SELECT count FROM manager_count)::numeric, 1)
          ELSE 0 
        END as average_span_of_control,
        COALESCE((SELECT max_depth FROM hierarchy_levels), 0) as max_depth,
        COALESCE((SELECT count FROM orphaned_employees), 0) as orphaned_employees
    `;

    const result = await query(statsQuery, [organization.slug]);
    const stats = result.rows[0];
    
    res.json({ 
      success: true, 
      data: {
        totalEmployees: parseInt(stats.total_employees) || 0,
        totalManagers: parseInt(stats.total_managers) || 0,
        averageSpanOfControl: parseFloat(stats.average_span_of_control) || 0,
        maxDepth: parseInt(stats.max_depth) || 0,
        orphanedEmployees: parseInt(stats.orphaned_employees) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching hierarchy stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hierarchy stats' });
  }
});

// GET /api/v1/hierarchy/search-employees - Search employees for hierarchy assignment
app.get('/api/v1/hierarchy/search-employees', async (req, res) => {
  try {
    const { organizationId, q, exclude, role, type } = req.query;
    
    // Get real employees from database
    let searchQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.position,
        u.department,
        u.avatar_url,
        ARRAY_AGG(r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.organization_id = $1
    `;
    
    const queryParams = [organizationId];
    
    if (q && q.length >= 2) {
      searchQuery += ` AND (u.name ILIKE $2 OR u.email ILIKE $2)`;
      queryParams.push(`%${q}%`);
    }
    
    if (exclude) {
      const excludeIds = Array.isArray(exclude) ? exclude : [exclude];
      if (excludeIds.length > 0) {
        searchQuery += ` AND u.id NOT IN (${excludeIds.map((_, i) => `$${queryParams.length + i + 1}`).join(', ')})`;
        queryParams.push(...excludeIds);
      }
    }

    // Filter only managers when role=manager or type=manager is provided
    if ((role && role.toString().toLowerCase() === 'manager') || (type && type.toString().toLowerCase() === 'manager')) {
      searchQuery += ` AND EXISTS (
        SELECT 1
        FROM user_roles ur2
        JOIN roles r2 ON ur2.role_id = r2.id
        WHERE ur2.user_id = u.id
          AND ur2.is_active = true
          AND r2.name = 'manager'
      )`;
    }
    
    searchQuery += `
      GROUP BY u.id, u.name, u.email, u.position, u.department, u.avatar_url
      ORDER BY u.name ASC
      LIMIT 20
    `;
    
    const result = await query(searchQuery, queryParams);
    const allEmployees = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      position: row.position,
      department: row.department,
      avatarUrl: row.avatar_url,
      roles: row.roles.filter(role => role !== null)
    }));
    
    res.json({ success: true, data: allEmployees });
  } catch (error) {
    console.error('Error searching employees:', error);
    res.status(500).json({ success: false, error: 'Failed to search employees' });
  }
});

// POST /api/v1/hierarchy - Create hierarchy relationship
app.post('/api/v1/hierarchy', async (req, res) => {
  try {
    const { organizationId, managerId, employeeId, level, isDirectReport } = req.body;
    const hierarchyLevel = level !== undefined ? level : 1;

    // Store in database
    const result = await query(
      `
      INSERT INTO organizational_hierarchy 
      (organization_id, manager_id, employee_id, level, is_direct_report, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING id, organization_id, manager_id, employee_id, level, is_direct_report, is_active, created_at, updated_at
      `,
      [organizationId, managerId, employeeId, Number(hierarchyLevel) || 1, Boolean(isDirectReport)]
    );

    const newHierarchy = result.rows[0];
    res.json({ success: true, data: newHierarchy });
  } catch (error) {
    console.error('Error creating hierarchy:', error);
    res.status(500).json({ success: false, error: 'Failed to create hierarchy' });
  }
});

// PUT /api/v1/hierarchy/:id - Update hierarchy relationship
app.put('/api/v1/hierarchy/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { level, isDirectReport, isActive } = req.body;
    
    // Mock hierarchy update
    const updatedHierarchy = {
      id,
      organizationId: 'org-1',
      managerId: 'manager-1',
      employeeId: 'employee-1',
      level: level || 1,
      isDirectReport: isDirectReport !== undefined ? isDirectReport : true,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    res.json({ success: true, data: updatedHierarchy });
  } catch (error) {
    console.error('Error updating hierarchy:', error);
    res.status(500).json({ success: false, error: 'Failed to update hierarchy' });
  }
});

// DELETE /api/v1/hierarchy/:id - Delete hierarchy relationship
app.delete('/api/v1/hierarchy/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    res.json({ success: true, message: 'Hierarchy relationship deleted successfully' });
  } catch (error) {
    console.error('Error deleting hierarchy:', error);
    res.status(500).json({ success: false, error: 'Failed to delete hierarchy' });
  }
});

// POST /api/v1/hierarchy/bulk - Bulk update hierarchy relationships
app.post('/api/v1/hierarchy/bulk', async (req, res) => {
  try {
    const { organizationId, hierarchies } = req.body;
    
    // Mock bulk update
    const result = {
      created: hierarchies.length,
      updated: 0,
      errors: []
    };
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error bulk updating hierarchy:', error);
    res.status(500).json({ success: false, error: 'Failed to bulk update hierarchy' });
  }
});

// GET /api/v1/hierarchy/template - Download CSV template for hierarchy import
app.get('/api/v1/hierarchy/template', async (req, res) => {
  try {
    const csv = [
      'organization_name,organization_slug,employee_email,manager_email',
      'wix.com,premium,alice@wix.com,bob.manager@wix.com'
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="hierarchy-template.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ success: false, error: 'Failed to generate template' });
  }
});

// POST /api/v1/hierarchy/bulk/csv - Bulk create relationships from CSV
// Expected headers row: organization_name,organization_slug,employee_email,manager_email
app.post('/api/v1/hierarchy/bulk/csv', express.text({ type: [ 'text/csv', 'text/plain', 'application/octet-stream' ] }), async (req, res) => {
  try {
    const body = (req.body || '').toString();
    if (!body || body.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Empty CSV payload' });
    }

    const lines = body.replace(/\r/g, '').split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      return res.status(400).json({ success: false, error: 'No CSV rows found' });
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const orgNameIdx = header.indexOf('organization_name');
    const orgSlugIdx = header.indexOf('organization_slug');
    const empIdx = header.indexOf('employee_email');
    const mgrIdx = header.indexOf('manager_email');
    if (orgNameIdx === -1 || orgSlugIdx === -1 || empIdx === -1 || mgrIdx === -1) {
      return res.status(400).json({ success: false, error: 'CSV must include organization_name, organization_slug, employee_email, manager_email' });
    }

    let created = 0;
    let updated = 0;
    const errors: Array<{ row: number; employeeEmail: string; managerEmail: string; error: string }> = [];

    // Cache for organization name+slug -> id
    const orgCache = new Map<string, string>();
    // Cache for email -> user id per org
    const userCache = new Map<string, string>(); // key: `${orgId}:${email}`
    // Cache for role name -> role id
    const roleIdCache = new Map<string, string>();

    const getOrgIdByNameAndSlug = async (name: string, slug: string): Promise<string | null> => {
      const cacheKey = `${name.toLowerCase()}:${slug.toLowerCase()}`;
      const cached = orgCache.get(cacheKey);
      if (cached) return cached;
      const r = await query('SELECT id FROM organizations WHERE LOWER(name) = LOWER($1) AND LOWER(slug) = LOWER($2)', [name, slug]);
      if (r.rows.length === 0) return null;
      const id = r.rows[0].id;
      orgCache.set(cacheKey, id);
      return id;
    };

    const getUserIdByEmail = async (orgId: string, email: string): Promise<string | null> => {
      const key = `${orgId}:${email.toLowerCase()}`;
      const cached = userCache.get(key);
      if (cached) return cached;
      const r = await query('SELECT id FROM users WHERE organization_id = $1 AND LOWER(email) = LOWER($2)', [orgId, email]);
      if (r.rows.length === 0) return null;
      const id = r.rows[0].id;
      userCache.set(key, id);
      return id;
    };

    const getRoleIdByName = async (name: string): Promise<string | null> => {
      const key = name.toLowerCase();
      const cached = roleIdCache.get(key);
      if (cached) return cached;
      const r = await query('SELECT id FROM roles WHERE LOWER(name) = LOWER($1) LIMIT 1', [name]);
      if (r.rows.length === 0) return null;
      const id = r.rows[0].id;
      roleIdCache.set(key, id);
      return id;
    };

    const ensureUserHasRole = async (userId: string, orgId: string, roleName: string): Promise<void> => {
      const roleId = await getRoleIdByName(roleName);
      if (!roleId) return; // role not defined in DB; skip silently
      // Use ON CONFLICT to handle race conditions and existing inactive roles
      await query(
        `INSERT INTO user_roles (user_id, role_id, organization_id, is_active, granted_at) 
         VALUES ($1, $2, $3, true, NOW())
         ON CONFLICT (user_id, role_id, organization_id) DO UPDATE SET is_active = true, granted_at = NOW()`,
        [userId, roleId, orgId]
      );
    };

    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      if (!raw || raw.trim().length === 0) continue;
      const cols = raw.split(',');
      const organizationName = (cols[orgNameIdx] || '').trim();
      const organizationSlug = (cols[orgSlugIdx] || '').trim();
      const employeeEmail = (cols[empIdx] || '').trim();
      const managerEmail = (cols[mgrIdx] || '').trim();

      if (!organizationName || !organizationSlug || !employeeEmail || !managerEmail) {
        errors.push({ row: i + 1, employeeEmail, managerEmail, error: 'Missing required fields' });
        continue;
      }

      try {
        const orgId = await getOrgIdByNameAndSlug(organizationName, organizationSlug);
        if (!orgId) {
          errors.push({ row: i + 1, employeeEmail, managerEmail, error: `Organization not found: ${organizationName} (${organizationSlug})` });
          continue;
        }

        const employeeId = await getUserIdByEmail(orgId, employeeEmail);
        if (!employeeId) {
          errors.push({ row: i + 1, employeeEmail, managerEmail, error: 'Employee email not found in organization' });
          continue;
        }

        const managerId = await getUserIdByEmail(orgId, managerEmail);
        if (!managerId) {
          errors.push({ row: i + 1, employeeEmail, managerEmail, error: 'Manager email not found in organization' });
          continue;
        }

        // Ensure manager user has 'manager' role
        await ensureUserHasRole(managerId, orgId, 'manager');

        // Check if relationship already exists in database
        const existing = await query(
          'SELECT id FROM organizational_hierarchy WHERE organization_id = $1 AND manager_id = $2 AND employee_id = $3 AND is_active = true',
          [orgId, managerId, employeeId]
        );
        
        if (existing.rows.length === 0) {
          // Create new relationship in database
          await query(
            'INSERT INTO organizational_hierarchy (organization_id, manager_id, employee_id, level, is_direct_report, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())',
            [orgId, managerId, employeeId, 1, true]
          );
          created += 1;
        } else {
          updated += 0; // placeholder if we support updates later
        }
      } catch (err) {
        errors.push({ row: i + 1, employeeEmail, managerEmail, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    res.json({ success: true, data: { created, updated, errors } });
  } catch (error) {
    console.error('Error importing hierarchy CSV:', error);
    res.status(500).json({ success: false, error: 'Failed to import hierarchy CSV' });
  }
});

// GET /api/v1/hierarchy/validate/:organizationId - Validate hierarchy structure
app.get('/api/v1/hierarchy/validate/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    // Mock validation
    const validation = {
      isValid: true,
      errors: [],
      warnings: [
        'Some employees have multiple managers',
        'Circular reporting relationships detected'
      ]
    };
    
    res.json({ success: true, data: validation });
  } catch (error) {
    console.error('Error validating hierarchy:', error);
    res.status(500).json({ success: false, error: 'Failed to validate hierarchy' });
  }
});

// ==================
// FEEDBACK API ROUTES (Mock for now)
// ==================

// Mock feedback data - REMOVED (now using database)

// Mock analytics data - REMOVED (now using database)

// GET /api/v1/feedback - List feedback with filters
app.get('/api/v1/feedback', authenticateToken, async (req, res) => {
  try {
    const { toUserId, fromUserId, cycleId, status, reviewType, page = 1, limit = 20 } = req.query;

    // Get user context from authentication middleware
    const currentUserEmail = (req as any).user?.email;
    if (!currentUserEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Get user details from database
    const userQuery = `
      SELECT u.id, u.organization_id, u.name
      FROM users u
      WHERE u.email = $1
    `;
    const userResult = await query(userQuery, [currentUserEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const currentUserId = userResult.rows[0].id;
    const currentOrgId = userResult.rows[0].organization_id;
    
    // Build WHERE conditions for database query
    const whereConditions = ['fr.is_approved = true'];
    const queryParams: any[] = [];
    let paramCount = 0;

    // Add filters
    if (toUserId) {
      // Check if toUserId is an email or UUID
      if (toUserId.includes('@')) {
        // It's an email, need to get the user ID first
        const userQuery = `SELECT id FROM users WHERE email = $1`;
        const userResult = await query(userQuery, [toUserId]);
        if (userResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'User not found' });
        }
        whereConditions.push(`fr.recipient_id = $${++paramCount}`);
        queryParams.push(userResult.rows[0].id);
      } else {
        // It's a UUID, use directly
        whereConditions.push(`fr.recipient_id = $${++paramCount}`);
        queryParams.push(toUserId);
      }
    }
    if (fromUserId) {
      // Check if fromUserId is an email or UUID
      if (fromUserId.includes('@')) {
        // It's an email, need to get the user ID first
        const userQuery = `SELECT id FROM users WHERE email = $1`;
        const userResult = await query(userQuery, [fromUserId]);
        if (userResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'User not found' });
        }
        whereConditions.push(`fr.giver_id = $${++paramCount}`);
        queryParams.push(userResult.rows[0].id);
      } else {
        // It's a UUID, use directly
        whereConditions.push(`fr.giver_id = $${++paramCount}`);
        queryParams.push(fromUserId);
      }
    }
    if (cycleId) {
      whereConditions.push(`fr.cycle_id = $${++paramCount}`);
      queryParams.push(cycleId);
    }
    if (reviewType) {
      whereConditions.push(`frr.feedback_type = $${++paramCount}`);
      queryParams.push(reviewType);
    }

    // Add visibility and status filtering
    // - Drafts tab: only show user's own drafts (status='draft')
    // - Given tab: show feedback user gave, excluding drafts
    // - Received tab: show feedback user received, excluding drafts
    // - All tab: show all non-draft feedback user is involved in
    if (status === 'draft') {
      // Explicitly requesting drafts - only show user's own drafts
      whereConditions.push(`fr.giver_id = $${++paramCount}`);
      queryParams.push(currentUserId);
      whereConditions.push(`frr.status = 'draft'`);
    } else if (fromUserId) {
      // Viewing "given" feedback - exclude drafts unless status explicitly set
      whereConditions.push(`frr.status != 'draft'`);
    } else if (toUserId) {
      // Viewing "received" feedback - exclude drafts
      whereConditions.push(`frr.status != 'draft'`);
    } else {
      // "All" tab - show all feedback user is involved in (including drafts they created)
      whereConditions.push(`(fr.giver_id = $${++paramCount} OR (fr.recipient_id = $${paramCount} AND frr.status != 'draft'))`);
      queryParams.push(currentUserId);
    }
    
    // Add explicit status filter if provided (and not 'draft' which is handled above)
    if (status && status !== 'draft') {
      whereConditions.push(`frr.status = $${++paramCount}`);
      queryParams.push(status);
    }

    // Query feedback from database
    const feedbackQuery = `
      SELECT 
        fr.id,
        fr.request_id as "requestId",
        fr.giver_id as "giverId",
        fr.recipient_id as "recipientId",
        fr.cycle_id as "cycleId",
        fr.content,
        fr.rating,
        fr.color_classification as "colorClassification",
        fr.is_anonymous as "isAnonymous",
        fr.is_approved as "isApproved",
        fr.created_at as "createdAt",
        fr.updated_at as "updatedAt",
        frr.feedback_type as "reviewType",
        frr.status,
        frr.message,
        giver.name as "giverName",
        giver.email as "giverEmail",
        recipient.name as "recipientName",
        recipient.email as "recipientEmail"
      FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      LEFT JOIN users giver ON fr.giver_id = giver.id
      LEFT JOIN users recipient ON fr.recipient_id = recipient.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY fr.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    
    queryParams.push(limitNum, offset);

    const feedbackResult = await query(feedbackQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      WHERE ${whereConditions.join(' AND ')}
    `;
    const countResult = await query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset
    const total = parseInt(countResult.rows[0].total);

    // Transform database results to match expected format
    const paginatedData = feedbackResult.rows.map(row => {
      // Parse structured content from database
      let parsedContent;
      try {
        parsedContent = JSON.parse(row.content);
      } catch (error) {
        // Fallback for old format (plain text)
        parsedContent = {
          overallComment: row.content,
          strengths: [],
          areasForImprovement: [],
          specificExamples: [],
          recommendations: [],
          confidential: false
        };
      }

      return {
        id: row.id,
        cycleId: row.cycleId,
        fromUserId: row.giverId,
        fromUserEmail: row.giverEmail,
        toUserId: row.recipientId,
        toUserEmail: row.recipientEmail,
        fromUser: {
          id: row.giverId,
          name: row.giverName,
          email: row.giverEmail
        },
        toUser: {
          id: row.recipientId,
          name: row.recipientName,
          email: row.recipientEmail
        },
        reviewType: row.reviewType,
        status: row.status,
        colorClassification: row.colorClassification || null,
        content: {
          id: `content-${row.id}`,
          feedbackId: row.id,
          overallComment: parsedContent.overallComment || '',
          strengths: parsedContent.strengths || [],
          areasForImprovement: parsedContent.areasForImprovement || [],
          specificExamples: parsedContent.specificExamples || [],
          recommendations: parsedContent.recommendations || [],
          confidential: parsedContent.confidential || false,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        },
        ratings: row.rating ? [{
          id: `rating-${row.id}`,
          feedbackId: row.id,
          category: 'overall',
          subcategory: '',
          score: row.rating,
          maxScore: 5,
          weight: 1,
          comment: '',
          createdAt: row.createdAt
        }] : [],
        comments: [],
        goals: [],
        // Include acknowledgment if the feedback has been acknowledged
        ...(row.status === 'acknowledged' && {
          acknowledgment: {
            id: `ack-${row.id}`,
            feedbackId: row.id,
            userId: row.recipientId,
            acknowledgedAt: row.updatedAt,
            response: row.message || ''
          }
        }),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      };
    });

    // Fetch goals for all feedback items in one query
    const feedbackIds = paginatedData.map(f => f.id);
    if (feedbackIds.length > 0) {
      const goalsResult = await query(
        `SELECT id, feedback_response_id, title, description, category, priority, target_date, status, progress, created_at, updated_at
         FROM feedback_goals
         WHERE feedback_response_id = ANY($1)
         ORDER BY created_at ASC`,
        [feedbackIds]
      );
      
      // Group goals by feedback_response_id
      const goalsByFeedback = new Map<string, any[]>();
      for (const g of goalsResult.rows) {
        const goals = goalsByFeedback.get(g.feedback_response_id) || [];
        goals.push({
          id: g.id,
          feedbackId: g.feedback_response_id,
          title: g.title,
          description: g.description,
          category: g.category,
          priority: g.priority,
          targetDate: g.target_date,
          status: g.status,
          progress: g.progress,
          createdAt: g.created_at,
          updatedAt: g.updated_at
        });
        goalsByFeedback.set(g.feedback_response_id, goals);
      }
      
      // Assign goals to each feedback item
      for (const feedback of paginatedData) {
        feedback.goals = goalsByFeedback.get(feedback.id) || [];
      }
    }
    
    // PRIVACY: Hide colorClassification from receiver (only giver and managers can see it)
    // For each feedback item, if current user is the recipient (not the giver), remove colorClassification
    for (const feedback of paginatedData) {
      if (feedback.toUserId === currentUserId && feedback.fromUserId !== currentUserId) {
        delete feedback.colorClassification;
      }
    }
    
    res.json({
      success: true,
      data: {
        data: paginatedData,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feedback' });
  }
});

// GET /api/v1/feedback/stats - Get feedback stats
app.get('/api/v1/feedback/stats', authenticateToken, async (req, res) => {
  try {
    // Get user context from authentication middleware
    const currentUserEmail = (req as any).user?.email;
    if (!currentUserEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Get user details from database
    const userQuery = `
      SELECT u.id, u.organization_id, u.name
      FROM users u
      WHERE u.email = $1
    `;
    const userResult = await query(userQuery, [currentUserEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const currentUserId = userResult.rows[0].id;
    
    // Query feedback statistics from database
    // Note: "given" excludes drafts to match the list view
    const statsQuery = `
      WITH feedback_stats AS (
        SELECT 
          COUNT(CASE WHEN fr.giver_id = $1 AND frr.status != 'draft' THEN 1 END) as given,
          COUNT(CASE WHEN fr.recipient_id = $1 AND frr.status != 'draft' THEN 1 END) as received,
          COUNT(CASE WHEN fr.recipient_id = $1 AND frr.status = 'submitted' THEN 1 END) as pending,
          COUNT(CASE WHEN fr.giver_id = $1 AND frr.status = 'draft' THEN 1 END) as drafts,
          AVG(CASE WHEN fr.recipient_id = $1 AND fr.rating IS NOT NULL THEN fr.rating END) as avg_rating
        FROM feedback_responses fr
        JOIN feedback_requests frr ON fr.request_id = frr.id
        WHERE fr.is_approved = true
      )
      SELECT 
        COALESCE(given, 0) as given,
        COALESCE(received, 0) as received,
        COALESCE(pending, 0) as pending,
        COALESCE(drafts, 0) as drafts,
        COALESCE(avg_rating, 0) as average_rating
      FROM feedback_stats
    `;
    
    const statsResult = await query(statsQuery, [currentUserId]);
    const stats = statsResult.rows[0];
    
    res.json({
      success: true,
      data: {
        given: parseInt(stats.given),
        received: parseInt(stats.received),
        pending: parseInt(stats.pending),
        drafts: parseInt(stats.drafts),
        averageRating: parseFloat(stats.average_rating) || 0,
        completionRate: 0.85 // Keep this as a placeholder for now
      }
    });
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feedback stats' });
  }
});

// GET /api/v1/feedback/:id - Get specific feedback
app.get('/api/v1/feedback/:id', authenticateToken, async (req, res) => {
  try {
    const feedbackId = req.params.id;
    
    // Get user context from authentication middleware
    const currentUserEmail = (req as any).user?.email;
    if (!currentUserEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Get user details from database
    const userQuery = `
      SELECT u.id, u.organization_id, u.name
      FROM users u
      WHERE u.email = $1
    `;
    const userResult = await query(userQuery, [currentUserEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const currentUserId = userResult.rows[0].id;
    const currentOrgId = userResult.rows[0].organization_id;
    
    // Check if user is a manager
    const rolesQuery = `
      SELECT r.name 
      FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = $1 AND ur.organization_id = $2 AND ur.is_active = true
    `;
    const rolesResult = await query(rolesQuery, [currentUserId, currentOrgId]);
    const userRoles = rolesResult.rows.map(row => row.name);
    const isManager = userRoles.includes('manager');
    
    // Get team member IDs if user is a manager
    let teamMemberIds: string[] = [];
    if (isManager) {
      teamMemberIds = await getManagerEmployeeTree(currentUserId);
    }
    
    // Query feedback from database with manager access control
    const feedbackQuery = `
      SELECT 
        fr.id,
        fr.request_id as "requestId",
        fr.giver_id as "giverId",
        fr.recipient_id as "recipientId",
        fr.cycle_id as "cycleId",
        fr.content,
        fr.rating,
        fr.color_classification as "colorClassification",
        fr.is_anonymous as "isAnonymous",
        fr.is_approved as "isApproved",
        fr.created_at as "createdAt",
        fr.updated_at as "updatedAt",
        frr.feedback_type as "reviewType",
        frr.status,
        frr.message,
        giver.name as "giverName",
        giver.email as "giverEmail",
        recipient.name as "recipientName",
        recipient.email as "recipientEmail"
      FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      LEFT JOIN users giver ON fr.giver_id = giver.id
      LEFT JOIN users recipient ON fr.recipient_id = recipient.id
      WHERE fr.id = $1 AND fr.is_approved = true
        AND (
          fr.giver_id = $2 OR 
          (fr.recipient_id = $2 AND frr.status != 'draft')
          ${isManager && teamMemberIds.length > 0 ? 'OR fr.giver_id = ANY($3)' : ''}
        )
    `;

    const queryParams = isManager && teamMemberIds.length > 0 
      ? [feedbackId, currentUserId, teamMemberIds]
      : [feedbackId, currentUserId];
    
    const feedbackResult = await query(feedbackQuery, queryParams);
    
    if (feedbackResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Feedback not found' });
    }

    const row = feedbackResult.rows[0];
    
    // Parse structured content from database
    let parsedContent;
    try {
      parsedContent = JSON.parse(row.content);
    } catch (error) {
      // Fallback for old format (plain text)
      parsedContent = {
        overallComment: row.content,
        strengths: [],
        areasForImprovement: [],
        specificExamples: [],
        recommendations: [],
        confidential: false
      };
    }
    
    // Transform database result to match expected format
    const feedback = {
      id: row.id,
      cycleId: row.cycleId,
      fromUserId: row.giverId,
      fromUserEmail: row.giverEmail,
      toUserId: row.recipientId,
      toUserEmail: row.recipientEmail,
      fromUser: {
        id: row.giverId,
        name: row.giverName,
        email: row.giverEmail
      },
      toUser: {
        id: row.recipientId,
        name: row.recipientName,
        email: row.recipientEmail
      },
      reviewType: row.reviewType,
      status: row.status,
      // Include colorClassification only for giver or manager (will be filtered in Step 5)
      colorClassification: row.colorClassification || null,
      content: {
        id: `content-${row.id}`,
        feedbackId: row.id,
        overallComment: parsedContent.overallComment || '',
        strengths: parsedContent.strengths || [],
        areasForImprovement: parsedContent.areasForImprovement || [],
        specificExamples: parsedContent.specificExamples || [],
        recommendations: parsedContent.recommendations || [],
        confidential: parsedContent.confidential || false,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      },
      ratings: row.rating ? [{
        id: `rating-${row.id}`,
        feedbackId: row.id,
        category: 'overall',
        subcategory: '',
        score: row.rating,
        maxScore: 5,
        weight: 1,
        comment: '',
        createdAt: row.createdAt
      }] : [],
      comments: [],
      goals: [], // Will be populated below
      // Include acknowledgment if the feedback has been completed and has a message
      ...((row.status === 'completed' || row.status === 'acknowledged') && row.message && {
        acknowledgment: {
          id: `ack-${row.id}`,
          feedbackId: row.id,
          userId: row.recipientId,
          acknowledgedAt: row.updatedAt,
          response: row.message || ''
        }
      }),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };

    // Fetch goals from database
    const goalsResult = await query(
      `SELECT id, feedback_response_id, title, description, category, priority, target_date, status, progress, created_at, updated_at
       FROM feedback_goals
       WHERE feedback_response_id = $1
       ORDER BY created_at ASC`,
      [row.id]
    );
    
    feedback.goals = goalsResult.rows.map((g: any) => ({
      id: g.id,
      feedbackId: g.feedback_response_id,
      title: g.title,
      description: g.description,
      category: g.category,
      priority: g.priority,
      targetDate: g.target_date,
      status: g.status,
      progress: g.progress,
      createdAt: g.created_at,
      updatedAt: g.updated_at
    }));
    
    // PRIVACY: Hide colorClassification from receiver (only giver and managers can see it)
    // If current user is the recipient and NOT the giver, remove colorClassification
    if (currentUserId === row.recipientId && currentUserId !== row.giverId) {
      delete (feedback as any).colorClassification;
    }
    
    res.json({ success: true, data: feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feedback' });
  }
});

// POST /api/v1/feedback - Create feedback
app.post('/api/v1/feedback', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Creating feedback with body:', JSON.stringify(req.body, null, 2));
    const { cycleId, toUserEmail, recipientId, reviewType, content, ratings, rating, comment, categories, goals = [], colorClassification } = req.body;

    // Get user context from authentication middleware
    const currentUserEmail = (req as any).user?.email;
    if (!currentUserEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Get user details from database
    const userQuery = `
      SELECT u.id, u.organization_id, u.name
      FROM users u
      WHERE u.email = $1
    `;
    const userResult = await query(userQuery, [currentUserEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    console.log('🔍 User found:', userResult.rows[0]);
    const currentUserId = userResult.rows[0].id;
    const currentOrgId = userResult.rows[0].organization_id;
    const currentUserName = userResult.rows[0].name;

    // Resolve user roles from DB to ensure manager permission
    const getRolesForUser = async (userIdOrEmail: string, orgId: string): Promise<string[]> => {
      try {
        // If headers provide id, prefer it; else resolve by email
        let userId = currentUserId;
        if (!userId) {
          const r = await query('SELECT id FROM users WHERE email = $1 AND organization_id = $2 LIMIT 1', [userIdOrEmail, orgId]);
          userId = r.rows[0]?.id || '';
        }
        if (!userId) return [];
        const rr = await query(
          'SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 AND ur.organization_id = $2 AND ur.is_active = true',
          [userId, orgId]
        );
        return rr.rows.map((row: any) => String(row.name));
      } catch {
        return [];
      }
    };

    const roles = await getRolesForUser(currentUserEmail || currentUserId, currentOrgId);
    const isManager = roles.includes('manager');

    // Resolve target employee id by email or ID
    let targetUserId: string;
    if (recipientId) {
      // If recipientId is provided, use it directly
      const targetUser = await query('SELECT id, email FROM users WHERE id = $1 AND organization_id = $2 LIMIT 1', [recipientId, currentOrgId]);
      if (targetUser.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'Target user not found in organization' });
      }
      targetUserId = targetUser.rows[0].id as string;
    } else if (toUserEmail) {
      // If toUserEmail is provided, resolve by email
      const targetUser = await query('SELECT id, email FROM users WHERE email = $1 AND organization_id = $2 LIMIT 1', [toUserEmail, currentOrgId]);
      if (targetUser.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'Target user not found in organization' });
      }
      targetUserId = targetUser.rows[0].id as string;
    } else {
      return res.status(400).json({ success: false, error: 'Either recipientId or toUserEmail must be provided' });
    }

    // Permission logic based on review type
    if (reviewType === 'manager_review') {
      // Manager reviews: only managers can give feedback to their direct reports
      if (!isManager) {
        return res.status(403).json({ success: false, error: 'Only managers can give manager reviews' });
      }

      // Check direct-report relationship in database
      const directRelationQuery = `
        SELECT 1 FROM organizational_hierarchy 
        WHERE organization_id = $1 AND manager_id = $2 AND employee_id = $3 AND is_active = true
      `;
      const directRelationResult = await query(directRelationQuery, [currentOrgId, currentUserId, targetUserId]);
      if (directRelationResult.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Manager reviews can only be given to direct reports' });
      }
    } else if (reviewType === 'peer_review' || reviewType === 'project_review') {
      // Peer and project reviews: anyone in the organization can give feedback to anyone
      // No additional permission checks needed - just ensure they're in the same organization
      // (already checked above when finding the target user)
    } else if (reviewType === 'self_assessment') {
      // Self assessments: only to self
      if (currentUserId !== targetUserId) {
        return res.status(403).json({ success: false, error: 'Self assessments can only be given to yourself' });
      }
    } else if (reviewType === 'upward_review') {
      // Upward reviews: employees can give feedback to their managers
      if (isManager) { // Managers cannot give upward reviews
        return res.status(403).json({ success: false, error: 'Upward reviews can only be given by employees to managers' });
      }
      // Check if target is current user's manager in database
      const managerRelationQuery = `
        SELECT 1 FROM organizational_hierarchy 
        WHERE organization_id = $1 AND employee_id = $2 AND manager_id = $3 AND is_active = true
      `;
      const managerRelationResult = await query(managerRelationQuery, [currentOrgId, currentUserId, targetUserId]);
      if (managerRelationResult.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Upward reviews can only be given to your manager' });
      }
    } else if (reviewType === 'three_sixty_review') {
      // 360 reviews: anyone in the organization can give feedback to anyone
      // No additional permission checks needed
    } else {
      // For other review types, use the original logic (manager only, direct reports only)
      if (!isManager) {
        return res.status(403).json({ success: false, error: 'Only managers can give feedback' });
      }

      // Check direct-report relationship in database
      const directRelationQuery = `
        SELECT 1 FROM organizational_hierarchy 
        WHERE organization_id = $1 AND manager_id = $2 AND employee_id = $3 AND is_active = true
      `;
      const directRelationResult = await query(directRelationQuery, [currentOrgId, currentUserId, targetUserId]);
      if (directRelationResult.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Manager is not authorized to give feedback to this user' });
      }
    }

    // Get the default cycle ID if not provided
    let cycleIdToUse = cycleId;
    if (!cycleIdToUse) {
      const cycleResult = await query(
        'SELECT id FROM feedback_cycles WHERE organization_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
        [currentOrgId, 'active']
      );
      if (cycleResult.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'No active feedback cycle found' });
      }
      cycleIdToUse = cycleResult.rows[0].id;
    }

    // Map review types to database allowed values
    const feedbackTypeMap: { [key: string]: string } = {
      'manager_review': 'manager',
      'peer_review': 'peer',
      'project_review': 'peer', // Map project review to peer
      'self_assessment': 'self',
      'upward_review': 'peer', // Map upward review to peer
      'three_sixty_review': '360'
    };
    
    const dbFeedbackType = feedbackTypeMap[reviewType] || 'peer';

    // Create feedback request in database
    const requestResult = await query(
      `INSERT INTO feedback_requests 
       (cycle_id, requester_id, recipient_id, feedback_type, status, message, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, cycle_id, requester_id, recipient_id, feedback_type, status, message, due_date, created_at, updated_at`,
      [
        cycleIdToUse,
        currentUserId,
        targetUserId,
        dbFeedbackType,
        'draft', // Mark as draft when feedback is first created
        content?.overallComment || comment || '',
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      ]
    );

    const requestId = requestResult.rows[0].id;

    // Create structured content object for database storage
    const structuredContent = {
      overallComment: content?.overallComment || comment || '',
      strengths: content?.strengths || [],
      areasForImprovement: content?.areasForImprovement || [],
      specificExamples: content?.specificExamples || [],
      recommendations: content?.recommendations || [],
      confidential: content?.confidential || false
    };

    // Create feedback response in database
    const responseResult = await query(
      `INSERT INTO feedback_responses 
       (request_id, giver_id, recipient_id, cycle_id, content, rating, is_anonymous, is_approved, color_classification, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id, request_id, giver_id, recipient_id, cycle_id, content, rating, is_anonymous, is_approved, color_classification, created_at, updated_at`,
      [
        requestId,
        currentUserId,
        targetUserId,
        cycleIdToUse,
        JSON.stringify(structuredContent), // Store structured content as JSON
        rating || (ratings && ratings.length > 0 ? ratings[0].score || ratings[0].rating : null),
        false, // is_anonymous
        true,  // is_approved (auto-approve for now)
        colorClassification || null // Internal triage color (green/yellow/red)
      ]
    );

    const responseId = responseResult.rows[0].id;

    // Save development goals to database
    const savedGoals: any[] = [];
    if (goals && goals.length > 0) {
      console.log('💾 Saving', goals.length, 'development goals to database');
      for (const goal of goals) {
        const goalResult = await query(
          `INSERT INTO feedback_goals 
           (feedback_response_id, title, description, category, priority, target_date, status, progress)
           VALUES ($1, $2, $3, $4, $5, $6, 'not_started', 0)
           RETURNING id, feedback_response_id, title, description, category, priority, target_date, status, progress, created_at, updated_at`,
          [
            responseId,
            goal.title,
            goal.description || '',
            goal.category || 'development',
            goal.priority || 'medium',
            goal.targetDate ? new Date(goal.targetDate) : null
          ]
        );
        savedGoals.push(goalResult.rows[0]);
      }
      console.log('✅ Saved', savedGoals.length, 'development goals');
    }

    // Fetch user names for both giver and recipient
    const [giverResult, recipientResult] = await Promise.all([
      query('SELECT name, email FROM users WHERE id = $1', [currentUserId]),
      query('SELECT name, email FROM users WHERE id = $1', [targetUserId])
    ]);
    
    const giverName = giverResult.rows[0]?.name;
    const recipientName = recipientResult.rows[0]?.name;
    const recipientEmail = toUserEmail || recipientResult.rows[0]?.email;

    // Create the response object in the same format as before for compatibility
    const newFeedback = {
      id: responseId,
      cycleId: cycleIdToUse,
      fromUserId: currentUserId,
      fromUserEmail: currentUserEmail,
      toUserId: targetUserId,
      toUserEmail: recipientEmail,
      fromUser: {
        id: currentUserId,
        name: giverName,
        email: currentUserEmail
      },
      toUser: {
        id: targetUserId,
        name: recipientName,
        email: recipientEmail
      },
      reviewType,
      status: requestResult.rows[0].status, // Use actual status from database
      colorClassification: colorClassification || null, // Internal triage color (green/yellow/red)
      content: {
        id: `content-${responseId}`,
        feedbackId: responseId,
        overallComment: content?.overallComment || comment || '',
        strengths: content?.strengths || [],
        areasForImprovement: content?.areasForImprovement || [],
        specificExamples: content?.specificExamples || [],
        recommendations: content?.recommendations || [],
        confidential: content?.confidential || false,
        createdAt: responseResult.rows[0].created_at,
        updatedAt: responseResult.rows[0].updated_at
      },
      ratings: (ratings && ratings.length > 0 ? ratings : (rating ? [{ category: 'overall', score: rating, maxScore: 5 }] : [])).map((r: any, idx: number) => ({
        id: `rating-${responseId}-${idx}`,
        feedbackId: responseId,
        category: r.category || 'overall',
        subcategory: r.subcategory || '',
        score: r.score || r.rating || rating || 0,
        maxScore: r.maxScore || 5,
        weight: r.weight || 1,
        comment: r.comment || '',
        createdAt: responseResult.rows[0].created_at
      })),
      comments: [],
      goals: savedGoals.map((g: any) => ({
        id: g.id,
        feedbackId: responseId,
        title: g.title,
        description: g.description,
        category: g.category,
        priority: g.priority,
        targetDate: g.target_date,
        status: g.status,
        progress: g.progress,
        createdAt: g.created_at,
        updatedAt: g.updated_at
      })),
      createdAt: responseResult.rows[0].created_at,
      updatedAt: responseResult.rows[0].updated_at
    };

    // Create notification for the feedback receiver
    await createFeedbackNotification(
      targetUserId,
      currentOrgId,
      'Feedback Created',
      `${currentUserName || currentUserEmail} has started writing feedback for you.`,
      {
        fromUserId: currentUserId,
        fromUserName: currentUserName,
        cycleId: cycleIdToUse,
        type: 'feedback_created'
      }
    );
    
    res.status(201).json({ success: true, data: newFeedback });
  } catch (error) {
    console.error('Error creating feedback:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ success: false, error: 'Failed to create feedback', details: error.message });
  }
});

// PUT /api/v1/feedback/:id - Update feedback
app.put('/api/v1/feedback/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Get user context from authentication middleware
    const currentUserEmail = (req as any).user?.email;
    if (!currentUserEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Get user details from database
    const userQuery = `
      SELECT u.id, u.organization_id, u.name
      FROM users u
      WHERE u.email = $1
    `;
    const userResult = await query(userQuery, [currentUserEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const currentUserId = userResult.rows[0].id;
    
    // Check if feedback exists, user is the giver, and status is draft
    const feedbackCheckQuery = `
      SELECT fr.id, fr.giver_id, frr.status
      FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      WHERE fr.id = $1 AND fr.giver_id = $2 AND frr.status = 'draft'
    `;
    const feedbackResult = await query(feedbackCheckQuery, [id, currentUserId]);
    
    if (feedbackResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Only draft feedback can be edited' 
      });
    }
    
    // Build the structured content object for update
    const structuredContent = typeof updates.content === 'object' ? {
      overallComment: updates.content.overallComment || '',
      strengths: updates.content.strengths || [],
      areasForImprovement: updates.content.areasForImprovement || [],
      specificExamples: updates.content.specificExamples || [],
      recommendations: updates.content.recommendations || [],
      confidential: updates.content.confidential || false
    } : updates.content;
    
    // Update the feedback in database
    const updateQuery = `
      UPDATE feedback_responses 
      SET content = $1, rating = $2, color_classification = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING id, content, rating, color_classification, updated_at
    `;
    
    const updateResult = await query(updateQuery, [
      typeof structuredContent === 'object' ? JSON.stringify(structuredContent) : structuredContent,
      updates.rating || updates.ratings?.[0]?.score || null,
      updates.colorClassification || null, // Internal triage color (green/yellow/red)
      id
    ]);
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Feedback not found' });
    }
    
    // Fetch the complete updated feedback with all related data
    const fullFeedbackQuery = `
      SELECT 
        fr.id,
        fr.request_id as "requestId",
        fr.giver_id as "giverId",
        fr.recipient_id as "recipientId",
        fr.cycle_id as "cycleId",
        fr.content,
        fr.rating,
        fr.color_classification as "colorClassification",
        fr.is_anonymous as "isAnonymous",
        fr.is_approved as "isApproved",
        fr.created_at as "createdAt",
        fr.updated_at as "updatedAt",
        frr.feedback_type as "reviewType",
        frr.status,
        frr.message,
        giver.name as "giverName",
        giver.email as "giverEmail",
        recipient.name as "recipientName",
        recipient.email as "recipientEmail",
        fc.name as "cycleName"
      FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      LEFT JOIN users giver ON fr.giver_id = giver.id
      LEFT JOIN users recipient ON fr.recipient_id = recipient.id
      LEFT JOIN feedback_cycles fc ON fr.cycle_id = fc.id
      WHERE fr.id = $1
    `;
    
    const fullResult = await query(fullFeedbackQuery, [id]);
    const row = fullResult.rows[0];
    
    // Parse content
    let parsedContent = {};
    try {
      parsedContent = typeof row.content === 'string' ? JSON.parse(row.content) : (row.content || {});
    } catch (e) {
      parsedContent = { overallComment: row.content || '' };
    }
    
    res.json({ 
      success: true, 
      data: {
        id: row.id,
        requestId: row.requestId,
        cycleId: row.cycleId,
        cycleName: row.cycleName,
        fromUserId: row.giverId,
        fromUserEmail: row.giverEmail,
        toUserId: row.recipientId,
        toUserEmail: row.recipientEmail,
        fromUser: {
          id: row.giverId,
          name: row.giverName,
          email: row.giverEmail
        },
        toUser: {
          id: row.recipientId,
          name: row.recipientName,
          email: row.recipientEmail
        },
        reviewType: row.reviewType,
        status: row.status,
        colorClassification: row.colorClassification || null,
        content: {
          id: `content-${row.id}`,
          feedbackId: row.id,
          overallComment: parsedContent.overallComment || '',
          strengths: parsedContent.strengths || [],
          areasForImprovement: parsedContent.areasForImprovement || [],
          specificExamples: parsedContent.specificExamples || [],
          recommendations: parsedContent.recommendations || [],
          confidential: parsedContent.confidential || false,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        },
        ratings: row.rating ? [{
          id: `rating-${row.id}`,
          feedbackId: row.id,
          category: 'overall',
          score: row.rating,
          maxScore: 5,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        }] : [],
        comments: [],
        goals: [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        isAnonymous: row.isAnonymous,
        isApproved: row.isApproved
      }
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to update feedback' });
  }
});

// POST /api/v1/feedback/:id/submit - Submit feedback
app.post('/api/v1/feedback/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user context from authentication middleware
    const currentUserEmail = (req as any).user?.email;
    if (!currentUserEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Get user details from database
    const userQuery = `
      SELECT u.id, u.organization_id, u.name
      FROM users u
      WHERE u.email = $1
    `;
    const userResult = await query(userQuery, [currentUserEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const currentUserId = userResult.rows[0].id;
    
    // Check if feedback exists, user is the giver, and status is draft
    const feedbackCheckQuery = `
      SELECT fr.id, fr.giver_id, frr.status
      FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      WHERE fr.id = $1 AND fr.giver_id = $2 AND frr.status = 'draft'
    `;
    const feedbackResult = await query(feedbackCheckQuery, [id, currentUserId]);
    
    if (feedbackResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Draft feedback not found or you are not the creator' 
      });
    }
    
    // Update feedback request status to submitted
    const updateQuery = `
      UPDATE feedback_requests 
      SET status = 'submitted', updated_at = NOW()
      WHERE id = (
        SELECT request_id FROM feedback_responses WHERE id = $1
      )
      RETURNING id, status, updated_at
    `;
    
    const updateResult = await query(updateQuery, [id]);
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Feedback not found' });
    }
    
    // Fetch the complete updated feedback with all related data
    const fullFeedbackQuery = `
      SELECT 
        fr.id,
        fr.request_id as "requestId",
        fr.giver_id as "giverId",
        fr.recipient_id as "recipientId",
        fr.cycle_id as "cycleId",
        fr.content,
        fr.rating,
        fr.color_classification as "colorClassification",
        fr.is_anonymous as "isAnonymous",
        fr.is_approved as "isApproved",
        fr.created_at as "createdAt",
        fr.updated_at as "updatedAt",
        frr.feedback_type as "reviewType",
        frr.status,
        frr.message,
        giver.name as "giverName",
        giver.email as "giverEmail",
        recipient.name as "recipientName",
        recipient.email as "recipientEmail",
        fc.name as "cycleName"
      FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      LEFT JOIN users giver ON fr.giver_id = giver.id
      LEFT JOIN users recipient ON fr.recipient_id = recipient.id
      LEFT JOIN feedback_cycles fc ON fr.cycle_id = fc.id
      WHERE fr.id = $1
    `;
    
    const fullResult = await query(fullFeedbackQuery, [id]);
    const row = fullResult.rows[0];
    
    // Parse content
    let parsedContent = {};
    try {
      parsedContent = typeof row.content === 'string' ? JSON.parse(row.content) : (row.content || {});
    } catch (e) {
      parsedContent = { overallComment: row.content || '' };
    }
    
    res.json({ 
      success: true, 
      data: {
        id: row.id,
        requestId: row.requestId,
        cycleId: row.cycleId,
        cycleName: row.cycleName,
        fromUserId: row.giverId,
        fromUserEmail: row.giverEmail,
        toUserId: row.recipientId,
        toUserEmail: row.recipientEmail,
        fromUser: {
          id: row.giverId,
          name: row.giverName,
          email: row.giverEmail
        },
        toUser: {
          id: row.recipientId,
          name: row.recipientName,
          email: row.recipientEmail
        },
        reviewType: row.reviewType,
        status: row.status,
        colorClassification: row.colorClassification || null,
        content: {
          id: `content-${row.id}`,
          feedbackId: row.id,
          overallComment: parsedContent.overallComment || '',
          strengths: parsedContent.strengths || [],
          areasForImprovement: parsedContent.areasForImprovement || [],
          specificExamples: parsedContent.specificExamples || [],
          recommendations: parsedContent.recommendations || [],
          confidential: parsedContent.confidential || false,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        },
        ratings: row.rating ? [{
          id: `rating-${row.id}`,
          feedbackId: row.id,
          category: 'overall',
          score: row.rating,
          maxScore: 5,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        }] : [],
        comments: [],
        goals: [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        isAnonymous: row.isAnonymous,
        isApproved: row.isApproved
      }
    });

    // Create notification for the feedback giver (confirming submission)
    // Get giver's organization for notification
    const giverOrgResult = await query('SELECT organization_id FROM users WHERE id = $1', [row.giverId]);
    const giverOrgId = giverOrgResult.rows[0]?.organization_id;

    await createFeedbackNotification(
      row.giverId,
      giverOrgId,
      'Feedback Submitted',
      `Your feedback for ${row.recipientName || row.recipientEmail} has been successfully submitted.`,
      {
        toUserId: row.recipientId,
        toUserName: row.recipientName,
        cycleId: row.cycleId,
        type: 'feedback_submitted'
      }
    );
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to submit feedback' });
  }
});

// POST /api/v1/feedback/:id/complete - Mark feedback as complete
app.post('/api/v1/feedback/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user context from authentication middleware
    const currentUserEmail = (req as any).user?.email;
    if (!currentUserEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Get user details from database
    const userQuery = `
      SELECT u.id, u.organization_id, u.name
      FROM users u
      WHERE u.email = $1
    `;
    const userResult = await query(userQuery, [currentUserEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const currentUserId = userResult.rows[0].id;
    
    // Check if feedback exists, user is the giver, and status is submitted
    const feedbackCheckQuery = `
      SELECT fr.id, fr.giver_id, frr.status
      FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      WHERE fr.id = $1 AND fr.giver_id = $2 AND frr.status = 'submitted'
    `;
    const feedbackResult = await query(feedbackCheckQuery, [id, currentUserId]);
    
    if (feedbackResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Submitted feedback not found or you are not the creator' 
      });
    }
    
    // Update feedback request status to completed
    const updateQuery = `
      UPDATE feedback_requests 
      SET status = 'completed', updated_at = NOW()
      WHERE id = (
        SELECT request_id FROM feedback_responses WHERE id = $1
      )
      RETURNING id, status, updated_at
    `;
    
    const updateResult = await query(updateQuery, [id]);
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Feedback not found' });
    }
    
    // Fetch the complete updated feedback with all related data
    const fullFeedbackQuery = `
      SELECT 
        fr.id,
        fr.request_id as "requestId",
        fr.giver_id as "giverId",
        fr.recipient_id as "recipientId",
        fr.cycle_id as "cycleId",
        fr.content,
        fr.rating,
        fr.color_classification as "colorClassification",
        fr.is_anonymous as "isAnonymous",
        fr.is_approved as "isApproved",
        fr.created_at as "createdAt",
        fr.updated_at as "updatedAt",
        frr.feedback_type as "reviewType",
        frr.status,
        frr.message,
        giver.name as "giverName",
        giver.email as "giverEmail",
        recipient.name as "recipientName",
        recipient.email as "recipientEmail",
        fc.name as "cycleName"
      FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      LEFT JOIN users giver ON fr.giver_id = giver.id
      LEFT JOIN users recipient ON fr.recipient_id = recipient.id
      LEFT JOIN feedback_cycles fc ON fr.cycle_id = fc.id
      WHERE fr.id = $1
    `;
    
    const fullResult = await query(fullFeedbackQuery, [id]);
    const row = fullResult.rows[0];
    
    // Parse content
    let parsedContent = {};
    try {
      parsedContent = typeof row.content === 'string' ? JSON.parse(row.content) : (row.content || {});
    } catch (e) {
      parsedContent = { overallComment: row.content || '' };
    }
    
    res.json({ 
      success: true, 
      data: {
        id: row.id,
        requestId: row.requestId,
        cycleId: row.cycleId,
        cycleName: row.cycleName,
        fromUserId: row.giverId,
        fromUserEmail: row.giverEmail,
        toUserId: row.recipientId,
        toUserEmail: row.recipientEmail,
        fromUser: {
          id: row.giverId,
          name: row.giverName,
          email: row.giverEmail
        },
        toUser: {
          id: row.recipientId,
          name: row.recipientName,
          email: row.recipientEmail
        },
        reviewType: row.reviewType,
        status: row.status,
        colorClassification: row.colorClassification || null,
        content: {
          id: `content-${row.id}`,
          feedbackId: row.id,
          overallComment: parsedContent.overallComment || '',
          strengths: parsedContent.strengths || [],
          areasForImprovement: parsedContent.areasForImprovement || [],
          specificExamples: parsedContent.specificExamples || [],
          recommendations: parsedContent.recommendations || [],
          confidential: parsedContent.confidential || false,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        },
        ratings: row.rating ? [{
          id: `rating-${row.id}`,
          feedbackId: row.id,
          category: 'overall',
          score: row.rating,
          maxScore: 5,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        }] : [],
        comments: [],
        goals: [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        isAnonymous: row.isAnonymous,
        isApproved: row.isApproved
      }
    });
  } catch (error) {
    console.error('Error completing feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to complete feedback' });
  }
});

// DELETE /api/v1/feedback/:id - Delete draft feedback
app.delete('/api/v1/feedback/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user context from authentication middleware
    const currentUserEmail = (req as any).user?.email;
    if (!currentUserEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Get user details from database
    const userQuery = `
      SELECT u.id, u.organization_id, u.name
      FROM users u
      WHERE u.email = $1
    `;
    const userResult = await query(userQuery, [currentUserEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const currentUserId = userResult.rows[0].id;
    
    // Check if feedback exists, user is the giver, and status is draft
    const feedbackCheckQuery = `
      SELECT fr.id FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      WHERE fr.id = $1 AND fr.giver_id = $2 AND frr.status = 'draft'
    `;
    const feedbackResult = await query(feedbackCheckQuery, [id, currentUserId]);
    
    if (feedbackResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Only draft feedback can be deleted' 
      });
    }

    // Get the request_id BEFORE deleting anything
    const requestIdResult = await query('SELECT request_id FROM feedback_responses WHERE id = $1', [id]);
    const requestId = requestIdResult.rows[0]?.request_id;

    // Delete in correct order: response first, then request
    await query('DELETE FROM feedback_responses WHERE id = $1', [id]);
    if (requestId) {
      await query('DELETE FROM feedback_requests WHERE id = $1', [requestId]);
    }
    
    res.json({ success: true, message: 'Draft feedback deleted' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to delete feedback' });
  }
});

// POST /api/v1/feedback/:id/acknowledge - Acknowledge feedback
app.post('/api/v1/feedback/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    
    // Get user context from authentication middleware
    const currentUserEmail = (req as any).user?.email;
    if (!currentUserEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Get user details from database
    const userQuery = `
      SELECT u.id, u.organization_id, u.name
      FROM users u
      WHERE u.email = $1
    `;
    const userResult = await query(userQuery, [currentUserEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const currentUserId = userResult.rows[0].id;
    
    // Check if feedback exists, user is the recipient, and status is not draft
    const feedbackCheckQuery = `
      SELECT fr.id, fr.recipient_id, frr.status
      FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      WHERE fr.id = $1 AND fr.recipient_id = $2 AND frr.status != 'draft'
    `;
    const feedbackResult = await query(feedbackCheckQuery, [id, currentUserId]);
    
    if (feedbackResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Feedback not found or access denied' });
    }
    
    // Update feedback request status to completed and store acknowledgment message
    const updateQuery = `
      UPDATE feedback_requests 
      SET status = 'completed', message = $1, updated_at = NOW()
      WHERE id = (
        SELECT request_id FROM feedback_responses WHERE id = $2
      )
      RETURNING id, status, updated_at
    `;
    
    const updateResult = await query(updateQuery, [response || '', id]);
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Feedback request not found' });
    }
    
    // Fetch the complete feedback object using the same logic as GET endpoint
    const feedbackQuery = `
      SELECT 
        fr.id,
        fr.request_id as "requestId",
        fr.giver_id as "giverId",
        fr.recipient_id as "recipientId",
        fr.cycle_id as "cycleId",
        fr.content,
        fr.rating,
        fr.color_classification as "colorClassification",
        fr.is_anonymous as "isAnonymous",
        fr.is_approved as "isApproved",
        fr.created_at as "createdAt",
        fr.updated_at as "updatedAt",
        frr.feedback_type as "reviewType",
        frr.status,
        frr.message,
        giver.name as "giverName",
        giver.email as "giverEmail",
        recipient.name as "recipientName",
        recipient.email as "recipientEmail"
      FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      LEFT JOIN users giver ON fr.giver_id = giver.id
      LEFT JOIN users recipient ON fr.recipient_id = recipient.id
      WHERE fr.id = $1 AND fr.is_approved = true
    `;
    
    const completeFeedbackResult = await query(feedbackQuery, [id]);
    console.log('Acknowledgment query result:', completeFeedbackResult.rows.length, completeFeedbackResult.rows[0]);
    if (completeFeedbackResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Feedback not found' });
    }
    
    const row = completeFeedbackResult.rows[0];
    
    // Parse content if it's JSON
    let parsedContent;
    try {
      parsedContent = JSON.parse(row.content);
    } catch {
      parsedContent = { overallComment: row.content };
    }
    
    // Transform database result to match expected format (same as GET endpoint)
    const feedback = {
      id: row.id,
      cycleId: row.cycleId,
      fromUserId: row.giverId,
      fromUserEmail: row.giverEmail,
      toUserId: row.recipientId,
      toUserEmail: row.recipientEmail,
      fromUser: {
        id: row.giverId,
        name: row.giverName,
        email: row.giverEmail
      },
      toUser: {
        id: row.recipientId,
        name: row.recipientName,
        email: row.recipientEmail
      },
      reviewType: row.reviewType,
      status: row.status,
      colorClassification: row.colorClassification || null,
      content: parsedContent,
      ratings: [],
      comments: [],
      goals: [],
      // Include acknowledgment if the feedback has been completed and has a message
      ...((row.status === 'completed' || row.status === 'acknowledged') && row.message && {
        acknowledgment: {
          id: `ack-${row.id}`,
          feedbackId: row.id,
          userId: row.recipientId,
          acknowledgedAt: row.updatedAt,
          response: row.message || ''
        }
      }),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };

    // PRIVACY: The acknowledge endpoint is called by the receiver, so always hide colorClassification
    delete (feedback as any).colorClassification;

    // Create notification for the feedback giver that their feedback was acknowledged
    const giverOrgResult = await query('SELECT organization_id FROM users WHERE id = $1', [row.giverId]);
    const giverOrgId = giverOrgResult.rows[0]?.organization_id;

    await createFeedbackNotification(
      row.giverId,
      giverOrgId,
      'Feedback Acknowledged',
      `${row.recipientName || row.recipientEmail} has acknowledged your feedback.`,
      {
        toUserId: row.recipientId,
        toUserName: row.recipientName,
        cycleId: row.cycleId,
        type: 'feedback_acknowledged'
      }
    );
    
    res.json({ 
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error acknowledging feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge feedback' });
  }
});

// POST /api/v1/feedback/:id/comments - Add comment
app.post('/api/v1/feedback/:feedbackId/comments', authenticateToken, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { content, parentCommentId, isPrivate = false } = req.body;
    
    // Get user context from authentication middleware
    const currentUserEmail = (req as any).user?.email;
    if (!currentUserEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Get user details from database
    const userQuery = `
      SELECT u.id, u.name, u.avatar_url
      FROM users u
      WHERE u.email = $1
    `;
    const userResult = await query(userQuery, [currentUserEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const currentUserId = userResult.rows[0].id;
    const currentUserName = userResult.rows[0].name;
    const currentUserAvatar = userResult.rows[0].avatar_url;
    
    // Check if feedback exists and user has permission to comment
    const feedbackCheckQuery = `
      SELECT fr.id
      FROM feedback_responses fr
      WHERE fr.id = $1 AND fr.is_approved = true
        AND (fr.giver_id = $2 OR fr.recipient_id = $2)
    `;
    const feedbackResult = await query(feedbackCheckQuery, [feedbackId, currentUserId]);
    
    if (feedbackResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Feedback not found or access denied' });
    }
    
    // For now, we'll store comments in the feedback_responses content field as JSON
    // In a real implementation, you'd have a separate comments table
    const commentId = `comment-${Date.now()}`;
    const newComment = {
      id: commentId,
      feedbackId: feedbackId,
      userId: currentUserId,
      parentCommentId,
      content,
      isPrivate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: currentUserId,
        name: currentUserName,
        avatarUrl: currentUserAvatar
      }
    };
    
    res.status(201).json({ success: true, data: newComment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
});

// DELETE /api/v1/feedback/:feedbackId/comments/:commentId - Delete comment
app.delete('/api/v1/feedback/:feedbackId/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { feedbackId, commentId } = req.params;
    
    // Get user context from authentication middleware
    const currentUserEmail = (req as any).user?.email;
    if (!currentUserEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Get user details from database
    const userQuery = `
      SELECT u.id
      FROM users u
      WHERE u.email = $1
    `;
    const userResult = await query(userQuery, [currentUserEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const currentUserId = userResult.rows[0].id;
    
    // Check if feedback exists and user has permission to delete comments
    const feedbackCheckQuery = `
      SELECT fr.id
      FROM feedback_responses fr
      WHERE fr.id = $1 AND fr.is_approved = true
        AND (fr.giver_id = $2 OR fr.recipient_id = $2)
    `;
    const feedbackResult = await query(feedbackCheckQuery, [feedbackId, currentUserId]);
    
    if (feedbackResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Feedback not found or access denied' });
    }
    
    // For now, we'll just return success since comments are stored in content field
    // In a real implementation, you'd delete from a comments table
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ success: false, error: 'Failed to delete comment' });
  }
});

// ===================
// CYCLE ENDPOINTS
// ===================

// Feedback cycles are now stored in the database (feedback_cycles table)

// GET /api/v1/cycles - Get cycles list
app.get('/api/v1/cycles', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      type, 
      organizationId,
      createdBy,
      dateFrom,
      dateTo,
      search
    } = req.query;

    // Get current user's organization (non-super-admins only see their org's cycles)
    const currentUserEmail = (req as any).user?.email;
    const userResult = await query(
      'SELECT u.id, u.organization_id FROM users u WHERE u.email = $1',
      [currentUserEmail]
    );
    const currentUserOrgId = userResult.rows[0]?.organization_id;
    const isSuperAdmin = (req as any).user?.roles?.includes('super_admin');

    // Build WHERE conditions
    const whereConditions = [];
    const queryParams = [];
    let paramCount = 0;

    // Force organization filter for non-super-admins
    if (!isSuperAdmin && currentUserOrgId) {
      whereConditions.push(`fc.organization_id = $${++paramCount}`);
      queryParams.push(currentUserOrgId);
    } else if (organizationId) {
      // Super admins can optionally filter by org
      whereConditions.push(`fc.organization_id = $${++paramCount}`);
      queryParams.push(organizationId);
    }
    if (status) {
      whereConditions.push(`fc.status = $${++paramCount}`);
      queryParams.push(status);
    }
    if (type) {
      whereConditions.push(`fc.type = $${++paramCount}`);
      queryParams.push(type);
    }
    if (createdBy) {
      whereConditions.push(`u.email = $${++paramCount}`);
      queryParams.push(createdBy);
    }
    if (dateFrom) {
      whereConditions.push(`fc.start_date >= $${++paramCount}`);
      queryParams.push(dateFrom);
    }
    if (dateTo) {
      whereConditions.push(`fc.end_date <= $${++paramCount}`);
      queryParams.push(dateTo);
    }
    if (search) {
      whereConditions.push(`(fc.name ILIKE $${++paramCount} OR fc.description ILIKE $${++paramCount})`);
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Main query with participant/completed counts
    const cyclesQuery = `
      SELECT 
        fc.id,
        fc.name,
        fc.description,
        fc.organization_id as "organizationId",
        fc.type,
        fc.status,
        fc.start_date as "startDate",
        fc.end_date as "endDate",
        fc.feedback_start_date as "feedbackStartDate",
        fc.feedback_end_date as "feedbackEndDate",
        fc.settings,
        fc.created_by as "createdBy",
        fc.created_at as "createdAt",
        fc.updated_at as "updatedAt",
        u.name as "creatorName",
        u.email as "creatorEmail",
        COALESCE(participant_counts.participants, 0) as participants,
        COALESCE(completed_counts.completed, 0) as completed
      FROM feedback_cycles fc
      LEFT JOIN users u ON fc.created_by = u.id
      LEFT JOIN (
        SELECT 
          cycle_id,
          COUNT(DISTINCT recipient_id) as participants
        FROM feedback_requests 
        WHERE status != 'declined'
        GROUP BY cycle_id
      ) participant_counts ON fc.id = participant_counts.cycle_id
      LEFT JOIN (
        SELECT 
          cycle_id,
          COUNT(DISTINCT giver_id) as completed
        FROM feedback_responses 
        WHERE is_approved = true
        GROUP BY cycle_id
      ) completed_counts ON fc.id = completed_counts.cycle_id
      ${whereClause}
      ORDER BY fc.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    
    queryParams.push(limitNum, offset);

    const cyclesResult = await query(cyclesQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM feedback_cycles fc
      LEFT JOIN users u ON fc.created_by = u.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        cycles: cyclesResult.rows,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching cycles:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cycles' });
  }
});

// GET /api/v1/cycles/:id - Get specific cycle
app.get('/api/v1/cycles/:id', authenticateToken, async (req, res) => {
  try {
    const cycleQuery = `
      SELECT 
        fc.id,
        fc.name,
        fc.description,
        fc.organization_id as "organizationId",
        fc.type,
        fc.status,
        fc.start_date as "startDate",
        fc.end_date as "endDate",
        fc.feedback_start_date as "feedbackStartDate",
        fc.feedback_end_date as "feedbackEndDate",
        fc.settings,
        fc.created_by as "createdBy",
        fc.created_at as "createdAt",
        fc.updated_at as "updatedAt",
        u.name as "creatorName",
        u.email as "creatorEmail",
        COALESCE(participant_counts.participants, 0) as participants,
        COALESCE(completed_counts.completed, 0) as completed
      FROM feedback_cycles fc
      LEFT JOIN users u ON fc.created_by = u.id
      LEFT JOIN (
        SELECT 
          cycle_id,
          COUNT(DISTINCT recipient_id) as participants
        FROM feedback_requests 
        WHERE status != 'declined'
        GROUP BY cycle_id
      ) participant_counts ON fc.id = participant_counts.cycle_id
      LEFT JOIN (
        SELECT 
          cycle_id,
          COUNT(DISTINCT giver_id) as completed
        FROM feedback_responses 
        WHERE is_approved = true
        GROUP BY cycle_id
      ) completed_counts ON fc.id = completed_counts.cycle_id
      WHERE fc.id = $1
    `;

    const result = await query(cycleQuery, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cycle not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching cycle:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cycle' });
  }
});

// Simple authentication middleware for real database server
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  
  // For mock purposes, we'll extract user info from the token
  // In a real implementation, this would verify the JWT token
  const token = authHeader.substring(7);
  try {
    // Mock user extraction - in real implementation, decode JWT
    const mockUser = {
      id: '1',
      email: 'admin@example.com',
      roles: ['admin'],
      organizationId: '1'
    };
    req.user = mockUser;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// Role-based access control middleware
const rbacMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const hasPermission = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasPermission) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions. Required roles: ' + allowedRoles.join(', ') 
      });
    }
    
    next();
  };
};

// POST /api/v1/cycles - Create new cycle
app.post('/api/v1/cycles', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      organizationId,
      type = 'quarterly',
      startDate,
      endDate,
      feedbackStartDate,
      feedbackEndDate,
      settings = {}
    } = req.body;

    // Get creator ID from authenticated user
    const creatorResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [req.user.email]
    );
    
    if (creatorResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Creator user not found' });
    }
    
    const createdBy = creatorResult.rows[0].id;

    // Insert new cycle
    const insertQuery = `
      INSERT INTO feedback_cycles (
        organization_id, name, description, type, status,
        start_date, end_date, feedback_start_date, feedback_end_date,
        settings, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING id, name, description, organization_id, type, status,
                start_date, end_date, feedback_start_date, feedback_end_date,
                settings, created_by, created_at, updated_at
    `;

    const result = await query(insertQuery, [
      organizationId,
      name,
      description,
      type,
      'active', // Cycles are created as active by default
      startDate,
      endDate,
      feedbackStartDate,
      feedbackEndDate,
      JSON.stringify(settings),
      createdBy
    ]);

    const newCycle = result.rows[0];
    
    // Transform to match expected format
    const response = {
      id: newCycle.id,
      name: newCycle.name,
      description: newCycle.description,
      organizationId: newCycle.organization_id,
      type: newCycle.type,
      status: newCycle.status,
      startDate: newCycle.start_date,
      endDate: newCycle.end_date,
      feedbackStartDate: newCycle.feedback_start_date,
      feedbackEndDate: newCycle.feedback_end_date,
      settings: typeof newCycle.settings === 'string' 
        ? JSON.parse(newCycle.settings) 
        : newCycle.settings,
      createdBy: newCycle.created_by,
      createdAt: newCycle.created_at,
      updatedAt: newCycle.updated_at,
      participants: 0,
      completed: 0
    };

    res.status(201).json({ success: true, data: response });
  } catch (error) {
    console.error('Error creating cycle:', error);
    res.status(500).json({ success: false, error: 'Failed to create cycle' });
  }
});

// PUT /api/v1/cycles/:id - Update cycle
app.put('/api/v1/cycles/:id', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      startDate,
      endDate,
      feedbackStartDate,
      feedbackEndDate,
      settings
    } = req.body;

    const updateQuery = `
      UPDATE feedback_cycles 
      SET 
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        type = COALESCE($4, type),
        start_date = COALESCE($5, start_date),
        end_date = COALESCE($6, end_date),
        feedback_start_date = COALESCE($7, feedback_start_date),
        feedback_end_date = COALESCE($8, feedback_end_date),
        settings = COALESCE($9, settings),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, description, organization_id, type, status,
                start_date, end_date, feedback_start_date, feedback_end_date,
                settings, created_by, created_at, updated_at
    `;

    const result = await query(updateQuery, [
      req.params.id,
      name,
      description,
      type,
      startDate,
      endDate,
      feedbackStartDate,
      feedbackEndDate,
      settings ? JSON.stringify(settings) : null
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cycle not found' });
    }

    const updatedCycle = result.rows[0];
    
    // Transform to match expected format
    const response = {
      id: updatedCycle.id,
      name: updatedCycle.name,
      description: updatedCycle.description,
      organizationId: updatedCycle.organization_id,
      type: updatedCycle.type,
      status: updatedCycle.status,
      startDate: updatedCycle.start_date,
      endDate: updatedCycle.end_date,
      feedbackStartDate: updatedCycle.feedback_start_date,
      feedbackEndDate: updatedCycle.feedback_end_date,
      settings: typeof updatedCycle.settings === 'string' 
        ? JSON.parse(updatedCycle.settings) 
        : updatedCycle.settings,
      createdBy: updatedCycle.created_by,
      createdAt: updatedCycle.created_at,
      updatedAt: updatedCycle.updated_at
    };

    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Error updating cycle:', error);
    res.status(500).json({ success: false, error: 'Failed to update cycle' });
  }
});

// DELETE /api/v1/cycles/:id - Delete cycle
app.delete('/api/v1/cycles/:id', authenticateToken, async (req, res) => {
  try {
    const cycleId = req.params.id;
    
    // First, check if the cycle exists
    const cycleCheckQuery = 'SELECT id, name FROM feedback_cycles WHERE id = $1';
    const cycleResult = await query(cycleCheckQuery, [cycleId]);
    
    if (cycleResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cycle not found' });
    }
    
    // Check if cycle has any feedback attached
    const feedbackCheckQuery = `
      SELECT COUNT(*) as feedback_count
      FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      WHERE frr.cycle_id = $1
    `;
    const feedbackResult = await query(feedbackCheckQuery, [cycleId]);
    const feedbackCount = parseInt(feedbackResult.rows[0].feedback_count);
    
    if (feedbackCount > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot delete cycle. It has ${feedbackCount} feedback response(s) attached. Please remove all feedback before deleting the cycle.` 
      });
    }
    
    // Check if cycle has any feedback requests (even without responses)
    const requestsCheckQuery = 'SELECT COUNT(*) as request_count FROM feedback_requests WHERE cycle_id = $1';
    const requestsResult = await query(requestsCheckQuery, [cycleId]);
    const requestCount = parseInt(requestsResult.rows[0].request_count);
    
    if (requestCount > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot delete cycle. It has ${requestCount} feedback request(s) attached. Please remove all feedback requests before deleting the cycle.` 
      });
    }
    
    // Safe to delete - no feedback attached
    const deleteQuery = 'DELETE FROM feedback_cycles WHERE id = $1';
    const result = await query(deleteQuery, [cycleId]);
    
    res.json({ 
      success: true, 
      message: 'Cycle deleted successfully',
      data: { 
        deletedCycleId: cycleId,
        cycleName: cycleResult.rows[0].name
      }
    });
  } catch (error) {
    console.error('Error deleting cycle:', error);
    res.status(500).json({ success: false, error: 'Failed to delete cycle' });
  }
});

// GET /api/v1/cycles/:id/can-delete - Check if cycle can be deleted
app.get('/api/v1/cycles/:id/can-delete', authenticateToken, async (req, res) => {
  try {
    const cycleId = req.params.id;
    
    // Check if the cycle exists
    const cycleCheckQuery = 'SELECT id, name FROM feedback_cycles WHERE id = $1';
    const cycleResult = await query(cycleCheckQuery, [cycleId]);
    
    if (cycleResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cycle not found' });
    }
    
    // Check for feedback responses
    const feedbackCheckQuery = `
      SELECT COUNT(*) as feedback_count
      FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      WHERE frr.cycle_id = $1
    `;
    const feedbackResult = await query(feedbackCheckQuery, [cycleId]);
    const feedbackCount = parseInt(feedbackResult.rows[0].feedback_count);
    
    // Check for feedback requests
    const requestsCheckQuery = 'SELECT COUNT(*) as request_count FROM feedback_requests WHERE cycle_id = $1';
    const requestsResult = await query(requestsCheckQuery, [cycleId]);
    const requestCount = parseInt(requestsResult.rows[0].request_count);
    
    const canDelete = feedbackCount === 0 && requestCount === 0;
    
    res.json({
      success: true,
      data: {
        canDelete,
        feedbackCount,
        requestCount,
        reason: canDelete 
          ? 'Cycle can be safely deleted' 
          : `Cannot delete: ${feedbackCount} feedback responses, ${requestCount} feedback requests`
      }
    });
  } catch (error) {
    console.error('Error checking if cycle can be deleted:', error);
    res.status(500).json({ success: false, error: 'Failed to check cycle deletion status' });
  }
});

// POST /api/v1/cycles/:id/activate - Activate cycle
app.post('/api/v1/cycles/:id/activate', authenticateToken, async (req, res) => {
  try {
    const updateQuery = `
      UPDATE feedback_cycles 
      SET status = 'active', updated_at = NOW()
      WHERE id = $1 AND status = 'draft'
      RETURNING id, name, status, updated_at
    `;

    const result = await query(updateQuery, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cycle not found or not in draft status' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Cycle activated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error activating cycle:', error);
    res.status(500).json({ success: false, error: 'Failed to activate cycle' });
  }
});

// POST /api/v1/cycles/:id/close - Close cycle
app.post('/api/v1/cycles/:id/close', authenticateToken, async (req, res) => {
  try {
    const updateQuery = `
      UPDATE feedback_cycles 
      SET status = 'closed', updated_at = NOW()
      WHERE id = $1 AND status = 'active'
      RETURNING id, name, status, updated_at
    `;

    const result = await query(updateQuery, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cycle not found or not in active status' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Cycle closed successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error closing cycle:', error);
    res.status(500).json({ success: false, error: 'Failed to close cycle' });
  }
});

// GET /api/v1/cycles/summary - Get cycle summary
app.get('/api/v1/cycles/summary', authenticateToken, async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_cycles,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_cycles,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as completed_cycles,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_cycles,
        COALESCE(SUM(participant_counts.participants), 0) as total_participants,
        COALESCE(SUM(completed_counts.completed), 0) as total_completed
      FROM feedback_cycles fc
      LEFT JOIN (
        SELECT 
          cycle_id,
          COUNT(DISTINCT recipient_id) as participants
        FROM feedback_requests 
        WHERE status != 'declined'
        GROUP BY cycle_id
      ) participant_counts ON fc.id = participant_counts.cycle_id
      LEFT JOIN (
        SELECT 
          cycle_id,
          COUNT(DISTINCT giver_id) as completed
        FROM feedback_responses 
        WHERE is_approved = true
        GROUP BY cycle_id
      ) completed_counts ON fc.id = completed_counts.cycle_id
    `;

    const result = await query(statsQuery);
    const stats = result.rows[0];
    
    const completionRate = stats.total_participants > 0 
      ? (stats.total_completed / stats.total_participants) * 100 
      : 0;

    res.json({
      success: true,
      data: {
        totalCycles: parseInt(stats.total_cycles),
        activeCycles: parseInt(stats.active_cycles),
        completedCycles: parseInt(stats.completed_cycles),
        draftCycles: parseInt(stats.draft_cycles),
        totalParticipants: parseInt(stats.total_participants),
        totalCompleted: parseInt(stats.total_completed),
        completionRate: Math.round(completionRate * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error fetching cycle summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cycle summary' });
  }
});

// GET /api/v1/cycles/:id/participants - Get cycle participants
app.get('/api/v1/cycles/:id/participants', authenticateToken, async (req, res) => {
  try {
    const participantsQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.position,
        u.department,
        u.avatar_url,
        COUNT(fr.id) as total_requests,
        COUNT(CASE WHEN fr.status = 'completed' THEN 1 END) as completed_requests,
        COUNT(CASE WHEN fr.status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN fr.status = 'in_progress' THEN 1 END) as in_progress_requests
      FROM users u
      JOIN feedback_requests fr ON u.id = fr.recipient_id
      WHERE fr.cycle_id = $1
      GROUP BY u.id, u.name, u.email, u.position, u.department, u.avatar_url
      ORDER BY u.name ASC
    `;

    const result = await query(participantsQuery, [req.params.id]);
    
    const participants = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      position: row.position,
      department: row.department,
      avatarUrl: row.avatar_url,
      totalRequests: parseInt(row.total_requests),
      completedRequests: parseInt(row.completed_requests),
      pendingRequests: parseInt(row.pending_requests),
      inProgressRequests: parseInt(row.in_progress_requests),
      completionRate: row.total_requests > 0 
        ? Math.round((row.completed_requests / row.total_requests) * 100) 
        : 0
    }));

    res.json({ success: true, data: participants });
  } catch (error) {
    console.error('Error fetching cycle participants:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cycle participants' });
  }
});

// POST /api/v1/cycles/:id/participants - Add cycle participants
app.post('/api/v1/cycles/:id/participants', authenticateToken, async (req, res) => {
  try {
    const { participants } = req.body;
    
    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Participants array is required' 
      });
    }

    // Insert participants as feedback requests
    const insertQuery = `
      INSERT INTO feedback_requests (
        cycle_id, requester_id, recipient_id, feedback_type, 
        status, message, due_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (cycle_id, requester_id, recipient_id, feedback_type) 
      DO NOTHING
      RETURNING id
    `;

    const insertedIds = [];
    
    for (const participant of participants) {
      const { userId, feedbackType = 'peer', message, dueDate } = participant;
      
      const result = await query(insertQuery, [
        req.params.id,
        participant.requesterId || participant.userId, // Use requester or default to participant
        userId,
        feedbackType,
        'pending',
        message,
        dueDate
      ]);
      
      if (result.rows.length > 0) {
        insertedIds.push(result.rows[0].id);
      }
    }

    res.json({ 
      success: true, 
      message: `${insertedIds.length} participants added successfully`,
      data: { insertedCount: insertedIds.length }
    });
  } catch (error) {
    console.error('Error adding cycle participants:', error);
    res.status(500).json({ success: false, error: 'Failed to add cycle participants' });
  }
});

// DELETE /api/v1/cycles/:id/participants/:participantId - Remove cycle participant
app.delete('/api/v1/cycles/:id/participants/:participantId', authenticateToken, async (req, res) => {
  try {
    const deleteQuery = `
      DELETE FROM feedback_requests 
      WHERE cycle_id = $1 AND recipient_id = $2
    `;
    
    const result = await query(deleteQuery, [req.params.id, req.params.participantId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Participant not found in this cycle' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Participant removed successfully' 
    });
  } catch (error) {
    console.error('Error removing cycle participant:', error);
    res.status(500).json({ success: false, error: 'Failed to remove cycle participant' });
  }
});

// POST /api/v1/cycles/validate-feedback - Validate feedback permission
app.post('/api/v1/cycles/validate-feedback', authenticateToken, async (req, res) => {
  try {
    const { cycleId, fromUserId, toUserId, reviewType } = req.body;
    
    // Check if cycle exists in database
    const cycleResult = await query('SELECT id FROM feedback_cycles WHERE id = $1', [cycleId]);
    if (cycleResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cycle not found' });
    }

    // Mock validation - always return true for now
    res.json({ valid: true });
  } catch (error) {
    console.error('Error validating feedback permission:', error);
    res.status(500).json({ success: false, error: 'Failed to validate feedback permission' });
  }
});

// Helper function to get all employee IDs in manager's tree (direct and indirect)
async function getManagerEmployeeTree(managerId: string): Promise<string[]> {
  const sqlQuery = `
    WITH RECURSIVE employee_tree AS (
      -- Direct reports
      SELECT employee_id, manager_id, 1 as level
      FROM organizational_hierarchy
      WHERE manager_id = $1 AND is_active = true
      
      UNION ALL
      
      -- Indirect reports (recursive)
      SELECT oh.employee_id, oh.manager_id, et.level + 1
      FROM organizational_hierarchy oh
      INNER JOIN employee_tree et ON oh.manager_id = et.employee_id
      WHERE oh.is_active = true
    )
    SELECT DISTINCT employee_id FROM employee_tree;
  `;
  
  const result = await query(sqlQuery, [managerId]);
  return result.rows.map((row: any) => row.employee_id);
}

// GET /api/v1/analytics/overview - Get analytics overview for manager
app.get('/api/v1/analytics/overview', authenticateToken, async (req, res) => {
  try {
    const userEmail = (req as any).user.email;
    const cycleId = req.query.cycleId as string | undefined;
    
    // Look up user from database
    const userQuery = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.organization_id,
        u.is_active,
        ARRAY_AGG(r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.email = $1 AND u.is_active = true
      GROUP BY u.id, u.email, u.name, u.organization_id, u.is_active
    `;
    
    const userResult = await query(userQuery, [userEmail]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    const userId = user.id;
    
    // Check if user is a manager
    const isManager = user.roles.includes('manager');
    
    if (!isManager) {
      return res.status(403).json({ 
        success: false, 
        error: 'Analytics is only available for managers' 
      });
    }
    
    // Get employee tree
    const employeeIds = await getManagerEmployeeTree(userId);
    employeeIds.push(userId); // Include manager themselves
    
    // Build cycle filter
    const cycleFilter = cycleId ? 'AND fr.cycle_id = $2' : '';
    const queryParams = cycleId ? [employeeIds, cycleId] : [employeeIds];
    
    // Calculate overview metrics
    const overviewQuery = `
      SELECT 
        COUNT(DISTINCT fr.id) as total_feedback,
        COUNT(DISTINCT CASE WHEN frr.status = 'submitted' THEN fr.id END) as pending_feedback,
        COUNT(DISTINCT CASE WHEN frr.status = 'completed' THEN fr.id END) as completed_feedback,
        AVG(fr.rating) FILTER (WHERE fr.rating IS NOT NULL) as avg_rating,
        COUNT(DISTINCT fr.giver_id) as active_givers,
        COUNT(DISTINCT fr.recipient_id) as active_receivers
      FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      WHERE (fr.giver_id = ANY($1) OR fr.recipient_id = ANY($1))
        AND fr.is_approved = true
        ${cycleFilter}
    `;
    
    const result = await query(overviewQuery, queryParams);
    const stats = result.rows[0];
    
    res.json({
      success: true,
      data: {
        totalFeedback: parseInt(stats.total_feedback) || 0,
        pendingFeedback: parseInt(stats.pending_feedback) || 0,
        completedFeedback: parseInt(stats.completed_feedback) || 0,
        averageRating: parseFloat(stats.avg_rating) || 0,
        activeGivers: parseInt(stats.active_givers) || 0,
        activeReceivers: parseInt(stats.active_receivers) || 0,
        teamSize: employeeIds.length
      }
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics overview' });
  }
});

// GET /api/v1/analytics/trends - Get feedback trends over time
app.get('/api/v1/analytics/trends', authenticateToken, async (req, res) => {
  try {
    const userEmail = (req as any).user.email;
    const period = req.query.period as string || 'monthly';
    const cycleId = req.query.cycleId as string | undefined;
    
    // Look up user from database
    const userQuery = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.organization_id,
        u.is_active,
        ARRAY_AGG(r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.email = $1 AND u.is_active = true
      GROUP BY u.id, u.email, u.name, u.organization_id, u.is_active
    `;
    
    const userResult = await query(userQuery, [userEmail]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    const userId = user.id;
    
    // Check if user is a manager
    const isManager = user.roles.includes('manager');
    
    if (!isManager) {
      return res.status(403).json({ 
        success: false, 
        error: 'Analytics is only available for managers' 
      });
    }
    
    // Get employee tree
    const employeeIds = await getManagerEmployeeTree(userId);
    employeeIds.push(userId);
    
    // Determine date truncation based on period
    const dateTrunc = period === 'weekly' ? 'week' : period === 'daily' ? 'day' : 'month';
    
    const cycleFilter = cycleId ? 'AND fr.cycle_id = $3' : '';
    const queryParams = cycleId ? [employeeIds, dateTrunc, cycleId] : [employeeIds, dateTrunc];
    
    const trendsQuery = `
      SELECT 
        DATE_TRUNC($2, fr.created_at) as period,
        COUNT(DISTINCT fr.id) as count,
        AVG(fr.rating) FILTER (WHERE fr.rating IS NOT NULL) as avg_rating
      FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      WHERE (fr.giver_id = ANY($1) OR fr.recipient_id = ANY($1))
        AND fr.is_approved = true
        ${cycleFilter}
        AND fr.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY period
      ORDER BY period DESC
      LIMIT 12
    `;
    
    const result = await query(trendsQuery, queryParams);
    
    const trends = result.rows.map((row: any) => ({
      period: row.period,
      value: parseInt(row.count),
      averageRating: parseFloat(row.avg_rating) || 0
    }));
    
    res.json({ success: true, data: trends });
  } catch (error) {
    console.error('Error fetching analytics trends:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics trends' });
  }
});

// GET /api/v1/analytics/categories - Get feedback by category/type
app.get('/api/v1/analytics/categories', authenticateToken, async (req, res) => {
  try {
    const userEmail = (req as any).user.email;
    const cycleId = req.query.cycleId as string | undefined;
    
    // Look up user from database
    const userQuery = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.organization_id,
        u.is_active,
        ARRAY_AGG(r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.email = $1 AND u.is_active = true
      GROUP BY u.id, u.email, u.name, u.organization_id, u.is_active
    `;
    
    const userResult = await query(userQuery, [userEmail]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    const userId = user.id;
    
    // Check if user is a manager
    const isManager = user.roles.includes('manager');
    
    if (!isManager) {
      return res.status(403).json({ 
        success: false, 
        error: 'Analytics is only available for managers' 
      });
    }
    
    // Get employee tree
    const employeeIds = await getManagerEmployeeTree(userId);
    employeeIds.push(userId);
    
    const cycleFilter = cycleId ? 'AND fr.cycle_id = $2' : '';
    const queryParams = cycleId ? [employeeIds, cycleId] : [employeeIds];
    
    const categoriesQuery = `
      SELECT 
        frr.feedback_type as category,
        COUNT(DISTINCT fr.id) as count,
        AVG(fr.rating) FILTER (WHERE fr.rating IS NOT NULL) as avg_rating
      FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      WHERE (fr.giver_id = ANY($1) OR fr.recipient_id = ANY($1))
        AND fr.is_approved = true
        ${cycleFilter}
      GROUP BY frr.feedback_type
      ORDER BY count DESC
    `;
    
    const result = await query(categoriesQuery, queryParams);
    
    const categories = result.rows.reduce((acc: any, row: any) => {
      acc[row.category] = {
        count: parseInt(row.count),
        averageRating: parseFloat(row.avg_rating) || 0
      };
      return acc;
    }, {});
    
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching analytics categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics categories' });
  }
});

// GET /api/v1/analytics/insights - Get AI-generated insights
app.get('/api/v1/analytics/insights', authenticateToken, async (req, res) => {
  try {
    const userEmail = (req as any).user.email;
    
    // Look up user from database
    const userQuery = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.organization_id,
        u.is_active,
        ARRAY_AGG(r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.email = $1 AND u.is_active = true
      GROUP BY u.id, u.email, u.name, u.organization_id, u.is_active
    `;
    
    const userResult = await query(userQuery, [userEmail]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    // Check if user is a manager
    const isManager = user.roles.includes('manager');
    
    if (!isManager) {
      return res.status(403).json({ 
        success: false, 
        error: 'Analytics is only available for managers' 
      });
    }
    
    // TODO: Implement AI insights generation
    // For now, return placeholder insights
    const insights = [
      {
        id: '1',
        type: 'trend',
        title: 'Feedback Activity Increasing',
        description: 'Your team\'s feedback activity has increased by 23% this month',
        severity: 'positive',
        createdAt: new Date().toISOString()
      }
    ];
    
    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('Error fetching analytics insights:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics insights' });
  }
});

// Test endpoint
app.get('/api/v1/test', (req, res) => {
  res.json({ success: true, message: 'Test endpoint working' });
});

// GET /api/v1/team/feedback - Get team feedback for managers
app.get('/api/v1/team/feedback', authenticateToken, async (req, res) => {
  try {
    const currentUserEmail = (req as any).user?.email;
    console.log('Team feedback request from:', currentUserEmail);
    
    if (!currentUserEmail) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Get user details and check if manager
    const userQuery = `
      SELECT u.id, u.organization_id, u.name
      FROM users u
      WHERE u.email = $1
    `;
    const userResult = await query(userQuery, [currentUserEmail]);
    console.log('User query result:', userResult.rows);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const currentUser = userResult.rows[0];
    const currentUserId = currentUser.id;
    const currentOrgId = currentUser.organization_id;

    // Check if user is a manager
    const rolesQuery = `
      SELECT r.name 
      FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = $1 AND ur.organization_id = $2 AND ur.is_active = true
    `;
    const rolesResult = await query(rolesQuery, [currentUserId, currentOrgId]);
    const userRoles = rolesResult.rows.map(row => row.name);
    
    console.log('User roles:', userRoles);
    
    if (!userRoles.includes('manager')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Manager role required to view team feedback' 
      });
    }

    // Get all team members (direct and indirect reports)
    const teamMemberIds = await getManagerEmployeeTree(currentUserId);
    console.log('Team member IDs:', teamMemberIds);
    
    if (teamMemberIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Fetch feedback given by team members (not including manager's own feedback)
    const feedbackQuery = `
      SELECT 
        fr.id,
        fr.request_id as "requestId",
        fr.giver_id as "giverId", 
        fr.recipient_id as "recipientId",
        fr.cycle_id as "cycleId",
        fr.content,
        fr.rating,
        fr.color_classification as "colorClassification",
        fr.is_anonymous as "isAnonymous",
        fr.is_approved as "isApproved",
        fr.created_at as "createdAt",
        fr.updated_at as "updatedAt",
        frr.feedback_type as "reviewType",
        frr.status,
        frr.message,
        giver.name as "giverName",
        giver.email as "giverEmail",
        recipient.name as "recipientName",
        recipient.email as "recipientEmail"
      FROM feedback_responses fr
      JOIN feedback_requests frr ON fr.request_id = frr.id
      LEFT JOIN users giver ON fr.giver_id = giver.id
      LEFT JOIN users recipient ON fr.recipient_id = recipient.id
      WHERE fr.is_approved = true
        AND fr.giver_id = ANY($1)
      ORDER BY fr.created_at DESC
    `;
    
    const feedbackResult = await query(feedbackQuery, [teamMemberIds]);
    console.log('Team feedback query result:', feedbackResult.rows.length, 'rows');
    
    res.json({ success: true, data: feedbackResult.rows });
  } catch (error) {
    console.error('Error fetching team feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch team feedback' });
  }
});

// ===========================================
// AI FEEDBACK GENERATION ENDPOINT
// ===========================================
app.post('/api/v1/ai/generate-feedback', authenticateToken, async (req: any, res: any) => {
  try {
    const { recipientName, recipientPosition, recipientDepartment, feedbackType } = req.body;
    
    if (!recipientPosition) {
      return res.status(400).json({ 
        success: false, 
        error: 'Recipient position is required for AI generation' 
      });
    }
    
    // Validate AI configuration
    try {
      getAIConfig();
    } catch (configError: any) {
      return res.status(500).json({ 
        success: false, 
        error: configError.message 
      });
    }
    
    // Build context for AI
    const feedbackTypeContext = {
      'constructive': 'balanced constructive feedback with specific actionable improvements',
      'positive': 'positive recognition highlighting specific achievements and strengths',
      'improvement': 'areas for improvement with specific suggestions and growth opportunities',
      'general': 'general performance feedback covering strengths and development areas'
    }[feedbackType] || 'balanced constructive feedback';
    
    const prompt = `You are a professional HR manager writing performance feedback for an employee.

Generate ${feedbackTypeContext} for the following employee:
- Name: ${recipientName || 'the employee'}
- Position: ${recipientPosition}
- Department: ${recipientDepartment || 'Not specified'}

Write the feedback in a professional, supportive tone. The feedback should be:
1. Specific and actionable
2. Balanced (even positive feedback should mention growth opportunities)
3. Professional but warm

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "strengths": ["First strength point", "Second strength point", "Third strength point"],
  "areasForImprovement": ["First improvement area", "Second improvement area"],
  "specificExamples": ["A specific example of good work or behavior", "Another concrete example"],
  "recommendations": ["First actionable recommendation", "Second recommendation"],
  "developmentGoals": ["SMART goal 1 for next quarter", "SMART goal 2 for next quarter"],
  "overallComment": "A 2-3 sentence summary tying it all together"
}`;

    console.log('🤖 Generating AI feedback...');
    
    const aiResponse = await generateAIContent(prompt, { maxTokens: 1024 });
    
    // Parse the JSON response
    let parsedFeedback;
    try {
      parsedFeedback = parseAIJsonResponse(aiResponse.text);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse.text);
      // If parsing fails, return raw text as overallComment
      parsedFeedback = {
        strengths: [],
        areasForImprovement: [],
        overallComment: aiResponse.text,
        goals: []
      };
    }
    
    console.log(`✅ AI feedback generated successfully (provider: ${aiResponse.provider})`);
    
    res.json({
      success: true,
      data: parsedFeedback,
      provider: aiResponse.provider
    });
    
  } catch (error: any) {
    console.error('AI feedback generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate AI feedback' 
    });
  }
});

// ===========================================
// AI TEAM INSIGHTS ENDPOINT
// ===========================================
app.post('/api/v1/ai/team-insights', authenticateToken, async (req: any, res: any) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    // Validate AI configuration
    try {
      getAIConfig();
    } catch (configError: any) {
      return res.status(500).json({ 
        success: false, 
        error: configError.message 
      });
    }

    // Get the manager's user info
    const managerResult = await query(
      'SELECT id, name, organization_id FROM users WHERE email = $1',
      [userEmail]
    );
    
    if (managerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const manager = managerResult.rows[0];
    const managerId = manager.id;
    const managerName = manager.name;
    const organizationId = manager.organization_id;

    console.log('🧠 Generating AI team insights for manager:', managerName);

    // Fetch all team members (direct + indirect reports) using recursive CTE
    const teamQuery = `
      WITH RECURSIVE team_hierarchy AS (
        -- Direct reports
        SELECT 
          u.id,
          u.name,
          u.email,
          u.position,
          u.department,
          1 as level
        FROM users u
        INNER JOIN organizational_hierarchy oh ON u.id = oh.employee_id
        WHERE oh.manager_id = $1 AND oh.organization_id = $2
        
        UNION ALL
        
        -- Indirect reports (recursive)
        SELECT 
          u.id,
          u.name,
          u.email,
          u.position,
          u.department,
          th.level + 1
        FROM users u
        INNER JOIN organizational_hierarchy oh ON u.id = oh.employee_id
        INNER JOIN team_hierarchy th ON oh.manager_id = th.id
        WHERE oh.organization_id = $2 AND th.level < 5
      )
      SELECT DISTINCT id, name, email, position, department, level
      FROM team_hierarchy
      ORDER BY level, name
    `;
    
    const teamResult = await query(teamQuery, [managerId, organizationId]);
    const teamMembers = teamResult.rows;
    
    if (teamMembers.length === 0) {
      return res.json({
        success: true,
        data: {
          generatedAt: new Date().toISOString(),
          summary: 'No team members found. Add direct reports to your hierarchy to get team insights.',
          themes: [],
          strengths: [],
          areasForImprovement: [],
          individualHighlights: [],
          recommendations: [],
          teamHealthScore: null,
          confidenceLevel: 'low',
          teamSize: 0,
          feedbackCount: 0
        }
      });
    }

    const teamMemberIds = teamMembers.map((m: any) => m.id);
    
    // Fetch all feedback for team members (both received and given)
    const feedbackQuery = `
      SELECT 
        fr.id,
        fr.status,
        fr.feedback_type,
        fr.created_at,
        fr.updated_at,
        frr.content as feedback_content,
        frr.rating,
        giver.name as giver_name,
        giver.position as giver_position,
        recipient.name as recipient_name,
        recipient.position as recipient_position,
        recipient.department as recipient_department
      FROM feedback_requests fr
      LEFT JOIN feedback_responses frr ON fr.id = frr.request_id
      LEFT JOIN users giver ON frr.giver_id = giver.id
      LEFT JOIN users recipient ON fr.recipient_id = recipient.id
      WHERE (fr.recipient_id = ANY($1) OR frr.giver_id = ANY($1))
      ORDER BY fr.created_at DESC
      LIMIT 100
    `;
    
    const feedbackResult = await query(feedbackQuery, [teamMemberIds]);
    const feedbackData = feedbackResult.rows;
    
    if (feedbackData.length === 0) {
      return res.json({
        success: true,
        data: {
          generatedAt: new Date().toISOString(),
          summary: `Your team of ${teamMembers.length} members has no completed feedback yet. Encourage team members to participate in feedback cycles to get insights.`,
          themes: [],
          strengths: [],
          areasForImprovement: [],
          individualHighlights: [],
          recommendations: [{
            priority: 'high',
            action: 'Start a feedback cycle to gather team insights',
            reason: 'No feedback data available for analysis',
            timeline: 'This week'
          }],
          teamHealthScore: null,
          confidenceLevel: 'low',
          teamSize: teamMembers.length,
          feedbackCount: 0
        }
      });
    }

    // Prepare feedback data for AI analysis (anonymize if needed, summarize)
    const feedbackSummary = feedbackData.map((f: any) => ({
      recipientName: f.recipient_name,
      recipientPosition: f.recipient_position,
      recipientDepartment: f.recipient_department,
      feedbackType: f.feedback_type,
      rating: f.rating,
      feedbackContent: f.feedback_content, // The actual feedback text
      giverPosition: f.giver_position, // Don't include giver name for privacy
      status: f.status,
      date: f.created_at
    }));

    const teamSummary = teamMembers.map((m: any) => ({
      name: m.name,
      position: m.position,
      department: m.department,
      level: m.level === 1 ? 'Direct Report' : 'Indirect Report'
    }));

    // Build prompt for Claude
    const prompt = `You are an expert HR analytics consultant analyzing team performance feedback for a manager.

CONTEXT:
Manager: ${managerName}
Team Size: ${teamMembers.length} employees
Feedback Records: ${feedbackData.length} feedback items

TEAM MEMBERS:
${JSON.stringify(teamSummary, null, 2)}

FEEDBACK DATA:
${JSON.stringify(feedbackSummary, null, 2)}

TASK:
Analyze this feedback data and provide actionable insights for the manager. Focus on patterns, themes, and actionable recommendations.

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "summary": "A 2-3 sentence executive summary of the team's feedback patterns and overall health",
  
  "themes": ["theme1", "theme2", "theme3"],
  
  "strengths": [
    {
      "title": "Strength title",
      "description": "Detailed description with patterns observed in the feedback",
      "employeesExcelling": ["Names of team members who exemplify this strength"]
    }
  ],
  
  "areasForImprovement": [
    {
      "title": "Area title",
      "description": "What needs improvement based on feedback patterns",
      "frequency": "How common this is (e.g., 'mentioned in 40% of feedback')",
      "suggestedActions": ["Specific action 1", "Specific action 2"]
    }
  ],
  
  "individualHighlights": [
    {
      "employeeName": "Name from team",
      "positiveHighlight": "What they're consistently praised for",
      "growthOpportunity": "A constructive area for development"
    }
  ],
  
  "recommendations": [
    {
      "priority": "high",
      "action": "Specific actionable recommendation for the manager",
      "reason": "Why this matters based on the feedback analysis",
      "timeline": "When to take action (e.g., 'This week', 'This month', 'This quarter')"
    }
  ],
  
  "teamHealthScore": 7.5,
  "confidenceLevel": "high"
}

GUIDELINES:
- Be specific and reference actual patterns from the feedback
- Prioritize actionable insights over generic advice
- Include 2-4 items per category
- For individualHighlights, include highlights for team members with notable feedback (max 5)
- Keep recommendations practical and time-bound
- Score team health 1-10 based on overall feedback sentiment
- Set confidenceLevel to "high" if >10 feedback items, "medium" if 5-10, "low" if <5`;

    console.log('🤖 Generating AI team insights...');
    
    const aiResponse = await generateAIContent(prompt, { maxTokens: 2048 });
    
    // Parse the JSON response
    let parsedInsights;
    try {
      parsedInsights = parseAIJsonResponse(aiResponse.text);
    } catch (parseError) {
      console.error('Failed to parse AI insights response:', aiResponse.text);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to parse AI response' 
      });
    }
    
    // Add metadata
    parsedInsights.generatedAt = new Date().toISOString();
    parsedInsights.teamSize = teamMembers.length;
    parsedInsights.feedbackCount = feedbackData.length;
    parsedInsights.provider = aiResponse.provider;
    
    console.log(`✅ AI team insights generated successfully (provider: ${aiResponse.provider})`);
    
    res.json({
      success: true,
      data: parsedInsights
    });
    
  } catch (error: any) {
    console.error('AI team insights error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate team insights' 
    });
  }
});

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Real Database-backed server running on http://localhost:' + PORT);
  console.log('📊 Health check: http://localhost:' + PORT + '/health');
  console.log('🔐 API health: http://localhost:' + PORT + '/api/v1/health');
  console.log('📝 Test org API: http://localhost:' + PORT + '/api/v1/admin/organizations/test');
  console.log('🗄️  Database: Real PostgreSQL database connected and ready');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

// Export app for testing
export { app };
