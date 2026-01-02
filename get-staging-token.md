# How to Get Staging Authentication Token

To run the prompt injection test against staging, you need an authentication token.

## Method 1: From Browser (Easiest)

1. Open https://feedbackflow-frontend-staging.onrender.com in your browser
2. Login with Google OAuth
3. Open DevTools (F12 or Cmd+Opt+I)
4. Go to Application tab > Cookies > https://feedbackflow-frontend-staging.onrender.com
5. Copy the value of the `token` cookie
6. Run: `node test-prompt-injection.js "YOUR_TOKEN_HERE"`

## Method 2: From Network Tab

1. Login to staging frontend
2. Open DevTools > Network tab
3. Make any API request (like viewing feedback)
4. Click on the request
5. Look for `Authorization: Bearer <token>` in Request Headers
6. Copy the token part
7. Run: `node test-prompt-injection.js "YOUR_TOKEN_HERE"`

## Method 3: Export from Browser Console

1. Login to staging
2. Open browser console
3. Run: `document.cookie`
4. Find the token value
5. Run: `node test-prompt-injection.js "YOUR_TOKEN_HERE"`

## Test Credentials

If you have test user credentials for staging, you can also:
- Email: [your test user email]
- Login via Google OAuth on staging
- Follow Method 1 above

## Running the Test

Once you have your token:

```bash
# Option 1: Pass as argument
node test-prompt-injection.js "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Option 2: Use environment variable
export STAGING_AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
node test-prompt-injection.js
```

## Expected Output

If the vulnerability exists, you should see:
- ⚠️ VULNERABILITY DETECTED warnings
- AI responses mentioning emails, inbox, or sensitive data
- Indicators of prompt injection success

If patched:
- ✅ No injection detected messages
- Normal HR feedback responses only






