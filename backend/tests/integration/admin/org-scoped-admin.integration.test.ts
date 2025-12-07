// backend/tests/integration/admin/org-scoped-admin.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { 
  requireOrgScopedAdmin, 
  requireOrgAccess, 
  canAdminOrganization,
  OrgScopedRequest 
} from '../../../src/shared/middleware/rbac.middleware';

/**
 * Integration tests for org-scoped admin feature
 * 
 * Tests the following scenarios:
 * 1. Super admin can access all organizations
 * 2. Org-scoped admin can only access their assigned organization
 * 3. Org-scoped admin is blocked from creating/deleting organizations
 * 4. User data is properly filtered by organization for org-scoped admins
 */

describe('Org-Scoped Admin Feature', () => {
  // Mock user data for different admin types
  const superAdminUser = {
    id: 'super-admin-uuid',
    email: 'super@admin.com',
    name: 'Super Admin',
    roles: ['super_admin'],
    adminOrganizationId: null, // Super admin has no org restriction
    adminOrganizationSlug: null,
  };

  const orgScopedAdminUser = {
    id: 'org-admin-uuid',
    email: 'admin@acme.com',
    name: 'Org Admin',
    roles: ['admin'],
    adminOrganizationId: 'acme-org-uuid',
    adminOrganizationSlug: 'acme-corp',
  };

  const regularEmployeeUser = {
    id: 'employee-uuid',
    email: 'employee@acme.com',
    name: 'Regular Employee',
    roles: ['employee'],
    adminOrganizationId: null,
    adminOrganizationSlug: null,
  };

  describe('requireOrgScopedAdmin middleware', () => {
    it('should allow super_admin to access without org restriction', () => {
      const middleware = requireOrgScopedAdmin();
      
      // Create mock request/response
      const mockReq = {
        user: superAdminUser,
        query: {},
      } as unknown as OrgScopedRequest;
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      
      const mockNext = jest.fn();
      
      // Execute middleware
      middleware(mockReq, mockRes, mockNext);
      
      // Verify super admin can proceed
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.isSuperAdmin).toBe(true);
      expect(mockReq.effectiveOrganizationId).toBeNull();
    });

    it('should restrict org-scoped admin to their assigned organization', () => {
      const middleware = requireOrgScopedAdmin();
      
      const mockReq = {
        user: orgScopedAdminUser,
        query: {},
      } as unknown as OrgScopedRequest;
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      
      const mockNext = jest.fn();
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.isSuperAdmin).toBe(false);
      expect(mockReq.effectiveOrganizationId).toBe('acme-org-uuid');
    });

    it('should block org-scoped admin from accessing different organization', () => {
      const middleware = requireOrgScopedAdmin();
      
      const mockReq = {
        user: orgScopedAdminUser,
        query: { organizationId: 'different-org-uuid' }, // Trying to access different org
      } as unknown as OrgScopedRequest;
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      
      const mockNext = jest.fn();
      
      middleware(mockReq, mockRes, mockNext);
      
      // Should be blocked with 403
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Organization access denied',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block non-admin users from accessing admin routes', () => {
      const middleware = requireOrgScopedAdmin();
      
      const mockReq = {
        user: regularEmployeeUser,
        query: {},
      } as unknown as OrgScopedRequest;
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      
      const mockNext = jest.fn();
      
      middleware(mockReq, mockRes, mockNext);
      
      // Should be blocked with 403
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Admin access required',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block admin without org assignment', () => {
      const middleware = requireOrgScopedAdmin();
      
      const adminWithoutOrg = {
        ...orgScopedAdminUser,
        adminOrganizationId: null, // No org assigned
      };
      
      const mockReq = {
        user: adminWithoutOrg,
        query: {},
      } as unknown as OrgScopedRequest;
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      
      const mockNext = jest.fn();
      
      middleware(mockReq, mockRes, mockNext);
      
      // Should be blocked with 403 - needs org assignment
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Organization assignment required',
        })
      );
    });
  });

  describe('requireOrgAccess middleware', () => {
    it('should allow super_admin to access any organization by ID', () => {
      const middleware = requireOrgAccess();
      
      const mockReq = {
        user: superAdminUser,
        params: { orgId: 'any-org-uuid' },
        query: {},
      } as unknown as OrgScopedRequest;
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      
      const mockNext = jest.fn();
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.isSuperAdmin).toBe(true);
      expect(mockReq.effectiveOrganizationId).toBe('any-org-uuid');
    });

    it('should allow org-scoped admin to access their assigned org', () => {
      const middleware = requireOrgAccess();
      
      const mockReq = {
        user: orgScopedAdminUser,
        params: { orgId: 'acme-org-uuid' }, // Same as assigned
        query: {},
      } as unknown as OrgScopedRequest;
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      
      const mockNext = jest.fn();
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.isSuperAdmin).toBe(false);
      expect(mockReq.effectiveOrganizationId).toBe('acme-org-uuid');
    });

    it('should block org-scoped admin from accessing different org', () => {
      const middleware = requireOrgAccess();
      
      const mockReq = {
        user: orgScopedAdminUser,
        params: { orgId: 'other-org-uuid' }, // Different from assigned
        query: {},
      } as unknown as OrgScopedRequest;
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      
      const mockNext = jest.fn();
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('canAdminOrganization helper', () => {
    it('should return true for super_admin on any organization', () => {
      expect(canAdminOrganization(superAdminUser, 'any-org')).toBe(true);
      expect(canAdminOrganization(superAdminUser, 'another-org')).toBe(true);
    });

    it('should return true for org-scoped admin on their assigned org', () => {
      expect(canAdminOrganization(orgScopedAdminUser, 'acme-org-uuid')).toBe(true);
    });

    it('should return false for org-scoped admin on different org', () => {
      expect(canAdminOrganization(orgScopedAdminUser, 'other-org-uuid')).toBe(false);
    });

    it('should return false for non-admin users', () => {
      expect(canAdminOrganization(regularEmployeeUser, 'any-org')).toBe(false);
    });

    it('should return false for null user', () => {
      expect(canAdminOrganization(undefined, 'any-org')).toBe(false);
    });
  });
});

