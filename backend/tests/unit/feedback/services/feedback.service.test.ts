// backend/tests/unit/feedback/services/feedback.service.test.ts

import { FeedbackService } from '../../../../src/modules/feedback/services/feedback.service';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import { Logger } from '../../../../src/shared/utils/logger';

// Mock dependencies
jest.mock('pg');
jest.mock('events');
jest.mock('../../../../src/shared/utils/logger');

describe('FeedbackService', () => {
  let feedbackService: FeedbackService;
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
    } as any;

    // Create service instance
    feedbackService = new FeedbackService(mockDb, mockEventEmitter, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFeedback', () => {
    it('should create feedback successfully', async () => {
      // Mock database client is already set up in beforeEach

      const createRequest = {
        cycleId: 'cycle-123',
        toUserId: 'user-456',
        reviewType: 'peer_review' as any,
        content: {
          overallComment: 'Great work!',
          strengths: ['Communication', 'Problem solving'],
          areasForImprovement: ['Time management'],
          specificExamples: ['Helped team resolve conflict'],
          recommendations: ['Take on more leadership roles'],
          confidential: false,
        },
        ratings: [
          {
            category: 'Communication',
            score: 4,
            maxScore: 5,
            weight: 1,
            comment: 'Excellent communication skills',
          },
        ],
        goals: [
          {
            title: 'Improve time management',
            description: 'Better project planning',
            category: 'performance' as any,
            priority: 'high' as any,
            targetDate: '2024-06-01',
          },
        ],
      };

      // Mock the service methods that would be called
      jest.spyOn(feedbackService as any, 'validateCyclePermission').mockResolvedValue(undefined);
      jest.spyOn(feedbackService as any, 'getFeedbackById').mockResolvedValue({
        id: 'feedback-123',
        cycleId: 'cycle-123',
        fromUserId: 'user-789',
        toUserId: 'user-456',
        reviewType: 'peer_review',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        content: createRequest.content,
        ratings: createRequest.ratings,
        comments: [],
        goals: createRequest.goals,
      });

      const result = await feedbackService.createFeedback('user-789', createRequest);

      expect(result).toBeDefined();
      expect(result.cycleId).toBe('cycle-123');
      expect(result.toUserId).toBe('user-456');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('feedback:created', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('Feedback created', expect.any(Object));
    });

    it('should throw error for self-feedback', async () => {
      const createRequest = {
        cycleId: 'cycle-123',
        toUserId: 'user-789', // Same as fromUserId
        reviewType: 'peer_review' as any,
        content: {
          overallComment: 'Test comment',
          strengths: [],
          areasForImprovement: [],
          specificExamples: [],
          recommendations: [],
        },
        ratings: [],
      };

      await expect(
        feedbackService.createFeedback('user-789', createRequest)
      ).rejects.toThrow('Users cannot give feedback to themselves');
    });
  });

  describe('getFeedbackById', () => {
    it('should return feedback when found', async () => {
      const mockFeedback = {
        id: 'feedback-123',
        cycle_id: 'cycle-123',
        from_user_id: 'user-789',
        to_user_id: 'user-456',
        review_type: 'peer_review',
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock the feedbackModel's findById method
      (feedbackService as any).feedbackModel = {
        findById: jest.fn().mockResolvedValue(mockFeedback),
      };

      jest.spyOn(feedbackService as any, 'buildCompleteFeedback').mockResolvedValue({
        id: 'feedback-123',
        cycleId: 'cycle-123',
        fromUserId: 'user-789',
        toUserId: 'user-456',
        reviewType: 'peer_review',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
        content: {},
        ratings: [],
        comments: [],
        goals: [],
      });

      const result = await feedbackService.getFeedbackById('feedback-123', 'user-789');

      expect(result).toBeDefined();
      expect(result.id).toBe('feedback-123');
    });

    it('should throw NotFoundError when feedback not found', async () => {
      (feedbackService as any).feedbackModel = {
        findById: jest.fn().mockResolvedValue(null),
      };

      await expect(
        feedbackService.getFeedbackById('nonexistent-id', 'user-789')
      ).rejects.toThrow('Feedback not found');
    });
  });

  describe('submitFeedback', () => {
    it('should submit draft feedback successfully', async () => {
      const mockFeedback = {
        id: 'feedback-123',
        from_user_id: 'user-789',
        status: 'draft',
      };

      (feedbackService as any).feedbackModel = {
        findById: jest.fn().mockResolvedValue(mockFeedback),
        update: jest.fn().mockResolvedValue({ ...mockFeedback, status: 'submitted' }),
      };

      jest.spyOn(feedbackService as any, 'validateFeedbackCompleteness').mockResolvedValue(undefined);
      jest.spyOn(feedbackService as any, 'getFeedbackById').mockResolvedValue({
        id: 'feedback-123',
        status: 'submitted',
      } as any);

      const result = await feedbackService.submitFeedback('feedback-123', 'user-789');

      expect(result).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('feedback:submitted', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('Feedback submitted', expect.any(Object));
    });

    it('should throw error when trying to submit non-draft feedback', async () => {
      const mockFeedback = {
        id: 'feedback-123',
        from_user_id: 'user-789',
        status: 'completed',
      };

      (feedbackService as any).feedbackModel = {
        findById: jest.fn().mockResolvedValue(mockFeedback),
      };

      await expect(
        feedbackService.submitFeedback('feedback-123', 'user-789')
      ).rejects.toThrow('Only draft feedback can be submitted');
    });
  });

  describe('updateFeedback', () => {
    it('should update feedback content and status', async () => {
      const id = 'fb-1';
      const requestingUserId = 'author-1';
      const existing = {
        id,
        from_user_id: requestingUserId,
        status: 'draft',
      };

      (feedbackService as any).feedbackModel = {
        findById: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue({ ...existing, status: 'submitted' }),
      };

      (feedbackService as any).contentModel = {
        update: jest.fn().mockResolvedValue({}),
      };

      (feedbackService as any).ratingService = {
        updateForFeedback: jest.fn().mockResolvedValue(undefined),
      };

      (feedbackService as any).goalService = {
        updateForFeedback: jest.fn().mockResolvedValue(undefined),
      };

      jest.spyOn(feedbackService as any, 'getFeedbackById').mockResolvedValue({ id, status: 'submitted' });

      const updates: any = {
        status: 'submitted',
        content: { overallComment: 'Updated comment' },
        ratings: [],
        goals: [],
      };

      const result = await feedbackService.updateFeedback(id, updates, requestingUserId);
      expect(result).toBeDefined();
      expect((feedbackService as any).feedbackModel.update).toHaveBeenCalled();
      expect((feedbackService as any).contentModel.update).toHaveBeenCalled();
    });

    it('should forbid updating by non-author', async () => {
      const id = 'fb-1';
      (feedbackService as any).feedbackModel = {
        findById: jest.fn().mockResolvedValue({ id, from_user_id: 'someone-else', status: 'draft' }),
      };

      await expect(
        feedbackService.updateFeedback(id, {}, 'author-1' as any)
      ).rejects.toThrow('Only feedback author can update feedback');
    });
  });

  describe('deleteFeedback', () => {
    it('should delete draft feedback by author', async () => {
      const id = 'fb-1';
      const requestingUserId = 'author-1';
      (feedbackService as any).feedbackModel = {
        findById: jest.fn().mockResolvedValue({ id, from_user_id: requestingUserId, status: 'draft' }),
        delete: jest.fn().mockResolvedValue(true),
      };

      (feedbackService as any).commentService = {
        deleteByFeedbackId: jest.fn().mockResolvedValue(undefined),
      };
      (feedbackService as any).goalService = {
        deleteByFeedbackId: jest.fn().mockResolvedValue(undefined),
      };
      (feedbackService as any).ratingService = {
        deleteByFeedbackId: jest.fn().mockResolvedValue(undefined),
      };
      (feedbackService as any).contentModel = {
        delete: jest.fn().mockResolvedValue(true),
      };

      await expect(
        feedbackService.deleteFeedback(id, requestingUserId)
      ).resolves.toBeUndefined();
      expect((feedbackService as any).feedbackModel.delete).toHaveBeenCalledWith(id, expect.anything());
    });

    it('should forbid deletion by non-author', async () => {
      const id = 'fb-1';
      (feedbackService as any).feedbackModel = {
        findById: jest.fn().mockResolvedValue({ id, from_user_id: 'other', status: 'draft' }),
      };

      await expect(
        feedbackService.deleteFeedback(id, 'author-1')
      ).rejects.toThrow('Only feedback author can delete feedback');
    });
  });
});
