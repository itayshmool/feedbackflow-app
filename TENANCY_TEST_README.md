# Tenancy Vulnerability Test - Quick Start

## 🎯 Purpose

This test script demonstrates a **critical multi-tenancy security vulnerability** where organization-scoped administrators can access and modify data belonging to other organizations.

## 📁 Files Created

1. **`test-tenancy-vulnerability.js`** - Main penetration test script
2. **`test-tenancy-vulnerability.sh`** - Interactive helper script  
3. **`TENANCY_VULNERABILITY_REPORT.md`** - Detailed technical report
4. **`TENANCY_TEST_README.md`** - This file

## 🚀 Quick Start

### Option 1: Interactive Script (Easiest)

```bash
./test-tenancy-vulnerability.sh
```

The script will prompt you for:
- Admin A Token (JWT from staging login)
- Organization B ID (UUID of target org)
- Organization B Name (e.g., "Acme Corp")
- Organization B Slug (e.g., "acme-corp")

### Option 2: Command Line Arguments

```bash
node test-tenancy-vulnerability.js \
  --admin-a-token "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  --admin-b-org-id "550e8400-e29b-41d4-a716-446655440000" \
  --admin-b-org-name "Acme Corp" \
  --admin-b-org-slug "acme-corp"
```

### Option 3: Environment Variables

```bash
export ADMIN_A_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export ADMIN_B_ORG_ID="550e8400-e29b-41d4-a716-446655440000"
export ADMIN_B_ORG_NAME="Acme Corp"
export ADMIN_B_ORG_SLUG="acme-corp"

node test-tenancy-vulnerability.js
```

## 📋 Prerequisites

### 1. Get Admin A Token

1. Login to staging: https://feedbackflow-frontend-staging.onrender.com
2. Open DevTools (F12)
3. Go to: **Application** → **Cookies** → `feedbackflow-frontend-staging.onrender.com`
4. Copy the **`token`** cookie value

### 2. Get Organization B Details

1. While logged in as Admin A, go to: **Administration** → **Organizations**
2. Find a **DIFFERENT** organization (not the one you manage)
3. Note down:
   - **Organization ID** (UUID format)
   - **Organization Name** (display name)
   - **Organization Slug** (URL-friendly identifier)

**Important:** Admin A should NOT have legitimate access to Organization B. This is what we're testing!

## 🧪 What the Test Does

The script runs 5 attack scenarios:

| # | Test | Endpoint | Attack Vector |
|---|------|----------|---------------|
| 1 | **CSV Upload** | `POST /hierarchy/bulk/csv` | Upload CSV with Org B data |
| 2 | **Org Details** | `GET /organizations/:id` | Read Org B via path param |
| 3 | **Org Update** | `PUT /organizations/:id` | Modify Org B via path param |
| 4 | **User Access** | `GET /users?organizationId=X` | List Org B users |
| 5 | **Hierarchy Create** | `POST /hierarchy` | Create hierarchy in Org B via body |

## 📊 Expected Results

### If Vulnerable (Current State)

```
Total Tests: 5
Vulnerable: 5
Protected: 0

⚠️  CRITICAL SECURITY VULNERABILITIES CONFIRMED ⚠️

Vulnerable Endpoints:
  ❌ [CRITICAL] Hierarchy CSV Upload Cross-Organization Attack
  ❌ [HIGH] Organization Details Access (Path Parameter)
  ❌ [HIGH] Organization Update (Path Parameter)
  ❌ [MEDIUM] User Data Access (Cross-Organization)
  ❌ [CRITICAL] Hierarchy Creation (Body Parameter)
```

### If Fixed (Target State)

```
Total Tests: 5
Vulnerable: 0
Protected: 5

✅ No vulnerabilities detected - System appears to be protected
```

## 📄 Output Files

After running the test, you'll get:

1. **Console output** - Colored, human-readable results
2. **JSON report** - `tenancy-vulnerability-test-{timestamp}.json`

Example JSON report:

```json
{
  "timestamp": "2025-12-24T10:30:00.000Z",
  "environment": "staging",
  "url": "https://feedbackflow-backend-staging.onrender.com",
  "vulnerability": "Improper Tenancy Validation in requireOrgScopedAdmin",
  "summary": {
    "totalTests": 5,
    "vulnerable": 5,
    "protected": 0
  },
  "results": [...]
}
```

## 🔒 Security Impact

**Severity:** HIGH (CVSS 8.1)

### What an attacker can do:

- ✅ **Read** sensitive data from other organizations (PII breach)
- ✅ **Modify** settings and configurations of other organizations
- ✅ **Create** hierarchy relationships in other organizations
- ✅ **Access** user lists across organizational boundaries

### Compliance Impact:

- ❌ GDPR Article 32 violation (data security)
- ❌ SOC 2 Type II failure (logical access controls)
- ❌ ISO 27001 non-compliance (access control)

## 🛠️ Root Cause

The `requireOrgScopedAdmin` middleware only validates `req.query.organizationId`:

```typescript
// ❌ Only checks query string
const requestedOrgId = req.query.organizationId;
if (requestedOrgId && requestedOrgId !== adminOrgId) {
  return res.status(403).json({ error: 'Access denied' });
}
```

But endpoints use organization IDs from:
- ❌ `req.body.organizationId`
- ❌ `req.params.id` 
- ❌ CSV file content

These are **not validated**, allowing cross-organization access!

## 💡 Recommended Fix

Add validation helper to middleware:

```typescript
req.validateOrgAccess = (targetOrgId: string) => {
  if (!req.isSuperAdmin && targetOrgId !== req.effectiveOrganizationId) {
    throw new ForbiddenError('Organization access denied');
  }
};
```

Then call in all controllers:

```typescript
// Before processing any request
orgScopedReq.validateOrgAccess(req.params.id);
orgScopedReq.validateOrgAccess(req.body.organizationId);
orgScopedReq.validateOrgAccess(csvOrgId);
```

## 📚 More Information

- **Full Report:** [`TENANCY_VULNERABILITY_REPORT.md`](TENANCY_VULNERABILITY_REPORT.md)
- **Architecture:** [`ARCHITECTURE.md`](ARCHITECTURE.md)
- **Security Guide:** [`SECURITY_TESTING_GUIDE.md`](SECURITY_TESTING_GUIDE.md)

## 🐛 Troubleshooting

### "Authentication token expired"

Get a fresh token:
1. Logout from staging
2. Login again
3. Extract new token from cookies

### "Organization not found"

Make sure:
- Organization ID is a valid UUID
- Organization exists in the database
- Name and slug match exactly (case-sensitive)

### "Health check failed"

Check if staging backend is running:

```bash
curl https://feedbackflow-backend-staging.onrender.com/api/v1/health
```

### "fetch is not available"

Upgrade to Node.js 18+ or install node-fetch:

```bash
npm install node-fetch
```

## ⚡ Node.js Compatibility

- **Recommended:** Node.js 18+ (has native `fetch`)
- **Minimum:** Node.js 14+ (requires `node-fetch` package)

## 🎓 Learning Resources

This vulnerability demonstrates:
- **CWE-639:** Authorization Bypass Through User-Controlled Key
- **OWASP A01:2021:** Broken Access Control
- **Multi-tenancy:** Security boundary enforcement failures

## 📞 Support

Questions? Check:
1. This README
2. [`TENANCY_VULNERABILITY_REPORT.md`](TENANCY_VULNERABILITY_REPORT.md) - Detailed technical analysis
3. [`AGENTS.md`](AGENTS.md) - Project structure and conventions

---

**Created:** December 24, 2025  
**Status:** Ready for testing  
**Environment:** Staging (https://feedbackflow-backend-staging.onrender.com)





