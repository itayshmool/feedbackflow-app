import { Request, Response, NextFunction } from 'express';

/**
 * Email Whitelist Middleware
 * 
 * Restricts access to the application based on user email addresses.
 * Supports:
 * - Individual emails: "user@company.com"
 * - Domain wildcards: "@company.com" (any email from domain)
 * - Multiple entries (comma-separated)
 * 
 * Environment Variables:
 * EMAIL_WHITELIST="user1@company.com,user2@company.com"
 * EMAIL_DOMAIN_WHITELIST="@company.com,@partner.com"
 * 
 * Hierarchy (OVERRIDE logic):
 * - If EMAIL_WHITELIST has values → ONLY those specific emails allowed (domain ignored)
 * - If EMAIL_WHITELIST is empty/not set → Use domain whitelist
 * 
 * Examples:
 * 1. EMAIL_DOMAIN_WHITELIST="@wix.com", EMAIL_WHITELIST="" → All @wix.com allowed
 * 2. EMAIL_DOMAIN_WHITELIST="@wix.com", EMAIL_WHITELIST="john@wix.com" → ONLY john@wix.com allowed
 * 
 * If both are not set, all authenticated emails are allowed (disabled).
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
 * Parse email whitelist from environment variable
 * Format: "email1@company.com,email2@company.com,email3@external.com"
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
 * Parse domain whitelist from environment variable
 * Format: "@company.com,@partner.com,@wix.com"
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

/**
 * Initialize email whitelist from environment
 * Returns middleware if EMAIL_WHITELIST or EMAIL_DOMAIN_WHITELIST is set, null otherwise
 */
export function initializeEmailWhitelist(): ReturnType<typeof createEmailWhitelistMiddleware> | null {
  const emailWhitelistEnv = process.env.EMAIL_WHITELIST;
  const domainWhitelistEnv = process.env.EMAIL_DOMAIN_WHITELIST;

  // If neither is set, feature is disabled
  if (!emailWhitelistEnv && !domainWhitelistEnv) {
    console.log('ℹ️  Email Whitelist disabled (EMAIL_WHITELIST and EMAIL_DOMAIN_WHITELIST not set)');
    return null;
  }

  const emailWhitelist = parseEmailWhitelistEnv(emailWhitelistEnv);
  const domainWhitelist = parseDomainWhitelistEnv(domainWhitelistEnv);

  // If both are empty after parsing, feature is disabled
  if (emailWhitelist.length === 0 && domainWhitelist.length === 0) {
    console.warn('⚠️  EMAIL_WHITELIST and EMAIL_DOMAIN_WHITELIST are set but empty - feature disabled');
    return null;
  }

  console.log(`🔒 Initializing Email Whitelist:`);
  console.log(`   - ${domainWhitelist.length} domain(s)`);
  console.log(`   - ${emailWhitelist.length} specific email(s)`);

  return createEmailWhitelistMiddleware({
    emailWhitelist,
    domainWhitelist,
    message: 'Access denied: Your email is not authorized to access this system. Please contact your administrator.'
  });
}

