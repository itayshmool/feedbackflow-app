// backend/src/modules/analytics/services/dashboard.service.ts

import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import { 
  Dashboard, 
  DashboardModel, 
  CreateDashboardRequest, 
  CreateWidgetRequest,
  DashboardResponse,
  WidgetType,
  WidgetSize
} from '../types/analytics.types';
import { DashboardModelClass } from '../models/dashboard.model';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../shared/utils/errors';
import { Logger } from '../../../shared/utils/logger';

export class DashboardService {
  private dashboardModel: DashboardModelClass;
  private eventEmitter: EventEmitter;
  private logger: Logger;

  constructor(
    private db: Pool,
    eventEmitter: EventEmitter,
    logger: Logger
  ) {
    this.dashboardModel = new DashboardModelClass(db);
    this.eventEmitter = eventEmitter;
    this.logger = logger;
  }

  async createDashboard(
    organizationId: string,
    request: CreateDashboardRequest,
    createdBy: string
  ): Promise<Dashboard> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validate widgets if provided
      if (request.widgets && request.widgets.length > 0) {
        this.validateWidgets(request.widgets);
      }
      
      // Create dashboard
      const dashboardData: Omit<DashboardModel, 'id' | 'created_at' | 'updated_at'> = {
        organization_id: organizationId,
        name: request.name,
        description: request.description,
        is_default: false,
        is_public: request.isPublic || false,
        widgets: JSON.stringify(request.widgets || []),
        layout: JSON.stringify(request.layout || this.getDefaultLayout()),
        filters: JSON.stringify(request.filters || {}),
        created_by: createdBy
      };
      
      const dashboard = await this.dashboardModel.create(dashboardData, client);
      
      await client.query('COMMIT');
      
      const completeDashboard = await this.buildCompleteDashboard(dashboard);
      
      // Emit dashboard created event
      this.eventEmitter.emit('dashboard:created', {
        dashboard: completeDashboard,
        organizationId,
        createdBy
      });
      
      this.logger.info('Dashboard created', { 
        dashboardId: dashboard.id, 
        organizationId, 
        createdBy 
      });
      
      return completeDashboard;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating dashboard', { error, organizationId, request });
      throw error;
    } finally {
      client.release();
    }
  }

  async getDashboardById(id: string, requestingUserId?: string): Promise<Dashboard> {
    const dashboard = await this.dashboardModel.findById(id);
    
    if (!dashboard) {
      throw new NotFoundError('Dashboard not found');
    }
    
    // TODO: Check if user has permission to view this dashboard
    // if (requestingUserId && !this.hasViewPermission(dashboard, requestingUserId)) {
    //   throw new ForbiddenError('Insufficient permission to view this dashboard');
    // }
    
    return this.buildCompleteDashboard(dashboard);
  }

  async getDashboards(
    organizationId: string,
    requestingUserId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<DashboardResponse> {
    const { dashboards, total } = await this.dashboardModel.findByOrganization(organizationId, page, limit);
    
    const completeDashboards = await Promise.all(
      dashboards.map(dashboard => this.buildCompleteDashboard(dashboard))
    );
    
    return {
      dashboards: completeDashboards,
      total,
      page,
      limit,
      hasNext: page * limit < total,
      hasPrev: page > 1
    };
  }

  async getPublicDashboards(organizationId: string): Promise<Dashboard[]> {
    const dashboards = await this.dashboardModel.findPublicDashboards(organizationId);
    
    return Promise.all(
      dashboards.map(dashboard => this.buildCompleteDashboard(dashboard))
    );
  }

  async getDefaultDashboard(organizationId: string): Promise<Dashboard | null> {
    const dashboard = await this.dashboardModel.findDefaultDashboard(organizationId);
    
    if (!dashboard) {
      return null;
    }
    
    return this.buildCompleteDashboard(dashboard);
  }

  async updateDashboard(
    id: string,
    updates: Partial<CreateDashboardRequest>,
    requestingUserId: string
  ): Promise<Dashboard> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const existingDashboard = await this.dashboardModel.findById(id, client);
      if (!existingDashboard) {
        throw new NotFoundError('Dashboard not found');
      }
      
      // TODO: Check if user has permission to update
      // if (!this.hasUpdatePermission(existingDashboard, requestingUserId)) {
      //   throw new ForbiddenError('Insufficient permission to update this dashboard');
      // }
      
      // Validate widgets if being updated
      if (updates.widgets && updates.widgets.length > 0) {
        this.validateWidgets(updates.widgets);
      }
      
      // Update dashboard
      const updateData: Partial<DashboardModel> = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;
      if (updates.widgets) updateData.widgets = JSON.stringify(updates.widgets);
      if (updates.layout) updateData.layout = JSON.stringify(updates.layout);
      if (updates.filters) updateData.filters = JSON.stringify(updates.filters);
      
      const updatedDashboard = await this.dashboardModel.update(id, updateData, client);
      
      if (!updatedDashboard) {
        throw new Error('Failed to update dashboard');
      }
      
      await client.query('COMMIT');
      
      const completeDashboard = await this.getDashboardById(id);
      
      // Emit dashboard updated event
      this.eventEmitter.emit('dashboard:updated', {
        dashboard: completeDashboard,
        updatedBy: requestingUserId,
        changes: updates
      });
      
      this.logger.info('Dashboard updated', { 
        dashboardId: id, 
        updatedBy: requestingUserId 
      });
      
      return completeDashboard;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating dashboard', { error, dashboardId: id, requestingUserId });
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteDashboard(id: string, requestingUserId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const dashboard = await this.dashboardModel.findById(id, client);
      if (!dashboard) {
        throw new NotFoundError('Dashboard not found');
      }
      
      // TODO: Check permissions
      // if (!this.hasDeletePermission(dashboard, requestingUserId)) {
      //   throw new ForbiddenError('Insufficient permission to delete this dashboard');
      // }
      
      // Check if it's the default dashboard
      if (dashboard.is_default) {
        throw new ValidationError('Cannot delete default dashboard');
      }
      
      // Delete dashboard
      const deleted = await this.dashboardModel.delete(id, client);
      
      if (!deleted) {
        throw new Error('Failed to delete dashboard');
      }
      
      await client.query('COMMIT');
      
      // Emit dashboard deleted event
      this.eventEmitter.emit('dashboard:deleted', {
        dashboardId: id,
        deletedBy: requestingUserId,
        dashboard
      });
      
      this.logger.info('Dashboard deleted', { 
        dashboardId: id, 
        deletedBy: requestingUserId 
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error deleting dashboard', { error, dashboardId: id, requestingUserId });
      throw error;
    } finally {
      client.release();
    }
  }

  async setAsDefault(id: string, organizationId: string, requestingUserId: string): Promise<Dashboard> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const dashboard = await this.dashboardModel.findById(id, client);
      if (!dashboard) {
        throw new NotFoundError('Dashboard not found');
      }
      
      // TODO: Check permissions
      // if (!this.hasUpdatePermission(dashboard, requestingUserId)) {
      //   throw new ForbiddenError('Insufficient permission to set this dashboard as default');
      // }
      
      // Set as default
      const set = await this.dashboardModel.setAsDefault(id, organizationId, client);
      
      if (!set) {
        throw new Error('Failed to set dashboard as default');
      }
      
      await client.query('COMMIT');
      
      const completeDashboard = await this.getDashboardById(id);
      
      this.logger.info('Dashboard set as default', { 
        dashboardId: id, 
        organizationId,
        setBy: requestingUserId 
      });
      
      return completeDashboard;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error setting dashboard as default', { error, dashboardId: id, requestingUserId });
      throw error;
    } finally {
      client.release();
    }
  }

  async duplicateDashboard(
    id: string,
    newName: string,
    createdBy: string
  ): Promise<Dashboard> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const originalDashboard = await this.dashboardModel.findById(id, client);
      if (!originalDashboard) {
        throw new NotFoundError('Dashboard not found');
      }
      
      // Duplicate dashboard
      const duplicated = await this.dashboardModel.duplicate(id, newName, createdBy, client);
      
      if (!duplicated) {
        throw new Error('Failed to duplicate dashboard');
      }
      
      await client.query('COMMIT');
      
      const completeDashboard = await this.buildCompleteDashboard(duplicated);
      
      // Emit dashboard duplicated event
      this.eventEmitter.emit('dashboard:duplicated', {
        originalDashboardId: id,
        newDashboard: completeDashboard,
        duplicatedBy: createdBy
      });
      
      this.logger.info('Dashboard duplicated', { 
        originalDashboardId: id,
        newDashboardId: duplicated.id,
        duplicatedBy: createdBy 
      });
      
      return completeDashboard;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error duplicating dashboard', { error, dashboardId: id, createdBy });
      throw error;
    } finally {
      client.release();
    }
  }

  // Private helper methods
  private async buildCompleteDashboard(dashboard: DashboardModel): Promise<Dashboard> {
    return {
      id: dashboard.id,
      organizationId: dashboard.organization_id,
      name: dashboard.name,
      description: dashboard.description,
      isDefault: dashboard.is_default,
      isPublic: dashboard.is_public,
      widgets: JSON.parse(dashboard.widgets),
      layout: JSON.parse(dashboard.layout),
      filters: JSON.parse(dashboard.filters),
      createdBy: dashboard.created_by,
      createdAt: dashboard.created_at,
      updatedAt: dashboard.updated_at
    };
  }

  private validateWidgets(widgets: CreateWidgetRequest[]): void {
    for (const widget of widgets) {
      this.validateWidget(widget);
    }
  }

  private validateWidget(widget: CreateWidgetRequest): void {
    if (!Object.values(WidgetType).includes(widget.type)) {
      throw new ValidationError(`Invalid widget type: ${widget.type}`);
    }
    
    if (!Object.values(WidgetSize).includes(widget.size)) {
      throw new ValidationError(`Invalid widget size: ${widget.size}`);
    }
    
    if (!widget.title || widget.title.trim().length === 0) {
      throw new ValidationError('Widget title is required');
    }
    
    if (!widget.dataSource || widget.dataSource.trim().length === 0) {
      throw new ValidationError('Widget data source is required');
    }
  }

  private getDefaultLayout() {
    return {
      columns: 12,
      rows: 8,
      gap: 16
    };
  }
}
