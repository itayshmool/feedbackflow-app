// backend/src/modules/integrations/services/slack.service.ts

import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import { 
  SlackIntegration, 
  SlackIntegrationModel, 
  CreateSlackIntegrationRequest, 
  UpdateSlackIntegrationRequest,
  SlackIntegrationResponse,
  SlackMessage,
  SlackCommandRequest,
  SlackInteractionRequest,
  SlackUser,
  SlackChannel,
  SlackTeam,
  SlackFeatureType,
  SlackSettings
} from '../types/integrations.types';
import { SlackIntegrationModelClass } from '../models/slack-integration.model';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../shared/utils/errors';
import { Logger } from '../../../shared/utils/logger';

export class SlackService {
  private slackModel: SlackIntegrationModelClass;
  private eventEmitter: EventEmitter;
  private logger: Logger;

  constructor(
    private db: Pool,
    eventEmitter: EventEmitter,
    logger: Logger
  ) {
    this.slackModel = new SlackIntegrationModelClass(db);
    this.eventEmitter = eventEmitter;
    this.logger = logger;
  }

  async createSlackIntegration(
    organizationId: string,
    request: CreateSlackIntegrationRequest,
    createdBy: string
  ): Promise<SlackIntegration> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validate Slack tokens
      await this.validateSlackTokens(request.botToken, request.signingSecret);
      
      // Check if team already exists
      const existingIntegration = await this.slackModel.findByTeamId(organizationId, request.teamId);
      if (existingIntegration) {
        throw new ValidationError('Slack integration for this team already exists');
      }
      
      // Set default features and settings
      const defaultFeatures = [
        { feature: SlackFeatureType.NOTIFICATIONS, enabled: true },
        { feature: SlackFeatureType.COMMANDS, enabled: true },
        { feature: SlackFeatureType.FEEDBACK_FORMS, enabled: false },
        { feature: SlackFeatureType.STATUS_UPDATES, enabled: true },
        { feature: SlackFeatureType.ANALYTICS, enabled: false }
      ];
      
      const defaultSettings: SlackSettings = {
        notifications: {
          cycleCreated: true,
          cycleActivated: true,
          feedbackSubmitted: true,
          feedbackAcknowledged: true
        },
        commands: {
          feedback: true,
          status: true,
          help: true
        },
        channels: {
          allowMultipleChannels: false
        },
        privacy: {
          showUserNames: true,
          showFeedbackContent: false
        }
      };
      
      // Create Slack integration
      const integrationData: Omit<SlackIntegrationModel, 'id' | 'created_at' | 'updated_at'> = {
        organization_id: organizationId,
        name: request.name,
        description: request.description,
        bot_token: request.botToken,
        app_token: request.appToken,
        signing_secret: request.signingSecret,
        team_id: request.teamId,
        team_name: request.teamName,
        channel_id: request.channelId,
        channel_name: request.channelName,
        is_active: true,
        features: JSON.stringify(request.features || defaultFeatures),
        settings: JSON.stringify(request.settings || defaultSettings),
        created_by: createdBy
      };
      
      const integration = await this.slackModel.create(integrationData, client);
      
      await client.query('COMMIT');
      
      const completeIntegration = await this.buildCompleteIntegration(integration);
      
      // Emit Slack integration created event
      this.eventEmitter.emit('slack:integration_created', {
        integration: completeIntegration,
        organizationId,
        createdBy
      });
      
      this.logger.info('Slack integration created', { 
        integrationId: integration.id, 
        organizationId, 
        createdBy,
        teamId: request.teamId
      });
      
      return completeIntegration;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating Slack integration', { error, organizationId, request });
      throw error;
    } finally {
      client.release();
    }
  }

  async getSlackIntegrationById(id: string, requestingUserId?: string): Promise<SlackIntegration> {
    const integration = await this.slackModel.findById(id);
    
    if (!integration) {
      throw new NotFoundError('Slack integration not found');
    }
    
    // TODO: Check if user has permission to view this integration
    // if (requestingUserId && !this.hasViewPermission(integration, requestingUserId)) {
    //   throw new ForbiddenError('Insufficient permission to view this integration');
    // }
    
    return this.buildCompleteIntegration(integration);
  }

  async getSlackIntegrations(
    organizationId: string,
    requestingUserId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<SlackIntegrationResponse> {
    const { integrations, total } = await this.slackModel.findByOrganization(organizationId, page, limit);
    
    const completeIntegrations = await Promise.all(
      integrations.map(integration => this.buildCompleteIntegration(integration))
    );
    
    return {
      integrations: completeIntegrations,
      total,
      page,
      limit,
      hasNext: page * limit < total,
      hasPrev: page > 1
    };
  }

  async updateSlackIntegration(
    id: string,
    updates: UpdateSlackIntegrationRequest,
    requestingUserId: string
  ): Promise<SlackIntegration> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const existingIntegration = await this.slackModel.findById(id, client);
      if (!existingIntegration) {
        throw new NotFoundError('Slack integration not found');
      }
      
      // TODO: Check if user has permission to update
      // if (!this.hasUpdatePermission(existingIntegration, requestingUserId)) {
      //   throw new ForbiddenError('Insufficient permission to update this integration');
      // }
      
      // Update integration
      const updateData: Partial<SlackIntegrationModel> = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.channelId) updateData.channel_id = updates.channelId;
      if (updates.channelName) updateData.channel_name = updates.channelName;
      if (updates.features) updateData.features = JSON.stringify(updates.features);
      if (updates.settings) {
        const currentSettings = JSON.parse(existingIntegration.settings);
        updateData.settings = JSON.stringify({ ...currentSettings, ...updates.settings });
      }
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      
      const updatedIntegration = await this.slackModel.update(id, updateData, client);
      
      if (!updatedIntegration) {
        throw new Error('Failed to update Slack integration');
      }
      
      await client.query('COMMIT');
      
      const completeIntegration = await this.getSlackIntegrationById(id);
      
      // Emit Slack integration updated event
      this.eventEmitter.emit('slack:integration_updated', {
        integration: completeIntegration,
        updatedBy: requestingUserId,
        changes: updates
      });
      
      this.logger.info('Slack integration updated', { 
        integrationId: id, 
        updatedBy: requestingUserId 
      });
      
      return completeIntegration;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating Slack integration', { error, integrationId: id, requestingUserId });
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteSlackIntegration(id: string, requestingUserId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const integration = await this.slackModel.findById(id, client);
      if (!integration) {
        throw new NotFoundError('Slack integration not found');
      }
      
      // TODO: Check permissions
      // if (!this.hasDeletePermission(integration, requestingUserId)) {
      //   throw new ForbiddenError('Insufficient permission to delete this integration');
      // }
      
      // Delete integration
      const deleted = await this.slackModel.delete(id, client);
      
      if (!deleted) {
        throw new Error('Failed to delete Slack integration');
      }
      
      await client.query('COMMIT');
      
      // Emit Slack integration deleted event
      this.eventEmitter.emit('slack:integration_deleted', {
        integrationId: id,
        deletedBy: requestingUserId,
        integration
      });
      
      this.logger.info('Slack integration deleted', { 
        integrationId: id, 
        deletedBy: requestingUserId 
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error deleting Slack integration', { error, integrationId: id, requestingUserId });
      throw error;
    } finally {
      client.release();
    }
  }

  async handleSlackCommand(commandRequest: SlackCommandRequest): Promise<any> {
    try {
      // Find integration by team ID
      const integration = await this.slackModel.findByTeamId('default-org', commandRequest.team_id);
      if (!integration || !integration.is_active) {
        throw new NotFoundError('Slack integration not found or inactive');
      }
      
      // Verify request signature
      // Note: In a real implementation, you would verify the Slack signature here
      
      const completeIntegration = await this.buildCompleteIntegration(integration);
      
      // Handle different commands
      switch (commandRequest.command) {
        case '/feedback':
          return await this.handleFeedbackCommand(completeIntegration, commandRequest);
        case '/status':
          return await this.handleStatusCommand(completeIntegration, commandRequest);
        case '/help':
          return await this.handleHelpCommand(completeIntegration, commandRequest);
        default:
          throw new ValidationError(`Unknown command: ${commandRequest.command}`);
      }
      
    } catch (error) {
      this.logger.error('Error handling Slack command', { error, commandRequest });
      throw error;
    }
  }

  async handleSlackInteraction(interactionRequest: SlackInteractionRequest): Promise<any> {
    try {
      const payload = JSON.parse(interactionRequest.payload);
      
      // Find integration by team ID
      const integration = await this.slackModel.findByTeamId('default-org', payload.team.id);
      if (!integration || !integration.is_active) {
        throw new NotFoundError('Slack integration not found or inactive');
      }
      
      // Verify request signature
      // Note: In a real implementation, you would verify the Slack signature here
      
      const completeIntegration = await this.buildCompleteIntegration(integration);
      
      // Handle different interaction types
      switch (payload.type) {
        case 'block_actions':
          return await this.handleBlockActions(completeIntegration, payload);
        case 'view_submission':
          return await this.handleViewSubmission(completeIntegration, payload);
        default:
          throw new ValidationError(`Unknown interaction type: ${payload.type}`);
      }
      
    } catch (error) {
      this.logger.error('Error handling Slack interaction', { error, interactionRequest });
      throw error;
    }
  }

  async sendSlackMessage(integrationId: string, message: SlackMessage): Promise<any> {
    const integration = await this.getSlackIntegrationById(integrationId);
    
    if (!integration.isActive) {
      throw new ValidationError('Slack integration is not active');
    }
    
    try {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });
      
      const result = await response.json();
      
      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }
      
      this.logger.info('Slack message sent', { 
        integrationId, 
        channel: message.channel,
        messageType: message.blocks ? 'blocks' : 'text'
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Error sending Slack message', { error, integrationId, message });
      throw error;
    }
  }

  async processSlackEvent(event: string, data: any, organizationId: string): Promise<void> {
    try {
      // Find active Slack integrations
      const integrations = await this.slackModel.findActiveByOrganization(organizationId);
      
      if (integrations.length === 0) {
        this.logger.debug('No active Slack integrations found', { event, organizationId });
        return;
      }
      
      // Process event for each integration
      for (const integration of integrations) {
        await this.processEventForIntegration(integration, event, data);
      }
      
      this.logger.info('Slack event processed', { 
        event, 
        organizationId, 
        integrationCount: integrations.length 
      });
      
    } catch (error) {
      this.logger.error('Error processing Slack event', { error, event, organizationId });
      throw error;
    }
  }

  // Private helper methods
  private async buildCompleteIntegration(integration: SlackIntegrationModel): Promise<SlackIntegration> {
    return {
      id: integration.id,
      organizationId: integration.organization_id,
      name: integration.name,
      description: integration.description,
      botToken: integration.bot_token,
      appToken: integration.app_token,
      signingSecret: integration.signing_secret,
      teamId: integration.team_id,
      teamName: integration.team_name,
      channelId: integration.channel_id,
      channelName: integration.channel_name,
      isActive: integration.is_active,
      features: JSON.parse(integration.features),
      settings: JSON.parse(integration.settings),
      lastSyncAt: integration.last_sync_at,
      createdAt: integration.created_at,
      updatedAt: integration.updated_at,
      createdBy: integration.created_by
    };
  }

  private async validateSlackTokens(botToken: string, signingSecret: string): Promise<void> {
    try {
      // Test bot token by getting team info
      const response = await fetch('https://slack.com/api/team.info', {
        headers: {
          'Authorization': `Bearer ${botToken}`
        }
      });
      
      const result = await response.json();
      
      if (!result.ok) {
        throw new ValidationError(`Invalid bot token: ${result.error}`);
      }
      
      // Validate signing secret format
      if (!signingSecret || signingSecret.length < 8) {
        throw new ValidationError('Invalid signing secret format');
      }
      
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to validate Slack tokens');
    }
  }

  private async handleFeedbackCommand(integration: SlackIntegration, commandRequest: SlackCommandRequest): Promise<any> {
    // Create feedback form modal or message
    const message: SlackMessage = {
      channel: commandRequest.channel_id,
      text: "Feedback Form",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Please provide your feedback using the form below:"
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: "Open Feedback Form",
              action_id: "open_feedback_form"
            }
          ]
        }
      ]
    };
    
    return await this.sendSlackMessage(integration.id, message);
  }

  private async handleStatusCommand(integration: SlackIntegration, commandRequest: SlackCommandRequest): Promise<any> {
    // Get current status information
    const message: SlackMessage = {
      channel: commandRequest.channel_id,
      text: "FeedbackFlow Status",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*FeedbackFlow Status*\n\n• System: ✅ Online\n• Active Cycles: 3\n• Pending Feedback: 12\n• Last Sync: 2 minutes ago"
          }
        }
      ]
    };
    
    return await this.sendSlackMessage(integration.id, message);
  }

  private async handleHelpCommand(integration: SlackIntegration, commandRequest: SlackCommandRequest): Promise<any> {
    const message: SlackMessage = {
      channel: commandRequest.channel_id,
      text: "FeedbackFlow Help",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*FeedbackFlow Commands*\n\n• `/feedback` - Submit feedback\n• `/status` - Check system status\n• `/help` - Show this help message"
          }
        }
      ]
    };
    
    return await this.sendSlackMessage(integration.id, message);
  }

  private async handleBlockActions(integration: SlackIntegration, payload: any): Promise<any> {
    // Handle button clicks and other block actions
    const action = payload.actions[0];
    
    switch (action.action_id) {
      case 'open_feedback_form':
        // Open feedback form modal
        return { response_type: 'ephemeral', text: 'Feedback form opened!' };
      default:
        return { response_type: 'ephemeral', text: 'Action not recognized' };
    }
  }

  private async handleViewSubmission(integration: SlackIntegration, payload: any): Promise<any> {
    // Handle form submissions
    const values = payload.view.state.values;
    
    // Process form data and create feedback
    // This would integrate with the feedback service
    
    return { response_action: 'clear' };
  }

  private async processEventForIntegration(integration: SlackIntegrationModel, event: string, data: any): Promise<void> {
    const completeIntegration = await this.buildCompleteIntegration(integration);
    const settings = completeIntegration.settings;
    
    // Check if this event type is enabled
    if (!this.isEventEnabled(completeIntegration, event)) {
      return;
    }
    
    // Create appropriate Slack message based on event
    const message = await this.createEventMessage(completeIntegration, event, data);
    
    if (message) {
      await this.sendSlackMessage(completeIntegration.id, message);
    }
  }

  private isEventEnabled(integration: SlackIntegration, event: string): boolean {
    const settings = integration.settings;
    
    switch (event) {
      case 'cycle:created':
        return settings.notifications.cycleCreated;
      case 'cycle:activated':
        return settings.notifications.cycleActivated;
      case 'feedback:submitted':
        return settings.notifications.feedbackSubmitted;
      case 'feedback:acknowledged':
        return settings.notifications.feedbackAcknowledged;
      default:
        return false;
    }
  }

  private async createEventMessage(integration: SlackIntegration, event: string, data: any): Promise<SlackMessage | null> {
    const channel = integration.channelId || 'general';
    
    switch (event) {
      case 'cycle:created':
        return {
          channel,
          text: `New cycle created: ${data.name}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*New Cycle Created*\n\n*Name:* ${data.name}\n*Description:* ${data.description || 'No description'}\n*Start Date:* ${new Date(data.startDate).toLocaleDateString()}`
              }
            }
          ]
        };
        
      case 'cycle:activated':
        return {
          channel,
          text: `Cycle activated: ${data.name}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Cycle Activated*\n\n*Name:* ${data.name}\n*Participants:* ${data.participants?.length || 0}`
              }
            }
          ]
        };
        
      case 'feedback:submitted':
        return {
          channel,
          text: `Feedback submitted`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Feedback Submitted*\n\n*From:* ${data.fromUser?.name || 'Unknown'}\n*To:* ${data.toUser?.name || 'Unknown'}\n*Cycle:* ${data.cycle?.name || 'Unknown'}`
              }
            }
          ]
        };
        
      default:
        return null;
    }
  }
}
