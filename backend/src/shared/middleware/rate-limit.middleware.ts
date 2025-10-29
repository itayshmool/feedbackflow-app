import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum number of requests per window
  message?: string;
}

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();
    const windowStart = now - options.windowMs;

    // Clean up expired entries
    const entries = Array.from(requestCounts.entries());
    for (const [k, v] of entries) {
      if (v.resetTime < now) {
        requestCounts.delete(k);
      }
    }

    const current = requestCounts.get(key);
    
    if (!current || current.resetTime < now) {
      // First request in window or window expired
      requestCounts.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      next();
    } else if (current.count < options.max) {
      // Within limit
      current.count++;
      next();
    } else {
      // Rate limit exceeded
      const message = options.message || 'Too many requests, please try again later';
      res.status(429).json({
        error: 'Rate limit exceeded',
        message,
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
      });
    }
  };
}

// Export with the name expected by other modules
export const rateLimitMiddleware = rateLimit;