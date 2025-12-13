// backend/src/modules/cycles/services/cycle.service.ts

import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import { 
  Cycle, 
  CycleModel, 
  CreateCycleRequest, 
  UpdateCycleRequest, 
  CycleFilters, 
  CycleListResponse, 
  CycleSummary,
  CycleStatus,
  CycleSettings,
  ParticipantStatus
} from '../types/cycle.types';
import { CycleModelClass } from '../models/cycle.model';
import { CycleParticipantModelClass } from '../models/cycle-participant.model';
import { CycleTemplateModelClass } from '../models/cycle-template.model';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../shared/utils/errors';
import { Logger } from '../../../shared/utils/logger';

export class CycleService {
  private cycleModel: CycleModelClass;
  private participantModel: CycleParticipantModelClass;
  private templateModel: CycleTemplateModelClass;
  private eventEmitter: EventEmitter;
  private logger: Logger;

  constructor(
    private db: Pool,
    eventEmitter: EventEmitter,
    logger: Logger
  ) {
    this.cycleModel = new CycleModelClass(db);
    this.participantModel = new CycleParticipantModelClass(db);
    this.templateModel = new CycleTemplateModelClass(db);
    this.eventEmitter = eventEmitter;
    this.logger = logger;
  }

  async createCycle(
    organizationId: string,
    request: CreateCycleRequest,
    createdBy: string
  ): Promise<Cycle> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validate cycle dates
      this.validateCycleDates(request.startDate, request.endDate);
      
      // Get default settings from template if provided
      let settings = request.settings || this.getDefaultSettings();
      if (request.templateId) {
        const template = await this.templateModel.findById(request.templateId, client);
        if (template) {
          settings = { ...settings, ...JSON.parse(template.settings) };
        }
      }
      
      // Create cycle
      const cycleData: Omit<CycleModel, 'id' | 'created_at' | 'updated_at'> = {
        name: request.name,
        description: request.description,
        organization_id: organizationId,
        start_date: new Date(request.startDate),
        end_date: new Date(request.endDate),
        status: CycleStatus.DRAFT,
        type: request.type,
        template_id: request.templateId,
        settings: JSON.stringify(settings),
        created_by: createdBy
      };
      
      const cycle = await this.cycleModel.create(cycleData, client);
      
      // Add participants if provided
      if (request.participants && request.participants.length > 0) {
        for (const participantReq of request.participants) {
          await this.participantModel.create({
            cycle_id: cycle.id,
            user_id: participantReq.userId,
            role: participantReq.role,
            assigned_by: createdBy,
            status: ParticipantStatus.PENDING,
            metadata: participantReq.metadata ? JSON.stringify(participantReq.metadata) : undefined
          }, client);
        }
      }
      
      await client.query('COMMIT');
      
      const completeCycle = await this.getCycleById(cycle.id);
      
      // Emit cycle created event
      this.eventEmitter.emit('cycle:created', {
        cycle: completeCycle,
        organizationId,
        createdBy
      });
      
      this.logger.info('Cycle created', { 
        cycleId: cycle.id, 
        organizationId, 
        createdBy 
      });
      
      return completeCycle;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating cycle', { error, organizationId, createdBy });
      throw error;
    } finally {
      client.release();
    }
  }

  async getCycleById(id: string, requestingUserId?: string): Promise<Cycle> {
    const cycle = await this.cycleModel.findById(id);
    
    if (!cycle) {
      throw new NotFoundError('Cycle not found');
    }
    
    // Check if user has permission to view this cycle
    if (requestingUserId && !this.hasViewPermission(cycle, requestingUserId)) {
      throw new ForbiddenError('Insufficient permission to view this cycle');
    }
    
    return this.buildCompleteCycle(cycle);
  }

  async getCycleList(
    organizationId: string,
    filters: CycleFilters,
    requestingUserId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<CycleListResponse> {
    // Apply organization filter
    const userFilters = { ...filters, organizationId };
    
    const { cycles, total } = await this.cycleModel.findWithFilters(userFilters, page, limit);
    
    const completeCycles = await Promise.all(
      cycles.map(cycle => this.buildCompleteCycle(cycle))
    );
    
    return {
      cycles: completeCycles,
      total,
      page,
      limit,
      hasNext: page * limit < total,
      hasPrev: page > 1
    };
  }

  async updateCycle(
    id: string,
    updates: UpdateCycleRequest,
    requestingUserId: string
  ): Promise<Cycle> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const existingCycle = await this.cycleModel.findById(id, client);
      if (!existingCycle) {
        throw new NotFoundError('Cycle not found');
      }
      
      // Check if user has permission to update
      if (!this.hasUpdatePermission(existingCycle, requestingUserId)) {
        throw new ForbiddenError('Insufficient permission to update this cycle');
      }
      
      // Check if cycle can be updated
      if (existingCycle.status === CycleStatus.CLOSED || 
          existingCycle.status === CycleStatus.ARCHIVED) {
        throw new ValidationError('Cannot update closed or archived cycle');
      }
      
      // Validate dates if provided
      if (updates.startDate || updates.endDate) {
        const startDate = updates.startDate || existingCycle.start_date.toISOString();
        const endDate = updates.endDate || existingCycle.end_date.toISOString();
        this.validateCycleDates(startDate, endDate);
      }
      
      // Update cycle
      const updateData: Partial<CycleModel> = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.startDate) updateData.start_date = new Date(updates.startDate);
      if (updates.endDate) updateData.end_date = new Date(updates.endDate);
      if (updates.status) updateData.status = updates.status;
      if (updates.settings) {
        const currentSettings = JSON.parse(existingCycle.settings);
        updateData.settings = JSON.stringify({ ...currentSettings, ...updates.settings });
      }
      
      const updatedCycle = await this.cycleModel.update(id, updateData, client);
      
      if (!updatedCycle) {
        throw new Error('Failed to update cycle');
      }
      
      await client.query('COMMIT');
      
      const completeCycle = await this.getCycleById(id);
      
      // Emit cycle updated event
      this.eventEmitter.emit('cycle:updated', {
        cycle: completeCycle,
        updatedBy: requestingUserId,
        changes: updates
      });
      
      this.logger.info('Cycle updated', { 
        cycleId: id, 
        updatedBy: requestingUserId 
      });
      
      return completeCycle;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating cycle', { error, cycleId: id, requestingUserId });
      throw error;
    } finally {
      client.release();
    }
  }

  async activateCycle(id: string, requestingUserId: string): Promise<Cycle> {
    const cycle = await this.getCycleById(id, requestingUserId);
    
    if (cycle.status !== CycleStatus.DRAFT) {
      throw new ValidationError('Only draft cycles can be activated');
    }
    
    return this.updateCycle(id, { status: CycleStatus.ACTIVE }, requestingUserId);
  }

  async closeCycle(id: string, requestingUserId: string): Promise<Cycle> {
    const cycle = await this.getCycleById(id, requestingUserId);
    
    if (cycle.status !== CycleStatus.ACTIVE && cycle.status !== CycleStatus.IN_PROGRESS) {
      throw new ValidationError('Only active or in-progress cycles can be closed');
    }
    
    return this.updateCycle(id, { status: CycleStatus.CLOSED }, requestingUserId);
  }

  async deleteCycle(id: string, requestingUserId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const cycle = await this.cycleModel.findById(id, client);
      if (!cycle) {
        throw new NotFoundError('Cycle not found');
      }
      
      // Check permissions
      if (!this.hasDeletePermission(cycle, requestingUserId)) {
        throw new ForbiddenError('Insufficient permission to delete this cycle');
      }
      
      // Check if cycle can be deleted
      if (cycle.status === CycleStatus.ACTIVE || cycle.status === CycleStatus.IN_PROGRESS) {
        throw new ValidationError('Cannot delete active or in-progress cycles');
      }
      
      // Delete participants first
      await this.participantModel.deleteByCycleId(id, client);
      
      // Delete cycle
      const deleted = await this.cycleModel.delete(id, client);
      
      if (!deleted) {
        throw new Error('Failed to delete cycle');
      }
      
      await client.query('COMMIT');
      
      // Emit cycle deleted event
      this.eventEmitter.emit('cycle:deleted', {
        cycleId: id,
        deletedBy: requestingUserId,
        cycle
      });
      
      this.logger.info('Cycle deleted', { 
        cycleId: id, 
        deletedBy: requestingUserId 
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error deleting cycle', { error, cycleId: id, requestingUserId });
      throw error;
    } finally {
      client.release();
    }
  }

  async getCycleSummary(organizationId: string): Promise<CycleSummary> {
    const stats = await this.cycleModel.getStatsByOrganization(organizationId);
    const activeCycles = await this.cycleModel.getActiveCycles(organizationId);
    
    // Calculate completion rate
    const totalParticipants = activeCycles.reduce((sum, cycle) => {
      // This would need to be calculated from actual participant data
      return sum + 0; // Placeholder
    }, 0);
    
    return {
      totalCycles: stats.totalCycles || 0,
      activeCycles: stats.activeCycles || 0,
      completedCycles: stats.completedCycles || 0,
      totalParticipants,
      completionRate: 0 // Placeholder
    };
  }

  // Participant management methods
  async getCycleParticipants(cycleId: string): Promise<any[]> {
    const participants = await this.participantModel.findByCycleId(cycleId);
    return participants.map(p => ({
      id: p.id,
      cycleId: p.cycle_id,
      userId: p.user_id,
      role: p.role,
      assignedBy: p.assigned_by,
      assignedAt: p.assigned_at,
      status: p.status,
      metadata: p.metadata ? JSON.parse(p.metadata) : undefined
    }));
  }

  async addCycleParticipants(
    cycleId: string,
    participants: any[],
    assignedBy: string
  ): Promise<any[]> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if cycle exists
      const cycle = await this.cycleModel.findById(cycleId, client);
      if (!cycle) {
        throw new NotFoundError('Cycle not found');
      }
      
      const added = [];
      for (const participant of participants) {
        const created = await this.participantModel.create({
          cycle_id: cycleId,
          user_id: participant.userId,
          role: participant.role || 'employee',
          assigned_by: assignedBy,
          status: ParticipantStatus.ACTIVE,
          metadata: participant.metadata ? JSON.stringify(participant.metadata) : undefined
        }, client);
        
        added.push({
          id: created.id,
          cycleId: created.cycle_id,
          userId: created.user_id,
          role: created.role,
          assignedBy: created.assigned_by,
          assignedAt: created.assigned_at,
          status: created.status,
          metadata: created.metadata ? JSON.parse(created.metadata) : undefined
        });
      }
      
      await client.query('COMMIT');
      
      this.logger.info('Participants added to cycle', { cycleId, count: added.length });
      
      return added;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error adding cycle participants', { error, cycleId });
      throw error;
    } finally {
      client.release();
    }
  }

  async removeCycleParticipant(
    cycleId: string,
    participantId: string,
    requestingUserId: string
  ): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if cycle exists
      const cycle = await this.cycleModel.findById(cycleId, client);
      if (!cycle) {
        throw new NotFoundError('Cycle not found');
      }
      
      // Check permissions (cycle creator or admin/HR can remove participants)
      if (!this.hasUpdatePermission(cycle, requestingUserId)) {
        throw new ForbiddenError('Insufficient permission to remove participants');
      }
      
      // Remove participant
      const deleted = await this.participantModel.delete(participantId, client);
      
      if (!deleted) {
        throw new NotFoundError('Participant not found');
      }
      
      await client.query('COMMIT');
      
      this.logger.info('Participant removed from cycle', { cycleId, participantId });
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error removing cycle participant', { error, cycleId, participantId });
      throw error;
    } finally {
      client.release();
    }
  }

  // Validation methods for feedback integration
  async validateCyclePermission(
    cycleId: string,
    fromUserId: string,
    toUserId: string
  ): Promise<boolean> {
    const cycle = await this.cycleModel.findById(cycleId);
    
    if (!cycle) {
      throw new NotFoundError('Cycle not found');
    }
    
    if (cycle.status !== CycleStatus.ACTIVE && cycle.status !== CycleStatus.IN_PROGRESS) {
      throw new ValidationError('Cycle is not active');
    }
    
    // Check if both users are participants
    const fromParticipant = await this.participantModel.findByCycleAndUser(cycleId, fromUserId);
    const toParticipant = await this.participantModel.findByCycleAndUser(cycleId, toUserId);
    
    if (!fromParticipant || !toParticipant) {
      throw new ValidationError('The selected recipient is not a participant in this feedback cycle');
    }
    
    if (fromParticipant.status !== 'active' || toParticipant.status !== 'active') {
      throw new ValidationError('The selected recipient is not an active participant in this cycle');
    }
    
    return true;
  }

  // Private helper methods
  private async buildCompleteCycle(cycle: CycleModel): Promise<Cycle> {
    const participants = await this.participantModel.findByCycleId(cycle.id);
    
    return {
      id: cycle.id,
      name: cycle.name,
      description: cycle.description,
      organizationId: cycle.organization_id,
      startDate: cycle.start_date,
      endDate: cycle.end_date,
      status: cycle.status,
      type: cycle.type,
      templateId: cycle.template_id,
      settings: JSON.parse(cycle.settings),
      createdAt: cycle.created_at,
      updatedAt: cycle.updated_at,
      createdBy: cycle.created_by
    };
  }

  private hasViewPermission(cycle: CycleModel, userId: string): boolean {
    // All authenticated users can view cycles in their organization
    // Additional organization-level filtering should be done in getCycleList
    return true;
  }

  private hasUpdatePermission(cycle: CycleModel, userId: string, userRoles?: string[]): boolean {
    // Creator can always update
    if (cycle.created_by === userId) {
      return true;
    }
    
    // Admin and HR can update any cycle in their organization
    if (userRoles) {
      const roles = userRoles.map(r => r.toLowerCase());
      if (roles.includes('admin') || roles.includes('hr')) {
        return true;
      }
    }
    
    return false;
  }

  private hasDeletePermission(cycle: CycleModel, userId: string, userRoles?: string[]): boolean {
    // Creator can always delete
    if (cycle.created_by === userId) {
      return true;
    }
    
    // Admin and HR can delete any cycle in their organization
    if (userRoles) {
      const roles = userRoles.map(r => r.toLowerCase());
      if (roles.includes('admin') || roles.includes('hr')) {
        return true;
      }
    }
    
    return false;
  }

  private validateCycleDates(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      throw new ValidationError('Start date must be before end date');
    }
    
    if (start < new Date()) {
      throw new ValidationError('Start date cannot be in the past');
    }
  }

  private getDefaultSettings(): CycleSettings {
    return {
      allowSelfReview: true,
      allowPeerReview: true,
      allowManagerReview: true,
      allowUpwardReview: false,
      requireAcknowledgment: true,
      reminderSettings: {
        enabled: true,
        daysBeforeDeadline: [7, 3, 1]
      },
      feedbackSettings: {
        minRatingsRequired: 1,
        maxRatingsAllowed: 10,
        allowAnonymous: false,
        requireComments: true,
        categories: ['Communication', 'Performance', 'Leadership']
      }
    };
  }
}
