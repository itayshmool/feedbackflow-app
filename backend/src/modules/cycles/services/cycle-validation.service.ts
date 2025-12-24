// backend/src/modules/cycles/services/cycle-validation.service.ts

import { Pool } from 'pg';
import { CycleService } from './cycle.service';
import { ValidationError } from '../../../shared/utils/errors';

export class CycleValidationService {
  constructor(
    private db: Pool,
    private cycleService: CycleService
  ) {}

  async validateFeedbackPermission(
    cycleId: string,
    fromUserId: string,
    toUserId: string,
    reviewType: string,
    organizationId: string
  ): Promise<boolean> {
    try {
      // Check if cycle exists and is active
      await this.cycleService.validateCyclePermission(cycleId, fromUserId, toUserId);
      
      // Get cycle details for additional validation (with organization filter)
      const cycle = await this.cycleService.getCycleById(cycleId, fromUserId, organizationId);
      
      // Validate review type against cycle settings
      this.validateReviewType(cycle.settings, reviewType);
      
      // Validate self-review permission
      if (fromUserId === toUserId && !cycle.settings.allowSelfReview) {
        throw new ValidationError('Self-review is not allowed in this cycle');
      }
      
      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Invalid cycle or user permissions');
    }
  }

  async validateCycleAccess(
    cycleId: string,
    userId: string,
    organizationId: string,
    requiredRole?: string
  ): Promise<boolean> {
    try {
      const cycle = await this.cycleService.getCycleById(cycleId, userId, organizationId);
      
      if (requiredRole) {
        // TODO: Implement role-based access validation
        // This would check if the user has the required role in the organization
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async validateCycleStatus(cycleId: string, userId: string, organizationId: string, allowedStatuses: string[]): Promise<boolean> {
    try {
      const cycle = await this.cycleService.getCycleById(cycleId, userId, organizationId);
      
      if (!allowedStatuses.includes(cycle.status)) {
        throw new ValidationError(`Cycle must be in one of these statuses: ${allowedStatuses.join(', ')}`);
      }
      
      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Invalid cycle status');
    }
  }

  private validateReviewType(settings: any, reviewType: string): void {
    const typeMap: Record<string, string> = {
      'self_assessment': 'allowSelfReview',
      'peer_review': 'allowPeerReview',
      'manager_review': 'allowManagerReview',
      'upward_review': 'allowUpwardReview'
    };
    
    const settingKey = typeMap[reviewType];
    if (settingKey && !settings[settingKey]) {
      throw new ValidationError(`${reviewType} is not allowed in this cycle`);
    }
  }
}
