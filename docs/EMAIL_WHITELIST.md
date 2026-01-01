# Email Whitelist Feature

## Overview

The Email Whitelist feature restricts access to the FeedbackFlow application based on authenticated user email addresses. This works in conjunction with IP whitelisting to provide multi-layered security.

**Key Features:**
- Individual email whitelisting
- Domain wildcard matching (@company.com)
- Domain-first hierarchy for performance
- Case-insensitive matching
- Comprehensive logging and monitoring

## Use Cases

- Restrict access to specific company domain (e.g., @wix.com)
- Allow specific external contractors/partners
- Multi-tenant security (different domains per environment)
- Compliance requirements for user access control
- Additional security layer beyond authentication

---

## Configuration

### Environment Variables

```bash
# Individual emails (specific users)
EMAIL_WHITELIST="user1@company.com,user2@external.com,contractor@freelance.com"

# Domain wildcards (entire organizations)
EMAIL_DOMAIN_WHITELIST="@wix.com,@partner.com,@company.com"

# Both can be used together (recommended)
```

### Supported Formats

1. **Individual Emails**: `user@company.com`
2. **Domain Wildcards**: `@company.com` (matches any email from domain)
3. **Multiple Entries**: Comma-separated list
4. **Case-Insensitive**: `User@COMPANY.com` = `user@company.com`

### Behavior

- **If NEITHER is set**: All authenticated users allowed (feature disabled)
- **If BOTH are empty after parsing**: Feature disabled with warning
- **If EITHER contains entries**: Whitelist is enforced

---

## Hierarchy (Priority Order)

The middleware checks in this order for optimal performance:

```
1. Domain Whitelist Check (@wix.com, @partner.com)
   ↓ Found → ✅ ALLOW (fast path for organizations)
   ↓ Not found
   
2. Individual Email Check (user1@external.com)
   ↓ Found → ✅ ALLOW
   ↓ Not found
   
3. ❌ BLOCK (403 Forbidden)
```

### Why Domain First?

- **Performance**: Domain extraction is fast, matches entire organizations quickly
- **Scalability**: No need to add every employee individually
- **Common Use Case**: Most deployments allow entire company domains

---

## Setup Instructions

### Local Development

Add to `backend/.env`:

```bash
# Allow localhost testing
EMAIL_DOMAIN_WHITELIST="@company.com"
EMAIL_WHITELIST="your.personal@email.com"
```

### Render.com Deployment

#### Option 1: Via Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select service:
   - **Production Backend**: `srv-d4o1nu2li9vc73c6ipe0`
   - **Staging Backend**: `srv-d4vr77i4d50c73871ps0`
3. Navigate to **Environment** tab
4. Click **Add Environment Variable**
5. Add:
   - **Key**: `EMAIL_DOMAIN_WHITELIST`
   - **Value**: `@wix.com,@partner.com`
6. Add (optional):
   - **Key**: `EMAIL_WHITELIST`
   - **Value**: `contractor@external.com,partner@company.com`
7. Click **Save Changes**
8. Service will auto-redeploy (~2-3 minutes)

#### Option 2: Via Render MCP (Agent Mode)

```typescript
// Production Backend
mcp_render_update_environment_variables({
  serviceId: "srv-d4o1nu2li9vc73c6ipe0",
  envVars: [
    {
      key: "EMAIL_DOMAIN_WHITELIST",
      value: "@wix.com,@partner.com"
    },
    {
      key: "EMAIL_WHITELIST",
      value: "contractor@external.com,partner@company.com"
    }
  ],
  replace: false
})
```

---

## Configuration Examples

### Example 1: Company Domain Only

```bash
# All @wix.com employees can access
EMAIL_DOMAIN_WHITELIST="@wix.com"
```

**Result:**
- ✅ `employee@wix.com` → Allowed
- ✅ `manager@wix.com` → Allowed
- ❌ `contractor@external.com` → Blocked

### Example 2: Company + External Contractors

```bash
# Wix employees + specific external users
EMAIL_DOMAIN_WHITELIST="@wix.com"
EMAIL_WHITELIST="contractor1@external.com,contractor2@freelance.com,partner@company.com"
```

**Result:**
- ✅ Any `*@wix.com` → Allowed (domain match)
- ✅ `contractor1@external.com` → Allowed (in EMAIL_WHITELIST)
- ✅ `contractor2@freelance.com` → Allowed (in EMAIL_WHITELIST)
- ✅ `partner@company.com` → Allowed (in EMAIL_WHITELIST)
- ❌ `random@gmail.com` → Blocked

### Example 3: Multiple Partner Companies

```bash
# Multiple organizations
EMAIL_DOMAIN_WHITELIST="@wix.com,@partner1.com,@partner2.com,@client.com"
```

**Result:**
- ✅ All users from Wix, Partner1, Partner2, Client → Allowed
- ❌ Everyone else → Blocked

### Example 4: Small Team (No Domain)

```bash
# Specific users only
EMAIL_WHITELIST="alice@wix.com,bob@wix.com,charlie@external.com"
```

**Result:**
- ✅ Only these 3 emails → Allowed
- ❌ Even other `@wix.com` users → Blocked (domain not whitelisted)

### Example 5: Development vs Production

```bash
# Development - allow dev team
EMAIL_WHITELIST="dev1@company.com,dev2@company.com,dev3@company.com"

# Staging - company domain + test users
EMAIL_DOMAIN_WHITELIST="@company.com"
EMAIL_WHITELIST="tester@external.com"

# Production - company domain only
EMAIL_DOMAIN_WHITELIST="@wix.com"
```

---

## How It Works

### Middleware Flow

```
User Request → IP Whitelist → Authentication (OAuth) → Email Whitelist → RBAC → Route Handler
                 ↓                   ↓                      ↓
            Network Layer      Identity Layer        Authorization Layer
```

### Integration Points

1. **After Authentication**: Requires `req.user.email` from `authenticateToken`
2. **Before RBAC**: Checks email before role-based access control
3. **Applied to /api/v1/***: All API routes except health endpoints

### Exempted Endpoints

These endpoints **bypass** email whitelist:
- `/api/v1/health` - Health check
- `/api/v1/csrf-token` - CSRF token generation
- `/api/v1/maintenance-status` - Maintenance mode status

---

## Response Format

### Allowed Request

```
User logs in → Email checked → ✅ Allowed → API response
Log: "✅ Email user@wix.com allowed (domain @wix.com whitelisted)"
```

### Blocked Request

```json
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": "Forbidden",
  "message": "Access denied: Your email is not authorized to access this system. Please contact your administrator.",
  "code": "EMAIL_NOT_WHITELISTED",
  "email": "blocked@external.com",
  "timestamp": "2026-01-01T10:00:00.000Z"
}
```

**Logs:**
```
🚫 Email blocked@external.com blocked - not in whitelist
   Path: GET /api/v1/feedback
   User ID: user-123-abc
   Timestamp: 2026-01-01T10:00:00.000Z
```

---

## Testing

### Run Tests

```bash
cd backend
npm test -- email-whitelist.middleware.test.ts
```

**Coverage**: 35 tests covering:
- Single email whitelisting (3 tests)
- Multiple email whitelisting (2 tests)
- Domain whitelisting (4 tests)
- Combined domain + email (4 tests)
- Case insensitivity (2 tests)
- Edge cases (5 tests)
- Environment variable parsing (10 tests)
- Error response format (2 tests)
- Logging (3 tests)

### Manual Testing

#### Test as Whitelisted User

```bash
# 1. Login with whitelisted email
# 2. Try accessing API
curl -H "Cookie: token=YOUR_JWT" \
  https://feedbackflow-backend.onrender.com/api/v1/feedback

# Expected: 200 OK with data
```

#### Test as Non-Whitelisted User

```bash
# 1. Login with non-whitelisted email
# 2. Try accessing API
curl -H "Cookie: token=YOUR_JWT" \
  https://feedbackflow-backend.onrender.com/api/v1/feedback

# Expected: 403 Forbidden
{
  "error": "Forbidden",
  "message": "Access denied: Your email is not authorized...",
  "code": "EMAIL_NOT_WHITELISTED",
  "email": "your-email@domain.com"
}
```

---

## Monitoring

### Log Messages

#### Initialization

```
🔒 Initializing Email Whitelist:
   - 2 domain(s)
   - 3 specific email(s)
🔒 Email Whitelist enabled:
   📧 Domains: 2 entries
      - @wix.com
      - @partner.com
   📧 Specific emails: 3 entries
      - contractor1@external.com
      - contractor2@freelance.com
      - partner@company.com
```

#### Allowed Requests

```
✅ Email user@wix.com allowed (domain @wix.com whitelisted)
✅ Email contractor1@external.com allowed (in EMAIL_WHITELIST)
```

#### Blocked Requests

```
🚫 Email blocked@gmail.com blocked - not in whitelist
   Path: GET /api/v1/feedback
   User ID: user-456-def
   Timestamp: 2026-01-01T10:15:30.000Z
```

### Render Dashboard Logs

1. Go to: https://dashboard.render.com/web/srv-d4o1nu2li9vc73c6ipe0
2. Click **Logs** tab
3. Search for:
   - `"Email Whitelist"` - Initialization
   - `"allowed"` - Successful access
   - `"blocked"` - Denied access

### Metrics to Monitor

- **Blocked attempts**: Sudden spike may indicate attack or misconfiguration
- **Legitimate user blocks**: Check if whitelist needs updating
- **Domain vs individual hits**: Optimize whitelist configuration

---

## Troubleshooting

### Issue: Can't Access Application

**Error**: 403 Forbidden with `EMAIL_NOT_WHITELISTED`

**Solutions:**
1. **Check your email**: What email did you login with?
   ```bash
   # In browser console
   document.cookie
   # Look for JWT token, decode at jwt.io
   ```

2. **Verify whitelist**:
   - Check `EMAIL_WHITELIST` contains your email
   - OR check your email domain is in `EMAIL_DOMAIN_WHITELIST`

3. **Check case sensitivity**: Should work, but verify
   - `User@Company.Com` should equal `user@company.com`

4. **Check Render env vars**:
   - Dashboard → Service → Environment
   - Verify variables are set correctly

### Issue: Everyone is Blocked

**Cause**: Empty whitelist or misconfiguration

**Check:**
```bash
# View Render logs for:
⚠️  Email Whitelist is empty - all emails will be blocked!
```

**Solution**: Add at least one email or domain to whitelist

### Issue: Domain Wildcard Not Working

**Symptoms**: `user@wix.com` blocked even though `@wix.com` in whitelist

**Check:**
1. **Format**: Must start with `@` (e.g., `@wix.com` not `wix.com`)
2. **Spacing**: `"@wix.com, @partner.com"` → Should trim automatically
3. **Deployment**: Service redeployed after env var change?

**Debug:**
```bash
# Check Render logs for initialization:
📧 Domains: 1 entries
   - @wix.com  # Should see this
```

### Issue: External Contractor Can't Access

**Solution**: Add to `EMAIL_WHITELIST`

```bash
EMAIL_WHITELIST="contractor@external.com"
# Or add via Render Dashboard → Environment → Add Variable
```

---

## Security Considerations

### What Email Whitelist Provides

- ✅ User-level access control
- ✅ Multi-tenant isolation (different emails per environment)
- ✅ Additional security layer beyond authentication
- ✅ Audit trail of access attempts
- ✅ Easy revocation (remove from whitelist)

### What Email Whitelist Does NOT Provide

- ⚠️ **Not network-level security** - Use IP whitelist for that
- ⚠️ **Not a replacement for authentication** - Users must still login
- ⚠️ **Not role-based access control** - Use RBAC for that
- ⚠️ **Not foolproof** - Email can be spoofed in some OAuth flows

### Best Practices

1. **Combine with IP whitelist** - Network + user level security
2. **Use domain wildcards for organizations** - Easier to manage
3. **Individual emails for external users** - Contractors, partners
4. **Document all entries** - Keep track of why each email/domain is allowed
5. **Regular audits** - Review whitelist quarterly
6. **Monitor logs** - Watch for false positives
7. **Test before production** - Always test on staging first

### Security Warnings

⚠️ **Email whitelisting alone is NOT sufficient security**

**Always use in combination with:**
- Strong authentication (Google OAuth, MFA)
- IP whitelisting (network layer)
- RBAC (role-based access control)
- Rate limiting
- Audit logging
- HTTPS/TLS

---

## Disabling Email Whitelist

### Quick Disable (Emergency)

#### Via Render Dashboard

1. Go to service → Environment tab
2. **Delete** both `EMAIL_WHITELIST` and `EMAIL_DOMAIN_WHITELIST` variables
3. Save (service will redeploy)
4. Takes ~2-3 minutes

#### Via Render MCP

```typescript
// Set both to empty strings to disable
mcp_render_update_environment_variables({
  serviceId: "srv-d4o1nu2li9vc73c6ipe0",
  envVars: [
    {key: "EMAIL_WHITELIST", value: ""},
    {key: "EMAIL_DOMAIN_WHITELIST", value: ""}
  ],
  replace: false
})
```

### Permanent Disable

Simply don't set the environment variables. Feature is disabled by default.

---

## Advanced Configuration

### Multiple Environments

```bash
# Development - team emails only
EMAIL_WHITELIST="dev1@company.com,dev2@company.com"

# Staging - company domain + testers
EMAIL_DOMAIN_WHITELIST="@company.com"
EMAIL_WHITELIST="tester@external.com,qa@external.com"

# Production - company domain only
EMAIL_DOMAIN_WHITELIST="@wix.com"
```

### Temporary Access

Grant temporary access to contractor:

```bash
# Add contractor
EMAIL_WHITELIST="...existing...,temp-contractor@external.com"

# Remove when project ends
EMAIL_WHITELIST="...existing..."  # Remove contractor email
```

### Multi-Tenant Setup

Different configurations per environment:

```bash
# Tenant A (Production)
EMAIL_DOMAIN_WHITELIST="@tenant-a.com"

# Tenant B (Production)
EMAIL_DOMAIN_WHITELIST="@tenant-b.com"
```

---

## Combined with IP Whitelist

Both IP and Email whitelists work together:

### Scenario 1: Both Pass

```
IP: 185.111.189.248 (whitelisted) ✅
Email: user@wix.com (whitelisted) ✅
→ Access GRANTED
```

### Scenario 2: IP Fails

```
IP: 8.8.8.8 (NOT whitelisted) ❌
→ Blocked at network layer (never reaches email check)
→ 403 Forbidden (IP_NOT_WHITELISTED)
```

### Scenario 3: IP Pass, Email Fails

```
IP: 185.111.189.248 (whitelisted) ✅
Email: hacker@evil.com (NOT whitelisted) ❌
→ Passes IP check, blocked at email check
→ 403 Forbidden (EMAIL_NOT_WHITELISTED)
```

### Recommended Configuration

```bash
# Network layer - Office/VPN IPs
IP_WHITELIST="185.111.189.248,185.111.189.249,65.38.108.224/27"

# User layer - Company domain
EMAIL_DOMAIN_WHITELIST="@wix.com"

# Specific external users
EMAIL_WHITELIST="partner@company.com,contractor@external.com"
```

**Result**: Multi-layered security with both network and user verification

---

## Performance Impact

- **Negligible**: Simple email string comparison
- **~1-2ms per request**: Domain extraction + lookup
- **No database queries**: All in-memory checks
- **No external API calls**: Pure logic
- **Optimized hierarchy**: Domain check first (fast path for organizations)

---

## Related Documentation

- **IP Whitelist**: `docs/IP_WHITELIST.md`
- **Security Guide**: `docs/SECURITY.md`
- **Deployment Guide**: `../DEPLOYMENT_GUIDE.md`
- **AGENTS.md**: `../AGENTS.md`

---

## FAQ

### Q: Can I use subdomains?

**A**: Yes! `@company.com` matches `user@subdomain.company.com`

Actually, no - current implementation extracts exact domain. If you need subdomain matching, let us know.

### Q: What happens to existing logged-in users?

**A**: Their next API request will be checked. If email not whitelisted, they'll get 403 Forbidden.

### Q: Can I whitelist by email pattern (regex)?

**A**: Not currently. Only exact email or domain wildcard. This keeps it simple and performant.

### Q: Does case matter?

**A**: No. `User@Company.COM` = `user@company.com`. All matching is case-insensitive.

### Q: Can I see who tried to access?

**A**: Yes! Check Render logs for blocked attempts with email, user ID, and timestamp.

### Q: How do I add a new user quickly?

**A**: Add their email to `EMAIL_WHITELIST` via Render Dashboard → Environment → Edit. Service redeploys automatically (~2 minutes).

### Q: What if user changes their email?

**A**: They'll need to:
1. Login with new email
2. Get added to whitelist with new email
3. Old email can be removed from whitelist

---

## Testing Checklist

Before deploying to production:

- [ ] Test with whitelisted email (should allow)
- [ ] Test with non-whitelisted email (should block)
- [ ] Test domain wildcard matching
- [ ] Test individual email matching
- [ ] Test combined domain + individual
- [ ] Test case insensitivity
- [ ] Verify logs show correct emails
- [ ] Test emergency disable procedure
- [ ] Document all whitelisted emails/domains
- [ ] Inform users before enabling

---

**Last Updated**: 2026-01-01  
**Version**: 1.0.0  
**Feature Status**: ✅ Production Ready  
**Test Coverage**: 35 tests, all passing

