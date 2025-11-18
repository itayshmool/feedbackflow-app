// frontend/e2e/debug-form-structure.spec.ts

import { test, expect } from '@playwright/test';
import { setupAuthAs, clearAuth } from './helpers/auth.helper';

test.describe('Debug Form Structure', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('Check the complete form structure', async ({ page }) => {
    await setupAuthAs(page, 'efratr@wix.com');
    
    // Navigate to feedback page
    await page.click('a[href="/feedback"]');
    await page.waitForURL(/.*feedback/);
    
    // Click Give Feedback button
    await page.click('button:has-text("Give Feedback")');
    await page.waitForTimeout(3000);
    
    // Check all form elements
    console.log('=== FORM ELEMENTS ===');
    
    // Check all inputs
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    console.log(`Inputs found: ${inputCount}`);
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const type = await input.getAttribute('type');
      const placeholder = await input.getAttribute('placeholder');
      const value = await input.getAttribute('value');
      const name = await input.getAttribute('name');
      console.log(`Input ${i}: type="${type}", placeholder="${placeholder}", value="${value}", name="${name}"`);
    }
    
    // Check all selects
    const selects = page.locator('select');
    const selectCount = await selects.count();
    console.log(`Selects found: ${selectCount}`);
    
    for (let i = 0; i < selectCount; i++) {
      const select = selects.nth(i);
      const name = await select.getAttribute('name');
      const id = await select.getAttribute('id');
      console.log(`Select ${i}: name="${name}", id="${id}"`);
    }
    
    // Check all textareas
    const textareas = page.locator('textarea');
    const textareaCount = await textareas.count();
    console.log(`Textareas found: ${textareaCount}`);
    
    for (let i = 0; i < textareaCount; i++) {
      const textarea = textareas.nth(i);
      const name = await textarea.getAttribute('name');
      const placeholder = await textarea.getAttribute('placeholder');
      console.log(`Textarea ${i}: name="${name}", placeholder="${placeholder}"`);
    }
    
    // Check for any elements containing "idanc" or "Idan"
    const idanElements = page.locator('text=/idanc|Idan/i');
    const idanCount = await idanElements.count();
    console.log(`Elements containing "idanc" or "Idan": ${idanCount}`);
    
    for (let i = 0; i < idanCount; i++) {
      const element = idanElements.nth(i);
      const text = await element.textContent();
      const tagName = await element.evaluate(el => el.tagName);
      console.log(`Idan element ${i}: "${text}" (${tagName})`);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'debug-form-structure.png', fullPage: true });
    console.log('Screenshot saved as debug-form-structure.png');
  });
});




