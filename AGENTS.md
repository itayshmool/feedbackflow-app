# AGENTS.md - FeedbackFlow

> **AI Agent Configuration for FeedbackFlow**  
> Employee feedback management system with performance cycles, hierarchical org structure, and real-time notifications

---

## Quick Start

**Before you begin:**
1. Read this file completely
2. Review `/ARCHITECTURE.md` for system design
3. Run tests before making changes: `cd backend && npm test` and `cd frontend && npm test`
4. Follow commit format: `type(scope): description`

**Key Links:**
- Architecture: `/ARCHITECTURE.md`
- Setup Guide: `/SETUP.md`
- Testing Guide: `/QUICK-START-TESTING.md`
- API Reference: `/docs/API_REFERENCE.md`

---

## Approval Policy

**Auto-Approve (No Ask Required):**
- Edit source code in `backend/src/`, `frontend/src/`
- Add/modify tests in `backend/tests/`, `frontend/e2e/`, `frontend/src/test/`
- Update documentation in `docs/`, markdown files

**Always Ask First:**
- Install/change dependencies (`package.json`, `package-lock.json`)
- Modify database schemas (`database/setup.sql`, migrations)
- Change configuration files (`.eslintrc`, `tsconfig.json`, `vite.config.ts`, etc.)
- Edit deployment files (`deployment/`, `docker-compose.yml`)
- Modify environment templates (`.env.example`)
- Database operations (migrations, seed data)
- CI/CD workflows (`.github/workflows/`)

**Never Touch:**
- Secret files (`.env`, credentials, API keys)
- Build artifacts (`dist/`, `coverage/`, `node_modules/`)
- User-uploaded content (`backend/uploads/`)
- IDE configs (`.vscode/`, `.idea/`)

| Action | Approval | Notes |
|--------|----------|-------|
| Edit `src/`, `tests/` | ✅ Auto | Source code and tests |
| Edit `docs/` | ✅ Auto | Documentation |
| Edit config files | ❓ Ask | tsconfig, eslint, vite, jest |
| Install dependencies | ❓ Ask | npm install, package.json |
| Database changes | ❓ Ask | Schemas, migrations, seed data |
| Deployment changes | ❓ Ask | Docker, K8s, Terraform |
| Secrets/credentials | 🚫 Never | .env, keys, tokens |
| Build artifacts | 🚫 Never | dist/, node_modules/, coverage/ |

---

## Project Structure & Access

```
feedbackflow-app/                 (monorepo root)
├── backend/                      ✅ FULL ACCESS
│   ├── src/                      (TypeScript source)
│   │   ├── modules/              (9 business domain modules)
│   │   │   ├── feedback/         (Core feedback CRUD)
│   │   │   ├── cycles/           (Performance cycle management)
│   │   │   ├── auth/             (Google OAuth, JWT)
│   │   │   ├── notifications/    (Multi-channel alerts)
│   │   │   ├── analytics/        (Dashboards, reports)
│   │   │   ├── hierarchy/        (Org chart, manager/employee)
│   │   │   ├── admin/            (Org & user management)
│   │   │   ├── integrations/     (Webhooks, Slack)
│   │   │   └── templates/        (Email templates)
│   │   ├── shared/               (Middleware, utils, types)
│   │   ├── config/               (Database, env setup)
│   │   ├── events/               (Event emitters, handlers)
│   │   └── server.ts             (Express app entry)
│   ├── tests/                    ✅ FULL ACCESS
│   │   ├── unit/                 (Service/model tests)
│   │   └── integration/          (API endpoint tests)
│   ├── dist/                     🚫 NEVER (build output)
│   └── package.json              ❓ ASK (dependencies)
│
├── frontend/                     ✅ FULL ACCESS
│   ├── src/                      (React + TypeScript)
│   │   ├── pages/                (Page components)
│   │   ├── components/           (Reusable UI)
│   │   ├── stores/               (Zustand state management)
│   │   ├── services/             (API client functions)
│   │   ├── hooks/                (React hooks)
│   │   ├── types/                (TypeScript interfaces)
│   │   └── router.tsx            (React Router config)
│   ├── e2e/                      ✅ FULL ACCESS (Playwright tests)
│   ├── public/                   ✅ EDIT (static assets)
│   └── package.json              ❓ ASK (dependencies)
│
├── database/                     ❓ ASK FIRST
│   ├── setup.sql                 (Schema definitions)
│   ├── sql/                      (Migration scripts)
│   └── docker-compose.yml        (PostgreSQL setup)
│
├── shared/                       ✅ FULL ACCESS
│   ├── types/                    (Shared TypeScript types)
│   ├── constants/                (Shared constants)
│   └── utils/                    (Shared utilities)
│
├── docs/                         ✅ EDIT (documentation)
├── deployment/                   ❓ ASK (Docker, K8s, Terraform)
├── scripts/                      ✅ EDIT (build/dev scripts)
└── .env*, secrets/               🚫 NEVER (credentials)
```

**Module Structure Pattern** (all modules follow this):
```
modules/[module-name]/
├── routes/          (Express routes, rate limits)
├── controllers/     (HTTP handlers - thin layer)
├── services/        (Business logic, event emission)
├── models/          (Database queries)
└── types/           (TypeScript interfaces)
```

---

## Setup & Development Commands

### Initial Setup
```bash
# Install all dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start PostgreSQL (optional - can use mock DB)
cd database && docker compose up -d

# Build backend
cd backend && npm run build
```

### Development Workflow

| Task | Command | Notes |
|------|---------|-------|
| **Backend Dev** | `cd backend && npm run dev` | Nodemon auto-restart (PostgreSQL required) |
| **Backend Build** | `cd backend && npm run build` | Compile TypeScript to dist/ |
| **Backend Start** | `cd backend && npm start` | Production mode |
| | | |
| **Frontend Dev** | `cd frontend && npm run dev` | Vite dev server (port 3003) |
| **Frontend Build** | `cd frontend && npm run build` | Production build |
| **Frontend Preview** | `cd frontend && npm run preview` | Preview prod build |
| | | |
| **Backend Tests** | `cd backend && npm test` | Jest (unit + integration) |
| **Backend Watch** | `cd backend && npm run test:watch` | Jest watch mode |
| **Backend Coverage** | `cd backend && npm run test:coverage` | Generate coverage report |
| **Backend Module Test** | `cd backend && npm run test:feedback` | Test specific module |
| | | |
| **Frontend Tests** | `cd frontend && npm test` | Vitest (unit) |
| **Frontend E2E** | `cd frontend && npm run test:e2e` | Playwright (headless) |
| **Frontend E2E UI** | `cd frontend && npm run test:e2e:ui` | Playwright UI mode |
| **Frontend E2E Debug** | `cd frontend && npm run test:e2e:debug` | Debug mode |
| | | |
| **Frontend Lint** | `cd frontend && npm run lint` | ESLint check |
| **Frontend Lint Fix** | `cd frontend && npm run lint:fix` | Auto-fix issues |
| **Frontend Type Check** | `cd frontend && npm run type-check` | TypeScript check (no emit) |

### Testing Requirements

**Before Committing:**
```bash
# 1. Backend tests must pass
cd backend && npm test

# 2. Frontend tests must pass
cd frontend && npm test

# 3. E2E tests for UI changes
cd frontend && npm run test:e2e

# 4. Type checking
cd backend && npm run build  # TypeScript compile
cd frontend && npm run type-check
```

**Test Organization:**
- **Backend Unit**: `backend/tests/unit/[module]/` - Service/model logic
- **Backend Integration**: `backend/tests/integration/` - API endpoints
- **Frontend Unit**: `frontend/src/test/` - Component/hook tests
- **Frontend E2E**: `frontend/e2e/` - Full user workflows

**Coverage:** Aim for >70% on new code (no strict minimum enforced)

---

## Style Guide & Conventions

### TypeScript
- **Strict mode:** Enabled in both frontend and backend
- **Target:** ES2020
- **Module:** ESNext
- **Unused vars:** Error (except `_` prefix for ignored params)
- **Explicit any:** Warn (minimize usage)

### Code Style
```typescript
// Line length: ~80-100 chars (no hard limit)
// Quotes: Single quotes preferred
// Semicolons: Yes (TypeScript standard)
// Indentation: 2 spaces
// Trailing commas: Yes in multiline

// Naming Conventions
class UserService {}           // PascalCase for classes
function getUserById() {}      // camelCase for functions
const MAX_RETRY_COUNT = 3;     // UPPER_SNAKE_CASE for constants
interface UserProfile {}       // PascalCase for interfaces/types

// File Naming
user.service.ts               // kebab-case for files
UserProfile.tsx               // PascalCase for React components
```

### Import Order
```typescript
// 1. Node built-ins
import { readFile } from 'fs';

// 2. External packages
import express from 'express';
import React from 'react';

// 3. Internal modules (absolute paths if configured)
import { UserService } from '@/services/user.service';

// 4. Relative imports
import { logger } from '../shared/utils/logger';
```

### React/Frontend Specific
- **Components:** PascalCase files (e.g., `FeedbackForm.tsx`)
- **Hooks:** `use` prefix (e.g., `useAuth.ts`)
- **Stores:** `[domain]Store.ts` (e.g., `authStore.ts`)
- **Services:** `[domain].service.ts` (e.g., `feedback.service.ts`)

---

## Architecture Patterns

### Backend Module Pattern (Layered Architecture)

**Flow:** `Route → Controller → Service → Model → Database`

```typescript
// 1. Route: HTTP routing + middleware
router.post('/feedback', authenticate, rbac(['EMPLOYEE']), controller.create);

// 2. Controller: Extract request data, call service, format response
class FeedbackController {
  async create(req, res, next) {
    const userId = req.user.id;
    const result = await this.service.createFeedback(userId, req.body);
    res.status(201).json(result);
  }
}

// 3. Service: Business logic, transactions, event emission
class FeedbackService {
  async createFeedback(userId, data) {
    const feedback = await this.model.create(userId, data);
    this.eventEmitter.emit('feedback:created', feedback);
    return feedback;
  }
}

// 4. Model: Database queries
class FeedbackModel {
  async create(userId, data) {
    const result = await this.db.query('INSERT INTO feedback...');
    return result.rows[0];
  }
}
```

**Key Principles:**
- **Controllers are thin** - No business logic, just request/response handling
- **Services contain business logic** - Transactions, validation, event emission
- **Models handle database** - SQL queries, row mapping
- **Cross-module communication via events** - No direct service imports

### Frontend State Management (Zustand)

**Pattern:** Global stores with async actions

```typescript
// Store definition
interface FeedbackStore {
  feedbacks: Feedback[];
  loading: boolean;
  fetchFeedback: () => Promise<void>;
}

const useFeedbackStore = create<FeedbackStore>((set) => ({
  feedbacks: [],
  loading: false,
  fetchFeedback: async () => {
    set({ loading: true });
    const data = await api.get('/feedback');
    set({ feedbacks: data, loading: false });
  },
}));

// Usage in components
const { feedbacks, fetchFeedback } = useFeedbackStore();
```

### Dependency Injection

**Backend DI Container** (`backend/src/app.ts`):
```typescript
// Services instantiated once, injected into controllers
const feedbackService = new FeedbackService(db, eventEmitter, logger);
const feedbackController = new FeedbackController(feedbackService);
```

---

## Domain Terminology

| Term | Definition | Module |
|------|------------|--------|
| **Feedback** | Performance review given from one employee to another (giver → receiver) | `feedback/` |
| **Cycle** | Time-bound feedback collection period (e.g., Q1 2024). States: DRAFT → ACTIVE → CLOSED | `cycles/` |
| **Giver** | Employee who writes feedback | `feedback/` |
| **Receiver** | Employee who receives feedback | `feedback/` |
| **Draft** | Saved but not submitted feedback (status: DRAFT) | `feedback/` |
| **Status Transition** | Feedback lifecycle: DRAFT → SUBMITTED → ACKNOWLEDGED → COMPLETED | `feedback/` |
| **Rating** | Numerical score (1-5) for a competency within feedback | `feedback/` |
| **Goal** | Objective set within feedback for receiver | `feedback/` |
| **Hierarchy** | Manager-employee organizational structure | `hierarchy/` |
| **Notification** | Email or in-app alert for feedback events | `notifications/` |
| **Template** | Reusable feedback structure with prompts | `templates/` |
| **Analytics** | Dashboard metrics: completion rates, response times, trends | `analytics/` |
| **Organization** | Multi-tenant entity, users belong to one org | `admin/` |
| **RBAC** | Role-Based Access Control (ADMIN, MANAGER, EMPLOYEE) | `auth/` |

---

## What NOT to Do (Anti-Patterns)

### ❌ Direct Service-to-Service Calls Across Modules
**Why:** Creates tight coupling, violates module boundaries  
**Instead:** Use EventEmitter for cross-module communication

```typescript
// ❌ BAD: NotificationService imports FeedbackService
import { FeedbackService } from '../feedback/services/feedback.service';
class NotificationService {
  async notifyOnFeedback() {
    const feedback = await this.feedbackService.getById(id); // Tight coupling
  }
}

// ✅ GOOD: Listen to events
class NotificationService {
  constructor(eventEmitter) {
    eventEmitter.on('feedback:created', this.handleFeedbackCreated);
  }
  handleFeedbackCreated = (feedback) => { /* send notification */ }
}
```

### ❌ Business Logic in Controllers
**Why:** Makes testing harder, violates separation of concerns  
**Instead:** Keep controllers thin, delegate to services

```typescript
// ❌ BAD: Validation and business logic in controller
async create(req, res) {
  if (!req.body.title) throw new Error('Title required');
  const result = await db.query('INSERT INTO feedback...');
  await db.query('INSERT INTO notification...');
  res.json(result);
}

// ✅ GOOD: Controller only handles HTTP concerns
async create(req, res) {
  const userId = req.user.id;
  const feedback = await this.service.createFeedback(userId, req.body);
  res.status(201).json(feedback);
}
```

### ❌ Raw SQL in Services
**Why:** Hard to test, duplicate queries, SQL injection risk  
**Instead:** Use Model classes for database operations

```typescript
// ❌ BAD: Raw SQL in service
async createFeedback(data) {
  const result = await this.db.query('SELECT * FROM users WHERE id = ' + userId);
}

// ✅ GOOD: Use model methods
async createFeedback(data) {
  const feedback = await this.feedbackModel.create(data);
}
```

### ❌ Storing JWT in localStorage
**Why:** XSS vulnerability (tokens can be stolen by malicious scripts)  
**Instead:** Use HttpOnly cookies (current implementation)

```typescript
// ❌ BAD: localStorage.setItem('token', jwt)
// ✅ GOOD: res.cookie('token', jwt, { httpOnly: true, secure: true })
```

### ❌ Synchronous Event Handlers Blocking Requests
**Why:** Slows down API response times  
**Current State:** EventEmitter handlers are synchronous (potential bottleneck)  
**Future:** Consider async handlers or message queue for long-running tasks

### ❌ Skipping Tests
**Why:** Breaks existing functionality, accumulates technical debt  
**Always:** Run tests before committing (see Testing Requirements above)

---

## AI Workflow Standards

> **From `backend/.cursorrules` - Critical for AI agents**

### 1. Honest Status Reporting
- **NEVER** claim something is "complete" if it uses mock/placeholder data
- Always distinguish:
  - ✅ What works end-to-end with real data
  - ⚠️ What works partially (UI only, mock data)
  - ❌ What's not implemented yet
- Example: "Status: UI works ✅, Backend returns mock data ⚠️, Real DB query NOT implemented ❌"

### 2. Test Before Claiming Success
**Before marking ANY task complete:**
1. Run actual test (API call, UI interaction)
2. Show test results/evidence
3. Verify with real data (not mocks)
- If testing reveals issues, report immediately

### 3. Stop and Ask When Stuck
**When hitting errors/blockers:**
1. Stop immediately (don't hide with workarounds)
2. Show the error clearly
3. Present options: "Error X occurred. Should I: A) try to fix, B) skip feature, C) different approach?"
- **NEVER** use mock data as workaround without explicit approval

### 4. Incremental Verification
**For each feature:**
1. **Plan** - Show what will be done
2. **Implement** - Make changes
3. **Test** - Actually test with evidence
4. **User Verify** - Wait for confirmation
5. **Only Then** - Mark complete

### 5. Evidence-Based Claims
**Don't say "everything works" - show:**
- API response
- Database query results
- UI screenshot/behavior
- Test output
- Backend logs with successful queries
- Actual data returned (not mock)

### 6. One Thing at a Time
- Work on ONE small, testable piece
- Test thoroughly
- Get user confirmation
- Then move to next
- Don't stack unverified changes

### 7. Clear Issue Reporting
**When reporting problems:**
- **What failed**: Specific action/test
- **Error**: Exact error message
- **Impact**: What doesn't work
- **Options**: 2-3 possible solutions
- **Recommendation**: Which option and why

**Example Good Error Report:**
```
❌ Database query error: "could not determine data type of parameter $1"
Impact: Team feedback shows empty list
Options:
A) Fix parameter type casting in query
B) Use simpler query without parameters
C) Debug parameter values being passed
Recommendation: Option A - fix the type casting
```

---

## Commit Guidelines

### Format
```
type(scope): short description

[optional body]

[optional footer]
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, no logic change)
- `refactor` - Code restructuring (no behavior change)
- `test` - Add/update tests
- `chore` - Maintenance (deps, build, etc.)
- `perf` - Performance improvement

### Scopes (Module Names)
- `auth` - Authentication/authorization
- `feedback` - Feedback CRUD
- `cycles` - Performance cycles
- `notifications` - Notification system
- `analytics` - Dashboards/reports
- `hierarchy` - Org structure
- `admin` - Admin features
- `integrations` - External services
- `frontend` - General frontend
- `backend` - General backend
- `database` - Database/migrations
- `deployment` - Deployment/infra

### Examples
```bash
feat(feedback): add draft auto-save functionality
fix(cycles): correct date validation for overlapping cycles
docs(readme): update setup instructions for M1 Macs
test(auth): add integration tests for JWT refresh
refactor(notifications): extract email template rendering
chore(deps): upgrade React to v18.2.0
```

### Branch Naming
```
feature/feedback-templates
fix/cycle-date-validation
refactor/notification-service
test/e2e-feedback-workflow
docs/architecture-update
```

---

## Protected Files (Never Edit)

### Generated/Build Output
- `backend/dist/` - Compiled TypeScript
- `frontend/dist/` - Production build
- `coverage/` - Test coverage reports
- `node_modules/` - Dependencies
- `*.log` - Log files
- `.cache/` - Build cache

### Secrets/Credentials
- `.env` - Environment variables
- `.env.local` - Local overrides
- `*.pem` - SSL certificates
- `*.key` - Private keys
- `credentials.*` - Any credential files

### IDE/Editor
- `.vscode/` - VS Code settings
- `.idea/` - IntelliJ settings
- `.DS_Store` - macOS metadata

### User Data
- `backend/uploads/` - User-uploaded files
- `database/backups/` - Database backups

---

## Monorepo Guidelines

### Workspace Structure
- **Root**: Shared scripts, docs, top-level configs
- **Backend**: Node.js API server (port 5000)
- **Frontend**: React SPA (port 3003)
- **Shared**: Types and utilities used by both

### Nested Configuration Override
- Nested AGENTS.md files override parent rules (closest wins)
- User prompts override ALL file-based rules
- Example: `backend/AGENTS.md` can customize backend-specific conventions

### Cross-Package Communication
- **Backend → Frontend**: REST API only (`/api/v1/*`)
- **Shared Types**: Import from `shared/types/`
- **No Direct Imports**: Frontend cannot import from `backend/src/`

### Working Across Packages
```bash
# Install all workspaces
npm install  # from root

# Add dependency to specific workspace
cd backend && npm install express
cd frontend && npm install react-query

# Run commands across workspaces
npm run dev --workspace=backend
npm run dev --workspace=frontend
```

---

## Testing Strategy

### Test-Driven Development (TDD)
**Recommended (not required):** Write tests first for complex logic

1. Write failing test
2. Implement feature
3. Test passes
4. Refactor

### Test Pyramid
```
       /\
      /E2E\        (Few - Critical user flows)
     /------\
    / Integ  \     (Some - API endpoints)
   /----------\
  /   Unit     \   (Many - Services, models, utils)
 /--------------\
```

### When to Add Tests
- **Always**: New service methods (unit tests)
- **Always**: New API endpoints (integration tests)
- **Recommended**: New React components (unit tests)
- **For critical flows**: E2E tests (login, feedback submission)

### Test File Naming
```
backend/tests/unit/feedback/services/feedback.service.test.ts
backend/tests/integration/auth/login.test.ts
frontend/src/components/FeedbackForm.test.tsx
frontend/e2e/feedback-workflow.spec.ts
```

---

## Helpful Resources

### Documentation
- **Architecture Deep Dive**: `/ARCHITECTURE.md` (1000+ lines, read first!)
- **Setup Guide**: `/SETUP.md`
- **Quick Testing**: `/QUICK-START-TESTING.md`
- **API Reference**: `/docs/API_REFERENCE.md`
- **Deployment**: `/docs/DEPLOYMENT.md`

### Key Entry Points
- **Backend Server**: `backend/src/server.ts:25`
- **Backend App DI**: `backend/src/app.ts:48-196`
- **Frontend Entry**: `frontend/src/main.tsx:68`
- **Frontend Router**: `frontend/src/router.tsx:39-169`
- **Database Schema**: `database/setup.sql`

### Code Navigation
```bash
# Find all routes
grep -r "router\." backend/src/modules/*/routes/

# Find event emissions
grep -r "eventEmitter.emit" backend/src/

# Find API calls
grep -r "api\." frontend/src/

# Find component usage
grep -r "import.*FeedbackForm" frontend/src/
```

### Debug Tips
**API Flow:**
1. Add breakpoint in controller
2. Trace to service
3. Check model SQL queries
4. Verify event emission

**Authentication:**
1. Check cookie in DevTools → Application → Cookies
2. Verify JWT at jwt.io
3. Check `auth.middleware.ts:6-41`
4. Verify roles in database

**Frontend State:**
1. Use React DevTools
2. Check Zustand store state
3. Inspect API calls in Network tab

---

## Quick Reference

### Common Tasks

**Add New API Endpoint:**
1. Define types in `backend/src/modules/[module]/types/`
2. Add database method in `models/`
3. Add service method in `services/`
4. Add controller method in `controllers/`
5. Register route in `routes/`
6. Add tests in `backend/tests/`

**Add New Frontend Page:**
1. Create page in `frontend/src/pages/[feature]/`
2. Add route in `frontend/src/router.tsx`
3. Create store in `frontend/src/stores/[feature]Store.ts`
4. Add API service calls
5. Add E2E test if critical flow

**Add Database Migration:**
1. Create SQL file in `database/sql/`
2. Update `backend/src/database/migrate.ts`
3. Test migration: `cd backend && node dist/test-migrations.js`
4. Get approval before applying

### Ports & URLs
- **Frontend**: http://localhost:3003
- **Backend**: http://localhost:5000
- **API Health**: http://localhost:5000/api/v1/health
- **PostgreSQL**: localhost:5432

### Environment Variables
See `.env.example` for required variables (never commit `.env`)

---

## Support & Questions

If you encounter issues:
1. Check `/SETUP.md` troubleshooting section
2. Review logs in terminal
3. Verify services are running
4. Test API manually with curl/Postman
5. Check `/ARCHITECTURE.md` for design patterns

**Remember:** Ask questions when uncertain. Better to clarify than make incorrect assumptions.

---

**Last Updated:** 2024-11-17  
**Version:** 1.0.0  
**Maintainer:** FeedbackFlow Team

