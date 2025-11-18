// backend/src/modules/auth/middleware/google-auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.service';

const jwtService = new JwtService(process.env.JWT_SECRET || 'changeme');

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Read token from cookie instead of Authorization header
  const token = req.cookies?.authToken;
  
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized - No token in cookie' });
  }
  
  try {
    const payload = jwtService.verify(token);
    (req as any).user = { 
      id: payload.sub, 
      email: payload.email, 
      name: payload.name,
      roles: payload.roles || []
    };
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}


