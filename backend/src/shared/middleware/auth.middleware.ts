import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../../modules/auth/services/jwt.service.js';
import { query } from '../../config/real-database.js';

const jwtService = new JwtService(process.env.JWT_SECRET || 'changeme');

// Helper function to fetch admin organization from database
async function fetchAdminOrganization(userId: string, email: string): Promise<{ adminOrganizationId: string | null; adminOrganizationSlug: string | null; roles: string[] }> {
  try {
    const result = await query(`
      SELECT 
        r.name as role_name,
        ur.organization_id,
        o.slug as organization_slug
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN organizations o ON ur.organization_id = o.id
      WHERE ur.user_id = $1 AND ur.is_active = true
    `, [userId]);

    const roles = [...new Set(result.rows.map((r: any) => r.role_name))];
    
    // Find admin role assignment with organization
    const adminAssignment = result.rows.find((r: any) => r.role_name === 'admin' && r.organization_id);
    
    // If super_admin, no org restriction
    if (roles.includes('super_admin')) {
      return { adminOrganizationId: null, adminOrganizationSlug: null, roles };
    }
    
    return {
      adminOrganizationId: adminAssignment?.organization_id || null,
      adminOrganizationSlug: adminAssignment?.organization_slug || null,
      roles
    };
  } catch (error) {
    console.error('Error fetching admin organization:', error);
    return { adminOrganizationId: null, adminOrganizationSlug: null, roles: [] };
  }
}

async function authenticateTokenAsync(req: Request, res: Response, next: NextFunction) {
  // Check Authorization header first (for cross-domain requests)
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  // Fall back to cookie if no Authorization header
  if (!token) {
    token = req.cookies?.authToken;
  }
  
  console.log('🔍 Auth middleware - received token:', token?.substring(0, 50) + '...', 
              'from:', authHeader ? 'header' : 'cookie',
              'hostname:', req.hostname);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - No token provided'
    });
  }
  
  try {
    // Handle mock tokens (format: mock-jwt-token-EMAIL-TIMESTAMP)
    // TODO: In production, only allow real JWT tokens
    if (token.startsWith('mock-jwt-token-')) {
      const parts = token.split('-');
      if (parts.length >= 4) {
        // Extract email from token (everything between 'mock-jwt-token-' and last '-TIMESTAMP')
        const email = parts.slice(3, -1).join('-');
        
        // Fetch user from database to get proper roles and admin org
        const userResult = await query(`
          SELECT u.id, u.email, u.name
          FROM users u
          WHERE u.email = $1
        `, [email]);

        const userId = userResult.rows[0]?.id || '00000000-0000-0000-0000-000000000000';
        const userName = userResult.rows[0]?.name || email.split('@')[0];
        
        // Fetch admin organization info
        const { adminOrganizationId, adminOrganizationSlug, roles } = await fetchAdminOrganization(userId, email);
        
        // Fallback roles for mock user if no database roles found
        const effectiveRoles = roles.length > 0 ? roles : ['admin', 'employee'];
        
        (req as any).user = {
          id: userId,
          email: email,
          name: userName,
          roles: effectiveRoles,
          organizationId: '00000000-0000-0000-0000-000000000001', // Default org
          adminOrganizationId: adminOrganizationId,
          adminOrganizationSlug: adminOrganizationSlug,
        };
        
        console.log('🔍 Auth middleware - mock token authenticated:', email, 'adminOrgId:', adminOrganizationId);
        return next();
      }
    }
    
    // Real JWT verification
    const payload = jwtService.verify(token);

    // Set user data from JWT payload including admin organization info
    (req as any).user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      roles: payload.roles || [],
      adminOrganizationId: payload.adminOrganizationId || null,
      adminOrganizationSlug: payload.adminOrganizationSlug || null,
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
