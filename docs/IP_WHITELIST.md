# IP Whitelist Feature

## Overview

The IP Whitelist feature restricts access to the FeedbackFlow application based on client IP addresses. This is useful for:

- Restricting access to corporate VPN users only
- Limiting access to specific office locations
- Compliance requirements for data access control
- Additional security layer beyond authentication

## Configuration

### Environment Variable

```bash
IP_WHITELIST="1.2.3.4,5.6.7.8,192.168.1.0/24"
```

### Supported Formats

1. **Individual IP**: `203.0.113.50`
2. **Multiple IPs** (comma-separated): `203.0.113.50,198.51.100.25`
3. **CIDR Range**: `192.168.1.0/24` (allows 192.168.1.0 - 192.168.1.255)
4. **Mixed**: `203.0.113.50,192.168.0.0/16,10.0.0.0/8`

### Behavior

- **If `IP_WHITELIST` is NOT set**: All IPs are allowed (feature disabled)
- **If `IP_WHITELIST` is set but empty**: All IPs are blocked
- **If `IP_WHITELIST` contains IPs**: Only listed IPs/ranges are allowed

## Setup Instructions

### Local Development

Add to `backend/.env`:

```bash
IP_WHITELIST="127.0.0.1,::1,your.development.ip"
```

### Render.com Deployment

#### Option 1: Via Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your service (e.g., `feedbackflow-backend`)
3. Navigate to **Environment** tab
4. Click **Add Environment Variable**
5. Set:
   - **Key**: `IP_WHITELIST`
   - **Value**: `your.vpn.ip.1,your.vpn.ip.2`
6. Click **Save Changes**
7. Service will automatically redeploy

#### Option 2: Via Render MCP (in Agent mode)

```typescript
mcp_render_update_environment_variables({
  serviceId: "srv-d4o1nu2li9vc73c6ipe0", // production backend
  envVars: [
    {
      key: "IP_WHITELIST",
      value: "203.0.113.50,198.51.100.25,192.168.1.0/24"
    }
  ],
  replace: false
})
```

## Finding Your IP Address

### Via Command Line

```bash
# Your public IP
curl https://ifconfig.me

# Your local IP
ipconfig getifaddr en0  # macOS
ip addr show            # Linux
ipconfig                # Windows
```

### Via Web Browser

Visit: https://whatismyipaddress.com

### VPN Exit IP

If using a corporate VPN, contact your IT department for the VPN's exit IP addresses.

## Testing

### Test IP Whitelist Locally

```bash
cd backend
npm test -- ip-whitelist.middleware.test.ts
```

### Test on Render

1. **Set IP_WHITELIST** to a test IP (not your current IP)
2. **Try to access** your application
3. **Expected**: 403 Forbidden error
4. **Response**:

```json
{
  "error": "Forbidden",
  "message": "Access denied: Your IP address is not authorized to access this service",
  "code": "IP_NOT_WHITELISTED",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

## Common Use Cases

### 1. Office + VPN Access

```bash
# Office static IP + VPN range
IP_WHITELIST="203.0.113.50,192.168.1.0/24"
```

### 2. Multiple Office Locations

```bash
# New York + London + Tokyo offices
IP_WHITELIST="203.0.113.50,198.51.100.25,192.0.2.100"
```

### 3. Development + Staging + Production

```bash
# Development (local + dev IPs)
IP_WHITELIST="127.0.0.1,::1,10.0.0.0/8"

# Staging (office + test VPN)
IP_WHITELIST="203.0.113.50,192.168.1.0/24"

# Production (corporate VPN only)
IP_WHITELIST="198.51.100.25"
```

### 4. Home Office Workers with VPN

```bash
# VPN concentrator IP range
IP_WHITELIST="198.51.100.0/24"
```

## CIDR Notation Reference

| CIDR | Subnet Mask | Number of IPs | Example Use Case |
|------|-------------|---------------|------------------|
| /32 | 255.255.255.255 | 1 IP | Single server/workstation |
| /30 | 255.255.255.252 | 4 IPs | Point-to-point link |
| /29 | 255.255.255.248 | 8 IPs | Small office |
| /28 | 255.255.255.240 | 16 IPs | Small office |
| /27 | 255.255.255.224 | 32 IPs | Small office |
| /26 | 255.255.255.192 | 64 IPs | Department |
| /24 | 255.255.255.0 | 256 IPs | Standard office network |
| /23 | 255.255.254.0 | 512 IPs | Large office |
| /22 | 255.255.252.0 | 1,024 IPs | Multiple floors |
| /21 | 255.255.248.0 | 2,048 IPs | Campus |
| /20 | 255.255.240.0 | 4,096 IPs | Large campus |
| /16 | 255.255.0.0 | 65,536 IPs | Enterprise network |
| /8 | 255.0.0.0 | 16,777,216 IPs | Major ISP/cloud provider |

### CIDR Examples

```bash
# Allow all 192.168.1.x addresses (256 IPs)
IP_WHITELIST="192.168.1.0/24"

# Allow 10.0.x.x addresses (65,536 IPs)
IP_WHITELIST="10.0.0.0/16"

# Allow all 10.x.x.x addresses (16 million IPs - entire private Class A)
IP_WHITELIST="10.0.0.0/8"
```

## Troubleshooting

### Issue: Can't Access Application

**Error**: 403 Forbidden

**Solutions**:
1. Check your current IP: `curl https://ifconfig.me`
2. Verify IP is in whitelist
3. If using VPN, ensure you're connected
4. Check Render logs for blocked IP address

**Debugging Steps**:

```bash
# Step 1: Find your current IP
curl https://ifconfig.me
# Output: 203.0.113.50

# Step 2: Check if it's in your whitelist
# Compare against IP_WHITELIST environment variable in Render

# Step 3: Check Render logs
# Look for: "🚫 IP 203.0.113.50 blocked - not in whitelist"
```

### Issue: IP Changes Frequently

**Problem**: Dynamic IP addresses

**Solutions**:
1. Use CIDR range instead of specific IP
2. Set up static IP with ISP
3. Use VPN with static exit IP
4. Consider Cloudflare Access (better for dynamic IPs)

### Issue: Whitelist Not Working

**Check**:

1. **Verify Environment Variable is Set**:
   - Go to Render Dashboard → Service → Environment
   - Confirm `IP_WHITELIST` exists and has value

2. **Check Service Logs**:
   - Look for: `🔒 IP Whitelist enabled: X entries`
   - If missing, variable may not be set correctly

3. **Test with Known IP**:
   ```bash
   # Add your current IP to whitelist
   curl https://ifconfig.me  # Get your IP
   # Add that IP to IP_WHITELIST in Render
   # Wait for redeploy
   # Try accessing application
   ```

4. **Check for Typos**:
   - Ensure no spaces in CIDR notation: `192.168.1.0/24` ✅
   - Not: `192.168.1.0 / 24` ❌

### Issue: VPN Users Can't Access

**Problem**: VPN exit IP not whitelisted

**Solution**:
1. Ask IT for VPN exit IP range
2. Add entire range using CIDR notation
3. Example: If VPN uses `198.51.100.0` to `198.51.100.255`
   ```bash
   IP_WHITELIST="198.51.100.0/24"
   ```

### Issue: Some Users Can Access, Others Can't

**Problem**: Users on different networks

**Solution**:
1. Get IPs from all locations
2. Add all to whitelist:
   ```bash
   IP_WHITELIST="office1.ip,office2.ip,vpn.range/24,home.worker.ip"
   ```

## Security Considerations

### Pros
- ✅ Network-level access control
- ✅ Prevents unauthorized IP ranges
- ✅ Additional security layer
- ✅ Audit trail in logs
- ✅ Simple to configure
- ✅ No code changes needed (environment variable only)

### Cons
- ⚠️ IP spoofing possible (use with authentication)
- ⚠️ Dynamic IPs require maintenance
- ⚠️ VPN issues lock out users
- ⚠️ Not a replacement for authentication
- ⚠️ Proxy/CDN may complicate IP detection

### Best Practices

1. **Always combine with authentication** - IP whitelist is NOT a replacement for login
2. **Use CIDR ranges** for flexibility (e.g., `/24` for 256 IPs)
3. **Document IPs** - Keep track of what each IP represents
4. **Monitor logs** - Watch for legitimate users being blocked
5. **Test before production** - Always test on staging first
6. **Have a backup plan** - Know how to quickly disable if needed
7. **Regular audits** - Review whitelist quarterly
8. **Update on changes** - Remove old IPs when offices close or VPN changes

### Security Warning

⚠️ **IP whitelisting alone is NOT sufficient security**

IP addresses can be:
- Spoofed (though difficult)
- Shared (NAT, proxies)
- Recycled by ISPs
- Compromised (if attacker gains network access)

**Always use IP whitelisting in combination with:**
- Strong authentication (OAuth, MFA)
- Authorization (RBAC)
- Encryption (HTTPS)
- Rate limiting
- Audit logging

## Monitoring

### Log Messages

When IP whitelist is enabled, you'll see these log messages:

#### Initialization

```
🔒 Initializing IP Whitelist with 3 entries
🔒 IP Whitelist enabled: 3 entries
   - 203.0.113.50
   - 198.51.100.25
   - 192.168.1.0/24
✅ IP Whitelist protection enabled
```

#### Allowed Requests

```
✅ IP 203.0.113.50 allowed (whitelisted)
```

#### Blocked Requests

```
🚫 IP 8.8.8.8 blocked - not in whitelist
   Path: GET /api/v1/feedback
   User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)...
```

### Monitoring Best Practices

1. **Set up alerts** for blocked IPs (if many blocks, investigate)
2. **Review logs daily** for first week after enabling
3. **Track patterns** - which IPs are being blocked
4. **Check for false positives** - legitimate users blocked

### Render Dashboard Monitoring

1. Go to Render Dashboard → Your Service
2. Click **Logs** tab
3. Search for:
   - `"IP Whitelist"` - initialization
   - `"allowed"` - successful requests
   - `"blocked"` - denied requests

## Disabling IP Whitelist

### Quick Disable (Emergency)

If you need to quickly disable IP whitelisting (e.g., legitimate users locked out):

#### Via Render Dashboard

1. Go to service → Environment tab
2. **Delete** `IP_WHITELIST` variable (or set to empty string)
3. Save (service will redeploy automatically)
4. Takes ~2-3 minutes

#### Via Render MCP

```typescript
mcp_render_update_environment_variables({
  serviceId: "srv-d4o1nu2li9vc73c6ipe0",
  envVars: [
    {key: "IP_WHITELIST", value: ""}  // Empty value disables
  ],
  replace: false
})
```

### Permanent Disable

Simply don't set the `IP_WHITELIST` environment variable. The feature is disabled by default.

## Advanced Configuration

### Multiple Environments

Different IP restrictions for each environment:

```bash
# Development - local only
IP_WHITELIST="127.0.0.1,::1"

# Staging - office + test team
IP_WHITELIST="203.0.113.50,192.168.1.0/24,10.0.0.1"

# Production - corporate VPN only
IP_WHITELIST="198.51.100.0/24"
```

### Cloud Provider IP Ranges

If restricting to cloud providers (e.g., for API integrations):

```bash
# AWS us-east-1 (example - use actual ranges)
IP_WHITELIST="52.0.0.0/11,54.0.0.0/9"

# Google Cloud (example)
IP_WHITELIST="35.190.0.0/16,35.191.0.0/16"
```

**Note**: Cloud provider IP ranges change frequently. Use official IP range lists.

### Combining with Other Security Features

IP whitelist works alongside:

```bash
# Stack multiple security layers
IP_WHITELIST="corporate.vpn.range/24"  # Network layer
# + Google OAuth authentication          # Authentication layer
# + RBAC middleware                      # Authorization layer
# + Rate limiting                        # DoS protection
# + CSRF protection                      # CSRF attacks
```

## Testing Checklist

Before deploying IP whitelist to production:

- [ ] Test with whitelisted IP (should allow)
- [ ] Test with non-whitelisted IP (should block)
- [ ] Test CIDR ranges work correctly
- [ ] Test x-forwarded-for header detection (behind proxy)
- [ ] Test with IPv6-mapped IPv4 addresses
- [ ] Test multiple IPs in comma-separated list
- [ ] Verify logs show correct IP addresses
- [ ] Test emergency disable procedure
- [ ] Document all whitelisted IPs and their purpose
- [ ] Inform users before enabling
- [ ] Monitor logs for 24 hours after deployment

## Implementation Details

### Middleware Order

The IP whitelist middleware is applied **after CSRF protection** and **before all routes**:

```typescript
app.use(csrfProtection);           // 1. CSRF first
app.use(ipWhitelistMiddleware);    // 2. IP whitelist second
app.use('/api/v1/auth', authRoutes); // 3. Then routes
```

This means:
- Health checks (`/health`) are NOT protected
- All `/api/*` routes ARE protected
- Failed IP checks happen before authentication

### IP Detection Priority

The middleware checks headers in this order:

1. `x-forwarded-for` (first IP in chain)
2. `x-real-ip`
3. `socket.remoteAddress`
4. `req.ip`

This handles Render, Cloudflare, and other proxies correctly.

### Performance Impact

- **Negligible** - simple IP comparison
- **No database queries** - all in-memory
- **Adds ~1ms per request**
- **No external API calls**

## Related Documentation

- [Security Guide](./SECURITY.md)
- [Deployment Guide](../DEPLOYMENT_GUIDE.md)
- [Environment Variables Reference](../backend/.env.example)
- [AGENTS.md](../AGENTS.md) - AI agent guidelines

## FAQ

### Q: Can users bypass IP whitelist with a proxy?

**A**: Theoretically yes, if they can route through a whitelisted IP. This is why IP whitelisting should be combined with strong authentication.

### Q: What happens to existing logged-in users?

**A**: When you enable IP whitelist, their next request will be checked. If their IP isn't whitelisted, they'll be logged out (403 error).

### Q: Can I whitelist an entire country?

**A**: Not directly. You'd need to list all IP ranges for that country, which is impractical. Consider geolocation services instead.

### Q: Does this work with mobile apps?

**A**: Yes, but mobile IPs change frequently. CIDR ranges or VPN required.

### Q: Can I whitelist localhost?

**A**: Yes! Use `IP_WHITELIST="127.0.0.1,::1"` for local testing.

### Q: What if my VPN changes IPs?

**A**: Update `IP_WHITELIST` in Render environment variables and redeploy. Takes ~2-3 minutes.

### Q: Can I see which IP tried to access?

**A**: Yes! Check Render logs for blocked IP messages.

### Q: Does this protect against DDoS?

**A**: Partially. It reduces attack surface, but dedicated DDoS protection (Cloudflare, etc.) is still recommended.

---

## Support

If you encounter issues with IP whitelisting:

1. Check this documentation first
2. Review Render logs for error messages
3. Test with `curl` or Postman to isolate issues
4. Verify environment variable is set correctly
5. Contact your IT department for network-specific issues

**Last Updated**: 2025-01-01  
**Version**: 1.0.0  
**Feature Status**: ✅ Production Ready

