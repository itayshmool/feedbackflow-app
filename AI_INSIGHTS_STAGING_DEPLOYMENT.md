# AI Insights Toggle - Staging Deployment

## Deployment Summary

**Date**: 2024-12-25  
**Feature**: AI Insights Toggle (Environment Variable Control)  
**Branch Deployed**: `staging`  
**Commit**: `2d7fe46`

---

## 🚀 Deployment Status

### Git Operations: ✅ Complete

1. ✅ Merged `feature/ai-insights-toggle` → `main` (commit: 2d7fe46)
2. ✅ Pushed `main` to origin
3. ✅ Merged `main` → `staging` (fast-forward)
4. ✅ Pushed `staging` to origin

**Result**: Render will automatically deploy staging services from the `staging` branch.

---

## 🔧 Required Environment Variable Configuration

### ⚠️ IMPORTANT: Set Environment Variables in Render Dashboard

The new feature flag needs to be configured in Render for the frontend service.

### Staging Frontend Service

**Service Name**: `feedbackflow-frontend-staging`

**Navigate to**:
1. [Render Dashboard](https://dashboard.render.com)
2. Select `feedbackflow-frontend-staging` service
3. Go to "Environment" tab
4. Add the following variable:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `VITE_ENABLE_AI_INSIGHTS` | `true` | Enables AI Insights tab in Manager Dashboard |

**Optional (if not already set)**:
| Variable Name | Value | Description |
|--------------|-------|-------------|
| `VITE_ENABLE_AI_FEEDBACK` | `true` | Enables "Generate with AI" button in feedback form |

### After Adding Variables

1. Click "Save Changes"
2. Render will automatically trigger a **rebuild** (required for Vite env vars)
3. Wait for deployment to complete (~3-5 minutes)

---

## 🎯 Feature Behavior

### When `VITE_ENABLE_AI_INSIGHTS=true` (Recommended for Staging)

**Manager Dashboard**:
- Shows 3 tabs: Overview, **AI Insights**, Analytics
- AI Insights tab contains "Generate Insights" button
- Clicking button analyzes team feedback and displays insights
- Export options available (Download DOCX, Save to Google Drive)

**Requirements**:
- Backend must have AI configured (`AI_PROVIDER` + API key)
- User must be a manager with team members

### When `VITE_ENABLE_AI_INSIGHTS=false` or Not Set (Current Default)

**Manager Dashboard**:
- Shows 2 tabs: Overview, Analytics
- AI Insights tab completely hidden
- No indication feature exists

---

## 🧪 Testing in Staging

### Step 1: Wait for Deployment

Monitor deployment status:
1. Go to Render Dashboard → `feedbackflow-frontend-staging`
2. Check "Events" tab for deployment status
3. Wait for green "Live" indicator

Expected deployment time: 3-5 minutes

### Step 2: Test Feature Disabled (If Variable Not Set)

```bash
# Open staging URL
open https://feedbackflow-frontend-staging.onrender.com

# Login as a manager
# Navigate to Manager Dashboard
# Verify: Only 2 tabs visible (Overview, Analytics)
```

### Step 3: Set Environment Variable

In Render Dashboard:
```
VITE_ENABLE_AI_INSIGHTS=true
```

Wait for automatic rebuild (~3-5 minutes)

### Step 4: Test Feature Enabled

```bash
# Refresh staging URL
open https://feedbackflow-frontend-staging.onrender.com

# Login as a manager
# Navigate to Manager Dashboard
# Verify: 3 tabs visible (Overview, AI Insights, Analytics)
# Click AI Insights tab
# Click "Generate Insights" button
# Verify: Insights are generated and displayed
```

### Step 5: Test URL Redirect (If Feature Disabled)

Set `VITE_ENABLE_AI_INSIGHTS=false`, then:

```bash
# Navigate directly to insights tab via URL
open https://feedbackflow-frontend-staging.onrender.com/dashboard?tab=insights

# Expected: Auto-redirects to Overview tab
```

---

## 📊 Monitoring

### Check Deployment Logs

**Backend Staging**:
```bash
# In Render Dashboard: feedbackflow-backend-staging → Logs
# Look for: "Server running on port 5000"
# Look for: "Health check endpoint: /api/v1/health"
```

**Frontend Staging**:
```bash
# In Render Dashboard: feedbackflow-frontend-staging → Logs
# Look for: "Build completed successfully"
# Look for: "Static files published to /dist"
```

### Verify Health

**Backend Health Check**:
```bash
curl https://feedbackflow-backend-staging.onrender.com/api/v1/health
# Expected: { "status": "ok", "timestamp": "..." }
```

**Frontend Health Check**:
```bash
curl -I https://feedbackflow-frontend-staging.onrender.com
# Expected: HTTP/2 200
```

---

## 🔍 Troubleshooting

### Issue: AI Insights Tab Not Appearing

**Check**:
1. Is `VITE_ENABLE_AI_INSIGHTS=true` set in frontend service?
2. Did deployment complete after setting variable?
3. Did you hard refresh the browser (Cmd+Shift+R / Ctrl+Shift+R)?
4. Check browser console for errors

**Solution**:
- Verify environment variable in Render Dashboard
- Trigger manual deploy if needed
- Clear browser cache

### Issue: "Generate Insights" Returns Error

**Check Backend AI Configuration**:

1. Go to `feedbackflow-backend-staging` → Environment
2. Verify these variables are set:
   - `AI_PROVIDER` (should be `claude` or `gemini`)
   - `ANTHROPIC_API_KEY` (if using Claude)
   - `GOOGLE_AI_API_KEY` (if using Gemini)

**Common Errors**:
- "AI provider not configured" → Backend missing API keys
- "Failed to generate insights" → Check backend logs for AI API errors
- "Timeout" → AI generation took >2 minutes (normal for large teams)

### Issue: Tab Shows But Then Disappears

**Possible Causes**:
- Environment variable changed after initial load
- User navigated with URL parameter while feature disabled
- Feature flag check failed

**Solution**:
- Verify `VITE_ENABLE_AI_INSIGHTS=true` is still set
- Check browser console for JavaScript errors
- Hard refresh browser

---

## 📋 Rollback Plan

### If Issues Arise, Disable Feature

**Quick Disable** (Frontend Only):
1. Go to Render Dashboard → `feedbackflow-frontend-staging`
2. Environment tab
3. Set `VITE_ENABLE_AI_INSIGHTS=false`
4. Wait for rebuild

**Full Rollback** (Code Rollback):
```bash
cd /Users/itays/dev/feedbackflow-app

# Find commit before merge
git log --oneline staging -5

# Revert to previous commit (replace with actual hash)
git checkout staging
git reset --hard f7ab7e8  # Previous commit before AI Insights toggle
git push origin staging --force

# Note: Use with caution, only if critical issue
```

---

## 🎉 Success Criteria

### Deployment Successful When:

- ✅ Staging branch deployed to Render
- ✅ Frontend rebuild completed
- ✅ Backend services remain healthy
- ✅ AI Insights tab visible when variable=true
- ✅ Tab hidden when variable=false or not set
- ✅ "Generate Insights" button functional
- ✅ Insights display correctly
- ✅ No console errors
- ✅ No breaking changes to existing features

### Ready for Production When:

- ✅ All staging tests pass
- ✅ Feature tested with multiple managers
- ✅ Performance verified (insights generation <60s)
- ✅ Export functionality tested (DOCX + Google Drive)
- ✅ Security verified (no prompt injection issues)
- ✅ Documentation reviewed
- ✅ Stakeholder approval

---

## 📝 Next Steps

### After Staging Validation

1. **Test thoroughly in staging** (1-2 days)
   - Multiple manager accounts
   - Various team sizes
   - Different feedback volumes
   - Export features

2. **Gather feedback**
   - Does the toggle work as expected?
   - Is the default (disabled) appropriate?
   - Any UX improvements needed?

3. **Prepare for production**
   - Review production environment variables
   - Plan production deployment window
   - Prepare rollback plan
   - Notify stakeholders

4. **Deploy to production** (when ready)
   ```bash
   # Production deployment (manual via Render Dashboard)
   # 1. Set VITE_ENABLE_AI_INSIGHTS=true in production frontend
   # 2. Manually trigger deploy in Render Dashboard
   # 3. Monitor logs and health checks
   ```

---

## 📚 Documentation

- **Feature Toggles Guide**: `docs/FEATURE_TOGGLES.md`
- **AI Configuration**: `backend/docs/AI_CONFIGURATION.md`
- **Implementation Summary**: `AI_INSIGHTS_TOGGLE_SUMMARY.md`
- **Test Script**: `test-ai-insights-toggle.sh`

---

## 🔗 Useful Links

- **Render Dashboard**: https://dashboard.render.com
- **Staging Frontend**: https://feedbackflow-frontend-staging.onrender.com
- **Staging Backend**: https://feedbackflow-backend-staging.onrender.com
- **GitHub Repo**: https://github.com/itayshmool/feedbackflow-app

---

## Contact & Support

If you encounter any issues during deployment:
1. Check backend logs in Render Dashboard
2. Check frontend logs in Render Dashboard
3. Review browser console for frontend errors
4. Consult troubleshooting section above
5. Review `docs/FEATURE_TOGGLES.md` for detailed guidance

---

**Deployment Initiated**: 2024-12-25  
**Status**: ✅ Code Pushed to Staging - Awaiting Render Build  
**Next Action**: Set `VITE_ENABLE_AI_INSIGHTS=true` in Render Dashboard



