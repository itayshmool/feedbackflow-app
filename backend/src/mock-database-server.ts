import express from 'express';
import cors from 'cors';
import { testConnection, healthCheck } from './config/mock-database.js';
import { DatabaseOrganizationService } from './services/DatabaseOrganizationService.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Initialize services
const organizationService = new DatabaseOrganizationService();

// Health endpoints
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/v1/health', async (_req, res) => {
  try {
    const dbHealth = await healthCheck();
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: dbHealth
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Auth endpoints (keeping mock for now)
app.post('/api/v1/auth/login/mock', (req, res) => {
  const { email, password } = req.body;
  
  if (email && password) {
    const mockUser = {
      id: '1',
      email: email,
      name: 'Test User',
      roles: ['admin'],
      organizationId: '1',
      organizationName: 'Test Organization',
      permissions: ['admin:all'],
      isActive: true,
      lastLoginAt: new Date().toISOString()
    };
    
    const mockToken = 'mock-jwt-token-' + Date.now();
    
    res.json({
      user: mockUser,
      token: mockToken,
      expiresIn: 3600,
      message: 'Login successful'
    });
  } else {
    res.status(400).json({
      message: 'Email and password are required'
    });
  }
});

app.get('/api/v1/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      roles: ['admin'],
      organizationId: '1',
      organizationName: 'Test Organization',
      permissions: ['admin:all'],
      isActive: true,
      lastLoginAt: new Date().toISOString()
    };
    
    res.json(mockUser);
  } else {
    res.status(401).json({
      message: 'Unauthorized'
    });
  }
});

app.post('/api/v1/auth/refresh', (req, res) => {
  const mockToken = 'mock-jwt-token-refreshed-' + Date.now();
  
  res.json({
    token: mockToken,
    expiresIn: 3600
  });
});

// Test organization endpoint
app.get('/api/v1/admin/organizations/test', (_req, res) => res.json({ 
  message: 'Mock Database-backed Organization API is working',
  timestamp: new Date().toISOString()
}));

// Organization endpoints using database
app.get('/api/v1/admin/organizations', async (req, res) => {
  try {
    const { limit = 10, offset = 0, search, status, subscription_plan, is_active } = req.query;
    
    const filters = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      search: search as string,
      status: status as string,
      subscription_plan: subscription_plan as string,
      is_active: is_active ? is_active === 'true' : undefined
    };

    const result = await organizationService.getOrganizations(filters);
    
    res.json({
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({
      message: 'Failed to fetch organizations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/v1/admin/organizations/stats', async (req, res) => {
  try {
    const stats = await organizationService.getOrganizationStats();
    
    // Transform to match frontend expectations
    res.json({
      totalOrganizations: stats.total_organizations,
      activeOrganizations: stats.active_organizations,
      byPlan: stats.by_plan,
      averageUsersPerOrganization: stats.average_users_per_organization,
      totalDepartments: stats.total_departments,
      totalTeams: stats.total_teams,
      totalUsers: stats.total_users
    });
  } catch (error) {
    console.error('Error fetching organization stats:', error);
    res.status(500).json({
      message: 'Failed to fetch organization statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check slug availability
app.get('/api/v1/admin/organizations/check-slug', async (req, res) => {
  try {
    const { slug } = req.query;
    
    if (!slug) {
      return res.status(400).json({
        message: 'Slug parameter is required'
      });
    }
    
    const isAvailable = await organizationService.checkSlugAvailability(slug as string);
    
    res.json({
      available: isAvailable,
      slug: slug
    });
  } catch (error) {
    console.error('Error checking slug availability:', error);
    res.status(500).json({
      message: 'Failed to check slug availability',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create organization
app.post('/api/v1/admin/organizations', async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      contactEmail,
      subscriptionPlan,
      maxUsers,
      maxCycles,
      storageLimitGb
    } = req.body;
    
    if (!name || !slug || !contactEmail || !subscriptionPlan) {
      return res.status(400).json({
        message: 'Missing required fields: name, slug, contactEmail, subscriptionPlan'
      });
    }
    
    const organizationData = {
      name,
      slug,
      description,
      contact_email: contactEmail,
      subscription_plan: subscriptionPlan,
      max_users: maxUsers || 10,
      max_cycles: maxCycles || 5,
      storage_limit_gb: storageLimitGb || 1
    };
    
    const organization = await organizationService.createOrganization(organizationData);
    
    res.status(201).json({
      success: true,
      data: organization,
      message: 'Organization created successfully'
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({
      message: 'Failed to create organization',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get organization by ID
app.get('/api/v1/admin/organizations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organization = await organizationService.getOrganizationById(id);
    
    if (!organization) {
      return res.status(404).json({
        message: 'Organization not found'
      });
    }
    
    res.json({
      success: true,
      data: organization
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({
      message: 'Failed to fetch organization',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update organization
app.put('/api/v1/admin/organizations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const organization = await organizationService.updateOrganization(id, updateData);
    
    if (!organization) {
      return res.status(404).json({
        message: 'Organization not found'
      });
    }
    
    res.json({
      success: true,
      data: organization,
      message: 'Organization updated successfully'
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({
      message: 'Failed to update organization',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete organization
app.delete('/api/v1/admin/organizations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organization = await organizationService.deleteOrganization(id);
    
    if (!organization) {
      return res.status(404).json({
        message: 'Organization not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({
      message: 'Failed to delete organization',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create department
app.post('/api/v1/admin/organizations/:organizationId/departments', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { name, description, type } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({
        message: 'Missing required fields: name, type'
      });
    }
    
    // For now, return a mock response since we haven't implemented department service yet
    const newDepartment = {
      id: Date.now().toString(),
      name,
      description: description || '',
      type,
      organizationId,
      parentDepartmentId: null,
      managerId: null,
      budget: null,
      isActive: true,
      settings: {
        allowCrossDepartmentFeedback: false,
        requireManagerApproval: true,
        feedbackFrequency: 30,
        notificationPreferences: {
          email: true,
          inApp: true
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      data: newDepartment,
      message: 'Department created successfully'
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({
      message: 'Failed to create department',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create team
app.post('/api/v1/admin/organizations/:organizationId/teams', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { name, description, type, departmentId } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({
        message: 'Missing required fields: name, type'
      });
    }
    
    // For now, return a mock response since we haven't implemented team service yet
    const newTeam = {
      id: Date.now().toString(),
      name,
      description: description || '',
      type,
      organizationId,
      departmentId: departmentId || null,
      teamLeadId: null,
      isActive: true,
      settings: {
        allowPeerFeedback: true,
        requireTeamLeadApproval: false,
        feedbackFrequency: 30,
        notificationPreferences: {
          email: true,
          inApp: true
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      data: newTeam,
      message: 'Team created successfully'
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      message: 'Failed to create team',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to mock database. Server will not start.');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Mock Database-backed server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 API health: http://localhost:${PORT}/api/v1/health`);
      console.log(`📝 Test org API: http://localhost:${PORT}/api/v1/admin/organizations/test`);
      console.log(`🗄️  Database: Mock database connected and ready`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
