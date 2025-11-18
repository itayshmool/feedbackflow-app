// frontend/e2e/debug-feedback-page.spec.ts

import { test, expect } from '@playwright/test';
import { setupAuthAs, clearAuth } from './helpers/auth.helper';

test.describe('Debug Feedback Page', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('Check what elements are on feedback page', async ({ page }) => {
    await setupAuthAs(page, 'efratr@wix.com');
    
    // Navigate to feedback page
    await page.click('a[href="/feedback"]');
    await page.waitForURL(/.*feedback/);
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Check what's on the page
    const bodyHTML = await page.innerHTML('body');
    console.log('Feedback page HTML length:', bodyHTML.length);
    console.log('Feedback page HTML preview:', bodyHTML.substring(0, 1000));
    
    // Look for buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log('Buttons found:', buttonCount);
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const className = await button.getAttribute('class');
      console.log(`Button ${i}: text="${text}", class="${className}"`);
    }
    
    // Look for "Give Feedback" specifically
    const giveFeedbackButtons = page.locator('button:has-text("Give Feedback"), text="Give Feedback"');
    const giveFeedbackCount = await giveFeedbackButtons.count();
    console.log('Give Feedback buttons found:', giveFeedbackCount);
    
    // Look for any text containing "Give"
    const giveText = page.locator('text=/Give/');
    const giveCount = await giveText.count();
    console.log('Text containing "Give" found:', giveCount);
    
    for (let i = 0; i < giveCount; i++) {
      const element = giveText.nth(i);
      const text = await element.textContent();
      const tagName = await element.evaluate(el => el.tagName);
      console.log(`Give text ${i}: "${text}" (${tagName})`);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'debug-feedback-page.png', fullPage: true });
    console.log('Screenshot saved as debug-feedback-page.png');
  });
});




