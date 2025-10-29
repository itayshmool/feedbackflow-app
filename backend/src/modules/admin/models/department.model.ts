import { Pool, PoolClient } from 'pg';
import {
  Department,
  DepartmentModel,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  DepartmentStats,
  DepartmentType,
  DepartmentSettings,
} from '../types/organization.types';
import { NotFoundError, ValidationError } from '../../../shared/utils/errors.js';

export class DepartmentModelClass {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  private mapDbToDepartment(dbRow: DepartmentModel): Department {
    return {
      id: dbRow.id,
      organizationId: dbRow.organization_id,
      name: dbRow.name,
      description: dbRow.description,
      type: dbRow.type as DepartmentType,
      parentDepartmentId: dbRow.parent_department_id,
      managerId: dbRow.manager_id,
      budget: dbRow.budget,
      isActive: dbRow.is_active,
      settings: dbRow.settings,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
    };
  }

  private mapDepartmentToDb(dept: Partial<Department> | UpdateDepartmentRequest): Partial<DepartmentModel> {
    const result: Partial<DepartmentModel> = {};
    
    if (dept.name !== undefined) result.name = dept.name;
    if (dept.description !== undefined) result.description = dept.description;
    if (dept.type !== undefined) result.type = dept.type;
    if (dept.parentDepartmentId !== undefined) result.parent_department_id = dept.parentDepartmentId;
    if (dept.managerId !== undefined) result.manager_id = dept.managerId;
    if (dept.budget !== undefined) result.budget = dept.budget;
    if (dept.isActive !== undefined) result.is_active = dept.isActive;
    if (dept.settings !== undefined) {
      // Handle both DepartmentSettings and Partial<DepartmentSettings>
      const settings = dept.settings as any;
      result.settings = settings;
    }
    
    return result;
  }

  async createDepartment(
    organizationId: string,
    deptData: CreateDepartmentRequest,
    client?: PoolClient
  ): Promise<Department> {
    const db = client || this.db;

    // Look up manager ID from email if email is provided
    let managerId = deptData.managerId;
    if (deptData.managerEmail) {
      const userQuery = `
        SELECT id FROM users 
        WHERE email = $1 AND organization_id = $2 AND is_active = true
      `;
      const userResult = await db.query(userQuery, [deptData.managerEmail, organizationId]);
      
      if (userResult.rows.length === 0) {
        throw new ValidationError(`User with email ${deptData.managerEmail} not found in organization`);
      }
      
      managerId = userResult.rows[0].id;
    }

    // Validate UUIDs if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (deptData.parentDepartmentId && !uuidRegex.test(deptData.parentDepartmentId)) {
      throw new ValidationError(`Invalid parent department ID format: ${deptData.parentDepartmentId}`);
    }
    
    if (managerId && !uuidRegex.test(managerId)) {
      throw new ValidationError(`Invalid manager ID format: ${managerId}`);
    }

    // Default settings if not provided
    const defaultSettings: DepartmentSettings = {
      allowCrossDepartmentFeedback: false,
      requireManagerApproval: true,
      customFeedbackTemplates: [],
      notificationPreferences: {
        email: true,
        inApp: true,
        sms: false,
      },
    };

    const query = `
      INSERT INTO departments (
        organization_id, name, description, type,
        parent_department_id, manager_id, budget, is_active, settings,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      )
      RETURNING *
    `;

    const values = [
      organizationId,
      deptData.name,
      deptData.description || null,
      deptData.type,
      deptData.parentDepartmentId || null,
      managerId || null,
      deptData.budget || null,
      true, // isActive
      { ...defaultSettings, ...deptData.settings },
    ];

    const result = await db.query(query, values);
    return this.mapDbToDepartment(result.rows[0]);
  }

  async getDepartmentById(
    departmentId: string,
    organizationId: string,
    client?: PoolClient
  ): Promise<Department | null> {
    const db = client || this.db;
    const query = `
      SELECT * FROM departments 
      WHERE id = $1 AND organization_id = $2
    `;
    const result = await db.query(query, [departmentId, organizationId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbToDepartment(result.rows[0]);
  }

  async getDepartments(
    organizationId: string,
    filters: {
      isActive?: boolean;
      type?: DepartmentType;
      parentDepartmentId?: string;
      limit?: number;
      offset?: number;
    } = {},
    client?: PoolClient
  ): Promise<Department[]> {
    const db = client || this.db;
    let query = 'SELECT * FROM departments WHERE organization_id = $1';
    const values: any[] = [organizationId];
    let paramCount = 1;

    if (filters.isActive !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      values.push(filters.isActive);
    }

    if (filters.type) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      values.push(filters.type);
    }

    if (filters.parentDepartmentId !== undefined) {
      if (filters.parentDepartmentId === null) {
        query += ' AND parent_department_id IS NULL';
      } else {
        paramCount++;
        query += ` AND parent_department_id = $${paramCount}`;
        values.push(filters.parentDepartmentId);
      }
    }

    query += ' ORDER BY name ASC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
    }

    const result = await db.query(query, values);
    return result.rows.map(row => this.mapDbToDepartment(row));
  }

  async updateDepartment(
    departmentId: string,
    organizationId: string,
    updateData: UpdateDepartmentRequest,
    client?: PoolClient
  ): Promise<Department> {
    const db = client || this.db;
    const existingDept = await this.getDepartmentById(departmentId, organizationId, client);
    if (!existingDept) {
      throw new NotFoundError(`Department with ID ${departmentId} not found`);
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Build dynamic update query
    const dbData = this.mapDepartmentToDb(updateData);
    Object.entries(dbData).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return existingDept;
    }

    paramCount++;
    updateFields.push(`updated_at = $${paramCount}`);
    values.push(new Date());

    paramCount++;
    values.push(departmentId);
    paramCount++;
    values.push(organizationId);

    const query = `
      UPDATE departments 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount - 1} AND organization_id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return this.mapDbToDepartment(result.rows[0]);
  }

  async deleteDepartment(
    departmentId: string,
    organizationId: string,
    client?: PoolClient
  ): Promise<void> {
    const db = client || this.db;
    const existingDept = await this.getDepartmentById(departmentId, organizationId, client);
    if (!existingDept) {
      throw new NotFoundError(`Department with ID ${departmentId} not found`);
    }

    // Check if department has child departments
    const childQuery = 'SELECT COUNT(*) FROM departments WHERE parent_department_id = $1';
    const childResult = await db.query(childQuery, [departmentId]);
    const childCount = parseInt(childResult.rows[0].count);

    if (childCount > 0) {
      throw new ValidationError('Cannot delete department with child departments');
    }

    // Check if department has teams
    const teamQuery = 'SELECT COUNT(*) FROM teams WHERE department_id = $1';
    const teamResult = await db.query(teamQuery, [departmentId]);
    const teamCount = parseInt(teamResult.rows[0].count);

    if (teamCount > 0) {
      throw new ValidationError('Cannot delete department with associated teams');
    }

    const query = 'DELETE FROM departments WHERE id = $1 AND organization_id = $2';
    await db.query(query, [departmentId, organizationId]);
  }

  async getDepartmentStats(
    organizationId: string,
    client?: PoolClient
  ): Promise<DepartmentStats> {
    const db = client || this.db;

    // Get basic department counts
    const deptCountQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
      FROM departments
      WHERE organization_id = $1
    `;

    const deptCountResult = await db.query(deptCountQuery, [organizationId]);
    const deptCounts = deptCountResult.rows[0];

    // Get department type distribution
    const typeQuery = `
      SELECT type, COUNT(*) as count
      FROM departments
      WHERE organization_id = $1 AND is_active = true
      GROUP BY type
    `;

    const typeResult = await db.query(typeQuery, [organizationId]);
    const byType: Record<string, number> = {};
    typeResult.rows.forEach(row => {
      byType[row.type] = parseInt(row.count);
    });

    // Get average teams per department
    const avgTeamsQuery = `
      SELECT COALESCE(AVG(team_count), 0) as avg_teams
      FROM (
        SELECT d.id, COUNT(t.id) as team_count
        FROM departments d
        LEFT JOIN teams t ON d.id = t.department_id AND t.is_active = true
        WHERE d.organization_id = $1 AND d.is_active = true
        GROUP BY d.id
      ) dept_teams
    `;

    const avgTeamsResult = await db.query(avgTeamsQuery, [organizationId]);
    const averageTeamsPerDepartment = parseFloat(avgTeamsResult.rows[0].avg_teams);

    // Get average users per department (placeholder)
    const avgUsersQuery = `
      SELECT COALESCE(AVG(user_count), 0) as avg_users
      FROM (
        SELECT d.id, COUNT(u.id) as user_count
        FROM departments d
        LEFT JOIN users u ON d.id = u.department_id AND u.is_active = true
        WHERE d.organization_id = $1 AND d.is_active = true
        GROUP BY d.id
      ) dept_users
    `;

    const avgUsersResult = await db.query(avgUsersQuery, [organizationId]).catch(() => ({
      rows: [{ avg_users: '0' }],
    }));
    const averageUsersPerDepartment = parseFloat(avgUsersResult.rows[0].avg_users);

    return {
      totalDepartments: parseInt(deptCounts.total),
      activeDepartments: parseInt(deptCounts.active),
      inactiveDepartments: parseInt(deptCounts.inactive),
      byType: byType as Record<DepartmentType, number>,
      averageTeamsPerDepartment,
      averageUsersPerDepartment,
    };
  }

  async getDepartmentHierarchy(
    organizationId: string,
    client?: PoolClient
  ): Promise<Department[]> {
    const db = client || this.db;
    const query = `
      WITH RECURSIVE dept_hierarchy AS (
        SELECT d.*, 0 as level
        FROM departments d
        WHERE d.organization_id = $1 AND d.parent_department_id IS NULL AND d.is_active = true
        
        UNION ALL
        
        SELECT d.*, dh.level + 1
        FROM departments d
        INNER JOIN dept_hierarchy dh ON d.parent_department_id = dh.id
        WHERE d.is_active = true
      )
      SELECT * FROM dept_hierarchy
      ORDER BY level, name
    `;

    const result = await db.query(query, [organizationId]);
    return result.rows.map(row => this.mapDbToDepartment(row));
  }

  async validateDepartmentData(
    organizationId: string,
    deptData: CreateDepartmentRequest
  ): Promise<void> {
    // Validate required fields
    if (!deptData.name || deptData.name.trim().length === 0) {
      throw new ValidationError('Department name is required');
    }

    // Validate parent department exists if specified
    if (deptData.parentDepartmentId) {
      const parentDept = await this.getDepartmentById(
        deptData.parentDepartmentId,
        organizationId
      );
      if (!parentDept) {
        throw new ValidationError('Parent department not found');
      }
    }

    // Validate manager exists if specified (placeholder - would need user validation)
    if (deptData.managerId) {
      // TODO: Validate manager exists in organization
    }

    // Validate budget is positive if specified
    if (deptData.budget !== undefined && deptData.budget < 0) {
      throw new ValidationError('Budget must be non-negative');
    }
  }
}
