// frontend/e2e/debug-sidebar-links.spec.ts

import { test, expect } from '@playwright/test';
import { setupAuthAs, clearAuth } from './helpers/auth.helper';

test.describe('Debug Sidebar Links', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('Check all available links in sidebar', async ({ page }) => {
    await setupAuthAs(page, 'efratr@wix.com');
    
    // Wait for sidebar to load
    await page.waitForTimeout(3000);
    
    // Get all links in the sidebar
    const sidebarLinks = page.locator('nav a, .sidebar a, [class*="sidebar"] a');
    const linkCount = await sidebarLinks.count();
    console.log('Total sidebar links found:', linkCount);
    
    for (let i = 0; i < linkCount; i++) {
      const link = sidebarLinks.nth(i);
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      const isVisible = await link.isVisible();
      console.log(`Link ${i}: href="${href}", text="${text}", visible=${isVisible}`);
    }
    
    // Check specifically for Analytics link
    const analyticsLinks = page.locator('a[href*="analytics"], a:has-text("Analytics")');
    const analyticsCount = await analyticsLinks.count();
    console.log('Analytics links found:', analyticsCount);
    
    for (let i = 0; i < analyticsCount; i++) {
      const link = analyticsLinks.nth(i);
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      const isVisible = await link.isVisible();
      console.log(`Analytics link ${i}: href="${href}", text="${text}", visible=${isVisible}`);
    }
    
    // Check if Analytics is in the navigation at all
    const allText = await page.textContent('body');
    const hasAnalytics = allText.includes('Analytics');
    console.log('Page contains "Analytics" text:', hasAnalytics);
    
    // Take screenshot
    await page.screenshot({ path: 'debug-sidebar-links.png', fullPage: true });
    console.log('Screenshot saved as debug-sidebar-links.png');
  });
});




