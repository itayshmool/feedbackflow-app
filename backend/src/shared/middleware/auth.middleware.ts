import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/real-database.js';

async function authenticateTokenAsync(req: Request, res: Response, next: NextFunction) {
  // Get Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authorization header required'
    });
  }

  const token = authHeader.slice(7);
  console.log('🔍 Auth middleware - token:', token);
  
  // For mock authentication, we'll extract user info from the token
  // In a real implementation, this would be JWT verification
  if (token.startsWith('mock-jwt-token-')) {
    // Extract email from token format: mock-jwt-token-{email}-{timestamp}
    // The email might contain @ symbol, so we need to handle this carefully
    const tokenWithoutPrefix = token.replace('mock-jwt-token-', '');
    const lastDashIndex = tokenWithoutPrefix.lastIndexOf('-');
    
    console.log('🔍 Auth middleware - tokenWithoutPrefix:', tokenWithoutPrefix);
    console.log('🔍 Auth middleware - lastDashIndex:', lastDashIndex);
    
    if (lastDashIndex > 0) {
      const userEmail = tokenWithoutPrefix.substring(0, lastDashIndex);
      console.log('🔍 Auth middleware - extracted email:', userEmail);
      
      try {
        // Fetch user data from database including roles
        const userQuery = `
          SELECT u.id, u.email, u.name, u.organization_id, u.is_active,
                 COALESCE(
                   ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL), 
                   ARRAY[]::text[]
                 ) as roles
          FROM users u
          LEFT JOIN user_roles ur ON u.id = ur.user_id
          LEFT JOIN roles r ON ur.role_id = r.id
          WHERE u.email = $1
          GROUP BY u.id, u.email, u.name, u.organization_id, u.is_active
        `;
        
        const userResult = await pool.query(userQuery, [userEmail]);
        
        if (userResult.rows.length === 0) {
          return res.status(401).json({
            success: false,
            error: 'User not found'
          });
        }
        
        const user = userResult.rows[0];
        
        // Store user data in request
        (req as any).user = {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organization_id,
          isActive: user.is_active,
          roles: user.roles || []
        };
        
        console.log('🔍 Auth middleware - user data:', (req as any).user);
        
        next();
      } catch (error) {
        console.error('🔍 Auth middleware - database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Database error during authentication'
        });
      }
    } else {
      console.log('🔍 Auth middleware - invalid token format');
      return res.status(401).json({
        success: false,
        error: 'Invalid token format'
      });
    }
  } else {
    console.log('🔍 Auth middleware - token does not start with mock-jwt-token-');
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
}

// Wrapper function to handle async middleware in Express
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  authenticateTokenAsync(req, res, next).catch(next);
}
