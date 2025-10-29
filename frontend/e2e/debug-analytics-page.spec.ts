// frontend/e2e/debug-analytics-page.spec.ts

import { test, expect } from '@playwright/test';
import { setupAuthAs, clearAuth } from './helpers/auth.helper';

test.describe('Debug Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('Check what content is on the Analytics page', async ({ page }) => {
    await setupAuthAs(page, 'efratr@wix.com');
    
    // Navigate to Analytics page
    await page.click('a[href="/analytics"]');
    await page.waitForURL(/.*analytics/);
    await page.waitForTimeout(3000);
    
    // Check what's on the page
    const bodyHTML = await page.innerHTML('body');
    console.log('Analytics page HTML length:', bodyHTML.length);
    console.log('Analytics page HTML preview:', bodyHTML.substring(0, 1500));
    
    // Check for any text content
    const bodyText = await page.textContent('body');
    console.log('Analytics page text content:', bodyText);
    
    // Check for specific elements
    const h1Elements = page.locator('h1');
    const h1Count = await h1Elements.count();
    console.log('H1 elements found:', h1Count);
    
    for (let i = 0; i < h1Count; i++) {
      const h1 = h1Elements.nth(i);
      const text = await h1.textContent();
      console.log(`H1 ${i}: "${text}"`);
    }
    
    // Check for any elements containing "Analytics"
    const analyticsElements = page.locator('text=/Analytics/i');
    const analyticsCount = await analyticsElements.count();
    console.log('Elements containing "Analytics" found:', analyticsCount);
    
    // Check for any elements containing "Overview"
    const overviewElements = page.locator('text=/Overview/i');
    const overviewCount = await overviewElements.count();
    console.log('Elements containing "Overview" found:', overviewCount);
    
    // Check for any error messages
    const errorElements = page.locator('text=/error|Error|ERROR/i');
    const errorCount = await errorElements.count();
    console.log('Error elements found:', errorCount);
    
    for (let i = 0; i < errorCount; i++) {
      const error = errorElements.nth(i);
      const text = await error.textContent();
      console.log(`Error ${i}: "${text}"`);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'debug-analytics-page.png', fullPage: true });
    console.log('Screenshot saved as debug-analytics-page.png');
  });
});
