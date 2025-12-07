# Building a Production-Ready Full-Stack Application

## A Step-by-Step Guide for Junior Developers

Based on real-world patterns from **FeedbackFlow**

---

# About This Presentation

**Duration:** ~2 hours (with breaks)

**Target Audience:** Junior developers looking to build their first production application

**What You'll Learn:**
- Planning and architecture decisions
- Setting up a modern development environment
- Building a backend with Express.js and TypeScript
- Creating a React frontend with proper state management
- Database design with PostgreSQL
- Authentication and security best practices
- Comprehensive testing strategies
- Deployment and CI/CD

---

# Prerequisites

Before we begin, ensure you have:

- Basic knowledge of JavaScript/TypeScript
- Familiarity with React fundamentals
- Understanding of REST APIs
- Command line basics

**Tools needed:**
- Node.js v18+ installed
- Git for version control
- Docker Desktop
- VS Code (recommended)

---

<!-- SECTION 1 -->

# Section 1: Planning and Architecture

**Time: 10-15 minutes**

> "Weeks of coding can save you hours of planning" - Unknown

---

# 1.1 Define Requirements First

Before writing any code, document what you're building:

## Key Questions to Answer:

1. **What problem are we solving?**
2. **Who are the users?**
3. **What are the core features?**
4. **What are the technical constraints?**

---

# 1.1 Example: FeedbackFlow Requirements

```markdown
## Project: FeedbackFlow

### What: Employee feedback management system

### Core Features:
- User authentication (Google OAuth + JWT)
- Multi-tenant organizations
- Performance review cycles
- Feedback submission & tracking
- Analytics dashboards
- Role-based access control (RBAC)

### Users:
- Employees (give/receive feedback)
- Managers (view team feedback)
- Admins (manage organization)
```

---

# 1.2 Choose Your Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Frontend** | React + TypeScript | Component-based, type-safe, huge ecosystem |
| **Styling** | Tailwind CSS | Rapid development, utility-first |
| **State** | Zustand | Simple, minimal boilerplate |
| **Server State** | TanStack Query | Caching, refetching, loading states |
| **Backend** | Express.js + TypeScript | Flexible, widely adopted, easy to learn |
| **Database** | PostgreSQL | ACID compliance, complex queries, full-text search |
| **Auth** | JWT + HttpOnly Cookies | Secure, XSS-protected |
| **Testing** | Jest + Playwright | Unit/Integration + E2E |

---

# 1.2 Why These Choices?

## React + TypeScript
- Catches bugs at compile time
- Better IDE support and autocomplete
- Self-documenting code

## Express.js
- Simple and flexible
- Massive ecosystem
- Easy to learn, hard to outgrow

## PostgreSQL
- Rock-solid reliability
- Complex queries and joins
- Built-in full-text search

---

# 1.3 Architecture Decision: Modular Monolith

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (React)                   │
│  Pages → Stores (Zustand) → API Client (Axios)     │
└─────────────────┬───────────────────────────────────┘
                  │ HTTP/JSON (Cookie Auth)
┌─────────────────▼───────────────────────────────────┐
│              Backend API (Express)                  │
│  Routes → Controllers → Services → Models          │
└─────────────────┬───────────────────────────────────┘
                  │ SQL
┌─────────────────▼───────────────────────────────────┐
│            PostgreSQL Database                      │
└─────────────────────────────────────────────────────┘
```

---

# 1.3 Why Modular Monolith?

## Advantages:
- **Simple deployment** - single artifact
- **Shared database** - easy transactions
- **Fast communication** - in-memory, no network
- **Easy debugging** - single process, stack traces work

## When to Consider Microservices:
- When you need independent scaling
- When teams need to deploy independently
- When you have 50+ developers

**Rule:** Start simple, split later if needed

---

# 1.4 Project Structure

```
my-app/
├── backend/
│   ├── src/
│   │   ├── modules/          # Business domains
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   └── feedback/
│   │   ├── shared/           # Shared utilities
│   │   └── server.ts         # Entry point
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── pages/            # Route components
│   │   ├── components/       # Reusable UI
│   │   ├── stores/           # Zustand state
│   │   └── services/         # API calls
│   └── e2e/                  # Playwright tests
├── database/
│   └── sql/                  # Schema files
└── shared/                   # Shared types
```

---

# 1.4 Module Structure Pattern

Each backend module follows the same pattern:

```
modules/[feature]/
├── routes/           # HTTP routing, middleware
├── controllers/      # Request handlers (thin!)
├── services/         # Business logic (core!)
├── models/           # Database queries
└── types/            # TypeScript interfaces
```

**Key Principle:** Keep controllers thin, put logic in services

---

# Section 1 Summary

## Key Takeaways:

1. **Plan before coding** - Document requirements first
2. **Choose boring technology** - Proven tools over shiny new ones
3. **Start with a monolith** - Split into microservices later if needed
4. **Organize by feature** - Not by technical layer
5. **Follow patterns consistently** - Same structure everywhere

---

<!-- SECTION 2 -->

# Section 2: Development Environment Setup

**Time: 10 minutes**

---

# 2.1 Prerequisites Checklist

## Required Tools:

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | v18+ (recommend v20 LTS) | JavaScript runtime |
| npm | Comes with Node.js | Package manager |
| Git | Latest | Version control |
| Docker | Latest | Database containers |
| VS Code | Latest | Code editor |

## Verify Installation:

```bash
node --version    # Should be v18+
npm --version     # Should be v9+
git --version     # Any recent version
docker --version  # Any recent version
```

---

# 2.2 Backend Initialization

## Step 1: Create project and initialize

```bash
mkdir my-app && cd my-app
mkdir -p backend/src frontend database shared

cd backend
npm init -y
```

## Step 2: Install TypeScript

```bash
npm install typescript @types/node --save-dev
npx tsc --init
```

---

# 2.2 TypeScript Configuration

Edit `backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

# 2.2 Backend Dependencies

```bash
# Core framework
npm install express cors helmet cookie-parser dotenv

# Database
npm install pg

# Authentication
npm install jsonwebtoken

# Validation
npm install zod

# TypeScript types
npm install -D @types/express @types/cors 
npm install -D @types/cookie-parser @types/jsonwebtoken @types/pg

# Development tools
npm install -D nodemon ts-node

# Testing
npm install -D jest ts-jest @types/jest supertest @types/supertest
```

---

# 2.2 Package.json Scripts

Add to `backend/package.json`:

```json
{
  "type": "module",
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest --config jest.config.cjs",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

# 2.3 Frontend Initialization

## Create React app with Vite:

```bash
cd ../frontend
npm create vite@latest . -- --template react-ts
npm install
```

## Install additional dependencies:

```bash
# State management
npm install zustand @tanstack/react-query axios

# Routing and forms
npm install react-router-dom react-hook-form @hookform/resolvers zod

# UI
npm install tailwindcss postcss autoprefixer
npm install framer-motion lucide-react react-hot-toast

# Initialize Tailwind
npx tailwindcss init -p
```

---

# 2.3 Vite Configuration

Edit `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
```

**Why proxy?** Avoid CORS issues during development!

---

# 2.4 Development Scripts

## Backend (with hot reload):

```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

## Frontend (with hot reload):

```bash
cd frontend
npm run dev
# App runs on http://localhost:3003
```

## Both together:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

---

# Section 2 Summary

## What We Set Up:

1. **Monorepo structure** - backend/, frontend/, database/, shared/
2. **TypeScript everywhere** - Strict mode enabled
3. **Backend** - Express with nodemon hot reload
4. **Frontend** - Vite + React with proxy to backend
5. **Package scripts** - dev, build, start, test

## Next: Database Design

---

<!-- SECTION 3 -->

# Section 3: Database Design

**Time: 15 minutes**

---

# 3.1 PostgreSQL with Docker

Create `database/docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: my-app-postgres
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: myapp_user
      POSTGRES_PASSWORD: myapp_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myapp_user -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

---

# 3.1 Start the Database

```bash
cd database
docker compose up -d

# Verify it's running
docker compose ps

# View logs if needed
docker compose logs -f postgres
```

## Connect with psql (optional):

```bash
docker compose exec postgres psql -U myapp_user -d myapp
```

---

# 3.2 Schema Design Principles

## 1. Use UUIDs for Primary Keys

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- ...
);
```

**Why?** Globally unique, no sequence conflicts, harder to guess

---

# 3.2 Schema Design Principles

## 2. Proper Foreign Key Relationships

```sql
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(user_id, organization_id)
);
```

**Why?** Database enforces data integrity

---

# 3.2 Schema Design Principles

## 3. Indexes for Performance

```sql
-- Index frequently queried columns
CREATE INDEX idx_users_email ON users(email);

-- Composite index for common queries
CREATE INDEX idx_org_members_user_org 
    ON organization_members(user_id, organization_id);
```

**Rule:** Index columns used in WHERE and JOIN clauses

---

# 3.2 Schema Design Principles

## 4. Multi-tenancy with organization_id

```sql
-- Every tenant-specific table includes organization_id
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    giver_id UUID NOT NULL REFERENCES users(id),
    receiver_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    -- ...
);

-- Always filter by organization
SELECT * FROM feedback WHERE organization_id = $1;
```

---

# 3.3 Migration System

## Why Migrations?

- Track database changes over time
- Reproducible across environments
- Rollback capability

## Simple Migration Pattern:

```
database/sql/
├── 01_users.sql
├── 02_organizations.sql
├── 03_feedback.sql
└── 04_indexes.sql
```

---

# 3.3 Migration Tracking

```typescript
// Track which migrations have run
async function migrate() {
  // Create tracking table
  await db.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get executed migrations
  const { rows } = await db.query('SELECT name FROM migrations');
  const executed = new Set(rows.map(r => r.name));

  // Run new migrations
  for (const file of migrationFiles) {
    if (!executed.has(file)) {
      await db.query(readFile(file));
      await db.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
    }
  }
}
```

---

# 3.4 Key Tables Example

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile_picture TEXT,
    role VARCHAR(50) DEFAULT 'employee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

# 3.4 Organization Membership

```sql
-- Link users to organizations
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'employee',
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, organization_id)
);

-- Performance indexes
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
```

---

# Section 3 Summary

## Key Takeaways:

1. **Use Docker** for local database - consistent across team
2. **UUID primary keys** - globally unique, secure
3. **Foreign keys** - let the database enforce integrity
4. **Indexes** - on columns used in WHERE/JOIN
5. **Migrations** - track all schema changes
6. **Multi-tenancy** - organization_id on all tenant tables

---

<!-- SECTION 4 -->

# Section 4: Backend Development

**Time: 20-25 minutes**

---

# 4.1 Server Entry Point

Create `backend/src/server.ts`:

```typescript
import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  process.exit(0);
});
```

---

# 4.2 Express Application Setup

Create `backend/src/app.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3003',
  credentials: true  // Important for cookies!
}));

// Body parsing
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

export default app;
```

---

# 4.2 Middleware Stack Explained

```typescript
// Security headers (XSS, clickjacking, etc.)
app.use(helmet());

// CORS - allow frontend to call API
app.use(cors({
  origin: 'http://localhost:3003',
  credentials: true  // Allow cookies!
}));

// Parse JSON request bodies
app.use(express.json());

// Parse cookies
app.use(cookieParser());
```

**Order matters!** Security middleware first.

---

# 4.3 Layered Architecture Pattern

```
Request Flow:

   HTTP Request
        │
        ▼
┌──────────────┐
│   Routes     │  ← Define endpoints, apply middleware
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Controllers  │  ← Extract request data, call service
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Services    │  ← Business logic, validation, events
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Models     │  ← Database queries
└──────────────┘
```

---

# 4.3 Example: Types

Create `backend/src/modules/users/types/user.types.ts`:

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  profilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  email: string;
  name: string;
  role?: 'admin' | 'manager' | 'employee';
}

export interface UpdateUserDTO {
  name?: string;
  role?: 'admin' | 'manager' | 'employee';
}
```

---

# 4.3 Example: Model

Create `backend/src/modules/users/models/user.model.ts`:

```typescript
import { Pool } from 'pg';
import { User, CreateUserDTO } from '../types/user.types.js';

export class UserModel {
  constructor(private db: Pool) {}

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return rows[0] || null;
  }
}
```

---

# 4.3 Example: Service

Create `backend/src/modules/users/services/user.service.ts`:

```typescript
import { UserModel } from '../models/user.model.js';
import { User, CreateUserDTO } from '../types/user.types.js';

export class UserService {
  constructor(private userModel: UserModel) {}

  async getUserById(id: string): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  async createUser(data: CreateUserDTO): Promise<User> {
    // Business logic: check if email exists
    const existing = await this.userModel.findByEmail(data.email);
    if (existing) {
      throw new ValidationError('Email already registered');
    }
    return this.userModel.create(data);
  }
}
```

---

# 4.3 Example: Controller

Create `backend/src/modules/users/controllers/user.controller.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.js';

export class UserController {
  constructor(private userService: UserService) {}

  // Arrow functions to preserve 'this' context
  getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.getUserById(req.params.id);
      res.json(user);
    } catch (error) {
      next(error);  // Pass to error handler
    }
  };

  createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  };
}
```

---

# 4.3 Example: Routes

Create `backend/src/modules/users/routes/user.routes.ts`:

```typescript
import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../../../shared/middleware/auth.middleware.js';
import { requireRole } from '../../../shared/middleware/rbac.middleware.js';

export function createUserRoutes(controller: UserController) {
  const router = Router();

  // GET /api/v1/users/:id - Get user by ID
  router.get('/:id', authenticate, controller.getUser);

  // POST /api/v1/users - Create user (admin only)
  router.post('/', authenticate, requireRole(['admin']), controller.createUser);

  return router;
}
```

---

# 4.4 Dependency Injection

## Wire everything in `app.ts`:

```typescript
import { Pool } from 'pg';
import { UserModel } from './modules/users/models/user.model.js';
import { UserService } from './modules/users/services/user.service.js';
import { UserController } from './modules/users/controllers/user.controller.js';
import { createUserRoutes } from './modules/users/routes/user.routes.js';

// Database pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Dependency Injection (manual)
const userModel = new UserModel(pool);
const userService = new UserService(userModel);
const userController = new UserController(userService);

// Mount routes
app.use('/api/v1/users', createUserRoutes(userController));
```

---

# 4.4 Why Manual DI?

## Advantages:
- **Explicit** - easy to trace dependencies
- **No magic** - no decorators or runtime reflection
- **Testable** - easy to mock dependencies
- **No library** - zero additional dependencies

## Trade-off:
- More verbose initialization code
- Must wire up each new service manually

**For larger apps:** Consider InversifyJS or TSyringe

---

# 4.5 Error Handling

Create `backend/src/shared/utils/errors.ts`:

```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403);
  }
}
```

---

# 4.5 Error Middleware

Add to `app.ts`:

```typescript
import { AppError } from './shared/utils/errors.js';

// Error handling middleware (must be last!)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  // Unknown errors
  res.status(500).json({
    error: 'Internal server error'
  });
});
```

---

# Section 4 Summary

## Key Patterns:

1. **Layered architecture** - Routes → Controllers → Services → Models
2. **Thin controllers** - Just extract data and call services
3. **Fat services** - All business logic lives here
4. **Manual DI** - Explicit, testable, no magic
5. **Custom errors** - Consistent error handling

## The Golden Rule:

> Controllers should never know about the database.
> Models should never know about HTTP.

---

<!-- SECTION 5 -->

# Section 5: Frontend Development

**Time: 20 minutes**

---

# 5.1 API Client Setup

Create `frontend/src/lib/api.ts`:

```typescript
import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,  // Send cookies with requests!
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    } else {
      toast.error(error.response?.data?.error || 'Something went wrong');
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

# 5.1 Why `withCredentials: true`?

```typescript
const api = axios.create({
  withCredentials: true  // This is critical!
});
```

## What it does:
- Sends cookies with cross-origin requests
- Required for cookie-based authentication
- Works with the backend CORS `credentials: true`

## Without it:
- Cookies won't be sent
- Authentication will fail
- Users will be constantly logged out

---

# 5.2 State Management with Zustand

Create `frontend/src/stores/authStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}
```

---

# 5.2 Zustand Store Implementation

```typescript
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        set({ user: data.user, isAuthenticated: true });
      },

      logout: async () => {
        await api.post('/auth/logout');
        set({ user: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data, isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      }
    }),
    { name: 'auth-storage' }
  )
);
```

---

# 5.2 Why Zustand?

## Compare with Redux:

**Redux (100+ lines):**
```typescript
// actions.ts
// reducers.ts
// selectors.ts
// store.ts
// types.ts
```

**Zustand (~30 lines):**
```typescript
const useStore = create((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 }))
}));
```

## Benefits:
- Minimal boilerplate
- No Provider wrapper needed
- Built-in TypeScript support
- Persist middleware included

---

# 5.3 Routing with React Router

Create `frontend/src/router.tsx`:

```typescript
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    element: <ProtectedRoute />,  // Auth guard
    children: [
      {
        element: <Layout />,      // Shared layout
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/profile', element: <ProfilePage /> }
        ]
      }
    ]
  }
]);
```

---

# 5.3 Protected Route Component

Create `frontend/src/components/auth/ProtectedRoute.tsx`:

```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 
                        rounded-full border-t-transparent" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Render child routes
  return <Outlet />;
}
```

---

# 5.3 Admin Route Guard

```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export function AdminRouteGuard() {
  const { user } = useAuthStore();

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

// Usage in router:
{
  element: <AdminRouteGuard />,
  children: [
    { path: '/admin', element: <AdminPage /> }
  ]
}
```

---

# 5.4 Component Organization

```
frontend/src/
├── pages/              # Route-level components
│   ├── auth/
│   │   └── LoginPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   └── profile/
│       └── ProfilePage.tsx
├── components/         # Reusable components
│   ├── auth/
│   │   └── ProtectedRoute.tsx
│   ├── layout/
│   │   ├── Layout.tsx
│   │   └── Sidebar.tsx
│   └── ui/
│       ├── Button.tsx
│       └── Input.tsx
└── hooks/              # Custom hooks
    └── useAuth.ts
```

---

# 5.4 Main Entry Point

Update `frontend/src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { router } from './router';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </QueryClientProvider>
  </React.StrictMode>
);
```

---

# Section 5 Summary

## Key Patterns:

1. **API Client** - Centralized Axios instance with interceptors
2. **Zustand** - Simple state management with persistence
3. **Protected Routes** - Auth guards at router level
4. **Component Organization** - pages/, components/, hooks/
5. **TanStack Query** - Server state management (caching, refetching)

## Best Practices:

- Always use `withCredentials: true` for cookie auth
- Handle loading states explicitly
- Centralize error handling in interceptors
- Keep components focused and small

---

<!-- SECTION 6 -->

# Section 6: Authentication & Authorization

**Time: 15 minutes**

---

# 6.1 JWT Authentication Flow

```
┌────────┐                    ┌────────┐                    ┌────────┐
│ Client │                    │ Server │                    │   DB   │
└───┬────┘                    └───┬────┘                    └───┬────┘
    │                             │                             │
    │  1. POST /auth/login        │                             │
    │  { email, password }        │                             │
    │────────────────────────────>│                             │
    │                             │  2. Verify credentials      │
    │                             │────────────────────────────>│
    │                             │<────────────────────────────│
    │                             │                             │
    │  3. Set-Cookie: token=JWT   │                             │
    │  (HttpOnly, Secure)         │                             │
    │<────────────────────────────│                             │
    │                             │                             │
    │  4. GET /api/data           │                             │
    │  Cookie: token=JWT          │                             │
    │────────────────────────────>│                             │
    │                             │  5. Verify JWT              │
    │                             │  6. Query data              │
    │                             │────────────────────────────>│
    │<────────────────────────────│<────────────────────────────│
```

---

# 6.1 JWT Service

Create `backend/src/modules/auth/services/jwt.service.ts`:

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = '7d';

export class JwtService {
  sign(payload: object): string {
    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: JWT_EXPIRY 
    });
  }

  verify(token: string): any {
    return jwt.verify(token, JWT_SECRET);
  }
}
```

**Security Note:** Never use default secret in production!

---

# 6.1 Login Route with Cookie

```typescript
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Verify user (simplified)
    const user = await userService.verifyCredentials(email, password);
    
    // Generate JWT
    const token = jwtService.sign({ 
      id: user.id, 
      email: user.email, 
      role: user.role 
    });

    // Set HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,      // JavaScript can't access
      secure: process.env.NODE_ENV === 'production',  // HTTPS only
      sameSite: 'strict',  // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});
```

---

# 6.2 Security Best Practices

## Cookie Security Flags:

| Flag | Purpose |
|------|---------|
| `httpOnly: true` | Prevents XSS - JavaScript can't read the cookie |
| `secure: true` | Cookie only sent over HTTPS |
| `sameSite: 'strict'` | Prevents CSRF - cookie only sent to same site |
| `maxAge` | Token expiration time |

```typescript
res.cookie('token', token, {
  httpOnly: true,       // ✅ Prevents XSS
  secure: true,         // ✅ HTTPS only
  sameSite: 'strict',   // ✅ Prevents CSRF
  maxAge: 604800000     // ✅ 7 days
});
```

---

# 6.2 Auth Middleware

Create `backend/src/shared/middleware/auth.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../../modules/auth/services/jwt.service.js';

const jwtService = new JwtService();

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwtService.verify(token);
    (req as any).user = decoded;  // Attach user to request
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

---

# 6.3 Role-Based Access Control

Create `backend/src/shared/middleware/rbac.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}
```

---

# 6.3 Using RBAC in Routes

```typescript
import { authenticate } from '../../../shared/middleware/auth.middleware.js';
import { requireRole } from '../../../shared/middleware/rbac.middleware.js';

const router = Router();

// Anyone authenticated can read
router.get('/feedback', authenticate, controller.list);

// Only employees and managers can create
router.post('/feedback', 
  authenticate, 
  requireRole(['employee', 'manager']), 
  controller.create
);

// Only admins can delete
router.delete('/feedback/:id', 
  authenticate, 
  requireRole(['admin']), 
  controller.delete
);
```

---

# 6.4 Auth Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/auth/login` | POST | No | Login with credentials |
| `/auth/logout` | POST | Yes | Clear auth cookie |
| `/auth/me` | GET | Yes | Get current user |
| `/auth/refresh` | POST | Yes | Refresh token (optional) |

```typescript
// Logout - just clear the cookie
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// Get current user
router.get('/me', authenticate, (req, res) => {
  res.json((req as any).user);
});
```

---

# Section 6 Summary

## Key Security Principles:

1. **HttpOnly cookies** - Prevents XSS token theft
2. **SameSite: strict** - Prevents CSRF attacks
3. **Secure flag** - HTTPS only in production
4. **Short expiration** - Limit damage from stolen tokens
5. **RBAC middleware** - Enforce permissions at route level

## Never Do:

- Store JWT in localStorage (XSS vulnerable)
- Use weak secrets
- Forget to validate on every request
- Trust client-side role checks alone

---

<!-- SECTION 7 -->

# Section 7: Testing Strategy

**Time: 20 minutes**

---

# 7.1 The Testing Pyramid

```
           /\
          /  \
         / E2E \        Few - Critical user flows
        /------\
       /        \
      / Integr.  \      Some - API endpoints  
     /------------\
    /              \
   /     Unit       \   Many - Services, utils
  /------------------\

```

## Rule of Thumb:
- **70%** Unit tests - Fast, isolated, many
- **20%** Integration tests - API endpoints
- **10%** E2E tests - Critical paths only

---

# 7.1 Why This Distribution?

| Type | Speed | Reliability | Maintenance |
|------|-------|-------------|-------------|
| Unit | ⚡ Fast | ✅ Very reliable | ✅ Low |
| Integration | 🔄 Medium | 🔄 Reliable | 🔄 Medium |
| E2E | 🐢 Slow | ❌ Flaky | ❌ High |

## Trade-offs:
- **Unit tests** catch most bugs quickly
- **Integration tests** verify API contracts
- **E2E tests** ensure critical flows work

---

# 7.2 Unit Tests with Jest

## Setup `backend/jest.config.cjs`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage'
};
```

---

# 7.2 Unit Test Example

```typescript
// tests/unit/users/services/user.service.test.ts

describe('UserService', () => {
  let userService: UserService;
  let mockUserModel: jest.Mocked<UserModel>;

  beforeEach(() => {
    // Create mock
    mockUserModel = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn()
    } as any;
    
    userService = new UserService(mockUserModel);
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById('1');

      expect(result).toEqual(mockUser);
      expect(mockUserModel.findById).toHaveBeenCalledWith('1');
    });
  });
});
```

---

# 7.2 Testing Error Cases

```typescript
describe('getUserById', () => {
  it('should throw NotFoundError when user not found', async () => {
    mockUserModel.findById.mockResolvedValue(null);

    await expect(userService.getUserById('1'))
      .rejects
      .toThrow('User not found');
  });
});

describe('createUser', () => {
  it('should throw ValidationError when email exists', async () => {
    mockUserModel.findByEmail.mockResolvedValue({ id: '1' });

    await expect(
      userService.createUser({ email: 'existing@test.com', name: 'Test' })
    ).rejects.toThrow('Email already registered');
  });
});
```

---

# 7.3 Integration Tests with Supertest

```typescript
// tests/integration/users/user.integration.test.ts
import request from 'supertest';
import app from '../../../src/app';

describe('User API', () => {
  describe('POST /api/v1/users', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({ 
          email: 'new@example.com', 
          name: 'New User' 
        });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe('new@example.com');
      expect(response.body.id).toBeDefined();
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({ email: 'invalid', name: 'Test' });

      expect(response.status).toBe(400);
    });
  });
});
```

---

# 7.3 Testing with Authentication

```typescript
describe('Protected Routes', () => {
  let authToken: string;

  beforeAll(async () => {
    // Login to get token
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    // Extract cookie
    authToken = response.headers['set-cookie'][0];
  });

  it('should access protected route with auth', async () => {
    const response = await request(app)
      .get('/api/v1/users/me')
      .set('Cookie', authToken);

    expect(response.status).toBe(200);
  });

  it('should reject without auth', async () => {
    const response = await request(app)
      .get('/api/v1/users/me');

    expect(response.status).toBe(401);
  });
});
```

---

# 7.4 E2E Tests with Playwright

## Setup `frontend/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3003',
    trace: 'retain-on-failure',
    screenshot: 'on'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3003',
    reuseExistingServer: !process.env.CI
  }
});
```

---

# 7.4 E2E Test Example

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrong');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toBeVisible();
  });
});
```

---

# 7.5 Test Organization

```
backend/tests/
├── unit/                    # Unit tests
│   ├── users/
│   │   ├── services/
│   │   │   └── user.service.test.ts
│   │   └── models/
│   │       └── user.model.test.ts
│   └── auth/
│       └── services/
│           └── jwt.service.test.ts
└── integration/             # Integration tests
    ├── users/
    │   └── user.api.test.ts
    └── auth/
        └── auth.api.test.ts

frontend/
├── src/test/               # Component tests
│   └── components/
│       └── Button.test.tsx
└── e2e/                    # E2E tests
    ├── auth.spec.ts
    └── dashboard.spec.ts
```

---

# 7.5 Running Tests

```bash
# Backend - Run all tests
cd backend && npm test

# Backend - Watch mode
npm run test:watch

# Backend - Coverage report
npm run test:coverage

# Frontend - Unit tests
cd frontend && npm test

# Frontend - E2E tests
npm run test:e2e

# Frontend - E2E with UI
npm run test:e2e:ui
```

---

# Section 7 Summary

## Key Takeaways:

1. **Test pyramid** - More unit tests, fewer E2E
2. **Mock dependencies** - Isolate units under test
3. **Test happy and sad paths** - Don't just test success
4. **Integration tests** - Verify API contracts
5. **E2E for critical flows** - Login, core features

## When to Write Tests:

- **Always:** New service methods
- **Always:** New API endpoints
- **Recommended:** React components
- **Critical flows:** E2E tests

---

<!-- SECTION 8 -->

# Section 8: Deployment

**Time: 15 minutes**

---

# 8.1 Docker Configuration

## Backend Dockerfile:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 5000
CMD ["node", "dist/server.js"]
```

---

# 8.1 Frontend Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage - Nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

# 8.1 Why Multi-Stage Builds?

```dockerfile
# Stage 1: Build (large image with dev tools)
FROM node:20 AS builder
# Install deps, compile TypeScript
# Image size: ~1GB

# Stage 2: Run (small image, production only)
FROM node:20-alpine AS runner
# Only copy compiled code
# Image size: ~150MB
```

## Benefits:
- **Smaller images** - 85% reduction
- **Faster deployments** - Less to transfer
- **More secure** - No dev dependencies in production

---

# 8.2 Docker Compose for Production

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

# 8.3 Deployment Options

## Easy: Platform as a Service

| Platform | Pros | Cons |
|----------|------|------|
| **Railway** | One-click deploy, free tier | Limited customization |
| **Render** | Simple, good free tier | Cold starts on free |
| **Vercel** | Great for frontend | Backend limitations |
| **Heroku** | Mature, many add-ons | No free tier anymore |

## Best for beginners - just connect GitHub!

---

# 8.3 Deployment Options

## Intermediate: VPS + Docker

| Provider | Price | Pros |
|----------|-------|------|
| **DigitalOcean** | $6/mo | Simple, good docs |
| **Linode** | $5/mo | Reliable, affordable |
| **Vultr** | $5/mo | Global locations |

## Steps:
1. Provision VM
2. Install Docker
3. Clone repo
4. Run `docker compose up -d`

---

# 8.3 Deployment Options

## Advanced: Kubernetes

| Provider | Use Case |
|----------|----------|
| **AWS EKS** | Enterprise scale |
| **GCP GKE** | Google ecosystem |
| **Azure AKS** | Microsoft ecosystem |

## When to Use:
- Multiple services to orchestrate
- Auto-scaling requirements
- High availability needs
- Large team/organization

**Skip for MVP!** Start simple, migrate later.

---

# 8.4 Deployment Script

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Pull latest code
git pull origin main

# Build images
docker compose -f docker-compose.prod.yml build

# Run database migrations
docker compose -f docker-compose.prod.yml \
  run --rm backend npm run migrate

# Restart services with zero downtime
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
sleep 10

# Health check
curl -f http://localhost/api/v1/health || exit 1

echo "✅ Deployment complete!"
```

---

# Section 8 Summary

## Key Points:

1. **Multi-stage Docker builds** - Smaller, secure images
2. **Docker Compose** - Orchestrate services locally and in production
3. **Start with PaaS** - Railway/Render for quick deploys
4. **Environment variables** - Never hardcode secrets
5. **Health checks** - Verify deployments succeeded

## Deployment Checklist:
- [ ] All tests passing
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Health check passes
- [ ] SSL/HTTPS configured

---

<!-- SECTION 9 -->

# Section 9: CI/CD and Best Practices

**Time: 10 minutes**

---

# 9.1 GitHub Actions Pipeline

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd backend && npm ci
      - run: cd backend && npm run build
      - run: cd backend && npm test
```

---

# 9.1 Full Pipeline

```yaml
jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: '20' }
      - run: cd backend && npm ci
      - run: cd backend && npm run build
      - run: cd backend && npm test

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: '20' }
      - run: cd frontend && npm ci
      - run: cd frontend && npm run type-check
      - run: cd frontend && npm test

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: '20' }
      - run: cd frontend && npm ci
      - run: npx playwright install --with-deps
      - run: cd frontend && npm run test:e2e
```

---

# 9.2 Security Checklist

## Must Have:

- [ ] **Secrets in environment variables** - Never in code
- [ ] **HTTPS in production** - SSL certificates
- [ ] **SQL injection prevention** - Parameterized queries
- [ ] **XSS prevention** - HttpOnly cookies, React escaping
- [ ] **CSRF protection** - SameSite cookies
- [ ] **Rate limiting** - Prevent brute force
- [ ] **Input validation** - Zod schemas

---

# 9.2 Rate Limiting Example

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  message: { error: 'Too many requests, try again later' }
});

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,  // Only 5 login attempts
  message: { error: 'Too many login attempts' }
});

app.use('/api/', apiLimiter);
app.use('/api/v1/auth', authLimiter);
```

---

# 9.3 Monitoring and Logging

## Structured Logging:

```typescript
const logger = {
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({ 
      level: 'info', 
      message, 
      ...meta, 
      timestamp: new Date().toISOString() 
    }));
  },
  error: (message: string, error?: Error) => {
    console.error(JSON.stringify({ 
      level: 'error', 
      message, 
      stack: error?.stack,
      timestamp: new Date().toISOString() 
    }));
  }
};

// Usage
logger.info('User logged in', { userId: user.id });
logger.error('Database connection failed', error);
```

---

# 9.3 Health Check Endpoint

```typescript
app.get('/api/v1/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'unknown'
    }
  };

  try {
    await pool.query('SELECT 1');
    health.checks.database = 'healthy';
  } catch (error) {
    health.status = 'degraded';
    health.checks.database = 'unhealthy';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

---

# 9.4 Documentation

## Essential Docs:

| File | Purpose |
|------|---------|
| `README.md` | Quick start, overview |
| `ARCHITECTURE.md` | System design, patterns |
| `SETUP.md` | Development setup |
| `docs/API_REFERENCE.md` | API endpoints |
| `CONTRIBUTING.md` | How to contribute |

## Tips:
- Write docs as you code
- Include code examples
- Keep up to date
- Use diagrams for architecture

---

# Section 9 Summary

## CI/CD Pipeline:
- Run tests on every push/PR
- Block merges on test failures
- Automated deployments (optional)

## Security:
- Environment variables for secrets
- Rate limiting on sensitive endpoints
- Input validation everywhere

## Monitoring:
- Structured JSON logging
- Health check endpoints
- Error tracking (Sentry, etc.)

---

<!-- SECTION 10 -->

# Section 10: Key Takeaways

**Time: 5 minutes**

---

# The 8 Commandments

## 1. Plan Before Coding
Define requirements and architecture upfront.
Weeks of coding can save hours of planning.

## 2. Type Everything
TypeScript catches bugs before runtime.
Your IDE becomes your best friend.

## 3. Layer Your Code
Routes → Controllers → Services → Models.
Separation of concerns improves testability.

## 4. Test at Every Level
Unit tests (many), Integration tests (some), E2E tests (few).
Tests are your safety net.

---

# The 8 Commandments (continued)

## 5. Secure by Default
HttpOnly cookies, parameterized queries, RBAC.
Security is not an afterthought.

## 6. Document As You Go
Future you will thank present you.
README, ARCHITECTURE, API docs.

## 7. Deploy Early
Set up CI/CD from day one.
Deploy to staging frequently.

## 8. Keep It Simple
Start with a monolith, split later if needed.
Boring technology over shiny new things.

---

# Quick Reference: Commands

```bash
# Development
cd backend && npm run dev      # Backend on :5000
cd frontend && npm run dev     # Frontend on :3003

# Database
cd database && docker compose up -d

# Testing
cd backend && npm test         # Unit + Integration
cd frontend && npm test        # Component tests
cd frontend && npm run test:e2e  # E2E tests

# Build
cd backend && npm run build
cd frontend && npm run build

# Deploy
docker compose -f docker-compose.prod.yml up -d
```

---

# Resources

## Documentation in This Project:
- `ARCHITECTURE.md` - System design
- `SETUP.md` - Development setup
- `docs/API_REFERENCE.md` - API documentation

## External Resources:
- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Playwright Docs](https://playwright.dev)

---

# Thank You!

## Questions?

### Contact & Resources:
- GitHub: [FeedbackFlow Repository]
- Architecture: See `ARCHITECTURE.md`
- Setup Guide: See `SETUP.md`

---

# Appendix: Project Files Reference

## Key Backend Files:
- `backend/src/server.ts` - Entry point
- `backend/src/app.ts` - Express setup + DI
- `backend/src/modules/` - Business modules

## Key Frontend Files:
- `frontend/src/main.tsx` - Entry point
- `frontend/src/router.tsx` - Route definitions
- `frontend/src/stores/` - Zustand stores

## Database:
- `database/docker-compose.yml` - PostgreSQL setup
- `database/sql/` - Schema files

