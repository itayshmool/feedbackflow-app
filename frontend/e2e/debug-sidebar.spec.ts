// frontend/e2e/debug-sidebar.spec.ts

import { test, expect } from '@playwright/test';
import { setupAuthAs, clearAuth } from './helpers/auth.helper';

test.describe('Debug Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('Check what elements are visible on dashboard', async ({ page }) => {
    await setupAuthAs(page, 'efratr@wix.com');
    
    // Wait a bit for everything to load
    await page.waitForTimeout(5000);
    
    // Check what's in the DOM
    const bodyHTML = await page.innerHTML('body');
    console.log('Body HTML length:', bodyHTML.length);
    console.log('Body HTML preview:', bodyHTML.substring(0, 1000));
    
    // Check for sidebar elements
    const sidebar = page.locator('nav, .sidebar, [class*="sidebar"]');
    const sidebarCount = await sidebar.count();
    console.log('Sidebar elements found:', sidebarCount);
    
    if (sidebarCount > 0) {
      const sidebarHTML = await sidebar.first().innerHTML();
      console.log('Sidebar HTML:', sidebarHTML.substring(0, 500));
    }
    
    // Check for navigation links
    const navLinks = page.locator('a[href*="feedback"], a[href*="analytics"], a[href*="cycles"]');
    const navCount = await navLinks.count();
    console.log('Navigation links found:', navCount);
    
    for (let i = 0; i < navCount; i++) {
      const link = navLinks.nth(i);
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      console.log(`Link ${i}: href="${href}", text="${text}"`);
    }
    
    // Check for any links containing "Feedback"
    const feedbackLinks = page.locator('a:has-text("Feedback"), text="Feedback"');
    const feedbackCount = await feedbackLinks.count();
    console.log('Feedback links found:', feedbackCount);
    
    // Take screenshot
    await page.screenshot({ path: 'debug-sidebar.png', fullPage: true });
    console.log('Screenshot saved as debug-sidebar.png');
  });
});
