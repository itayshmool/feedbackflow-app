// frontend/e2e/debug-auth-loading.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Debug Auth Loading', () => {
  test('Check authentication loading state', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => {
      console.log(`Console ${msg.type()}:`, msg.text());
    });
    
    // Listen for network requests
    page.on('request', request => {
      if (request.url().includes('/auth/me')) {
        console.log('Auth/me request:', request.url(), request.method());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/auth/me')) {
        console.log('Auth/me response:', response.status(), response.url());
      }
    });
    
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[type="email"]', 'efratr@wix.com');
    await page.fill('input[type="password"]', 'password');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    
    // Wait for auth check
    await page.waitForTimeout(5000);
    
    // Check if we're stuck in loading state
    const loadingSpinner = page.locator('[data-testid="loading"], .loading-spinner, .animate-spin');
    const isLoading = await loadingSpinner.isVisible();
    console.log('Loading spinner visible:', isLoading);
    
    // Check the current URL
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check if we can see any content
    const bodyText = await page.textContent('body');
    console.log('Body text length:', bodyText?.length);
    console.log('Body text preview:', bodyText?.substring(0, 200));
    
    // Check localStorage
    const authData = await page.evaluate(() => {
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
    console.log('Auth data from localStorage:', authData);
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-auth-loading.png' });
    console.log('Screenshot saved as debug-auth-loading.png');
    
    // If we're stuck in loading, try to navigate to a different page
    if (isLoading) {
      console.log('Stuck in loading state, trying to navigate to feedback');
      await page.goto('/feedback');
      await page.waitForTimeout(3000);
      
      const feedbackUrl = page.url();
      console.log('After navigating to /feedback, URL:', feedbackUrl);
      
      const feedbackContent = await page.textContent('body');
      console.log('Feedback content length:', feedbackContent?.length);
    }
  });
});




