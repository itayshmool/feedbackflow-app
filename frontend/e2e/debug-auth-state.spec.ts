// frontend/e2e/debug-auth-state.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Debug Authentication State', () => {
  test('Check authentication state after login', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => {
      console.log(`Console ${msg.type()}:`, msg.text());
    });
    
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[type="email"]', 'efratr@wix.com');
    await page.fill('input[type="password"]', 'password');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    
    // Wait a bit more for everything to load
    await page.waitForTimeout(5000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check localStorage
    const authData = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        return {
          isAuthenticated: parsed.state?.isAuthenticated,
          user: parsed.state?.user,
          token: parsed.state?.token
        };
      }
      return null;
    });
    console.log('Auth data from localStorage:', authData);
    
    // Check if we can see any content
    const bodyText = await page.textContent('body');
    console.log('Body text length:', bodyText?.length);
    console.log('Body text preview:', bodyText?.substring(0, 200));
    
    // Look for specific elements
    const managerDashboard = page.locator('text=Manager Dashboard');
    const welcomeText = page.locator('text=Welcome back');
    const loadingSpinner = page.locator('[data-testid="loading"], .loading-spinner');
    
    console.log('Manager Dashboard visible:', await managerDashboard.isVisible());
    console.log('Welcome text visible:', await welcomeText.isVisible());
    console.log('Loading spinner visible:', await loadingSpinner.isVisible());
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-auth-state.png' });
    console.log('Screenshot saved as debug-auth-state.png');
    
    // Try to navigate to a different page to see if routing works
    await page.goto('/feedback');
    await page.waitForTimeout(2000);
    
    const feedbackUrl = page.url();
    console.log('After navigating to /feedback, URL:', feedbackUrl);
    
    // Check if we're redirected back to login
    if (feedbackUrl.includes('/login')) {
      console.log('Redirected to login - authentication issue');
    } else {
      console.log('Successfully navigated to feedback page');
    }
  });
});




