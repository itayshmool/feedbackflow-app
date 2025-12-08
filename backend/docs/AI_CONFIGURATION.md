# AI Provider Configuration

FeedbackFlow supports multiple AI providers for generating feedback and team insights. You can toggle between providers using environment variables.

## Supported Providers

| Provider | Model | Speed | Cost |
|----------|-------|-------|------|
| **Claude** (Anthropic) | claude-3-haiku-20240307 | Fast | Low |
| **Gemini** (Google) | gemini-1.5-flash | Fast | Low/Free tier |

## Environment Variables

Add these to your `.env` file:

```bash
# Toggle AI provider: 'claude' or 'gemini' (default: claude)
AI_PROVIDER=claude

# Anthropic (Claude) API Key - Required when AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your_key_here

# Google AI (Gemini) API Key - Required when AI_PROVIDER=gemini  
GOOGLE_AI_API_KEY=AIzaSy-your_key_here
```

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

1. **Generate Feedback** - AI-assisted feedback generation in the Give Feedback form
2. **Team Insights** - AI-powered analysis of team feedback patterns (Manager Dashboard)

## Pricing Notes

- **Claude Haiku**: ~$0.25 per million input tokens, ~$1.25 per million output tokens
- **Gemini Flash**: Free tier available (15 RPM, 1M TPM, 1,500 RPD)

For production usage with high volume, both providers offer competitive pricing.

