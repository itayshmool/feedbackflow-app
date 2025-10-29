// backend/src/modules/feedback/services/goal.service.ts

import { Pool, PoolClient } from 'pg';
import { GoalModel, UpdateGoalRequest, CreateGoalRequest } from '../types/feedback.types.js';
import { GoalModelClass } from '../models/goal.model.js';

export class GoalService {
  private goalModel: GoalModelClass;

  constructor(db: Pool) {
    this.goalModel = new GoalModelClass(db);
  }

  async create(
    feedbackId: string,
    request: CreateGoalRequest,
    client?: PoolClient
  ): Promise<GoalModel> {
    const data: Omit<GoalModel, 'id' | 'created_at' | 'updated_at'> = {
      feedback_id: feedbackId,
      title: request.title,
      description: request.description,
      category: request.category,
      priority: request.priority,
      target_date: new Date(request.targetDate),
      status:  'not_started' as any,
      progress: 0
    };
    return this.goalModel.create(data, client);
  }

  async updateForFeedback(
    feedbackId: string,
    updates: UpdateGoalRequest[],
    client?: PoolClient
  ): Promise<void> {
    // Minimal scaffold; implement real upsert/merge later
    return;
  }

  async findByFeedbackId(
    feedbackId: string,
    client?: PoolClient
  ): Promise<GoalModel[]> {
    return this.goalModel.findByFeedbackId(feedbackId, client);
  }

  async deleteByFeedbackId(
    feedbackId: string,
    client?: PoolClient
  ): Promise<void> {
    return this.goalModel.deleteByFeedbackId(feedbackId, client);
  }
}


