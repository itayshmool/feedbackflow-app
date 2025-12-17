/**
 * CSRF (Cross-Site Request Forgery) Protection Middleware
 * 
 * Uses the Double Submit Cookie pattern:
 * 1. Server generates a cryptographically secure token
 * 2. Token is stored in a cookie (non-httpOnly so JS can read it)
 * 3. Frontend reads cookie and sends token in X-CSRF-Token header
 * 4. Server validates header matches cookie
 * 
 * This protects against CSRF because:
 * - Attackers cannot read cookies from other domains (Same-Origin Policy)
 * - Even if attackers could set cookies, they can't read them to include in headers
 * - The server validates both must match
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Configuration
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32; // 256 bits of entropy

// Methods that require CSRF protection (state-changing operations)
const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

// Routes that are exempt from CSRF validation
// (typically: auth endpoints where no cookie exists yet, webhooks with their own auth)
const EXEMPT_ROUTES = [
  '/api/v1/auth/login',
  '/api/v1/auth/login/mock',
  '/api/v1/auth/login/google', // Google OAuth login
  '/api/v1/auth/google/callback',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh', // Token refresh uses httpOnly refresh token for security
  '/api/v1/auth/logout', // Logout is safe to exempt - only affects current user
  '/api/v1/profile', // Profile endpoints - already protected by auth token
  '/api/v1/webhooks/', // Webhooks have their own signature verification
  // AI endpoints - long timeouts (2+ min) can cause CSRF cookie issues on mobile.
  // Low risk: auth-protected, only affects user's own data, attacker can't read response.
  '/api/v1/ai/',
  '/health',
  '/api/v1/health',
];

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Get cookie options for CSRF token
 * Note: NOT httpOnly so JavaScript can read it
 */
export function getCsrfCookieOptions(req: Request) {
  const hostname = req.hostname || req.get('host')?.split(':')[0] || 'localhost';
  // Treat both production and staging as production-like for cookie settings
  // (cross-origin cookies need sameSite: 'none' and secure: true)
  const isProductionLike = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
  const isLocalhost = hostname === 'localhost' || hostname.startsWith('127.0.0.1');
  
  // For cross-origin requests (frontend/backend on different subdomains),
  // we need sameSite: 'none' with secure: true in production/staging
  const sameSite = isProductionLike && !isLocalhost ? 'none' as const : 'lax' as const;
  
  return {
    httpOnly: false, // MUST be false so frontend JS can read it
    secure: isProductionLike && !isLocalhost, // Must be true when sameSite is 'none'
    sameSite,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours - longer than session since it's just for CSRF
    path: '/',
  };
}

/**
 * Set CSRF token cookie
 * Call this on login/auth to issue a fresh CSRF token
 */
export function setCsrfToken(req: Request, res: Response): string {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions(req));
  return token;
}

/**
 * Clear CSRF token cookie
 * Call this on logout
 */
export function clearCsrfToken(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
}

/**
 * Check if a route is exempt from CSRF validation
 */
function isExemptRoute(path: string): boolean {
  return EXEMPT_ROUTES.some(exempt => {
    // Exact match or prefix match for paths ending with /
    if (exempt.endsWith('/')) {
      return path.startsWith(exempt);
    }
    return path === exempt || path.startsWith(exempt + '/');
  });
}

/**
 * CSRF validation middleware
 * 
 * Usage:
 *   app.use(csrfProtection);
 * 
 * Or for specific routes:
 *   app.post('/api/something', csrfProtection, handler);
 * 
 * Security Note: Bearer token requests skip CSRF validation because:
 * 1. Bearer tokens are NOT automatically sent by browsers (unlike cookies)
 * 2. The token must be explicitly set via JavaScript in the Authorization header
 * 3. Same-Origin Policy prevents malicious sites from reading localStorage/tokens
 * 4. This is industry standard (Auth0, Firebase, AWS Cognito, all OAuth 2.0 APIs)
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Only validate state-changing methods
  if (!PROTECTED_METHODS.includes(req.method)) {
    return next();
  }
  
  // Check if route is exempt
  if (isExemptRoute(req.path)) {
    console.log(`🔓 CSRF: Exempt route ${req.path}`);
    return next();
  }
  
  // Skip CSRF validation for Bearer token authentication
  // Bearer tokens are inherently CSRF-safe because:
  // - They are not automatically sent by browsers (unlike cookies)
  // - Attackers cannot read/steal tokens from other origins (Same-Origin Policy)
  // - The token must be explicitly included via JavaScript
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log(`🔓 CSRF: Skipping for Bearer token auth on ${req.method} ${req.path}`);
    return next();
  }
  
  // For cookie-based authentication, validate CSRF token
  // Get token from cookie
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  
  // Get token from header
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;
  
  // Both must exist
  if (!cookieToken || !headerToken) {
    console.warn(`⚠️ CSRF: Missing token - cookie: ${!!cookieToken}, header: ${!!headerToken}, path: ${req.path}`);
    res.status(403).json({
      success: false,
      error: 'CSRF token missing',
      message: 'Request blocked due to missing CSRF token. Please refresh the page and try again.',
    });
    return;
  }
  
  // Tokens must match (constant-time comparison to prevent timing attacks)
  // First check length to avoid timingSafeEqual error with different-length buffers
  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);
  
  if (cookieBuffer.length !== headerBuffer.length || 
      !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
    console.warn(`⚠️ CSRF: Token mismatch on ${req.path}`);
    res.status(403).json({
      success: false,
      error: 'CSRF token invalid',
      message: 'Request blocked due to invalid CSRF token. Please refresh the page and try again.',
    });
    return;
  }
  
  // Token valid
  console.log(`✅ CSRF: Valid token for ${req.method} ${req.path}`);
  next();
}

/**
 * Middleware to ensure CSRF token exists (sets one if missing)
 * Useful for the /csrf-token endpoint
 */
export function ensureCsrfToken(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    setCsrfToken(req, res);
  }
  next();
}

/**
 * Handler for /api/v1/csrf-token endpoint
 * Returns the current CSRF token (or generates a new one)
 */
export function csrfTokenHandler(req: Request, res: Response): void {
  let token = req.cookies?.[CSRF_COOKIE_NAME];
  
  // Generate new token if none exists
  if (!token) {
    token = setCsrfToken(req, res);
  }
  
  res.json({
    success: true,
    csrfToken: token,
  });
}

export default csrfProtection;

