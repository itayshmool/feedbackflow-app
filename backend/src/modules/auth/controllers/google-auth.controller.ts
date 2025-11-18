// backend/src/modules/auth/controllers/google-auth.controller.ts

import { Request, Response, NextFunction } from 'express';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { JwtService } from '../services/jwt.service';
import { UserService } from '../services/user.service';
import { getCookieOptions } from '../../../shared/utils/cookie-helper.js';

export class GoogleAuthController {
  constructor(
    private googleService: GoogleOAuthService,
    private jwtService: JwtService,
    private userService: UserService
  ) {}

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

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { idToken } = req.body as { idToken: string };
      if (!idToken) return res.status(400).json({ message: 'idToken is required' });

      const payload = await this.googleService.verifyIdToken(idToken);
      const email = payload.email as string;
      if (!email) return res.status(400).json({ message: 'Google token missing email' });

      const user = await this.userService.upsertGoogleUser({
        email,
        name: payload.name || undefined,
        picture: payload.picture || undefined,
      });

      const token = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        roles: user.roles,
      });

      // Set cookie with dynamic domain
      const cookieOptions = getCookieOptions(req);
      res.cookie('authToken', token, cookieOptions);

      // Return only user (NO TOKEN)
      const transformedUser = this.transformUser(user);
      res.json({ user: transformedUser });
    } catch (err) {
      next(err);
    }
  };

  // Mock login for local testing (bypasses Google verification)
  mockLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name } = req.body as { email: string; name?: string };
      if (!email) return res.status(400).json({ message: 'email is required' });

      const user = await this.userService.upsertGoogleUser({
        email,
        name: name || 'Test User',
        picture: 'https://via.placeholder.com/150',
      });

      const token = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        roles: user.roles,
      });

      // Set cookie with dynamic domain
      const cookieOptions = getCookieOptions(req);
      res.cookie('authToken', token, cookieOptions);

      // Return only user (NO TOKEN)
      const transformedUser = this.transformUser(user);
      res.json({ user: transformedUser });
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
        return res.status(401).json({ message: 'Token expired' });
      }
      next(err);
    }
  };

  // Logout - clear cookie
  logout = (req: Request, res: Response) => {
    const cookieOptions = getCookieOptions(req);
    res.clearCookie('authToken', cookieOptions);
    res.json({ message: 'Logged out successfully' });
  };
}


