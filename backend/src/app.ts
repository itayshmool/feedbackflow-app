import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { Pool } from 'pg'
import { EventEmitter } from 'events'
import { GoogleOAuthService } from './modules/auth/services/google-oauth.service.js'
import { JwtService } from './modules/auth/services/jwt.service.js'
import { UserService } from './modules/auth/services/user.service.js'
import { GoogleAuthController } from './modules/auth/controllers/google-auth.controller.js'
import { createGoogleAuthRoutes } from './modules/auth/routes/google-auth.routes.js'
import { CycleService } from './modules/cycles/services/cycle.service.js'
import { CycleValidationService } from './modules/cycles/services/cycle-validation.service.js'
import { CycleController } from './modules/cycles/controllers/cycle.controller.js'
import { createCycleRoutes } from './modules/cycles/routes/cycle.routes.js'
import { NotificationService } from './modules/notifications/services/notification.service.js'
import { NotificationTemplateService } from './modules/notifications/services/notification-template.service.js'
import { NotificationPreferenceService } from './modules/notifications/services/notification-preference.service.js'
import { NotificationController } from './modules/notifications/controllers/notification.controller.js'
import { createNotificationRoutes } from './modules/notifications/routes/notification.routes.js'
import { AnalyticsService } from './modules/analytics/services/analytics.service.js'
import { DashboardService } from './modules/analytics/services/dashboard.service.js'
import { ReportService } from './modules/analytics/services/report.service.js'
import { AnalyticsController } from './modules/analytics/controllers/analytics.controller.js'
import { createAnalyticsRoutes } from './modules/analytics/routes/analytics.routes.js'
import { WebhookService } from './modules/integrations/services/webhook.service.js'
import { SlackService } from './modules/integrations/services/slack.service.js'
import { IntegrationsController } from './modules/integrations/controllers/integrations.controller.js'
import { createIntegrationsRoutes } from './modules/integrations/routes/integrations.routes.js'
import { AdminOrganizationService } from './modules/admin/services/admin-organization.service.js'
import { AdminOrganizationController } from './modules/admin/controllers/admin-organization.controller.js'
import { createAdminOrganizationRoutes } from './modules/admin/routes/admin-organization.routes.js'
import { FeedbackService } from './modules/feedback/services/feedback.service.js'
import { RatingService } from './modules/feedback/services/rating.service.js'
import { GoalService } from './modules/feedback/services/goal.service.js'
import { CommentService } from './modules/feedback/services/comment.service.js'
import { FeedbackController } from './modules/feedback/controllers/feedback.controller.js'
import { CommentController } from './modules/feedback/controllers/comment.controller.js'
import { createFeedbackModuleRoutes } from './modules/feedback/routes/feedback.routes.js'
import { templateRoutes } from './modules/templates/routes/template.routes.js'
import { HierarchyService } from './modules/hierarchy/services/hierarchy.service.js'
import { HierarchyController } from './modules/hierarchy/controllers/hierarchy.controller.js'
import { createHierarchyRoutes } from './modules/hierarchy/routes/hierarchy.routes.js'
import profileRoutes from './modules/auth/routes/profile.routes.js'
import settingsRoutes from './modules/auth/routes/settings.routes.js'
import { Logger } from './shared/utils/logger.js'

const app = express()
app.use(helmet())
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      // Local development
      'http://localhost:3006',
      'http://localhost:3000',
      'http://localhost:5173',
      // Production (add your domains here)
      process.env.FRONTEND_URL,
      // Example: 'https://app.yourcompany.com',
      // Example: 'https://staging.yourcompany.com',
    ].filter(Boolean) as string[]

    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.warn(`🚫 CORS blocked request from origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))
app.use(cookieParser())
app.use(express.json())

// Initialize database connection (placeholder)
const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/feedbackflow'
})

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Test organization endpoint
app.get('/api/v1/admin/organizations/test', (_req, res) => res.json({ 
  message: 'Organization API is working',
  timestamp: new Date().toISOString()
}))

// Auth (Google login)
const googleService = new GoogleOAuthService(process.env.GOOGLE_CLIENT_ID || '')
const jwtService = new JwtService(process.env.JWT_SECRET || 'changeme')
const userService = new UserService()
const authController = new GoogleAuthController(googleService, jwtService, userService)
app.use('/api/v1/auth', createGoogleAuthRoutes(authController))

// Cycles
const eventEmitter = new EventEmitter()
const logger = new Logger()
const cycleService = new CycleService(db, eventEmitter, logger)
const validationService = new CycleValidationService(db, cycleService)
const cycleController = new CycleController(cycleService, validationService)
app.use('/api/v1/cycles', createCycleRoutes(cycleController))

// Notifications
const notificationService = new NotificationService(db, eventEmitter, logger)
const templateService = new NotificationTemplateService(db, eventEmitter, logger)
const preferenceService = new NotificationPreferenceService(db, eventEmitter, logger)
const notificationController = new NotificationController(notificationService, templateService, preferenceService)
app.use('/api/v1/notifications', createNotificationRoutes(notificationController))

// Analytics
const analyticsService = new AnalyticsService(db, eventEmitter, logger)
const dashboardService = new DashboardService(db, eventEmitter, logger)
const reportService = new ReportService(db, eventEmitter, logger)
const analyticsController = new AnalyticsController(analyticsService, dashboardService, reportService)
app.use('/api/v1/analytics', createAnalyticsRoutes(analyticsController))

// Integrations
const webhookService = new WebhookService(db, eventEmitter, logger)
const slackService = new SlackService(db, eventEmitter, logger)
const integrationsController = new IntegrationsController(webhookService, slackService)
app.use('/api/v1/integrations', createIntegrationsRoutes(integrationsController))

// Admin
const adminOrganizationService = new AdminOrganizationService(db, eventEmitter, logger)
const adminOrganizationController = new AdminOrganizationController(adminOrganizationService)
app.use('/api/v1/admin', createAdminOrganizationRoutes(adminOrganizationController))

// Feedback
const feedbackService = new FeedbackService(db, eventEmitter, logger)
const commentService = new CommentService(db)
const feedbackController = new FeedbackController(feedbackService)
const commentController = new CommentController(commentService)
app.use('/api/v1', createFeedbackModuleRoutes(feedbackController, commentController))

// Templates
app.use('/api/v1/templates', templateRoutes)

// Hierarchy
const hierarchyService = new HierarchyService(db, eventEmitter, logger)
const hierarchyController = new HierarchyController(hierarchyService)
app.use('/api/v1/hierarchy', createHierarchyRoutes(hierarchyController))

// Profile & Settings
app.use('/api/v1/profile', profileRoutes)
app.use('/api/v1/settings', settingsRoutes)

// Event Integration - Connect notifications to cycle and feedback events
eventEmitter.on('cycle:created', (data) => notificationService.handleCycleEvent('cycle:created', data))
eventEmitter.on('cycle:activated', (data) => notificationService.handleCycleEvent('cycle:activated', data))
eventEmitter.on('cycle:updated', (data) => notificationService.handleCycleEvent('cycle:updated', data))
eventEmitter.on('feedback:created', (data) => notificationService.handleFeedbackEvent('feedback:created', data))
eventEmitter.on('feedback:submitted', (data) => notificationService.handleFeedbackEvent('feedback:submitted', data))
eventEmitter.on('feedback:acknowledged', (data) => notificationService.handleFeedbackEvent('feedback:acknowledged', data))

// Analytics Integration - Connect analytics to all business events
eventEmitter.on('cycle:created', (data) => analyticsService.calculateMetrics(data.organizationId || 'default-org'))
eventEmitter.on('cycle:activated', (data) => analyticsService.calculateMetrics(data.organizationId || 'default-org'))
eventEmitter.on('cycle:updated', (data) => analyticsService.calculateMetrics(data.organizationId || 'default-org'))
eventEmitter.on('cycle:closed', (data) => analyticsService.calculateMetrics(data.organizationId || 'default-org'))
eventEmitter.on('feedback:created', (data) => analyticsService.calculateMetrics(data.organizationId || 'default-org'))
eventEmitter.on('feedback:submitted', (data) => analyticsService.calculateMetrics(data.organizationId || 'default-org'))
eventEmitter.on('feedback:acknowledged', (data) => analyticsService.calculateMetrics(data.organizationId || 'default-org'))
eventEmitter.on('notification:sent', (data) => analyticsService.calculateMetrics(data.organizationId || 'default-org'))

// Integrations - Connect webhooks and Slack to all business events
eventEmitter.on('cycle:created', (data) => webhookService.processEvent('cycle:created', data, data.organizationId || 'default-org'))
eventEmitter.on('cycle:activated', (data) => webhookService.processEvent('cycle:activated', data, data.organizationId || 'default-org'))
eventEmitter.on('cycle:updated', (data) => webhookService.processEvent('cycle:updated', data, data.organizationId || 'default-org'))
eventEmitter.on('cycle:closed', (data) => webhookService.processEvent('cycle:closed', data, data.organizationId || 'default-org'))
eventEmitter.on('feedback:created', (data) => webhookService.processEvent('feedback:created', data, data.organizationId || 'default-org'))
eventEmitter.on('feedback:submitted', (data) => webhookService.processEvent('feedback:submitted', data, data.organizationId || 'default-org'))
eventEmitter.on('feedback:acknowledged', (data) => webhookService.processEvent('feedback:acknowledged', data, data.organizationId || 'default-org'))
eventEmitter.on('notification:sent', (data) => webhookService.processEvent('notification:sent', data, data.organizationId || 'default-org'))

// Slack Integration - Connect Slack to relevant business events
eventEmitter.on('cycle:created', (data) => slackService.processSlackEvent('cycle:created', data, data.organizationId || 'default-org'))
eventEmitter.on('cycle:activated', (data) => slackService.processSlackEvent('cycle:activated', data, data.organizationId || 'default-org'))
eventEmitter.on('feedback:submitted', (data) => slackService.processSlackEvent('feedback:submitted', data, data.organizationId || 'default-org'))
eventEmitter.on('feedback:acknowledged', (data) => slackService.processSlackEvent('feedback:acknowledged', data, data.organizationId || 'default-org'))

// Admin Integration - Connect admin events to analytics and notifications
eventEmitter.on('admin:user_created', (data) => analyticsService.calculateMetrics(data.user.organizationId))
eventEmitter.on('admin:user_updated', (data) => analyticsService.calculateMetrics(data.user.organizationId))
eventEmitter.on('admin:user_deleted', (data) => analyticsService.calculateMetrics(data.user.organizationId))
eventEmitter.on('admin:organization_created', (data) => analyticsService.calculateMetrics('system'))
eventEmitter.on('admin:organization_updated', (data) => analyticsService.calculateMetrics('system'))
eventEmitter.on('admin:organization_deleted', (data) => analyticsService.calculateMetrics('system'))
eventEmitter.on('admin:system_settings_updated', (data) => analyticsService.calculateMetrics('system'))
eventEmitter.on('admin:maintenance_mode_changed', (data) => analyticsService.calculateMetrics('system'))

export default app
