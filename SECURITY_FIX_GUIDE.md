# Security Fixes Implementation Guide

**Purpose:** Step-by-step instructions to fix critical security issues in FeedbackFlow.

**Estimated Time:** 1-2 weeks for all critical fixes.

---

## 🔴 CRITICAL FIX #1: RBAC Middleware (1-2 hours)

### Current Issue
File: `backend/src/modules/auth/middleware/rbac.middleware.ts`

The middleware is a stub that allows all requests through.

### Step-by-Step Fix

**1. Replace the stub implementation:**

```bash
# Backup current file
mv backend/src/modules/auth/middleware/rbac.middleware.ts \
   backend/src/modules/auth/middleware/rbac.middleware.ts.backup

# Copy working implementation
cp backend/src/shared/middleware/rbac.middleware.ts \
   backend/src/modules/auth/middleware/rbac.middleware.ts
```

**2. Verify the new implementation:**

```typescript
// backend/src/modules/auth/middleware/rbac.middleware.ts
import { Request, Response, NextFunction } from 'express';

export function rbacMiddleware(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = user.roles || [];
    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}
```

**3. Write tests:**

```typescript
// backend/tests/unit/auth/middleware/rbac.middleware.test.ts
import { rbacMiddleware } from '../../../../src/modules/auth/middleware/rbac.middleware';
import { Request, Response } from 'express';

describe('RBAC Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: jest.Mock;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFn = jest.fn();
  });

  it('should return 401 if no user', () => {
    const middleware = rbacMiddleware(['admin']);
    middleware(mockReq as Request, mockRes as Response, nextFn);
    
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(nextFn).not.toHaveBeenCalled();
  });

  it('should return 403 if user lacks role', () => {
    (mockReq as any).user = { id: '1', roles: ['employee'] };
    
    const middleware = rbacMiddleware(['admin']);
    middleware(mockReq as Request, mockRes as Response, nextFn);
    
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(nextFn).not.toHaveBeenCalled();
  });

  it('should call next if user has required role', () => {
    (mockReq as any).user = { id: '1', roles: ['admin', 'employee'] };
    
    const middleware = rbacMiddleware(['admin']);
    middleware(mockReq as Request, mockRes as Response, nextFn);
    
    expect(nextFn).toHaveBeenCalled();
  });

  it('should allow if user has any of the required roles', () => {
    (mockReq as any).user = { id: '1', roles: ['manager'] };
    
    const middleware = rbacMiddleware(['admin', 'manager', 'hr']);
    middleware(mockReq as Request, mockRes as Response, nextFn);
    
    expect(nextFn).toHaveBeenCalled();
  });
});
```

**4. Run tests:**

```bash
cd backend
npm test -- rbac.middleware.test.ts
```

**5. Test manually:**

```bash
# Start server
npm run dev

# Try accessing admin route as employee (should fail)
curl -X GET http://localhost:5000/api/v1/admin/users \
  -H "Cookie: authToken=<employee-token>" \
  -v

# Expected: 403 Forbidden

# Try accessing admin route as admin (should succeed)
curl -X GET http://localhost:5000/api/v1/admin/users \
  -H "Cookie: authToken=<admin-token>" \
  -v

# Expected: 200 OK
```

---

## 🔴 CRITICAL FIX #2: JWT Secret Security (30 minutes)

### Current Issue
Files use fallback `'changeme'` if `JWT_SECRET` is not set.

### Step-by-Step Fix

**1. Create secure secret:**

```bash
# Generate 256-bit secret
openssl rand -base64 32
# Example output: kX8h3P9mN2qL5vR7tY4wE6iO0pA1sD3fG8hJ9kL2mN5q
```

**2. Update environment:**

```bash
# Add to backend/.env (create if doesn't exist)
echo "JWT_SECRET=<your-generated-secret>" >> backend/.env

# Verify .env is in .gitignore
grep ".env" .gitignore
```

**3. Update JWT service initialization:**

```typescript
// backend/src/modules/auth/services/jwt.service.ts
export class JwtService {
  constructor(private secret: string) {
    if (!secret || secret === 'changeme' || secret.length < 32) {
      throw new Error(
        'JWT_SECRET must be set to a secure random value (minimum 32 characters). ' +
        'Generate one with: openssl rand -base64 32'
      );
    }
  }

  sign(payload: JwtPayload, expiresIn: string = '7d'): string {
    return jwt.sign(payload, this.secret, { expiresIn });
  }

  verify(token: string): JwtPayload {
    return jwt.verify(token, this.secret) as JwtPayload;
  }
}
```

**4. Update initialization in app.ts:**

```typescript
// backend/src/app.ts

// Replace:
const jwtService = new JwtService(process.env.JWT_SECRET || 'changeme')

// With:
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is not set');
  console.error('Generate one with: openssl rand -base64 32');
  process.exit(1);
}
const jwtService = new JwtService(JWT_SECRET);
```

**5. Update all middleware files:**

```typescript
// backend/src/shared/middleware/auth.middleware.ts
// backend/src/modules/auth/middleware/google-auth.middleware.ts

// Replace:
const jwtService = new JwtService(process.env.JWT_SECRET || 'changeme');

// With:
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set');
}
const jwtService = new JwtService(JWT_SECRET);
```

**6. Test:**

```bash
# Test without JWT_SECRET (should fail to start)
unset JWT_SECRET
npm run dev
# Expected: Error and exit

# Test with JWT_SECRET (should start)
export JWT_SECRET="kX8h3P9mN2qL5vR7tY4wE6iO0pA1sD3fG8hJ9kL2mN5q"
npm run dev
# Expected: Server starts successfully
```

**7. Document in README:**

```markdown
## Environment Variables

### Required for Production

- `JWT_SECRET` - Secret key for JWT signing (minimum 32 characters)
  - Generate: `openssl rand -base64 32`
  - Never commit this to git!
```

---

## 🔴 CRITICAL FIX #3: Disable Mock Login in Production (15 minutes)

### Current Issue
Mock login endpoint bypasses authentication and is always available.

### Step-by-Step Fix

**1. Update route registration:**

```typescript
// backend/src/modules/auth/routes/google-auth.routes.ts

export function createGoogleAuthRoutes(controller: GoogleAuthController): Router {
  const router = Router();

  router.post(
    '/login/google',
    validationMiddleware([body('idToken').isString().notEmpty()]),
    controller.login
  );

  // Mock login for DEVELOPMENT ONLY
  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  Mock login endpoint enabled (development mode)');
    router.post(
      '/login/mock',
      validationMiddleware([body('email').isEmail()]),
      controller.mockLogin
    );
  } else {
    // Explicitly reject in production
    router.post('/login/mock', (req, res) => {
      console.warn('🚫 Attempted access to mock login in production');
      res.status(404).json({ 
        error: 'Endpoint not available in production',
        message: 'Please use Google OAuth for authentication'
      });
    });
  }

  // Get current authenticated user
  router.get('/me', controller.me);

  // Logout
  router.post('/logout', controller.logout);

  return router;
}
```

**2. Update controller with warning:**

```typescript
// backend/src/modules/auth/controllers/google-auth.controller.ts

mockLogin = async (req: Request, res: Response, next: NextFunction) => {
  // Log security warning
  console.warn('⚠️  MOCK LOGIN USED - DEVELOPMENT ONLY', {
    email: req.body.email,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  try {
    const { email, name } = req.body as { email: string; name?: string };
    if (!email) return res.status(400).json({ message: 'email is required' });

    // Rest of implementation...
  } catch (err) {
    next(err);
  }
};
```

**3. Add environment check in deployment:**

```bash
# deployment/scripts/deploy.sh

#!/bin/bash
set -e

# Verify production environment
if [ "$NODE_ENV" = "production" ]; then
  echo "✅ Deploying to production environment"
  
  # Verify no development endpoints
  if grep -q "ENABLE_MOCK_AUTH" .env 2>/dev/null; then
    echo "❌ ERROR: Mock auth found in production .env"
    exit 1
  fi
else
  echo "⚠️  Deploying to non-production environment"
fi
```

**4. Test:**

```bash
# Test in development (should work)
export NODE_ENV=development
npm run dev

curl -X POST http://localhost:5000/api/v1/auth/login/mock \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
# Expected: 200 OK

# Test in production (should fail)
export NODE_ENV=production
npm run dev

curl -X POST http://localhost:5000/api/v1/auth/login/mock \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
# Expected: 404 Not Found
```

---

## 🔴 CRITICAL FIX #4: Implement Error Middleware (1-2 hours)

### Current Issue
File `backend/src/shared/middleware/error.middleware.ts` is empty.

### Step-by-Step Fix

**1. Create error classes:**

```typescript
// backend/src/shared/errors/AppError.ts

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message, true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, true);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(500, message, false);
  }
}
```

**2. Implement error middleware:**

```typescript
// backend/src/shared/middleware/error.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { Logger } from '../utils/logger';

const logger = new Logger();

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Determine error details
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const isOperational = err instanceof AppError ? err.isOperational : false;
  const details = err instanceof AppError ? err.details : undefined;

  // Log error
  if (!isOperational || statusCode >= 500) {
    logger.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      statusCode,
      url: req.url,
      method: req.method,
      ip: req.ip,
      user: (req as any).user?.email,
      body: req.body,
    });
  } else {
    logger.warn('Client error:', {
      message: err.message,
      statusCode,
      url: req.url,
      user: (req as any).user?.email,
    });
  }

  // Build response
  const response: any = {
    success: false,
    error: isOperational ? err.message : 'Internal server error',
  };

  // Add details for operational errors
  if (isOperational && details) {
    response.details = details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.fullMessage = err.message;
  }

  // Send response
  res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, res: Response) {
  logger.warn('Route not found:', {
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.url,
  });
}

// Handle unhandled promise rejections
export function setupGlobalErrorHandlers() {
  process.on('unhandledRejection', (reason: any) => {
    logger.error('Unhandled Promise Rejection:', reason);
    // In production, you might want to restart the process
    if (process.env.NODE_ENV === 'production') {
      console.error('Shutting down due to unhandled rejection');
      process.exit(1);
    }
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    // Always exit on uncaught exception
    console.error('Shutting down due to uncaught exception');
    process.exit(1);
  });
}
```

**3. Register middleware in app.ts:**

```typescript
// backend/src/app.ts

import { errorHandler, notFoundHandler, setupGlobalErrorHandlers } from './shared/middleware/error.middleware';

// ... all your routes ...

// Error handling (MUST be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Setup global handlers
setupGlobalErrorHandlers();

export default app;
```

**4. Update controllers to use AppError:**

```typescript
// Example: backend/src/modules/feedback/controllers/feedback.controller.ts

import { NotFoundError, ForbiddenError, ValidationError } from '../../../shared/errors/AppError';

export class FeedbackController {
  async getFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const feedback = await this.service.getFeedback(id);
      
      if (!feedback) {
        throw new NotFoundError('Feedback not found');
      }

      // Check permissions
      if (feedback.giverId !== userId && feedback.receiverId !== userId) {
        throw new ForbiddenError('You do not have permission to view this feedback');
      }

      res.json({ success: true, data: feedback });
    } catch (error) {
      next(error); // Pass to error middleware
    }
  }
}
```

**5. Test:**

```bash
# Test 404
curl http://localhost:5000/api/v1/nonexistent
# Expected: 404 with proper error message

# Test unauthorized
curl http://localhost:5000/api/v1/feedback
# Expected: 401 with error message

# Test validation error
curl -X POST http://localhost:5000/api/v1/feedback \
  -H "Content-Type: application/json" \
  -H "Cookie: authToken=<valid-token>" \
  -d '{"invalid": "data"}'
# Expected: 400 with validation details
```

---

## 🔴 CRITICAL FIX #5: Persistent User Storage (4-6 hours)

### Current Issue
Users stored in memory (Map) - lost on restart.

### Step-by-Step Fix

**1. Create database model:**

```typescript
// backend/src/modules/auth/models/user.model.ts

import { Pool, PoolClient } from 'pg';

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  roles: string[];
  auth_provider: string;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class UserModel {
  constructor(private db: Pool) {}

  async findByEmail(email: string, client?: PoolClient): Promise<UserRow | null> {
    const executor = client || this.db;
    
    const result = await executor.query<UserRow>(`
      SELECT 
        id, email, name, picture, roles, 
        auth_provider, is_active, 
        last_login_at, created_at, updated_at
      FROM users
      WHERE email = $1 AND is_active = true
    `, [email]);

    return result.rows[0] || null;
  }

  async findById(id: string, client?: PoolClient): Promise<UserRow | null> {
    const executor = client || this.db;
    
    const result = await executor.query<UserRow>(`
      SELECT 
        id, email, name, picture, roles, 
        auth_provider, is_active, 
        last_login_at, created_at, updated_at
      FROM users
      WHERE id = $1 AND is_active = true
    `, [id]);

    return result.rows[0] || null;
  }

  async upsert(data: {
    email: string;
    name?: string;
    picture?: string;
    roles: string[];
    authProvider: string;
  }, client?: PoolClient): Promise<UserRow> {
    const executor = client || this.db;
    
    const result = await executor.query<UserRow>(`
      INSERT INTO users (email, name, picture, roles, auth_provider, last_login_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (email) 
      DO UPDATE SET 
        name = COALESCE(EXCLUDED.name, users.name),
        picture = COALESCE(EXCLUDED.picture, users.picture),
        roles = EXCLUDED.roles,
        last_login_at = NOW(),
        updated_at = NOW()
      RETURNING 
        id, email, name, picture, roles, 
        auth_provider, is_active, 
        last_login_at, created_at, updated_at
    `, [data.email, data.name, data.picture, data.roles, data.authProvider]);

    return result.rows[0];
  }

  async updateLastLogin(userId: string, client?: PoolClient): Promise<void> {
    const executor = client || this.db;
    
    await executor.query(`
      UPDATE users 
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [userId]);
  }

  async updateRoles(userId: string, roles: string[], client?: PoolClient): Promise<void> {
    const executor = client || this.db;
    
    await executor.query(`
      UPDATE users 
      SET roles = $2, updated_at = NOW()
      WHERE id = $1
    `, [userId, roles]);
  }
}
```

**2. Update UserService:**

```typescript
// backend/src/modules/auth/services/user.service.ts

import { Pool } from 'pg';
import { UserModel, UserRow } from '../models/user.model';

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  roles: string[];
}

export class UserService {
  private model: UserModel;

  constructor(db: Pool) {
    this.model = new UserModel(db);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.model.findByEmail(email);
    return user ? this.toUser(user) : null;
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.model.findById(id);
    return user ? this.toUser(user) : null;
  }

  async upsertGoogleUser(profile: { 
    email: string; 
    name?: string; 
    picture?: string;
  }): Promise<User> {
    // Determine roles based on email or other logic
    const roles = this.determineRoles(profile.email);
    
    const user = await this.model.upsert({
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      roles,
      authProvider: 'google',
    });

    return this.toUser(user);
  }

  private determineRoles(email: string): string[] {
    // This should be configurable or from database
    // For now, hardcoded logic
    if (email === 'admin@example.com' || email === 'itays@wix.com') {
      return ['admin', 'employee'];
    }
    
    if (email.includes('manager')) {
      return ['manager', 'employee'];
    }
    
    return ['employee'];
  }

  private toUser(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name || undefined,
      picture: row.picture || undefined,
      roles: row.roles,
    };
  }
}
```

**3. Update service initialization in app.ts:**

```typescript
// backend/src/app.ts

// Replace:
const userService = new UserService()

// With:
const userService = new UserService(db)
```

**4. Test:**

```bash
# Start server with database
npm run dev

# Login (should persist to database)
curl -X POST http://localhost:5000/api/v1/auth/login/mock \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User"}'

# Check database
psql $DATABASE_URL -c "SELECT id, email, name, roles FROM users;"

# Restart server
# User should still exist and be able to access protected routes
```

---

## 🔴 CRITICAL FIX #6: Implement Database Queries (6-8 hours)

### Current Issue
Models return fake data or null.

### Step-by-Step Fix (Example: Feedback Model)

**1. Implement feedback model:**

```typescript
// backend/src/modules/feedback/models/feedback.model.ts

import { Pool, PoolClient } from 'pg';
import { 
  FeedbackModel, 
  FeedbackFilters, 
  FeedbackStatus, 
  CreateFeedbackData 
} from '../types/feedback.types.js';

export class FeedbackModelClass {
  constructor(private db: Pool) {}

  async create(
    data: CreateFeedbackData,
    client?: PoolClient
  ): Promise<FeedbackModel> {
    const executor = client || this.db;
    
    const result = await executor.query<FeedbackModel>(`
      INSERT INTO feedback (
        giver_id, receiver_id, cycle_id,
        title, content, status, visibility,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `, [
      data.giver_id,
      data.receiver_id,
      data.cycle_id,
      data.title,
      data.content,
      data.status || 'draft',
      data.visibility || 'private',
    ]);

    return result.rows[0];
  }

  async findById(id: string, client?: PoolClient): Promise<FeedbackModel | null> {
    const executor = client || this.db;
    
    const result = await executor.query<FeedbackModel>(`
      SELECT * FROM feedback
      WHERE id = $1 AND deleted_at IS NULL
    `, [id]);

    return result.rows[0] || null;
  }

  async findWithFilters(
    filters: FeedbackFilters,
    page: number = 1,
    limit: number = 10,
    client?: PoolClient
  ): Promise<{ feedbacks: FeedbackModel[]; total: number }> {
    const executor = client || this.db;
    const offset = (page - 1) * limit;
    
    // Build WHERE clause dynamically
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.giverId) {
      conditions.push(`giver_id = $${paramIndex++}`);
      params.push(filters.giverId);
    }
    
    if (filters.receiverId) {
      conditions.push(`receiver_id = $${paramIndex++}`);
      params.push(filters.receiverId);
    }
    
    if (filters.cycleId) {
      conditions.push(`cycle_id = $${paramIndex++}`);
      params.push(filters.cycleId);
    }
    
    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    const whereClause = conditions.join(' AND ');
    
    // Get total count
    const countResult = await executor.query(
      `SELECT COUNT(*) FROM feedback WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated results
    const result = await executor.query<FeedbackModel>(`
      SELECT * FROM feedback
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, limit, offset]);
    
    return { 
      feedbacks: result.rows, 
      total 
    };
  }

  async update(
    id: string,
    updates: Partial<FeedbackModel>,
    client?: PoolClient
  ): Promise<FeedbackModel | null> {
    const executor = client || this.db;
    
    // Build SET clause dynamically
    const setFields: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      setFields.push(`title = $${paramIndex++}`);
      params.push(updates.title);
    }
    
    if (updates.content !== undefined) {
      setFields.push(`content = $${paramIndex++}`);
      params.push(updates.content);
    }
    
    if (updates.status !== undefined) {
      setFields.push(`status = $${paramIndex++}`);
      params.push(updates.status);
      
      if (updates.status === 'submitted') {
        setFields.push(`submitted_at = NOW()`);
      }
    }

    params.push(id); // For WHERE clause
    
    const result = await executor.query<FeedbackModel>(`
      UPDATE feedback
      SET ${setFields.join(', ')}
      WHERE id = $${paramIndex} AND deleted_at IS NULL
      RETURNING *
    `, params);

    return result.rows[0] || null;
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const executor = client || this.db;
    
    // Soft delete
    const result = await executor.query(`
      UPDATE feedback
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `, [id]);

    return result.rowCount > 0;
  }

  async getStatsByCycle(
    cycleId: string, 
    client?: PoolClient
  ): Promise<any> {
    const executor = client || this.db;
    
    const result = await executor.query(`
      SELECT 
        COUNT(*) as total_feedback,
        COUNT(*) FILTER (WHERE status = 'submitted') as completed_feedback,
        COUNT(*) FILTER (WHERE status = 'draft') as pending_feedback
      FROM feedback
      WHERE cycle_id = $1 AND deleted_at IS NULL
    `, [cycleId]);

    return result.rows[0];
  }

  async getStatsByUser(
    userId: string, 
    client?: PoolClient
  ): Promise<any> {
    const executor = client || this.db;
    
    const result = await executor.query(`
      SELECT 
        COUNT(*) FILTER (WHERE receiver_id = $1) as total_received,
        COUNT(*) FILTER (WHERE receiver_id = $1 AND status = 'submitted') as completed_received,
        COUNT(*) FILTER (WHERE giver_id = $1) as total_given,
        COUNT(*) FILTER (WHERE giver_id = $1 AND status = 'submitted') as completed_given
      FROM feedback
      WHERE (receiver_id = $1 OR giver_id = $1) AND deleted_at IS NULL
    `, [userId]);

    return result.rows[0];
  }
}
```

**2. Write tests:**

```typescript
// backend/tests/unit/feedback/models/feedback.model.test.ts

import { FeedbackModelClass } from '../../../../src/modules/feedback/models/feedback.model';
import { Pool } from 'pg';

describe('FeedbackModel', () => {
  let model: FeedbackModelClass;
  let mockDb: jest.Mocked<Pool>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    } as any;
    
    model = new FeedbackModelClass(mockDb);
  });

  describe('create', () => {
    it('should insert feedback and return it', async () => {
      const mockFeedback = {
        id: 'fb_123',
        giver_id: 'user1',
        receiver_id: 'user2',
        cycle_id: 'cycle1',
        title: 'Great work',
        content: 'You did awesome',
        status: 'draft',
        visibility: 'private',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.query.mockResolvedValue({ rows: [mockFeedback] } as any);

      const result = await model.create({
        giver_id: 'user1',
        receiver_id: 'user2',
        cycle_id: 'cycle1',
        title: 'Great work',
        content: 'You did awesome',
      });

      expect(result).toEqual(mockFeedback);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO feedback'),
        expect.arrayContaining(['user1', 'user2', 'cycle1'])
      );
    });
  });

  describe('findById', () => {
    it('should return feedback if found', async () => {
      const mockFeedback = { id: 'fb_123', title: 'Test' };
      mockDb.query.mockResolvedValue({ rows: [mockFeedback] } as any);

      const result = await model.findById('fb_123');

      expect(result).toEqual(mockFeedback);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM feedback'),
        ['fb_123']
      );
    });

    it('should return null if not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] } as any);

      const result = await model.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // Add more tests for other methods...
});
```

**3. Integration test:**

```bash
# Run tests
cd backend
npm test -- feedback.model.test.ts

# Test with real database
npm run test:integration -- feedback
```

**4. Repeat for other models:**
- Comment model
- Rating model
- Goal model
- Cycle model
- etc.

---

## 📊 PROGRESS TRACKING

Create a checklist to track your progress:

```markdown
## Critical Fixes Progress

- [ ] RBAC Middleware
  - [ ] Replace implementation
  - [ ] Write tests
  - [ ] Manual testing
  - [ ] Code review

- [ ] JWT Secret Security
  - [ ] Generate secure secret
  - [ ] Update all files
  - [ ] Add validation
  - [ ] Document in README

- [ ] Disable Mock Login
  - [ ] Add environment check
  - [ ] Test in production mode
  - [ ] Update deployment scripts

- [ ] Error Middleware
  - [ ] Create error classes
  - [ ] Implement middleware
  - [ ] Update controllers
  - [ ] Test error scenarios

- [ ] Persistent User Storage
  - [ ] Create UserModel
  - [ ] Update UserService
  - [ ] Update initialization
  - [ ] Test with database

- [ ] Database Queries
  - [ ] Feedback model
  - [ ] Comment model
  - [ ] Rating model
  - [ ] Goal model
  - [ ] Cycle model
  - [ ] All other models
```

---

## 🧪 TESTING STRATEGY

### After Each Fix:

1. **Unit Tests:** Test the specific function/class
2. **Integration Tests:** Test the full flow
3. **Manual Tests:** Use curl/Postman
4. **Security Tests:** Try to bypass the fix

### Before Merging:

```bash
# Run all tests
cd backend && npm test
cd frontend && npm test

# Run security audit
npm audit

# Run linter
npm run lint

# Type check
npm run type-check
```

---

## 📝 DOCUMENTATION UPDATES

After implementing fixes, update:

1. **README.md** - Add new environment variables
2. **SETUP.md** - Update setup instructions
3. **API_REFERENCE.md** - Document error responses
4. **.env.example** - Add new required variables
5. **CHANGELOG.md** - Document security fixes

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying with fixes:

```bash
# 1. Generate secrets
openssl rand -base64 32 > jwt_secret.txt
openssl rand -base64 32 > database_password.txt

# 2. Set environment variables
export NODE_ENV=production
export JWT_SECRET=$(cat jwt_secret.txt)
export DATABASE_URL=postgresql://user:$(cat database_password.txt)@host/db

# 3. Run database migrations
cd backend && npm run migrate

# 4. Run tests
npm test

# 5. Build production
npm run build

# 6. Start server
npm start
```

---

## 💡 TIPS

1. **Work incrementally** - Fix one issue at a time
2. **Test after each fix** - Don't accumulate untested changes
3. **Write tests first** - TDD helps catch edge cases
4. **Code review** - Have another developer review security changes
5. **Document everything** - Future you will thank you

---

**Questions?** Refer to the full audit report: `SECURITY_AUDIT_REPORT.md`

**Need help?** Contact the security team or senior developers.

