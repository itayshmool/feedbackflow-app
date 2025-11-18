// frontend/e2e/debug-auth.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Debug Authentication', () => {
  test('Debug login process', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => {
      console.log(`Console ${msg.type()}:`, msg.text());
    });
    
    // Listen for network requests
    page.on('request', request => {
      if (request.url().includes('/auth/login')) {
        console.log('Login request:', request.url(), request.method());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/auth/login')) {
        console.log('Login response:', response.status(), response.url());
      }
    });
    
    await page.goto('/login');
    
    // Wait for login form
    await page.waitForSelector('input[type="email"]');
    
    // Fill login form
    await page.fill('input[type="email"]', 'efratr@wix.com');
    await page.fill('input[type="password"]', 'password');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check if login form is still visible
    const loginForm = page.locator('text=Sign in to FeedbackFlow');
    const isLoginVisible = await loginForm.isVisible();
    console.log('Login form visible:', isLoginVisible);
    
    // Check for any error messages
    const errorMessages = page.locator('[role="alert"], .error, .toast-error');
    const errorCount = await errorMessages.count();
    console.log('Error messages found:', errorCount);
    
    for (let i = 0; i < errorCount; i++) {
      const errorText = await errorMessages.nth(i).textContent();
      console.log(`Error ${i}:`, errorText);
    }
    
    // Check localStorage
    const localStorage = await page.evaluate(() => {
      return {
        auth: localStorage.getItem('auth-storage'),
        token: localStorage.getItem('token'),
        user: localStorage.getItem('user')
      };
    });
    console.log('LocalStorage:', localStorage);
    
    // Check if we can see any dashboard content
    const dashboardElements = page.locator('text=Dashboard, text=Welcome, text=Feedback, text=Analytics, text=Manager, text=Admin, text=Efrat');
    const elementCount = await dashboardElements.count();
    console.log('Dashboard elements found:', elementCount);
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-auth.png' });
    console.log('Screenshot saved as debug-auth.png');
    
    // Try to navigate to dashboard manually
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    const dashboardUrl = page.url();
    console.log('Dashboard URL:', dashboardUrl);
    
    const dashboardContent = page.locator('text=Dashboard, text=Welcome, text=Feedback, text=Analytics, text=Manager, text=Admin, text=Efrat');
    const dashboardCount = await dashboardContent.count();
    console.log('Dashboard content after manual navigation:', dashboardCount);
    
    // Take another screenshot
    await page.screenshot({ path: 'debug-dashboard.png' });
    console.log('Dashboard screenshot saved as debug-dashboard.png');
  });
});




