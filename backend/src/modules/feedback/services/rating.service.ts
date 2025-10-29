// backend/src/modules/feedback/services/rating.service.ts

import { Pool, PoolClient } from 'pg';
import { RatingModel, CreateRatingRequest, UpdateRatingRequest } from '../types/feedback.types.js';

export class RatingService {
  constructor(private db: Pool) {}

  async create(
    feedbackId: string,
    request: CreateRatingRequest,
    client?: PoolClient
  ): Promise<RatingModel> {
    const now = new Date();
    return {
      id: 'rating_' + Math.random().toString(36).slice(2),
      feedback_id: feedbackId,
      category: request.category,
      subcategory: request.subcategory,
      score: request.score,
      max_score: request.maxScore,
      weight: request.weight ?? 1,
      comment: request.comment,
      created_at: now
    } as RatingModel;
  }

  async updateForFeedback(
    feedbackId: string,
    updates: UpdateRatingRequest[],
    client?: PoolClient
  ): Promise<void> {
    // Placeholder; implement upsert/merge with proper queries
    return;
  }

  async findByFeedbackId(
    feedbackId: string,
    client?: PoolClient
  ): Promise<RatingModel[]> {
    // Placeholder; replace with SELECT query
    return [];
  }

  async deleteByFeedbackId(
    feedbackId: string,
    client?: PoolClient
  ): Promise<void> {
    // Placeholder; replace with DELETE query
    return;
  }
}


