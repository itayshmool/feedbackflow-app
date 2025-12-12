import { Request } from 'express'
import { ACCESS_TOKEN_MAX_AGE_MS, REFRESH_TOKEN_MAX_AGE_MS } from '../../modules/auth/services/jwt.service.js'

export function getCookieDomain(hostname: string): string | undefined {
  // localhost - don't set domain
  if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
    return undefined
  }
  
  // IP address - don't set domain
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return undefined
  }
  
  // Production domain - extract base (app.example.com -> .example.com)
  const parts = hostname.split('.')
  if (parts.length >= 2) {
    return `.${parts.slice(-2).join('.')}`
  }
  
  return undefined
}

export type TokenType = 'access' | 'refresh'

/**
 * Get cookie options for authentication tokens
 * @param req - Express request object
 * @param tokenType - Type of token ('access' for short-lived, 'refresh' for long-lived)
 */
export function getCookieOptions(req: Request, tokenType: TokenType = 'access') {
  const hostname = req.hostname || req.get('host')?.split(':')[0] || 'localhost'
  const isProduction = process.env.NODE_ENV === 'production'
  const isLocalhost = hostname === 'localhost' || hostname.startsWith('127.0.0.1')

  // Check if request is HTTPS (direct or behind proxy)
  const isHttps = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https'

  // For cross-origin cookies (frontend and backend on different subdomains),
  // we need sameSite: 'none' with secure: true in production
  const sameSite = isProduction && !isLocalhost ? 'none' as const : 'lax' as const

  // Different maxAge based on token type
  const maxAge = tokenType === 'access' ? ACCESS_TOKEN_MAX_AGE_MS : REFRESH_TOKEN_MAX_AGE_MS

  const options = {
    httpOnly: true,
    secure: isProduction && !isLocalhost,  // Must be true when sameSite is 'none'
    sameSite,
    maxAge,
    path: '/',  // Explicit path required for clearCookie to work properly
    domain: getCookieDomain(hostname)
  }
  
  // DEBUG: Log cookie options
  const maxAgeDisplay = tokenType === 'access' ? '15m' : '7d'
  console.log(`🍪 Cookie options (${tokenType}, ${maxAgeDisplay}):`, { hostname, domain: options.domain, path: options.path, sameSite: options.sameSite })
  
  return options
}

/**
 * Get cookie options for access token (15 minutes)
 */
export function getAccessTokenCookieOptions(req: Request) {
  return getCookieOptions(req, 'access')
}

/**
 * Get cookie options for refresh token (7 days)
 */
export function getRefreshTokenCookieOptions(req: Request) {
  return getCookieOptions(req, 'refresh')
}
