// backend/src/modules/auth/models/refresh-token.model.ts

import { pool } from '../../../config/database.js';
import { REFRESH_TOKEN_MAX_AGE_MS } from '../services/jwt.service.js';

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  is_active: boolean;
  created_at: Date;
  user_agent?: string;
  ip_address?: string;
}

export class RefreshTokenModel {
  /**
   * Store refresh token in user_sessions table
   */
  async create(data: {
    userId: string;
    tokenHash: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<string> {
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);
    
    const result = await pool.query(
      `INSERT INTO user_sessions (user_id, session_token, expires_at, user_agent, ip_address, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`,
      [data.userId, data.tokenHash, expiresAt, data.userAgent, data.ipAddress]
    );
    return result.rows[0].id;
  }

  /**
   * Find a valid (non-expired, non-revoked) refresh token
   */
  async findValidToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const result = await pool.query(
      `SELECT id, user_id, session_token as token_hash, expires_at, is_active, created_at, user_agent, ip_address
       FROM user_sessions
       WHERE session_token = $1
         AND is_active = true
         AND expires_at > NOW()`,
      [tokenHash]
    );
    return result.rows[0] || null;
  }

  /**
   * Revoke a specific refresh token (e.g., on logout)
   */
  async revoke(tokenHash: string): Promise<void> {
    await pool.query(
      `UPDATE user_sessions SET is_active = false WHERE session_token = $1`,
      [tokenHash]
    );
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   */
  async revokeAllForUser(userId: string): Promise<void> {
    await pool.query(
      `UPDATE user_sessions SET is_active = false WHERE user_id = $1`,
      [userId]
    );
  }

  /**
   * Update the last_accessed_at timestamp for a token
   */
  async updateLastAccessed(tokenHash: string): Promise<void> {
    await pool.query(
      `UPDATE user_sessions SET last_accessed_at = NOW() WHERE session_token = $1`,
      [tokenHash]
    );
  }

  /**
   * Clean up expired tokens (can be run periodically)
   */
  async cleanupExpired(): Promise<number> {
    const result = await pool.query(
      `DELETE FROM user_sessions WHERE expires_at < NOW() RETURNING id`
    );
    return result.rowCount || 0;
  }
}

