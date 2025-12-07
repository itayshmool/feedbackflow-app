# Security Review - FeedbackFlow

## TL;DR (Executive Summary)
- **CRITICAL**: Mock token authentication bypass allows impersonation of any user (production code contains debug auth path)
- **HIGH**: Hardcoded JWT secret fallback `'changeme'` could be used in production if env var not set
- **MEDIUM**: SSL certificate validation disabled for PostgreSQL in production; hardcoded default DB credentials

**Confidence**: High - all findings validated against source code with exact locations.

---

## Findings Table

| Severity | Title | Evidence (URL#Lx–Ly) | Impact | Fix |
|----------|-------|----------------------|--------|-----|
| **CRITICAL** | Mock Token Auth Bypass | [auth.middleware.ts#L57-L87](https://github.com/itayshmool/feedbackflow-app/blob/main/backend/src/shared/middleware/auth.middleware.ts#L57-L87) | Anyone can forge `mock-jwt-token-email@domain.com-timestamp` to authenticate as any user | Remove mock token handling or gate behind `NODE_ENV !== 'production'` |
| **HIGH** | Hardcoded JWT Secret | [app.ts#L94](https://github.com/itayshmool/feedbackflow-app/blob/main/backend/src/app.ts#L94), [auth.middleware.ts#L5](https://github.com/itayshmool/feedbackflow-app/blob/main/backend/src/shared/middleware/auth.middleware.ts#L5) | Fallback `'changeme'` secret allows token forgery if env var missing | Fail startup if `JWT_SECRET` not set; never use fallback |
| **MEDIUM** | SSL Cert Validation Disabled | [database.ts#L9](https://github.com/itayshmool/feedbackflow-app/blob/main/backend/src/config/database.ts#L9) | `rejectUnauthorized: false` in production enables MITM attacks on DB connection | Use proper CA cert or set `rejectUnauthorized: true` |
| **MEDIUM** | Hardcoded DB Credentials | [database.ts#L8](https://github.com/itayshmool/feedbackflow-app/blob/main/backend/src/config/database.ts#L8) | Default `feedbackflow_password` could be used if env vars missing | Require env vars; fail on missing credentials |
| **MEDIUM** | No JWT Algorithm Specified | [jwt.service.ts#L19](https://github.com/itayshmool/feedbackflow-app/blob/main/backend/src/modules/auth/services/jwt.service.ts#L19) | Default algorithm could be manipulated in certain attack scenarios | Explicitly set `algorithm: 'HS256'` in sign/verify options |
| **LOW** | In-Memory Rate Limiting | [rate-limit.middleware.ts#L11](https://github.com/itayshmool/feedbackflow-app/blob/main/backend/src/shared/middleware/rate-limit.middleware.ts#L11) | `Map()` storage doesn't persist across restarts or cluster nodes | Use Redis for distributed rate limiting |

---

## Key Code Evidence

### Mock Token Bypass (CRITICAL)
```typescript
// auth.middleware.ts:57-62
if (token.startsWith('mock-jwt-token-')) {
  const parts = token.split('-');
  if (parts.length >= 4) {
    const email = parts.slice(3, -1).join('-');
    // Authenticates user based solely on email in token string
```

### Hardcoded JWT Secret (HIGH)
```typescript
// app.ts:94
const jwtService = new JwtService(process.env.JWT_SECRET || 'changeme');
```

### SSL Disabled in Production (MEDIUM)
```typescript
// database.ts:9
ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
```

---

## Recommendations

1. **Immediate**: Remove or disable mock token auth in production
2. **Immediate**: Require `JWT_SECRET` env var (fail startup if missing)
3. **Short-term**: Enable SSL certificate validation for PostgreSQL
4. **Short-term**: Specify JWT algorithm explicitly
5. **Medium-term**: Implement Redis-backed rate limiting for production

---

Created by Octocode MCP  https://octocode.ai 🔍🐙

