// frontend/e2e/extract-staging-token.spec.ts
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Extract Staging Token', () => {
  test('Open browser, wait for login, extract token', async ({ page, context }) => {
    // Set a long timeout for this test (5 minutes for user to login)
    test.setTimeout(300000);
    console.log('🌐 Opening staging environment...');
    
    // Navigate to staging
    await page.goto('https://feedbackflow-frontend-staging.onrender.com');
    
    console.log('');
    console.log('============================================');
    console.log('👤 PLEASE LOGIN NOW');
    console.log('============================================');
    console.log('1. Click "Login with Google"');
    console.log('2. Complete the Google login');
    console.log('3. Wait for the dashboard to load');
    console.log('');
    console.log('⏳ Waiting for you to login...');
    console.log('(Browser will stay open)');
    console.log('============================================');
    
    // Wait for successful login (dashboard URL or specific element)
    await page.waitForURL('**/dashboard', { timeout: 300000 }); // 5 minute timeout
    
    console.log('✅ Login detected!');
    console.log('');
    console.log('📡 Extracting authentication token...');
    
    // Give it a moment to settle
    await page.waitForTimeout(2000);
    
    // Method 1: Try to get from localStorage
    let token = await page.evaluate(() => {
      return localStorage.getItem('token') || 
             localStorage.getItem('authToken') ||
             localStorage.getItem('auth_token');
    });
    
    // Method 2: Try to get from cookies
    if (!token) {
      const cookies = await context.cookies();
      const authCookie = cookies.find(c => 
        c.name === 'token' || 
        c.name === 'authToken' || 
        c.name === 'auth_token'
      );
      if (authCookie) {
        token = authCookie.value;
      }
    }
    
    // Method 3: Intercept an API request to get the Authorization header
    if (!token) {
      console.log('Token not in storage/cookies, intercepting API request...');
      
      // Navigate to a page that makes API calls
      await page.goto('https://feedbackflow-frontend-staging.onrender.com/administration/users');
      
      // Listen for API requests
      const request = await page.waitForRequest(
        request => request.url().includes('feedbackflow-backend-staging.onrender.com'),
        { timeout: 30000 }
      );
      
      const authHeader = request.headers()['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer '
      }
    }
    
    // Get organization ID
    console.log('🏢 Getting organization ID...');
    let orgId = await page.evaluate(() => {
      // Try to get from user object in localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          return user.organizationId || user.organization_id;
        } catch (e) {}
      }
      return null;
    });
    
    // If not in localStorage, try to get from API request
    if (!orgId) {
      await page.goto('https://feedbackflow-frontend-staging.onrender.com/administration/users');
      const response = await page.waitForResponse(
        response => response.url().includes('/api/v1/admin/users'),
        { timeout: 30000 }
      );
      const url = new URL(response.url());
      orgId = url.searchParams.get('organizationId');
    }
    
    // Display results
    console.log('');
    console.log('============================================');
    console.log('✅ TOKEN EXTRACTION SUCCESSFUL!');
    console.log('============================================');
    console.log('');
    
    if (token) {
      console.log('🔑 Admin Token:');
      console.log(token);
      console.log('');
      
      // Save to file
      const outputPath = path.join(process.cwd(), '..', '.staging-credentials.sh');
      const content = `#!/bin/bash
# Staging credentials extracted on ${new Date().toISOString()}
export ADMIN_TOKEN="${token}"
${orgId ? `export ORG_ID="${orgId}"` : '# ORG_ID not found - please set manually'}

echo "✅ Credentials loaded!"
echo "Run: ./scripts/test-security-fix.sh"
`;
      fs.writeFileSync(outputPath, content);
      fs.chmodSync(outputPath, '755');
      
      console.log('💾 Saved to: .staging-credentials.sh');
      console.log('');
      console.log('To use it:');
      console.log('  source .staging-credentials.sh');
      console.log('  ./scripts/test-security-fix.sh');
    } else {
      console.log('❌ Could not extract token');
      console.log('Please copy manually from DevTools');
    }
    
    if (orgId) {
      console.log('');
      console.log('🏢 Organization ID:');
      console.log(orgId);
    } else {
      console.log('');
      console.log('⚠️  Could not extract Organization ID');
      console.log('You can find it in the URL or API responses');
    }
    
    console.log('');
    console.log('============================================');
    console.log('');
    
    // Keep browser open for 10 seconds so user can see the results
    console.log('Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    
    expect(token).toBeTruthy();
  });
});

