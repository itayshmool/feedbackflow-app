// backend/src/modules/auth/controllers/google-auth.controller.ts

import { Request, Response, NextFunction } from 'express';
import { GoogleOAuthService } from '../services/google-oauth.service.js';
import { JwtService } from '../services/jwt.service.js';
import { UserService } from '../services/user.service.js';
import { RefreshTokenModel } from '../models/refresh-token.model.js';
import { getAccessTokenCookieOptions, getRefreshTokenCookieOptions } from '../../../shared/utils/cookie-helper.js';

// Allowed email domain for Google login (configurable via env var)
const ALLOWED_EMAIL_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || 'wix.com';

export class GoogleAuthController {
  private refreshTokenModel = new RefreshTokenModel();

  constructor(
    private googleService: GoogleOAuthService,
    private jwtService: JwtService,
    private userService: UserService
  ) {}

  /**
   * Validate that email belongs to allowed domain (wix.com by default)
   * Returns error message if invalid, null if valid
   */
  private validateEmailDomain(email: string): string | null {
    const emailDomain = email.split('@')[1]?.toLowerCase();
    
    if (emailDomain !== ALLOWED_EMAIL_DOMAIN) {
      console.log(`🚫 Login rejected: ${email} is not from @${ALLOWED_EMAIL_DOMAIN}`);
      return `Access restricted to @${ALLOWED_EMAIL_DOMAIN} organization members only.`;
    }
    
    return null;
  }

  // Helper to transform UserService user to frontend format
  private transformUser(user: { id: string; email: string; name?: string; picture?: string; roles: string[] }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name || 'User',
      picture: user.picture,
      roles: user.roles,
      organizationId: '1', // Default organization
      organizationName: undefined,
      department: undefined,
      position: undefined,
      isActive: true,
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Issue both access token (15 min) and refresh token (7 days) for a user
   */
  private async issueTokens(req: Request, res: Response, user: { id: string; email: string; name?: string; picture?: string; roles: string[]; organizationId?: string }) {
    // Generate access token (short-lived - 15 minutes)
    const accessToken = this.jwtService.signAccessToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      roles: user.roles,
      organizationId: user.organizationId,
    });

    // Generate refresh token (long-lived - 7 days)
    const refreshToken = this.jwtService.signRefreshToken({
      sub: user.id,
      email: user.email,
    });

    // Store refresh token hash in database for revocation capability
    const tokenHash = this.jwtService.hashToken(refreshToken);
    await this.refreshTokenModel.create({
      userId: user.id,
      tokenHash,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });

    // Set cookies
    res.cookie('authToken', accessToken, getAccessTokenCookieOptions(req));
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions(req));

    console.log(`🔐 Issued tokens for user ${user.email}: access (15m), refresh (7d)`);
  }

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { idToken } = req.body as { idToken: string };
      if (!idToken) return res.status(400).json({ message: 'idToken is required' });

      const payload = await this.googleService.verifyIdToken(idToken);
      const email = payload.email as string;
      if (!email) return res.status(400).json({ message: 'Google token missing email' });

      // Validate email domain - block non-wix.com users
      const domainError = this.validateEmailDomain(email);
      if (domainError) {
        return res.status(403).json({ 
          success: false,
          message: domainError,
          code: 'DOMAIN_NOT_ALLOWED'
        });
      }

      const user = await this.userService.upsertGoogleUser({
        email,
        name: payload.name || undefined,
        picture: payload.picture || undefined,
      });

      // Issue both access and refresh tokens
      await this.issueTokens(req, res, user);

      // Return only user (NO TOKEN in response body)
      const transformedUser = this.transformUser(user);
      res.json({ user: transformedUser });
    } catch (err) {
      next(err);
    }
  };

  // Mock login for local testing (bypasses Google verification but still enforces domain restriction)
  mockLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name } = req.body as { email: string; name?: string };
      if (!email) return res.status(400).json({ message: 'email is required' });

      // Validate email domain - block non-wix.com users (even in mock login)
      const domainError = this.validateEmailDomain(email);
      if (domainError) {
        return res.status(403).json({ 
          success: false,
          message: domainError,
          code: 'DOMAIN_NOT_ALLOWED'
        });
      }

      const user = await this.userService.upsertGoogleUser({
        email,
        name: name || 'Test User',
        picture: 'https://via.placeholder.com/150',
      });

      // Issue both access and refresh tokens
      await this.issueTokens(req, res, user);

      // Return only user (NO TOKEN in response body)
      const transformedUser = this.transformUser(user);
      res.json({ user: transformedUser });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Refresh access token using refresh token
   * Returns new access token (refresh token stays the same)
   */
  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ 
          message: 'Refresh token required',
          code: 'REFRESH_TOKEN_MISSING'
        });
      }

      // Verify JWT refresh token
      let payload;
      try {
        payload = this.jwtService.verifyRefreshToken(refreshToken);
      } catch (err) {
        console.log('🔐 Refresh token JWT verification failed:', err);
        return res.status(401).json({ 
          message: 'Invalid refresh token',
          code: 'REFRESH_TOKEN_INVALID'
        });
      }

      // Verify token exists in database and is not revoked
      const tokenHash = this.jwtService.hashToken(refreshToken);
      const storedToken = await this.refreshTokenModel.findValidToken(tokenHash);
      if (!storedToken) {
        console.log('🔐 Refresh token not found in database or revoked');
        return res.status(401).json({ 
          message: 'Refresh token revoked or expired',
          code: 'REFRESH_TOKEN_REVOKED'
        });
      }

      // Update last accessed time
      await this.refreshTokenModel.updateLastAccessed(tokenHash);

      // Get fresh user data from database
      const user = await this.userService.findByEmail(payload.email);
      if (!user) {
        return res.status(401).json({ 
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Issue new access token only (keep same refresh token)
      const accessToken = this.jwtService.signAccessToken({
        sub: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        roles: user.roles,
        organizationId: user.organizationId,
      });

      res.cookie('authToken', accessToken, getAccessTokenCookieOptions(req));
      
      console.log(`🔐 Refreshed access token for user ${user.email}`);

      res.json({ 
        success: true,
        message: 'Token refreshed',
        expiresIn: '15m'
      });
    } catch (err) {
      next(err);
    }
  };

  // Get current authenticated user
  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.authToken;
      if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const payload = this.jwtService.verify(token);

      // Get user from service
      const user = await this.userService.findByEmail(payload.email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return user in the format expected by frontend (wrapped in data for consistency)
      const transformedUser = this.transformUser(user);
      res.json({ 
        data: transformedUser
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      }
      if (err instanceof Error && err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token expired',
          code: 'ACCESS_TOKEN_EXPIRED'
        });
      }
      next(err);
    }
  };

  // Logout - clear cookies and revoke refresh token
  logout = async (req: Request, res: Response) => {
    // Revoke refresh token in database if present
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const tokenHash = this.jwtService.hashToken(refreshToken);
        await this.refreshTokenModel.revoke(tokenHash);
        console.log('🔐 Revoked refresh token on logout');
      } catch (err) {
        console.error('🔐 Failed to revoke refresh token:', err);
        // Continue with logout even if revocation fails
      }
    }

    // Clear both cookies
    res.clearCookie('authToken', getAccessTokenCookieOptions(req));
    res.clearCookie('refreshToken', getRefreshTokenCookieOptions(req));
    res.json({ message: 'Logged out successfully' });
  };
}
