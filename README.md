# FeedbackFlow

> **Enterprise-grade employee feedback management system** with performance cycles, organizational hierarchy, and real-time notifications.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Authentication & Login](#authentication--login)
- [Project Structure](#project-structure)
- [Development](#development)
- [Testing](#testing)
- [Modules Overview](#modules-overview)
- [API Overview](#api-overview)
- [Known Issues](#known-issues)
- [Documentation](#documentation)
- [Contributing](#contributing)

---

## 🎯 Overview

**FeedbackFlow** is a comprehensive employee performance management platform that enables organizations to:

- **Collect structured feedback** through customizable performance cycles
- **Manage organizational hierarchy** with manager-employee relationships
- **Track performance metrics** through analytics dashboards
- **Automate notifications** via email and in-app channels
- **Generate reports** for performance reviews and insights
- **Integrate with external tools** like Slack via webhooks

### What Problem Does It Solve?

Traditional performance review processes are often:
- **Manual and time-consuming** - paper-based or spreadsheet-driven
- **Inconsistent** - lack of standardized templates and workflows
- **Opaque** - poor visibility into team and organizational performance
- **Disconnected** - no integration with existing communication tools

FeedbackFlow addresses these issues with a **centralized, automated, and data-driven** feedback management system.

---

## ✨ Key Features

### 🔄 Performance Cycles
- Create time-bound feedback collection periods (quarterly, annual, etc.)
- Define participant groups and feedback templates
- Track completion rates and send automated reminders
- Support for multiple cycle types: 360°, manager-only, self-assessment

### 📝 Feedback Management
- **Draft system** - save in-progress feedback
- **Structured templates** - consistent feedback format
- **Ratings & goals** - quantitative and qualitative assessments
- **Comments & threads** - collaborative feedback discussions
- **Status tracking** - DRAFT → SUBMITTED → ACKNOWLEDGED → COMPLETED

### 👥 Organizational Hierarchy
- Visual org chart with manager-employee relationships
- Department and team management
- Role-based access control (Super Admin, Admin, Manager, Employee)
- Bulk user import via CSV

### 📊 Analytics & Reports
- Real-time dashboards with completion metrics
- Team performance analytics
- Response time tracking
- Exportable reports (PDF, CSV)
- Trend analysis across cycles

### 🔔 Smart Notifications
- Multi-channel delivery (email, in-app)
- Customizable templates with variable interpolation
- User preference management
- Event-driven triggers (feedback received, cycle ending, etc.)

### 🔗 Integrations
- Webhook support for external systems
- Slack notifications
- CSV import/export
- RESTful API for custom integrations

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js 5.x
- **Language**: TypeScript 5.9
- **Database**: PostgreSQL 15+
- **Authentication**: JWT + Google OAuth 2.0
- **Testing**: Jest (unit + integration)
- **Security**: Helmet, CORS, HttpOnly cookies

### Frontend
- **Framework**: React 18.2
- **Language**: TypeScript 5.2
- **Build Tool**: Vite 5.0
- **State Management**: Zustand 4.4
- **Data Fetching**: TanStack Query 5.8
- **Routing**: React Router 6.20
- **UI Library**: Tailwind CSS 3.3
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + Playwright (E2E)

### Infrastructure
- **Database**: PostgreSQL with Row Level Security (RLS)
- **File Storage**: Local filesystem (extensible to S3)
- **Email**: SMTP (configurable provider)
- **Deployment**: Docker + Kubernetes (configs included)

---

## 🏗️ Architecture

### Architectural Pattern
**Modular Monolith** with event-driven communication between domains.

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────┐  │
│  │ Pages   │  │  Stores │  │ Services│  │Components │  │
│  └─────────┘  └─────────┘  └─────────┘  └───────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ REST API (Axios)
                         │
┌────────────────────────▼────────────────────────────────┐
│                  Backend (Express.js)                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Routes → Controllers → Services → Models        │   │
│  │  (Auth, Feedback, Cycles, Analytics, etc.)      │   │
│  └───────────────────┬──────────────────────────────┘   │
│                      │ EventEmitter                      │
│  ┌───────────────────▼──────────────────────────────┐   │
│  │  Event Handlers (Notifications, Integrations)    │   │
│  └───────────────────┬──────────────────────────────┘   │
└────────────────────────┼────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│               PostgreSQL Database                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Users   │  │ Feedback │  │  Cycles  │  + 10 more   │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
```

### Key Design Principles
1. **Separation of Concerns**: Routes → Controllers → Services → Models
2. **Event-Driven**: Modules communicate via EventEmitter (loose coupling)
3. **Dependency Injection**: Services receive dependencies via constructor
4. **Type Safety**: Shared TypeScript types across frontend/backend
5. **Security First**: JWT in HttpOnly cookies, RBAC, input validation

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: 20.x or higher
- **npm**: 10.x or higher
- **PostgreSQL**: 15.x or higher (optional - can use mock DB)
- **Git**: Latest version

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd feedbackflow-app

# 2. Install dependencies
npm install

# 3. Install workspace dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 4. Set up environment variables (if using real database)
# Create .env files in backend/ and frontend/ directories
# See "Environment Variables" section below

# 5. Set up database (optional - skip to use mock DB)
cd database
docker compose up -d
psql -U postgres -f setup.sql
cd ..

# 6. Build backend
cd backend
npm run build
cd ..
```

### Running the Application

#### Option 1: Development Mode (Recommended)

```bash
# Terminal 1 - Start backend with mock database (no PostgreSQL required)
cd backend
npm run dev
# Backend will run on http://localhost:5000

# Terminal 2 - Start frontend
cd frontend
npm run dev
# Frontend will run on http://localhost:3003
```

#### Option 2: With Real Database

```bash
# Terminal 1 - Start PostgreSQL (if using Docker)
cd database
docker compose up

# Terminal 2 - Start backend with real database
cd backend
node dist/real-database-server.js

# Terminal 3 - Start frontend
cd frontend
npm run dev
```

### First Login

1. Navigate to `http://localhost:3003`
2. Click **"Login with Mock User"** (development mode)
   - Or configure Google OAuth for production (see Authentication section)
3. Default mock users:
   - **Admin**: admin@example.com
   - **Manager**: manager@example.com
   - **Employee**: employee@example.com

---

## 🔐 Authentication & Login

### How Login Works

FeedbackFlow uses a **dual authentication strategy**:

1. **Google OAuth 2.0** (Production)
   - Users log in with their Google account
   - Backend verifies Google token
   - JWT issued and stored in HttpOnly cookie
   - Frontend receives user profile

2. **Mock Authentication** (Development)
   - Bypass Google OAuth for local testing
   - Instant login with predefined users
   - Same JWT flow as production

### Authentication Flow

```
User → Google OAuth → Backend Verification → JWT Generation → HttpOnly Cookie → Authenticated Session
```

**Security Features**:
- JWTs stored in **HttpOnly cookies** (immune to XSS)
- **CORS protection** with credentials
- **Role-Based Access Control (RBAC)**: Super Admin, Admin, Manager, Employee
- **Token expiration** with automatic refresh
- **Secure cookie flags**: Secure, SameSite, HttpOnly

### Configuring Google OAuth

1. Get Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `http://localhost:5000/api/v1/auth/google/callback`

2. Set environment variables:
   ```bash
   # backend/.env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   JWT_SECRET=your_jwt_secret_key
   
   # frontend/.env
   VITE_GOOGLE_CLIENT_ID=your_client_id
   ```

3. Restart servers

### Protected Routes

- **Frontend**: All routes except `/login` require authentication
- **Backend**: Most endpoints require JWT authentication
- **Admin Routes**: Protected by role-based middleware (`rbac` middleware)

---

## 📁 Project Structure

```
feedbackflow-app/                    # Monorepo root
├── backend/                         # Node.js API server
│   ├── src/
│   │   ├── modules/                 # Business domain modules (9 total)
│   │   │   ├── auth/                # Authentication & authorization
│   │   │   ├── feedback/            # Core feedback CRUD
│   │   │   ├── cycles/              # Performance cycle management
│   │   │   ├── notifications/       # Multi-channel alerts
│   │   │   ├── analytics/           # Dashboards & reports
│   │   │   ├── hierarchy/           # Org chart & relationships
│   │   │   ├── admin/               # Organization & user management
│   │   │   ├── integrations/        # Webhooks & Slack
│   │   │   └── templates/           # Feedback templates
│   │   ├── shared/                  # Middleware, utils, types
│   │   ├── config/                  # Database & environment config
│   │   ├── events/                  # Event emitters & handlers
│   │   ├── jobs/                    # Background job processors
│   │   ├── models/                  # Base models
│   │   ├── services/                # Shared services
│   │   ├── app.ts                   # Express app & DI container
│   │   └── server.ts                # Server entry point
│   ├── tests/                       # Test suites
│   │   ├── unit/                    # Service & model tests (29 files)
│   │   ├── integration/             # API endpoint tests (11 files)
│   │   ├── e2e/                     # End-to-end tests
│   │   └── performance/             # Load tests
│   ├── dist/                        # Compiled TypeScript output
│   └── package.json                 # Backend dependencies
│
├── frontend/                        # React SPA
│   ├── src/
│   │   ├── pages/                   # Page components (by feature)
│   │   ├── components/              # Reusable UI components
│   │   ├── stores/                  # Zustand state management
│   │   ├── services/                # API client functions
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── types/                   # TypeScript interfaces
│   │   ├── lib/                     # Utilities & API client
│   │   ├── App.tsx                  # Root component
│   │   ├── router.tsx               # React Router config
│   │   └── main.tsx                 # Entry point
│   ├── e2e/                         # Playwright E2E tests (41 files)
│   ├── public/                      # Static assets
│   └── package.json                 # Frontend dependencies
│
├── database/                        # PostgreSQL setup
│   ├── setup.sql                    # Main schema initialization
│   ├── sql/                         # Schema files, migrations, views
│   ├── docker-compose.yml           # PostgreSQL container
│   └── scripts/                     # Backup & migration scripts
│
├── deployment/                      # Infrastructure as Code
│   ├── docker/                      # Dockerfiles
│   ├── kubernetes/                  # K8s manifests
│   └── terraform/                   # Cloud infrastructure
│
├── shared/                          # Shared code between frontend/backend
│   ├── types/                       # Shared TypeScript types
│   ├── constants/                   # Shared constants
│   └── utils/                       # Shared utilities
│
├── docs/                            # Documentation
│   ├── API_REFERENCE.md             # API endpoints documentation
│   ├── architecture/                # Architecture deep dives
│   ├── development/                 # Development guides
│   └── user-guides/                 # End-user documentation
│
├── scripts/                         # Build & utility scripts
├── tools/                           # Generators & monitoring
├── AGENTS.md                        # AI agent configuration (762 lines)
├── ARCHITECTURE.md                  # System architecture (1015 lines)
├── SETUP.md                         # Setup instructions (264 lines)
└── README.md                        # This file
```

### Module Structure Pattern

Each backend module follows the same layered architecture:

```
modules/[module-name]/
├── routes/          # Express routes, rate limiting
├── controllers/     # HTTP handlers (thin layer)
├── services/        # Business logic, event emission
├── models/          # Database queries
├── types/           # TypeScript interfaces
├── middleware/      # Module-specific middleware
└── validators/      # Input validation schemas
```

---

## 💻 Development

### Available Commands

#### Backend Commands

```bash
cd backend

# Development
npm run dev              # Start with nodemon (auto-reload)
npm run build            # Compile TypeScript to dist/
npm start                # Run production build

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Generate coverage report
npm run test:feedback    # Test specific module
npm run test:integration # Integration tests only

# Utilities
node dist/real-database-server.js    # Start server (production build)
tsx src/test-migrations.ts           # Test database migrations
```

#### Frontend Commands

```bash
cd frontend

# Development
npm run dev              # Start Vite dev server (port 3003)
npm run build            # Production build
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix linting issues
npm run type-check       # TypeScript type checking (no emit)

# Testing
npm test                 # Run Vitest unit tests
npm run test:ui          # Vitest UI mode
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run Playwright E2E tests (headless)
npm run test:e2e:ui      # Playwright UI mode
npm run test:e2e:debug   # Debug E2E tests
npm run test:e2e:report  # View test report
```

#### Monorepo Commands

```bash
# From root directory
npm install              # Install all workspace dependencies
npm run dev              # (if configured) Start all services
```

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make changes** in `backend/src/` or `frontend/src/`

3. **Run tests** to ensure nothing breaks
   ```bash
   cd backend && npm test
   cd frontend && npm test
   ```

4. **Lint and type-check**
   ```bash
   cd frontend && npm run lint && npm run type-check
   cd backend && npm run build  # TypeScript compilation
   ```

5. **Commit with conventional format**
   ```bash
   git commit -m "feat(feedback): add draft auto-save"
   ```

6. **Push and create PR**

### Code Style

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with TypeScript rules
- **Formatting**: 2-space indentation, single quotes, semicolons
- **Naming**:
  - `PascalCase`: Classes, interfaces, React components
  - `camelCase`: Functions, variables
  - `UPPER_SNAKE_CASE`: Constants
  - `kebab-case`: File names (except React components)

### Environment Variables

#### Backend (`backend/.env`)

```bash
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgres://user:password@localhost:5432/feedbackflow

# Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Slack (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB
```

#### Frontend (`frontend/.env`)

```bash
# API
VITE_API_BASE_URL=http://localhost:5000/api/v1

# Authentication
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# Feature Flags (optional)
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_INTEGRATIONS=true
```

---

## 🧪 Testing

### Test Coverage

The project has **comprehensive test coverage** across multiple layers:

| Test Type | Location | Count | Purpose |
|-----------|----------|-------|---------|
| **Backend Unit** | `backend/tests/unit/` | 29 files | Service & model logic |
| **Backend Integration** | `backend/tests/integration/` | 11 files | API endpoints |
| **Frontend Unit** | `frontend/src/test/` | Multiple | Component & hook tests |
| **Frontend E2E** | `frontend/e2e/` | 41 files | Full user workflows |

### Running Tests

```bash
# Backend tests (Jest)
cd backend
npm test                 # All tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Frontend tests (Vitest + Playwright)
cd frontend
npm test                 # Unit tests
npm run test:e2e         # E2E tests
npm run test:e2e:ui      # E2E with UI
```

### Test Organization

**Backend Unit Tests** (`backend/tests/unit/`):
- `admin/` - Organization, user, role management
- `analytics/` - Dashboard metrics, report generation
- `cycles/` - Cycle lifecycle, validation
- `feedback/` - Feedback CRUD, ratings, goals
- `integrations/` - Webhooks, Slack
- `notifications/` - Email, in-app notifications

**Backend Integration Tests** (`backend/tests/integration/`):
- API endpoint testing with supertest
- Authentication flows
- Database interactions
- Error handling

**Frontend E2E Tests** (`frontend/e2e/`):
- User authentication flows
- Feedback creation & submission
- Cycle management workflows
- Analytics dashboard interactions
- Admin panel operations

### Testing Best Practices

- **Unit tests**: Test individual functions/services in isolation
- **Integration tests**: Test API endpoints with real HTTP requests
- **E2E tests**: Test critical user journeys (login, feedback submission, etc.)
- **Coverage goal**: Aim for >70% on new code (no strict enforcement)

---

## 🧩 Modules Overview

FeedbackFlow is organized into **9 business domain modules**:

### 1. **Auth** (`modules/auth/`)
**Purpose**: User authentication and authorization

- Google OAuth 2.0 integration
- JWT token generation & verification
- User profile management
- Role-Based Access Control (RBAC)
- Protected route middleware

**Key Files**:
- `services/google-oauth.service.ts` - OAuth token verification
- `services/jwt.service.ts` - JWT operations
- `middleware/google-auth.middleware.ts` - Auth middleware
- `middleware/rbac.middleware.ts` - Role checking

### 2. **Feedback** (`modules/feedback/`)
**Purpose**: Core feedback CRUD operations

- Create, read, update, delete feedback
- Draft system for work-in-progress feedback
- Status transitions: DRAFT → SUBMITTED → ACKNOWLEDGED
- Ratings (1-5 scale) for competencies
- Goals and action items
- Comment threads

**Key Events**: `feedback:created`, `feedback:submitted`, `feedback:acknowledged`

### 3. **Cycles** (`modules/cycles/`)
**Purpose**: Performance cycle management

- Time-bound feedback collection periods
- Cycle lifecycle: DRAFT → ACTIVE → CLOSED
- Participant management
- Template assignment
- Date validation (prevent overlapping cycles)
- Completion tracking

**Key Events**: `cycle:created`, `cycle:activated`, `cycle:closed`

### 4. **Notifications** (`modules/notifications/`)
**Purpose**: Multi-channel notification delivery

- Email notifications (SMTP)
- In-app notifications
- Template engine with variable interpolation
- User preferences (opt-in/opt-out)
- Triggered by business events

**Templates**: Feedback requests, reminders, cycle updates, invitations

### 5. **Analytics** (`modules/analytics/`)
**Purpose**: Performance metrics and reporting

- Dashboard metrics: completion rates, response times
- Team performance analytics
- Trend analysis across cycles
- Report generation (PDF, CSV exports)
- Real-time statistics

**Metrics Tracked**:
- Feedback completion percentage
- Average response time
- Rating distributions
- Goal completion rates

### 6. **Hierarchy** (`modules/hierarchy/`)
**Purpose**: Organizational structure management

- Manager-employee relationships
- Department & team management
- Org chart visualization
- Direct reports queries
- Manager chain traversal

**Use Cases**: Permission checking, team feedback, reporting structure

### 7. **Admin** (`modules/admin/`)
**Purpose**: Organization and user administration

- Multi-tenant organization management
- User CRUD operations
- Role assignment
- Bulk CSV import (users, departments, teams)
- System settings

**Admin Roles**: Super Admin, Admin

### 8. **Integrations** (`modules/integrations/`)
**Purpose**: External service integrations

- Webhook delivery with retry logic
- Slack notifications
- API key management
- Event subscriptions

**Events Supported**: All business events (feedback, cycles, etc.)

### 9. **Templates** (`modules/templates/`)
**Purpose**: Feedback template management

- Customizable feedback forms
- Question templates (text, rating, multiple choice)
- Default and custom templates
- Template versioning

---

## 🌐 API Overview

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication
Most endpoints require JWT authentication via HttpOnly cookie.

### Key Endpoints

#### Authentication
```
POST   /auth/google/login          # Google OAuth login
POST   /auth/login/mock            # Mock login (development)
POST   /auth/logout                # Logout (clear cookie)
GET    /auth/me                    # Get current user
```

#### Feedback
```
GET    /feedback                   # List feedback (filtered)
POST   /feedback                   # Create feedback
GET    /feedback/:id               # Get feedback details
PUT    /feedback/:id               # Update feedback
DELETE /feedback/:id               # Delete feedback
POST   /feedback/:id/submit        # Submit draft feedback
POST   /feedback/:id/acknowledge   # Acknowledge received feedback
```

#### Cycles
```
GET    /cycles                     # List cycles
POST   /cycles                     # Create cycle (Admin/Manager)
GET    /cycles/:id                 # Get cycle details
PUT    /cycles/:id                 # Update cycle
DELETE /cycles/:id                 # Delete cycle
POST   /cycles/:id/activate        # Activate cycle
POST   /cycles/:id/close           # Close cycle
GET    /cycles/:id/participants    # Get cycle participants
```

#### Analytics
```
GET    /analytics/dashboard        # Dashboard metrics
GET    /analytics/completion-rates # Cycle completion rates
GET    /analytics/team/:teamId     # Team analytics
POST   /analytics/reports          # Generate report
```

#### Notifications
```
GET    /notifications              # List user notifications
PUT    /notifications/:id/read     # Mark as read
GET    /notifications/preferences  # Get preferences
PUT    /notifications/preferences  # Update preferences
```

#### Admin
```
GET    /admin/organizations        # List organizations (Super Admin)
POST   /admin/organizations        # Create organization
POST   /admin/organizations/import # Bulk CSV import
GET    /admin/users                # List users
POST   /admin/users                # Create user
PUT    /admin/users/:id            # Update user
DELETE /admin/users/:id            # Delete user
POST   /admin/users/:id/role       # Assign role
```

#### Hierarchy
```
GET    /hierarchy/org-chart        # Get organization chart
GET    /hierarchy/direct-reports/:managerId  # Manager's reports
GET    /hierarchy/manager-chain/:employeeId  # Employee's manager chain
POST   /hierarchy                  # Create relationship
PUT    /hierarchy/:id              # Update relationship
```

### Response Format

**Success Response**:
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Rate Limiting
Rate limiting is configured per route (not globally enforced in development).

For full API documentation, see [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md).

---

## ⚠️ Known Issues & Considerations

### Current Issues

1. **AI Insights Generation** (Minor)
   - **Location**: `backend/src/real-database-server.ts:6025`
   - **Status**: TODO - AI insights generation not yet implemented
   - **Impact**: Analytics endpoint returns placeholder data
   - **Priority**: Low (future enhancement)

2. **Debug Code in E2E Tests** (Minor)
   - **Location**: Multiple files in `frontend/e2e/debug-*.spec.ts`
   - **Status**: Debug test files present for form field analysis
   - **Impact**: None (test-only code)
   - **Action**: Can be removed after debugging complete

### Architecture Considerations

1. **Synchronous Event Handlers**
   - **Issue**: EventEmitter handlers are synchronous, may slow API responses
   - **Impact**: Long-running notification/webhook handlers block requests
   - **Recommendation**: Consider async handlers or message queue (Redis, BullMQ)

2. **No .env.example Files**
   - **Issue**: No template for environment variables
   - **Impact**: Setup friction for new developers
   - **Recommendation**: Add `.env.example` in backend/ and frontend/

3. **Row Level Security (RLS) Policies**
   - **Current**: Basic RLS policies in setup.sql (line 244-256)
   - **Status**: Placeholder policies (`USING (true)`)
   - **Recommendation**: Customize RLS based on multi-tenant security requirements

4. **File Storage**
   - **Current**: Local filesystem storage
   - **Limitation**: Not suitable for multi-server deployments
   - **Recommendation**: Implement S3/cloud storage for production

### Performance Notes

- **Database Connection**: Uses connection pooling (pg.Pool)
- **Frontend Caching**: TanStack Query with 5-minute stale time
- **No CDN**: Static assets served directly (consider CDN for production)
- **SQL Injection**: Protected via parameterized queries
- **XSS Protection**: JWT in HttpOnly cookies, Helmet middleware

### Security Checklist

✅ **Implemented**:
- JWT authentication with HttpOnly cookies
- CORS with credentials
- Helmet security headers
- Input validation (express-validator)
- RBAC for protected routes
- Password hashing (if applicable)
- SQL injection prevention (parameterized queries)

⚠️ **To Review**:
- Rate limiting (configured but verify limits)
- RLS policies (customize for production)
- File upload virus scanning (basic implementation)
- CSRF protection (consider adding tokens)

---

## 📚 Documentation

Comprehensive documentation is available:

### Core Documentation
- **[AGENTS.md](AGENTS.md)** (762 lines) - AI agent configuration, coding standards, workflows
- **[ARCHITECTURE.md](ARCHITECTURE.md)** (1015 lines) - System architecture deep dive, design patterns
- **[SETUP.md](SETUP.md)** (264 lines) - Detailed setup instructions, troubleshooting

### API & Development
- **[docs/API_REFERENCE.md](docs/API_REFERENCE.md)** - Complete API endpoint documentation
- **[docs/development/](docs/development/)** - Development guides and best practices
- **[docs/architecture/](docs/architecture/)** - Architecture deep dives (database, security, system design)

### User Guides
- **[docs/user-guides/](docs/user-guides/)** - End-user documentation

### Deployment
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Production deployment guide
- **[deployment/](deployment/)** - Docker, Kubernetes, Terraform configs

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Before You Start

1. **Read the documentation**:
   - [AGENTS.md](AGENTS.md) - Coding standards and AI agent rules
   - [ARCHITECTURE.md](ARCHITECTURE.md) - System design principles
   - [CONTRIBUTING.md](docs/CONTRIBUTING.md) - Contribution guidelines

2. **Set up your environment**:
   - Follow [Quick Start](#quick-start) instructions
   - Run tests to ensure everything works

### Contribution Workflow

1. **Fork the repository**

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/my-feature
   # or
   git checkout -b fix/bug-description
   ```

3. **Follow coding standards**:
   - Use TypeScript strict mode
   - Follow module structure pattern
   - Keep controllers thin, logic in services
   - Write tests for new features

4. **Commit with conventional format**:
   ```bash
   git commit -m "feat(module): description"
   ```
   
   **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
   
   **Scopes**: `auth`, `feedback`, `cycles`, `notifications`, `analytics`, `admin`, `hierarchy`, `integrations`, `templates`, `frontend`, `backend`

5. **Run tests**:
   ```bash
   cd backend && npm test
   cd frontend && npm test && npm run test:e2e
   ```

6. **Push and create PR**:
   - Provide clear description
   - Reference related issues
   - Wait for code review

### What to Contribute

**Good First Issues**:
- Add missing `.env.example` files
- Improve error messages
- Add more unit tests
- Update documentation

**Feature Requests**:
- See GitHub Issues for planned features
- Propose new features via issue discussion first

**Bug Fixes**:
- Report bugs with reproducible steps
- Include error logs and environment details

### Code Review Process

1. Automated checks (linting, tests) must pass
2. At least one maintainer approval required
3. Address review feedback
4. Squash commits if requested

---

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/your-org/feedbackflow/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/feedbackflow/discussions)
- **Email**: support@feedbackflow.example.com

---

## 📄 License

[Add your license here - e.g., MIT, Apache 2.0, etc.]

---

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/), [Express.js](https://expressjs.com/), [PostgreSQL](https://www.postgresql.org/)
- UI components inspired by [Tailwind UI](https://tailwindui.com/)
- Architecture patterns from [Martin Fowler's Patterns](https://martinfowler.com/)

---

## 🗺️ Roadmap

**Current Version**: 1.0.0

**Planned Features**:
- [ ] AI-powered feedback insights (TODO in codebase)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics with trend predictions
- [ ] Integration with HR systems (Workday, BambooHR)
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Export to external performance management tools

---

**Last Updated**: November 17, 2024  
**Maintainers**: FeedbackFlow Team

---

*FeedbackFlow - Empowering organizations with better feedback.*

