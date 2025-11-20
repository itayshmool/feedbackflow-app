// backend/src/modules/hierarchy/services/hierarchy.service.ts

import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import { Logger } from '../../../shared/utils/logger.js';
import { HierarchyNode, HierarchyStats, OrganizationalHierarchy } from '../types/hierarchy.types.js';

export class HierarchyService {
  constructor(
    private db: Pool,
    private eventEmitter: EventEmitter,
    private logger: Logger
  ) {}

  /**
   * Get direct reports for a manager
   */
  async getDirectReports(managerId: string): Promise<HierarchyNode[]> {
    this.logger.debug('Fetching direct reports', { managerId });
    
    const query = `
      SELECT 
        oh.id,
        oh.employee_id,
        u.name as employee_name,
        u.email as employee_email,
        oh.manager_id,
        u.title,
        u.department,
        oh.level
      FROM organizational_hierarchy oh
      JOIN users u ON oh.employee_id = u.id
      WHERE oh.manager_id = $1
        AND oh.is_active = true
      ORDER BY u.name
    `;
    
    const result = await this.db.query(query, [managerId]);
    return result.rows;
  }

  /**
   * Get manager chain for an employee
   */
  async getManagerChain(employeeId: string): Promise<HierarchyNode[]> {
    this.logger.debug('Fetching manager chain', { employeeId });
    
    const query = `
      WITH RECURSIVE manager_chain AS (
        -- Base: Get immediate manager
        SELECT 
          oh.id,
          oh.employee_id,
          u.name as employee_name,
          u.email as employee_email,
          oh.manager_id,
          m.name as manager_name,
          u.title,
          u.department,
          oh.level,
          1 as chain_level
        FROM organizational_hierarchy oh
        JOIN users u ON oh.employee_id = u.id
        LEFT JOIN users m ON oh.manager_id = m.id
        WHERE oh.employee_id = $1
          AND oh.is_active = true
        
        UNION ALL
        
        -- Recursive: Get manager's manager
        SELECT 
          oh.id,
          oh.employee_id,
          u.name as employee_name,
          u.email as employee_email,
          oh.manager_id,
          m.name as manager_name,
          u.title,
          u.department,
          oh.level,
          mc.chain_level + 1
        FROM organizational_hierarchy oh
        JOIN users u ON oh.employee_id = u.id
        LEFT JOIN users m ON oh.manager_id = m.id
        JOIN manager_chain mc ON oh.employee_id = mc.manager_id
        WHERE oh.is_active = true
          AND mc.chain_level < 20
      )
      SELECT * FROM manager_chain
      ORDER BY chain_level DESC
    `;
    
    const result = await this.db.query(query, [employeeId]);
    return result.rows;
  }

  /**
   * Get hierarchy tree for an organization
   */
  async getHierarchyTree(organizationId: string): Promise<HierarchyNode> {
    this.logger.debug('Fetching hierarchy tree', { organizationId });
    
    // Get all hierarchy relationships
    const query = `
      SELECT 
        oh.id,
        oh.employee_id,
        u.name as employee_name,
        u.email as employee_email,
        oh.manager_id,
        u.title,
        u.department,
        oh.level
      FROM organizational_hierarchy oh
      JOIN users u ON oh.employee_id = u.id
      WHERE oh.organization_id = $1
        AND oh.is_active = true
      ORDER BY oh.level, u.name
    `;
    
    const result = await this.db.query(query, [organizationId]);
    const nodes = result.rows;
    
    // Build tree structure
    const nodeMap = new Map<string, HierarchyNode>();
    const roots: HierarchyNode[] = [];
    
    // First pass: create all nodes
    nodes.forEach(node => {
      nodeMap.set(node.employee_id, { ...node, children: [] });
    });
    
    // Second pass: build hierarchy
    nodes.forEach(node => {
      const currentNode = nodeMap.get(node.employee_id)!;
      if (node.manager_id) {
        const parent = nodeMap.get(node.manager_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(currentNode);
        } else {
          roots.push(currentNode);
        }
      } else {
        roots.push(currentNode);
      }
    });
    
    // Calculate employee counts for all nodes
    roots.forEach(root => this.calculateEmployeeCounts(root));
    
    // Return first root or create placeholder
    return roots[0] || {
      id: 'root',
      employee_id: 'root',
      employee_name: 'Organization',
      employee_email: '',
      manager_id: null,
      children: [],
      employee_count: 0
    };
  }

  /**
   * Recursively calculate total employee count for each node
   * Returns the count of all descendants (direct + indirect reports)
   */
  private calculateEmployeeCounts(node: HierarchyNode): number {
    if (!node.children || node.children.length === 0) {
      node.employee_count = 0;
      return 0;
    }
    
    let totalCount = node.children.length; // Direct reports
    
    // Add indirect reports recursively
    node.children.forEach(child => {
      totalCount += this.calculateEmployeeCounts(child);
    });
    
    node.employee_count = totalCount;
    return totalCount;
  }

  /**
   * Get hierarchy statistics
   */
  async getHierarchyStats(organizationId: string): Promise<HierarchyStats> {
    this.logger.debug('Fetching hierarchy stats', { organizationId });
    
    const query = `SELECT * FROM get_hierarchy_stats($1)`;
    const result = await this.db.query(query, [organizationId]);
    
    return result.rows[0] || {
      total_relationships: 0,
      max_depth: 0,
      average_span_of_control: 0,
      orphaned_employees: 0
    };
  }

  /**
   * Validate hierarchy (no circular references)
   */
  async validateHierarchy(organizationId: string): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    this.logger.debug('Validating hierarchy', { organizationId });
    
    // Basic validation - the DB trigger handles circular references
    const stats = await this.getHierarchyStats(organizationId);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (stats.orphaned_employees > 0) {
      warnings.push(`${stats.orphaned_employees} employees are not in the hierarchy`);
    }
    
    if (stats.max_depth > 10) {
      warnings.push(`Hierarchy depth (${stats.max_depth}) is very deep, consider flattening`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Search employees for hierarchy assignment
   */
  async searchEmployees(organizationId: string, query: string, role?: string, excludeIds: string[] = []): Promise<HierarchyNode[]> {
    this.logger.debug('Searching employees', { organizationId, query, role });
    
    const sqlQuery = `
      SELECT 
        u.id as employee_id,
        u.name as employee_name,
        u.email as employee_email,
        u.title,
        u.department,
        oh.manager_id
      FROM users u
      LEFT JOIN organizational_hierarchy oh ON u.id = oh.employee_id AND oh.is_active = true
      WHERE u.organization_id = $1
        AND u.is_active = true
        AND (u.name ILIKE $2 OR u.email ILIKE $2)
        ${role ? 'AND u.role = $4' : ''}
        ${excludeIds.length > 0 ? 'AND u.id NOT IN (' + excludeIds.map((_, i) => `$${i + (role ? 5 : 4)}`).join(',') + ')' : ''}
      ORDER BY u.name
      LIMIT 20
    `;
    
    const params = [organizationId, `%${query}%`];
    if (role) params.push(role);
    if (excludeIds.length > 0) params.push(...excludeIds);
    
    const result = await this.db.query(sqlQuery, params);
    return result.rows.map(row => ({
      id: row.employee_id,
      employee_id: row.employee_id,
      employee_name: row.employee_name,
      employee_email: row.employee_email,
      manager_id: row.manager_id,
      title: row.title,
      department: row.department
    }));
  }

  /**
   * Create hierarchy relationship
   */
  async createHierarchy(organizationId: string, employeeId: string, managerId: string): Promise<OrganizationalHierarchy> {
    this.logger.debug('Creating hierarchy relationship', { organizationId, employeeId, managerId });
    
    const query = `
      INSERT INTO organizational_hierarchy (
        organization_id, employee_id, manager_id, is_active, effective_date
      ) VALUES ($1, $2, $3, true, NOW())
      RETURNING *
    `;
    
    const result = await this.db.query(query, [organizationId, employeeId, managerId]);
    return result.rows[0];
  }

  /**
   * Update hierarchy relationship
   */
  async updateHierarchy(id: string, managerId: string): Promise<OrganizationalHierarchy> {
    this.logger.debug('Updating hierarchy relationship', { id, managerId });
    
    const query = `
      UPDATE organizational_hierarchy
      SET manager_id = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await this.db.query(query, [id, managerId]);
    return result.rows[0];
  }

  /**
   * Delete hierarchy relationship
   */
  async deleteHierarchy(id: string): Promise<void> {
    this.logger.debug('Deleting hierarchy relationship', { id });
    
    const query = `
      UPDATE organizational_hierarchy
      SET is_active = false, end_date = NOW(), updated_at = NOW()
      WHERE id = $1
    `;
    
    await this.db.query(query, [id]);
  }

  /**
   * Bulk update hierarchy
   */
  async bulkUpdateHierarchy(organizationId: string, relationships: Array<{ employeeId: string; managerId: string }>): Promise<{ created: number; updated: number; errors: string[] }> {
    this.logger.debug('Bulk updating hierarchy', { organizationId, count: relationships.length });
    
    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    
    for (const rel of relationships) {
      try {
        // Check if relationship exists
        const checkQuery = `
          SELECT id FROM organizational_hierarchy
          WHERE organization_id = $1 AND employee_id = $2 AND is_active = true
        `;
        const existing = await this.db.query(checkQuery, [organizationId, rel.employeeId]);
        
        if (existing.rows.length > 0) {
          await this.updateHierarchy(existing.rows[0].id, rel.managerId);
          updated++;
        } else {
          await this.createHierarchy(organizationId, rel.employeeId, rel.managerId);
          created++;
        }
      } catch (err: any) {
        errors.push(`Failed to process ${rel.employeeId}: ${err.message}`);
      }
    }
    
    return { created, updated, errors };
  }
}

