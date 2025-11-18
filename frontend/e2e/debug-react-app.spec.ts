// frontend/e2e/debug-react-app.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Debug React App', () => {
  test('Check if React app is working', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => {
      console.log(`Console ${msg.type()}:`, msg.text());
    });
    
    // Go to the app
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
    
    // Check for React root
    const reactRoot = page.locator('#root');
    const rootHTML = await reactRoot.innerHTML();
    console.log('Root HTML length:', rootHTML.length);
    console.log('Root HTML preview:', rootHTML.substring(0, 500));
    
    // Check for any React components
    const reactComponents = page.locator('[data-reactroot], .react-component, [class*="react"]');
    const componentCount = await reactComponents.count();
    console.log('React components found:', componentCount);
    
    // Check for any loading states
    const loadingElements = page.locator('[data-testid="loading"], .loading-spinner, .animate-spin');
    const loadingCount = await loadingElements.count();
    console.log('Loading elements found:', loadingCount);
    
    // Check for any error messages
    const errorElements = page.locator('[role="alert"], .error, .toast-error');
    const errorCount = await errorElements.count();
    console.log('Error elements found:', errorCount);
    
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
    await page.screenshot({ path: 'debug-react-app.png' });
    console.log('Screenshot saved as debug-react-app.png');
    
    // Try to navigate to a different page
    await page.goto('/feedback');
    await page.waitForTimeout(3000);
    
    const feedbackUrl = page.url();
    console.log('After navigating to /feedback, URL:', feedbackUrl);
    
    const feedbackContent = await page.textContent('body');
    console.log('Feedback content length:', feedbackContent?.length);
  });
});




