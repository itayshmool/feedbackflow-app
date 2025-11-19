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
    // Check if it's a mock token (format: mock-jwt-token-EMAIL-TIMESTAMP)
    if (token.startsWith('mock-jwt-token-')) {
      // Extract email from mock token
      const tokenParts = token.split('-');
      const emailIndex = tokenParts.findIndex((part: string) => part.includes('@'));
      const email = emailIndex >= 0 ? tokenParts.slice(emailIndex).join('-').split('-')[0] : null;
      
      if (!email) {
        return res.status(401).json({
          success: false,
          error: 'Invalid mock token format'
        });
      }
      
      // Set user from extracted email (mock authentication)
      (req as any).user = {
        id: email, // Use email as ID for mock
        email: email,
        name: email.split('@')[0],
        roles: ['admin', 'employee'] // Mock roles
      };
      
      next();
    } else {
      // Real JWT verification
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
    }
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
