import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import {
  Organization,
  Department,
  Team,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  CreateTeamRequest,
  UpdateTeamRequest,
  OrganizationStats,
  DepartmentStats,
  TeamStats,
  BulkImportRequest,
  BulkExportRequest,
  OrganizationChart,
  OrganizationChartNode,
} from '../types/organization.types';
import { OrganizationModelClass } from '../models/organization.model';
import { DepartmentModelClass } from '../models/department.model';
import { TeamModelClass } from '../models/team.model';
import { ValidationError, NotFoundError } from '../../../shared/utils/errors.js';
import { Logger } from '../../../shared/utils/logger';

export class AdminOrganizationService {
  private db: Pool;
  private eventEmitter: EventEmitter;
  private logger: Logger;
  private organizationModel: OrganizationModelClass;
  private departmentModel: DepartmentModelClass;
  private teamModel: TeamModelClass;

  constructor(db: Pool, eventEmitter: EventEmitter, logger: Logger) {
    this.db = db;
    this.eventEmitter = eventEmitter;
    this.logger = logger;
    this.organizationModel = new OrganizationModelClass(db);
    this.departmentModel = new DepartmentModelClass(db);
    this.teamModel = new TeamModelClass(db);
  }

  private async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.db.connect();
    try {
      this.logger.info('Transaction BEGIN');
      await client.query('BEGIN');
      const result = await callback(client);
      this.logger.info('Transaction COMMIT');
      await client.query('COMMIT');
      this.logger.info('Transaction COMMITTED successfully');
      return result;
    } catch (error) {
      this.logger.error('Transaction ROLLBACK', error);
      await client.query('ROLLBACK');
      this.logger.error(`Transaction failed: ${(error as Error).message}`, error);
      throw error;
    } finally {
      if (client && typeof client.release === 'function') {
        this.logger.info('Releasing client connection');
        client.release();
      }
    }
  }

  // Organization Management
  async createOrganization(orgData: CreateOrganizationRequest): Promise<Organization> {
    this.logger.info('Creating new organization', { name: orgData.name, slug: orgData.slug });
    
    // Validate organization data
    await this.organizationModel.validateOrganizationData(orgData);

    return this.withTransaction(async (client) => {
      const organization = await this.organizationModel.createOrganization(orgData, client);
      
      this.eventEmitter.emit('admin:organization_created', {
        organization,
        createdBy: 'system', // TODO: Get from auth context
      });
      
      this.logger.info('Organization created successfully', { 
        organizationId: organization.id,
        name: organization.name 
      });
      
      return organization;
    });
  }

  async getOrganizationById(organizationId: string): Promise<Organization> {
    this.logger.debug('Fetching organization by ID', { organizationId });
    const organization = await this.organizationModel.getOrganizationById(organizationId);
    
    if (!organization) {
      throw new NotFoundError(`Organization with ID ${organizationId} not found`);
    }
    
    return organization;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization> {
    this.logger.debug('Fetching organization by slug', { slug });
    const organization = await this.organizationModel.getOrganizationBySlug(slug);
    
    if (!organization) {
      throw new NotFoundError(`Organization with slug ${slug} not found`);
    }
    
    return organization;
  }

  async getOrganizations(filters: {
    isActive?: boolean;
    status?: string;
    subscriptionPlan?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Organization[]> {
    this.logger.debug('Fetching organizations', { filters });
    return this.organizationModel.getOrganizations({
      ...filters,
      status: filters.status as any,
      subscriptionPlan: filters.subscriptionPlan as any,
    });
  }

  async updateOrganization(
    organizationId: string,
    updateData: UpdateOrganizationRequest
  ): Promise<Organization> {
    this.logger.info('Updating organization', { organizationId, updateData });
    
    return this.withTransaction(async (client) => {
      const existingOrg = await this.organizationModel.getOrganizationById(organizationId, client);
      if (!existingOrg) {
        throw new NotFoundError(`Organization with ID ${organizationId} not found`);
      }

      // Validate slug availability if slug is being updated
      if ((updateData as any).slug && (updateData as any).slug !== existingOrg.slug) {
        const isAvailable = await this.organizationModel.checkSlugAvailability(
          (updateData as any).slug,
          organizationId,
          client
        );
        if (!isAvailable) {
          throw new ValidationError('Organization slug is already taken');
        }
      }

      const updatedOrganization = await this.organizationModel.updateOrganization(
        organizationId,
        updateData,
        client
      );
      
      this.eventEmitter.emit('admin:organization_updated', {
        oldOrganization: existingOrg,
        newOrganization: updatedOrganization,
        updatedBy: 'system', // TODO: Get from auth context
      });
      
      this.logger.info('Organization updated successfully', { 
        organizationId: updatedOrganization.id,
        name: updatedOrganization.name 
      });
      
      return updatedOrganization;
    });
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    this.logger.warn('Deleting organization', { organizationId });
    
    try {
      return await this.withTransaction(async (client) => {
        this.logger.info('Starting delete transaction', { organizationId });
        
        const existingOrg = await this.organizationModel.getOrganizationById(organizationId, client);
        if (!existingOrg) {
          this.logger.error('Organization not found', { organizationId });
          throw new NotFoundError(`Organization with ID ${organizationId} not found`);
        }
        this.logger.info('Organization found', { organizationId, name: existingOrg.name });

        // Check if organization has departments
        this.logger.info('Checking departments', { organizationId });
        const departments = await this.departmentModel.getDepartments(organizationId, {}, client);
        this.logger.info('Departments found', { organizationId, departmentCount: departments.length });
        if (departments.length > 0) {
          this.logger.warn('Cannot delete organization with departments', { organizationId, departmentCount: departments.length });
          throw new ValidationError('Cannot delete organization with departments');
        }

        // Check if organization has teams
        this.logger.info('Checking teams', { organizationId });
        const teams = await this.teamModel.getTeams(organizationId, {}, client);
        this.logger.info('Teams found', { organizationId, teamCount: teams.length });
        if (teams.length > 0) {
          this.logger.warn('Cannot delete organization with teams', { organizationId, teamCount: teams.length });
          throw new ValidationError('Cannot delete organization with teams');
        }

        this.logger.info('Proceeding with delete', { organizationId });
        await this.organizationModel.deleteOrganization(organizationId, client);
        this.logger.info('Delete query executed', { organizationId });
        
        this.eventEmitter.emit('admin:organization_deleted', {
          organization: existingOrg,
          deletedBy: 'system', // TODO: Get from auth context
        });
        
        this.logger.warn('Organization deleted successfully', { 
          organizationId: existingOrg.id,
          name: existingOrg.name 
        });
      });
    } catch (error) {
      this.logger.error('Delete organization failed', { organizationId, error: error.message, stack: error.stack });
      throw error;
    }
  }

  async searchOrganizations(
    searchTerm: string,
    filters: {
      isActive?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Organization[]> {
    this.logger.debug('Searching organizations', { searchTerm, filters });
    return this.organizationModel.searchOrganizations(searchTerm, filters);
  }

  async getOrganizationStats(): Promise<OrganizationStats> {
    this.logger.debug('Fetching organization statistics');
    return this.organizationModel.getOrganizationStats();
  }

  async checkSlugAvailability(slug: string, excludeOrganizationId?: string): Promise<boolean> {
    this.logger.debug('Checking slug availability', { slug, excludeOrganizationId });
    return this.organizationModel.checkSlugAvailability(slug, excludeOrganizationId);
  }

  // Department Management
  async createDepartment(
    organizationId: string,
    deptData: CreateDepartmentRequest
  ): Promise<Department> {
    this.logger.info('Creating new department', { 
      organizationId, 
      name: deptData.name, 
      type: deptData.type 
    });
    
    // Validate organization exists
    await this.getOrganizationById(organizationId);
    
    // Validate department data
    await this.departmentModel.validateDepartmentData(organizationId, deptData);

    return this.withTransaction(async (client) => {
      const department = await this.departmentModel.createDepartment(
        organizationId,
        deptData,
        client
      );
      
      this.eventEmitter.emit('admin:department_created', {
        organizationId,
        department,
        createdBy: 'system', // TODO: Get from auth context
      });
      
      this.logger.info('Department created successfully', { 
        organizationId,
        departmentId: department.id,
        name: department.name 
      });
      
      return department;
    });
  }

  async getDepartmentById(
    organizationId: string,
    departmentId: string
  ): Promise<Department> {
    this.logger.debug('Fetching department by ID', { organizationId, departmentId });
    const department = await this.departmentModel.getDepartmentById(
      departmentId,
      organizationId
    );
    
    if (!department) {
      throw new NotFoundError(`Department with ID ${departmentId} not found`);
    }
    
    return department;
  }

  async getDepartments(
    organizationId: string,
    filters: {
      isActive?: boolean;
      type?: string;
      parentDepartmentId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Department[]> {
    this.logger.debug('Fetching departments', { organizationId, filters });
    return this.departmentModel.getDepartments(organizationId, {
      ...filters,
      type: filters.type as any,
    });
  }

  async updateDepartment(
    organizationId: string,
    departmentId: string,
    updateData: UpdateDepartmentRequest
  ): Promise<Department> {
    this.logger.info('Updating department', { organizationId, departmentId, updateData });
    
    return this.withTransaction(async (client) => {
      const existingDept = await this.departmentModel.getDepartmentById(
        departmentId,
        organizationId,
        client
      );
      if (!existingDept) {
        throw new NotFoundError(`Department with ID ${departmentId} not found`);
      }

      const updatedDepartment = await this.departmentModel.updateDepartment(
        departmentId,
        organizationId,
        updateData,
        client
      );
      
      this.eventEmitter.emit('admin:department_updated', {
        organizationId,
        oldDepartment: existingDept,
        newDepartment: updatedDepartment,
        updatedBy: 'system', // TODO: Get from auth context
      });
      
      this.logger.info('Department updated successfully', { 
        organizationId,
        departmentId: updatedDepartment.id,
        name: updatedDepartment.name 
      });
      
      return updatedDepartment;
    });
  }

  async deleteDepartment(organizationId: string, departmentId: string): Promise<void> {
    this.logger.warn('Deleting department', { organizationId, departmentId });
    
    return this.withTransaction(async (client) => {
      const existingDept = await this.departmentModel.getDepartmentById(
        departmentId,
        organizationId,
        client
      );
      if (!existingDept) {
        throw new NotFoundError(`Department with ID ${departmentId} not found`);
      }

      await this.departmentModel.deleteDepartment(departmentId, organizationId, client);
      
      this.eventEmitter.emit('admin:department_deleted', {
        organizationId,
        department: existingDept,
        deletedBy: 'system', // TODO: Get from auth context
      });
      
      this.logger.warn('Department deleted successfully', { 
        organizationId,
        departmentId: existingDept.id,
        name: existingDept.name 
      });
    });
  }

  async getDepartmentStats(organizationId: string): Promise<DepartmentStats> {
    this.logger.debug('Fetching department statistics', { organizationId });
    return this.departmentModel.getDepartmentStats(organizationId);
  }

  async getDepartmentHierarchy(organizationId: string): Promise<Department[]> {
    this.logger.debug('Fetching department hierarchy', { organizationId });
    return this.departmentModel.getDepartmentHierarchy(organizationId);
  }

  // Team Management
  async createTeam(
    organizationId: string,
    teamData: CreateTeamRequest
  ): Promise<Team> {
    this.logger.info('Creating new team', { 
      organizationId, 
      name: teamData.name, 
      type: teamData.type 
    });
    
    // Validate organization exists
    await this.getOrganizationById(organizationId);
    
    // Validate team data
    await this.teamModel.validateTeamData(organizationId, teamData);

    return this.withTransaction(async (client) => {
      const team = await this.teamModel.createTeam(organizationId, teamData, client);
      
      this.eventEmitter.emit('admin:team_created', {
        organizationId,
        team,
        createdBy: 'system', // TODO: Get from auth context
      });
      
      this.logger.info('Team created successfully', { 
        organizationId,
        teamId: team.id,
        name: team.name 
      });
      
      return team;
    });
  }

  async getTeamById(organizationId: string, teamId: string): Promise<Team> {
    this.logger.debug('Fetching team by ID', { organizationId, teamId });
    const team = await this.teamModel.getTeamById(teamId, organizationId);
    
    if (!team) {
      throw new NotFoundError(`Team with ID ${teamId} not found`);
    }
    
    return team;
  }

  async getTeams(
    organizationId: string,
    filters: {
      isActive?: boolean;
      type?: string;
      departmentId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Team[]> {
    this.logger.debug('Fetching teams', { organizationId, filters });
    return this.teamModel.getTeams(organizationId, {
      ...filters,
      type: filters.type as any,
    });
  }

  async updateTeam(
    organizationId: string,
    teamId: string,
    updateData: UpdateTeamRequest
  ): Promise<Team> {
    this.logger.info('Updating team', { organizationId, teamId, updateData });
    
    return this.withTransaction(async (client) => {
      const existingTeam = await this.teamModel.getTeamById(teamId, organizationId, client);
      if (!existingTeam) {
        throw new NotFoundError(`Team with ID ${teamId} not found`);
      }

      const updatedTeam = await this.teamModel.updateTeam(
        teamId,
        organizationId,
        updateData,
        client
      );
      
      this.eventEmitter.emit('admin:team_updated', {
        organizationId,
        oldTeam: existingTeam,
        newTeam: updatedTeam,
        updatedBy: 'system', // TODO: Get from auth context
      });
      
      this.logger.info('Team updated successfully', { 
        organizationId,
        teamId: updatedTeam.id,
        name: updatedTeam.name 
      });
      
      return updatedTeam;
    });
  }

  async deleteTeam(organizationId: string, teamId: string): Promise<void> {
    this.logger.warn('Deleting team', { organizationId, teamId });
    
    return this.withTransaction(async (client) => {
      const existingTeam = await this.teamModel.getTeamById(teamId, organizationId, client);
      if (!existingTeam) {
        throw new NotFoundError(`Team with ID ${teamId} not found`);
      }

      await this.teamModel.deleteTeam(teamId, organizationId, client);
      
      this.eventEmitter.emit('admin:team_deleted', {
        organizationId,
        team: existingTeam,
        deletedBy: 'system', // TODO: Get from auth context
      });
      
      this.logger.warn('Team deleted successfully', { 
        organizationId,
        teamId: existingTeam.id,
        name: existingTeam.name 
      });
    });
  }

  async getTeamStats(organizationId: string): Promise<TeamStats> {
    this.logger.debug('Fetching team statistics', { organizationId });
    return this.teamModel.getTeamStats(organizationId);
  }

  async getTeamsByDepartment(organizationId: string, departmentId: string): Promise<Team[]> {
    this.logger.debug('Fetching teams by department', { organizationId, departmentId });
    return this.teamModel.getTeamsByDepartment(organizationId, departmentId);
  }

  // Bulk Operations
  async bulkImport(request: BulkImportRequest): Promise<{
    success: boolean;
    message: string;
    results: {
      total: number;
      successful: number;
      failed: number;
      errors: Array<{ row: number; error: string }>;
    };
  }> {
    this.logger.info('Starting bulk import', { 
      type: request.type, 
      count: request.data.length,
      options: request.options 
    });

    const results = {
      total: request.data.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    if (request.options.dryRun) {
      this.logger.info('Dry run mode - validating data only');
      // TODO: Implement dry run validation
      return {
        success: true,
        message: 'Dry run completed successfully',
        results,
      };
    }

    return this.withTransaction(async (client) => {
      for (let i = 0; i < request.data.length; i++) {
        try {
          const item = request.data[i];
          
          switch (request.type) {
            case 'organizations':
              await this.organizationModel.createOrganization(item, client);
              break;
            case 'departments':
              await this.departmentModel.createDepartment(item.organizationId, item, client);
              break;
            case 'teams':
              await this.teamModel.createTeam(item.organizationId, item, client);
              break;
            default:
              throw new ValidationError(`Unsupported import type: ${request.type}`);
          }
          
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            error: (error as Error).message,
          });
          
          if (!request.options.skipValidation) {
            throw error; // Stop on first error if validation is not skipped
          }
        }
      }

      this.eventEmitter.emit('admin:bulk_import_completed', {
        type: request.type,
        results,
        importedBy: 'system', // TODO: Get from auth context
      });

      this.logger.info('Bulk import completed', { 
        type: request.type,
        results 
      });

      return {
        success: results.failed === 0,
        message: `Import completed: ${results.successful} successful, ${results.failed} failed`,
        results,
      };
    });
  }

  async bulkExport(request: BulkExportRequest): Promise<{
    success: boolean;
    message: string;
    data: any[];
    format: string;
  }> {
    this.logger.info('Starting bulk export', { 
      type: request.type, 
      format: request.format,
      filters: request.filters 
    });

    let data: any[] = [];

    switch (request.type) {
      case 'organizations':
        data = await this.organizationModel.getOrganizations(request.filters);
        break;
      case 'departments':
        if (!request.filters?.organizationId) {
          throw new ValidationError('Organization ID is required for department export');
        }
        data = await this.departmentModel.getDepartments(request.filters.organizationId, request.filters);
        break;
      case 'teams':
        if (!request.filters?.organizationId) {
          throw new ValidationError('Organization ID is required for team export');
        }
        data = await this.teamModel.getTeams(request.filters.organizationId, request.filters);
        break;
      default:
        throw new ValidationError(`Unsupported export type: ${request.type}`);
    }

    this.eventEmitter.emit('admin:bulk_export_completed', {
      type: request.type,
      format: request.format,
      recordCount: data.length,
      exportedBy: 'system', // TODO: Get from auth context
    });

    this.logger.info('Bulk export completed', { 
      type: request.type,
      format: request.format,
      recordCount: data.length 
    });

    return {
      success: true,
      message: `Export completed: ${data.length} records`,
      data,
      format: request.format,
    };
  }

  // Organization Chart Management
  async generateOrganizationChart(organizationId: string): Promise<OrganizationChart> {
    this.logger.info('Generating organization chart', { organizationId });
    
    // Validate organization exists
    await this.getOrganizationById(organizationId);
    
    // Get departments and teams
    const departments = await this.departmentModel.getDepartmentHierarchy(organizationId);
    const teams = await this.teamModel.getTeams(organizationId, { isActive: true });
    
    // Build organization chart structure
    const chartNode: OrganizationChartNode = {
      id: organizationId,
      type: 'organization',
      name: 'Organization',
      children: [],
      metadata: { level: 0 },
    };

    // Add departments to chart
    const deptMap = new Map<string, OrganizationChartNode>();
    
    // First pass: create department nodes
    departments.forEach(dept => {
      const deptNode: OrganizationChartNode = {
        id: dept.id,
        type: 'department',
        name: dept.name,
        children: [],
        metadata: {
          departmentId: dept.id,
          level: 1,
        },
      };
      deptMap.set(dept.id, deptNode);
    });

    // Second pass: build hierarchy
    departments.forEach(dept => {
      const deptNode = deptMap.get(dept.id)!;
      
      if (dept.parentDepartmentId) {
        const parentNode = deptMap.get(dept.parentDepartmentId);
        if (parentNode) {
          parentNode.children.push(deptNode);
        }
      } else {
        chartNode.children.push(deptNode);
      }
    });

    // Add teams to departments
    teams.forEach(team => {
      const teamNode: OrganizationChartNode = {
        id: team.id,
        type: 'team',
        name: team.name,
        children: [],
        metadata: {
          teamId: team.id,
          level: 2,
        },
      };

      if (team.departmentId) {
        const deptNode = deptMap.get(team.departmentId);
        if (deptNode) {
          deptNode.children.push(teamNode);
        }
      } else {
        chartNode.children.push(teamNode);
      }
    });

    const chart: OrganizationChart = {
      id: `chart_${organizationId}_${Date.now()}`,
      organizationId,
      version: 1,
      structure: chartNode,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.eventEmitter.emit('admin:organization_chart_generated', {
      organizationId,
      chart,
      generatedBy: 'system', // TODO: Get from auth context
    });

    this.logger.info('Organization chart generated successfully', { 
      organizationId,
      chartId: chart.id 
    });

    return chart;
  }
}