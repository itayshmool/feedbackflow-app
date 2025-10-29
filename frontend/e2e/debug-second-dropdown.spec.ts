// frontend/e2e/debug-second-dropdown.spec.ts

import { test, expect } from '@playwright/test';
import { setupAuthAs, clearAuth } from './helpers/auth.helper';

test.describe('Debug Second Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('Check what options are in the second dropdown', async ({ page }) => {
    await setupAuthAs(page, 'efratr@wix.com');
    
    // Navigate to feedback page
    await page.click('a[href="/feedback"]');
    await page.waitForURL(/.*feedback/);
    
    // Click Give Feedback button
    await page.click('button:has-text("Give Feedback")');
    await page.waitForTimeout(2000);
    
    // Click second select dropdown
    await page.locator('select').nth(1).click();
    await page.waitForTimeout(1000);
    
    // Get all options
    const options = page.locator('option');
    const optionCount = await options.count();
    console.log('Total options found:', optionCount);
    
    for (let i = 0; i < optionCount; i++) {
      const option = options.nth(i);
      const text = await option.textContent();
      const value = await option.getAttribute('value');
      console.log(`Option ${i}: text="${text}", value="${value}"`);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'debug-second-dropdown.png', fullPage: true });
    console.log('Screenshot saved as debug-second-dropdown.png');
  });
});
