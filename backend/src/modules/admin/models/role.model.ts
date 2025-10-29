// backend/src/modules/admin/models/role.model.ts

import { query as dbQuery } from '../../../config/real-database.js';
import { Role } from '../types/user.types';

export class RoleModel {
  private tableName = 'roles';
  private primaryKey = 'id';

  async findSystemRoles(): Promise<Role[]> {
    const query = `
      SELECT * FROM roles 
      WHERE is_system_role = true 
      ORDER BY name
    `;
    
    const result = await dbQuery(query);
    return result.rows.map(this.transformRole);
  }

  async findCustomRoles(): Promise<Role[]> {
    const query = `
      SELECT * FROM roles 
      WHERE is_system_role = false 
      ORDER BY name
    `;
    
    const result = await dbQuery(query);
    return result.rows.map(this.transformRole);
  }

  async findByName(name: string): Promise<Role | null> {
    const query = `SELECT * FROM roles WHERE name = $1`;
    const result = await dbQuery(query, [name]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.transformRole(result.rows[0]);
  }

  async createRole(name: string, description: string, permissions: string[]): Promise<Role> {
    const query = `
      INSERT INTO roles (name, description, permissions, is_system_role)
      VALUES ($1, $2, $3, false)
      RETURNING *
    `;
    
    const result = await dbQuery(query, [name, description, JSON.stringify(permissions)]);
    return this.transformRole(result.rows[0]);
  }

  async updateRole(id: string, updates: Partial<Role>): Promise<Role | null> {
    const setClause = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'isSystemRole' && key !== 'createdAt' && key !== 'updatedAt')
      .map((key, index) => {
        if (key === 'permissions') {
          return `permissions = $${index + 2}`;
        }
        return `${key} = $${index + 2}`;
      })
      .join(', ');

    if (!setClause) {
      return this.findById(id);
    }

    const query = `
      UPDATE roles 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1 AND is_system_role = false
      RETURNING *
    `;

    const values = [id, ...Object.values(updates).filter((_, index) => {
      const key = Object.keys(updates)[index];
      return key !== 'id' && key !== 'isSystemRole' && key !== 'createdAt' && key !== 'updatedAt';
    })];

    const result = await dbQuery(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.transformRole(result.rows[0]);
  }

  async deleteRole(id: string): Promise<boolean> {
    // Check if role is in use
    const usageQuery = `
      SELECT COUNT(*) as count 
      FROM user_roles 
      WHERE role_id = $1 AND is_active = true
    `;
    
    const usageResult = await dbQuery(usageQuery, [id]);
    const usageCount = parseInt(usageResult.rows[0].count);
    
    if (usageCount > 0) {
      throw new Error('Cannot delete role that is currently assigned to users');
    }

    const query = `
      DELETE FROM roles 
      WHERE id = $1 AND is_system_role = false
    `;
    
    const result = await dbQuery(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async getRolePermissions(id: string): Promise<string[]> {
    const query = `SELECT permissions FROM roles WHERE id = $1`;
    const result = await dbQuery(query, [id]);
    
    if (result.rows.length === 0) {
      return [];
    }
    
    return result.rows[0].permissions || [];
  }

  async updateRolePermissions(id: string, permissions: string[]): Promise<boolean> {
    const query = `
      UPDATE roles 
      SET permissions = $2, updated_at = NOW()
      WHERE id = $1 AND is_system_role = false
    `;
    
    const result = await dbQuery(query, [id, JSON.stringify(permissions)]);
    return (result.rowCount || 0) > 0;
  }

  private transformRole(row: any): Role {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: row.permissions || [],
      isSystemRole: row.is_system_role,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Basic CRUD methods
  async findById(id: string): Promise<Role | null> {
    const result = await dbQuery(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    return result.rows[0] ? this.transformRole(result.rows[0]) : null;
  }
}
