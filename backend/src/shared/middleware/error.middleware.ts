import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Logger } from '../utils/logger.js';

const logger = new Logger();

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Interface for sanitized error response
 */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
  requestId?: string;
}

/**
 * Sanitizes error messages to prevent information leakage
 */
function sanitizeErrorMessage(error: Error, isDevelopment: boolean): string {
  // Known safe operational errors - return as-is
  if (error instanceof AppError && error.isOperational) {
    return error.message;
  }

  // Validation errors are safe to expose
  if (error instanceof ZodError) {
    return 'Validation failed';
  }

  // In development, show actual message for debugging
  if (isDevelopment) {
    return error.message;
  }

  // In production, hide internal error details
  // Check for database errors
  if (error.message.includes('ECONNREFUSED') || 
      error.message.includes('connection') ||
      error.message.includes('ETIMEDOUT')) {
    return 'Service temporarily unavailable';
  }

  if (error.message.includes('duplicate key') ||
      error.message.includes('unique constraint')) {
    return 'A record with this information already exists';
  }

  if (error.message.includes('foreign key') ||
      error.message.includes('violates')) {
    return 'Unable to complete this operation due to data constraints';
  }

  // Generic message for unknown errors
  return 'An unexpected error occurred';
}

/**
 * Determines HTTP status code from error
 */
function getStatusCode(error: Error): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  if (error instanceof ZodError) {
    return 400;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError' || 
      error.name === 'TokenExpiredError') {
    return 401;
  }

  return 500;
}

/**
 * Global error handling middleware
 * MUST be registered after all routes
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const statusCode = getStatusCode(error);
  
  // Generate request ID for tracking (use existing or create new)
  const requestId = req.headers['x-request-id'] as string || 
    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Log the full error (never exposed to client)
  logger.error(`[${requestId}] Error: ${error.message}`, {
    statusCode,
    path: req.path,
    method: req.method,
    stack: error.stack,
    userId: (req as any).user?.id,
  });

  // Build sanitized response
  const response: ErrorResponse = {
    success: false,
    error: {
      message: sanitizeErrorMessage(error, isDevelopment),
      code: error instanceof AppError ? error.code : undefined,
    },
    requestId,
  };

  // Add validation details for ZodError (safe to expose)
  if (error instanceof ZodError) {
    response.error.details = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  }

  // In development, include stack trace for debugging
  if (isDevelopment && !(error instanceof AppError && error.isOperational)) {
    (response.error as any).stack = error.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * 404 Not Found handler
 * Register after all routes but before errorHandler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND',
    },
  });
}

/**
 * Async handler wrapper to catch promise rejections
 * Use: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

