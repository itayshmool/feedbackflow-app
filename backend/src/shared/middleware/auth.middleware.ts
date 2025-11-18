import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../../modules/auth/services/jwt.service.js';

const jwtService = new JwtService(process.env.JWT_SECRET || 'changeme');

async function authenticateTokenAsync(req: Request, res: Response, next: NextFunction) {
  // Read token from cookie instead of Authorization header
  const token = req.cookies?.authToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - No token in cookie'
    });
  }
  try {
    const payload = jwtService.verify(token);

    // Fetch user data from database if needed
    // For now, use JWT payload directly
    (req as any).user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      roles: payload.roles || []
    };

    next();
  } catch (error) {
    console.error('🔍 Auth middleware - token verification failed:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

// Wrapper function to handle async middleware in Express
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  authenticateTokenAsync(req, res, next).catch(next);
}
