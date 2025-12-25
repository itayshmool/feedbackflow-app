# Feature Toggles

This document describes the environment variable-based feature toggles available in FeedbackFlow.

## AI Features

FeedbackFlow includes two AI-powered features that can be independently toggled on/off using environment variables.

### Quick Reference

| Feature | Environment Variable | Location | Default | Effect |
|---------|---------------------|----------|---------|--------|
| Generate Feedback | `VITE_ENABLE_AI_FEEDBACK` | Frontend | `false` | Shows/hides "Generate with AI" button |
| AI Insights | `VITE_ENABLE_AI_INSIGHTS` | Frontend | `false` | Shows/hides "AI Insights" tab |
| AI Provider | `AI_PROVIDER` | Backend | `claude` | Which AI service to use |
| Claude API Key | `ANTHROPIC_API_KEY` | Backend | - | Required for Claude |
| Gemini API Key | `GOOGLE_AI_API_KEY` | Backend | - | Required for Gemini |

---

## 1. AI-Assisted Feedback Generation

### Description
Provides a "Generate with AI" button in the Give Feedback form that auto-generates professional feedback content based on recipient information.

### Frontend Toggle

**Environment Variable**: `VITE_ENABLE_AI_FEEDBACK`

**Where to set**:
- **Local Development**: `frontend/.env.local`
- **Production (Render)**: Frontend service → Environment Variables

**Values**:
- `true` - Shows the "Generate with AI" button (sparkle icon)
- `false` or omitted - Hides the button completely

**Example**:
```bash
# frontend/.env.local
VITE_ENABLE_AI_FEEDBACK=true
```

### UI Behavior

**When Enabled** (`=true`):
- Purple gradient button with sparkle icon appears in Give Feedback form header
- Button text: "Generate with AI" (desktop) / "AI" (mobile)
- On click: Generates feedback content and auto-fills form fields
- Loading state: Shows spinner with "Generating..." text

**When Disabled** (`=false` or omitted):
- Button is completely hidden from UI
- Form works normally without AI assistance
- No indication AI feature exists

### Backend Requirements

For the feature to work when enabled:
1. Backend must have AI provider configured (`AI_PROVIDER` + API key)
2. Backend endpoint: `POST /api/v1/ai/generate-feedback`
3. If backend AI not configured, UI shows error when button clicked

---

## 2. AI Team Insights

### Description
Provides an "AI Insights" tab in the Manager Dashboard that analyzes team feedback patterns and generates actionable recommendations.

### Frontend Toggle

**Environment Variable**: `VITE_ENABLE_AI_INSIGHTS`

**Where to set**:
- **Local Development**: `frontend/.env.local`
- **Production (Render)**: Frontend service → Environment Variables

**Values**:
- `true` - Shows the "AI Insights" tab in Manager Dashboard
- `false` or omitted - Hides the tab from navigation

**Example**:
```bash
# frontend/.env.local
VITE_ENABLE_AI_INSIGHTS=true
```

### UI Behavior

**When Enabled** (`=true`):
- "AI Insights" tab appears between "Overview" and "Analytics" tabs
- Tab icon: Sparkles (✨)
- Tab contains: "Generate Insights" button, insights display, export options
- Clicking tab shows AI insights interface

**When Disabled** (`=false` or omitted):
- Tab is completely hidden from navigation
- Dashboard shows only "Overview" and "Analytics" tabs
- If user somehow accesses insights via URL (`?tab=insights`), automatically redirected to "Overview"

### Backend Requirements

For the feature to work when enabled:
1. Backend must have AI provider configured (`AI_PROVIDER` + API key)
2. Backend endpoint: `POST /api/v1/ai/team-insights`
3. If backend AI not configured, UI shows error when "Generate Insights" clicked

---

## Configuration Scenarios

### Scenario 1: Both Features Enabled (Recommended for Production)

```bash
# Backend .env
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-api03-xxx...

# Frontend .env (or hosting platform environment variables)
VITE_ENABLE_AI_FEEDBACK=true
VITE_ENABLE_AI_INSIGHTS=true
```

**Result**: Full AI functionality available to all users

---

### Scenario 2: Only Team Insights Enabled

```bash
# Backend .env
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-api03-xxx...

# Frontend .env
VITE_ENABLE_AI_FEEDBACK=false
VITE_ENABLE_AI_INSIGHTS=true
```

**Result**: 
- Managers can use AI Insights in dashboard
- "Generate with AI" button hidden in feedback form
- Useful if you want to limit AI usage or costs

---

### Scenario 3: AI Completely Disabled

```bash
# Backend .env
# AI_PROVIDER not set or commented out
# No API keys

# Frontend .env
VITE_ENABLE_AI_FEEDBACK=false
VITE_ENABLE_AI_INSIGHTS=false
```

**Result**: 
- No AI features visible anywhere in UI
- App works normally without AI functionality
- Useful for demos, testing, or organizations without AI needs

---

### Scenario 4: Frontend Enabled, Backend Not Configured (Broken State)

```bash
# Backend .env
# No AI_PROVIDER or API keys set

# Frontend .env
VITE_ENABLE_AI_FEEDBACK=true
VITE_ENABLE_AI_INSIGHTS=true
```

**Result**: 
- UI shows AI buttons/tabs
- When clicked, returns error: "AI provider not configured"
- **Not recommended** - better to keep frontend toggles aligned with backend

---

## Implementation Details

### Code Locations

**Frontend Feature Checks**:
```typescript
// Give Feedback AI button
const isAIEnabled = import.meta.env.VITE_ENABLE_AI_FEEDBACK === 'true';

// AI Insights tab
const isAIInsightsEnabled = import.meta.env.VITE_ENABLE_AI_INSIGHTS === 'true';
```

**Files Modified**:
- `frontend/src/components/feedback/GiveFeedback.tsx` (line ~90)
- `frontend/src/pages/dashboard/ManagerDashboard.tsx` (lines ~120, ~347, ~1218)
- `frontend/src/vite-env.d.ts` (TypeScript declarations)

### TypeScript Support

Environment variables are typed in `frontend/src/vite-env.d.ts`:

```typescript
interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_ENABLE_AI_FEEDBACK?: string
  readonly VITE_ENABLE_AI_INSIGHTS?: string
}
```

---

## Testing

### Test AI Features Are Hidden

```bash
# Set both to false
VITE_ENABLE_AI_FEEDBACK=false
VITE_ENABLE_AI_INSIGHTS=false

# Start frontend
cd frontend && npm run dev

# Verify:
# 1. Give Feedback form has no "Generate with AI" button
# 2. Manager Dashboard has only 2 tabs (Overview, Analytics)
```

### Test AI Features Are Shown

```bash
# Set both to true
VITE_ENABLE_AI_FEEDBACK=true
VITE_ENABLE_AI_INSIGHTS=true

# Start frontend
cd frontend && npm run dev

# Verify:
# 1. Give Feedback form shows "Generate with AI" button
# 2. Manager Dashboard has 3 tabs (Overview, AI Insights, Analytics)
```

### Test Backend Integration

```bash
# Backend: Configure AI
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-xxx...

# Frontend: Enable features
VITE_ENABLE_AI_FEEDBACK=true
VITE_ENABLE_AI_INSIGHTS=true

# Test:
# 1. Click "Generate with AI" → should populate form with content
# 2. Click "Generate Insights" → should display team analysis
```

---

## Deployment

### Local Development

Create `frontend/.env.local`:
```bash
VITE_ENABLE_AI_FEEDBACK=true
VITE_ENABLE_AI_INSIGHTS=true
```

This file is gitignored and won't be committed.

### Render.com Production

1. Go to your frontend service in Render dashboard
2. Navigate to "Environment" tab
3. Add environment variables:
   - `VITE_ENABLE_AI_FEEDBACK` = `true`
   - `VITE_ENABLE_AI_INSIGHTS` = `true`
4. Trigger a new deploy (Render auto-rebuilds with new env vars)

### Other Hosting Platforms

Set environment variables in your platform's configuration:
- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Build & Deploy → Environment
- **AWS Amplify**: App Settings → Environment Variables

**Important**: Vite environment variables must be set at **build time**, not runtime. Changing them requires a rebuild.

---

## Troubleshooting

### "Generate with AI" button not appearing

**Check**:
1. Is `VITE_ENABLE_AI_FEEDBACK=true` set in frontend environment?
2. Did you rebuild the frontend after changing the env var?
3. Check browser console for any errors

### "AI Insights" tab not appearing

**Check**:
1. Is `VITE_ENABLE_AI_INSIGHTS=true` set in frontend environment?
2. Did you rebuild the frontend after changing the env var?
3. Are you logged in as a manager? (Tab only shows for managers)

### AI features show but return errors

**Check**:
1. Is backend `AI_PROVIDER` set? (`claude` or `gemini`)
2. Is corresponding API key set? (`ANTHROPIC_API_KEY` or `GOOGLE_AI_API_KEY`)
3. Check backend logs for AI configuration errors

### Environment variable not taking effect

**Vite Note**: Environment variables starting with `VITE_` are embedded at build time.

**Solution**:
```bash
# After changing env vars, rebuild:
cd frontend
npm run build

# Or restart dev server:
npm run dev
```

---

## Security Considerations

### Prompt Injection Protection

Both AI features include security measures:
- User inputs are sanitized before being sent to AI
- AI prompts explicitly mark user data as "USER-PROVIDED DATA ONLY"
- Length limits enforced on all inputs
- Feedback type validated against whitelist

See: `SECURITY_FIX_PROMPT_INJECTION.md` for details.

### API Key Security

**Never commit API keys to git**:
- Use `.env` files (gitignored)
- Set environment variables in hosting platform
- Rotate keys if accidentally exposed

---

## Cost Management

If you want to limit AI costs:

1. **Disable features during development**:
   ```bash
   VITE_ENABLE_AI_FEEDBACK=false
   VITE_ENABLE_AI_INSIGHTS=false
   ```

2. **Enable only critical feature**:
   - Keep insights enabled for managers (high value)
   - Disable feedback generation (users can write manually)

3. **Use Gemini's free tier**:
   ```bash
   AI_PROVIDER=gemini
   GOOGLE_AI_API_KEY=AIzaSy...
   ```
   Free tier: 1,500 requests/day, 15 requests/minute

---

## See Also

- [AI Configuration Guide](../backend/docs/AI_CONFIGURATION.md) - Backend AI provider setup
- [Security Documentation](./SECURITY_DOCUMENTATION_INDEX.md) - Security features and testing
- [Setup Guide](../SETUP.md) - General development setup

---

**Last Updated**: 2024-12-25  
**Feature Branch**: `feature/ai-insights-toggle`

