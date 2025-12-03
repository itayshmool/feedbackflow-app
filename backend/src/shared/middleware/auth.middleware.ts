import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../../modules/auth/services/jwt.service.js';

const jwtService = new JwtService(process.env.JWT_SECRET || 'changeme');

async function authenticateTokenAsync(req: Request, res: Response, next: NextFunction) {
  // Read token from cookie instead of Authorization header
  const token = req.cookies?.authToken;
  console.log('🔍 Auth middleware - received token:', token?.substring(0, 50) + '...', 
              'hostname:', req.hostname, 'host:', req.get('host'));

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - No token in cookie'
    });
  }
  
  try {
    // Handle mock tokens (format: mock-jwt-token-EMAIL-TIMESTAMP)
    // ONLY allowed in development environment
    if (process.env.NODE_ENV !== 'production' && token.startsWith('mock-jwt-token-')) {
      const parts = token.split('-');
      if (parts.length >= 4) {
        // Extract email from token (everything between 'mock-jwt-token-' and last '-TIMESTAMP')
        const email = parts.slice(3, -1).join('-');
        
        // Assign mock user with admin + employee roles for testing
        // Note: Using a mock organization ID - in production this should be fetched from database
        (req as any).user = {
          id: '00000000-0000-0000-0000-000000000000', // Valid UUID for DB compatibility
          email: email,
          name: email.split('@')[0],
          roles: ['admin', 'employee'], // Mock roles for all authenticated users
          organizationId: '00000000-0000-0000-0000-000000000001' // Default Wix.com organization
        };
        
        console.log('🔍 Auth middleware - mock token authenticated:', email);
        return next();
      }
    }
    
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
