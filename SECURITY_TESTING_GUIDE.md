# Security Fix Testing Guide

**Branch**: `staging` (security fix merged)  
**Date**: December 22, 2024  
**Tester**: You!

---

## 🎯 Testing Objective

Verify that the privilege escalation vulnerability is **FIXED** and all three attack vectors are **BLOCKED**.

---

## ⚙️ Prerequisites

### 1. Deploy to Staging Environment

Your staging environment should now have the security fix:
```bash
# Staging backend should be rebuilt and deployed
https://feedbackflow-backend-staging.onrender.com

# Check health endpoint
curl https://feedbackflow-backend-staging.onrender.com/api/v1/health
```

### 2. Get Test Credentials

You need:
- ✅ **Admin user** credentials (NOT super_admin)
- ✅ **Super admin user** credentials (for comparison)
- ✅ Admin user's auth token

---

## 🔴 Test 1: User Import Attack Vector (CRITICAL)

### Setup

1. **Login as Admin** (not super_admin)
2. **Get your auth token** from browser DevTools:
   - Open DevTools → Application → Cookies
   - Find `token` or check Authorization header in Network tab
3. **Note your current email address**

### Attack Attempt (Should FAIL)

```bash
# Replace with your actual values:
ADMIN_TOKEN="your-admin-jwt-token"
ADMIN_EMAIL="your-admin@example.com"
ORG_ID="your-organization-id"

curl -X POST 'https://feedbackflow-backend-staging.onrender.com/api/v1/admin/users/import' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "users": [{
      "email": "attacker@example.com",
      "name": "Attacker Test",
      "organizationId": "'$ORG_ID'",
      "department": "Security",
      "position": "hacker",
      "roles": ["employee", "manager", "super_admin"]
    }]
  }'
```

### ✅ Expected Result (FIX WORKING)

```json
{
  "success": true,
  "data": {
    "totalProcessed": 1,
    "totalSuccess": 0,
    "totalErrors": 1,
    "errors": [{
      "data": {
        "email": "attacker@example.com",
        ...
      },
      "error": "Privilege escalation denied: You cannot assign the 'super_admin' role..."
    }]
  }
}
```

**✅ PASS**: Error message about privilege escalation  
**❌ FAIL**: User created with super_admin role (VULNERABILITY EXISTS!)

### Verify No User Created

```bash
# Check if user was created (should NOT exist)
curl 'https://feedbackflow-backend-staging.onrender.com/api/v1/admin/users?search=attacker@example.com' \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**✅ PASS**: User not found or has no super_admin role  
**❌ FAIL**: User exists with super_admin role

---

## 🔴 Test 2: Bulk Role Assignment Attack Vector (CRITICAL)

### Setup

1. **Login as Admin**
2. **Find a test user** in your organization (or create one)
3. **Get the super_admin role ID**

### Get Super Admin Role ID

```bash
curl 'https://feedbackflow-backend-staging.onrender.com/api/v1/admin/roles' \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[] | select(.name=="super_admin")'
```

Copy the `id` field.

### Attack Attempt (Should FAIL)

```bash
TARGET_USER_ID="some-user-id-in-your-org"
SUPER_ADMIN_ROLE_ID="role-id-from-above"

curl -X POST 'https://feedbackflow-backend-staging.onrender.com/api/v1/admin/users/bulk' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "assign_role",
    "userIds": ["'$TARGET_USER_ID'"],
    "roleId": "'$SUPER_ADMIN_ROLE_ID'"
  }'
```

### ✅ Expected Result (FIX WORKING)

```json
{
  "success": false,
  "error": "Failed to perform bulk update",
  "details": "Privilege escalation denied: You cannot assign the 'super_admin' role..."
}
```

**✅ PASS**: 400 error with privilege escalation message  
**❌ FAIL**: 200 success (VULNERABILITY EXISTS!)

---

## 🔴 Test 3: Direct Role Assignment Attack Vector (CRITICAL)

### Attack Attempt (Should FAIL)

```bash
TARGET_USER_ID="some-user-id-in-your-org"
SUPER_ADMIN_ROLE_ID="role-id-from-above"

curl -X POST "https://feedbackflow-backend-staging.onrender.com/api/v1/admin/users/$TARGET_USER_ID/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": "'$SUPER_ADMIN_ROLE_ID'"
  }'
```

### ✅ Expected Result (FIX WORKING)

```json
{
  "success": false,
  "error": "Failed to assign user role",
  "details": "Privilege escalation denied: You cannot assign the 'super_admin' role..."
}
```

**✅ PASS**: 400 error with privilege escalation message  
**❌ FAIL**: 200 success (VULNERABILITY EXISTS!)

---

## ✅ Test 4: Legitimate Operations (Should WORK)

### Test 4.1: Admin Can Create Employee Users

```bash
curl -X POST 'https://feedbackflow-backend-staging.onrender.com/api/v1/admin/users/import' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "users": [{
      "email": "legitimate-employee@example.com",
      "name": "Legit Employee",
      "organizationId": "'$ORG_ID'",
      "roles": ["employee"]
    }]
  }'
```

**✅ PASS**: User created successfully  
**❌ FAIL**: Error message (FIX TOO RESTRICTIVE!)

### Test 4.2: Admin Can Assign Manager Role

```bash
# Get manager role ID first
MANAGER_ROLE_ID=$(curl 'https://feedbackflow-backend-staging.onrender.com/api/v1/admin/roles' \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[] | select(.name=="manager") | .id')

# Assign manager role
curl -X POST "https://feedbackflow-backend-staging.onrender.com/api/v1/admin/users/$TARGET_USER_ID/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": "'$MANAGER_ROLE_ID'"
  }'
```

**✅ PASS**: Role assigned successfully  
**❌ FAIL**: Error message (FIX TOO RESTRICTIVE!)

### Test 4.3: Super Admin CAN Assign Admin Role

**Login as Super Admin**, then:

```bash
SUPERADMIN_TOKEN="your-superadmin-token"
ADMIN_ROLE_ID=$(curl 'https://feedbackflow-backend-staging.onrender.com/api/v1/admin/roles' \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" | jq -r '.data[] | select(.name=="admin") | .id')

curl -X POST "https://feedbackflow-backend-staging.onrender.com/api/v1/admin/users/$TARGET_USER_ID/roles" \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": "'$ADMIN_ROLE_ID'",
    "organizationId": "'$ORG_ID'"
  }'
```

**✅ PASS**: Role assigned successfully  
**❌ FAIL**: Error message (FIX BROKEN!)

---

## 🖥️ Test 5: UI Testing

### Test 5.1: Import Users via UI

1. **Login as Admin** to staging frontend
2. Navigate to **Administration → Users**
3. Click **Import Users**
4. Upload CSV with this content:
   ```csv
   email,name,department,position,roles
   test1@example.com,Test User,IT,Developer,employee
   test2@example.com,Hacker,IT,Hacker,"employee,super_admin"
   ```
5. Click **Import**

**✅ PASS**: 
- First user imports successfully
- Second user shows error about privilege escalation
- Error message is user-friendly

**❌ FAIL**: Both users import successfully

### Test 5.2: Bulk Operations via UI

1. Navigate to **Administration → Users**
2. **Select multiple users**
3. Click **Bulk Actions → Assign Role**
4. Try to select **Super Admin** role
5. Click **Apply**

**✅ PASS**: Error message about privilege escalation  
**❌ FAIL**: Roles assigned successfully

---

## 📊 Test Results Checklist

### Critical Tests (MUST PASS)
- [ ] Test 1: User import attack blocked
- [ ] Test 2: Bulk role assignment attack blocked
- [ ] Test 3: Direct role assignment attack blocked

### Regression Tests (MUST PASS)
- [ ] Test 4.1: Admin can create employee users
- [ ] Test 4.2: Admin can assign manager role
- [ ] Test 4.3: Super admin can assign admin role

### UI Tests (SHOULD PASS)
- [ ] Test 5.1: UI import shows appropriate errors
- [ ] Test 5.2: UI bulk operations show appropriate errors

---

## ⚠️ If Tests FAIL

### Critical Tests Failed (Attack Works)
🚨 **DO NOT DEPLOY TO PRODUCTION**

1. Check backend logs for errors
2. Verify staging has the latest code deployed
3. Contact development team immediately

### Regression Tests Failed (Legitimate Operations Broken)
⚠️ **Fix is too restrictive**

1. Document which operations are broken
2. Report to development team
3. May need to adjust role hierarchy logic

---

## 🎓 Understanding the Fix

### Role Hierarchy
```
employee (level 1)
   ↓ Can assign employee
manager (level 2)
   ↓ Can assign employee, manager
admin (level 3)
   ↓ Can assign employee, manager, admin
super_admin (level 4)
```

**Rule**: You CANNOT assign a role >= your own level

### Example Scenarios

| Your Role | Can Assign | Cannot Assign |
|-----------|-----------|---------------|
| Employee | (none) | All roles |
| Manager | Employee | Manager, Admin, Super Admin |
| Admin | Employee, Manager | Admin, Super Admin |
| Super Admin | All roles | (none) |

---

## 📝 Reporting Results

After testing, document:

1. **All test results** (pass/fail for each)
2. **Error messages** encountered
3. **Screenshots** of UI tests
4. **API response examples**
5. **Any unexpected behavior**

Create a test report:
```
TEST REPORT: Security Fix Validation
Date: [date]
Environment: Staging
Tester: [your name]

CRITICAL TESTS:
✅ Test 1: PASS - User import attack blocked
✅ Test 2: PASS - Bulk attack blocked
✅ Test 3: PASS - Direct attack blocked

REGRESSION TESTS:
✅ Test 4.1: PASS - Employee creation works
✅ Test 4.2: PASS - Manager assignment works
✅ Test 4.3: PASS - Super admin can assign admin

RECOMMENDATION: ✅ READY FOR PRODUCTION
```

---

## 🚀 After Successful Testing

If all tests pass:

1. **Approve for production deployment**
2. **Merge staging → main**
3. **Deploy to production**
4. **Monitor for 1 hour**
5. **Notify security team** that vulnerability is fixed

---

## 📞 Support

**Questions?** Contact:
- Backend team
- Security team  
- @itays on Slack

---

**Good luck with testing!** 🎉

