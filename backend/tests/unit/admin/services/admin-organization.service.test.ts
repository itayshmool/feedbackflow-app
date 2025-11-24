import { AdminOrganizationService } from '../../../../src/modules/admin/services/admin-organization.service';
import { OrganizationModelClass } from '../../../../src/modules/admin/models/organization.model';
import { DepartmentModelClass } from '../../../../src/modules/admin/models/department.model';
import { TeamModelClass } from '../../../../src/modules/admin/models/team.model';
import { EventEmitter } from 'events';
import { Logger } from '../../../../src/shared/utils/logger';
import { Pool } from 'pg';
import {
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  CreateDepartmentRequest,
  CreateTeamRequest,
  BulkImportRequest,
  BulkExportRequest,
  OrganizationStatus,
  SubscriptionPlan,
  DepartmentType,
  TeamType,
} from '../../../../src/modules/admin/types/organization.types';

// Mock dependencies
jest.mock('../../../../src/modules/admin/models/organization.model');
jest.mock('../../../../src/modules/admin/models/department.model');
jest.mock('../../../../src/modules/admin/models/team.model');
jest.mock('../../../../src/shared/utils/logger');

describe('AdminOrganizationService', () => {
  let service: AdminOrganizationService;
  let mockDb: any;
  let mockEventEmitter: EventEmitter;
  let mockLogger: jest.Mocked<Logger>;
  let mockOrganizationModel: jest.Mocked<OrganizationModelClass>;
  let mockDepartmentModel: jest.Mocked<DepartmentModelClass>;
  let mockTeamModel: jest.Mocked<TeamModelClass>;

  beforeEach(() => {
    // Create mocks
    const mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockDb = {
      connect: jest.fn().mockResolvedValue(mockClient),
    } as any;

    mockEventEmitter = new EventEmitter();
    mockLogger = new Logger() as jest.Mocked<Logger>;
    
    mockOrganizationModel = new OrganizationModelClass(mockDb) as jest.Mocked<OrganizationModelClass>;
    mockDepartmentModel = new DepartmentModelClass(mockDb) as jest.Mocked<DepartmentModelClass>;
    mockTeamModel = new TeamModelClass(mockDb) as jest.Mocked<TeamModelClass>;

    // Create service instance
    service = new AdminOrganizationService(mockDb, mockEventEmitter, mockLogger);

    // Replace model instances with mocks
    (service as any).organizationModel = mockOrganizationModel;
    (service as any).departmentModel = mockDepartmentModel;
    (service as any).teamModel = mockTeamModel;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Organization Management', () => {
    const mockOrganization = {
      id: 'org-123',
      name: 'Test Organization',
      slug: 'test-org',
      contactEmail: 'test@example.com',
      isActive: true,
      status: OrganizationStatus.ACTIVE,
      subscriptionPlan: SubscriptionPlan.BASIC,
      planStartDate: new Date(),
      planEndDate: new Date(),
      maxUsers: 100,
      maxCycles: 50,
      storageLimitGb: 10,
      featureFlags: {},
      settings: {
        timezone: 'UTC',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
        workingDays: [1, 2, 3, 4, 5],
        workingHours: { start: '09:00', end: '17:00' },
        feedbackSettings: {
          allowAnonymous: false,
          requireManagerApproval: true,
          autoCloseCycles: false,
          reminderFrequency: 7,
        },
        notificationSettings: {
          emailNotifications: true,
          inAppNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
        },
        securitySettings: {
          requireMFA: false,
          sessionTimeout: 480,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: false,
          },
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCreateRequest: CreateOrganizationRequest = {
      name: 'Test Organization',
      slug: 'test-org',
      contactEmail: 'test@example.com',
      subscriptionPlan: SubscriptionPlan.BASIC,
      maxUsers: 100,
      maxCycles: 50,
      storageLimitGb: 10,
    };

    describe('createOrganization', () => {
      it('should create organization successfully', async () => {
        // Arrange
        mockOrganizationModel.validateOrganizationData.mockResolvedValue(undefined);
        mockOrganizationModel.createOrganization.mockResolvedValue(mockOrganization);

        // Act
        const result = await service.createOrganization(mockCreateRequest);

        // Assert
        expect(mockOrganizationModel.validateOrganizationData).toHaveBeenCalledWith(mockCreateRequest);
        expect(mockOrganizationModel.createOrganization).toHaveBeenCalledWith(mockCreateRequest, expect.any(Object));
        expect(result).toEqual(mockOrganization);
        expect(mockLogger.info).toHaveBeenCalledWith('Organization created successfully', {
          organizationId: mockOrganization.id,
          name: mockOrganization.name,
        });
      });

      it('should handle validation errors', async () => {
        // Arrange
        const validationError = new Error('Invalid organization data');
        mockOrganizationModel.validateOrganizationData.mockRejectedValue(validationError);

        // Act & Assert
        await expect(service.createOrganization(mockCreateRequest)).rejects.toThrow('Invalid organization data');
        expect(mockOrganizationModel.createOrganization).not.toHaveBeenCalled();
      });
    });

    describe('getOrganizationById', () => {
      it('should return organization when found', async () => {
        // Arrange
        mockOrganizationModel.getOrganizationById.mockResolvedValue(mockOrganization);

        // Act
        const result = await service.getOrganizationById('org-123');

        // Assert
        expect(mockOrganizationModel.getOrganizationById).toHaveBeenCalledWith('org-123');
        expect(result).toEqual(mockOrganization);
      });

      it('should throw NotFoundError when organization not found', async () => {
        // Arrange
        mockOrganizationModel.getOrganizationById.mockResolvedValue(null);

        // Act & Assert
        await expect(service.getOrganizationById('org-123')).rejects.toThrow('Organization with ID org-123 not found');
      });
    });

    describe('updateOrganization', () => {
      const updateData: UpdateOrganizationRequest = {
        name: 'Updated Organization',
        maxUsers: 200,
      };

      it('should update organization successfully', async () => {
        // Arrange
        const updatedOrg = { 
        ...mockOrganization, 
        ...updateData,
        settings: {
          ...mockOrganization.settings,
          ...updateData.settings,
        },
      };
        mockOrganizationModel.getOrganizationById.mockResolvedValue(mockOrganization);
        mockOrganizationModel.updateOrganization.mockResolvedValue(updatedOrg);

        // Act
        const result = await service.updateOrganization('org-123', updateData);

        // Assert
        expect(mockOrganizationModel.getOrganizationById).toHaveBeenCalledWith('org-123', expect.any(Object));
        expect(mockOrganizationModel.updateOrganization).toHaveBeenCalledWith('org-123', updateData, expect.any(Object));
        expect(result).toEqual(updatedOrg);
        expect(mockLogger.info).toHaveBeenCalledWith('Organization updated successfully', {
          organizationId: updatedOrg.id,
          name: updatedOrg.name,
        });
      });

      it('should throw NotFoundError when organization not found', async () => {
        // Arrange
        mockOrganizationModel.getOrganizationById.mockResolvedValue(null);

        // Act & Assert
        await expect(service.updateOrganization('org-123', updateData)).rejects.toThrow('Organization with ID org-123 not found');
      });
    });

    describe('deleteOrganization', () => {
      it('should delete organization successfully', async () => {
        // Arrange
        mockOrganizationModel.getOrganizationById.mockResolvedValue(mockOrganization);
        mockDepartmentModel.getDepartments.mockResolvedValue([]);
        mockTeamModel.getTeams.mockResolvedValue([]);
        mockOrganizationModel.deleteOrganization.mockResolvedValue(undefined);

        // Act
        await service.deleteOrganization('org-123');

        // Assert
        expect(mockOrganizationModel.getOrganizationById).toHaveBeenCalledWith('org-123', expect.any(Object));
        expect(mockDepartmentModel.getDepartments).toHaveBeenCalledWith('org-123', {}, expect.any(Object));
        expect(mockTeamModel.getTeams).toHaveBeenCalledWith('org-123', {}, expect.any(Object));
        expect(mockOrganizationModel.deleteOrganization).toHaveBeenCalledWith('org-123', expect.any(Object));
        expect(mockLogger.warn).toHaveBeenCalledWith('Organization deleted successfully', {
          organizationId: mockOrganization.id,
          name: mockOrganization.name,
        });
      });

      it('should throw ValidationError when organization has departments', async () => {
        // Arrange
        const mockDepartments = [{ id: 'dept-1', name: 'Test Department' }];
        mockOrganizationModel.getOrganizationById.mockResolvedValue(mockOrganization);
        mockDepartmentModel.getDepartments.mockResolvedValue(mockDepartments as any);

        // Act & Assert
        await expect(service.deleteOrganization('org-123')).rejects.toThrow('Cannot delete organization with departments');
        expect(mockOrganizationModel.deleteOrganization).not.toHaveBeenCalled();
      });
    });

    describe('searchOrganizations', () => {
      it('should search organizations successfully', async () => {
        // Arrange
        const searchResults = [mockOrganization];
        mockOrganizationModel.searchOrganizations.mockResolvedValue(searchResults);

        // Act
        const result = await service.searchOrganizations('test', { isActive: true });

        // Assert
        expect(mockOrganizationModel.searchOrganizations).toHaveBeenCalledWith('test', { isActive: true });
        expect(result).toEqual(searchResults);
      });
    });

    describe('getOrganizationStats', () => {
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
        mockOrganizationModel.getOrganizationStats.mockResolvedValue(mockStats);

        // Act
        const result = await service.getOrganizationStats();

        // Assert
        expect(mockOrganizationModel.getOrganizationStats).toHaveBeenCalled();
        expect(result).toEqual(mockStats);
      });
    });
  });

  describe('Department Management', () => {
    const mockDepartment = {
      id: 'dept-123',
      organizationId: 'org-123',
      name: 'Test Department',
      type: DepartmentType.ENGINEERING,
      isActive: true,
      settings: {
        allowCrossDepartmentFeedback: false,
        requireManagerApproval: true,
        customFeedbackTemplates: [],
        notificationPreferences: {
          email: true,
          inApp: true,
          sms: false,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCreateDepartmentRequest: CreateDepartmentRequest = {
      name: 'Test Department',
      type: DepartmentType.ENGINEERING,
    };

    describe('createDepartment', () => {
      it('should create department successfully', async () => {
        // Arrange
        mockOrganizationModel.getOrganizationById.mockResolvedValue({ id: 'org-123' } as any);
        mockDepartmentModel.validateDepartmentData.mockResolvedValue(undefined);
        mockDepartmentModel.createDepartment.mockResolvedValue(mockDepartment);

        // Act
        const result = await service.createDepartment('org-123', mockCreateDepartmentRequest);

        // Assert
        expect(mockOrganizationModel.getOrganizationById).toHaveBeenCalledWith('org-123');
        expect(mockDepartmentModel.validateDepartmentData).toHaveBeenCalledWith('org-123', mockCreateDepartmentRequest);
        expect(mockDepartmentModel.createDepartment).toHaveBeenCalledWith('org-123', mockCreateDepartmentRequest, expect.any(Object));
        expect(result).toEqual(mockDepartment);
        expect(mockLogger.info).toHaveBeenCalledWith('Department created successfully', {
          organizationId: 'org-123',
          departmentId: mockDepartment.id,
          name: mockDepartment.name,
        });
      });

      it('should throw NotFoundError when organization not found', async () => {
        // Arrange
        mockOrganizationModel.getOrganizationById.mockResolvedValue(null);

        // Act & Assert
        await expect(service.createDepartment('org-123', mockCreateDepartmentRequest)).rejects.toThrow('Organization with ID org-123 not found');
        expect(mockDepartmentModel.createDepartment).not.toHaveBeenCalled();
      });
    });

    describe('getDepartmentById', () => {
      it('should return department when found', async () => {
        // Arrange
        mockDepartmentModel.getDepartmentById.mockResolvedValue(mockDepartment);

        // Act
        const result = await service.getDepartmentById('org-123', 'dept-123');

        // Assert
        expect(mockDepartmentModel.getDepartmentById).toHaveBeenCalledWith('dept-123', 'org-123');
        expect(result).toEqual(mockDepartment);
      });

      it('should throw NotFoundError when department not found', async () => {
        // Arrange
        mockDepartmentModel.getDepartmentById.mockResolvedValue(null);

        // Act & Assert
        await expect(service.getDepartmentById('org-123', 'dept-123')).rejects.toThrow('Department with ID dept-123 not found');
      });
    });

    describe('getDepartments', () => {
      it('should return departments list', async () => {
        // Arrange
        const departments = [mockDepartment];
        mockDepartmentModel.getDepartments.mockResolvedValue(departments);

        // Act
        const result = await service.getDepartments('org-123', { isActive: true });

        // Assert
        expect(mockDepartmentModel.getDepartments).toHaveBeenCalledWith('org-123', { isActive: true, type: undefined });
        expect(result).toEqual(departments);
      });
    });

    describe('deleteDepartment', () => {
      it('should delete department successfully', async () => {
        // Arrange
        mockDepartmentModel.getDepartmentById.mockResolvedValue(mockDepartment);
        mockDepartmentModel.deleteDepartment.mockResolvedValue(undefined);

        // Act
        await service.deleteDepartment('org-123', 'dept-123');

        // Assert
        expect(mockDepartmentModel.getDepartmentById).toHaveBeenCalledWith('dept-123', 'org-123', expect.any(Object));
        expect(mockDepartmentModel.deleteDepartment).toHaveBeenCalledWith('dept-123', 'org-123', expect.any(Object));
        expect(mockLogger.warn).toHaveBeenCalledWith('Department deleted successfully', {
          organizationId: 'org-123',
          departmentId: mockDepartment.id,
          name: mockDepartment.name,
        });
      });
    });
  });

  describe('Team Management', () => {
    const mockTeam = {
      id: 'team-123',
      organizationId: 'org-123',
      name: 'Test Team',
      type: TeamType.CORE,
      isActive: true,
      settings: {
        allowPeerFeedback: true,
        requireTeamLeadApproval: false,
        customWorkflows: [],
        collaborationTools: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCreateTeamRequest: CreateTeamRequest = {
      name: 'Test Team',
      type: TeamType.CORE,
    };

    describe('createTeam', () => {
      it('should create team successfully', async () => {
        // Arrange
        mockOrganizationModel.getOrganizationById.mockResolvedValue({ id: 'org-123' } as any);
        mockTeamModel.validateTeamData.mockResolvedValue(undefined);
        mockTeamModel.createTeam.mockResolvedValue(mockTeam);

        // Act
        const result = await service.createTeam('org-123', mockCreateTeamRequest);

        // Assert
        expect(mockOrganizationModel.getOrganizationById).toHaveBeenCalledWith('org-123');
        expect(mockTeamModel.validateTeamData).toHaveBeenCalledWith('org-123', mockCreateTeamRequest);
        expect(mockTeamModel.createTeam).toHaveBeenCalledWith('org-123', mockCreateTeamRequest, expect.any(Object));
        expect(result).toEqual(mockTeam);
        expect(mockLogger.info).toHaveBeenCalledWith('Team created successfully', {
          organizationId: 'org-123',
          teamId: mockTeam.id,
          name: mockTeam.name,
        });
      });
    });

    describe('getTeamById', () => {
      it('should return team when found', async () => {
        // Arrange
        mockTeamModel.getTeamById.mockResolvedValue(mockTeam);

        // Act
        const result = await service.getTeamById('org-123', 'team-123');

        // Assert
        expect(mockTeamModel.getTeamById).toHaveBeenCalledWith('team-123', 'org-123');
        expect(result).toEqual(mockTeam);
      });

      it('should throw NotFoundError when team not found', async () => {
        // Arrange
        mockTeamModel.getTeamById.mockResolvedValue(null);

        // Act & Assert
        await expect(service.getTeamById('org-123', 'team-123')).rejects.toThrow('Team with ID team-123 not found');
      });
    });

    describe('getTeams', () => {
      it('should return teams list', async () => {
        // Arrange
        const teams = [mockTeam];
        mockTeamModel.getTeams.mockResolvedValue(teams);

        // Act
        const result = await service.getTeams('org-123', { isActive: true });

        // Assert
        expect(mockTeamModel.getTeams).toHaveBeenCalledWith('org-123', { isActive: true, type: undefined });
        expect(result).toEqual(teams);
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('bulkImport', () => {
      const mockImportRequest: BulkImportRequest = {
        type: 'organizations',
        data: [
          { name: 'Org 1', slug: 'org-1', contactEmail: 'org1@example.com', subscriptionPlan: SubscriptionPlan.BASIC, maxUsers: 10, maxCycles: 5, storageLimitGb: 1 },
          { name: 'Org 2', slug: 'org-2', contactEmail: 'org2@example.com', subscriptionPlan: SubscriptionPlan.BASIC, maxUsers: 20, maxCycles: 10, storageLimitGb: 2 },
        ],
        options: {
          updateExisting: false,
          skipValidation: false,
          dryRun: false,
        },
      };

      it('should perform bulk import successfully', async () => {
        // Arrange
        mockOrganizationModel.createOrganization.mockResolvedValue({ id: 'org-1' } as any);

        // Act
        const result = await service.bulkImport(mockImportRequest);

        // Assert
        expect(result.success).toBe(true);
        expect(result.results.total).toBe(2);
        expect(result.results.successful).toBe(2);
        expect(result.results.failed).toBe(0);
        expect(mockLogger.info).toHaveBeenCalledWith('Bulk import completed', {
          type: 'organizations',
          results: result.results,
        });
      });

      it('should handle dry run mode', async () => {
        // Arrange
        const dryRunRequest = { ...mockImportRequest, options: { ...mockImportRequest.options, dryRun: true } };

        // Act
        const result = await service.bulkImport(dryRunRequest);

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Dry run completed successfully');
        expect(mockOrganizationModel.createOrganization).not.toHaveBeenCalled();
      });

      it('should handle import errors', async () => {
        // Arrange
        const errorRequest = { ...mockImportRequest, options: { ...mockImportRequest.options, skipValidation: true } };
        mockOrganizationModel.createOrganization
          .mockResolvedValueOnce({ id: 'org-1' } as any)
          .mockRejectedValueOnce(new Error('Validation failed'));

        // Act
        const result = await service.bulkImport(errorRequest);

        // Assert
        expect(result.success).toBe(false);
        expect(result.results.total).toBe(2);
        expect(result.results.successful).toBe(1);
        expect(result.results.failed).toBe(1);
        expect(result.results.errors).toHaveLength(1);
        expect(result.results.errors[0].row).toBe(2);
        expect(result.results.errors[0].error).toBe('Validation failed');
      });
    });

    describe('bulkExport', () => {
      const mockExportRequest: BulkExportRequest = {
        type: 'organizations',
        format: 'json',
        filters: { isActive: true },
      };

      it('should perform bulk export successfully', async () => {
        // Arrange
        const mockData = [{ id: 'org-1', name: 'Test Org' }];
        mockOrganizationModel.getOrganizations.mockResolvedValue(mockData as any);

        // Act
        const result = await service.bulkExport(mockExportRequest);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockData);
        expect(result.format).toBe('json');
        expect(mockLogger.info).toHaveBeenCalledWith('Bulk export completed', {
          type: 'organizations',
          format: 'json',
          recordCount: 1,
        });
      });

      it('should throw ValidationError for departments without organizationId', async () => {
        // Arrange
        const invalidRequest = { ...mockExportRequest, type: 'departments' as const };

        // Act & Assert
        await expect(service.bulkExport(invalidRequest)).rejects.toThrow('Organization ID is required for department export');
      });
    });
  });

  describe('Organization Chart', () => {
    describe('generateOrganizationChart', () => {
      it('should generate organization chart successfully', async () => {
        // Arrange
        const mockDepartments = [
          { id: 'dept-1', name: 'Engineering', parentDepartmentId: null },
          { id: 'dept-2', name: 'Frontend', parentDepartmentId: 'dept-1' },
        ];
        const mockTeams = [
          { id: 'team-1', name: 'React Team', departmentId: 'dept-2' },
        ];

        mockOrganizationModel.getOrganizationById.mockResolvedValue({ id: 'org-123' } as any);
        mockDepartmentModel.getDepartmentHierarchy.mockResolvedValue(mockDepartments as any);
        mockTeamModel.getTeams.mockResolvedValue(mockTeams as any);

        // Act
        const result = await service.generateOrganizationChart('org-123');

        // Assert
        expect(result.organizationId).toBe('org-123');
        expect(result.structure.type).toBe('organization');
        expect(result.structure.children).toHaveLength(1); // Engineering department
        expect(result.structure.children[0].children).toHaveLength(1); // Frontend department
        expect(result.structure.children[0].children[0].children).toHaveLength(1); // React Team
        expect(mockLogger.info).toHaveBeenCalledWith('Organization chart generated successfully', {
          organizationId: 'org-123',
          chartId: result.id,
        });
      });

      it('should throw NotFoundError when organization not found', async () => {
        // Arrange
        mockOrganizationModel.getOrganizationById.mockResolvedValue(null);

        // Act & Assert
        await expect(service.generateOrganizationChart('org-123')).rejects.toThrow('Organization with ID org-123 not found');
      });
    });
  });

  describe('Utility Methods', () => {
    describe('checkSlugAvailability', () => {
      it('should return true when slug is available', async () => {
        // Arrange
        mockOrganizationModel.checkSlugAvailability.mockResolvedValue(true);

        // Act
        const result = await service.checkSlugAvailability('available-slug');

        // Assert
        expect(mockOrganizationModel.checkSlugAvailability).toHaveBeenCalledWith('available-slug', undefined);
        expect(result).toBe(true);
      });

      it('should return false when slug is taken', async () => {
        // Arrange
        mockOrganizationModel.checkSlugAvailability.mockResolvedValue(false);

        // Act
        const result = await service.checkSlugAvailability('taken-slug');

        // Assert
        expect(result).toBe(false);
      });

      it('should exclude organization ID when provided', async () => {
        // Arrange
        mockOrganizationModel.checkSlugAvailability.mockResolvedValue(true);

        // Act
        await service.checkSlugAvailability('test-slug', 'org-123');

        // Assert
        expect(mockOrganizationModel.checkSlugAvailability).toHaveBeenCalledWith('test-slug', 'org-123');
      });
    });
  });
});
