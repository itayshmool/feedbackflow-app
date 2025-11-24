// backend/tests/unit/integrations/services/slack.service.test.ts

import { SlackService } from '../../../../src/modules/integrations/services/slack.service';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import { Logger } from '../../../../src/shared/utils/logger';
import { SlackFeatureType } from '../../../../src/modules/integrations/types/integrations.types';

// Mock dependencies
jest.mock('pg');
jest.mock('events');
jest.mock('../../../../src/shared/utils/logger');

describe('SlackService', () => {
  let slackService: SlackService;
  let mockDb: any;
  let mockEventEmitter: jest.Mocked<EventEmitter>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // Create mocks
    mockDb = {
      connect: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn(),
      }),
      query: jest.fn(),
    } as any;

    mockEventEmitter = {
      emit: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    // Create service instance
    slackService = new SlackService(mockDb, mockEventEmitter, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSlackIntegration', () => {
    it('should create Slack integration successfully', async () => {
      const integrationData = {
        name: 'Test Slack Integration',
        description: 'A test Slack integration',
        botToken: 'xoxb-test-token',
        signingSecret: 'test-signing-secret',
        teamId: 'T1234567890',
        teamName: 'Test Team',
        channelId: 'C1234567890',
        channelName: 'general',
        features: [
          { feature: SlackFeatureType.NOTIFICATIONS, enabled: true },
          { feature: SlackFeatureType.COMMANDS, enabled: true }
        ]
      };

      // Mock the service methods that would be called
      jest.spyOn(slackService as any, 'validateSlackTokens').mockResolvedValue(undefined);
      jest.spyOn(slackService as any, 'buildCompleteIntegration').mockResolvedValue({
        id: 'slack-123',
        name: 'Test Slack Integration',
        teamId: 'T1234567890',
        teamName: 'Test Team'
      });

      (slackService as any).slackModel = {
        findByTeamId: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'slack-123',
          organization_id: 'org-1',
          name: 'Test Slack Integration',
          team_id: 'T1234567890',
          team_name: 'Test Team',
          bot_token: 'xoxb-test-token',
          signing_secret: 'test-signing-secret',
          is_active: true,
          features: JSON.stringify(integrationData.features),
          settings: JSON.stringify({}),
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user-1'
        })
      };

      const result = await slackService.createSlackIntegration('org-1', integrationData, 'user-1');

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Slack Integration');
      expect(result.teamId).toBe('T1234567890');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('slack:integration_created', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('Slack integration created', expect.any(Object));
    });

    it('should throw error if team already exists', async () => {
      const integrationData = {
        name: 'Test Slack Integration',
        botToken: 'xoxb-test-token',
        signingSecret: 'test-signing-secret',
        teamId: 'T1234567890',
        teamName: 'Test Team'
      };

      (slackService as any).slackModel = {
        findByTeamId: jest.fn().mockResolvedValue({
          id: 'existing-slack-123',
          team_id: 'T1234567890'
        })
      };

      // Mock validateSlackTokens to not throw
      jest.spyOn(slackService as any, 'validateSlackTokens').mockResolvedValue(undefined);

      await expect(
        slackService.createSlackIntegration('org-1', integrationData, 'user-1')
      ).rejects.toThrow('Slack integration for this team already exists');
    });

    it('should handle database errors gracefully', async () => {
      const integrationData = {
        name: 'Test Slack Integration',
        botToken: 'xoxb-test-token',
        signingSecret: 'test-signing-secret',
        teamId: 'T1234567890',
        teamName: 'Test Team'
      };

      // Mock database error
      (mockDb.connect as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        slackService.createSlackIntegration('org-1', integrationData, 'user-1')
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getSlackIntegrations', () => {
    it('should return Slack integrations with pagination', async () => {
      const mockIntegrations = [
        {
          id: 'slack-1',
          organization_id: 'org-1',
          name: 'Test Slack Integration 1',
          team_id: 'T1234567890',
          team_name: 'Test Team 1',
          bot_token: 'xoxb-test-token-1',
          signing_secret: 'test-signing-secret-1',
          is_active: true,
          features: JSON.stringify([{ feature: SlackFeatureType.NOTIFICATIONS, enabled: true }]),
          settings: JSON.stringify({}),
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user-1'
        }
      ];

      (slackService as any).slackModel = {
        findByOrganization: jest.fn().mockResolvedValue({
          integrations: mockIntegrations,
          total: 1
        })
      };

      jest.spyOn(slackService as any, 'buildCompleteIntegration').mockResolvedValue({
        id: 'slack-1',
        name: 'Test Slack Integration 1'
      });

      const result = await slackService.getSlackIntegrations('org-1', 'user-1', 1, 20);

      expect(result).toBeDefined();
      expect(result.integrations).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('getSlackIntegrationById', () => {
    it('should return Slack integration when found', async () => {
      const mockIntegration = {
        id: 'slack-123',
        organization_id: 'org-1',
        name: 'Test Slack Integration',
        team_id: 'T1234567890',
        team_name: 'Test Team',
        bot_token: 'xoxb-test-token',
        signing_secret: 'test-signing-secret',
        is_active: true,
        features: JSON.stringify([{ feature: SlackFeatureType.NOTIFICATIONS, enabled: true }]),
        settings: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-1'
      };

      (slackService as any).slackModel = {
        findById: jest.fn().mockResolvedValue(mockIntegration)
      };

      jest.spyOn(slackService as any, 'buildCompleteIntegration').mockResolvedValue({
        id: 'slack-123',
        name: 'Test Slack Integration'
      });

      const result = await slackService.getSlackIntegrationById('slack-123', 'user-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('slack-123');
      expect(result.name).toBe('Test Slack Integration');
    });

    it('should throw NotFoundError when integration not found', async () => {
      (slackService as any).slackModel = {
        findById: jest.fn().mockResolvedValue(null)
      };

      await expect(
        slackService.getSlackIntegrationById('nonexistent-id', 'user-1')
      ).rejects.toThrow('Slack integration not found');
    });
  });

  describe('handleSlackCommand', () => {
    it('should handle feedback command', async () => {
      const commandRequest = {
        token: 'test-token',
        team_id: 'T1234567890',
        team_domain: 'testteam',
        channel_id: 'C1234567890',
        channel_name: 'general',
        user_id: 'U1234567890',
        user_name: 'testuser',
        command: '/feedback',
        text: 'submit feedback',
        response_url: 'https://hooks.slack.com/commands/123/456',
        trigger_id: 'trigger-123'
      };

      const mockIntegration = {
        id: 'slack-123',
        organization_id: 'org-1',
        team_id: 'T1234567890',
        is_active: true,
        features: JSON.stringify([{ feature: SlackFeatureType.COMMANDS, enabled: true }]),
        settings: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-1'
      };

      (slackService as any).slackModel = {
        findByTeamId: jest.fn().mockResolvedValue(mockIntegration)
      };

      jest.spyOn(slackService as any, 'buildCompleteIntegration').mockResolvedValue({
        id: 'slack-123',
        teamId: 'T1234567890',
        isActive: true
      });

      jest.spyOn(slackService as any, 'handleFeedbackCommand').mockResolvedValue({ success: true });
      jest.spyOn(slackService, 'sendSlackMessage').mockResolvedValue({ success: true });

      const result = await slackService.handleSlackCommand(commandRequest);

      expect(result).toBeDefined();
      expect((slackService as any).handleFeedbackCommand).toHaveBeenCalledWith(
        expect.any(Object),
        commandRequest
      );
    });

    it('should handle status command', async () => {
      const commandRequest = {
        token: 'test-token',
        team_id: 'T1234567890',
        team_domain: 'testteam',
        channel_id: 'C1234567890',
        channel_name: 'general',
        user_id: 'U1234567890',
        user_name: 'testuser',
        command: '/status',
        text: '',
        response_url: 'https://hooks.slack.com/commands/123/456',
        trigger_id: 'trigger-123'
      };

      const mockIntegration = {
        id: 'slack-123',
        organization_id: 'org-1',
        team_id: 'T1234567890',
        is_active: true,
        features: JSON.stringify([{ feature: SlackFeatureType.COMMANDS, enabled: true }]),
        settings: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-1'
      };

      (slackService as any).slackModel = {
        findByTeamId: jest.fn().mockResolvedValue(mockIntegration)
      };

      jest.spyOn(slackService as any, 'buildCompleteIntegration').mockResolvedValue({
        id: 'slack-123',
        teamId: 'T1234567890',
        isActive: true
      });

      jest.spyOn(slackService as any, 'handleStatusCommand').mockResolvedValue({ success: true });
      jest.spyOn(slackService, 'sendSlackMessage').mockResolvedValue({ success: true });

      const result = await slackService.handleSlackCommand(commandRequest);

      expect(result).toBeDefined();
      expect((slackService as any).handleStatusCommand).toHaveBeenCalledWith(
        expect.any(Object),
        commandRequest
      );
    });

    it('should throw error for unknown command', async () => {
      const commandRequest = {
        token: 'test-token',
        team_id: 'T1234567890',
        team_domain: 'testteam',
        channel_id: 'C1234567890',
        channel_name: 'general',
        user_id: 'U1234567890',
        user_name: 'testuser',
        command: '/unknown',
        text: '',
        response_url: 'https://hooks.slack.com/commands/123/456',
        trigger_id: 'trigger-123'
      };

      const mockIntegration = {
        id: 'slack-123',
        organization_id: 'org-1',
        team_id: 'T1234567890',
        is_active: true,
        features: JSON.stringify([{ feature: SlackFeatureType.COMMANDS, enabled: true }]),
        settings: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-1'
      };

      (slackService as any).slackModel = {
        findByTeamId: jest.fn().mockResolvedValue(mockIntegration)
      };

      jest.spyOn(slackService as any, 'buildCompleteIntegration').mockResolvedValue({
        id: 'slack-123',
        teamId: 'T1234567890',
        isActive: true
      });

      await expect(
        slackService.handleSlackCommand(commandRequest)
      ).rejects.toThrow('Unknown command: /unknown');
    });

    it('should throw error for inactive integration', async () => {
      const commandRequest = {
        token: 'test-token',
        team_id: 'T1234567890',
        team_domain: 'testteam',
        channel_id: 'C1234567890',
        channel_name: 'general',
        user_id: 'U1234567890',
        user_name: 'testuser',
        command: '/feedback',
        text: '',
        response_url: 'https://hooks.slack.com/commands/123/456',
        trigger_id: 'trigger-123'
      };

      (slackService as any).slackModel = {
        findByTeamId: jest.fn().mockResolvedValue(null)
      };

      await expect(
        slackService.handleSlackCommand(commandRequest)
      ).rejects.toThrow('Slack integration not found or inactive');
    });
  });

  describe('sendSlackMessage', () => {
    it('should send Slack message successfully', async () => {
      const mockIntegration = {
        id: 'slack-123',
        organizationId: 'org-1',
        name: 'Test Slack Integration',
        teamId: 'T1234567890',
        teamName: 'Test Team',
        botToken: 'xoxb-test-token',
        isActive: true
      };

      const message = {
        channel: 'C1234567890',
        text: 'Test message',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Test message'
            }
          }
        ]
      };

      jest.spyOn(slackService, 'getSlackIntegrationById').mockResolvedValue(mockIntegration as any);

      // Mock fetch for Slack API
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true, message: { ts: '1234567890.123456' } })
      });

      const result = await slackService.sendSlackMessage('slack-123', message);

      expect(result).toBeDefined();
      expect(result.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer xoxb-test-token',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(message)
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Slack message sent', expect.any(Object));
    });

    it('should throw error for inactive integration', async () => {
      const mockIntegration = {
        id: 'slack-123',
        organizationId: 'org-1',
        name: 'Test Slack Integration',
        teamId: 'T1234567890',
        teamName: 'Test Team',
        botToken: 'xoxb-test-token',
        isActive: false
      };

      const message = {
        channel: 'C1234567890',
        text: 'Test message'
      };

      jest.spyOn(slackService, 'getSlackIntegrationById').mockResolvedValue(mockIntegration as any);

      await expect(
        slackService.sendSlackMessage('slack-123', message)
      ).rejects.toThrow('Slack integration is not active');
    });

    it('should handle Slack API errors', async () => {
      const mockIntegration = {
        id: 'slack-123',
        organizationId: 'org-1',
        name: 'Test Slack Integration',
        teamId: 'T1234567890',
        teamName: 'Test Team',
        botToken: 'xoxb-test-token',
        isActive: true
      };

      const message = {
        channel: 'C1234567890',
        text: 'Test message'
      };

      jest.spyOn(slackService, 'getSlackIntegrationById').mockResolvedValue(mockIntegration as any);

      // Mock fetch for Slack API error
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: false, error: 'channel_not_found' })
      });

      await expect(
        slackService.sendSlackMessage('slack-123', message)
      ).rejects.toThrow('Slack API error: channel_not_found');
    });
  });

  describe('processSlackEvent', () => {
    it('should process Slack event for active integrations', async () => {
      const mockIntegrations = [
        {
          id: 'slack-1',
          organization_id: 'org-1',
          team_id: 'T1234567890',
          is_active: true,
          features: JSON.stringify([{ feature: SlackFeatureType.NOTIFICATIONS, enabled: true }]),
          settings: JSON.stringify({
            notifications: {
              cycleCreated: true,
              cycleActivated: false,
              feedbackSubmitted: true,
              feedbackAcknowledged: false
            }
          }),
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user-1'
        }
      ];

      (slackService as any).slackModel = {
        findActiveByOrganization: jest.fn().mockResolvedValue(mockIntegrations)
      };

      jest.spyOn(slackService as any, 'processEventForIntegration').mockResolvedValue(undefined);

      await slackService.processSlackEvent('cycle:created', { cycleId: 'cycle-123' }, 'org-1');

      expect((slackService as any).slackModel.findActiveByOrganization).toHaveBeenCalledWith('org-1');
      expect((slackService as any).processEventForIntegration).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith('Slack event processed', expect.any(Object));
    });

    it('should handle no active integrations gracefully', async () => {
      (slackService as any).slackModel = {
        findActiveByOrganization: jest.fn().mockResolvedValue([])
      };

      await slackService.processSlackEvent('cycle:created', { cycleId: 'cycle-123' }, 'org-1');

      expect(mockLogger.debug).toHaveBeenCalledWith('No active Slack integrations found', expect.any(Object));
    });
  });

  describe('deleteSlackIntegration', () => {
    it('should delete Slack integration successfully', async () => {
      const mockIntegration = {
        id: 'slack-123',
        organization_id: 'org-1',
        name: 'Test Slack Integration'
      };

      (slackService as any).slackModel = {
        findById: jest.fn().mockResolvedValue(mockIntegration),
        delete: jest.fn().mockResolvedValue(true)
      };

      await slackService.deleteSlackIntegration('slack-123', 'user-1');

      expect((slackService as any).slackModel.delete).toHaveBeenCalledWith('slack-123', expect.any(Object));
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('slack:integration_deleted', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('Slack integration deleted', expect.any(Object));
    });

    it('should throw NotFoundError when integration not found', async () => {
      (slackService as any).slackModel = {
        findById: jest.fn().mockResolvedValue(null)
      };

      await expect(
        slackService.deleteSlackIntegration('nonexistent-id', 'user-1')
      ).rejects.toThrow('Slack integration not found');
    });
  });
});
