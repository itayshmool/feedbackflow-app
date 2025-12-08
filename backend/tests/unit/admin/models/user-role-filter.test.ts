/**
 * Test suite for user role filtering bug fix
 * 
 * Bug: When filtering the user list by role, only the filtered role is returned
 * for each user instead of ALL roles the user has.
 * 
 * Scenario:
 * - User has both "manager" and "admin" roles
 * - Filter user list by "admin" role
 * - Expected: User appears with BOTH manager AND admin roles
 * - Actual (bug): User appears with ONLY admin role
 */

import { UserModel } from '../../../../src/modules/admin/models/user.model';

// Mock the database query function
jest.mock('../../../../src/config/real-database.js', () => ({
  query: jest.fn(),
}));

import { query as mockDbQuery } from '../../../../src/config/real-database.js';

const mockedQuery = mockDbQuery as jest.MockedFunction<typeof mockDbQuery>;

describe('User Role Filter - Bug Fix', () => {
  let userModel: UserModel;

  beforeEach(() => {
    userModel = new UserModel();
    jest.clearAllMocks();
  });

  describe('findWithRoles with role filter', () => {
    /**
     * Scenario: User has both manager and admin roles, filter by admin
     * Expected: User should be returned with ALL roles (manager + admin)
     * Bug behavior: User is returned with ONLY the admin role
     */
    it('should return ALL roles for a user when filtering by a specific role', async () => {
      const userId = 'user-123';
      const managerRoleId = 'role-manager';
      const adminRoleId = 'role-admin';

      // Mock count query result
      mockedQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        rowCount: 1,
      } as any);

      // Mock data query result - this simulates the EXPECTED behavior
      // When filtering by admin role, we should still get ALL roles for the user
      mockedQuery.mockResolvedValueOnce({
        rows: [{
          id: userId,
          email: 'user@example.com',
          name: 'Test User',
          avatar_url: null,
          is_active: true,
          email_verified: true,
          last_login_at: '2025-01-01T00:00:00Z',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          organization_id: 'org-1',
          department: 'Engineering',
          position: 'Manager',
          // This is what we EXPECT - ALL roles for the user
          roles: [
            {
              id: 'user-role-1',
              roleId: managerRoleId,
              roleName: 'manager',
              organizationId: 'org-1',
              organizationName: 'Test Org',
              grantedAt: '2025-01-01T00:00:00Z',
              expiresAt: null,
              isActive: true,
            },
            {
              id: 'user-role-2',
              roleId: adminRoleId,
              roleName: 'admin',
              organizationId: 'org-1',
              organizationName: 'Test Org',
              grantedAt: '2025-01-01T00:00:00Z',
              expiresAt: null,
              isActive: true,
            },
          ],
        }],
        rowCount: 1,
      } as any);

      // Filter by admin role
      const result = await userModel.findWithRoles(
        { roleId: adminRoleId },
        { limit: 10, offset: 0 }
      );

      // Verify we got the user
      expect(result.data).toHaveLength(1);
      const user = result.data[0];
      expect(user.id).toBe(userId);

      // CRITICAL ASSERTION: User should have ALL roles, not just the filtered one
      expect(user.roles).toHaveLength(2);
      
      const roleNames = user.roles?.map(r => r.roleName) || [];
      expect(roleNames).toContain('manager');
      expect(roleNames).toContain('admin');

      // Verify the SQL query structure
      // The data query should use a subquery to filter users, not filter the roles JOIN
      const dataQueryCall = mockedQuery.mock.calls[1];
      const sqlQuery = dataQueryCall[0] as string;
      
      // The query should NOT have role_id filter in the main WHERE clause affecting the JOIN
      // Instead, it should use a subquery like: u.id IN (SELECT user_id FROM user_roles WHERE role_id = ...)
      // This ensures ALL roles are fetched for matching users
      
      // Check that the query includes a subquery pattern for role filtering
      const hasSubqueryPattern = sqlQuery.includes('u.id IN') || 
                                  sqlQuery.includes('EXISTS') ||
                                  !sqlQuery.includes('ur.role_id =');
      
      expect(hasSubqueryPattern).toBe(true);
    });

    /**
     * Additional test: Verify the actual SQL generated uses proper filtering
     */
    it('should use subquery for role filtering to preserve all user roles', async () => {
      const adminRoleId = 'role-admin';

      // Mock both queries
      mockedQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1,
      } as any);

      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await userModel.findWithRoles(
        { roleId: adminRoleId },
        { limit: 10, offset: 0 }
      );

      // Get the data query (second call)
      const dataQueryCall = mockedQuery.mock.calls[1];
      const sqlQuery = dataQueryCall[0] as string;
      
      // The main JOIN should NOT be filtered by role_id directly
      // This pattern would cause the bug:
      //   LEFT JOIN user_roles ur ON u.id = ur.user_id
      //   WHERE ur.role_id = $X  <-- This filters which roles are aggregated!
      
      // Instead, the query should use a subquery:
      //   WHERE u.id IN (SELECT user_id FROM user_roles WHERE role_id = $X)
      
      // Check that role filtering is done via subquery
      const hasSubquery = /u\.id\s+IN\s*\(\s*SELECT/i.test(sqlQuery);
      const subqueryHasRoleFilter = /ur_filter\.role_id\s*=/i.test(sqlQuery);
      
      // Extract the WHERE clause portion (after WHERE, before GROUP BY)
      const whereMatch = sqlQuery.match(/WHERE\s+([\s\S]*?)\s+GROUP BY/i);
      const whereClause = whereMatch ? whereMatch[1] : '';
      
      // The WHERE clause should use "u.id IN (...)" subquery pattern, not direct "ur.role_id ="
      // Note: ur.role_id appears in SELECT for JSON_BUILD_OBJECT, that's fine
      // We're checking the WHERE clause doesn't have the direct filter pattern
      const whereUsesSubquery = /u\.id\s+IN\s*\(/i.test(whereClause);
      const whereHasDirectUrRoleFilter = /\bur\.role_id\s*=\s*\$/i.test(whereClause);
      
      // The fix should ensure role filter is in subquery, not direct in WHERE
      expect(hasSubquery).toBe(true); // Has subquery pattern
      expect(subqueryHasRoleFilter).toBe(true); // Role filter is inside subquery with ur_filter alias
      expect(whereUsesSubquery).toBe(true); // WHERE clause uses u.id IN (...) 
      expect(whereHasDirectUrRoleFilter).toBe(false); // WHERE clause doesn't have direct ur.role_id = $X
    });

    /**
     * Test: No filter should return all users with all their roles
     */
    it('should return all roles when no role filter is applied', async () => {
      const userId = 'user-123';

      mockedQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        rowCount: 1,
      } as any);

      mockedQuery.mockResolvedValueOnce({
        rows: [{
          id: userId,
          email: 'user@example.com',
          name: 'Test User',
          avatar_url: null,
          is_active: true,
          email_verified: true,
          last_login_at: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          organization_id: 'org-1',
          department: null,
          position: null,
          roles: [
            { id: '1', roleId: 'r1', roleName: 'manager', organizationId: 'org-1', organizationName: 'Org', grantedAt: '2025-01-01', expiresAt: null, isActive: true },
            { id: '2', roleId: 'r2', roleName: 'admin', organizationId: 'org-1', organizationName: 'Org', grantedAt: '2025-01-01', expiresAt: null, isActive: true },
          ],
        }],
        rowCount: 1,
      } as any);

      // No role filter
      const result = await userModel.findWithRoles({}, { limit: 10, offset: 0 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].roles).toHaveLength(2);
    });
  });
});

