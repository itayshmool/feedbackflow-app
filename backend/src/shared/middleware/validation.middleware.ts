import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { validationResult } from 'express-validator';

export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      // Replace request data with validated data
      req.body = validatedData.body || req.body;
      req.query = validatedData.query || req.query;
      req.params = validatedData.params || req.params;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

export function validationMiddleware(validators: any[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (const validator of validators) {
      await validator.run(req);
    }
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).json({ errors: result.array() });
    }
    next();
  };
}