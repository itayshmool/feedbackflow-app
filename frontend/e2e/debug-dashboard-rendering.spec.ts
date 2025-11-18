// frontend/e2e/debug-dashboard-rendering.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Debug Dashboard Rendering', () => {
  test('Check if dashboard page is rendering', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => {
      if (msg.text().includes('DashboardPage') || msg.text().includes('ManagerDashboard')) {
        console.log(`Console ${msg.type()}:`, msg.text());
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
    
    // Wait for console logs
    await page.waitForTimeout(5000);
    
    // Check if we can see any React components
    const reactRoot = page.locator('#root');
    const reactContent = await reactRoot.textContent();
    console.log('React root content length:', reactContent?.length);
    console.log('React root content preview:', reactContent?.substring(0, 200));
    
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
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-dashboard-rendering.png' });
    console.log('Screenshot saved as debug-dashboard-rendering.png');
    
    // Try to navigate to feedback to see if that works
    await page.goto('/feedback');
    await page.waitForTimeout(3000);
    
    const feedbackContent = await page.textContent('body');
    console.log('Feedback page content length:', feedbackContent?.length);
    console.log('Feedback page content preview:', feedbackContent?.substring(0, 200));
  });
});




