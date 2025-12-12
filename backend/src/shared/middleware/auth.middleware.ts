import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../../modules/auth/services/jwt.service.js';
import { query } from '../../config/real-database.js';

// Fail fast if JWT_SECRET is not properly configured
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'changeme') {
  throw new Error(
    'JWT_SECRET environment variable must be set to a secure random value. ' +
    'Generate one with: openssl rand -base64 32'
  );
}
const jwtService = new JwtService(JWT_SECRET);

// Type for admin organization assignment
interface AdminOrganization {
  id: string;
  slug: string;
  name: string;
}

// Return type for fetchAdminOrganizations
interface AdminOrganizationsResult {
  adminOrganizations: AdminOrganization[];
  isSuperAdmin: boolean;
  roles: string[];
}

// Helper function to fetch ALL admin organizations from database
async function fetchAdminOrganizations(userId: string): Promise<AdminOrganizationsResult> {
  try {
    const result = await query(`
      SELECT 
        r.name as role_name,
        ur.organization_id,
        o.slug as organization_slug,
        o.name as organization_name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN organizations o ON ur.organization_id = o.id
      WHERE ur.user_id = $1 AND ur.is_active = true
    `, [userId]);

    const roles = [...new Set(result.rows.map((r: any) => r.role_name))];
    const isSuperAdmin = roles.includes('super_admin');
    
    // Get ALL admin org assignments (not just the first one)
    const adminOrganizations: AdminOrganization[] = result.rows
      .filter((r: any) => r.role_name === 'admin' && r.organization_id)
      .map((r: any) => ({
        id: r.organization_id,
        slug: r.organization_slug,
        name: r.organization_name
      }));
    
    return {
      adminOrganizations,
      isSuperAdmin,
      roles
    };
  } catch (error) {
    console.error('Error fetching admin organizations:', error);
    return { adminOrganizations: [], isSuperAdmin: false, roles: [] };
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
    // SECURITY: Reject mock tokens in production
    if (token.startsWith('mock-jwt-token-')) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('🚫 Mock token rejected in production environment');
        return res.status(401).json({
          success: false,
          error: 'Mock tokens are not allowed in production'
        });
      }
      
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
        
        // Fetch admin organizations info
        const { adminOrganizations, isSuperAdmin, roles } = await fetchAdminOrganizations(userId);
        
        // Fallback roles for mock user if no database roles found
        const effectiveRoles = roles.length > 0 ? roles : ['admin', 'employee'];
        
        (req as any).user = {
          id: userId,
          email: email,
          name: userName,
          roles: effectiveRoles,
          organizationId: '00000000-0000-0000-0000-000000000001', // Default org
          // Multi-org admin support
          adminOrganizations: adminOrganizations,
          isSuperAdmin: isSuperAdmin,
          // Backward compatibility: keep singular fields for first org
          adminOrganizationId: adminOrganizations[0]?.id || null,
          adminOrganizationSlug: adminOrganizations[0]?.slug || null,
        };
        
        console.log('🔍 Auth middleware - mock token authenticated:', email, 'adminOrgs:', adminOrganizations.length, 'isSuperAdmin:', isSuperAdmin);
        return next();
      }
    }
    
    // Real JWT verification
    const payload = jwtService.verify(token);

    // Always fetch roles from database for real JWT tokens to ensure they're up-to-date
    // This is important for role-based access control (e.g., super_admin protection)
    const { adminOrganizations, isSuperAdmin, roles } = await fetchAdminOrganizations(payload.sub);
    
    // Use database roles if available, otherwise fall back to JWT payload roles
    const effectiveRoles = roles.length > 0 ? roles : (payload.roles || []);

    // Set user data from JWT payload including admin organization info from database
    (req as any).user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      roles: effectiveRoles,
      // Multi-org admin support
      adminOrganizations: adminOrganizations,
      isSuperAdmin: isSuperAdmin,
      // Backward compatibility: keep singular fields for first org
      adminOrganizationId: adminOrganizations[0]?.id || null,
      adminOrganizationSlug: adminOrganizations[0]?.slug || null,
    };
    
    console.log('🔍 Auth middleware - real JWT authenticated:', payload.email, 'roles:', effectiveRoles, 'adminOrgs:', adminOrganizations.length, 'isSuperAdmin:', isSuperAdmin);

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
