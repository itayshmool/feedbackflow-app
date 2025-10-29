import { Request, Response, NextFunction } from 'express';
import { AdminOrganizationService } from '../services/admin-organization.service';
import {
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  CreateTeamRequest,
  UpdateTeamRequest,
  BulkImportRequest,
  BulkExportRequest,
} from '../types/organization.types';
import { NotFoundError, ValidationError } from '../../../shared/utils/errors.js';
import { Logger } from '../../../shared/utils/logger';
import { CSVParser } from '../../../shared/utils/csv-parser.js';

export class AdminOrganizationController {
  private organizationService: AdminOrganizationService;
  private logger: Logger;

  constructor(organizationService: AdminOrganizationService) {
    this.organizationService = organizationService;
    this.logger = new Logger();
  }

  // Organization Management Endpoints
  createOrganization = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgData: CreateOrganizationRequest = req.body;
      const organization = await this.organizationService.createOrganization(orgData);
      res.status(201).json(organization);
    } catch (err) {
      next(err);
    }
  };

  getOrganizations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        status: req.query.status as string,
        subscriptionPlan: req.query.subscriptionPlan as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const organizations = await this.organizationService.getOrganizations(filters);
      res.json(organizations);
    } catch (err) {
      next(err);
    }
  };

  getOrganizationById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organization = await this.organizationService.getOrganizationById(req.params.id);
      res.json(organization);
    } catch (err) {
      next(err);
    }
  };

  getOrganizationBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organization = await this.organizationService.getOrganizationBySlug(req.params.slug);
      res.json(organization);
    } catch (err) {
      next(err);
    }
  };

  updateOrganization = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updateData: UpdateOrganizationRequest = req.body;
      const organization = await this.organizationService.updateOrganization(
        req.params.id,
        updateData
      );
      res.json(organization);
    } catch (err) {
      next(err);
    }
  };

  deleteOrganization = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.organizationService.deleteOrganization(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  searchOrganizations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q: searchTerm } = req.query;
      if (!searchTerm || typeof searchTerm !== 'string') {
        throw new ValidationError('Search term is required');
      }

      const filters = {
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const organizations = await this.organizationService.searchOrganizations(searchTerm, filters);
      res.json(organizations);
    } catch (err) {
      next(err);
    }
  };

  getOrganizationStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.organizationService.getOrganizationStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  };

  // Department Management Endpoints
  createDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.params.organizationId;
      const deptData: CreateDepartmentRequest = req.body;
      const department = await this.organizationService.createDepartment(organizationId, deptData);
      res.status(201).json(department);
    } catch (err) {
      next(err);
    }
  };

  getDepartments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.params.organizationId;
      const filters = {
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        type: req.query.type as string,
        parentDepartmentId: req.query.parentDepartmentId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const departments = await this.organizationService.getDepartments(organizationId, filters);
      res.json(departments);
    } catch (err) {
      next(err);
    }
  };

  getDepartmentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, departmentId } = req.params;
      const department = await this.organizationService.getDepartmentById(organizationId, departmentId);
      res.json(department);
    } catch (err) {
      next(err);
    }
  };

  updateDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, departmentId } = req.params;
      const updateData: UpdateDepartmentRequest = req.body;
      const department = await this.organizationService.updateDepartment(
        organizationId,
        departmentId,
        updateData
      );
      res.json(department);
    } catch (err) {
      next(err);
    }
  };

  deleteDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, departmentId } = req.params;
      await this.organizationService.deleteDepartment(organizationId, departmentId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  getDepartmentStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.params.organizationId;
      const stats = await this.organizationService.getDepartmentStats(organizationId);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  };

  getDepartmentHierarchy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.params.organizationId;
      const hierarchy = await this.organizationService.getDepartmentHierarchy(organizationId);
      res.json(hierarchy);
    } catch (err) {
      next(err);
    }
  };

  // Team Management Endpoints
  createTeam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.params.organizationId;
      const teamData: CreateTeamRequest = req.body;
      const team = await this.organizationService.createTeam(organizationId, teamData);
      res.status(201).json(team);
    } catch (err) {
      next(err);
    }
  };

  getTeams = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.params.organizationId;
      const filters = {
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        type: req.query.type as string,
        departmentId: req.query.departmentId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const teams = await this.organizationService.getTeams(organizationId, filters);
      res.json(teams);
    } catch (err) {
      next(err);
    }
  };

  getTeamById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, teamId } = req.params;
      const team = await this.organizationService.getTeamById(organizationId, teamId);
      res.json(team);
    } catch (err) {
      next(err);
    }
  };

  updateTeam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, teamId } = req.params;
      const updateData: UpdateTeamRequest = req.body;
      const team = await this.organizationService.updateTeam(organizationId, teamId, updateData);
      res.json(team);
    } catch (err) {
      next(err);
    }
  };

  deleteTeam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, teamId } = req.params;
      await this.organizationService.deleteTeam(organizationId, teamId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  getTeamStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.params.organizationId;
      const stats = await this.organizationService.getTeamStats(organizationId);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  };

  getTeamsByDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, departmentId } = req.params;
      const teams = await this.organizationService.getTeamsByDepartment(organizationId, departmentId);
      res.json(teams);
    } catch (err) {
      next(err);
    }
  };

  // Bulk Operations Endpoints
  bulkImport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const importRequest: BulkImportRequest = req.body;
      const result = await this.organizationService.bulkImport(importRequest);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  bulkExport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exportRequest: BulkExportRequest = req.body;
      const result = await this.organizationService.bulkExport(exportRequest);
      
      // If format is CSV, convert data to CSV
      if (exportRequest.format === 'csv') {
        const csv = CSVParser.organizationsToCSV(result.data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="organizations-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
      } else {
        res.json(result);
      }
    } catch (err) {
      next(err);
    }
  };

  uploadBulkImport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = (req as any).file;
      
      if (!file) {
        throw new ValidationError('No file uploaded');
      }

      const fileContent = file.buffer.toString('utf-8');
      const fileType = file.originalname.endsWith('.csv') ? 'csv' : 'json';
      
      // Parse the file based on type
      let parsedData: CreateOrganizationRequest[];
      let errors: any[] = [];

      if (fileType === 'csv') {
        const result = CSVParser.parseOrganizations(fileContent);
        parsedData = result.data;
        errors = result.errors;
      } else {
        const result = CSVParser.parseJSON<CreateOrganizationRequest>(fileContent);
        parsedData = result.data;
        errors = result.errors;
      }

      // Check for parsing errors
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'File parsing failed',
          errors,
        });
      }

      // Get options from request body
      const dryRun = req.body.dryRun === 'true' || req.body.dryRun === true;
      const skipValidation = req.body.skipValidation === 'true' || req.body.skipValidation === true;

      // Perform bulk import
      const importRequest: BulkImportRequest = {
        type: 'organizations',
        data: parsedData,
        options: {
          dryRun,
          skipValidation,
          updateExisting: false,
        },
      };

      const result = await this.organizationService.bulkImport(importRequest);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  downloadTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = req.query.type as string || 'organizations';
      
      if (type !== 'organizations') {
        throw new ValidationError('Only organization templates are currently supported');
      }

      const csv = CSVParser.generateOrganizationTemplate();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="organization-import-template.csv"');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  };

  // Organization Chart Endpoints
  generateOrganizationChart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.params.organizationId;
      const chart = await this.organizationService.generateOrganizationChart(organizationId);
      res.json(chart);
    } catch (err) {
      next(err);
    }
  };

  // Utility Endpoints
  checkSlugAvailability = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.query;
      if (!slug || typeof slug !== 'string') {
        throw new ValidationError('Slug parameter is required');
      }

      const excludeId = req.query.excludeId as string;
      const isAvailable = await this.organizationService.checkSlugAvailability(slug, excludeId);
      res.json({ available: isAvailable });
    } catch (err) {
      next(err);
    }
  };

  // Error handling middleware
  private handleError = (error: Error, req: Request, res: Response, next: NextFunction) => {
    this.logger.error('Organization controller error', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
    });

    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message,
      });
    }

    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  };
}
