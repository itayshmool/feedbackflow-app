# AI Provider Configuration

FeedbackFlow supports multiple AI providers for generating feedback and team insights. You can toggle between providers using environment variables.

## Supported Providers

| Provider | Model | Speed | Cost |
|----------|-------|-------|------|
| **Claude** (Anthropic) | claude-3-haiku-20240307 | Fast | Low |
| **Gemini** (Google) | gemini-2.0-flash-exp | Fast | Low/Free tier |

## Environment Variables

### Backend Configuration

Add these to your backend `.env` file:

```bash
# Toggle AI provider: 'claude' or 'gemini' (default: claude)
AI_PROVIDER=claude

# Anthropic (Claude) API Key - Required when AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your_key_here

# Google AI (Gemini) API Key - Required when AI_PROVIDER=gemini  
GOOGLE_AI_API_KEY=AIzaSy-your_key_here
```

### Frontend Feature Toggles

Add these to your frontend `.env` or `.env.local` file (or set in your hosting platform):

```bash
# Enable "Generate with AI" button in Give Feedback form
# Set to 'true' to enable, any other value or omit to disable
VITE_ENABLE_AI_FEEDBACK=true

# Enable "AI Insights" tab in Manager Dashboard
# Set to 'true' to enable, any other value or omit to disable
VITE_ENABLE_AI_INSIGHTS=true
```

**Note**: Both features require the backend AI provider to be configured. The frontend toggles only control whether the UI elements are visible to users.

## Getting API Keys

### Claude (Anthropic)
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

### Gemini (Google AI)
1. Go to https://aistudio.google.com/
2. Sign in with your Google account
3. Click "Get API Key" → "Create API Key"
4. Copy the key (starts with `AIza`)

## Usage

### Use Claude (default)
```bash
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Use Gemini
```bash
AI_PROVIDER=gemini
GOOGLE_AI_API_KEY=AIzaSy...
```

## Features Using AI

### 1. Generate Feedback (Give Feedback Form)
AI-assisted feedback generation that helps users write professional feedback.

**Frontend Toggle**: `VITE_ENABLE_AI_FEEDBACK=true`
- When enabled: "Generate with AI" button appears in the Give Feedback form
- When disabled: Button is hidden from UI

### 2. Team Insights (Manager Dashboard)
AI-powered analysis of team feedback patterns with actionable recommendations.

**Frontend Toggle**: `VITE_ENABLE_AI_INSIGHTS=true`
- When enabled: "AI Insights" tab appears in Manager Dashboard
- When disabled: Tab is hidden from navigation

**Configuration Matrix**:

| Backend AI | Frontend Toggle | Result |
|-----------|----------------|---------|
| ✅ Configured | `=true` | Feature visible and functional |
| ✅ Configured | `=false` or omitted | Feature hidden (UI element not shown) |
| ❌ Not configured | `=true` | UI visible but returns error when used |
| ❌ Not configured | `=false` or omitted | Feature hidden |

## Pricing Notes

- **Claude Haiku**: ~$0.25 per million input tokens, ~$1.25 per million output tokens
- **Gemini Flash**: Free tier available (15 RPM, 1M TPM, 1,500 RPD)

For production usage with high volume, both providers offer competitive pricing.

