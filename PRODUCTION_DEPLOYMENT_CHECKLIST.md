# System Admin - Production Deployment Checklist

**Date:** 2026-01-02  
**Feature:** System Admin Settings Page  
**Status:** Ready for Production Deployment

---

## Pre-Deployment Checklist

### ✅ Testing Completed
- [x] All backend tests passing (36 tests)
- [x] Frontend TypeScript compilation successful
- [x] Feature deployed to staging
- [x] Staging manually tested
- [x] Database migration tested on staging

### ⚠️ Backup Required
- [ ] **CRITICAL: Screenshot/copy all production environment variables**
- [ ] Verify you have access to Render Dashboard
- [ ] Confirm production database connection string is available
- [ ] Document current production state

---

## Step-by-Step Production Deployment

### Step 1: Backup Environment Variables ⚠️ REQUIRED

**Go to Render Dashboard:**
1. Navigate to: https://dashboard.render.com/web/srv-d4o1nu2li9vc73c6ipe0
2. Click "Environment" tab
3. **Take a screenshot** of all variables (or copy them)
4. Save to secure location (NOT in git!)

**Minimum variables to verify exist:**
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FRONTEND_URL`
- `ALLOWED_ORIGINS`

---

### Step 2: Database Migration

**Get production database URL from Render Dashboard, then run:**

```bash
# From your local machine
psql "YOUR_PRODUCTION_DATABASE_URL" -f database/migrations/add_system_settings.sql
```

**Expected output:**
```
CREATE TABLE
CREATE INDEX
INSERT 0 1
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
COMMENT
COMMENT
```

**Verify tables were created:**
```bash
psql "YOUR_PRODUCTION_DATABASE_URL" -c "\dt system_settings*"
```

**Expected output:**
```
                   List of relations
 Schema |         Name          | Type  |    Owner     
--------+-----------------------+-------+--------------
 public | system_settings       | table | feedbackflow
 public | system_settings_audit | table | feedbackflow
```

---

### Step 3: Add SYSTEM_ADMINS Environment Variable

**Option A: Via Render Dashboard**
1. Go to service environment tab
2. Add new variable:
   - Key: `SYSTEM_ADMINS`
   - Value: `itays@wix.com`
3. Click "Save Changes"
4. Service will automatically redeploy

**Option B: Via Render MCP**
I can run this command for you:
```typescript
await render.updateEnvironmentVariables({
  serviceId: 'srv-d4o1nu2li9vc73c6ipe0',
  envVars: [{ key: 'SYSTEM_ADMINS', value: 'itays@wix.com' }]
});
```

---

### Step 4: Deploy Code to Production

```bash
# Ensure you're on staging with latest changes
git checkout staging
git pull origin staging

# Switch to main
git checkout main
git pull origin main

# Merge staging into main
git merge staging

# Review changes
git log --oneline -5

# Push to production
git push origin main

# Service will auto-deploy (if enabled)
# Otherwise, manually trigger deploy in Render Dashboard
```

**Commits being deployed:**
- `9c1fec9` - Add Security Settings navigation
- `33bf5cc` - System Admin implementation

---

### Step 5: Monitor Deployment

**Backend Production:**
- Service: `feedbackflow-backend`
- URL: https://feedbackflow-backend.onrender.com
- Dashboard: https://dashboard.render.com/web/srv-d4o1nu2li9vc73c6ipe0

**Check deployment status:**
1. Watch Render Dashboard for deploy progress
2. Check for errors in logs
3. Wait for "Live" status

**Expected log messages:**
```
[SecuritySettings] Successfully migrated settings from environment to database
Server running on port 10000
```

---

### Step 6: Deploy Frontend

**Frontend Production:**
- Service: `feedbackflow-frontend`
- URL: https://feedbackflow-frontend.onrender.com
- Service ID: `srv-d4o8gj7pm1nc7380pl4g`

**Note:** Production frontend has `autoDeploy: no`, so you need to:

**Option 1: Trigger manual deploy via Render Dashboard**
1. Go to frontend service
2. Click "Manual Deploy"
3. Select "main" branch
4. Click "Deploy"

**Option 2: Temporarily enable auto-deploy**
- Not recommended for production

---

### Step 7: Verification Testing

**Test 1: System Admin Access (as itays@wix.com)**
1. Login to: https://feedbackflow-frontend.onrender.com
2. Check sidebar - should see "SYSTEM" section
3. Click "Security Settings"
4. Verify page loads with 3 tabs
5. Test editing and saving settings
6. Refresh page - verify changes persist

**Test 2: Non-Admin Access (as any other user)**
1. Login with different account
2. Check sidebar - "SYSTEM" section should NOT appear
3. Try manually navigating to `/system/security`
4. Should be redirected to `/dashboard`

**Test 3: API Endpoint**
```bash
# Check system admin API (should require authentication)
curl https://feedbackflow-backend.onrender.com/api/v1/system/check-access

# Should return 401 if not authenticated
```

**Test 4: Database Verification**
```sql
-- Check settings exist
SELECT key, description FROM system_settings WHERE key = 'security_settings';

-- Check audit log ready
SELECT COUNT(*) FROM system_settings_audit;
```

**Test 5: Existing Features Still Work**
- [ ] Regular users can login
- [ ] Dashboard loads
- [ ] Feedback system works
- [ ] Admin features work
- [ ] No errors in browser console

---

## Post-Deployment Checklist

- [ ] Backend deployment successful
- [ ] Frontend deployment successful
- [ ] Database migration confirmed
- [ ] System admin can access Security Settings page
- [ ] Non-admins are properly blocked
- [ ] No errors in backend logs
- [ ] No errors in frontend console
- [ ] All existing features still work
- [ ] Email/IP whitelists still functioning (if configured)

---

## Rollback Plan (If Needed)

### If Backend Issues
```bash
# Rollback code
git checkout main
git revert HEAD
git push origin main

# Or deploy previous commit via Render Dashboard
```

### If Database Issues
```sql
-- Remove tables (data loss!)
DROP TABLE IF EXISTS system_settings_audit;
DROP TABLE IF EXISTS system_settings;
```

### If Environment Variable Issues
1. Go to Render Dashboard
2. Remove `SYSTEM_ADMINS` variable
3. Redeploy service

### Full Rollback
1. Revert code changes
2. Remove environment variable
3. Drop database tables
4. Verify application returns to previous state

---

## Common Issues & Solutions

### Issue: "Cannot access /system/security"
- **Check:** Is `SYSTEM_ADMINS` env var set correctly?
- **Check:** Is user logged in with correct email?
- **Check:** Check backend logs for middleware errors

### Issue: "System Settings page not loading"
- **Check:** Is backend running?
- **Check:** Database migration successful?
- **Check:** Check browser console for errors

### Issue: "Navigation item not showing"
- **Check:** Is frontend deployed with latest code?
- **Check:** Hard refresh browser (Ctrl+Shift+R)
- **Check:** Check `/api/v1/system/check-access` API response

### Issue: "Database migration failed"
- **Check:** Connection string is correct
- **Check:** Database user has CREATE TABLE permissions
- **Check:** Tables don't already exist (use `DROP TABLE IF EXISTS`)

---

## Success Criteria

✅ **All must be true for successful deployment:**
1. Backend deployed and running without errors
2. Frontend deployed with latest code
3. Database tables created successfully
4. System admin (itays@wix.com) can access Security Settings
5. Non-admins are properly blocked
6. All existing features continue to work
7. No new errors in logs or console

---

## Support & Documentation

**Documentation Files:**
- `SYSTEM_ADMIN_IMPLEMENTATION_SUMMARY.md` - Technical details
- `PRODUCTION_ENV_BACKUP_INSTRUCTIONS.md` - Environment variable backup
- `SYSTEM_ADMIN_STAGING_DEPLOYMENT_CHECKLIST.md` - Staging deployment record

**Service URLs:**
- Backend: https://feedbackflow-backend.onrender.com
- Frontend: https://feedbackflow-frontend.onrender.com
- Dashboard: https://dashboard.render.com

---

**Deployment Date:** _Pending_  
**Deployed By:** _Pending_  
**Verified By:** _Pending_  
**Issues Found:** _None expected_

---

## Ready to Deploy?

Before you proceed, confirm:
- [ ] I have backed up production environment variables
- [ ] I have the production database connection string
- [ ] I understand the rollback process
- [ ] I'm ready to monitor the deployment
- [ ] I can test immediately after deployment

**If all above are checked, you're ready to proceed with deployment!** 🚀

