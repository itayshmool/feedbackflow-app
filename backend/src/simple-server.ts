import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Health endpoints
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/v1/health', (_req, res) => res.json({ 
  status: 'ok', 
  timestamp: new Date().toISOString() 
}));

// Auth endpoints
app.post('/api/v1/auth/login/mock', (req, res) => {
  const { email, password } = req.body;
  
  // Mock authentication - accept any email/password for testing
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
  message: 'Organization API is working',
  timestamp: new Date().toISOString()
}));

// Mock organization endpoints
app.get('/api/v1/admin/organizations', (_req, res) => res.json({
  data: [
    {
      id: '1',
      name: 'Test Organization',
      slug: 'test-org',
      description: 'A test organization',
      contactEmail: 'test@example.com',
      isActive: true,
      status: 'active',
      subscriptionPlan: 'basic',
      maxUsers: 10,
      maxCycles: 5,
      storageLimitGb: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  pagination: {
    total: 1,
    limit: 10,
    offset: 0,
    hasMore: false
  }
}));

app.get('/api/v1/admin/organizations/stats', (_req, res) => res.json({
  totalOrganizations: 1,
  activeOrganizations: 1,
  byPlan: {
    free: 0,
    basic: 1,
    professional: 0,
    enterprise: 0
  },
  averageUsersPerOrganization: 5,
  totalDepartments: 0,
  totalTeams: 0,
  totalUsers: 0
}));

// Check slug availability
app.get('/api/v1/admin/organizations/check-slug', (req, res) => {
  const { slug } = req.query;
  
  if (!slug) {
    return res.status(400).json({
      message: 'Slug parameter is required'
    });
  }
  
  // Mock slug availability check - for demo purposes, all slugs are available
  // In a real app, you'd check against the database
  res.json({
    available: true,
    slug: slug
  });
});

// Create organization
app.post('/api/v1/admin/organizations', (req, res) => {
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
  
  // Basic validation
  if (!name || !slug || !contactEmail || !subscriptionPlan) {
    return res.status(400).json({
      message: 'Missing required fields: name, slug, contactEmail, subscriptionPlan'
    });
  }
  
  // Mock organization creation
  const newOrganization = {
    id: Date.now().toString(),
    name,
    slug,
    description: description || '',
    contactEmail,
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    website: '',
    logoUrl: '',
    isActive: true,
    status: 'active',
    subscriptionPlan,
    planStartDate: new Date().toISOString(),
    planEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
    maxUsers: maxUsers || 10,
    maxCycles: maxCycles || 5,
    storageLimitGb: storageLimitGb || 1,
    featureFlags: {},
    settings: {
      timezone: 'UTC',
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      currency: 'USD',
      workingDays: [1, 2, 3, 4, 5],
      workingHours: {
        start: '09:00',
        end: '17:00'
      },
      feedbackSettings: {
        allowAnonymous: false,
        requireManagerApproval: true,
        autoReminders: true,
        reminderFrequency: 7
      },
      notificationPreferences: {
        email: true,
        inApp: true,
        slack: false
      },
      integrationSettings: {}
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  res.status(201).json({
    success: true,
    data: newOrganization,
    message: 'Organization created successfully'
  });
});

// Create department
app.post('/api/v1/admin/organizations/:organizationId/departments', (req, res) => {
  const { organizationId } = req.params;
  const { name, description, type } = req.body;
  
  if (!name || !type) {
    return res.status(400).json({
      message: 'Missing required fields: name, type'
    });
  }
  
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
});

// Get departments for organization
app.get('/api/v1/admin/organizations/:organizationId/departments', (req, res) => {
  const { organizationId } = req.params;
  
  // Mock departments data
  const departments = [
    {
      id: 'dept-1',
      organizationId,
      name: 'Engineering',
      description: 'Software development and technical operations',
      type: 'engineering',
      parentDepartmentId: null,
      managerId: null,
      budget: 500000,
      isActive: true,
      settings: {
        allowCrossDepartmentFeedback: true,
        requireManagerApproval: false,
        customFeedbackTemplates: [],
        notificationPreferences: {
          email: true,
          inApp: true,
          sms: false
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'dept-2',
      organizationId,
      name: 'Marketing',
      description: 'Marketing and brand management',
      type: 'marketing',
      parentDepartmentId: null,
      managerId: null,
      budget: 300000,
      isActive: true,
      settings: {
        allowCrossDepartmentFeedback: true,
        requireManagerApproval: true,
        customFeedbackTemplates: [],
        notificationPreferences: {
          email: true,
          inApp: true,
          sms: false
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  res.json({
    success: true,
    data: departments,
    pagination: {
      page: 1,
      limit: 10,
      total: departments.length,
      totalPages: 1
    }
  });
});

// Get single department
app.get('/api/v1/admin/organizations/:organizationId/departments/:departmentId', (req, res) => {
  const { organizationId, departmentId } = req.params;
  
  // Mock single department data
  const department = {
    id: departmentId,
    organizationId,
    name: 'Engineering',
    description: 'Software development and technical operations',
    type: 'engineering',
    parentDepartmentId: null,
    managerId: null,
    budget: 500000,
    isActive: true,
    settings: {
      allowCrossDepartmentFeedback: true,
      requireManagerApproval: false,
      customFeedbackTemplates: [],
      notificationPreferences: {
        email: true,
        inApp: true,
        sms: false
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: department
  });
});

// Create team
app.post('/api/v1/admin/organizations/:organizationId/teams', (req, res) => {
  const { organizationId } = req.params;
  const { name, description, type, departmentId } = req.body;
  
  if (!name || !type) {
    return res.status(400).json({
      message: 'Missing required fields: name, type'
    });
  }
  
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
});

// Get teams for organization
app.get('/api/v1/admin/organizations/:organizationId/teams', (req, res) => {
  const { organizationId } = req.params;
  
  // Mock teams data
  const teams = [
    {
      id: 'team-1',
      organizationId,
      departmentId: 'dept-1',
      name: 'Frontend Team',
      description: 'Frontend development team',
      type: 'core',
      teamLeadId: null,
      isActive: true,
      settings: {
        allowPeerFeedback: true,
        requireTeamLeadApproval: false,
        customWorkflows: [],
        collaborationTools: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'team-2',
      organizationId,
      departmentId: 'dept-1',
      name: 'Backend Team',
      description: 'Backend development team',
      type: 'core',
      teamLeadId: null,
      isActive: true,
      settings: {
        allowPeerFeedback: true,
        requireTeamLeadApproval: true,
        customWorkflows: [],
        collaborationTools: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  res.json({
    success: true,
    data: teams,
    pagination: {
      page: 1,
      limit: 10,
      total: teams.length,
      totalPages: 1
    }
  });
});

// Get single team
app.get('/api/v1/admin/organizations/:organizationId/teams/:teamId', (req, res) => {
  const { organizationId, teamId } = req.params;
  
  // Mock single team data
  const team = {
    id: teamId,
    organizationId,
    departmentId: 'dept-1',
    name: 'Frontend Team',
    description: 'Frontend development team',
    type: 'core',
    teamLeadId: null,
    isActive: true,
    settings: {
      allowPeerFeedback: true,
      requireTeamLeadApproval: false,
      customWorkflows: [],
      collaborationTools: []
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: team
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Simple server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 API health: http://localhost:${PORT}/api/v1/health`);
  console.log(`📝 Test org API: http://localhost:${PORT}/api/v1/admin/organizations/test`);
});