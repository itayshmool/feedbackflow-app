// backend/src/modules/hierarchy/controllers/hierarchy.controller.ts

import { Request, Response, NextFunction } from 'express';
import { HierarchyService } from '../services/hierarchy.service.js';

// Custom error class for authorization failures
class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class HierarchyController {
  constructor(private hierarchyService: HierarchyService) {}

  /**
   * Validates that the authenticated user belongs to the requested organization.
   * Super admins are allowed access to any organization.
   * Throws ForbiddenError if access is denied.
   */
  private validateOrgAccess(req: Request, organizationId: string): void {
    const user = (req as any).user;
    
    // Super admins can access any organization
    if (user.roles?.includes('super_admin')) {
      return;
    }
    
    // Users without an organization cannot access any org data
    if (!user.organizationId) {
      throw new ForbiddenError('Access denied: User is not assigned to any organization');
    }
    
    // Users can only access their own organization's data
    if (user.organizationId !== organizationId) {
      throw new ForbiddenError('Access denied: Cannot access another organization\'s hierarchy data');
    }
  }

  getDirectReports = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { managerId } = req.params;
      const user = (req as any).user;
      
      // Validate the manager belongs to the user's organization
      await this.hierarchyService.validateUserBelongsToOrg(managerId, user.organizationId, user.roles);
      
      const reports = await this.hierarchyService.getDirectReports(managerId);
      res.json({ success: true, data: { items: reports } });
    } catch (err) {
      next(err);
    }
  };

  getManagerChain = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId } = req.params;
      const user = (req as any).user;
      
      // Validate the employee belongs to the user's organization
      await this.hierarchyService.validateUserBelongsToOrg(employeeId, user.organizationId, user.roles);
      
      const chain = await this.hierarchyService.getManagerChain(employeeId);
      res.json({ success: true, data: { chain } });
    } catch (err) {
      next(err);
    }
  };

  getHierarchyTree = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.params;
      this.validateOrgAccess(req, organizationId);
      
      const tree = await this.hierarchyService.getHierarchyTree(organizationId);
      res.json({ success: true, data: tree });
    } catch (err) {
      next(err);
    }
  };

  getHierarchyStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.params;
      this.validateOrgAccess(req, organizationId);
      
      const stats = await this.hierarchyService.getHierarchyStats(organizationId);
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  };

  validateHierarchy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.params;
      this.validateOrgAccess(req, organizationId);
      
      const validation = await this.hierarchyService.validateHierarchy(organizationId);
      res.json({ success: true, data: validation });
    } catch (err) {
      next(err);
    }
  };

  searchEmployees = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, q, role, exclude } = req.query;
      this.validateOrgAccess(req, String(organizationId));
      
      const excludeIds = exclude ? String(exclude).split(',') : [];
      const employees = await this.hierarchyService.searchEmployees(
        String(organizationId),
        String(q),
        role ? String(role) : undefined,
        excludeIds
      );
      res.json({ success: true, data: employees });
    } catch (err) {
      next(err);
    }
  };

  createHierarchy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, employeeId, managerId } = req.body;
      this.validateOrgAccess(req, organizationId);
      
      const hierarchy = await this.hierarchyService.createHierarchy(organizationId, employeeId, managerId);
      res.status(201).json({ success: true, data: hierarchy });
    } catch (err) {
      next(err);
    }
  };

  updateHierarchy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { managerId } = req.body;
      const hierarchy = await this.hierarchyService.updateHierarchy(id, managerId);
      res.json({ success: true, data: hierarchy });
    } catch (err) {
      next(err);
    }
  };

  deleteHierarchy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.hierarchyService.deleteHierarchy(id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  bulkUpdateHierarchy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, relationships } = req.body;
      this.validateOrgAccess(req, organizationId);
      
      const result = await this.hierarchyService.bulkUpdateHierarchy(organizationId, relationships);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
}

