# Maintenance Mode Feature

## Overview

The maintenance mode feature allows you to temporarily take down the application for updates, security fixes, or other maintenance tasks while still allowing users to login. When enabled, authenticated users will see a professional maintenance page instead of the normal application interface.

## Features

✅ **Users can still login** - Authentication endpoints remain accessible  
✅ **Graceful degradation** - Shows professional maintenance UI  
✅ **Environment-controlled** - Enable/disable via environment variables  
✅ **No code changes needed** - Toggle via deployment configuration  
✅ **Real-time checking** - Frontend checks status every 30 seconds  
✅ **Dual control** - Enable on frontend, backend, or both  

## Architecture

### Backend
- **Middleware**: `backend/src/shared/middleware/maintenance.middleware.ts`
  - Blocks all API calls except auth, health, and maintenance-status
  - Returns 503 status with maintenance message
  
- **API Endpoint**: `GET /api/v1/maintenance-status`
  - Returns current maintenance mode status
  - Used by frontend to check status

### Frontend
- **Page**: `frontend/src/pages/MaintenancePage.tsx`
  - Beautiful, professional maintenance UI
  - Logout option for users
  
- **Hook**: `frontend/src/hooks/useMaintenanceMode.ts`
  - Checks maintenance status on mount and every 30 seconds
  - Checks both frontend and backend status
  
- **Route Guard**: `frontend/src/components/auth/ProtectedRoute.tsx`
  - Redirects authenticated users to /maintenance when mode is active

## Environment Variables

### Backend
```bash
MAINTENANCE_MODE=false  # Set to 'true' to enable maintenance mode
```

### Frontend
```bash
VITE_MAINTENANCE_MODE=false  # Set to 'true' to enable maintenance mode
```

## Deployment Strategies

### Strategy 1: Backend Only (Recommended)
**Use case**: Fixing backend issues, database migrations, API updates

1. Set `MAINTENANCE_MODE=true` in backend environment
2. Deploy/restart backend
3. Frontend automatically detects maintenance via API
4. Users see maintenance page within 30 seconds

**Pros**: 
- No frontend redeployment needed
- Faster to enable/disable
- Good for backend-only issues

### Strategy 2: Frontend + Backend
**Use case**: Full system maintenance, security updates affecting both

1. Set `MAINTENANCE_MODE=true` in backend
2. Set `VITE_MAINTENANCE_MODE=true` in frontend
3. Deploy both services
4. Users see maintenance page immediately

**Pros**:
- Immediate effect
- Clear to users that system is down
- Best for planned maintenance windows

### Strategy 3: Frontend Only
**Use case**: Frontend-only updates (rare)

1. Set `VITE_MAINTENANCE_MODE=true` in frontend
2. Deploy frontend
3. Backend remains operational

**Pros**:
- Backend APIs remain accessible for testing
- Can test backend without frontend interference

## How to Enable Maintenance Mode

### On Render (Production/Staging)

#### Option A: Via Dashboard
1. Go to Render Dashboard → Your Service
2. Navigate to "Environment" tab
3. Add/Edit environment variable:
   - **Backend**: `MAINTENANCE_MODE` = `true`
   - **Frontend**: `VITE_MAINTENANCE_MODE` = `true`
4. Click "Save Changes"
5. Service will automatically redeploy

#### Option B: Via render.yaml (Recommended for planned maintenance)
```yaml
services:
  - type: web
    name: feedbackflow-backend
    env: node
    envVars:
      - key: MAINTENANCE_MODE
        value: true  # Change to false to disable
        
  - type: web
    name: feedbackflow-frontend
    env: static
    buildCommand: npm run build
    envVars:
      - key: VITE_MAINTENANCE_MODE
        value: true  # Change to false to disable
```

Then deploy:
```bash
git add render.yaml
git commit -m "chore: enable maintenance mode"
git push origin main
```

### On AWS/Other Cloud Providers

1. Update environment variables in your deployment configuration
2. Restart/redeploy services
3. Verify maintenance page appears

### Locally (for testing)

```bash
# Terminal 1 - Backend with maintenance mode
cd backend
MAINTENANCE_MODE=true npm run dev

# Terminal 2 - Frontend with maintenance mode  
cd frontend
VITE_MAINTENANCE_MODE=true npm run dev

# Visit http://localhost:3003
# Login, then you should see maintenance page
```

## How to Disable Maintenance Mode

### Quick Disable (Render)
1. Go to service environment variables
2. Set `MAINTENANCE_MODE=false` (backend)
3. Set `VITE_MAINTENANCE_MODE=false` (frontend)
4. Save and redeploy

### Via Code
```bash
# Update render.yaml or .env files
MAINTENANCE_MODE=false
VITE_MAINTENANCE_MODE=false

# Commit and push
git add .
git commit -m "chore: disable maintenance mode"
git push origin main
```

## Testing

### Unit Tests
```bash
# Run maintenance middleware tests
cd backend
npm test -- maintenance.middleware.test.ts
```

Expected output:
```
PASS tests/unit/middleware/maintenance.middleware.test.ts
  Maintenance Middleware
    when maintenance mode is disabled
      ✓ should allow requests to pass through
      ✓ should allow requests to all endpoints
    when maintenance mode is enabled
      ✓ should block non-allowed endpoints with 503 status
      ✓ should allow auth endpoints
      ✓ should allow health check endpoint
      ✓ should allow maintenance status endpoint
      ✓ should block protected endpoints
```

### Manual Testing

#### Test 1: Enable Maintenance Mode
```bash
# 1. Start backend with maintenance mode
cd backend
MAINTENANCE_MODE=true npm run dev

# 2. Start frontend
cd frontend
npm run dev

# 3. Test:
# - Visit http://localhost:3003
# - Login with test user
# - Should see maintenance page
# - Try clicking around - should stay on maintenance page
# - Logout should work
```

#### Test 2: Disable Maintenance Mode
```bash
# 1. Start backend without maintenance mode
cd backend
npm run dev  # or MAINTENANCE_MODE=false npm run dev

# 2. Start frontend
cd frontend
npm run dev

# 3. Test:
# - Visit http://localhost:3003
# - Login
# - Should see normal dashboard
# - All features should work normally
```

#### Test 3: API Behavior During Maintenance
```bash
# With maintenance mode enabled:

# ✅ Auth should work
curl http://localhost:5000/api/v1/auth/login/mock \
  -H "Content-Type: application/json" \
  -d '{"email":"test@wix.com","password":"password"}'

# ✅ Health check should work
curl http://localhost:5000/api/v1/health

# ✅ Maintenance status should work
curl http://localhost:5000/api/v1/maintenance-status

# ❌ Protected endpoints should return 503
curl http://localhost:5000/api/v1/feedback \
  -H "Authorization: Bearer <token>"
# Expected: 503 Service Unavailable

curl http://localhost:5000/api/v1/cycles \
  -H "Authorization: Bearer <token>"
# Expected: 503 Service Unavailable
```

## Monitoring

### Check if Maintenance Mode is Active

**Frontend**:
- Visit `/maintenance-status` endpoint
- Check browser console for `[MaintenanceMode]` logs

**Backend**:
- Check environment variable: `echo $MAINTENANCE_MODE`
- Call API: `curl https://your-api.com/api/v1/maintenance-status`

### Logs to Watch

**Frontend Console**:
```
[MaintenanceMode] Frontend env var enabled
[MaintenanceMode] Backend status: true
```

**Backend Logs**:
No special logs - middleware silently blocks requests

## Troubleshooting

### Issue: Users still see normal app after enabling maintenance mode

**Cause**: Environment variable not set or not redeployed

**Solution**:
1. Check environment variable is set correctly (true not "true" in some systems)
2. Verify service restarted after env var change
3. Check browser console for maintenance mode logs
4. Clear browser cache and hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

### Issue: Users can't login during maintenance mode

**Cause**: Middleware might be blocking auth endpoints

**Solution**:
1. Check middleware allows `/api/v1/auth` paths
2. Verify middleware is applied after auth routes are defined
3. Check backend logs for errors

### Issue: Maintenance page shows briefly then disappears

**Cause**: Frontend env var set but backend not in maintenance

**Solution**:
1. Ensure backend also has `MAINTENANCE_MODE=true`
2. Check `/maintenance-status` endpoint response
3. Verify both services are in sync

### Issue: Can't disable maintenance mode

**Cause**: Environment variables stuck or cached

**Solution**:
1. Set env vars to `false` (not empty string)
2. Restart/redeploy services
3. Clear any CDN/proxy caches
4. Hard refresh browsers

## Best Practices

### Before Maintenance
1. ✅ Announce maintenance window to users (email, in-app notification)
2. ✅ Test maintenance mode in staging first
3. ✅ Have rollback plan ready
4. ✅ Coordinate with team on timing
5. ✅ Monitor error tracking (Sentry, etc.)

### During Maintenance
1. ✅ Verify maintenance page is showing
2. ✅ Test that login still works
3. ✅ Monitor for any critical errors
4. ✅ Keep stakeholders updated on progress
5. ✅ Document what you're doing

### After Maintenance
1. ✅ Disable maintenance mode
2. ✅ Verify all features working
3. ✅ Monitor for any issues
4. ✅ Notify users that system is back
5. ✅ Document what was done

## Security Considerations

✅ **Authentication required** - Maintenance page only shown to authenticated users  
✅ **No data exposure** - Maintenance page doesn't reveal system internals  
✅ **Auth endpoints protected** - Login still uses rate limiting and CSRF protection  
✅ **Graceful errors** - 503 responses don't leak sensitive information  

## Customization

### Change Maintenance Message

Edit `frontend/src/pages/MaintenancePage.tsx`:
```tsx
<p className="text-lg text-gray-600 text-center mb-8">
  Your custom message here
</p>
```

### Change Estimated Duration

Edit `backend/src/real-database-server.ts`:
```typescript
app.get('/api/v1/maintenance-status', (req, res) => {
  res.json({
    success: true,
    data: {
      maintenance: process.env.MAINTENANCE_MODE === 'true',
      message: 'Your custom message',
      estimatedDuration: '2-3 hours'  // Change this
    }
  });
});
```

### Add Custom Logic

You can extend the maintenance middleware to:
- Allow specific IP addresses
- Allow specific user roles (e.g., admins)
- Schedule automatic enable/disable
- Send notifications when maintenance starts

## Files Changed

### Backend
- `backend/src/shared/middleware/maintenance.middleware.ts` - New middleware
- `backend/src/real-database-server.ts` - Added endpoint and middleware application
- `backend/tests/unit/middleware/maintenance.middleware.test.ts` - Unit tests

### Frontend
- `frontend/src/pages/MaintenancePage.tsx` - New maintenance page
- `frontend/src/hooks/useMaintenanceMode.ts` - New hook for checking status
- `frontend/src/components/auth/ProtectedRoute.tsx` - Added maintenance redirect
- `frontend/src/router.tsx` - Added maintenance route

## Support

If you encounter issues with maintenance mode:
1. Check this documentation first
2. Review backend logs for errors
3. Check browser console for frontend errors
4. Test locally to reproduce
5. Contact DevOps team if deployme issues

---

**Last Updated**: 2024-12-31  
**Feature Version**: 1.0.0  
**Tested On**: Render (staging and production)

