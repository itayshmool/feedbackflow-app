// frontend/e2e/debug-app-rendering.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Debug App Rendering', () => {
  test('Check if App component is rendering', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => {
      console.log(`Console ${msg.type()}:`, msg.text());
    });
    
    // Go directly to the app
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForTimeout(5000);
    
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
    
    // Check for any React content
    const reactRoot = page.locator('#root');
    const rootHTML = await reactRoot.innerHTML();
    console.log('Root HTML length:', rootHTML.length);
    console.log('Root HTML preview:', rootHTML.substring(0, 200));
    
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
    await page.screenshot({ path: 'debug-app-rendering.png' });
    console.log('Screenshot saved as debug-app-rendering.png');
  });
});




