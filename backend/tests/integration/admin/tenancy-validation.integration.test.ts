/**
 * Integration tests for tenancy validation security fix
 * 
 * Tests that org-scoped admins cannot access or modify data
 * from other organizations, while super_admins retain full access.
 */

import request from 'supertest';
import { Express } from 'express';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Mock data - these would be set up in beforeAll
let app: Express;
let superAdminToken: string;
let orgAAdminToken: string;
let orgAId: string;
let orgBId: string;
let orgBName: string;
let orgBSlug: string;

/**
 * Test Suite: Tenancy Validation Security
 * 
 * Verifies that the requireOrgScopedAdmin middleware and controllers
 * properly validate organization access for:
 * - CSV hierarchy uploads
 * - Organization CRUD via path parameters
 * - Hierarchy creation via body parameters
 */
describe('Tenancy Validation Security', () => {
  
  beforeAll(async () => {
    // Note: In a real test, you would:
    // 1. Start test server
    // 2. Create test organizations
    // 3. Create test admin users
    // 4. Generate JWT tokens
    
    // For now, these tests document expected behavior
    console.log('Setting up tenancy validation tests...');
  });

  afterAll(async () => {
    // Cleanup: delete test data
    console.log('Cleaning up test data...');
  });

  describe('Hierarchy CSV Upload Cross-Organization Attack', () => {
    it('should block org-scoped admin from uploading CSV for different organization', async () => {
      const csvContent = `organization_name,organization_slug,employee_email,manager_email
${orgBName},${orgBSlug},employee@orgb.com,manager@orgb.com`;

      const response = await request(app)
        .post('/api/v1/hierarchy/bulk/csv')
        .set('Authorization', `Bearer ${orgAAdminToken}`)
        .set('Content-Type', 'text/csv')
        .send(csvContent);

      expect(response.status).toBe(200); // Request succeeds but...
      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toBe(0); // No records created
      expect(response.body.data.errors).toHaveLength(1);
      expect(response.body.data.errors[0].error).toContain('Access denied');
    });

    it('should allow super_admin to upload CSV for any organization', async () => {
      const csvContent = `organization_name,organization_slug,employee_email,manager_email
${orgBName},${orgBSlug},employee@orgb.com,manager@orgb.com`;

      const response = await request(app)
        .post('/api/v1/hierarchy/bulk/csv')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('Content-Type', 'text/csv')
        .send(csvContent);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // May succeed or fail based on whether users exist, but no access error
      if (response.body.data.errors && response.body.data.errors.length > 0) {
        expect(response.body.data.errors[0].error).not.toContain('Access denied');
      }
    });

    it('should allow org-scoped admin to upload CSV for their own organization', async () => {
      const csvContent = `organization_name,organization_slug,employee_email,manager_email
Organization A,org-a,employee@orga.com,manager@orga.com`;

      const response = await request(app)
        .post('/api/v1/hierarchy/bulk/csv')
        .set('Authorization', `Bearer ${orgAAdminToken}`)
        .set('Content-Type', 'text/csv')
        .send(csvContent);

      expect(response.status).toBe(200);
      // Should not have access errors (may have other errors if users don't exist)
      if (response.body.data.errors && response.body.data.errors.length > 0) {
        expect(response.body.data.errors[0].error).not.toContain('Access denied');
      }
    });
  });

  describe('Organization Access via Path Parameters', () => {
    it('should block org-scoped admin from reading different organization by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/organizations/${orgBId}`)
        .set('Authorization', `Bearer ${orgAAdminToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message || response.body.error).toContain('permission');
    });

    it('should allow super_admin to read any organization by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/organizations/${orgBId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data || response.body).toHaveProperty('id', orgBId);
    });

    it('should allow org-scoped admin to read their own organization', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/organizations/${orgAId}`)
        .set('Authorization', `Bearer ${orgAAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data || response.body).toHaveProperty('id', orgAId);
    });
  });

  describe('Organization Update via Path Parameters', () => {
    it('should block org-scoped admin from updating different organization', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/organizations/${orgBId}`)
        .set('Authorization', `Bearer ${orgAAdminToken}`)
        .send({ description: 'Unauthorized update attempt' });

      expect(response.status).toBe(403);
      expect(response.body.message || response.body.error).toContain('permission');
    });

    it('should allow super_admin to update any organization', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/organizations/${orgBId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ description: 'Updated by super_admin' });

      expect(response.status).toBe(200);
      expect(response.body.data || response.body).toHaveProperty('id', orgBId);
    });

    it('should allow org-scoped admin to update their own organization', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/organizations/${orgAId}`)
        .set('Authorization', `Bearer ${orgAAdminToken}`)
        .send({ description: 'Updated by org admin' });

      expect(response.status).toBe(200);
      expect(response.body.data || response.body).toHaveProperty('id', orgAId);
    });
  });

  describe('Organization Access via Slug', () => {
    it('should block org-scoped admin from reading different organization by slug', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/organizations/slug/${orgBSlug}`)
        .set('Authorization', `Bearer ${orgAAdminToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message || response.body.error).toContain('permission');
    });

    it('should allow super_admin to read any organization by slug', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/organizations/slug/${orgBSlug}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data || response.body).toHaveProperty('slug', orgBSlug);
    });
  });

  describe('Hierarchy Creation via Body Parameters', () => {
    it('should block org-scoped admin from creating hierarchy in different organization', async () => {
      const response = await request(app)
        .post('/api/v1/hierarchy')
        .set('Authorization', `Bearer ${orgAAdminToken}`)
        .send({
          organizationId: orgBId,
          managerId: 'fake-manager-id',
          employeeId: 'fake-employee-id',
          level: 1,
          isDirectReport: true
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('permission');
    });

    it('should allow super_admin to create hierarchy in any organization', async () => {
      const response = await request(app)
        .post('/api/v1/hierarchy')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          organizationId: orgBId,
          managerId: 'fake-manager-id',
          employeeId: 'fake-employee-id',
          level: 1,
          isDirectReport: true
        });

      // May fail due to invalid user IDs, but should not be an access error
      if (response.status === 403) {
        expect(response.body.error).not.toContain('permission');
      }
    });

    it('should allow org-scoped admin to create hierarchy in their own organization', async () => {
      const response = await request(app)
        .post('/api/v1/hierarchy')
        .set('Authorization', `Bearer ${orgAAdminToken}`)
        .send({
          organizationId: orgAId,
          managerId: 'fake-manager-id',
          employeeId: 'fake-employee-id',
          level: 1,
          isDirectReport: true
        });

      // Should not have access errors (may have validation errors)
      if (response.status === 403) {
        expect(response.body.error).not.toContain('permission');
      }
    });
  });

  describe('Hierarchy Bulk Update via Body Parameters', () => {
    it('should block org-scoped admin from bulk updating hierarchy in different organization', async () => {
      const response = await request(app)
        .post('/api/v1/hierarchy/bulk')
        .set('Authorization', `Bearer ${orgAAdminToken}`)
        .send({
          organizationId: orgBId,
          hierarchies: [
            { managerId: 'mgr1', employeeId: 'emp1', level: 1, isDirectReport: true }
          ]
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('permission');
    });

    it('should allow super_admin to bulk update hierarchy in any organization', async () => {
      const response = await request(app)
        .post('/api/v1/hierarchy/bulk')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          organizationId: orgBId,
          hierarchies: [
            { managerId: 'mgr1', employeeId: 'emp1', level: 1, isDirectReport: true }
          ]
        });

      // May succeed with mock data or fail for other reasons, but no access error
      if (response.status === 403) {
        expect(response.body.error).not.toContain('permission');
      } else {
        expect(response.status).toBe(200);
      }
    });
  });

  describe('User Access via Query Parameters', () => {
    it('should block org-scoped admin from accessing users in different organization', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/users?organizationId=${orgBId}`)
        .set('Authorization', `Bearer ${orgAAdminToken}`);

      // This endpoint validates query param in middleware
      expect(response.status).toBe(403);
      expect(response.body.error || response.body.message).toContain('access denied');
    });

    it('should allow super_admin to access users in any organization', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/users?organizationId=${orgBId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      // Should return users (may be empty array)
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('Error Handling', () => {
    it('should return 403 with appropriate error message for access violations', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/organizations/${orgBId}`)
        .set('Authorization', `Bearer ${orgAAdminToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/permission|access denied/i);
    });

    it('should not leak information about other organizations in error messages', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/organizations/${orgBId}`)
        .set('Authorization', `Bearer ${orgAAdminToken}`);

      expect(response.status).toBe(403);
      // Should not reveal org name or sensitive details
      expect(response.body.message).not.toContain(orgBName);
    });
  });
});

/**
 * Test Documentation
 * 
 * These tests verify the security fix for the tenancy validation vulnerability
 * reported in TENANCY_VULNERABILITY_REPORT.md.
 * 
 * Key scenarios tested:
 * 1. CSV Upload Attack - Admin A cannot upload CSV for Org B
 * 2. Path Parameter Bypass - Admin A cannot access Org B via :id param
 * 3. Body Parameter Bypass - Admin A cannot create hierarchy in Org B
 * 4. Query Parameter Validation - Already worked, verify it still works
 * 5. Super Admin Access - Super admins retain full cross-org access
 * 6. Own Organization Access - Admins can still access their own org
 * 
 * To run these tests:
 *   cd backend && npm test -- tenancy-validation.integration.test.ts
 * 
 * Note: This test file is currently a skeleton. To make it fully functional:
 * 1. Import and configure test app
 * 2. Set up test database with organizations
 * 3. Create test users and generate JWT tokens
 * 4. Add cleanup in afterAll
 */

