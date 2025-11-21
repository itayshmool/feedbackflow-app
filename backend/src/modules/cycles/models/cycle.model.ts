// backend/src/modules/cycles/models/cycle.model.ts

import { Pool, PoolClient } from 'pg';
import { CycleModel, CycleFilters, CycleStatus } from '../types/cycle.types';

export class CycleModelClass {
  constructor(private db: Pool) {}

  async create(
    data: Omit<CycleModel, 'id' | 'created_at' | 'updated_at'>,
    client?: PoolClient
  ): Promise<CycleModel> {
    const executor = client || this.db;
    
    const query = `
      INSERT INTO feedback_cycles (
        organization_id, name, description, type, status,
        start_date, end_date, settings, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id, organization_id, name, description, type, status,
        start_date, end_date, template_id, settings,
        created_at, updated_at, created_by
    `;
    
    const values = [
      data.organization_id,
      data.name,
      data.description || null,
      data.type,
      data.status,
      data.start_date,
      data.end_date,
      data.settings,
      data.created_by
    ];
    
    const result = await executor.query(query, values);
    return this.mapDbRowToModel(result.rows[0]);
  }

  async findById(id: string, client?: PoolClient): Promise<CycleModel | null> {
    const executor = client || this.db;
    
    const query = `
      SELECT 
        fc.id, fc.organization_id, fc.name, fc.description,
        fc.type, fc.status, fc.start_date, fc.end_date,
        fc.feedback_start_date, fc.feedback_end_date,
        fc.template_id, fc.settings, fc.created_at,
        fc.updated_at, fc.created_by
      FROM feedback_cycles fc
      WHERE fc.id = $1
    `;
    
    const result = await executor.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapDbRowToModel(result.rows[0]);
  }

  async findWithFilters(
    filters: CycleFilters,
    page: number,
    limit: number,
    client?: PoolClient
  ): Promise<{ cycles: CycleModel[]; total: number }> {
    const executor = client || this.db;
    
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramCount = 0;

    if (filters.organizationId) {
      whereConditions.push(`fc.organization_id = $${++paramCount}`);
      queryParams.push(filters.organizationId);
    }
    if (filters.status) {
      whereConditions.push(`fc.status = $${++paramCount}`);
      queryParams.push(filters.status);
    }
    if (filters.type) {
      whereConditions.push(`fc.type = $${++paramCount}`);
      queryParams.push(filters.type);
    }
    if (filters.createdBy) {
      whereConditions.push(`fc.created_by = $${++paramCount}`);
      queryParams.push(filters.createdBy);
    }
    if (filters.dateFrom) {
      whereConditions.push(`fc.start_date >= $${++paramCount}`);
      queryParams.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      whereConditions.push(`fc.end_date <= $${++paramCount}`);
      queryParams.push(filters.dateTo);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM feedback_cycles fc
      ${whereClause}
    `;
    const countResult = await executor.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated cycles
    const offset = (page - 1) * limit;
    const cyclesQuery = `
      SELECT 
        fc.id, fc.organization_id, fc.name, fc.description,
        fc.type, fc.status, fc.start_date, fc.end_date,
        fc.feedback_start_date, fc.feedback_end_date,
        fc.template_id, fc.settings, fc.created_at,
        fc.updated_at, fc.created_by
      FROM feedback_cycles fc
      ${whereClause}
      ORDER BY fc.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    
    queryParams.push(limit, offset);
    const cyclesResult = await executor.query(cyclesQuery, queryParams);
    
    const cycles = cyclesResult.rows.map(row => this.mapDbRowToModel(row));

    return { cycles, total };
  }

  async update(
    id: string,
    updates: Partial<CycleModel>,
    client?: PoolClient
  ): Promise<CycleModel | null> {
    const executor = client || this.db;
    
    const setStatements: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (updates.name !== undefined) {
      setStatements.push(`name = $${++paramCount}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setStatements.push(`description = $${++paramCount}`);
      values.push(updates.description);
    }
    if (updates.status !== undefined) {
      setStatements.push(`status = $${++paramCount}`);
      values.push(updates.status);
    }
    if (updates.type !== undefined) {
      setStatements.push(`type = $${++paramCount}`);
      values.push(updates.type);
    }
    if (updates.start_date !== undefined) {
      setStatements.push(`start_date = $${++paramCount}`);
      values.push(updates.start_date);
    }
    if (updates.end_date !== undefined) {
      setStatements.push(`end_date = $${++paramCount}`);
      values.push(updates.end_date);
    }
    if (updates.settings !== undefined) {
      setStatements.push(`settings = $${++paramCount}`);
      values.push(updates.settings);
    }

    if (setStatements.length === 0) {
      return this.findById(id, client);
    }

    setStatements.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE feedback_cycles
      SET ${setStatements.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING 
        id, organization_id, name, description, type, status,
        start_date, end_date, template_id, settings,
        created_at, updated_at, created_by
    `;

    const result = await executor.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapDbRowToModel(result.rows[0]);
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const executor = client || this.db;
    
    const query = 'DELETE FROM feedback_cycles WHERE id = $1';
    const result = await executor.query(query, [id]);
    
    return result.rowCount !== null && result.rowCount > 0;
  }

  async findByOrganization(
    organizationId: string,
    status?: CycleStatus,
    client?: PoolClient
  ): Promise<CycleModel[]> {
    const executor = client || this.db;
    
    let query = `
      SELECT 
        fc.id, fc.organization_id, fc.name, fc.description,
        fc.type, fc.status, fc.start_date, fc.end_date,
        fc.feedback_start_date, fc.feedback_end_date,
        fc.template_id, fc.settings, fc.created_at,
        fc.updated_at, fc.created_by
      FROM feedback_cycles fc
      WHERE fc.organization_id = $1
    `;
    
    const params: any[] = [organizationId];
    
    if (status) {
      query += ' AND fc.status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY fc.created_at DESC';
    
    const result = await executor.query(query, params);
    return result.rows.map(row => this.mapDbRowToModel(row));
  }

  async getActiveCycles(organizationId: string, client?: PoolClient): Promise<CycleModel[]> {
    return this.findByOrganization(organizationId, CycleStatus.ACTIVE, client);
  }

  async getStatsByOrganization(organizationId: string, client?: PoolClient): Promise<any> {
    const executor = client || this.db;
    
    const query = `
      SELECT 
        COUNT(*) as "totalCycles",
        COUNT(CASE WHEN status = 'active' THEN 1 END) as "activeCycles",
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as "completedCycles"
      FROM feedback_cycles
      WHERE organization_id = $1
    `;
    
    const result = await executor.query(query, [organizationId]);
    
    if (result.rows.length === 0) {
      return {
        totalCycles: 0,
        activeCycles: 0,
        completedCycles: 0
      };
    }
    
    return {
      totalCycles: parseInt(result.rows[0].totalCycles) || 0,
      activeCycles: parseInt(result.rows[0].activeCycles) || 0,
      completedCycles: parseInt(result.rows[0].completedCycles) || 0
    };
  }

  private mapDbRowToModel(row: any): CycleModel {
    return {
      id: row.id,
      organization_id: row.organization_id,
      name: row.name,
      description: row.description,
      type: row.type,
      status: row.status,
      start_date: row.start_date,
      end_date: row.end_date,
      template_id: row.template_id,
      settings: row.settings,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by
    };
  }
}
