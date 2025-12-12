// backend/src/modules/feedback/services/comment.service.ts
/**
 * @deprecated STUB IMPLEMENTATION - NOT USED IN PRODUCTION
 * 
 * Methods return empty arrays/null. Production comment functionality
 * is implemented in real-database-server.ts with actual SQL queries.
 */

import { Pool, PoolClient } from 'pg';
import { CommentModel, CreateCommentRequest } from '../types/feedback.types.js';

export class CommentService {
  constructor(private db: Pool) {}

  async findByFeedbackId(
    feedbackId: string,
    client?: PoolClient
  ): Promise<CommentModel[]> {
    // Placeholder; replace with SELECT query
    return [];
  }

  async addComment(
    feedbackId: string,
    userId: string,
    request: CreateCommentRequest,
    client?: PoolClient
  ): Promise<CommentModel> {
    const now = new Date();
    return {
      id: 'comment_' + Math.random().toString(36).slice(2),
      feedback_id: feedbackId,
      user_id: userId,
      parent_comment_id: request.parentCommentId,
      content: request.content,
      is_private: request.isPrivate ?? false,
      created_at: now,
      updated_at: now
    } as CommentModel;
  }

  async updateComment(
    commentId: string,
    content: string,
    client?: PoolClient
  ): Promise<CommentModel | null> {
    // Placeholder; implement UPDATE
    return null;
  }

  async deleteComment(
    commentId: string,
    client?: PoolClient
  ): Promise<boolean> {
    // Placeholder; implement DELETE
    return true;
  }

  async deleteByFeedbackId(
    feedbackId: string,
    client?: PoolClient
  ): Promise<void> {
    // Placeholder; implement DELETE by feedback id
    return;
  }
}


