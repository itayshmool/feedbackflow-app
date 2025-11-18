# Architecture
> High-level architecture of FeedbackFlow

## Bird's Eye View

**What**: Employee feedback management system with performance cycles, hierarchical org structure, and real-time notifications

**How**: Full-stack TypeScript monorepo with React SPA frontend, Express.js backend API, PostgreSQL database, and event-driven cross-module integration

**Why**: Modular monolith architecture chosen for:
- Rapid development with shared types/utilities
- Event-driven loose coupling between business domains
- Simple deployment (no microservices complexity)
- Strong typing across full stack

---

## Entry Points

### Backend
- **Main Server**: `backend/src/server.ts:25` - Express server initialization, database connection, graceful shutdown
- **Application Core**: `backend/src/app.ts:48-196` - Dependency injection container, route registration, event wiring
- **Database Schema**: `database/setup.sql:10-17` - PostgreSQL schema initialization scripts

**Start here**: Read `backend/src/app.ts` to understand module initialization, then explore individual modules in `backend/src/modules/`

### Frontend
- **Entry Point**: `frontend/src/main.tsx:68` - React app initialization, providers setup (TanStack Query, Google OAuth)
- **Router Config**: `frontend/src/router.tsx:39-169` - Route definitions with protected/admin guards
- **API Client**: `frontend/src/lib/api.ts:7-14` - Axios instance with cookie-based auth, error interceptors

**Start here**: Read `frontend/src/router.tsx` for page structure, then `frontend/src/stores/` for state management

---

## Code Map

### `/backend/src/`

#### `/modules/` - Business Domain Modules
**Purpose**: Core business logic organized by domain (9 modules total)

**Invariants**: 
- Each module follows layered structure: `routes/ → controllers/ → services/ → models/ → types/`
- Services emit events via EventEmitter for cross-module communication
- Controllers are thin wrappers that extract user context and delegate to services
- All services accept `Pool`, `EventEmitter`, `Logger` via constructor injection

**Module Breakdown**:

##### `auth/` - Authentication & Authorization
- `services/google-oauth.service.ts:4` - Google OAuth token verification
- `services/jwt.service.ts:3` - JWT signing/verification
- `services/user.service.ts:3` - User lookup and management
- `middleware/google-auth.middleware.ts:6` - Cookie-based JWT authentication
- `middleware/rbac.middleware.ts` - Role-based access control

##### `feedback/` - Core Feedback System
- `services/feedback.service.ts:24-45` - CRUD operations, status transitions (DRAFT → SUBMITTED)
- `services/rating.service.ts` - Performance ratings management
- `services/goal.service.ts` - Goal tracking within feedback
- `services/comment.service.ts` - Comment threads on feedback
- `models/feedback.model.ts` - Database operations for feedback table
- `types/feedback.types.ts` - TypeScript interfaces (27 total)

**Key Flow**: Create feedback → Add ratings/goals → Submit → Acknowledge

##### `cycles/` - Feedback Cycle Management
- `services/cycle.service.ts:22-39` - Cycle lifecycle (DRAFT → ACTIVE → CLOSED)
- `services/cycle-validation.service.ts` - Date validation, participant eligibility checks
- `models/cycle.model.ts` - Database operations
- `types/cycle.types.ts:5-15` - Status enum, settings interface

**Key Events**: `cycle:created`, `cycle:activated`, `cycle:closed`

##### `notifications/` - Multi-Channel Notifications
- `services/notification.service.ts:24` - Email/in-app notifications
- `services/notification-template.service.ts` - Template rendering with variables
- `services/notification-preference.service.ts` - User notification preferences
- Event handlers at `app.ts:153-159` for feedback/cycle events

##### `analytics/` - Dashboards & Reports
- `services/analytics.service.ts:23` - Metrics calculation (completion rates, response times)
- `services/dashboard.service.ts` - Dashboard data aggregation
- `services/report.service.ts` - Report generation (PDF/CSV exports)
- Listens to all business events at `app.ts:161-169`

##### `admin/` - Organization & User Management
- `services/admin-organization.service.ts:24` - Organization CRUD, CSV import
- `services/admin-user.service.ts` - User management, role assignment
- `services/admin-system.service.ts` - System settings, maintenance mode

##### `integrations/` - External Services
- `services/webhook.service.ts:23` - Outbound webhook delivery with retry
- `services/slack.service.ts:23` - Slack notifications
- Event subscriptions at `app.ts:171-184`

##### `hierarchy/` - Organizational Structure
- `services/hierarchy.service.ts:24` - Manager/employee relationships, org chart queries
- `types/hierarchy.types.ts:6` - Hierarchy node interfaces

##### `templates/` - Feedback Templates
- `services/TemplateDocumentService.ts` - Template CRUD
- `services/TemplateAttachmentService.ts` - File attachments
- `routes/template.routes.ts` - Template management endpoints

**API Boundary**: All modules expose public API via routes, services are internal only

#### `/shared/` - Cross-Cutting Utilities
**Purpose**: Reusable utilities across all modules

**Key files**:
- `middleware/auth.middleware.ts:6-41` - JWT authentication middleware (cookie-based)
- `utils/logger.ts:3-18` - Simple console logger wrapper
- `utils/errors.ts:3-25` - Custom error classes (ValidationError, NotFoundError, ForbiddenError)
- `types/` - Shared TypeScript interfaces

**Invariants**: Shared code has no business logic, only utilities

#### `/config/` - Configuration
- Environment variable loading
- Database connection settings
- JWT secret management

#### `/database/` - Database Layer
- PostgreSQL pool management
- Migration scripts

#### `/events/` - Event System
- `types/events.types.ts` - Event payload interfaces
- `emitters/` - Event emitter wrappers
- `handlers/` - Event handlers (analytics, audit, notification)

#### `/services/` - Global Services
- `FileStorageService.ts` - File upload/storage
- `VirusScanService.ts` - File security scanning
- `DatabaseOrganizationService.ts` - Organization data access

---

### `/frontend/src/`

#### `/pages/` - Route Components
**Purpose**: Top-level page components mapped to routes

**Structure**:
- `auth/LoginPage.tsx` - Login form with Google OAuth
- `dashboard/` - Dashboard variants (Admin, Manager, Employee)
- `feedback/` - Feedback flows (Give, Receive, View, Detail)
- `cycles/` - Cycle management pages
- `admin/` - Admin panel pages
- `analytics/AnalyticsPage.tsx` - Charts and metrics
- `notifications/NotificationsPage.tsx` - Notification center
- `profile/ProfilePage.tsx` - User profile
- `settings/SettingsPage.tsx` - User preferences

#### `/stores/` - Zustand State Management
**Purpose**: Client-side state stores (11 total)

**Key stores**:
- `authStore.ts:33` - Authentication state, login/logout, user context
- `feedbackStore.ts` - Feedback list state
- `cyclesStore.ts` - Cycles list state
- `notificationStore.ts` - Notifications state

**Pattern**: Each store uses Zustand's `create()` API with async actions

#### `/components/` - Reusable UI Components
**Structure**:
- `auth/ProtectedRoute.tsx` - Authentication guard
- `auth/AdminRouteGuard.tsx` - Admin role guard
- `layout/Layout.tsx` - Main app layout with sidebar
- Domain-specific components organized by feature

#### `/lib/` - API & Utilities
- `api.ts:7-14` - Axios instance with interceptors
  - Cookie-based auth (withCredentials: true)
  - Auto-redirect on 401
  - Error toast notifications
- `endpoints.ts` - API endpoint constants (lines 93-149)

#### `/hooks/` - Custom React Hooks
- Shared logic extraction
- API query hooks using TanStack Query

#### `/types/` - TypeScript Definitions
- Frontend-specific type definitions
- API response interfaces

---

## System Boundaries & Layers

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (React)                   │
│  Pages → Stores (Zustand) → API Client (Axios)     │
└─────────────────┬───────────────────────────────────┘
                  │ HTTP/JSON (Cookie Auth)
                  │
┌─────────────────▼───────────────────────────────────┐
│              Backend API (Express)                  │
│                                                     │
│  ┌───────────────────────────────────────────┐    │
│  │ Routes → Controllers → Services           │    │
│  │     ▲                      │               │    │
│  │     │ Auth Middleware      │               │    │
│  │     │ RBAC Middleware      ▼               │    │
│  │     │              Database Models          │    │
│  └─────┼──────────────────────┼───────────────┘    │
│        │                      │                     │
│  ┌─────┴───────┐      ┌───────▼─────┐             │
│  │ EventEmitter│◄────►│ Event       │             │
│  │   (In-Mem)  │      │ Handlers    │             │
│  └─────────────┘      └─────────────┘             │
│                                                     │
└─────────────────┬───────────────────────────────────┘
                  │ SQL
                  │
┌─────────────────▼───────────────────────────────────┐
│            PostgreSQL Database                      │
│   Users • Organizations • Feedback • Cycles         │
│   Notifications • Analytics • Hierarchy             │
└─────────────────────────────────────────────────────┘
```

**Dependency Rules**:
1. **Frontend → Backend**: API calls only through `/api/v1` endpoints
2. **Controllers → Services**: Controllers delegate to services, no business logic in controllers
3. **Services → Database**: Services use Model classes, never raw SQL in services
4. **Cross-Module Communication**: Via EventEmitter only, no direct service imports between modules
5. **Auth Flow**: Middleware validates JWT cookie before reaching controllers

**Enforcement**:
- TypeScript prevents import violations
- Middleware chain enforces authentication before business logic
- EventEmitter prevents tight coupling between modules

---

## Key Abstractions & Types

### Backend Core Classes

#### **Service Classes** (28 total)
**Pattern**: Business logic layer with constructor dependency injection

**Example**: `FeedbackService` (`backend/src/modules/feedback/services/feedback.service.ts:24`)
```typescript
constructor(
  private db: Pool,           // Database connection pool
  eventEmitter: EventEmitter, // For cross-module events
  logger: Logger              // Logging utility
)
```

**Used by**: Controllers (via DI in `app.ts`)  
**Responsibilities**: Business logic, transaction management, event emission

**Key Services**:
- `FeedbackService:24` - Feedback CRUD, status transitions
- `CycleService:22` - Cycle lifecycle management
- `NotificationService:24` - Multi-channel notification dispatch
- `AnalyticsService:23` - Metrics calculation
- `HierarchyService:24` - Org chart queries

#### **Controller Classes** (13 total)
**Pattern**: Thin HTTP handlers that delegate to services

**Example**: `FeedbackController` (`backend/src/modules/feedback/controllers/feedback.controller.ts:6`)
```typescript
constructor(private feedbackService: FeedbackService)

createFeedback = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id;
  const feedback = await this.feedbackService.createFeedback(userId, req.body);
  res.status(201).json(feedback);
}
```

**Responsibilities**: Extract user context, call service, format response, error handling

#### **Model Classes**
**Pattern**: Database access layer (Active Record pattern)

**Responsibilities**: SQL queries, row-to-object mapping  
**Used by**: Services only (not exposed to controllers)

### Frontend Core Abstractions

#### **Zustand Stores** (11 total)
**Pattern**: Global state management with async actions

**Example**: `authStore` (`frontend/src/stores/authStore.ts:33`)
```typescript
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string) => Promise<void>
  logout: () => Promise<void>
}
```

**Used by**: React components via `useAuthStore()` hook  
**Responsibilities**: State management, API calls, optimistic updates

#### **Protected Routes**
- `ProtectedRoute` - Requires authentication
- `AdminRouteGuard` - Requires admin role

---

## Architectural Decisions

### ADR-001: Express.js Over NestJS/Fastify
**Date**: 2024 | **Status**: Accepted

**Context**: Needed Node.js backend framework for REST API

**Alternatives**:
- **NestJS**: Full-featured framework with DI, decorators, modules
- **Fastify**: Performance-focused, schema validation
- **Express**: Minimal, flexible, widely adopted

**Decision**: Express.js v5

**Consequences**:
- **PROS**: 
  - Simple, minimal learning curve
  - Maximum flexibility in architecture
  - Massive ecosystem, easy to hire for
  - Manual DI keeps dependencies explicit
- **CONS**: 
  - No built-in DI container (manual wiring in `app.ts`)
  - Less opinionated (need to establish patterns)
  - Slower than Fastify (~30% per benchmark)

---

### ADR-002: Manual DI Over IoC Container
**Date**: 2024 | **Status**: Accepted

**Context**: Need dependency injection for testability

**Alternatives**:
- **IoC Container** (InversifyJS, TSyringe): Automatic resolution
- **Manual DI**: Explicit constructor injection

**Decision**: Manual dependency injection in `app.ts:79-146`

**Consequences**:
- **PROS**:
  - Explicit, easy to trace dependencies
  - No magic, no decorators
  - Simple to understand for new developers
  - No third-party library dependency
- **CONS**:
  - Verbose initialization code (100+ lines in `app.ts`)
  - Manual wiring for each new service
  - Risk of forgetting dependencies

---

### ADR-003: EventEmitter Over Message Queue
**Date**: 2024 | **Status**: Accepted

**Context**: Need cross-module communication for notifications, analytics, integrations

**Alternatives**:
- **Message Queue** (RabbitMQ, Redis): Distributed, persistent
- **EventEmitter** (Node.js native): In-memory, synchronous

**Decision**: Node.js EventEmitter for inter-module events

**Consequences**:
- **PROS**:
  - Zero external dependencies
  - Synchronous execution within same process
  - Simple debugging (stack traces work)
  - Fast (no network overhead)
- **CONS**:
  - Not persistent (events lost on crash)
  - Not distributed (won't scale to multiple servers)
  - Synchronous blocking (can slow down requests)
  - **Future Migration Path**: If scaling to multiple servers, migrate to Redis Pub/Sub or RabbitMQ

**Event Integration**: See `app.ts:153-194` for event wiring

---

### ADR-004: Zustand Over Redux
**Date**: 2024 | **Status**: Accepted

**Context**: Need client-side state management for React

**Alternatives**:
- **Redux**: Industry standard, complex boilerplate
- **Zustand**: Minimal API, hooks-first
- **Jotai/Recoil**: Atomic state

**Decision**: Zustand

**Consequences**:
- **PROS**:
  - Minimal boilerplate (~20 lines per store)
  - Built-in TypeScript support
  - No Provider wrapper needed
  - Easy to add async actions
- **CONS**:
  - Less middleware ecosystem than Redux
  - No time-travel debugging
  - Smaller community

---

### ADR-005: Cookie-Based Auth Over Bearer Tokens
**Date**: 2024 | **Status**: Accepted

**Context**: Need secure authentication between frontend and backend

**Alternatives**:
- **Bearer Tokens**: JWT in Authorization header, client stores token
- **Cookies**: JWT in HttpOnly cookie, server-managed

**Decision**: Cookie-based JWT authentication

**Consequences**:
- **PROS**:
  - Automatic CSRF protection with SameSite flag
  - HttpOnly flag prevents XSS token theft
  - Browser handles storage/transmission automatically
  - No client-side token management complexity
- **CONS**:
  - Requires CORS configuration (`credentials: true`)
  - Can't use for mobile apps (need separate auth flow)
  - Debugging harder (cookies not visible in request body)

**Implementation**:
- Backend: `app.ts:50-74` CORS config, `shared/middleware/auth.middleware.ts:6-41` JWT verification
- Frontend: `lib/api.ts:13` `withCredentials: true`

---

### ADR-006: Modular Monolith Over Microservices
**Date**: 2024 | **Status**: Accepted

**Context**: System architecture approach

**Alternatives**:
- **Microservices**: Separate services per domain
- **Modular Monolith**: Single process, modular code

**Decision**: Modular monolith with event-driven boundaries

**Consequences**:
- **PROS**:
  - Single deployment artifact
  - Shared database transactions
  - Simple debugging (single process)
  - Fast inter-module communication (in-memory)
  - Easy to extract microservice later (modules are already isolated)
- **CONS**:
  - Must scale entire app (can't scale individual modules)
  - Risk of tight coupling if event boundaries not respected
  - Single point of failure

---

### ADR-007: PostgreSQL Over NoSQL
**Date**: 2024 | **Status**: Accepted

**Context**: Database choice for relational data (users, orgs, feedback, cycles)

**Alternatives**:
- **PostgreSQL**: Relational, ACID, rich querying
- **MongoDB**: Document store, flexible schema
- **DynamoDB**: Fully managed, serverless

**Decision**: PostgreSQL

**Consequences**:
- **PROS**:
  - Strong consistency (ACID transactions)
  - Complex joins for analytics queries
  - Foreign keys enforce data integrity
  - Full-text search (pg_trgm extension)
  - Mature tooling, widely known
- **CONS**:
  - Schema migrations required for changes
  - Harder to scale horizontally than NoSQL
  - Need to manage database server

---

## Cross-Cutting Concerns

### Error Handling

**Strategy**: Custom error classes with HTTP status codes, Express error middleware

**Error Classes** (`backend/src/shared/utils/errors.ts:3-25`):
```typescript
ValidationError (400) - Input validation failures
NotFoundError (404)   - Resource not found
ForbiddenError (403)  - Authorization failures
```

**Propagation Flow**:
1. Service throws custom error (e.g., `throw new NotFoundError('User not found')`)
2. Controller catches error in try/catch
3. Express `next(error)` passes to error middleware
4. Error middleware maps error type to HTTP status and response format

**Invariants**:
- Always use custom error classes, never throw raw strings
- Controllers must call `next(err)` for async errors
- Services log errors before throwing

**Frontend Error Handling** (`frontend/src/lib/api.ts:34-89`):
- Axios interceptor catches all HTTP errors
- Maps status codes to user-friendly toast messages
- Auto-redirects to login on 401

---

### Testing

**Framework**: Jest (backend) | Vitest (frontend unit) | Playwright (frontend e2e)  
**Location**: `backend/tests/` | `frontend/src/test/`  
**Run Commands**:
```bash
# Backend
npm test                    # All tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report

# Frontend
npm test                    # Vitest unit tests
npm run test:e2e            # Playwright e2e tests
```

**Test Structure**:
```
backend/tests/
  unit/          # Module unit tests (services, controllers, models)
  integration/   # API integration tests (multi-module flows)
  e2e/           # Full user journey tests
  __test-utils__/ # Shared fixtures, mocks, helpers
```

**Philosophy**:
- **Unit Tests**: Test service business logic in isolation (mock database)
- **Integration Tests**: Test API endpoints with real database (test transactions)
- **E2E Tests**: Test critical user flows (login → create feedback → submit)

**Coverage**: 396 test suites across 40 test files (as of grep count)

**Key Test Utilities**:
- Database fixtures in `__test-utils__/fixtures/`
- Mock services in `__test-utils__/mocks/`
- Test database helpers for cleanup

---

### Configuration

**Environment Variables** (`.env` file):

**Required**:
- `DATABASE_URL` - PostgreSQL connection string (default: `postgres://user:pass@localhost:5432/feedbackflow`)
- `JWT_SECRET` - JWT signing secret (default: `changeme` - **CHANGE IN PRODUCTION**)
- `PORT` - Server port (default: `5000`)

**Optional**:
- `FRONTEND_URL` - Frontend origin for CORS (default: allows localhost:3000, 3006, 5173)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (optional, enables Google login)
- `NODE_ENV` - Environment (development | production)

**Loading**: `dotenv` loaded at top of `server.ts:3`

**Precedence**: Environment variables → `.env` file → hardcoded defaults

**Security Notes**:
- Never commit `.env` to git (use `.env.example` template)
- Rotate `JWT_SECRET` in production
- Use separate databases for dev/staging/production

---

### Security

#### Authentication
**Implementation**: Cookie-based JWT (`backend/src/shared/middleware/auth.middleware.ts:6-41`)

**Flow**:
1. User logs in with Google OAuth or mock auth
2. Backend generates JWT with user claims (id, email, roles)
3. JWT stored in HttpOnly cookie (XSS protection)
4. Every request includes cookie automatically
5. Auth middleware validates JWT and attaches user to `req.user`

**Security Measures**:
- `HttpOnly` cookie flag (prevents JavaScript access)
- `SameSite: Strict` (CSRF protection)
- `Secure: true` in production (HTTPS only)
- JWT expiration (default: 7 days)

#### Authorization
**Implementation**: RBAC middleware (`backend/src/modules/auth/middleware/rbac.middleware.ts`)

**Roles**:
- `super_admin` - Full system access
- `admin` - Organization management
- `manager` - Team and feedback management
- `employee` - Basic feedback access

**Check Example** (`feedback.routes.ts:46`):
```typescript
router.post('/', rbacMiddleware(['employee', 'manager', 'hr']), ...)
```

#### Data Protection
- Password hashing (if using password auth)
- SQL injection prevention via parameterized queries
- XSS prevention via React's automatic escaping
- CORS restrictions (`app.ts:50-74`)
- Rate limiting (`feedback.routes.ts:28-32`)

#### Security Headers
**Helmet.js** enabled (`app.ts:49`):
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (HTTPS)

---

### Observability

#### Logging
**Framework**: Custom Logger class (`backend/src/shared/utils/logger.ts:3-18`)

**Log Levels**:
- `info` - General information
- `warn` - Warning messages
- `error` - Error messages with stack traces
- `debug` - Debug information

**Usage**: All services accept Logger via DI:
```typescript
this.logger.info('Feedback created', { feedbackId, userId })
this.logger.error('Database error', { error })
```

**Structured Logging**: Pass metadata as second argument for structured logs

**Production Enhancement**: Replace console with Winston/Pino for:
- Log rotation
- JSON formatting
- External log shipping (CloudWatch, Datadog)

#### Metrics
**Current**: None implemented

**Future**: Add Prometheus metrics for:
- HTTP request counts/latency
- Database query performance
- Event processing times
- Business metrics (feedback submissions, cycle completion rates)

#### Debug Tips
- Enable verbose logging: Set `LOG_LEVEL=debug` in `.env`
- Database query logging: Set `DEBUG=pg` to log all SQL queries
- Frontend network inspection: Check browser DevTools → Network tab → Cookies
- Event debugging: Add listeners to EventEmitter in `app.ts` to log all events

---

## Dependencies & Build

### Key Backend Dependencies

**Framework**:
- `express@5.1.0` - Web framework
- `pg@8.16.3` - PostgreSQL client

**Authentication**:
- `jsonwebtoken@9.0.2` - JWT signing/verification
- `google-auth-library@10.3.0` - Google OAuth token validation
- `cookie-parser@1.4.7` - Cookie parsing middleware

**Security**:
- `helmet@8.1.0` - Security headers
- `cors@2.8.5` - CORS handling

**Utilities**:
- `multer@2.0.2` - File uploads
- `csv-parse@6.1.0` - CSV import

**Testing**:
- `jest@30.2.0` - Test framework
- `supertest@7.1.4` - HTTP assertion library
- `ts-jest@29.4.4` - TypeScript transformer for Jest

### Key Frontend Dependencies

**UI Framework**:
- `react@18.2.0` - UI library
- `react-router-dom@6.20.1` - Client-side routing
- `tailwindcss@3.3.5` - Utility-first CSS

**State Management**:
- `zustand@4.4.7` - State management
- `@tanstack/react-query@5.8.4` - Server state/caching

**Forms & Validation**:
- `react-hook-form@7.48.2` - Form handling
- `zod@3.22.4` - Schema validation
- `@hookform/resolvers@3.3.2` - Form validation integration

**UI Components**:
- `framer-motion@10.16.5` - Animations
- `lucide-react@0.294.0` - Icons
- `recharts@2.8.0` - Charts
- `react-hot-toast@2.4.1` - Toast notifications

**Authentication**:
- `@react-oauth/google@0.12.2` - Google OAuth React components

**HTTP Client**:
- `axios@1.6.2` - HTTP requests

**Testing**:
- `vitest@1.0.0` - Unit test framework
- `@playwright/test@1.55.1` - E2E test framework
- `@testing-library/react@14.1.2` - React testing utilities

### Build Commands

#### Backend
```bash
npm install              # Install dependencies
npm run dev              # Development mode (nodemon hot reload)
npm run build            # Production build (TypeScript → JavaScript)
npm start                # Run production build
npm test                 # Run all tests
npm run test:coverage    # Run tests with coverage report
```

#### Frontend
```bash
npm install              # Install dependencies
npm run dev              # Development mode (Vite dev server on port 3006)
npm run build            # Production build (TypeScript + Vite)
npm run preview          # Preview production build
npm test                 # Run unit tests (Vitest)
npm run test:e2e         # Run E2E tests (Playwright)
npm run lint             # ESLint
```

#### Monorepo Root
```bash
npm install              # Install all workspaces (frontend + backend)
```

---

## Design Patterns & Constraints

### Patterns Used

#### Layered Architecture
**Where**: All backend modules  
**Why**: Separation of concerns, testability  
**Example**: `feedback.routes.ts:43-47` → `feedback.controller.ts:9-16` → `feedback.service.ts:47-85`

#### Dependency Injection
**Where**: Service/Controller constructors  
**Why**: Testability, loose coupling  
**Example**: `app.ts:134-138` manual DI

#### Repository/Active Record Pattern
**Where**: Model classes  
**Why**: Encapsulate database access  
**Example**: `feedback.model.ts` wraps SQL queries

#### Event-Driven Architecture
**Where**: Cross-module communication  
**Why**: Loose coupling between modules  
**Example**: `app.ts:153-194` event wiring, modules emit events instead of calling each other directly

#### Observer Pattern
**Where**: EventEmitter for business events  
**Why**: Multiple modules react to same event (notifications, analytics, integrations)  
**Example**: `cycle:created` event triggers notifications, analytics, and webhooks

#### Factory Pattern (implicit)
**Where**: Service instantiation in `app.ts`  
**Why**: Centralized object creation

#### Middleware Pipeline
**Where**: Express routes  
**Why**: Composable request processing  
**Example**: `feedback.routes.ts:24-32` auth → rate limit → validation → RBAC → controller

---

### Anti-Patterns to Avoid

#### AVOID: Direct Service-to-Service Calls Across Modules
**Why**: Creates tight coupling, violates module boundaries  
**Instead**: Use EventEmitter for cross-module communication  
**Example**: NotificationService doesn't import FeedbackService, it listens to `feedback:created` event

#### AVOID: Business Logic in Controllers
**Why**: Makes testing harder, violates separation of concerns  
**Instead**: Keep controllers thin, delegate to services  
**Bad**: `controller.ts` has SQL queries or validation logic  
**Good**: `controller.ts:9-16` only extracts request data and calls service

#### AVOID: Raw SQL in Services
**Why**: Hard to test, duplicate queries, SQL injection risk  
**Instead**: Use Model classes for database operations  
**Bad**: `await db.query('SELECT * FROM users WHERE id = ' + userId)`  
**Good**: `await this.feedbackModel.findById(id, client)`

#### AVOID: Storing JWT in localStorage
**Why**: XSS vulnerability, token can be stolen by malicious scripts  
**Instead**: Use HttpOnly cookies (current implementation)  
**See**: ADR-005

#### AVOID: Synchronous Event Handlers Blocking Request
**Why**: Slows down API response times  
**Current State**: EventEmitter handlers are synchronous (potential bottleneck)  
**Future**: Consider async handlers or message queue for long-running tasks

---

### Assumptions

**Runtime Environment**:
- Node.js 20+ (ESM modules required)
- PostgreSQL 14+ (for pg_trgm extension)
- Single-server deployment (EventEmitter not distributed)

**Scale/Load**:
- < 10,000 users per organization
- < 100 concurrent requests (EventEmitter synchronous overhead acceptable)
- Database on same network as application (low latency)

**User Behavior**:
- Feedback cycles typically 1-3 months apart (not continuous)
- Peak load during cycle start/end dates
- Most users access via web browser (mobile app not primary)

**Data**:
- Feedback content is text-based (no heavy media files)
- Organization hierarchy depth < 10 levels
- User profile pictures stored externally (Google OAuth profile picture URL)

---

### Constraints

**Technical**:
- Must run on Node.js (no Python/Java)
- PostgreSQL required (no MySQL/SQLite support)
- Cookie authentication requires same-domain or CORS configuration

**Business**:
- Multi-tenancy via `organization_id` in all tables (data isolation required)
- GDPR compliance for user data (delete/export capabilities)
- Audit trails required for feedback and cycles

**Operational**:
- Zero-downtime deployments not supported (EventEmitter in-memory)
- Horizontal scaling requires migration to message queue
- Database migrations must be backward compatible

---

## Contributors Guide

### Bug Fixes

**Locate**:
1. Check error logs for stack trace
2. Bug likely in:
   - API errors → `backend/src/modules/[module]/services/`
   - UI bugs → `frontend/src/pages/` or `frontend/src/components/`
   - Auth issues → `backend/src/shared/middleware/auth.middleware.ts:6-41`

**Fix**:
1. Add failing test in `backend/tests/unit/[module]/` or `frontend/src/test/`
2. Fix code in service/component
3. Verify test passes: `npm test`
4. Check linting: `npm run lint` (frontend)

**Test**:
```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
cd frontend && npm run test:e2e  # If UI change
```

---

### New Features

**Design**:
1. Review this ARCHITECTURE.md to understand existing patterns
2. Identify affected modules (e.g., new feedback type → `feedback/` module)
3. Check if new module needed or extend existing module
4. Design event integration (what events to emit/subscribe to)

**Implement**:
1. **Backend Module**:
   - Add types in `types/[module].types.ts`
   - Add database operations in `models/`
   - Add business logic in `services/`
   - Add HTTP handlers in `controllers/`
   - Add routes in `routes/`
   - Wire up in `app.ts` (DI + events)
   - Follow example from `modules/feedback/`

2. **Frontend Feature**:
   - Add page component in `pages/[feature]/`
   - Add route in `router.tsx`
   - Add store in `stores/[feature]Store.ts` following `authStore.ts:33` pattern
   - Add API calls to store actions
   - Add UI components in `components/[feature]/`

**Test**:
1. Add unit tests for service logic
2. Add integration tests for API endpoints
3. Add E2E test for critical user flow (if applicable)

**Document**:
- Update this ARCHITECTURE.md if adding new module or pattern
- Add inline code comments for complex business logic
- Update API_REFERENCE.md for new endpoints

---

### Navigation Tips

**Find feature X**:
- Backend feature → `backend/src/modules/[domain]/`
- Frontend page → `frontend/src/pages/[feature]/`
- API endpoint → Search `router.{method}` in `backend/src/modules/*/routes/*.routes.ts`

**Understand component Y**:
- Service: Read tests first (`tests/unit/[module]/services/`)
- Component: Read usage in pages (`frontend/src/pages/`)

**Add capability Z**:
- Follow similar feature pattern:
  - New CRUD resource → Follow `feedback/` module structure
  - New event integration → Follow `app.ts:153-194` pattern
  - New admin page → Follow `admin/` pages pattern with `AdminRouteGuard`

**Debug API flow**:
1. Add breakpoint in controller method
2. Trace down to service
3. Check SQL queries in model
4. Verify event emission
5. Check event handlers responding

**Debug authentication**:
1. Check cookie in browser DevTools → Application → Cookies
2. Verify JWT payload at jwt.io
3. Check middleware at `auth.middleware.ts:6-41`
4. Verify user roles in database

**Search codebase**:
```bash
# Find all routes
grep -r "router\." backend/src/modules/*/routes/

# Find event emissions
grep -r "eventEmitter.emit" backend/src/

# Find API calls
grep -r "api\." frontend/src/
```

---

## Additional Resources

**Documentation**:
- `/docs/API_REFERENCE.md` - API endpoint documentation
- `/docs/DEPLOYMENT.md` - Deployment guide
- `/docs/CONTRIBUTING.md` - Contributing guidelines
- `/docs/development/setup.md` - Development environment setup
- `/docs/development/testing-guide.md` - Testing best practices

**Database**:
- `/database/setup.sql` - Database schema
- `/database/sql/schema/` - Modular schema files
- `/docs/architecture/database-design.md` - Database design (currently empty)

**Project Status**:
- `/BUILD_STATUS.md` - Current build and feature status
- `/E2E-TESTS-SUMMARY.md` - E2E test coverage
- `/COOKIE_AUTH_IMPLEMENTATION.md` - Auth implementation details

**Setup**:
- `/SETUP.md` - Initial setup instructions
- `/QUICK-START-TESTING.md` - Quick testing guide

