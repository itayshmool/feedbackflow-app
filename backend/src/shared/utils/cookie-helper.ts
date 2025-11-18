import { Request } from 'express'

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

export function getCookieOptions(req: Request) {
  const hostname = req.hostname || req.get('host')?.split(':')[0] || 'localhost'
  const isProduction = process.env.NODE_ENV === 'production'
  const isLocalhost = hostname === 'localhost' || hostname.startsWith('127.0.0.1')

  // Check if request is HTTPS (direct or behind proxy)
  const isHttps = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https'

  return {
    httpOnly: true,
    secure: isProduction && !isLocalhost && isHttps,
    sameSite: 'lax' as const,  // 'lax' works for same-site and is more compatible
    maxAge: 24 * 60 * 60 * 1000,
    domain: getCookieDomain(hostname)
  }
}

