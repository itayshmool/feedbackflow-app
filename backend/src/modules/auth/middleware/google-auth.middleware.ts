// backend/src/modules/auth/middleware/google-auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.service';

// Fail fast if JWT_SECRET is not properly configured
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'changeme') {
  throw new Error(
    'JWT_SECRET environment variable must be set to a secure random value. ' +
    'Generate one with: openssl rand -base64 32'
  );
}
const jwtService = new JwtService(JWT_SECRET);

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


