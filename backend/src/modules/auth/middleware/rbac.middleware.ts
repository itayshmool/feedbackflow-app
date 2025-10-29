// backend/src/modules/auth/middleware/rbac.middleware.ts

import { Request, Response, NextFunction } from 'express';

export function rbacMiddleware(allowedRoles: string[]) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    // Minimal stub; allow all for scaffolding
    next();
  };
}


