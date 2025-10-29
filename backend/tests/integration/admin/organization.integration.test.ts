import request from 'supertest';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import { AdminOrganizationService } from '../../../src/modules/admin/services/admin-organization.service';
import { AdminOrganizationController } from '../../../src/modules/admin/controllers/admin-organization.controller';
import { createAdminOrganizationRoutes } from '../../../src/modules/admin/routes/admin-organization.routes';
import { Logger } from '../../../src/shared/utils/logger';
import { JwtService } from '../../../src/modules/auth/services/jwt.service';
import {
  CreateOrganizationRequest,
  CreateDepartmentRequest,
  CreateTeamRequest,
  SubscriptionPlan,
  DepartmentType,
  TeamType,
} from '../../../src/modules/admin/types/organization.types';

// Mock dependencies
jest.mock('../../../src/modules/admin/models/organization.model');
jest.mock('../../../src/modules/admin/models/department.model');
jest.mock('../../../src/modules/admin/models/team.model');
jest.mock('../../../src/shared/utils/logger');

describe('Organization API Integration Tests', () => {
  let app: any;
  let mockDb: jest.Mocked<Pool>;
  let mockEventEmitter: EventEmitter;
  let mockLogger: jest.Mocked<Logger>;
  let organizationService: AdminOrganizationService;
  let organizationController: AdminOrganizationController;
  let authToken: string;
  let jwtService: JwtService;

  beforeAll(() => {
    // Setup mocks
    mockDb = {
      connect: jest.fn(),
      query: jest.fn(),
    } as any;

    mockEventEmitter = new EventEmitter();
    mockLogger = new Logger() as jest.Mocked<Logger>;
    jwtService = new JwtService('test-secret');

    // Create service and controller
    organizationService = new AdminOrganizationService(mockDb, mockEventEmitter, mockLogger);
    organizationController = new AdminOrganizationController(organizationService);

    // Create Express app with routes
    const express = require('express');
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    app.use((req: any, res: any, next: any) => {
      req.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        roles: ['admin', 'super_admin'],
        organizationId: 'org-123',
      };
      next();
    });

    // Mock RBAC middleware
    app.use((req: any, res: any, next: any) => {
      next();
    });

    // Mock rate limiting middleware
    app.use((req: any, res: any, next: any) => {
      next();
    });

    // Mount routes
    app.use('/api/v1/admin/organizations', createAdminOrganizationRoutes(organizationController));

    // Generate auth token
    authToken = jwtService.sign({
      sub: 'admin-123',
      email: 'admin@example.com',
      roles: ['admin', 'super_admin'],
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/admin/organizations/organizations', () => {
    const validCreateRequest: CreateOrganizationRequest = {
      name: 'Test Organization',
      slug: 'test-org',
      contactEmail: 'test@example.com',
      subscriptionPlan: SubscriptionPlan.BASIC,
      maxUsers: 100,
      maxCycles: 50,
      storageLimitGb: 10,
    };

    it('should create organization successfully', async () => {
      // Arrange
      const mockOrganization = {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        contactEmail: 'test@example.com',
        isActive: true,
        subscriptionPlan: SubscriptionPlan.BASIC,
        maxUsers: 100,
        maxCycles: 50,
        storageLimitGb: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(organizationService, 'createOrganization').mockResolvedValue(mockOrganization as any);

      // Act
      const response = await request(app)
        .post('/api/v1/admin/organizations/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validCreateRequest);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockOrganization);
      expect(organizationService.createOrganization).toHaveBeenCalledWith(validCreateRequest);
    });

    it('should return 400 for invalid request data', async () => {
      // Arrange
      const invalidRequest = {
        name: '', // Invalid: empty name
        slug: 'test-org',
        contactEmail: 'invalid-email', // Invalid: bad email format
        subscriptionPlan: SubscriptionPlan.BASIC,
        maxUsers: 0, // Invalid: must be > 0
        maxCycles: 50,
        storageLimitGb: 10,
      };

      // Act
      const response = await request(app)
        .post('/api/v1/admin/organizations/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should return 400 for missing required fields', async () => {
      // Arrange
      const incompleteRequest = {
        name: 'Test Organization',
        // Missing slug, contactEmail, etc.
      };

      // Act
      const response = await request(app)
        .post('/api/v1/admin/organizations/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteRequest);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('GET /api/v1/admin/organizations/organizations', () => {
    it('should return organizations list', async () => {
      // Arrange
      const mockOrganizations = [
        {
          id: 'org-1',
          name: 'Organization 1',
          slug: 'org-1',
          contactEmail: 'org1@example.com',
          isActive: true,
          subscriptionPlan: SubscriptionPlan.BASIC,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'org-2',
          name: 'Organization 2',
          slug: 'org-2',
          contactEmail: 'org2@example.com',
          isActive: true,
          subscriptionPlan: SubscriptionPlan.PROFESSIONAL,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(organizationService, 'getOrganizations').mockResolvedValue(mockOrganizations as any);

      // Act
      const response = await request(app)
        .get('/api/v1/admin/organizations/organizations')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockOrganizations);
      expect(organizationService.getOrganizations).toHaveBeenCalledWith({});
    });

    it('should return organizations with filters', async () => {
      // Arrange
      const mockOrganizations = [
        {
          id: 'org-1',
          name: 'Active Organization',
          slug: 'org-1',
          contactEmail: 'org1@example.com',
          isActive: true,
          subscriptionPlan: SubscriptionPlan.BASIC,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(organizationService, 'getOrganizations').mockResolvedValue(mockOrganizations as any);

      // Act
      const response = await request(app)
        .get('/api/v1/admin/organizations/organizations?isActive=true&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockOrganizations);
      expect(organizationService.getOrganizations).toHaveBeenCalledWith({
        isActive: true,
        limit: 10,
      });
    });
  });

  describe('GET /api/v1/admin/organizations/organizations/:id', () => {
    it('should return organization by ID', async () => {
      // Arrange
      const mockOrganization = {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        contactEmail: 'test@example.com',
        isActive: true,
        subscriptionPlan: SubscriptionPlan.BASIC,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(organizationService, 'getOrganizationById').mockResolvedValue(mockOrganization as any);

      // Act
      const response = await request(app)
        .get('/api/v1/admin/organizations/organizations/org-123')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockOrganization);
      expect(organizationService.getOrganizationById).toHaveBeenCalledWith('org-123');
    });

    it('should return 404 for non-existent organization', async () => {
      // Arrange
      jest.spyOn(organizationService, 'getOrganizationById').mockRejectedValue(
        new Error('Organization with ID org-999 not found')
      );

      // Act
      const response = await request(app)
        .get('/api/v1/admin/organizations/organizations/org-999')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(500); // Error handling middleware converts to 500
    });
  });

  describe('PUT /api/v1/admin/organizations/organizations/:id', () => {
    it('should update organization successfully', async () => {
      // Arrange
      const updateData = {
        name: 'Updated Organization',
        maxUsers: 200,
      };

      const mockUpdatedOrganization = {
        id: 'org-123',
        name: 'Updated Organization',
        slug: 'test-org',
        contactEmail: 'test@example.com',
        isActive: true,
        subscriptionPlan: SubscriptionPlan.BASIC,
        maxUsers: 200,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(organizationService, 'updateOrganization').mockResolvedValue(mockUpdatedOrganization as any);

      // Act
      const response = await request(app)
        .put('/api/v1/admin/organizations/organizations/org-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUpdatedOrganization);
      expect(organizationService.updateOrganization).toHaveBeenCalledWith('org-123', updateData);
    });

    it('should return 400 for invalid update data', async () => {
      // Arrange
      const invalidUpdateData = {
        name: '', // Invalid: empty name
        maxUsers: -1, // Invalid: negative value
      };

      // Act
      const response = await request(app)
        .put('/api/v1/admin/organizations/organizations/org-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('DELETE /api/v1/admin/organizations/organizations/:id', () => {
    it('should delete organization successfully', async () => {
      // Arrange
      jest.spyOn(organizationService, 'deleteOrganization').mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .delete('/api/v1/admin/organizations/organizations/org-123')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(204);
      expect(organizationService.deleteOrganization).toHaveBeenCalledWith('org-123');
    });
  });

  describe('GET /api/v1/admin/organizations/organizations/search', () => {
    it('should search organizations successfully', async () => {
      // Arrange
      const mockSearchResults = [
        {
          id: 'org-1',
          name: 'Test Organization',
          slug: 'test-org',
          contactEmail: 'test@example.com',
          isActive: true,
          subscriptionPlan: SubscriptionPlan.BASIC,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(organizationService, 'searchOrganizations').mockResolvedValue(mockSearchResults as any);

      // Act
      const response = await request(app)
        .get('/api/v1/admin/organizations/organizations/search?q=test')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSearchResults);
      expect(organizationService.searchOrganizations).toHaveBeenCalledWith('test', {});
    });

    it('should return 400 for missing search term', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/admin/organizations/organizations/search')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('GET /api/v1/admin/organizations/organizations/stats', () => {
    it('should return organization statistics', async () => {
      // Arrange
        const mockStats = {
          totalOrganizations: 10,
          activeOrganizations: 8,
          inactiveOrganizations: 2,
          newThisMonth: 1,
          byPlan: {
            [SubscriptionPlan.FREE]: 0,
            [SubscriptionPlan.BASIC]: 5,
            [SubscriptionPlan.PROFESSIONAL]: 3,
            [SubscriptionPlan.ENTERPRISE]: 0,
          },
          averageUsersPerOrg: 50,
          totalDepartments: 25,
          totalTeams: 100,
          totalUsers: 500,
        };

      jest.spyOn(organizationService, 'getOrganizationStats').mockResolvedValue(mockStats);

      // Act
      const response = await request(app)
        .get('/api/v1/admin/organizations/organizations/stats')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
      expect(organizationService.getOrganizationStats).toHaveBeenCalled();
    });
  });

  describe('Department Management Endpoints', () => {
    describe('POST /api/v1/admin/organizations/organizations/:organizationId/departments', () => {
      it('should create department successfully', async () => {
        // Arrange
        const createDepartmentRequest: CreateDepartmentRequest = {
          name: 'Engineering',
          type: DepartmentType.ENGINEERING,
          description: 'Software engineering department',
        };

        const mockDepartment = {
          id: 'dept-123',
          organizationId: 'org-123',
          name: 'Engineering',
          type: DepartmentType.ENGINEERING,
          description: 'Software engineering department',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        jest.spyOn(organizationService, 'createDepartment').mockResolvedValue(mockDepartment as any);

        // Act
        const response = await request(app)
          .post('/api/v1/admin/organizations/organizations/org-123/departments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(createDepartmentRequest);

        // Assert
        expect(response.status).toBe(201);
        expect(response.body).toEqual(mockDepartment);
        expect(organizationService.createDepartment).toHaveBeenCalledWith('org-123', createDepartmentRequest);
      });

      it('should return 400 for invalid department data', async () => {
        // Arrange
        const invalidRequest = {
          name: '', // Invalid: empty name
          type: 'invalid-type', // Invalid: not a valid department type
        };

        // Act
        const response = await request(app)
          .post('/api/v1/admin/organizations/organizations/org-123/departments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidRequest);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation Error');
      });
    });

    describe('GET /api/v1/admin/organizations/organizations/:organizationId/departments', () => {
      it('should return departments list', async () => {
        // Arrange
        const mockDepartments = [
          {
            id: 'dept-1',
            organizationId: 'org-123',
            name: 'Engineering',
            type: DepartmentType.ENGINEERING,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'dept-2',
            organizationId: 'org-123',
            name: 'Marketing',
            type: DepartmentType.MARKETING,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        jest.spyOn(organizationService, 'getDepartments').mockResolvedValue(mockDepartments as any);

        // Act
        const response = await request(app)
          .get('/api/v1/admin/organizations/organizations/org-123/departments')
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockDepartments);
        expect(organizationService.getDepartments).toHaveBeenCalledWith('org-123', {});
      });
    });
  });

  describe('Team Management Endpoints', () => {
    describe('POST /api/v1/admin/organizations/organizations/:organizationId/teams', () => {
      it('should create team successfully', async () => {
        // Arrange
        const createTeamRequest: CreateTeamRequest = {
          name: 'Frontend Team',
          type: TeamType.CORE,
          description: 'Frontend development team',
        };

        const mockTeam = {
          id: 'team-123',
          organizationId: 'org-123',
          name: 'Frontend Team',
          type: TeamType.CORE,
          description: 'Frontend development team',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        jest.spyOn(organizationService, 'createTeam').mockResolvedValue(mockTeam as any);

        // Act
        const response = await request(app)
          .post('/api/v1/admin/organizations/organizations/org-123/teams')
          .set('Authorization', `Bearer ${authToken}`)
          .send(createTeamRequest);

        // Assert
        expect(response.status).toBe(201);
        expect(response.body).toEqual(mockTeam);
        expect(organizationService.createTeam).toHaveBeenCalledWith('org-123', createTeamRequest);
      });
    });

    describe('GET /api/v1/admin/organizations/organizations/:organizationId/teams', () => {
      it('should return teams list', async () => {
        // Arrange
        const mockTeams = [
          {
            id: 'team-1',
            organizationId: 'org-123',
            name: 'Frontend Team',
            type: TeamType.CORE,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'team-2',
            organizationId: 'org-123',
            name: 'Backend Team',
            type: TeamType.CORE,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        jest.spyOn(organizationService, 'getTeams').mockResolvedValue(mockTeams as any);

        // Act
        const response = await request(app)
          .get('/api/v1/admin/organizations/organizations/org-123/teams')
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockTeams);
        expect(organizationService.getTeams).toHaveBeenCalledWith('org-123', {});
      });
    });
  });

  describe('Bulk Operations Endpoints', () => {
    describe('POST /api/v1/admin/organizations/bulk/import', () => {
      it('should perform bulk import successfully', async () => {
        // Arrange
        const bulkImportRequest = {
          type: 'organizations',
          data: [
            {
              name: 'Org 1',
              slug: 'org-1',
              contactEmail: 'org1@example.com',
              subscriptionPlan: SubscriptionPlan.BASIC,
              maxUsers: 10,
              maxCycles: 5,
              storageLimitGb: 1,
            },
            {
              name: 'Org 2',
              slug: 'org-2',
              contactEmail: 'org2@example.com',
              subscriptionPlan: SubscriptionPlan.BASIC,
              maxUsers: 20,
              maxCycles: 10,
              storageLimitGb: 2,
            },
          ],
          options: {
            updateExisting: false,
            skipValidation: false,
            dryRun: false,
          },
        };

        const mockImportResult = {
          success: true,
          message: 'Import completed: 2 successful, 0 failed',
          results: {
            total: 2,
            successful: 2,
            failed: 0,
            errors: [],
          },
        };

        jest.spyOn(organizationService, 'bulkImport').mockResolvedValue(mockImportResult);

        // Act
        const response = await request(app)
          .post('/api/v1/admin/organizations/bulk/import')
          .set('Authorization', `Bearer ${authToken}`)
          .send(bulkImportRequest);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockImportResult);
        expect(organizationService.bulkImport).toHaveBeenCalledWith(bulkImportRequest);
      });
    });

    describe('POST /api/v1/admin/organizations/bulk/export', () => {
      it('should perform bulk export successfully', async () => {
        // Arrange
        const bulkExportRequest = {
          type: 'organizations',
          format: 'json',
          filters: {
            isActive: true,
          },
        };

        const mockExportResult = {
          success: true,
          message: 'Export completed: 2 records',
          data: [
            { id: 'org-1', name: 'Organization 1' },
            { id: 'org-2', name: 'Organization 2' },
          ],
          format: 'json',
        };

        jest.spyOn(organizationService, 'bulkExport').mockResolvedValue(mockExportResult);

        // Act
        const response = await request(app)
          .post('/api/v1/admin/organizations/bulk/export')
          .set('Authorization', `Bearer ${authToken}`)
          .send(bulkExportRequest);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockExportResult);
        expect(organizationService.bulkExport).toHaveBeenCalledWith(bulkExportRequest);
      });
    });
  });

  describe('Organization Chart Endpoints', () => {
    describe('GET /api/v1/admin/organizations/organizations/:organizationId/chart', () => {
      it('should generate organization chart successfully', async () => {
        // Arrange
        const mockChart = {
          id: 'chart-123',
          organizationId: 'org-123',
          version: 1,
          structure: {
            id: 'org-123',
            type: 'organization',
            name: 'Organization',
            children: [
              {
                id: 'dept-1',
                type: 'department',
                name: 'Engineering',
                children: [
                  {
                    id: 'team-1',
                    type: 'team',
                    name: 'Frontend Team',
                    children: [],
                    metadata: { teamId: 'team-1', level: 2 },
                  },
                ],
                metadata: { departmentId: 'dept-1', level: 1 },
              },
            ],
            metadata: { level: 0 },
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        jest.spyOn(organizationService, 'generateOrganizationChart').mockResolvedValue(mockChart as any);

        // Act
        const response = await request(app)
          .get('/api/v1/admin/organizations/organizations/org-123/chart')
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockChart);
        expect(organizationService.generateOrganizationChart).toHaveBeenCalledWith('org-123');
      });
    });
  });

  describe('Utility Endpoints', () => {
    describe('GET /api/v1/admin/organizations/organizations/check-slug', () => {
      it('should check slug availability successfully', async () => {
        // Arrange
        jest.spyOn(organizationService, 'checkSlugAvailability').mockResolvedValue(true);

        // Act
        const response = await request(app)
          .get('/api/v1/admin/organizations/organizations/check-slug?slug=available-slug')
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ available: true });
        expect(organizationService.checkSlugAvailability).toHaveBeenCalledWith('available-slug', undefined);
      });

      it('should return 400 for missing slug parameter', async () => {
        // Act
        const response = await request(app)
          .get('/api/v1/admin/organizations/organizations/check-slug')
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation Error');
      });
    });
  });
});
