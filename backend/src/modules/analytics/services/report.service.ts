// backend/src/modules/analytics/services/report.service.ts

import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import { 
  Report, 
  ReportModel, 
  CreateReportRequest, 
  ReportResponse,
  ReportType,
  ReportFormat,
  ScheduleFrequency
} from '../types/analytics.types';
import { ReportModelClass } from '../models/report.model';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../shared/utils/errors';
import { Logger } from '../../../shared/utils/logger';

export class ReportService {
  private reportModel: ReportModelClass;
  private eventEmitter: EventEmitter;
  private logger: Logger;

  constructor(
    private db: Pool,
    eventEmitter: EventEmitter,
    logger: Logger
  ) {
    this.reportModel = new ReportModelClass(db);
    this.eventEmitter = eventEmitter;
    this.logger = logger;
  }

  async createReport(
    organizationId: string,
    request: CreateReportRequest,
    createdBy: string
  ): Promise<Report> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validate report configuration
      this.validateReportRequest(request);
      
      // Calculate next generation time if scheduled
      let nextGeneration: Date | undefined;
      if (request.schedule && request.schedule.frequency !== ScheduleFrequency.MANUAL) {
        nextGeneration = this.calculateNextGeneration(request.schedule);
      }
      
      // Create report
      const reportData: Omit<ReportModel, 'id' | 'created_at' | 'updated_at'> = {
        organization_id: organizationId,
        name: request.name,
        description: request.description,
        type: request.type,
        format: request.format,
        schedule: request.schedule ? JSON.stringify(request.schedule) : undefined,
        filters: JSON.stringify(request.filters || {}),
        metrics: JSON.stringify(request.metrics),
        recipients: JSON.stringify(request.recipients),
        is_active: true,
        next_generation: nextGeneration,
        created_by: createdBy
      };
      
      const report = await this.reportModel.create(reportData, client);
      
      await client.query('COMMIT');
      
      const completeReport = await this.buildCompleteReport(report);
      
      // Emit report created event
      this.eventEmitter.emit('report:created', {
        report: completeReport,
        organizationId,
        createdBy
      });
      
      this.logger.info('Report created', { 
        reportId: report.id, 
        organizationId, 
        createdBy 
      });
      
      return completeReport;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating report', { error, organizationId, request });
      throw error;
    } finally {
      client.release();
    }
  }

  async getReportById(id: string, requestingUserId?: string): Promise<Report> {
    const report = await this.reportModel.findById(id);
    
    if (!report) {
      throw new NotFoundError('Report not found');
    }
    
    // TODO: Check if user has permission to view this report
    // if (requestingUserId && !this.hasViewPermission(report, requestingUserId)) {
    //   throw new ForbiddenError('Insufficient permission to view this report');
    // }
    
    return this.buildCompleteReport(report);
  }

  async getReports(
    organizationId: string,
    requestingUserId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ReportResponse> {
    const { reports, total } = await this.reportModel.findByOrganization(organizationId, page, limit);
    
    const completeReports = await Promise.all(
      reports.map(report => this.buildCompleteReport(report))
    );
    
    return {
      reports: completeReports,
      total,
      page,
      limit,
      hasNext: page * limit < total,
      hasPrev: page > 1
    };
  }

  async getReportsByType(
    organizationId: string,
    type: ReportType
  ): Promise<Report[]> {
    const reports = await this.reportModel.findByType(organizationId, type);
    
    return Promise.all(
      reports.map(report => this.buildCompleteReport(report))
    );
  }

  async updateReport(
    id: string,
    updates: Partial<CreateReportRequest>,
    requestingUserId: string
  ): Promise<Report> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const existingReport = await this.reportModel.findById(id, client);
      if (!existingReport) {
        throw new NotFoundError('Report not found');
      }
      
      // TODO: Check if user has permission to update
      // if (!this.hasUpdatePermission(existingReport, requestingUserId)) {
      //   throw new ForbiddenError('Insufficient permission to update this report');
      // }
      
      // Validate updates if provided
      if (updates.schedule) {
        this.validateSchedule(updates.schedule);
      }
      
      // Calculate next generation time if schedule is being updated
      let nextGeneration: Date | undefined;
      if (updates.schedule && updates.schedule.frequency !== ScheduleFrequency.MANUAL) {
        nextGeneration = this.calculateNextGeneration(updates.schedule);
      }
      
      // Update report
      const updateData: Partial<ReportModel> = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.type) updateData.type = updates.type;
      if (updates.format) updateData.format = updates.format;
      if (updates.schedule) updateData.schedule = JSON.stringify(updates.schedule);
      if (updates.filters) updateData.filters = JSON.stringify(updates.filters);
      if (updates.metrics) updateData.metrics = JSON.stringify(updates.metrics);
      if (updates.recipients) updateData.recipients = JSON.stringify(updates.recipients);
      if (nextGeneration !== undefined) updateData.next_generation = nextGeneration;
      
      const updatedReport = await this.reportModel.update(id, updateData, client);
      
      if (!updatedReport) {
        throw new Error('Failed to update report');
      }
      
      await client.query('COMMIT');
      
      const completeReport = await this.getReportById(id);
      
      // Emit report updated event
      this.eventEmitter.emit('report:updated', {
        report: completeReport,
        updatedBy: requestingUserId,
        changes: updates
      });
      
      this.logger.info('Report updated', { 
        reportId: id, 
        updatedBy: requestingUserId 
      });
      
      return completeReport;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating report', { error, reportId: id, requestingUserId });
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteReport(id: string, requestingUserId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const report = await this.reportModel.findById(id, client);
      if (!report) {
        throw new NotFoundError('Report not found');
      }
      
      // TODO: Check permissions
      // if (!this.hasDeletePermission(report, requestingUserId)) {
      //   throw new ForbiddenError('Insufficient permission to delete this report');
      // }
      
      // Delete report
      const deleted = await this.reportModel.delete(id, client);
      
      if (!deleted) {
        throw new Error('Failed to delete report');
      }
      
      await client.query('COMMIT');
      
      // Emit report deleted event
      this.eventEmitter.emit('report:deleted', {
        reportId: id,
        deletedBy: requestingUserId,
        report
      });
      
      this.logger.info('Report deleted', { 
        reportId: id, 
        deletedBy: requestingUserId 
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error deleting report', { error, reportId: id, requestingUserId });
      throw error;
    } finally {
      client.release();
    }
  }

  async activateReport(id: string, requestingUserId: string): Promise<Report> {
    const activated = await this.reportModel.activate(id);
    
    if (!activated) {
      throw new Error('Failed to activate report');
    }
    
    const report = await this.getReportById(id);
    
    this.logger.info('Report activated', { 
      reportId: id, 
      activatedBy: requestingUserId 
    });
    
    return report;
  }

  async deactivateReport(id: string, requestingUserId: string): Promise<Report> {
    const deactivated = await this.reportModel.deactivate(id);
    
    if (!deactivated) {
      throw new Error('Failed to deactivate report');
    }
    
    const report = await this.getReportById(id);
    
    this.logger.info('Report deactivated', { 
      reportId: id, 
      deactivatedBy: requestingUserId 
    });
    
    return report;
  }

  async generateReport(id: string, requestingUserId: string): Promise<{ reportId: string; generatedAt: Date }> {
    const report = await this.getReportById(id);
    
    // TODO: Implement actual report generation logic
    // This would:
    // 1. Collect data based on report filters and metrics
    // 2. Generate the report in the specified format
    // 3. Send to recipients
    // 4. Update last generated timestamp
    
    const generatedAt = new Date();
    
    // Update last generated timestamp
    await this.reportModel.updateLastGenerated(
      id,
      generatedAt,
      report.schedule ? this.calculateNextGeneration(report.schedule) : undefined
    );
    
    // Emit report generated event
    this.eventEmitter.emit('report:generated', {
      report,
      generatedBy: requestingUserId,
      generatedAt
    });
    
    this.logger.info('Report generated', { 
      reportId: id, 
      generatedBy: requestingUserId,
      generatedAt
    });
    
    return { reportId: id, generatedAt };
  }

  async processScheduledReports(): Promise<void> {
    const now = new Date();
    const scheduledReports = await this.reportModel.findScheduledReports(now);
    
    this.logger.info('Processing scheduled reports', { 
      count: scheduledReports.length 
    });
    
    for (const report of scheduledReports) {
      try {
        await this.generateReport(report.id, 'system');
      } catch (error) {
        this.logger.error('Error generating scheduled report', {
          reportId: report.id,
          error
        });
      }
    }
  }

  // Private helper methods
  private async buildCompleteReport(report: ReportModel): Promise<Report> {
    return {
      id: report.id,
      organizationId: report.organization_id,
      name: report.name,
      description: report.description,
      type: report.type,
      format: report.format,
      schedule: report.schedule ? JSON.parse(report.schedule) : undefined,
      filters: JSON.parse(report.filters),
      metrics: JSON.parse(report.metrics),
      recipients: JSON.parse(report.recipients),
      isActive: report.is_active,
      lastGenerated: report.last_generated,
      nextGeneration: report.next_generation,
      createdBy: report.created_by,
      createdAt: report.created_at,
      updatedAt: report.updated_at
    };
  }

  private validateReportRequest(request: CreateReportRequest): void {
    if (!Object.values(ReportType).includes(request.type)) {
      throw new ValidationError(`Invalid report type: ${request.type}`);
    }
    
    if (!Object.values(ReportFormat).includes(request.format)) {
      throw new ValidationError(`Invalid report format: ${request.format}`);
    }
    
    if (!request.name || request.name.trim().length === 0) {
      throw new ValidationError('Report name is required');
    }
    
    if (!request.metrics || request.metrics.length === 0) {
      throw new ValidationError('At least one metric is required');
    }
    
    if (!request.recipients || request.recipients.length === 0) {
      throw new ValidationError('At least one recipient is required');
    }
    
    if (request.schedule) {
      this.validateSchedule(request.schedule);
    }
  }

  private validateSchedule(schedule: any): void {
    if (!Object.values(ScheduleFrequency).includes(schedule.frequency)) {
      throw new ValidationError(`Invalid schedule frequency: ${schedule.frequency}`);
    }
    
    if (schedule.frequency !== ScheduleFrequency.MANUAL) {
      if (!schedule.time || !this.isValidTime(schedule.time)) {
        throw new ValidationError('Valid time is required for scheduled reports');
      }
      
      if (schedule.frequency === ScheduleFrequency.WEEKLY && 
          (schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6)) {
        throw new ValidationError('Valid day of week (0-6) is required for weekly reports');
      }
      
      if (schedule.frequency === ScheduleFrequency.MONTHLY && 
          (schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31)) {
        throw new ValidationError('Valid day of month (1-31) is required for monthly reports');
      }
    }
  }

  private isValidTime(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  private calculateNextGeneration(schedule: any): Date {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    
    let nextGeneration = new Date(now);
    nextGeneration.setHours(hours, minutes, 0, 0);
    
    switch (schedule.frequency) {
      case ScheduleFrequency.DAILY:
        if (nextGeneration <= now) {
          nextGeneration.setDate(nextGeneration.getDate() + 1);
        }
        break;
        
      case ScheduleFrequency.WEEKLY:
        const dayOfWeek = schedule.dayOfWeek || 0;
        const daysUntilTarget = (dayOfWeek - nextGeneration.getDay() + 7) % 7;
        nextGeneration.setDate(nextGeneration.getDate() + daysUntilTarget);
        if (nextGeneration <= now) {
          nextGeneration.setDate(nextGeneration.getDate() + 7);
        }
        break;
        
      case ScheduleFrequency.MONTHLY:
        const dayOfMonth = schedule.dayOfMonth || 1;
        nextGeneration.setDate(dayOfMonth);
        if (nextGeneration <= now) {
          nextGeneration.setMonth(nextGeneration.getMonth() + 1);
        }
        break;
        
      case ScheduleFrequency.QUARTERLY:
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        nextGeneration.setMonth(quarterStart, 1);
        if (nextGeneration <= now) {
          nextGeneration.setMonth(quarterStart + 3, 1);
        }
        break;
        
      case ScheduleFrequency.YEARLY:
        nextGeneration.setMonth(0, 1);
        if (nextGeneration <= now) {
          nextGeneration.setFullYear(nextGeneration.getFullYear() + 1);
        }
        break;
    }
    
    return nextGeneration;
  }
}
