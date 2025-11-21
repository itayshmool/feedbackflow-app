// backend/src/modules/cycles/models/cycle-participant.model.ts

import { Pool, PoolClient } from 'pg';
import { CycleParticipantModel, ParticipantRole, ParticipantStatus } from '../types/cycle.types';

export class CycleParticipantModelClass {
  constructor(private db: Pool) {}

  async create(
    data: Omit<CycleParticipantModel, 'id' | 'assigned_at'>,
    client?: PoolClient
  ): Promise<CycleParticipantModel> {
    const executor = client || this.db;
    
    const query = `
      INSERT INTO cycle_participants (
        cycle_id, user_id, role, assigned_by, status, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id, cycle_id, user_id, role, assigned_by,
        assigned_at, status, metadata
    `;
    
    const values = [
      data.cycle_id,
      data.user_id,
      data.role,
      data.assigned_by,
      data.status,
      data.metadata || null
    ];
    
    const result = await executor.query(query, values);
    return this.mapDbRowToModel(result.rows[0]);
  }

  async findByCycleId(cycleId: string, client?: PoolClient): Promise<CycleParticipantModel[]> {
    const executor = client || this.db;
    
    const query = `
      SELECT 
        id, cycle_id, user_id, role, assigned_by,
        assigned_at, status, metadata
      FROM cycle_participants
      WHERE cycle_id = $1
      ORDER BY assigned_at DESC
    `;
    
    const result = await executor.query(query, [cycleId]);
    return result.rows.map(row => this.mapDbRowToModel(row));
  }

  async findByUserId(userId: string, client?: PoolClient): Promise<CycleParticipantModel[]> {
    const executor = client || this.db;
    
    const query = `
      SELECT 
        id, cycle_id, user_id, role, assigned_by,
        assigned_at, status, metadata
      FROM cycle_participants
      WHERE user_id = $1
      ORDER BY assigned_at DESC
    `;
    
    const result = await executor.query(query, [userId]);
    return result.rows.map(row => this.mapDbRowToModel(row));
  }

  async findByCycleAndUser(
    cycleId: string,
    userId: string,
    client?: PoolClient
  ): Promise<CycleParticipantModel | null> {
    const executor = client || this.db;
    
    const query = `
      SELECT 
        id, cycle_id, user_id, role, assigned_by,
        assigned_at, status, metadata
      FROM cycle_participants
      WHERE cycle_id = $1 AND user_id = $2
    `;
    
    const result = await executor.query(query, [cycleId, userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapDbRowToModel(result.rows[0]);
  }

  async update(
    id: string,
    updates: Partial<CycleParticipantModel>,
    client?: PoolClient
  ): Promise<CycleParticipantModel | null> {
    const executor = client || this.db;
    
    const setStatements: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (updates.role !== undefined) {
      setStatements.push(`role = $${++paramCount}`);
      values.push(updates.role);
    }
    if (updates.status !== undefined) {
      setStatements.push(`status = $${++paramCount}`);
      values.push(updates.status);
    }
    if (updates.metadata !== undefined) {
      setStatements.push(`metadata = $${++paramCount}`);
      values.push(updates.metadata);
    }

    if (setStatements.length === 0) {
      // No updates, just return current record
      const current = await executor.query(
        'SELECT * FROM cycle_participants WHERE id = $1',
        [id]
      );
      return current.rows.length > 0 ? this.mapDbRowToModel(current.rows[0]) : null;
    }

    values.push(id);

    const query = `
      UPDATE cycle_participants
      SET ${setStatements.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING 
        id, cycle_id, user_id, role, assigned_by,
        assigned_at, status, metadata
    `;

    const result = await executor.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapDbRowToModel(result.rows[0]);
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const executor = client || this.db;
    
    const query = 'DELETE FROM cycle_participants WHERE id = $1';
    const result = await executor.query(query, [id]);
    
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteByCycleId(cycleId: string, client?: PoolClient): Promise<void> {
    const executor = client || this.db;
    
    const query = 'DELETE FROM cycle_participants WHERE cycle_id = $1';
    await executor.query(query, [cycleId]);
  }

  async getParticipantsByRole(
    cycleId: string,
    role: ParticipantRole,
    client?: PoolClient
  ): Promise<CycleParticipantModel[]> {
    const executor = client || this.db;
    
    const query = `
      SELECT 
        id, cycle_id, user_id, role, assigned_by,
        assigned_at, status, metadata
      FROM cycle_participants
      WHERE cycle_id = $1 AND role = $2
      ORDER BY assigned_at DESC
    `;
    
    const result = await executor.query(query, [cycleId, role]);
    return result.rows.map(row => this.mapDbRowToModel(row));
  }

  async getActiveParticipants(cycleId: string, client?: PoolClient): Promise<CycleParticipantModel[]> {
    const executor = client || this.db;
    
    const query = `
      SELECT 
        id, cycle_id, user_id, role, assigned_by,
        assigned_at, status, metadata
      FROM cycle_participants
      WHERE cycle_id = $1 AND status = 'active'
      ORDER BY assigned_at DESC
    `;
    
    const result = await executor.query(query, [cycleId]);
    return result.rows.map(row => this.mapDbRowToModel(row));
  }

  private mapDbRowToModel(row: any): CycleParticipantModel {
    return {
      id: row.id,
      cycle_id: row.cycle_id,
      user_id: row.user_id,
      role: row.role,
      assigned_by: row.assigned_by,
      assigned_at: row.assigned_at,
      status: row.status,
      metadata: row.metadata
    };
  }
}
