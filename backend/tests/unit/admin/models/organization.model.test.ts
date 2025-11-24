import { OrganizationModelClass } from '../../../../src/modules/admin/models/organization.model';
import { Pool, PoolClient } from 'pg';
import {
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  OrganizationStatus,
  SubscriptionPlan,
} from '../../../../src/modules/admin/types/organization.types';
import { ValidationError, NotFoundError } from '../../../../src/shared/utils/errors';

// Mock pg
jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

describe('OrganizationModelClass', () => {
  let model: OrganizationModelClass;
  let mockDb: any;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn() as any,
      release: jest.fn(),
    } as any;

    mockDb = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn() as any,
    } as any;

    model = new OrganizationModelClass(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrganization', () => {
    const mockCreateRequest: CreateOrganizationRequest = {
      name: 'Test Organization',
      slug: 'test-org',
      contactEmail: 'test@example.com',
      subscriptionPlan: SubscriptionPlan.BASIC,
      maxUsers: 100,
      maxCycles: 50,
      storageLimitGb: 10,
    };

    const mockDbRow = {
      id: 'org_1234567890_abc123',
      organization_id: 'org_1234567890_abc123',
      name: 'Test Organization',
      slug: 'test-org',
      description: null,
      contact_email: 'test@example.com',
      phone: null,
      address: null,
      city: null,
      state: null,
      zip_code: null,
      country: null,
      website: null,
      logo_url: null,
      is_active: true,
      status: OrganizationStatus.ACTIVE,
      subscription_plan: SubscriptionPlan.BASIC,
      plan_start_date: new Date(),
      plan_end_date: new Date(),
      max_users: 100,
      max_cycles: 50,
      storage_limit_gb: 10,
      feature_flags: {},
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
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should create organization successfully', async () => {
      // Arrange
      mockClient.query.mockResolvedValue({ rows: [mockDbRow] } as any);

      // Act
      const result = await model.createOrganization(mockCreateRequest, mockClient);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organizations'),
        expect.arrayContaining([
          expect.stringMatching(/^org_\d+_[a-z0-9]+$/), // organizationId
          expect.stringMatching(/^org_\d+_[a-z0-9]+$/), // organizationId (duplicate)
          'Test Organization',
          'test-org',
          null, // description
          'test@example.com',
          null, // phone
          null, // address
          null, // city
          null, // state
          null, // zipCode
          null, // country
          null, // website
          null, // logoUrl
          true, // isActive
          OrganizationStatus.ACTIVE,
          SubscriptionPlan.BASIC,
          expect.any(Date), // planStartDate
          expect.any(Date), // planEndDate
          100, // maxUsers
          50, // maxCycles
          10, // storageLimitGb
          {}, // featureFlags
          expect.any(Object), // settings
        ])
      );

      expect(result).toEqual({
        id: 'org_1234567890_abc123',
        name: 'Test Organization',
        slug: 'test-org',
        description: null,
        contactEmail: 'test@example.com',
        phone: null,
        address: null,
        city: null,
        state: null,
        zipCode: null,
        country: null,
        website: null,
        logoUrl: null,
        isActive: true,
        status: OrganizationStatus.ACTIVE,
        subscriptionPlan: SubscriptionPlan.BASIC,
        planStartDate: expect.any(Date),
        planEndDate: expect.any(Date),
        maxUsers: 100,
        maxCycles: 50,
        storageLimitGb: 10,
        featureFlags: {},
        settings: expect.any(Object),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should use default settings when not provided', async () => {
      // Arrange
      mockClient.query.mockResolvedValue({ rows: [mockDbRow] } as any);

      // Act
      await model.createOrganization(mockCreateRequest, mockClient);

      // Assert
      const callArgs = mockClient.query.mock.calls[0][1];
      const settings = callArgs[23]; // settings parameter
      
      expect(settings).toMatchObject({
        timezone: 'UTC',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
        workingDays: [1, 2, 3, 4, 5],
        workingHours: {
          start: '09:00',
          end: '17:00',
        },
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
      });
    });
  });

  describe('getOrganizationById', () => {
    it('should return organization when found', async () => {
      // Arrange
      const mockDbRow = {
        organization_id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        contact_email: 'test@example.com',
        is_active: true,
        status: OrganizationStatus.ACTIVE,
        subscription_plan: SubscriptionPlan.BASIC,
        plan_start_date: new Date(),
        plan_end_date: new Date(),
        max_users: 100,
        max_cycles: 50,
        storage_limit_gb: 10,
        feature_flags: {},
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
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockDb.query.mockResolvedValue({ rows: [mockDbRow] });

      // Act
      const result = await model.getOrganizationById('org-123');

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM organizations WHERE organization_id = $1', ['org-123']);
      expect(result).toEqual({
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        contactEmail: 'test@example.com',
        isActive: true,
        status: OrganizationStatus.ACTIVE,
        subscriptionPlan: SubscriptionPlan.BASIC,
        planStartDate: expect.any(Date),
        planEndDate: expect.any(Date),
        maxUsers: 100,
        maxCycles: 50,
        storageLimitGb: 10,
        featureFlags: {},
        settings: {},
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should return null when organization not found', async () => {
      // Arrange
      mockDb.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await model.getOrganizationById('org-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getOrganizationBySlug', () => {
    it('should return organization when found by slug', async () => {
      // Arrange
      const mockDbRow = {
        organization_id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        contact_email: 'test@example.com',
        is_active: true,
        status: OrganizationStatus.ACTIVE,
        subscription_plan: SubscriptionPlan.BASIC,
        plan_start_date: new Date(),
        plan_end_date: new Date(),
        max_users: 100,
        max_cycles: 50,
        storage_limit_gb: 10,
        feature_flags: {},
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
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockDb.query.mockResolvedValue({ rows: [mockDbRow] });

      // Act
      const result = await model.getOrganizationBySlug('test-org');

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM organizations WHERE slug = $1', ['test-org']);
      expect(result?.slug).toBe('test-org');
    });
  });

  describe('getOrganizations', () => {
    it('should return organizations with filters', async () => {
      // Arrange
      const mockDbRows = [
        {
          organization_id: 'org-1',
          name: 'Org 1',
          slug: 'org-1',
          contact_email: 'org1@example.com',
          is_active: true,
          status: OrganizationStatus.ACTIVE,
          subscription_plan: SubscriptionPlan.BASIC,
          plan_start_date: new Date(),
          plan_end_date: new Date(),
          max_users: 100,
          max_cycles: 50,
          storage_limit_gb: 10,
          feature_flags: {},
          settings: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          organization_id: 'org-2',
          name: 'Org 2',
          slug: 'org-2',
          contact_email: 'org2@example.com',
          is_active: true,
          status: OrganizationStatus.ACTIVE,
          subscription_plan: SubscriptionPlan.PROFESSIONAL,
          plan_start_date: new Date(),
          plan_end_date: new Date(),
          max_users: 200,
          max_cycles: 100,
          storage_limit_gb: 20,
          feature_flags: {},
          settings: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      mockDb.query.mockResolvedValue({ rows: mockDbRows });

      // Act
      const result = await model.getOrganizations({
        isActive: true,
        status: OrganizationStatus.ACTIVE,
        limit: 10,
        offset: 0,
      });

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM organizations WHERE 1=1'),
        expect.arrayContaining([true, OrganizationStatus.ACTIVE, 10, 0])
      );
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Org 1');
      expect(result[1].name).toBe('Org 2');
    });

    it('should return organizations without filters', async () => {
      // Arrange
      mockDb.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await model.getOrganizations();

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM organizations WHERE 1=1'),
        []
      );
      expect(result).toEqual([]);
    });
  });

  describe('updateOrganization', () => {
    const mockUpdateData: UpdateOrganizationRequest = {
      name: 'Updated Organization',
      maxUsers: 200,
      isActive: false,
    };

    it('should update organization successfully', async () => {
      // Arrange
      const mockUpdatedRow = {
        organization_id: 'org-123',
        name: 'Updated Organization',
        slug: 'test-org',
        contact_email: 'test@example.com',
        is_active: false,
        status: OrganizationStatus.ACTIVE,
        subscription_plan: SubscriptionPlan.BASIC,
        plan_start_date: new Date(),
        plan_end_date: new Date(),
        max_users: 200,
        max_cycles: 50,
        storage_limit_gb: 10,
        feature_flags: {},
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
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockClient.query.mockResolvedValue({ rows: [mockUpdatedRow] } as any);

      // Act
      const result = await model.updateOrganization('org-123', mockUpdateData, mockClient);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE organizations SET'),
        expect.arrayContaining(['Updated Organization', 200, false, expect.any(Date), 'org-123'])
      );
      expect(result.name).toBe('Updated Organization');
      expect(result.maxUsers).toBe(200);
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundError when organization not found', async () => {
      // Arrange
      mockClient.query.mockResolvedValue({ rows: [] } as any);

      // Act & Assert
      await expect(model.updateOrganization('org-123', mockUpdateData, mockClient)).rejects.toThrow(
        'Organization with ID org-123 not found'
      );
    });

    it('should handle empty update data', async () => {
      // Arrange
      const mockExistingRow = {
        organization_id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        contact_email: 'test@example.com',
        is_active: true,
        status: OrganizationStatus.ACTIVE,
        subscription_plan: SubscriptionPlan.BASIC,
        plan_start_date: new Date(),
        plan_end_date: new Date(),
        max_users: 100,
        max_cycles: 50,
        storage_limit_gb: 10,
        feature_flags: {},
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
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockClient.query.mockResolvedValue({ rows: [mockExistingRow] } as any);

      // Act
      const result = await model.updateOrganization('org-123', {}, mockClient);

      // Assert
      expect(result).toEqual({
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        contactEmail: 'test@example.com',
        isActive: true,
        status: OrganizationStatus.ACTIVE,
        subscriptionPlan: SubscriptionPlan.BASIC,
        planStartDate: expect.any(Date),
        planEndDate: expect.any(Date),
        maxUsers: 100,
        maxCycles: 50,
        storageLimitGb: 10,
        featureFlags: {},
        settings: {},
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('deleteOrganization', () => {
    it('should delete organization successfully', async () => {
      // Arrange
      const mockExistingRow = {
        organization_id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        contact_email: 'test@example.com',
        is_active: true,
        status: OrganizationStatus.ACTIVE,
        subscription_plan: SubscriptionPlan.BASIC,
        plan_start_date: new Date(),
        plan_end_date: new Date(),
        max_users: 100,
        max_cycles: 50,
        storage_limit_gb: 10,
        feature_flags: {},
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
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockClient.query.mockResolvedValue({ rows: [mockExistingRow] } as any);

      // Act
      await model.deleteOrganization('org-123', mockClient);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM organizations WHERE organization_id = $1', ['org-123']);
    });

    it('should throw NotFoundError when organization not found', async () => {
      // Arrange
      mockClient.query.mockResolvedValue({ rows: [] } as any);

      // Act & Assert
      await expect(model.deleteOrganization('org-123', mockClient)).rejects.toThrow(
        'Organization with ID org-123 not found'
      );
    });
  });

  describe('checkSlugAvailability', () => {
    it('should return true when slug is available', async () => {
      // Arrange
      mockDb.query.mockResolvedValue({ rows: [{ count: '0' }] } as any);

      // Act
      const result = await model.checkSlugAvailability('available-slug');

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM organizations WHERE slug = $1', ['available-slug']);
      expect(result).toBe(true);
    });

    it('should return false when slug is taken', async () => {
      // Arrange
      mockDb.query.mockResolvedValue({ rows: [{ count: '1' }] } as any);

      // Act
      const result = await model.checkSlugAvailability('taken-slug');

      // Assert
      expect(result).toBe(false);
    });

    it('should exclude organization ID when provided', async () => {
      // Arrange
      mockDb.query.mockResolvedValue({ rows: [{ count: '0' }] } as any);

      // Act
      await model.checkSlugAvailability('test-slug', 'org-123');

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) FROM organizations WHERE slug = $1 AND organization_id != $2',
        ['test-slug', 'org-123']
      );
    });
  });

  describe('validateOrganizationData', () => {
    it('should validate organization data successfully', async () => {
      // Arrange
      const validData: CreateOrganizationRequest = {
        name: 'Test Organization',
        slug: 'test-org',
        contactEmail: 'test@example.com',
        subscriptionPlan: SubscriptionPlan.BASIC,
        maxUsers: 100,
        maxCycles: 50,
        storageLimitGb: 10,
      };
      mockDb.query.mockResolvedValue({ rows: [{ count: '0' }] } as any);

      // Act & Assert
      await expect(model.validateOrganizationData(validData)).resolves.not.toThrow();
    });

    it('should throw ValidationError for missing name', async () => {
      // Arrange
      const invalidData = {
        slug: 'test-org',
        contactEmail: 'test@example.com',
        subscriptionPlan: SubscriptionPlan.BASIC,
        maxUsers: 100,
        maxCycles: 50,
        storageLimitGb: 10,
      } as CreateOrganizationRequest;

      // Act & Assert
      await expect(model.validateOrganizationData(invalidData)).rejects.toThrow('Organization name is required');
    });

    it('should throw ValidationError for invalid email', async () => {
      // Arrange
      const invalidData: CreateOrganizationRequest = {
        name: 'Test Organization',
        slug: 'test-org',
        contactEmail: 'invalid-email',
        subscriptionPlan: SubscriptionPlan.BASIC,
        maxUsers: 100,
        maxCycles: 50,
        storageLimitGb: 10,
      };

      // Act & Assert
      await expect(model.validateOrganizationData(invalidData)).rejects.toThrow('Valid contact email is required');
    });

    it('should throw ValidationError for invalid slug format', async () => {
      // Arrange
      const invalidData: CreateOrganizationRequest = {
        name: 'Test Organization',
        slug: 'Invalid_Slug!',
        contactEmail: 'test@example.com',
        subscriptionPlan: SubscriptionPlan.BASIC,
        maxUsers: 100,
        maxCycles: 50,
        storageLimitGb: 10,
      };

      // Act & Assert
      await expect(model.validateOrganizationData(invalidData)).rejects.toThrow('Slug must contain only lowercase letters, numbers, and hyphens');
    });

    it('should throw ValidationError for taken slug', async () => {
      // Arrange
      const invalidData: CreateOrganizationRequest = {
        name: 'Test Organization',
        slug: 'taken-slug',
        contactEmail: 'test@example.com',
        subscriptionPlan: SubscriptionPlan.BASIC,
        maxUsers: 100,
        maxCycles: 50,
        storageLimitGb: 10,
      };
      mockDb.query.mockResolvedValue({ rows: [{ count: '1' }] } as any);

      // Act & Assert
      await expect(model.validateOrganizationData(invalidData)).rejects.toThrow('Organization slug is already taken');
    });

    it('should throw ValidationError for invalid maxUsers', async () => {
      // Arrange
      const invalidData: CreateOrganizationRequest = {
        name: 'Test Organization',
        slug: 'test-org',
        contactEmail: 'test@example.com',
        subscriptionPlan: SubscriptionPlan.BASIC,
        maxUsers: 0,
        maxCycles: 50,
        storageLimitGb: 10,
      };

      // Act & Assert
      await expect(model.validateOrganizationData(invalidData)).rejects.toThrow('Max users must be greater than 0');
    });
  });

  describe('getOrganizationStats', () => {
    it('should return organization statistics', async () => {
      // Arrange
      const mockOrgCountResult = {
        rows: [{ total: '10', active: '8', inactive: '2', new_this_month: '1' }],
      };
      const mockPlanResult = {
        rows: [
          { subscription_plan: SubscriptionPlan.BASIC, count: '5' },
          { subscription_plan: SubscriptionPlan.PROFESSIONAL, count: '3' },
        ],
      };
      const mockAvgUsersResult = {
        rows: [{ avg_users: '50.5' }],
      };
      const mockDeptResult = { rows: [{ count: '25' }] };
      const mockTeamResult = { rows: [{ count: '100' }] };
      const mockUserResult = { rows: [{ count: '500' }] };

      mockDb.query
        .mockResolvedValueOnce(mockOrgCountResult)
        .mockResolvedValueOnce(mockPlanResult)
        .mockResolvedValueOnce(mockAvgUsersResult)
        .mockResolvedValueOnce(mockDeptResult)
        .mockResolvedValueOnce(mockTeamResult)
        .mockResolvedValueOnce(mockUserResult);

      // Act
      const result = await model.getOrganizationStats();

      // Assert
      expect(result).toEqual({
        totalOrganizations: 10,
        activeOrganizations: 8,
        inactiveOrganizations: 2,
        newThisMonth: 1,
        byPlan: {
          [SubscriptionPlan.BASIC]: 5,
          [SubscriptionPlan.PROFESSIONAL]: 3,
        },
        averageUsersPerOrg: 50.5,
        totalDepartments: 25,
        totalTeams: 100,
        totalUsers: 500,
      });
    });
  });

  describe('searchOrganizations', () => {
    it('should search organizations successfully', async () => {
      // Arrange
      const mockSearchResults = [
        {
          organization_id: 'org-1',
          name: 'Test Organization',
          slug: 'test-org',
          contact_email: 'test@example.com',
          is_active: true,
          status: OrganizationStatus.ACTIVE,
          subscription_plan: SubscriptionPlan.BASIC,
          plan_start_date: new Date(),
          plan_end_date: new Date(),
          max_users: 100,
          max_cycles: 50,
          storage_limit_gb: 10,
          feature_flags: {},
          settings: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      mockDb.query.mockResolvedValue({ rows: mockSearchResults });

      // Act
      const result = await model.searchOrganizations('test', { isActive: true, limit: 10 });

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM organizations WHERE (name ILIKE $1 OR slug ILIKE $1 OR contact_email ILIKE $1)'),
        expect.arrayContaining(['%test%', true, 10])
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Organization');
    });
  });
});
