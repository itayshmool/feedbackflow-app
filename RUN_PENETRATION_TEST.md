# 🔴 Run Penetration Test on Staging

**Status**: Security fix deployed to staging - ready for testing!

---

## ⚡ Quick Start (2 minutes)

### Step 1: Get Your Credentials

1. **Login to staging**: https://feedbackflow-frontend-staging.onrender.com
2. **Open DevTools**: Press F12 or Right-click → Inspect
3. **Go to Network tab**
4. **Click around** in the app (e.g., go to Users page)
5. **Find an API request** in the Network tab
6. **Copy the token**:
   - Click on any request to `feedbackflow-backend-staging.onrender.com`
   - Find `Authorization: Bearer xxx...`
   - Copy the full token (without "Bearer ")

7. **Get your Organization ID**:
   - In the UI, go to your profile or settings
   - Or check the API request URLs for `organizationId=xxx`
   - Copy the UUID

---

### Step 2: Run the Automated Test

```bash
# Set your credentials
export ADMIN_TOKEN="paste-your-token-here"
export ORG_ID="paste-your-org-id-here"

# Run the penetration test
./scripts/test-security-fix.sh
```

---

### Step 3: Read the Results

The script will try all 3 attacks and show:

✅ **If security fix is working:**
```
✅ ATTACK 1 BLOCKED: Privilege escalation denied
✅ ATTACK 2 BLOCKED: Privilege escalation denied
✅ ATTACK 3 BLOCKED: Privilege escalation denied

✅ ALL ATTACKS BLOCKED - SECURITY FIX IS WORKING!
Recommendation: ✅ READY FOR PRODUCTION DEPLOYMENT
```

❌ **If vulnerability still exists:**
```
❌ ATTACK 1 SUCCEEDED: User imported with super_admin role!
   CRITICAL VULNERABILITY EXISTS!

❌ VULNERABILITY STILL EXISTS!
DO NOT DEPLOY TO PRODUCTION!
```

---

## 🎯 What the Test Does

### Attack 1: User Import
Tries to import a user with `super_admin` role via the `/api/v1/admin/users/import` endpoint.

**Expected**: Error message "Privilege escalation denied"

### Attack 2: Bulk Role Assignment
Tries to bulk-assign `super_admin` role to an existing user via `/api/v1/admin/users/bulk`.

**Expected**: 400 error with "Privilege escalation denied"

### Attack 3: Direct Role Assignment
Tries to directly assign `super_admin` role via `/api/v1/admin/users/:userId/roles`.

**Expected**: 400 error with "Privilege escalation denied"

---

## 📋 Alternative: Manual Test (1 minute)

If you prefer to test manually, just run this one command:

```bash
curl -X POST 'https://feedbackflow-backend-staging.onrender.com/api/v1/admin/users/import' \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "users": [{
      "email": "hacker@test.com",
      "name": "Hacker",
      "organizationId": "YOUR_ORG_ID_HERE",
      "roles": ["employee", "super_admin"]
    }]
  }'
```

**✅ Good response** (fix working):
```json
{
  "success": true,
  "data": {
    "totalErrors": 1,
    "errors": [{
      "error": "Privilege escalation denied: You cannot assign the 'super_admin' role..."
    }]
  }
}
```

**❌ Bad response** (vulnerability exists):
```json
{
  "success": true,
  "data": {
    "totalSuccess": 1,
    "totalErrors": 0
  }
}
```

---

## ❓ Troubleshooting

### "Authentication required" or 401 error
- Your token expired - login again and get a fresh token
- Make sure you copied the full token (it's very long)

### "No test users found"
- Your organization might be empty
- The script will skip attacks that need existing users
- Attack 1 (user import) will still run

### Script doesn't run
```bash
# Make sure it's executable
chmod +x scripts/test-security-fix.sh

# Make sure you're in the repo root
cd /path/to/feedbackflow-app
```

---

## 📊 Expected Results

| Test | Expected Result | If It Fails |
|------|----------------|-------------|
| Attack 1 | ✅ Blocked | 🚨 Critical - user created with super_admin |
| Attack 2 | ✅ Blocked | 🚨 Critical - role assigned via bulk |
| Attack 3 | ✅ Blocked | 🚨 Critical - role assigned directly |

---

## 🚀 After Testing

### If All Tests Pass ✅
1. **Approve for production**
2. **Merge staging → main**
3. **Deploy to production**
4. **Monitor for 1 hour**
5. **Notify security team**

### If Any Test Fails ❌
1. **DO NOT DEPLOY TO PRODUCTION**
2. **Report to development team**
3. **Include full error messages**
4. **Wait for fix**

---

## 📞 Need Help?

- Check `SECURITY_TESTING_GUIDE.md` for detailed instructions
- Check `SECURITY_FIX_SUMMARY.md` for background info
- Contact backend team
- Contact security team

---

**Ready to test? Run the script now!** 🚀

```bash
export ADMIN_TOKEN="your-token"
export ORG_ID="your-org-id"
./scripts/test-security-fix.sh
```

