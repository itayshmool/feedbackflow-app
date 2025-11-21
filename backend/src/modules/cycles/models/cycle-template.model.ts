// backend/src/modules/cycles/models/cycle-template.model.ts

import { Pool, PoolClient } from 'pg';
import { CycleTemplateModel, CycleType } from '../types/cycle.types';

export class CycleTemplateModelClass {
  constructor(private db: Pool) {}

  async create(
    data: Omit<CycleTemplateModel, 'id' | 'created_at' | 'updated_at'>,
    client?: PoolClient
  ): Promise<CycleTemplateModel> {
    const executor = client || this.db;
    
    const query = `
      INSERT INTO workflow_templates (
        organization_id, name, description, type, steps,
        triggers, is_active, is_default, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id, organization_id, name, description, type, steps as settings,
        is_default, is_active, created_at, updated_at, created_by
    `;
    
    const values = [
      data.organization_id,
      data.name,
      data.description || null,
      data.type,
      data.settings, // Stored in 'steps' column for workflow_templates
      '{}', // triggers (empty object)
      true, // is_active
      data.is_default,
      data.created_by
    ];
    
    const result = await executor.query(query, values);
    return this.mapDbRowToModel(result.rows[0]);
  }

  async findById(id: string, client?: PoolClient): Promise<CycleTemplateModel | null> {
    const executor = client || this.db;
    
    const query = `
      SELECT 
        id, organization_id, name, description, type,
        steps as settings, is_default, created_at,
        updated_at, created_by
      FROM workflow_templates
      WHERE id = $1 AND type = 'feedback_cycle'
    `;
    
    const result = await executor.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapDbRowToModel(result.rows[0]);
  }

  async findByOrganization(
    organizationId: string,
    client?: PoolClient
  ): Promise<CycleTemplateModel[]> {
    const executor = client || this.db;
    
    const query = `
      SELECT 
        id, organization_id, name, description, type,
        steps as settings, is_default, created_at,
        updated_at, created_by
      FROM workflow_templates
      WHERE organization_id = $1 AND type = 'feedback_cycle'
      ORDER BY created_at DESC
    `;
    
    const result = await executor.query(query, [organizationId]);
    return result.rows.map(row => this.mapDbRowToModel(row));
  }

  async findByType(
    organizationId: string,
    type: CycleType,
    client?: PoolClient
  ): Promise<CycleTemplateModel[]> {
    const executor = client || this.db;
    
    // For workflow_templates, we filter by the template type, not cycle type
    // This is a simplified implementation
    const query = `
      SELECT 
        id, organization_id, name, description, type,
        steps as settings, is_default, created_at,
        updated_at, created_by
      FROM workflow_templates
      WHERE organization_id = $1 AND type = 'feedback_cycle'
      ORDER BY created_at DESC
    `;
    
    const result = await executor.query(query, [organizationId]);
    return result.rows.map(row => this.mapDbRowToModel(row));
  }

  async getDefaultTemplate(
    organizationId: string,
    type: CycleType,
    client?: PoolClient
  ): Promise<CycleTemplateModel | null> {
    const executor = client || this.db;
    
    const query = `
      SELECT 
        id, organization_id, name, description, type,
        steps as settings, is_default, created_at,
        updated_at, created_by
      FROM workflow_templates
      WHERE organization_id = $1 
        AND type = 'feedback_cycle'
        AND is_default = true
      LIMIT 1
    `;
    
    const result = await executor.query(query, [organizationId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapDbRowToModel(result.rows[0]);
  }

  async update(
    id: string,
    updates: Partial<CycleTemplateModel>,
    client?: PoolClient
  ): Promise<CycleTemplateModel | null> {
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
    if (updates.type !== undefined) {
      setStatements.push(`type = $${++paramCount}`);
      values.push(updates.type);
    }
    if (updates.settings !== undefined) {
      setStatements.push(`steps = $${++paramCount}`);
      values.push(updates.settings);
    }
    if (updates.is_default !== undefined) {
      setStatements.push(`is_default = $${++paramCount}`);
      values.push(updates.is_default);
    }

    if (setStatements.length === 0) {
      return this.findById(id, client);
    }

    setStatements.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE workflow_templates
      SET ${setStatements.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING 
        id, organization_id, name, description, type,
        steps as settings, is_default, created_at,
        updated_at, created_by
    `;

    const result = await executor.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapDbRowToModel(result.rows[0]);
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const executor = client || this.db;
    
    const query = 'DELETE FROM workflow_templates WHERE id = $1';
    const result = await executor.query(query, [id]);
    
    return result.rowCount !== null && result.rowCount > 0;
  }

  private mapDbRowToModel(row: any): CycleTemplateModel {
    return {
      id: row.id,
      organization_id: row.organization_id,
      name: row.name,
      description: row.description,
      type: row.type,
      settings: row.settings,
      is_default: row.is_default,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by
    };
  }
}
