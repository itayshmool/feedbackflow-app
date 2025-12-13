// backend/src/modules/auth/services/user.service.ts
// 
// SECURITY FIX: Replaced in-memory Map with database-backed storage
// Previous implementation was vulnerable to:
// - Memory exhaustion attacks (unbounded Map growth)
// - Session loss on server restart
// - Inconsistent state in horizontal scaling (multiple instances)

import { query as dbQuery } from '../../../config/real-database.js';

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  roles: string[];
  organizationId?: string;
}

export class UserService {
  /**
   * Find user by email from database
   * Returns undefined if user not found or inactive
   */
  async findByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await dbQuery(
        `SELECT 
          u.id,
          u.email,
          u.name,
          u.avatar_url as picture,
          u.organization_id,
          COALESCE(om.organization_id, u.organization_id) as effective_org_id,
          COALESCE(
            ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL),
            ARRAY['employee']::VARCHAR[]
          ) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
        LEFT JOIN roles r ON ur.role_id = r.id
        LEFT JOIN organization_members om ON u.id = om.user_id AND om.is_active = true
        WHERE LOWER(u.email) = LOWER($1) AND u.is_active = true
        GROUP BY u.id, u.email, u.name, u.avatar_url, u.organization_id, om.organization_id`,
        [email]
      );

      if (result.rows.length === 0) {
        return undefined;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        name: row.name,
        picture: row.picture,
        roles: row.roles || ['employee'],
        organizationId: row.effective_org_id || row.organization_id,
      };
    } catch (error) {
      console.error('UserService.findByEmail error:', error);
      // Return undefined on database errors - fail closed
      return undefined;
    }
  }

  /**
   * Create or update user from Google OAuth profile
   * - Creates new user if not exists
   * - Updates profile info and last_login_at if exists
   * - Assigns default 'employee' role to new users
   */
  async upsertGoogleUser(profile: { email: string; name?: string; picture?: string }): Promise<User> {
    const email = profile.email.toLowerCase();

    try {
      // Check if user exists
      const existingUser = await this.findByEmail(email);
      
      if (existingUser) {
        // Update existing user's profile info and last login
        await dbQuery(
          `UPDATE users 
           SET name = COALESCE($2, name), 
               avatar_url = COALESCE($3, avatar_url),
               last_login_at = NOW(),
               updated_at = NOW()
           WHERE LOWER(email) = LOWER($1)`,
          [email, profile.name, profile.picture]
        );
        
        return { 
          ...existingUser, 
          name: profile.name || existingUser.name, 
          picture: profile.picture || existingUser.picture,
          organizationId: existingUser.organizationId,
        };
      }

      // Create new user
      const insertResult = await dbQuery(
        `INSERT INTO users (email, name, avatar_url, is_active, email_verified, created_at, updated_at, last_login_at)
         VALUES ($1, $2, $3, true, true, NOW(), NOW(), NOW())
         RETURNING id, email, name, avatar_url as picture`,
        [email, profile.name || email.split('@')[0], profile.picture]
      );

      const newUser = insertResult.rows[0];

      // Determine roles based on email (for backwards compatibility with hardcoded admin emails)
      // In production, this should be managed through proper admin UI
      const isAdmin = email === 'itays@wix.com' || email === 'admin@example.com';
      const isManager = email === 'manager@example.com';
      
      // Assign default 'employee' role
      const employeeRoleResult = await dbQuery(
        `SELECT id FROM roles WHERE LOWER(name) = 'employee'`
      );
      
      if (employeeRoleResult.rows.length > 0) {
        await dbQuery(
          `INSERT INTO user_roles (user_id, role_id, is_active, granted_at) 
           VALUES ($1, $2, true, NOW()) 
           ON CONFLICT (user_id, role_id, organization_id) DO NOTHING`,
          [newUser.id, employeeRoleResult.rows[0].id]
        );
      }

      // Assign admin role if applicable
      if (isAdmin) {
        const adminRoleResult = await dbQuery(
          `SELECT id FROM roles WHERE LOWER(name) = 'admin'`
        );
        if (adminRoleResult.rows.length > 0) {
          await dbQuery(
            `INSERT INTO user_roles (user_id, role_id, is_active, granted_at) 
             VALUES ($1, $2, true, NOW()) 
             ON CONFLICT (user_id, role_id, organization_id) DO NOTHING`,
            [newUser.id, adminRoleResult.rows[0].id]
          );
        }
      }

      // Assign manager role if applicable
      if (isManager) {
        const managerRoleResult = await dbQuery(
          `SELECT id FROM roles WHERE LOWER(name) = 'manager'`
        );
        if (managerRoleResult.rows.length > 0) {
          await dbQuery(
            `INSERT INTO user_roles (user_id, role_id, is_active, granted_at) 
             VALUES ($1, $2, true, NOW()) 
             ON CONFLICT (user_id, role_id, organization_id) DO NOTHING`,
            [newUser.id, managerRoleResult.rows[0].id]
          );
        }
      }

      // Determine final roles array
      let roles: string[] = ['employee'];
      if (isAdmin) {
        roles = ['admin', 'employee'];
      } else if (isManager) {
        roles = ['manager', 'employee'];
      }

      console.log(`✅ Created new user from Google OAuth: ${email} with roles: ${roles.join(', ')}`);

      return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        picture: newUser.picture,
        roles,
        organizationId: undefined, // New users don't have an org yet
      };
    } catch (error) {
      console.error('UserService.upsertGoogleUser error:', error);
      throw new Error('Failed to create or update user in database');
    }
  }
}
