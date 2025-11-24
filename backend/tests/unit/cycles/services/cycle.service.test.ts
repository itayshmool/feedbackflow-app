// backend/tests/unit/cycles/services/cycle.service.test.ts

import { CycleService } from '../../../../src/modules/cycles/services/cycle.service';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import { Logger } from '../../../../src/shared/utils/logger';
import { CycleType, CycleStatus } from '../../../../src/modules/cycles/types/cycle.types';

// Mock dependencies
jest.mock('pg');
jest.mock('events');
jest.mock('../../../../src/shared/utils/logger');

describe('CycleService', () => {
  let cycleService: CycleService;
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
    cycleService = new CycleService(mockDb, mockEventEmitter, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCycle', () => {
    it('should create cycle successfully', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const endDate = new Date(futureDate);
      endDate.setMonth(endDate.getMonth() + 3);

      const createRequest = {
        name: 'Q1 2024 Review',
        description: 'Quarterly performance review',
        startDate: futureDate.toISOString(),
        endDate: endDate.toISOString(),
        type: CycleType.QUARTERLY,
        participants: [
          {
            userId: 'user-1',
            role: 'employee' as any,
            metadata: { department: 'Engineering' }
          }
        ]
      };

      // Mock the service methods that would be called
      jest.spyOn(cycleService as any, 'getCycleById').mockResolvedValue({
        id: 'cycle-123',
        name: 'Q1 2024 Review',
        organizationId: 'org-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        status: CycleStatus.DRAFT,
        type: CycleType.QUARTERLY,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1'
      });

      const result = await cycleService.createCycle('org-1', createRequest, 'user-1');

      expect(result).toBeDefined();
      expect(result.name).toBe('Q1 2024 Review');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('cycle:created', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('Cycle created', expect.any(Object));
    });

    it('should throw error for invalid dates', async () => {
      const createRequest = {
        name: 'Invalid Cycle',
        startDate: '2024-03-31',
        endDate: '2024-01-01', // End before start
        type: CycleType.QUARTERLY
      };

      await expect(
        cycleService.createCycle('org-1', createRequest, 'user-1')
      ).rejects.toThrow('Start date must be before end date');
    });

    it('should throw error for past start date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const futureEndDate = new Date();
      futureEndDate.setFullYear(futureEndDate.getFullYear() + 1);
      
      const createRequest = {
        name: 'Past Cycle',
        startDate: pastDate.toISOString(),
        endDate: futureEndDate.toISOString(),
        type: CycleType.QUARTERLY
      };

      await expect(
        cycleService.createCycle('org-1', createRequest, 'user-1')
      ).rejects.toThrow('Start date cannot be in the past');
    });
  });

  describe('getCycleById', () => {
    it('should return cycle when found', async () => {
      const mockCycle = {
        id: 'cycle-123',
        name: 'Test Cycle',
        organization_id: 'org-1',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-03-31'),
        status: CycleStatus.ACTIVE,
        type: CycleType.QUARTERLY,
        settings: '{}',
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-1'
      };

      (cycleService as any).cycleModel = {
        findById: jest.fn().mockResolvedValue(mockCycle),
      };

      jest.spyOn(cycleService as any, 'buildCompleteCycle').mockResolvedValue({
        id: 'cycle-123',
        name: 'Test Cycle',
        organizationId: 'org-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        status: CycleStatus.ACTIVE,
        type: CycleType.QUARTERLY,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1'
      });

      const result = await cycleService.getCycleById('cycle-123', 'user-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('cycle-123');
    });

    it('should throw NotFoundError when cycle not found', async () => {
      (cycleService as any).cycleModel = {
        findById: jest.fn().mockResolvedValue(null),
      };

      await expect(
        cycleService.getCycleById('nonexistent-id', 'user-1')
      ).rejects.toThrow('Cycle not found');
    });
  });

  describe('activateCycle', () => {
    it('should activate draft cycle successfully', async () => {
      const mockCycle = {
        id: 'cycle-123',
        status: CycleStatus.DRAFT
      };

      jest.spyOn(cycleService, 'getCycleById').mockResolvedValue(mockCycle as any);
      jest.spyOn(cycleService, 'updateCycle').mockResolvedValue({
        ...mockCycle,
        status: CycleStatus.ACTIVE
      } as any);

      const result = await cycleService.activateCycle('cycle-123', 'user-1');

      expect(result.status).toBe(CycleStatus.ACTIVE);
      expect(cycleService.updateCycle).toHaveBeenCalledWith(
        'cycle-123',
        { status: CycleStatus.ACTIVE },
        'user-1'
      );
    });

    it('should throw error when trying to activate non-draft cycle', async () => {
      const mockCycle = {
        id: 'cycle-123',
        status: CycleStatus.ACTIVE
      };

      jest.spyOn(cycleService, 'getCycleById').mockResolvedValue(mockCycle as any);

      await expect(
        cycleService.activateCycle('cycle-123', 'user-1')
      ).rejects.toThrow('Only draft cycles can be activated');
    });
  });

  describe('validateCyclePermission', () => {
    it('should validate cycle permission successfully', async () => {
      const mockCycle = {
        id: 'cycle-123',
        status: CycleStatus.ACTIVE
      };

      (cycleService as any).cycleModel = {
        findById: jest.fn().mockResolvedValue(mockCycle),
      };

      (cycleService as any).participantModel = {
        findByCycleAndUser: jest.fn()
          .mockResolvedValueOnce({ status: 'active' }) // fromUser
          .mockResolvedValueOnce({ status: 'active' }) // toUser
      };

      const result = await cycleService.validateCyclePermission(
        'cycle-123',
        'user-1',
        'user-2'
      );

      expect(result).toBe(true);
    });

    it('should throw error for inactive cycle', async () => {
      const mockCycle = {
        id: 'cycle-123',
        status: CycleStatus.CLOSED
      };

      (cycleService as any).cycleModel = {
        findById: jest.fn().mockResolvedValue(mockCycle),
      };

      await expect(
        cycleService.validateCyclePermission('cycle-123', 'user-1', 'user-2')
      ).rejects.toThrow('Cycle is not active');
    });
  });
});
