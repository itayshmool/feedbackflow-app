// backend/src/modules/admin/models/user.model.ts

import { query as dbQuery } from '../../../config/real-database.js';
import { User, UserRole, Role, UserFilters, PaginationOptions } from '../types/user.types';

export class UserModel {
  private tableName = 'users';
  private primaryKey = 'id';

  async findWithRoles(
    filters: UserFilters = {},
    options: PaginationOptions = {}
  ): Promise<{ data: User[]; pagination: any }> {
    const { limit = 10, offset = 0, sortBy = 'created_at', sortOrder = 'desc' } = options;
    
    // Build WHERE clause
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.search) {
      conditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.isActive !== undefined) {
      conditions.push(`u.is_active = $${paramIndex}`);
      values.push(filters.isActive);
      paramIndex++;
    }

    if (filters.emailVerified !== undefined) {
      conditions.push(`u.email_verified = $${paramIndex}`);
      values.push(filters.emailVerified);
      paramIndex++;
    }

    if (filters.organizationId) {
      conditions.push(`ur.organization_id = $${paramIndex}`);
      values.push(filters.organizationId);
      paramIndex++;
    }

    if (filters.roleId) {
      conditions.push(`ur.role_id = $${paramIndex}`);
      values.push(filters.roleId);
      paramIndex++;
    }

    if (filters.department) {
      conditions.push(`u.department = $${paramIndex}`);
      values.push(filters.department);
      paramIndex++;
    }

    if (filters.position) {
      conditions.push(`u.position = $${paramIndex}`);
      values.push(filters.position);
      paramIndex++;
    }

    if (filters.lastLoginAfter) {
      conditions.push(`u.last_login_at >= $${paramIndex}`);
      values.push(filters.lastLoginAfter);
      paramIndex++;
    }

    if (filters.lastLoginBefore) {
      conditions.push(`u.last_login_at <= $${paramIndex}`);
      values.push(filters.lastLoginBefore);
      paramIndex++;
    }

    if (filters.createdAfter) {
      conditions.push(`u.created_at >= $${paramIndex}`);
      values.push(filters.createdAfter);
      paramIndex++;
    }

    if (filters.createdBefore) {
      conditions.push(`u.created_at <= $${paramIndex}`);
      values.push(filters.createdBefore);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
      ${whereClause}
    `;
    
    const countResult = await dbQuery(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data with roles
    const dataQuery = `
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
      ORDER BY u.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataResult = await dbQuery(dataQuery, [...values, limit, offset]);

    // Transform the data
    const users = dataResult.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatar_url,
      isActive: row.is_active,
      emailVerified: row.email_verified,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      organizationId: row.organization_id,
      department: row.department,
      position: row.position,
      roles: row.roles || []
    }));

    return {
      data: users,
      pagination: {
        total,
        limit,
        offset,
        hasMore: (offset + limit) < total,
      },
    };
  }

  async getUserStats(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN email_verified = false THEN 1 END) as unverified_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_signups
      FROM users
    `;

    const result = await dbQuery(query);
    return result.rows[0];
  }

  async getUsersByRole(): Promise<Record<string, number>> {
    const query = `
      SELECT r.name, COUNT(ur.user_id) as count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = true
      GROUP BY r.id, r.name
    `;

    const result = await dbQuery(query);
    return result.rows.reduce((acc, row) => {
      acc[row.name] = parseInt(row.count);
      return acc;
    }, {} as Record<string, number>);
  }

  async getUsersByOrganization(): Promise<Record<string, number>> {
    const query = `
      SELECT o.name, COUNT(DISTINCT u.id) as count
      FROM organizations o
      LEFT JOIN users u ON o.id = u.organization_id
      GROUP BY o.id, o.name
    `;

    const result = await dbQuery(query);
    return result.rows.reduce((acc, row) => {
      acc[row.name] = parseInt(row.count);
      return acc;
    }, {} as Record<string, number>);
  }

  async getUsersByDepartment(): Promise<Record<string, number>> {
    const query = `
      SELECT department, COUNT(*) as count
      FROM users
      WHERE department IS NOT NULL
      GROUP BY department
    `;

    const result = await dbQuery(query);
    return result.rows.reduce((acc, row) => {
      acc[row.department] = parseInt(row.count);
      return acc;
    }, {} as Record<string, number>);
  }

  async assignRole(userId: string, roleId: string, organizationId?: string, grantedBy?: string): Promise<UserRole> {
    const query = `
      INSERT INTO user_roles (user_id, role_id, organization_id, granted_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, role_id, organization_id) 
      DO UPDATE SET 
        is_active = true,
        granted_by = $4,
        granted_at = NOW()
      RETURNING *
    `;

    const result = await dbQuery(query, [userId, roleId, organizationId, grantedBy]);
    return result.rows[0];
  }

  async removeRole(userId: string, roleId: string, organizationId?: string): Promise<boolean> {
    const query = `
      UPDATE user_roles 
      SET is_active = false
      WHERE user_id = $1 
        AND role_id = $2 
        AND organization_id IS NOT DISTINCT FROM $3
    `;

    const result = await dbQuery(query, [userId, roleId, organizationId]);
    return (result.rowCount || 0) > 0;
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    const query = `
      SELECT 
        ur.id,
        ur.user_id,
        ur.role_id,
        r.name as role_name,
        ur.organization_id,
        o.name as organization_name,
        ur.granted_by,
        ur.granted_at,
        ur.expires_at,
        ur.is_active
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN organizations o ON ur.organization_id = o.id
      WHERE ur.user_id = $1 AND ur.is_active = true
    `;

    const result = await dbQuery(query, [userId]);
    return result.rows;
  }

  async bulkUpdateUsers(userIds: string[], updates: Partial<User>): Promise<number> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const query = `
      UPDATE users 
      SET ${setClause}, updated_at = NOW()
      WHERE id = ANY($1)
    `;

    const values = [userIds, ...Object.values(updates)];
    const result = await dbQuery(query, values);
    return result.rowCount || 0;
  }

  async deleteUsers(userIds: string[]): Promise<number> {
    const query = `DELETE FROM users WHERE id = ANY($1)`;
    const result = await dbQuery(query, [userIds]);
    return result.rowCount || 0;
  }

  // Basic CRUD methods
  async findById(id: string): Promise<User | null> {
    console.log(`🔍 UserModel.findById called with id: ${id}`);
    const result = await dbQuery(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    console.log(`📊 UserModel.findById result:`, {
      rowCount: result.rowCount,
      hasRows: result.rows.length > 0,
      firstRow: result.rows[0] ? 'Found' : 'Not found'
    });
    return result.rows[0] || null;
  }

  async findWhere(conditions: Record<string, any>): Promise<{ data: User[]; pagination: any }> {
    const whereClause = Object.keys(conditions)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(' AND ');
    
    const values = Object.values(conditions);
    const query = `SELECT * FROM ${this.tableName} WHERE ${whereClause}`;
    const result = await dbQuery(query, values);
    
    return {
      data: result.rows,
      pagination: { total: result.rows.length, limit: 0, offset: 0, hasMore: false }
    };
  }

  async create(data: Partial<User>): Promise<User> {
    const fields = Object.keys(data).map(key => key.replace(/([A-Z])/g, '_$1').toLowerCase());
    const values = Object.values(data);
    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await dbQuery(query, values);
    return result.rows[0];
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const fields = Object.keys(data).map(key => key.replace(/([A-Z])/g, '_$1').toLowerCase());
    const values = Object.values(data);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE ${this.primaryKey} = $1
      RETURNING *
    `;
    
    const result = await dbQuery(query, [id, ...values]);
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await dbQuery(
      `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  async findOrganizationByName(name: string): Promise<{ id: string; name: string } | null> {
    const result = await dbQuery(
      'SELECT id, name FROM organizations WHERE name = $1',
      [name]
    );
    return result.rows[0] || null;
  }
}
