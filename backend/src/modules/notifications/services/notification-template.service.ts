// backend/src/modules/notifications/services/notification-template.service.ts

import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import { 
  NotificationTemplate, 
  NotificationTemplateModel, 
  CreateTemplateRequest, 
  NotificationType,
  NotificationChannel
} from '../types/notification.types';
import { NotificationTemplateModelClass } from '../models/notification-template.model';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../shared/utils/errors';
import { Logger } from '../../../shared/utils/logger';

export class NotificationTemplateService {
  private templateModel: NotificationTemplateModelClass;
  private eventEmitter: EventEmitter;
  private logger: Logger;

  constructor(
    private db: Pool,
    eventEmitter: EventEmitter,
    logger: Logger
  ) {
    this.templateModel = new NotificationTemplateModelClass(db);
    this.eventEmitter = eventEmitter;
    this.logger = logger;
  }

  async createTemplate(
    organizationId: string,
    request: CreateTemplateRequest,
    createdBy: string
  ): Promise<NotificationTemplate> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validate template variables
      this.validateTemplateVariables(request.content, request.variables);
      
      // Create template
      const templateData: Omit<NotificationTemplateModel, 'id' | 'created_at' | 'updated_at'> = {
        name: request.name,
        description: request.description,
        organization_id: organizationId,
        type: request.type,
        channel: request.channel,
        subject: request.subject,
        title: request.title,
        content: request.content,
        variables: JSON.stringify(request.variables),
        is_active: true,
        is_default: request.isDefault || false,
        created_by: createdBy
      };
      
      const template = await this.templateModel.create(templateData, client);
      
      await client.query('COMMIT');
      
      const completeTemplate = await this.buildCompleteTemplate(template);
      
      // Emit template created event
      this.eventEmitter.emit('template:created', {
        template: completeTemplate,
        organizationId,
        createdBy
      });
      
      this.logger.info('Template created', { 
        templateId: template.id, 
        organizationId, 
        createdBy 
      });
      
      return completeTemplate;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating template', { error, request });
      throw error;
    } finally {
      client.release();
    }
  }

  async getTemplateById(id: string, requestingUserId?: string): Promise<NotificationTemplate> {
    const template = await this.templateModel.findById(id);
    
    if (!template) {
      throw new NotFoundError('Template not found');
    }
    
    // TODO: Check if user has permission to view this template
    // if (requestingUserId && !this.hasViewPermission(template, requestingUserId)) {
    //   throw new ForbiddenError('Insufficient permission to view this template');
    // }
    
    return this.buildCompleteTemplate(template);
  }

  async getTemplatesByOrganization(
    organizationId: string,
    type?: NotificationType,
    channel?: NotificationChannel
  ): Promise<NotificationTemplate[]> {
    const templates = await this.templateModel.findByOrganization(organizationId);
    
    let filteredTemplates = templates;
    
    if (type) {
      filteredTemplates = filteredTemplates.filter(t => t.type === type);
    }
    
    if (channel) {
      filteredTemplates = filteredTemplates.filter(t => t.channel === channel);
    }
    
    return Promise.all(
      filteredTemplates.map(template => this.buildCompleteTemplate(template))
    );
  }

  async getDefaultTemplate(
    organizationId: string,
    type: NotificationType,
    channel: NotificationChannel
  ): Promise<NotificationTemplate | null> {
    const template = await this.templateModel.getDefaultTemplate(organizationId, type, channel);
    
    if (!template) {
      return null;
    }
    
    return this.buildCompleteTemplate(template);
  }

  async updateTemplate(
    id: string,
    updates: Partial<CreateTemplateRequest>,
    requestingUserId: string
  ): Promise<NotificationTemplate> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const existingTemplate = await this.templateModel.findById(id, client);
      if (!existingTemplate) {
        throw new NotFoundError('Template not found');
      }
      
      // TODO: Check if user has permission to update
      // if (!this.hasUpdatePermission(existingTemplate, requestingUserId)) {
      //   throw new ForbiddenError('Insufficient permission to update this template');
      // }
      
      // Validate template variables if content is being updated
      if (updates.content && updates.variables) {
        this.validateTemplateVariables(updates.content, updates.variables);
      }
      
      // Update template
      const updateData: Partial<NotificationTemplateModel> = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.subject !== undefined) updateData.subject = updates.subject;
      if (updates.title) updateData.title = updates.title;
      if (updates.content) updateData.content = updates.content;
      if (updates.variables) updateData.variables = JSON.stringify(updates.variables);
      if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;
      
      const updatedTemplate = await this.templateModel.update(id, updateData, client);
      
      if (!updatedTemplate) {
        throw new Error('Failed to update template');
      }
      
      await client.query('COMMIT');
      
      const completeTemplate = await this.getTemplateById(id);
      
      // Emit template updated event
      this.eventEmitter.emit('template:updated', {
        template: completeTemplate,
        updatedBy: requestingUserId,
        changes: updates
      });
      
      this.logger.info('Template updated', { 
        templateId: id, 
        updatedBy: requestingUserId 
      });
      
      return completeTemplate;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating template', { error, templateId: id, requestingUserId });
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteTemplate(id: string, requestingUserId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const template = await this.templateModel.findById(id, client);
      if (!template) {
        throw new NotFoundError('Template not found');
      }
      
      // TODO: Check permissions
      // if (!this.hasDeletePermission(template, requestingUserId)) {
      //   throw new ForbiddenError('Insufficient permission to delete this template');
      // }
      
      // Check if template is in use
      if (template.is_default) {
        throw new ValidationError('Cannot delete default template');
      }
      
      // Delete template
      const deleted = await this.templateModel.delete(id, client);
      
      if (!deleted) {
        throw new Error('Failed to delete template');
      }
      
      await client.query('COMMIT');
      
      // Emit template deleted event
      this.eventEmitter.emit('template:deleted', {
        templateId: id,
        deletedBy: requestingUserId,
        template
      });
      
      this.logger.info('Template deleted', { 
        templateId: id, 
        deletedBy: requestingUserId 
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error deleting template', { error, templateId: id, requestingUserId });
      throw error;
    } finally {
      client.release();
    }
  }

  async activateTemplate(id: string, requestingUserId: string): Promise<NotificationTemplate> {
    const activated = await this.templateModel.activate(id);
    
    if (!activated) {
      throw new Error('Failed to activate template');
    }
    
    const template = await this.getTemplateById(id);
    
    this.logger.info('Template activated', { 
      templateId: id, 
      activatedBy: requestingUserId 
    });
    
    return template;
  }

  async deactivateTemplate(id: string, requestingUserId: string): Promise<NotificationTemplate> {
    const deactivated = await this.templateModel.deactivate(id);
    
    if (!deactivated) {
      throw new Error('Failed to deactivate template');
    }
    
    const template = await this.getTemplateById(id);
    
    this.logger.info('Template deactivated', { 
      templateId: id, 
      deactivatedBy: requestingUserId 
    });
    
    return template;
  }

  // Private helper methods
  private async buildCompleteTemplate(template: NotificationTemplateModel): Promise<NotificationTemplate> {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      organizationId: template.organization_id,
      type: template.type,
      channel: template.channel,
      subject: template.subject,
      title: template.title,
      content: template.content,
      variables: JSON.parse(template.variables),
      isActive: template.is_active,
      isDefault: template.is_default,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
      createdBy: template.created_by
    };
  }

  private validateTemplateVariables(content: string, variables: string[]): void {
    const contentVariables = content.match(/\{\{(\w+)\}\}/g) || [];
    const contentVariableNames = contentVariables.map(v => v.replace(/\{\{|\}\}/g, ''));
    
    const missingVariables = contentVariableNames.filter(name => !variables.includes(name));
    if (missingVariables.length > 0) {
      throw new ValidationError(`Template content references undefined variables: ${missingVariables.join(', ')}`);
    }
    
    const unusedVariables = variables.filter(name => !contentVariableNames.includes(name));
    if (unusedVariables.length > 0) {
      this.logger.warn('Template has unused variables', { 
        unusedVariables,
        content 
      });
    }
  }
}
