// backend/src/modules/hierarchy/controllers/hierarchy.controller.ts

import { Request, Response, NextFunction } from 'express';
import { HierarchyService } from '../services/hierarchy.service.js';

export class HierarchyController {
  constructor(private hierarchyService: HierarchyService) {}

  getDirectReports = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { managerId } = req.params;
      const reports = await this.hierarchyService.getDirectReports(managerId);
      res.json({ success: true, data: { items: reports } });
    } catch (err) {
      next(err);
    }
  };

  getManagerChain = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId } = req.params;
      const chain = await this.hierarchyService.getManagerChain(employeeId);
      res.json({ success: true, data: { chain } });
    } catch (err) {
      next(err);
    }
  };

  getHierarchyTree = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.params;
      const tree = await this.hierarchyService.getHierarchyTree(organizationId);
      res.json({ success: true, data: tree });
    } catch (err) {
      next(err);
    }
  };

  getHierarchyStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.params;
      const stats = await this.hierarchyService.getHierarchyStats(organizationId);
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  };

  validateHierarchy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.params;
      const validation = await this.hierarchyService.validateHierarchy(organizationId);
      res.json({ success: true, data: validation });
    } catch (err) {
      next(err);
    }
  };

  searchEmployees = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, q, role, exclude } = req.query;
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
      const result = await this.hierarchyService.bulkUpdateHierarchy(organizationId, relationships);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
}

