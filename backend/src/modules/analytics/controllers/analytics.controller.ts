// backend/src/modules/analytics/controllers/analytics.controller.ts

import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { DashboardService } from '../services/dashboard.service';
import { ReportService } from '../services/report.service';

export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private dashboardService: DashboardService,
    private reportService: ReportService
  ) {}

  // Analytics Metrics
  createMetric = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const metric = await this.analyticsService.createMetric(organizationId, req.body);
      res.status(201).json(metric);
    } catch (err) {
      next(err);
    }
  };

  getMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const { page = 1, limit = 20, ...filters } = req.query as any;
      const response = await this.analyticsService.getMetrics(organizationId, filters, userId, Number(page), Number(limit));
      res.json(response);
    } catch (err) {
      next(err);
    }
  };

  getMetric = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const metric = await this.analyticsService.getMetricById(req.params.id, userId);
      res.json(metric);
    } catch (err) {
      next(err);
    }
  };

  getMetricTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const { metricName, periodType, periods } = req.query as any;
      const trends = await this.analyticsService.getMetricTrends(organizationId, metricName, periodType, Number(periods) || 12);
      res.json(trends);
    } catch (err) {
      next(err);
    }
  };

  getMetricComparison = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const { metricName, currentStart, currentEnd, previousStart, previousEnd } = req.query as any;
      const comparison = await this.analyticsService.getMetricComparison(
        organizationId,
        metricName,
        { start: new Date(currentStart), end: new Date(currentEnd) },
        { start: new Date(previousStart), end: new Date(previousEnd) }
      );
      res.json(comparison);
    } catch (err) {
      next(err);
    }
  };

  deleteMetric = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      await this.analyticsService.deleteMetric(req.params.id, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  calculateMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      await this.analyticsService.calculateMetrics(organizationId);
      res.json({ message: 'Metrics calculation started' });
    } catch (err) {
      next(err);
    }
  };

  // Specific Analytics
  getCycleAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const { startDate, endDate } = req.query as any;
      const dateRange = startDate && endDate ? { start: new Date(startDate), end: new Date(endDate) } : undefined;
      const analytics = await this.analyticsService.getCycleAnalytics(organizationId, dateRange);
      res.json(analytics);
    } catch (err) {
      next(err);
    }
  };

  getFeedbackAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const { startDate, endDate } = req.query as any;
      const dateRange = startDate && endDate ? { start: new Date(startDate), end: new Date(endDate) } : undefined;
      const analytics = await this.analyticsService.getFeedbackAnalytics(organizationId, dateRange);
      res.json(analytics);
    } catch (err) {
      next(err);
    }
  };

  getNotificationAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const { startDate, endDate } = req.query as any;
      const dateRange = startDate && endDate ? { start: new Date(startDate), end: new Date(endDate) } : undefined;
      const analytics = await this.analyticsService.getNotificationAnalytics(organizationId, dateRange);
      res.json(analytics);
    } catch (err) {
      next(err);
    }
  };

  getUserAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const { startDate, endDate } = req.query as any;
      const dateRange = startDate && endDate ? { start: new Date(startDate), end: new Date(endDate) } : undefined;
      const analytics = await this.analyticsService.getUserAnalytics(organizationId, dateRange);
      res.json(analytics);
    } catch (err) {
      next(err);
    }
  };

  // Dashboard Management
  createDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const dashboard = await this.dashboardService.createDashboard(organizationId, req.body, userId);
      res.status(201).json(dashboard);
    } catch (err) {
      next(err);
    }
  };

  getDashboards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const { page = 1, limit = 20 } = req.query as any;
      const response = await this.dashboardService.getDashboards(organizationId, userId, Number(page), Number(limit));
      res.json(response);
    } catch (err) {
      next(err);
    }
  };

  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const dashboard = await this.dashboardService.getDashboardById(req.params.id, userId);
      res.json(dashboard);
    } catch (err) {
      next(err);
    }
  };

  getPublicDashboards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const dashboards = await this.dashboardService.getPublicDashboards(organizationId);
      res.json(dashboards);
    } catch (err) {
      next(err);
    }
  };

  getDefaultDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const dashboard = await this.dashboardService.getDefaultDashboard(organizationId);
      res.json(dashboard);
    } catch (err) {
      next(err);
    }
  };

  updateDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const dashboard = await this.dashboardService.updateDashboard(req.params.id, req.body, userId);
      res.json(dashboard);
    } catch (err) {
      next(err);
    }
  };

  deleteDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      await this.dashboardService.deleteDashboard(req.params.id, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  setDefaultDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const dashboard = await this.dashboardService.setAsDefault(req.params.id, organizationId, userId);
      res.json(dashboard);
    } catch (err) {
      next(err);
    }
  };

  duplicateDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const { name } = req.body;
      const dashboard = await this.dashboardService.duplicateDashboard(req.params.id, name, userId);
      res.status(201).json(dashboard);
    } catch (err) {
      next(err);
    }
  };

  // Report Management
  createReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const report = await this.reportService.createReport(organizationId, req.body, userId);
      res.status(201).json(report);
    } catch (err) {
      next(err);
    }
  };

  getReports = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const { page = 1, limit = 20 } = req.query as any;
      const response = await this.reportService.getReports(organizationId, userId, Number(page), Number(limit));
      res.json(response);
    } catch (err) {
      next(err);
    }
  };

  getReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const report = await this.reportService.getReportById(req.params.id, userId);
      res.json(report);
    } catch (err) {
      next(err);
    }
  };

  getReportsByType = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const { type } = req.params;
      const reports = await this.reportService.getReportsByType(organizationId, type as any);
      res.json(reports);
    } catch (err) {
      next(err);
    }
  };

  updateReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const report = await this.reportService.updateReport(req.params.id, req.body, userId);
      res.json(report);
    } catch (err) {
      next(err);
    }
  };

  deleteReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      await this.reportService.deleteReport(req.params.id, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  activateReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const report = await this.reportService.activateReport(req.params.id, userId);
      res.json(report);
    } catch (err) {
      next(err);
    }
  };

  deactivateReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const report = await this.reportService.deactivateReport(req.params.id, userId);
      res.json(report);
    } catch (err) {
      next(err);
    }
  };

  generateReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const result = await this.reportService.generateReport(req.params.id, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}
