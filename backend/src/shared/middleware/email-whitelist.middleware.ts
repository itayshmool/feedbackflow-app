import { Request, Response, NextFunction } from 'express';
import { settingsCache } from '../utils/settings-cache.js';

/**
 * Email Whitelist Middleware
 * 
 * Restricts access to the application based on user email addresses.
 * Supports:
 * - Individual emails: "user@company.com"
 * - Domain wildcards: "@company.com" (any email from domain)
 * - Multiple entries (comma-separated)
 * 
 * NEW: Reads from database (via Security Settings)
 * Fallback: EMAIL_WHITELIST and EMAIL_DOMAIN_WHITELIST environment variables
 * 
 * Modes (from database):
 * - 'disabled': All authenticated emails allowed
 * - 'domain': Check domain whitelist only
 * - 'specific': Check specific email list only (overrides domain)
 * 
 * If disabled or empty, all authenticated emails are allowed.
 */

interface EmailWhitelistOptions {
  emailWhitelist: string[];
  domainWhitelist: string[];
  message?: string;
}

/**
 * Extract domain from email address
 */
function extractDomain(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) {
    return '';
  }
  return '@' + parts[1].toLowerCase();
}

/**
 * Normalize email address (lowercase, trim)
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Check if email is whitelisted
 * 
 * OVERRIDE HIERARCHY:
 * - If EMAIL_WHITELIST has values → check ONLY that list (ignore domain)
 * - If EMAIL_WHITELIST is empty → check domain whitelist
 */
function isEmailWhitelisted(
  email: string,
  emailWhitelist: string[],
  domainWhitelist: string[]
): { allowed: boolean; reason: string } {
  const normalizedEmail = normalizeEmail(email);
  const domain = extractDomain(normalizedEmail);

  // If EMAIL_WHITELIST has values, ONLY check that list (ignore domain)
  if (emailWhitelist.length > 0) {
    if (emailWhitelist.includes(normalizedEmail)) {
      return {
        allowed: true,
        reason: 'in EMAIL_WHITELIST (domain ignored)'
      };
    }
    // Email not in individual list - block (even if domain matches)
    return {
      allowed: false,
      reason: 'not in EMAIL_WHITELIST (domain whitelist ignored when EMAIL_WHITELIST is set)'
    };
  }

  // EMAIL_WHITELIST is empty - check domain whitelist
  if (domainWhitelist.length > 0 && domainWhitelist.includes(domain)) {
    return {
      allowed: true,
      reason: `domain ${domain} whitelisted`
    };
  }

  // Not whitelisted
  return {
    allowed: false,
    reason: 'not in whitelist'
  };
}

/**
 * Create email whitelist middleware
 */
export function createEmailWhitelistMiddleware(options: EmailWhitelistOptions) {
  const { emailWhitelist, domainWhitelist, message = 'Access denied: Your email is not authorized' } = options;

  // Normalize and validate whitelists
  const cleanEmailWhitelist = emailWhitelist
    .map(email => normalizeEmail(email))
    .filter(email => email.length > 0 && email.includes('@'));

  const cleanDomainWhitelist = domainWhitelist
    .map(domain => normalizeEmail(domain))
    .filter(domain => domain.startsWith('@') && domain.length > 1);

  // Log initialization
  if (cleanDomainWhitelist.length === 0 && cleanEmailWhitelist.length === 0) {
    console.warn('⚠️  Email Whitelist is empty - all emails will be blocked!');
  } else {
    console.log(`🔒 Email Whitelist enabled:`);
    
    // Show hierarchy mode
    if (cleanEmailWhitelist.length > 0) {
      console.log(`   ⚠️  OVERRIDE MODE: EMAIL_WHITELIST is set - domain whitelist will be IGNORED`);
      console.log(`   📧 ONLY these specific emails allowed: ${cleanEmailWhitelist.length} entries`);
      cleanEmailWhitelist.forEach(email => {
        console.log(`      - ${email}`);
      });
      if (cleanDomainWhitelist.length > 0) {
        console.log(`   ⏭️  Domain whitelist IGNORED (${cleanDomainWhitelist.length} entries):`);
        cleanDomainWhitelist.forEach(domain => {
          console.log(`      - ${domain} (not used)`);
        });
      }
    } else {
      // EMAIL_WHITELIST is empty - use domain whitelist
      console.log(`   📧 Domain mode: EMAIL_WHITELIST is empty, using domain whitelist`);
      console.log(`   📧 Domains: ${cleanDomainWhitelist.length} entries`);
      cleanDomainWhitelist.forEach(domain => {
        console.log(`      - ${domain}`);
      });
    }
  }

  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated (should have req.user from auth middleware)
    const reqUser = (req as any).user;
    if (!reqUser || !reqUser.email) {
      // No user or email - let auth middleware handle this
      return next();
    }

    const userEmail = reqUser.email;
    const { allowed, reason } = isEmailWhitelisted(
      userEmail,
      cleanEmailWhitelist,
      cleanDomainWhitelist
    );

    if (allowed) {
      console.log(`✅ Email ${userEmail} allowed (${reason})`);
      return next();
    }

    // Email not in whitelist - block request
    console.warn(`🚫 Email ${userEmail} blocked - ${reason}`);
    console.warn(`   Path: ${req.method} ${req.path}`);
    console.warn(`   User ID: ${reqUser.id || 'unknown'}`);
    console.warn(`   Timestamp: ${new Date().toISOString()}`);

    return res.status(403).json({
      error: 'Forbidden',
      message,
      code: 'EMAIL_NOT_WHITELISTED',
      email: userEmail,
      timestamp: new Date().toISOString()
    });
  };
}

/**
 * Initialize email whitelist from database (with environment fallback)
 * Returns middleware that checks email on each request
 */
export function initializeEmailWhitelist() {
  console.log('🔒 Initializing Email Whitelist (database-backed with env fallback)');
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get settings from cache (avoids DB query on every request)
      const settings = await settingsCache.getSettings();
      const { emailWhitelist } = settings;

      // Check if email whitelist is disabled
      if (emailWhitelist.mode === 'disabled') {
        // Disabled - allow all authenticated emails
        return next();
      }

      // Check if user is authenticated (should have req.user from auth middleware)
      const reqUser = (req as any).user;
      if (!reqUser || !reqUser.email) {
        // No user or email - let auth middleware handle this
        return next();
      }

      const userEmail = reqUser.email;
      const normalizedEmail = normalizeEmail(userEmail);
      const domain = extractDomain(normalizedEmail);

      let isAllowed = false;
      let reason = '';

      // Check based on mode
      if (emailWhitelist.mode === 'specific') {
        // Specific emails only (overrides domain)
        const cleanEmails = emailWhitelist.emails.map(e => normalizeEmail(e));
        isAllowed = cleanEmails.includes(normalizedEmail);
        reason = isAllowed 
          ? 'in specific email whitelist' 
          : 'not in specific email whitelist (domain ignored)';
      } else if (emailWhitelist.mode === 'domain') {
        // Domain whitelist
        const cleanDomains = emailWhitelist.domains.map(d => normalizeEmail(d));
        isAllowed = cleanDomains.includes(domain);
        reason = isAllowed 
          ? `domain ${domain} whitelisted` 
          : 'domain not whitelisted';
      }

      if (isAllowed) {
        console.log(`✅ Email ${userEmail} allowed (${reason})`);
        return next();
      }

      // Email not in whitelist - block request
      console.warn(`🚫 Email ${userEmail} blocked - ${reason}`);
      console.warn(`   Path: ${req.method} ${req.path}`);
      console.warn(`   User ID: ${reqUser.id || 'unknown'}`);
      console.warn(`   Mode: ${emailWhitelist.mode}`);
      console.warn(`   Timestamp: ${new Date().toISOString()}`);

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: Your email is not authorized to access this system. Please contact your administrator.',
        code: 'EMAIL_NOT_WHITELISTED',
        email: userEmail,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[Email Whitelist] Error checking whitelist:', error);
      // On error, allow request (fail open for safety)
      console.warn('[Email Whitelist] Allowing request due to error (fail-open)');
      return next();
    }
  };
}

/**
 * Legacy: Parse email whitelist from environment variable
 * Kept for backwards compatibility
 */
export function parseEmailWhitelistEnv(envValue: string | undefined): string[] {
  if (!envValue || envValue.trim() === '') {
    return [];
  }

  return envValue
    .split(',')
    .map(email => email.trim())
    .filter(email => email.length > 0);
}

/**
 * Legacy: Parse domain whitelist from environment variable
 * Kept for backwards compatibility
 */
export function parseDomainWhitelistEnv(envValue: string | undefined): string[] {
  if (!envValue || envValue.trim() === '') {
    return [];
  }

  return envValue
    .split(',')
    .map(domain => domain.trim())
    .filter(domain => domain.length > 0);
}

