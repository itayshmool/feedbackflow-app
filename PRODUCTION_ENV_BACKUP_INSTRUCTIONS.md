# Production Environment Variables Backup
**Date:** 2026-01-02
**Service:** feedbackflow-backend (Production)
**Service ID:** srv-d4o1nu2li9vc73c6ipe0

## Important Notice
⚠️ **Render MCP does not provide read access to environment variable values** for security reasons.

## How to Backup Environment Variables Manually

### Option 1: Via Render Dashboard (Recommended)
1. Go to: https://dashboard.render.com/web/srv-d4o1nu2li9vc73c6ipe0
2. Click "Environment" tab
3. **Take a screenshot** of all environment variables
4. Or manually copy each key-value pair to a secure location

### Option 2: Via Render CLI
```bash
# Install Render CLI if not already installed
brew install render

# Login
render login

# Get service details (this will show env var keys but not values)
render services get srv-d4o1nu2li9vc73c6ipe0
```

### Option 3: From .env File (If You Have Local Backup)
Check if you have a production `.env` backup file locally.

---

## Known Environment Variables (Based on Staging)

Based on staging configuration, production should have these environment variables:

### Required Variables
```bash
# Database
DATABASE_URL=<PostgreSQL connection string>

# Authentication
JWT_SECRET=<secret key>
JWT_REFRESH_SECRET=<secret key>
GOOGLE_CLIENT_ID=<client id>
GOOGLE_CLIENT_SECRET=<secret>
GOOGLE_REDIRECT_URI=https://feedbackflow-backend.onrender.com/api/v1/auth/google/callback

# Frontend URLs
FRONTEND_URL=https://feedbackflow-frontend.onrender.com
ALLOWED_ORIGINS=https://feedbackflow-frontend.onrender.com

# OpenAI (if used)
OPENAI_API_KEY=<api key>

# Session/Security
SESSION_SECRET=<secret>
CSRF_SECRET=<secret>

# Node Environment
NODE_ENV=production
PORT=10000
```

### Security Features (May or May Not Be Set)
```bash
# IP Whitelist (optional)
IP_WHITELIST=<comma-separated IPs>

# Email Whitelist (optional)
EMAIL_WHITELIST=<comma-separated emails>
EMAIL_DOMAIN_WHITELIST=<comma-separated domains>

# Maintenance Mode (optional)
MAINTENANCE_MODE=false
MAINTENANCE_MESSAGE=<message>
MAINTENANCE_ALLOWED_USERS=<comma-separated emails>
```

---

## What We Need to Add for System Admin

### New Environment Variable
```bash
SYSTEM_ADMINS=itays@wix.com
```

This is the **ONLY** new variable we're adding.

---

## Backup Checklist Before Production Deployment

- [ ] Screenshot or copy all current environment variables from Render Dashboard
- [ ] Save to secure location (not in git!)
- [ ] Verify DATABASE_URL is correct
- [ ] Verify JWT secrets are set
- [ ] Verify Google OAuth credentials
- [ ] Verify FRONTEND_URL matches production frontend
- [ ] Note any IP_WHITELIST or EMAIL_WHITELIST settings
- [ ] Verify OPENAI_API_KEY if AI features are enabled

---

## Production Deployment Steps

### 1. Backup Current State
```bash
# Take screenshots of Render Dashboard environment variables
# Save this document for reference
```

### 2. Run Database Migration
```bash
psql $PRODUCTION_DATABASE_URL -f database/migrations/add_system_settings.sql
```

### 3. Add SYSTEM_ADMINS Environment Variable
Via Render Dashboard or MCP:
```bash
SYSTEM_ADMINS=itays@wix.com
```

### 4. Deploy Code to Production
```bash
git checkout main
git merge staging
git push origin main
```

### 5. Verify Deployment
- Check backend logs
- Test system admin access
- Verify regular users still work

---

## Rollback Plan

If something goes wrong:

### Rollback Code
```bash
git revert HEAD
git push origin main
```

### Rollback Database (if needed)
```sql
DROP TABLE IF EXISTS system_settings_audit;
DROP TABLE IF EXISTS system_settings;
```

### Remove Environment Variable
Go to Render Dashboard → Environment → Delete `SYSTEM_ADMINS`

---

## Security Notes

1. **Never commit .env files to git**
2. **Store backup in secure location** (password manager, encrypted file)
3. **JWT secrets should never be shared**
4. **Database credentials are sensitive**
5. **Google OAuth secrets should be kept private**

---

## Contact Information

If you need to retrieve environment variables:
- Access Render Dashboard: https://dashboard.render.com
- Check local backups in secure storage
- Contact team members who may have backups

---

**Status:** ⚠️ **ACTION REQUIRED**
Please manually backup production environment variables from Render Dashboard before proceeding with deployment.

