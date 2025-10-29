// frontend/e2e/debug-dashboard-component.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Debug Dashboard Component', () => {
  test('Check if dashboard component is rendering', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => {
      if (msg.text().includes('DashboardPage') || msg.text().includes('ManagerDashboard') || msg.text().includes('App')) {
        console.log(`Console ${msg.type()}:`, msg.text());
      }
    });
    
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'efratr@wix.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    
    // Wait for app to load
    await page.waitForTimeout(5000);
    
    // Check if we can see any React components
    const reactRoot = page.locator('#root');
    const rootHTML = await reactRoot.innerHTML();
    console.log('Root HTML length:', rootHTML.length);
    console.log('Root HTML preview:', rootHTML.substring(0, 500));
    
    // Check for specific dashboard elements
    const dashboardElements = [
      'Manager Dashboard',
      'Welcome back',
      'Overview',
      'Team',
      'Analytics',
      'Direct Reports',
      'Feedback',
      'Cycles'
    ];
    
    for (const element of dashboardElements) {
      const locator = page.locator(`text=${element}`);
      const isVisible = await locator.isVisible();
      console.log(`${element}: ${isVisible}`);
    }
    
    // Check for any loading states
    const loadingElements = page.locator('[data-testid="loading"], .loading-spinner, .animate-spin');
    const loadingCount = await loadingElements.count();
    console.log('Loading elements found:', loadingCount);
    
    // Check for any error messages
    const errorElements = page.locator('[role="alert"], .error, .toast-error');
    const errorCount = await errorElements.count();
    console.log('Error elements found:', errorCount);
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-dashboard-component.png' });
    console.log('Screenshot saved as debug-dashboard-component.png');
    
    // Try to navigate to feedback to see if that works
    await page.goto('/feedback');
    await page.waitForTimeout(3000);
    
    const feedbackContent = await page.textContent('body');
    console.log('Feedback page content length:', feedbackContent?.length);
    console.log('Feedback page content preview:', feedbackContent?.substring(0, 200));
  });
});
