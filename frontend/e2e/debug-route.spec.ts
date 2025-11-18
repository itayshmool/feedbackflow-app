// frontend/e2e/debug-route.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Debug Route', () => {
  test('Check if dashboard route is working', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => {
      console.log(`Console ${msg.type()}:`, msg.text());
    });
    
    // Go directly to dashboard without login first
    await page.goto('/dashboard');
    
    // Wait a bit
    await page.waitForTimeout(3000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL after going to /dashboard:', currentUrl);
    
    // Check if we're redirected to login
    if (currentUrl.includes('/login')) {
      console.log('Redirected to login - authentication required');
      
      // Now login
      await page.fill('input[type="email"]', 'efratr@wix.com');
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      
      // Wait for redirect
      await page.waitForURL(/.*dashboard/, { timeout: 10000 });
      await page.waitForTimeout(3000);
      
      const afterLoginUrl = page.url();
      console.log('Current URL after login:', afterLoginUrl);
      
      // Check content
      const content = await page.textContent('body');
      console.log('Content after login:', content?.substring(0, 200));
    } else {
      console.log('Not redirected to login - might be already authenticated');
      
      // Check content
      const content = await page.textContent('body');
      console.log('Content:', content?.substring(0, 200));
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-route.png' });
    console.log('Screenshot saved as debug-route.png');
  });
});




