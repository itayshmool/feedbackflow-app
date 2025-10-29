import { Pool, PoolClient } from 'pg';
import {
  Team,
  TeamModel,
  CreateTeamRequest,
  UpdateTeamRequest,
  TeamStats,
  TeamType,
  TeamSettings,
} from '../types/organization.types';
import { NotFoundError, ValidationError } from '../../../shared/utils/errors.js';

export class TeamModelClass {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  private mapDbToTeam(dbRow: TeamModel): Team {
    return {
      id: dbRow.id,
      organizationId: dbRow.organization_id,
      departmentId: dbRow.department_id,
      name: dbRow.name,
      description: dbRow.description,
      type: dbRow.type as TeamType,
      teamLeadId: dbRow.team_lead_id,
      isActive: dbRow.is_active,
      settings: dbRow.settings,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
    };
  }

  private mapTeamToDb(team: Partial<Team> | UpdateTeamRequest): Partial<TeamModel> {
    const result: Partial<TeamModel> = {};
    
    if (team.name !== undefined) result.name = team.name;
    if (team.description !== undefined) result.description = team.description;
    if (team.type !== undefined) result.type = team.type;
    if (team.departmentId !== undefined) result.department_id = team.departmentId;
    if (team.teamLeadId !== undefined) result.team_lead_id = team.teamLeadId;
    if (team.isActive !== undefined) result.is_active = team.isActive;
    if (team.settings !== undefined) {
      // Handle both TeamSettings and Partial<TeamSettings>
      const settings = team.settings as any;
      result.settings = settings;
    }
    
    return result;
  }

  async createTeam(
    organizationId: string,
    teamData: CreateTeamRequest,
    client?: PoolClient
  ): Promise<Team> {
    const db = client || this.db;

    // Look up team lead ID from email if email is provided
    let teamLeadId = teamData.teamLeadId;
    if (teamData.teamLeadEmail) {
      const userQuery = `
        SELECT id FROM users 
        WHERE email = $1 AND organization_id = $2 AND is_active = true
      `;
      const userResult = await db.query(userQuery, [teamData.teamLeadEmail, organizationId]);
      
      if (userResult.rows.length === 0) {
        throw new ValidationError(`User with email ${teamData.teamLeadEmail} not found in organization`);
      }
      
      teamLeadId = userResult.rows[0].id;
    }

    // Validate UUIDs if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (teamData.departmentId && !uuidRegex.test(teamData.departmentId)) {
      throw new ValidationError(`Invalid department ID format: ${teamData.departmentId}`);
    }
    
    if (teamLeadId && !uuidRegex.test(teamLeadId)) {
      throw new ValidationError(`Invalid team lead ID format: ${teamLeadId}`);
    }

    // Default settings if not provided
    const defaultSettings: TeamSettings = {
      allowPeerFeedback: true,
      requireTeamLeadApproval: false,
      customWorkflows: [],
      collaborationTools: [],
    };

    const query = `
      INSERT INTO teams (
        organization_id, department_id, name, description,
        type, team_lead_id, is_active, settings, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
      )
      RETURNING *
    `;

    const values = [
      organizationId,
      teamData.departmentId || null,
      teamData.name,
      teamData.description || null,
      teamData.type,
      teamLeadId || null,
      true, // isActive
      { ...defaultSettings, ...teamData.settings },
    ];

    const result = await db.query(query, values);
    return this.mapDbToTeam(result.rows[0]);
  }

  async getTeamById(
    teamId: string,
    organizationId: string,
    client?: PoolClient
  ): Promise<Team | null> {
    const db = client || this.db;
    const query = `
      SELECT * FROM teams 
      WHERE id = $1 AND organization_id = $2
    `;
    const result = await db.query(query, [teamId, organizationId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbToTeam(result.rows[0]);
  }

  async getTeams(
    organizationId: string,
    filters: {
      isActive?: boolean;
      type?: TeamType;
      departmentId?: string;
      limit?: number;
      offset?: number;
    } = {},
    client?: PoolClient
  ): Promise<Team[]> {
    const db = client || this.db;
    let query = 'SELECT * FROM teams WHERE organization_id = $1';
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

    if (filters.departmentId !== undefined) {
      if (filters.departmentId === null) {
        query += ' AND department_id IS NULL';
      } else {
        paramCount++;
        query += ` AND department_id = $${paramCount}`;
        values.push(filters.departmentId);
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
    return result.rows.map(row => this.mapDbToTeam(row));
  }

  async updateTeam(
    teamId: string,
    organizationId: string,
    updateData: UpdateTeamRequest,
    client?: PoolClient
  ): Promise<Team> {
    const db = client || this.db;
    const existingTeam = await this.getTeamById(teamId, organizationId, client);
    if (!existingTeam) {
      throw new NotFoundError(`Team with ID ${teamId} not found`);
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Build dynamic update query
    const dbData = this.mapTeamToDb(updateData);
    Object.entries(dbData).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return existingTeam;
    }

    paramCount++;
    updateFields.push(`updated_at = $${paramCount}`);
    values.push(new Date());

    paramCount++;
    values.push(teamId);
    paramCount++;
    values.push(organizationId);

    const query = `
      UPDATE teams 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount - 1} AND organization_id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return this.mapDbToTeam(result.rows[0]);
  }

  async deleteTeam(
    teamId: string,
    organizationId: string,
    client?: PoolClient
  ): Promise<void> {
    const db = client || this.db;
    const existingTeam = await this.getTeamById(teamId, organizationId, client);
    if (!existingTeam) {
      throw new NotFoundError(`Team with ID ${teamId} not found`);
    }

    // Check if team has members
    const memberQuery = 'SELECT COUNT(*) FROM team_members WHERE team_id = $1';
    const memberResult = await db.query(memberQuery, [teamId]);
    const memberCount = parseInt(memberResult.rows[0].count);

    if (memberCount > 0) {
      throw new ValidationError('Cannot delete team with members');
    }

    const query = 'DELETE FROM teams WHERE id = $1 AND organization_id = $2';
    await db.query(query, [teamId, organizationId]);
  }

  async getTeamStats(
    organizationId: string,
    client?: PoolClient
  ): Promise<TeamStats> {
    const db = client || this.db;

    // Get basic team counts
    const teamCountQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
      FROM teams
      WHERE organization_id = $1
    `;

    const teamCountResult = await db.query(teamCountQuery, [organizationId]);
    const teamCounts = teamCountResult.rows[0];

    // Get team type distribution
    const typeQuery = `
      SELECT type, COUNT(*) as count
      FROM teams
      WHERE organization_id = $1 AND is_active = true
      GROUP BY type
    `;

    const typeResult = await db.query(typeQuery, [organizationId]);
    const byType: Record<string, number> = {};
    typeResult.rows.forEach(row => {
      byType[row.type] = parseInt(row.count);
    });

    // Get average users per team
    const avgUsersQuery = `
      SELECT COALESCE(AVG(member_count), 0) as avg_users
      FROM (
        SELECT t.id, COUNT(tm.user_id) as member_count
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id
        WHERE t.organization_id = $1 AND t.is_active = true
        GROUP BY t.id
      ) team_members
    `;

    const avgUsersResult = await db.query(avgUsersQuery, [organizationId]).catch(() => ({
      rows: [{ avg_users: '0' }],
    }));
    const averageUsersPerTeam = parseFloat(avgUsersResult.rows[0].avg_users);

    // Get cross-functional teams count
    const crossFunctionalQuery = `
      SELECT COUNT(*) as count
      FROM teams
      WHERE organization_id = $1 AND type = 'cross_functional' AND is_active = true
    `;

    const crossFunctionalResult = await db.query(crossFunctionalQuery, [organizationId]);
    const crossFunctionalTeams = parseInt(crossFunctionalResult.rows[0].count);

    return {
      totalTeams: parseInt(teamCounts.total),
      activeTeams: parseInt(teamCounts.active),
      inactiveTeams: parseInt(teamCounts.inactive),
      byType: byType as Record<TeamType, number>,
      averageUsersPerTeam,
      crossFunctionalTeams,
    };
  }

  async getTeamsByDepartment(
    organizationId: string,
    departmentId: string,
    client?: PoolClient
  ): Promise<Team[]> {
    const db = client || this.db;
    const query = `
      SELECT * FROM teams 
      WHERE organization_id = $1 AND department_id = $2 AND is_active = true
      ORDER BY name ASC
    `;

    const result = await db.query(query, [organizationId, departmentId]);
    return result.rows.map(row => this.mapDbToTeam(row));
  }

  async validateTeamData(
    organizationId: string,
    teamData: CreateTeamRequest
  ): Promise<void> {
    // Validate required fields
    if (!teamData.name || teamData.name.trim().length === 0) {
      throw new ValidationError('Team name is required');
    }

    // Validate department exists if specified
    if (teamData.departmentId) {
      // TODO: Validate department exists in organization
      // This would require importing DepartmentModelClass or making a separate query
    }

    // Validate team lead exists if specified (placeholder - would need user validation)
    if (teamData.teamLeadId) {
      // TODO: Validate team lead exists in organization
    }
  }
}
