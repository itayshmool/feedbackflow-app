// backend/src/modules/feedback/models/feedback.model.ts
/**
 * @deprecated STUB IMPLEMENTATION - NOT USED IN PRODUCTION
 * 
 * This model contains placeholder methods that return empty/null values.
 * Production feedback functionality is implemented directly in
 * real-database-server.ts with actual SQL queries.
 * 
 * Methods like findById(), find(), update(), delete() are stubs
 * that don't actually query the database.
 * 
 * Only kept for legacy test compatibility.
 */

import { Pool, PoolClient } from 'pg';
import { FeedbackModel, FeedbackFilters, FeedbackStatus } from '../types/feedback.types.js';

export class FeedbackModelClass {
  constructor(private db: Pool) {}

  async create(
    data: Omit<FeedbackModel, 'id' | 'created_at' | 'updated_at'>,
    client?: PoolClient
  ): Promise<FeedbackModel> {
    const now = new Date();
    return {
      id: 'fb_' + Math.random().toString(36).slice(2),
      created_at: now,
      updated_at: now,
      ...data
    } as FeedbackModel;
  }

  async findById(id: string, client?: PoolClient): Promise<FeedbackModel | null> {
    // Placeholder; implement SELECT by id
    return null;
  }

  async findWithFilters(
    filters: FeedbackFilters,
    page: number,
    limit: number,
    client?: PoolClient
  ): Promise<{ feedbacks: FeedbackModel[]; total: number }> {
    // Placeholder; implement filtered SELECT with pagination
    return { feedbacks: [], total: 0 };
  }

  async update(
    id: string,
    updates: Partial<FeedbackModel>,
    client?: PoolClient
  ): Promise<FeedbackModel | null> {
    // Placeholder; implement UPDATE
    return null;
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    // Placeholder; implement DELETE
    return true;
  }

  async getStatsByCycle(cycleId: string, client?: PoolClient): Promise<any> {
    // Placeholder stats
    return {
      totalFeedback: 0,
      completedFeedback: 0,
      pendingFeedback: 0
    };
  }

  async getStatsByUser(userId: string, client?: PoolClient): Promise<any> {
    // Placeholder stats
    return {
      totalReceived: 0,
      pendingToComplete: 0
    };
  }
}


