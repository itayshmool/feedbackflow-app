# Cookie Investigation Findings

**Date:** 2025-11-23  
**Issue:** Authentication cookie not updating when switching users  
**Status:** ✅ ROOT CAUSE IDENTIFIED

---

## Executive Summary

The authentication cookie persistence issue **is NOT a backend cookie problem**. The backend correctly sets and overwrites cookies. The issue is that the **frontend React state doesn't update** after a programmatic login via fetch API.

---

## Investigation Steps

### 1. Added Debug Logging

Added comprehensive logging to track cookie operations:

- **`cookie-helper.ts`**: Logs hostname, domain, and path for every cookie operation
- **`real-database-server.ts` (login)**: Logs cookie options when setting authentication cookie
- **`real-database-server.ts` (logout)**: Logs cookie options when clearing authentication cookie  
- **`auth.middleware.ts`**: Logs received token, hostname, and host on every authenticated request

### 2. Test Scenario

1. **Login as itays@wix.com** via fetch API
2. **Login as amitsa@wix.com** via fetch API (without explicit logout)
3. Check what user is authenticated in backend vs frontend

### 3. Findings

#### Backend Behavior (✅ CORRECT)

**Login 1 (itays@wix.com):**
```
🍪 Cookie options: { hostname: 'localhost', domain: undefined, path: '/' }
🔐 LOGIN: Setting cookie for itays@wix.com with options: {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  maxAge: 86400000,
  path: '/',
  domain: undefined
}
```

**Login 2 (amitsa@wix.com):**
```
🍪 Cookie options: { hostname: 'localhost', domain: undefined, path: '/' }
🔐 LOGIN: Setting cookie for amitsa@wix.com with options: {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  maxAge: 86400000,
  path: '/',
  domain: undefined
}
```

**Auth Middleware Check:**
```
🔍 Auth middleware - received token: mock-jwt-token-amitsa@wix.com-1763889559705...
🔍 Auth middleware - mock token authenticated: amitsa@wix.com
```

✅ **Backend is receiving the CORRECT token (amitsa@wix.com)**

#### Frontend Behavior (❌ INCORRECT)

- After login API call returns `amitsa@wix.com`, UI still shows **"Itay Sivan"**
- After **page refresh**, UI correctly shows **"Amit Sagiv"**

❌ **Frontend state not updating after programmatic login**

---

## Root Cause

The issue is in the **frontend login flow**, NOT the backend cookie handling:

1. Frontend calls `/api/v1/auth/login/mock` via fetch API
2. Backend successfully sets new cookie
3. **Frontend doesn't call `checkAuth()` or update Zustand state**
4. React components continue displaying old user data from stale state
5. On page refresh, `App.tsx` calls `checkAuth()` which fetches `/api/v1/auth/me`
6. Auth middleware reads the CORRECT cookie
7. Frontend state updates with correct user

---

## Cookie Configuration (✅ VERIFIED CORRECT)

All cookie operations use **identical settings**:

| Property | Value | Notes |
|----------|-------|-------|
| `httpOnly` | `true` | Prevents XSS attacks |
| `secure` | `false` (dev) | HTTPS-only in production |
| `sameSite` | `'lax'` | Allows same-site navigation |
| `maxAge` | `86400000` | 24 hours |
| `path` | `'/'` | **Explicitly set** for all operations |
| `domain` | `undefined` | Defaults to current domain (localhost) |

**No domain/path mismatch exists.**

---

## Solution

The fix should be implemented in the **frontend**, not backend:

### Option 1: Update Login Flow (Recommended)

Modify the login service/component to update Zustand state after successful login:

```typescript
// In frontend/src/services/auth.service.ts or login component
async function login(email: string, password: string) {
  const response = await api.post('/auth/login/mock', { email, password });
  
  // ✅ ADD THIS: Update Zustand state after successful login
  if (response.success) {
    await useAuthStore.getState().checkAuth();  // Fetch updated user data
  }
  
  return response;
}
```

### Option 2: Automatic State Refresh

Add API response interceptor to detect cookie changes and auto-refresh auth state:

```typescript
// In frontend/src/lib/api.ts
api.interceptors.response.use((response) => {
  // If response sets new auth cookie, refresh auth state
  if (response.config.url?.includes('/auth/login')) {
    useAuthStore.getState().checkAuth();
  }
  return response;
});
```

### Option 3: Event-Based State Update

Use browser storage events or custom events to notify state changes:

```typescript
// After successful login
window.dispatchEvent(new CustomEvent('auth-changed'));

// In App.tsx or auth store
window.addEventListener('auth-changed', () => {
  checkAuth();
});
```

---

## Files Modified (Debug Logging)

1. **`backend/src/shared/utils/cookie-helper.ts`** - Added debug logging for cookie options
2. **`backend/src/real-database-server.ts`** - Added login/logout debug logging
3. **`backend/src/shared/middleware/auth.middleware.ts`** - Added token inspection logging

**Note:** These debug logs can be removed or converted to conditional debug mode after fix is implemented.

---

## Test Verification

### Successful Backend Test
```bash
# 1. Login as User A
curl -c cookies.txt -X POST http://localhost:5000/api/v1/auth/login/mock \
  -H "Content-Type: application/json" \
  -d '{"email":"itays@wix.com","password":"password"}'

# 2. Login as User B (overwrites cookie)
curl -b cookies.txt -c cookies.txt -X POST http://localhost:5000/api/v1/auth/login/mock \
  -H "Content-Type: application/json" \
  -d '{"email":"amitsa@wix.com","password":"password"}'

# 3. Check auth (should return User B)
curl -b cookies.txt http://localhost:5000/api/v1/auth/me
# ✅ Returns: amitsa@wix.com
```

### Failed Frontend Test (Before Fix)
```javascript
// Login as User A
await fetch('/api/v1/auth/login/mock', {..., body: {email: 'itays@wix.com'}});
// UI shows: Itay Sivan ✅

// Login as User B
await fetch('/api/v1/auth/login/mock', {..., body: {email: 'amitsa@wix.com'}});
// UI shows: Itay Sivan ❌ (should show Amit Sagiv)

// Refresh page
window.location.reload();
// UI shows: Amit Sagiv ✅ (now correct)
```

---

## Next Steps

1. ✅ **Confirmed:** Cookie domain/path configuration is correct
2. ✅ **Confirmed:** Backend properly overwrites cookies
3. ✅ **Confirmed:** Auth middleware reads correct cookie
4. ❌ **TODO:** Fix frontend login flow to update React state
5. ❌ **TODO:** Remove debug logging or make conditional
6. ❌ **TODO:** Add E2E test for user switching

---

## Conclusion

**The authentication system is working correctly at the backend level.** The perceived "cookie persistence" issue is actually a **frontend state management bug** where React components don't re-fetch user data after a programmatic login.

**Recommended Fix:** Update the login flow to call `checkAuth()` after successful login to synchronize backend cookie state with frontend React state.

