// frontend/e2e/debug-dashboard-route.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Debug Dashboard Route', () => {
  test('Check if dashboard route is working', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => {
      console.log(`Console ${msg.type()}:`, msg.text());
    });
    
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'efratr@wix.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    
    // Wait for app to load
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
    
    // Try to navigate to different routes to see if they work
    const routes = ['/dashboard', '/feedback', '/analytics', '/cycles'];
    
    for (const route of routes) {
      console.log(`\n--- Testing route: ${route} ---`);
      
      await page.goto(route);
      await page.waitForTimeout(2000);
      
      const routeUrl = page.url();
      console.log(`After navigating to ${route}, URL:`, routeUrl);
      
      const routeContent = await page.textContent('body');
      console.log(`${route} content length:`, routeContent?.length);
      console.log(`${route} content preview:`, routeContent?.substring(0, 100));
      
      // Check for any React components
      const reactRoot = page.locator('#root');
      const rootHTML = await reactRoot.innerHTML();
      console.log(`${route} root HTML length:`, rootHTML.length);
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-dashboard-route.png' });
    console.log('Screenshot saved as debug-dashboard-route.png');
  });
});




