import request from 'supertest';
import express from 'express';
import { AdminOrganizationController } from '../../../src/modules/admin/controllers/admin-organization.controller.js';
import { AdminOrganizationService } from '../../../src/modules/admin/services/admin-organization.service.js';
import { TeamType, DepartmentType } from '../../../src/modules/admin/types/organization.types.js';

// Mock the service
jest.mock('../../../src/modules/admin/services/admin-organization.service.js');

const MockedAdminOrganizationService = AdminOrganizationService as jest.MockedClass<typeof AdminOrganizationService>;

describe('Team and Department API Integration Tests', () => {
  let app: express.Application;
  let mockService: jest.Mocked<AdminOrganizationService>;

  const organizationId = 'org-123';
  const teamId = 'team-123';
  const departmentId = 'dept-123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock service instance
    mockService = {
      createTeam: jest.fn(),
      getTeamById: jest.fn(),
      getTeams: jest.fn(),
      updateTeam: jest.fn(),
      deleteTeam: jest.fn(),
      getTeamStats: jest.fn(),
      createDepartment: jest.fn(),
      getDepartmentById: jest.fn(),
      getDepartments: jest.fn(),
      updateDepartment: jest.fn(),
      deleteDepartment: jest.fn(),
      getDepartmentStats: jest.fn(),
      getDepartmentHierarchy: jest.fn(),
    } as any;

    // Mock the constructor to return our mock instance
    MockedAdminOrganizationService.mockImplementation(() => mockService);

    // Create Express app
    app = express();
    app.use(express.json());

    const controller = new AdminOrganizationController(mockService);

    // Team routes
    app.post('/api/v1/admin/organizations/:id/teams', controller.createTeam.bind(controller));
    app.get('/api/v1/admin/organizations/:id/teams', controller.getTeams.bind(controller));
    app.get('/api/v1/admin/organizations/:id/teams/:teamId', controller.getTeamById.bind(controller));
    app.put('/api/v1/admin/organizations/:id/teams/:teamId', controller.updateTeam.bind(controller));
    app.delete('/api/v1/admin/organizations/:id/teams/:teamId', controller.deleteTeam.bind(controller));
    app.get('/api/v1/admin/organizations/:id/teams/stats', controller.getTeamStats.bind(controller));

    // Department routes
    app.post('/api/v1/admin/organizations/:id/departments', controller.createDepartment.bind(controller));
    app.get('/api/v1/admin/organizations/:id/departments', controller.getDepartments.bind(controller));
    app.get('/api/v1/admin/organizations/:id/departments/:departmentId', controller.getDepartmentById.bind(controller));
    app.put('/api/v1/admin/organizations/:id/departments/:departmentId', controller.updateDepartment.bind(controller));
    app.delete('/api/v1/admin/organizations/:id/departments/:departmentId', controller.deleteDepartment.bind(controller));
    app.get('/api/v1/admin/organizations/:id/departments/stats', controller.getDepartmentStats.bind(controller));
    app.get('/api/v1/admin/organizations/:id/departments/hierarchy', controller.getDepartmentHierarchy.bind(controller));
  });

  describe('Team API Endpoints', () => {
    describe('POST /api/v1/admin/organizations/:id/teams', () => {
      const createTeamData = {
        name: 'Test Team',
        description: 'A test team',
        type: TeamType.CORE,
        departmentId: departmentId,
        teamLeadId: 'user-123',
        settings: {
          allowPeerFeedback: true,
          requireTeamLeadApproval: false,
          customWorkflows: [],
          collaborationTools: [],
        },
      };

      it('should create a team successfully', async () => {
        const mockTeam = {
          id: teamId,
          organizationId,
          departmentId,
          name: 'Test Team',
          description: 'A test team',
          type: TeamType.CORE,
          teamLeadId: 'user-123',
          isActive: true,
          settings: createTeamData.settings,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        };

        mockService.createTeam.mockResolvedValueOnce(mockTeam);

        const response = await request(app)
          .post(`/api/v1/admin/organizations/${organizationId}/teams`)
          .send(createTeamData)
          .expect(201);

        expect(response.body).toEqual({
          success: true,
          data: mockTeam,
        });

        expect(mockService.createTeam).toHaveBeenCalledWith(organizationId, createTeamData);
      });

      it('should return 400 for invalid team data', async () => {
        const invalidData = {
          name: '', // Invalid: empty name
          type: 'invalid_type',
        };

        const response = await request(app)
          .post(`/api/v1/admin/organizations/${organizationId}/teams`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });

      it('should return 500 for server errors', async () => {
        mockService.createTeam.mockRejectedValueOnce(new Error('Database error'));

        const response = await request(app)
          .post(`/api/v1/admin/organizations/${organizationId}/teams`)
          .send(createTeamData)
          .expect(500);

        expect(response.body).toEqual({
          success: false,
          error: 'Failed to create team',
          details: 'Database error',
        });
      });
    });

    describe('GET /api/v1/admin/organizations/:id/teams', () => {
      it('should return teams successfully', async () => {
        const mockTeams = [
          {
            id: 'team-1',
            organizationId,
            name: 'Team 1',
            type: TeamType.CORE,
            isActive: true,
            settings: { allowPeerFeedback: true, requireTeamLeadApproval: false, customWorkflows: [], collaborationTools: [] },
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
          },
          {
            id: 'team-2',
            organizationId,
            name: 'Team 2',
            type: TeamType.PROJECT,
            isActive: true,
            settings: { allowPeerFeedback: true, requireTeamLeadApproval: false, customWorkflows: [], collaborationTools: [] },
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
          },
        ];

        mockService.getTeams.mockResolvedValueOnce(mockTeams);

        const response = await request(app)
          .get(`/api/v1/admin/organizations/${organizationId}/teams`)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockTeams,
        });

        expect(mockService.getTeams).toHaveBeenCalledWith(organizationId, {});
      });

      it('should return teams with query parameters', async () => {
        const mockTeams = [{
          id: 'team-1',
          organizationId,
          name: 'Team 1',
          type: TeamType.CORE,
          isActive: true,
          settings: { allowPeerFeedback: true, requireTeamLeadApproval: false, customWorkflows: [], collaborationTools: [] },
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        }];
        mockService.getTeams.mockResolvedValueOnce(mockTeams);

        const response = await request(app)
          .get(`/api/v1/admin/organizations/${organizationId}/teams`)
          .query({
            isActive: 'true',
            type: 'core',
            departmentId: departmentId,
            limit: '10',
            offset: '0',
          })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockTeams,
        });

        expect(mockService.getTeams).toHaveBeenCalledWith(organizationId, {
          isActive: true,
          type: 'core',
          departmentId: departmentId,
          limit: 10,
          offset: 0,
        });
      });
    });

    describe('GET /api/v1/admin/organizations/:id/teams/:teamId', () => {
      it('should return a specific team', async () => {
        const mockTeam = {
          id: teamId,
          organizationId,
          name: 'Test Team',
          type: TeamType.CORE,
          isActive: true,
          settings: { allowPeerFeedback: true, requireTeamLeadApproval: false, customWorkflows: [], collaborationTools: [] },
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        };

        mockService.getTeamById.mockResolvedValueOnce(mockTeam);

        const response = await request(app)
          .get(`/api/v1/admin/organizations/${organizationId}/teams/${teamId}`)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockTeam,
        });

        expect(mockService.getTeamById).toHaveBeenCalledWith(organizationId, teamId);
      });

      it('should return 404 for non-existent team', async () => {
        mockService.getTeamById.mockRejectedValueOnce(new Error('Team not found'));

        const response = await request(app)
          .get(`/api/v1/admin/organizations/${organizationId}/teams/${teamId}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Team not found');
      });
    });

    describe('PUT /api/v1/admin/organizations/:id/teams/:teamId', () => {
      const updateData = {
        name: 'Updated Team',
        description: 'Updated description',
        type: TeamType.PROJECT,
      };

      it('should update a team successfully', async () => {
        const mockUpdatedTeam = {
          id: teamId,
          organizationId,
          name: 'Updated Team',
          description: 'Updated description',
          type: TeamType.PROJECT,
          isActive: true,
          settings: {
            allowPeerFeedback: true,
            requireTeamLeadApproval: false,
            customWorkflows: [],
            collaborationTools: [],
          },
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-02'),
        };

        mockService.updateTeam.mockResolvedValueOnce(mockUpdatedTeam);

        const response = await request(app)
          .put(`/api/v1/admin/organizations/${organizationId}/teams/${teamId}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockUpdatedTeam,
        });

        expect(mockService.updateTeam).toHaveBeenCalledWith(organizationId, teamId, updateData);
      });
    });

    describe('DELETE /api/v1/admin/organizations/:id/teams/:teamId', () => {
      it('should delete a team successfully', async () => {
        mockService.deleteTeam.mockResolvedValueOnce(undefined);

        await request(app)
          .delete(`/api/v1/admin/organizations/${organizationId}/teams/${teamId}`)
          .expect(204);

        expect(mockService.deleteTeam).toHaveBeenCalledWith(organizationId, teamId);
      });
    });

    describe('GET /api/v1/admin/organizations/:id/teams/stats', () => {
      it('should return team statistics', async () => {
        const mockStats = {
          totalTeams: 10,
          activeTeams: 8,
          inactiveTeams: 2,
          byType: {
            core: 5,
            project: 2,
            cross_functional: 0,
            temporary: 0,
            custom: 3,
          },
          averageUsersPerTeam: 4.5,
          crossFunctionalTeams: 0,
        };

        mockService.getTeamStats.mockResolvedValueOnce(mockStats);

        const response = await request(app)
          .get(`/api/v1/admin/organizations/${organizationId}/teams/stats`)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockStats,
        });

        expect(mockService.getTeamStats).toHaveBeenCalledWith(organizationId);
      });
    });
  });

  describe('Department API Endpoints', () => {
    describe('POST /api/v1/admin/organizations/:id/departments', () => {
      const createDepartmentData = {
        name: 'Test Department',
        description: 'A test department',
        type: DepartmentType.ENGINEERING,
        parentDepartmentId: 'parent-dept-123',
        managerId: 'user-123',
        budget: 100000,
        settings: {
          allowCrossDepartmentFeedback: true,
          requireManagerApproval: false,
          customFeedbackTemplates: [],
          notificationPreferences: {
            email: true,
            inApp: true,
            sms: false,
          },
        },
      };

      it('should create a department successfully', async () => {
        const mockDepartment = {
          id: departmentId,
          organizationId,
          name: 'Test Department',
          description: 'A test department',
          type: DepartmentType.ENGINEERING,
          parentDepartmentId: 'parent-dept-123',
          managerId: 'user-123',
          budget: 100000,
          isActive: true,
          settings: createDepartmentData.settings,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        };

        mockService.createDepartment.mockResolvedValueOnce(mockDepartment);

        const response = await request(app)
          .post(`/api/v1/admin/organizations/${organizationId}/departments`)
          .send(createDepartmentData)
          .expect(201);

        expect(response.body).toEqual({
          success: true,
          data: mockDepartment,
        });

        expect(mockService.createDepartment).toHaveBeenCalledWith(organizationId, createDepartmentData);
      });

      it('should return 400 for invalid department data', async () => {
        const invalidData = {
          name: '', // Invalid: empty name
          type: 'invalid_type',
        };

        const response = await request(app)
          .post(`/api/v1/admin/organizations/${organizationId}/departments`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('GET /api/v1/admin/organizations/:id/departments', () => {
      it('should return departments successfully', async () => {
        const mockDepartments = [
          {
            id: 'dept-1',
            organizationId,
            name: 'Department 1',
            type: DepartmentType.ENGINEERING,
            isActive: true,
            settings: {
              allowCrossDepartmentFeedback: true,
              requireManagerApproval: false,
              customFeedbackTemplates: [],
              notificationPreferences: { email: true, inApp: true, sms: false },
            },
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
          },
          {
            id: 'dept-2',
            organizationId,
            name: 'Department 2',
            type: DepartmentType.MARKETING,
            isActive: true,
            settings: {
              allowCrossDepartmentFeedback: true,
              requireManagerApproval: false,
              customFeedbackTemplates: [],
              notificationPreferences: { email: true, inApp: true, sms: false },
            },
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
          },
        ];

        mockService.getDepartments.mockResolvedValueOnce(mockDepartments);

        const response = await request(app)
          .get(`/api/v1/admin/organizations/${organizationId}/departments`)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockDepartments,
        });

        expect(mockService.getDepartments).toHaveBeenCalledWith(organizationId, {});
      });

      it('should return departments with query parameters', async () => {
        const mockDepartments = [{
          id: 'dept-1',
          organizationId,
          name: 'Department 1',
          type: DepartmentType.ENGINEERING,
          isActive: true,
          settings: {
            allowCrossDepartmentFeedback: true,
            requireManagerApproval: false,
            customFeedbackTemplates: [],
            notificationPreferences: { email: true, inApp: true, sms: false },
          },
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        }];
        mockService.getDepartments.mockResolvedValueOnce(mockDepartments);

        const response = await request(app)
          .get(`/api/v1/admin/organizations/${organizationId}/departments`)
          .query({
            isActive: 'true',
            type: 'engineering',
            parentDepartmentId: 'parent-dept-123',
            limit: '10',
            offset: '0',
          })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockDepartments,
        });

        expect(mockService.getDepartments).toHaveBeenCalledWith(organizationId, {
          isActive: true,
          type: 'engineering',
          parentDepartmentId: 'parent-dept-123',
          limit: 10,
          offset: 0,
        });
      });
    });

    describe('GET /api/v1/admin/organizations/:id/departments/:departmentId', () => {
      it('should return a specific department', async () => {
        const mockDepartment = {
          id: departmentId,
          organizationId,
          name: 'Test Department',
          type: DepartmentType.ENGINEERING,
          isActive: true,
          settings: {
            allowCrossDepartmentFeedback: true,
            requireManagerApproval: false,
            customFeedbackTemplates: [],
            notificationPreferences: { email: true, inApp: true, sms: false },
          },
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        };

        mockService.getDepartmentById.mockResolvedValueOnce(mockDepartment);

        const response = await request(app)
          .get(`/api/v1/admin/organizations/${organizationId}/departments/${departmentId}`)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockDepartment,
        });

        expect(mockService.getDepartmentById).toHaveBeenCalledWith(organizationId, departmentId);
      });

      it('should return 404 for non-existent department', async () => {
        mockService.getDepartmentById.mockRejectedValueOnce(new Error('Department not found'));

        const response = await request(app)
          .get(`/api/v1/admin/organizations/${organizationId}/departments/${departmentId}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Department not found');
      });
    });

    describe('PUT /api/v1/admin/organizations/:id/departments/:departmentId', () => {
      const updateData = {
        name: 'Updated Department',
        description: 'Updated description',
        type: DepartmentType.SALES,
        budget: 150000,
      };

      it('should update a department successfully', async () => {
        const mockUpdatedDepartment = {
          id: departmentId,
          organizationId,
          name: 'Updated Department',
          description: 'Updated description',
          type: DepartmentType.SALES,
          budget: 150000,
          isActive: true,
          settings: {
            allowCrossDepartmentFeedback: true,
            requireManagerApproval: false,
            customFeedbackTemplates: [],
            notificationPreferences: { email: true, inApp: true, sms: false },
          },
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-02'),
        };

        mockService.updateDepartment.mockResolvedValueOnce(mockUpdatedDepartment);

        const response = await request(app)
          .put(`/api/v1/admin/organizations/${organizationId}/departments/${departmentId}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockUpdatedDepartment,
        });

        expect(mockService.updateDepartment).toHaveBeenCalledWith(organizationId, departmentId, updateData);
      });
    });

    describe('DELETE /api/v1/admin/organizations/:id/departments/:departmentId', () => {
      it('should delete a department successfully', async () => {
        mockService.deleteDepartment.mockResolvedValueOnce(undefined);

        await request(app)
          .delete(`/api/v1/admin/organizations/${organizationId}/departments/${departmentId}`)
          .expect(204);

        expect(mockService.deleteDepartment).toHaveBeenCalledWith(organizationId, departmentId);
      });
    });

    describe('GET /api/v1/admin/organizations/:id/departments/stats', () => {
      it('should return department statistics', async () => {
        const mockStats = {
          totalDepartments: 8,
          activeDepartments: 7,
          inactiveDepartments: 1,
          byType: {
            executive: 1,
            operations: 0,
            sales: 2,
            marketing: 2,
            engineering: 3,
            hr: 1,
            finance: 0,
            custom: 1,
          },
          averageTeamsPerDepartment: 2.5,
          averageUsersPerDepartment: 12.5,
          totalTeams: 20,
          totalUsers: 100,
        };

        mockService.getDepartmentStats.mockResolvedValueOnce(mockStats);

        const response = await request(app)
          .get(`/api/v1/admin/organizations/${organizationId}/departments/stats`)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockStats,
        });

        expect(mockService.getDepartmentStats).toHaveBeenCalledWith(organizationId);
      });
    });

    describe('GET /api/v1/admin/organizations/:id/departments/hierarchy', () => {
      it('should return department hierarchy', async () => {
        const mockHierarchy = [
          {
            id: 'dept-1',
            organizationId,
            name: 'Engineering',
            type: DepartmentType.ENGINEERING,
            parentDepartmentId: undefined,
            isActive: true,
            settings: {
              allowCrossDepartmentFeedback: true,
              requireManagerApproval: false,
              customFeedbackTemplates: [],
              notificationPreferences: { email: true, inApp: true, sms: false },
            },
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
            level: 0,
          },
          {
            id: 'dept-2',
            organizationId,
            name: 'Frontend',
            type: DepartmentType.ENGINEERING,
            parentDepartmentId: 'dept-1',
            isActive: true,
            settings: {
              allowCrossDepartmentFeedback: true,
              requireManagerApproval: false,
              customFeedbackTemplates: [],
              notificationPreferences: { email: true, inApp: true, sms: false },
            },
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
            level: 1,
          },
          {
            id: 'dept-3',
            organizationId,
            name: 'Backend',
            type: DepartmentType.ENGINEERING,
            parentDepartmentId: 'dept-1',
            isActive: true,
            settings: {
              allowCrossDepartmentFeedback: true,
              requireManagerApproval: false,
              customFeedbackTemplates: [],
              notificationPreferences: { email: true, inApp: true, sms: false },
            },
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
            level: 1,
          },
        ];

        mockService.getDepartmentHierarchy.mockResolvedValueOnce(mockHierarchy);

        const response = await request(app)
          .get(`/api/v1/admin/organizations/${organizationId}/departments/hierarchy`)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockHierarchy,
        });

        expect(mockService.getDepartmentHierarchy).toHaveBeenCalledWith(organizationId);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/organizations/${organizationId}/teams`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing required parameters', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/organizations/${organizationId}/teams/invalid-team-id`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle service layer errors gracefully', async () => {
      mockService.getTeams.mockRejectedValueOnce(new Error('Service error'));

      const response = await request(app)
        .get(`/api/v1/admin/organizations/${organizationId}/teams`)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch teams',
        details: 'Service error',
      });
    });
  });
});
