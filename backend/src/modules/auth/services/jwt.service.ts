// backend/src/modules/auth/services/jwt.service.ts

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  roles?: string[];
  // Organization ID for org-scoped admins (null for super_admin)
  adminOrganizationId?: string | null;
  // Organization slug for convenience
  adminOrganizationSlug?: string | null;
}

export interface RefreshTokenPayload {
  sub: string;
  email: string;
  type: 'refresh';
}

// Token expiration constants
export const ACCESS_TOKEN_EXPIRY = '15m';  // 15 minutes
export const REFRESH_TOKEN_EXPIRY = '7d';  // 7 days
export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;  // 15 minutes in ms
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days in ms

export class JwtService {
  private refreshSecret: string;

  constructor(private secret: string) {
    // Use a derived secret for refresh tokens (different from access tokens)
    this.refreshSecret = crypto.createHash('sha256').update(secret + '_refresh').digest('hex');
  }

  // Create access token (short-lived - 15 minutes)
  signAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: ACCESS_TOKEN_EXPIRY });
  }

  // Create refresh token (long-lived - 7 days)
  signRefreshToken(payload: Pick<JwtPayload, 'sub' | 'email'>): string {
    const refreshPayload: RefreshTokenPayload = {
      sub: payload.sub,
      email: payload.email,
      type: 'refresh',
    };
    return jwt.sign(refreshPayload, this.refreshSecret, { expiresIn: REFRESH_TOKEN_EXPIRY });
  }

  // Backward compatibility - defaults to access token expiry
  sign(payload: JwtPayload, expiresIn: string | number = ACCESS_TOKEN_EXPIRY): string {
    return jwt.sign(payload, this.secret, { expiresIn: expiresIn as any });
  }

  verify(token: string): JwtPayload {
    return jwt.verify(token, this.secret) as JwtPayload;
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const payload = jwt.verify(token, this.refreshSecret) as RefreshTokenPayload;
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return payload;
  }

  // Generate a hash for storing refresh token in database
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
