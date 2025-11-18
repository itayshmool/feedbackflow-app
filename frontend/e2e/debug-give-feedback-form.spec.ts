// frontend/e2e/debug-give-feedback-form.spec.ts

import { test, expect } from '@playwright/test';
import { setupAuthAs, clearAuth } from './helpers/auth.helper';

test.describe('Debug Give Feedback Form', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('Check what elements are on give feedback form', async ({ page }) => {
    await setupAuthAs(page, 'efratr@wix.com');
    
    // Navigate to feedback page
    await page.click('a[href="/feedback"]');
    await page.waitForURL(/.*feedback/);
    
    // Click Give Feedback button
    await page.click('button:has-text("Give Feedback")');
    await page.waitForTimeout(3000);
    
    // Check what's on the page
    const bodyHTML = await page.innerHTML('body');
    console.log('Give Feedback form HTML length:', bodyHTML.length);
    console.log('Give Feedback form HTML preview:', bodyHTML.substring(0, 1500));
    
    // Look for form elements
    const selects = page.locator('select');
    const selectCount = await selects.count();
    console.log('Select elements found:', selectCount);
    
    for (let i = 0; i < selectCount; i++) {
      const select = selects.nth(i);
      const name = await select.getAttribute('name');
      const id = await select.getAttribute('id');
      const className = await select.getAttribute('class');
      console.log(`Select ${i}: name="${name}", id="${id}", class="${className}"`);
    }
    
    // Look for inputs
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    console.log('Input elements found:', inputCount);
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const name = await input.getAttribute('name');
      const type = await input.getAttribute('type');
      const placeholder = await input.getAttribute('placeholder');
      console.log(`Input ${i}: name="${name}", type="${type}", placeholder="${placeholder}"`);
    }
    
    // Look for textareas
    const textareas = page.locator('textarea');
    const textareaCount = await textareas.count();
    console.log('Textarea elements found:', textareaCount);
    
    for (let i = 0; i < textareaCount; i++) {
      const textarea = textareas.nth(i);
      const name = await textarea.getAttribute('name');
      const placeholder = await textarea.getAttribute('placeholder');
      console.log(`Textarea ${i}: name="${name}", placeholder="${placeholder}"`);
    }
    
    // Look for buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log('Buttons found:', buttonCount);
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const type = await button.getAttribute('type');
      console.log(`Button ${i}: text="${text}", type="${type}"`);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'debug-give-feedback-form.png', fullPage: true });
    console.log('Screenshot saved as debug-give-feedback-form.png');
  });
});




