// backend/src/modules/admin/controllers/admin-user.controller.ts

import { Request, Response } from 'express';
import { AdminUserService } from '../services/admin-user.service.js';
import {
  CreateUserData,
  UpdateUserData,
  UserFilters,
  BulkUserOperation,
  UserImportData
} from '../types/user.types.js';

export class AdminUserController {
  private userService: AdminUserService;

  constructor() {
    this.userService = new AdminUserService();
  }

  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        isActive,
        emailVerified,
        organizationId,
        roleId,
        role,
        department,
        position,
        lastLoginAfter,
        lastLoginBefore,
        createdAfter,
        createdBefore,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query;

      // Resolve role name to roleId if needed
      let effectiveRoleId = roleId as string;
      if (role && !effectiveRoleId) {
        try {
          const { query } = await import('../../../config/real-database.js');
          const roleLookup = await query(`SELECT id FROM roles WHERE LOWER(name) = LOWER($1) LIMIT 1`, [String(role)]);
          if (roleLookup.rows[0]?.id) {
            effectiveRoleId = roleLookup.rows[0].id;
          } else {
            // No such role name: force empty result set by filtering to impossible role id
            effectiveRoleId = '00000000-0000-0000-0000-000000000000';
          }
        } catch (e) {
          console.error('Role name lookup failed:', e);
        }
      }

      const filters: UserFilters = {
        search: search as string,
        isActive: isActive ? isActive === 'true' : undefined,
        emailVerified: emailVerified ? emailVerified === 'true' : undefined,
        organizationId: organizationId as string,
        roleId: effectiveRoleId,
        department: department as string,
        position: position as string,
        lastLoginAfter: lastLoginAfter as string,
        lastLoginBefore: lastLoginBefore as string,
        createdAfter: createdAfter as string,
        createdBefore: createdBefore as string
      };

      const options = {
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        sortBy: sortBy as string,
        sortOrder: (sortOrder as string) as 'asc' | 'desc'
      };

      const result = await this.userService.getUsers(filters, options);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserData = req.body;
      const user = await this.userService.createUser(userData);
      
      res.status(201).json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to create user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userData: UpdateUserData = req.body;
      const user = await this.userService.updateUser(id, userData);
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.userService.deleteUser(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.userService.getUserStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async bulkUpdateUsers(req: Request, res: Response): Promise<void> {
    try {
      const operation: BulkUserOperation = req.body;
      const result = await this.userService.bulkUpdateUsers(operation);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error in bulk user operation:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to perform bulk operation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async importUsers(req: Request, res: Response): Promise<void> {
    try {
      const users: UserImportData[] = req.body.users;
      const result = await this.userService.importUsers(users);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error importing users:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to import users',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async exportUsers(req: Request, res: Response): Promise<void> {
    try {
      const filters: UserFilters = req.query;
      const users = await this.userService.exportUsers(filters);
      
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Error exporting users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export users',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Role management endpoints
  async getRoles(req: Request, res: Response): Promise<void> {
    try {
      const roles = await this.userService.getRoles();
      
      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch roles',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getRoleById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const role = await this.userService.getRoleById(id);
      
      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Role not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: role
      });
    } catch (error) {
      console.error('Error fetching role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch role',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createRole(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, permissions } = req.body;
      const role = await this.userService.createRole(name, description, permissions);
      
      res.status(201).json({
        success: true,
        data: role
      });
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to create role',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      const role = await this.userService.updateRole(id, updates);
      
      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Role not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: role
      });
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to update role',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.userService.deleteRole(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Role not found'
        });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to delete role',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getUserRoles(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const roles = await this.userService.getUserRoles(userId);
      
      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      console.error('Error fetching user roles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user roles',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async assignUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { roleId, organizationId } = req.body;
      const userRole = await this.userService.assignUserRole(userId, roleId, organizationId);
      
      res.json({
        success: true,
        data: userRole
      });
    } catch (error) {
      console.error('Error assigning user role:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to assign user role',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async removeUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { userId, roleId } = req.params;
      const { organizationId } = req.query;
      const removed = await this.userService.removeUserRole(userId, roleId, organizationId as string);
      
      if (!removed) {
        res.status(404).json({
          success: false,
          error: 'User role not found'
        });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error removing user role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove user role',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
