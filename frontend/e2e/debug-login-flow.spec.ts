// frontend/e2e/debug-login-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Debug Login Flow', () => {
  test('Step by step login flow', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => {
      console.log(`Console ${msg.type()}:`, msg.text());
    });
    
    // Step 1: Go to login page
    await page.goto('/login');
    console.log('Step 1: On login page');
    
    // Check initial auth state
    let authData = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        return {
          isLoading: parsed.state?.isLoading,
          isAuthenticated: parsed.state?.isAuthenticated,
          user: parsed.state?.user,
          token: parsed.state?.token
        };
      }
      return null;
    });
    console.log('Initial auth state:', authData);
    
    // Step 2: Fill login form
    await page.fill('input[type="email"]', 'efratr@wix.com');
    await page.fill('input[type="password"]', 'password');
    console.log('Step 2: Filled login form');
    
    // Step 3: Click login button
    await page.click('button[type="submit"]');
    console.log('Step 3: Clicked login button');
    
    // Step 4: Wait for navigation
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    console.log('Step 4: Navigated to dashboard');
    
    // Check auth state after login
    authData = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        return {
          isLoading: parsed.state?.isLoading,
          isAuthenticated: parsed.state?.isAuthenticated,
          user: parsed.state?.user,
          token: parsed.state?.token
        };
      }
      return null;
    });
    console.log('Auth state after login:', authData);
    
    // Step 5: Wait for app to fully load
    await page.waitForTimeout(5000);
    console.log('Step 5: Waited for app to load');
    
    // Check final auth state
    authData = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        return {
          isLoading: parsed.state?.isLoading,
          isAuthenticated: parsed.state?.isAuthenticated,
          user: parsed.state?.user,
          token: parsed.state?.token
        };
      }
      return null;
    });
    console.log('Final auth state:', authData);
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check if we can see any content
    const bodyText = await page.textContent('body');
    console.log('Body text length:', bodyText?.length);
    console.log('Body text preview:', bodyText?.substring(0, 200));
    
    // Check for loading spinner
    const loadingSpinner = page.locator('[data-testid="loading"], .loading-spinner, .animate-spin');
    const isLoading = await loadingSpinner.isVisible();
    console.log('Loading spinner visible:', isLoading);
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-login-flow.png' });
    console.log('Screenshot saved as debug-login-flow.png');
  });
});
