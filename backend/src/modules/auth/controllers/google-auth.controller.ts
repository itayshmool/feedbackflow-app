// backend/src/modules/auth/controllers/google-auth.controller.ts

import { Request, Response, NextFunction } from 'express';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { JwtService } from '../services/jwt.service';
import { UserService } from '../services/user.service';

export class GoogleAuthController {
  constructor(
    private googleService: GoogleOAuthService,
    private jwtService: JwtService,
    private userService: UserService
  ) {}

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

      res.json({ token, user });
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

      res.json({ token, user });
    } catch (err) {
      next(err);
    }
  };
}


