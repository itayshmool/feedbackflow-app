import { Request, Response, NextFunction } from 'express';
import { settingsCache } from '../utils/settings-cache.js';

/**
 * IP Whitelist Middleware
 * 
 * Restricts access to the application based on IP addresses.
 * Supports:
 * - Individual IPs: "1.2.3.4"
 * - CIDR ranges: "192.168.1.0/24"
 * - Multiple entries (comma-separated)
 * 
 * NEW: Reads from database (via Security Settings)
 * Fallback: IP_WHITELIST environment variable
 * 
 * If disabled or empty, all IPs are allowed.
 */

interface IPWhitelistOptions {
  whitelist: string[];
  message?: string;
}

/**
 * Check if an IP address matches a CIDR range
 */
function ipMatchesCIDR(ip: string, cidr: string): boolean {
  try {
    // Remove IPv6 prefix if present (::ffff:)
    const cleanIP = ip.replace(/^::ffff:/, '');
    
    // If not CIDR notation, do exact match
    if (!cidr.includes('/')) {
      return cleanIP === cidr;
    }

    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);

    const ipInt = ipToInt(cleanIP);
    const rangeInt = ipToInt(range);

    return (ipInt & mask) === (rangeInt & mask);
  } catch (error) {
    console.error(`❌ Error matching IP ${ip} to CIDR ${cidr}:`, error);
    return false;
  }
}

/**
 * Convert IPv4 address to integer
 */
function ipToInt(ip: string): number {
  return ip.split('.').reduce((int, oct) => (int << 8) + parseInt(oct, 10), 0) >>> 0;
}

/**
 * Get client IP from request (handles proxies)
 */
function getClientIP(req: Request): string {
  // Check x-forwarded-for header (Render, Cloudflare, etc.)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // Take first IP in chain (original client)
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  // Check x-real-ip header
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }

  // Fallback to socket address
  return req.socket.remoteAddress || req.ip || 'unknown';
}

/**
 * Create IP whitelist middleware
 */
export function createIPWhitelistMiddleware(options: IPWhitelistOptions) {
  const { whitelist, message = 'Access denied: Your IP address is not authorized' } = options;

  // Clean and validate whitelist
  const cleanWhitelist = whitelist
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);

  if (cleanWhitelist.length === 0) {
    console.warn('⚠️  IP Whitelist is empty - all IPs will be blocked!');
  } else {
    console.log(`🔒 IP Whitelist enabled: ${cleanWhitelist.length} entries`);
    cleanWhitelist.forEach(entry => {
      console.log(`   - ${entry}`);
    });
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = getClientIP(req);
    
    // Clean IPv6 prefix for display
    const displayIP = clientIP.replace(/^::ffff:/, '');

    // Check if IP matches any whitelist entry
    const isAllowed = cleanWhitelist.some(entry => {
      const cleanEntry = entry.replace(/^::ffff:/, '');
      return ipMatchesCIDR(clientIP, cleanEntry);
    });

    if (isAllowed) {
      console.log(`✅ IP ${displayIP} allowed (whitelisted)`);
      return next();
    }

    // IP not in whitelist - block request
    console.warn(`🚫 IP ${displayIP} blocked - not in whitelist`);
    console.warn(`   Path: ${req.method} ${req.path}`);
    console.warn(`   User-Agent: ${req.headers['user-agent'] || 'unknown'}`);

    return res.status(403).json({
      error: 'Forbidden',
      message,
      code: 'IP_NOT_WHITELISTED',
      timestamp: new Date().toISOString()
    });
  };
}

/**
 * Initialize IP whitelist from database (with environment fallback)
 * Returns middleware that checks IP on each request
 */
export function initializeIPWhitelist() {
  console.log('🔒 Initializing IP Whitelist (database-backed with env fallback)');
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get settings from cache (avoids DB query on every request)
      const settings = await settingsCache.getSettings();
      const { ipWhitelist } = settings;

      // Check if IP whitelist is enabled
      if (!ipWhitelist.enabled || ipWhitelist.allowedIPs.length === 0) {
        // Disabled - allow all IPs
        return next();
      }

      const clientIP = getClientIP(req);
      const displayIP = clientIP.replace(/^::ffff:/, '');

      // Check if IP matches any whitelist entry
      const isAllowed = ipWhitelist.allowedIPs.some(entry => {
        const cleanEntry = entry.replace(/^::ffff:/, '');
        return ipMatchesCIDR(clientIP, cleanEntry);
      });

      if (isAllowed) {
        console.log(`✅ IP ${displayIP} allowed (whitelisted)`);
        return next();
      }

      // IP not in whitelist - block request
      console.warn(`🚫 IP ${displayIP} blocked - not in whitelist`);
      console.warn(`   Path: ${req.method} ${req.path}`);
      console.warn(`   User-Agent: ${req.headers['user-agent'] || 'unknown'}`);

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: Your IP address is not authorized to access this service',
        code: 'IP_NOT_WHITELISTED',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[IP Whitelist] Error checking whitelist:', error);
      // On error, allow request (fail open for safety)
      console.warn('[IP Whitelist] Allowing request due to error (fail-open)');
      return next();
    }
  };
}

/**
 * Legacy: Parse IP whitelist from environment variable
 * Kept for backwards compatibility
 */
export function parseIPWhitelistEnv(envValue: string | undefined): string[] {
  if (!envValue || envValue.trim() === '') {
    return [];
  }

  return envValue
    .split(',')
    .map(ip => ip.trim())
    .filter(ip => ip.length > 0);
}

