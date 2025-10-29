// backend/src/modules/auth/middleware/google-auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.service';

const jwtService = new JwtService(process.env.JWT_SECRET || 'changeme');

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const payload = jwtService.verify(token);
    (req as any).user = { id: payload.sub, email: payload.email, roles: payload.roles };
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}


