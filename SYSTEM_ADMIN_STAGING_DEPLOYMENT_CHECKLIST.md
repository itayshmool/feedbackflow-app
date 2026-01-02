# System Admin - Staging Deployment Checklist

## Pre-Deployment

- [x] All backend tests passing (36 tests)
- [x] TypeScript compilation successful (backend & frontend)
- [x] Code reviewed and documented
- [x] Migration SQL script created
- [x] Summary document created

## Deployment Steps

### Step 1: Database Migration
```bash
# Option A: Manual (if you have database access)
psql $DATABASE_URL -f database/migrations/add_system_settings.sql

# Option B: Via migration tool
# Add to your migration sequence and run
```

### Step 2: Set Environment Variable
**Via Render Dashboard:**
1. Go to your staging service
2. Environment tab
3. Add: `SYSTEM_ADMINS` = `itays@wix.com`
4. Save Changes (auto-redeploys)

**OR via Render MCP:**
```typescript
await render.updateEnvironmentVariables({
  serviceId: 'staging-service-id',
  envVars: [{ key: 'SYSTEM_ADMINS', value: 'itays@wix.com' }]
});
```

### Step 3: Deploy Code
```bash
# Current branch
git add .
git commit -m "feat(system): implement System Admin settings page"
git push origin staging

# Wait for Render auto-deploy
```

## Post-Deployment Verification

### 1. Check Database
```sql
-- Verify tables exist
\dt system_settings*

-- Check initial data
SELECT * FROM system_settings WHERE key = 'security_settings';

-- Verify audit table is ready
SELECT COUNT(*) FROM system_settings_audit;
```

### 2. Verify Environment Variable
**Check in Render Dashboard:**
- Environment tab should show: `SYSTEM_ADMINS=itays@wix.com`

### 3. Test System Admin Access
**As itays@wix.com:**
1. Login to staging app
2. Navigate to: `https://[staging-url]/system/security`
3. Expected: Security Settings page loads with 3 tabs
4. Try editing a setting and saving
5. Expected: Toast notification "Security settings saved successfully"
6. Refresh page
7. Expected: Changes persist

**Check API Directly:**
```bash
# Replace TOKEN with your actual JWT
curl https://[staging-url]/api/v1/system/check-access \
  -H "Cookie: token=YOUR_JWT_TOKEN"

# Expected response:
# {"success":true,"data":{"isSystemAdmin":true,"email":"itays@wix.com"}}
```

### 4. Test Non-Admin Access
**As any other user:**
1. Login to staging
2. Try to access: `https://[staging-url]/system/security`
3. Expected: Redirected to `/dashboard`

### 5. Test Settings Functionality
**All tabs:**
- [ ] Maintenance Mode: Toggle on/off, edit message, save
- [ ] Email Whitelist: Change mode, add domains/emails, save
- [ ] IP Whitelist: Toggle on/off, add IPs, save

**Verify in database:**
```sql
SELECT value FROM system_settings WHERE key = 'security_settings';
-- Should show your updated settings

SELECT * FROM system_settings_audit ORDER BY changed_at DESC LIMIT 5;
-- Should show your changes with timestamps
```

### 6. Check Logs
**Backend logs should show:**
```
[SecuritySettings] Successfully migrated settings from environment to database
[System Admin] Access granted for itays@wix.com
[SecuritySettings] Settings updated by itays@wix.com
```

## Rollback Plan (if needed)

**If something goes wrong:**
1. Revert code: `git revert HEAD && git push origin staging`
2. Remove env variable: Delete `SYSTEM_ADMINS` from Render
3. Drop tables (optional): 
   ```sql
   DROP TABLE IF EXISTS system_settings_audit;
   DROP TABLE IF EXISTS system_settings;
   ```

## Known Issues / Limitations

1. **No navigation menu item** - User must know URL `/system/security`
2. **No frontend IP validation** - Invalid IPs are accepted in form
3. **No audit log UI** - Must query database to see history

## Success Indicators

✅ System admin can access `/system/security`
✅ Non-admins are redirected
✅ Settings can be edited and saved
✅ Changes persist after page reload
✅ Audit log records all changes
✅ No errors in backend logs
✅ Application still works for regular users

## Next Steps (Future)

- [ ] Add navigation menu item for system admins
- [ ] Build audit log viewer UI
- [ ] Add frontend validation for IP/email formats
- [ ] Add "Test IP" button to verify whitelist
- [ ] Email notifications for security changes

---

**Deployment Date:** _Pending_
**Deployed By:** _Pending_
**Verified By:** _Pending_
**Issues Found:** _None expected_

