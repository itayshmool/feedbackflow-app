// frontend/e2e/debug-form-fields.spec.ts

import { test, expect } from '@playwright/test';
import { setupAuthAs, clearAuth } from './helpers/auth.helper';

test.beforeEach(async ({ page }) => {
  await clearAuth(page);
});

test('Debug form fields on Give Feedback page', async ({ page }) => {
  await setupAuthAs(page, 'efratr@wix.com');
  
  // Navigate to Feedback page
  await page.click('a[href="/feedback"]');
  await page.waitForURL(/.*feedback/);
  
  // Click Give Feedback button
  await page.locator('button:has-text("Give Feedback")').first().click();
  await page.waitForTimeout(3000); // Give it time to render
  
  console.log('=== FORM ELEMENTS DEBUG ===');
  
  // Check all inputs
  const inputs = page.locator('input');
  const inputCount = await inputs.count();
  console.log(`Inputs found: ${inputCount}`);
  
  for (let i = 0; i < inputCount; i++) {
    const input = inputs.nth(i);
    const placeholder = await input.getAttribute('placeholder');
    const type = await input.getAttribute('type');
    const name = await input.getAttribute('name');
    console.log(`Input ${i}: type="${type}", placeholder="${placeholder}", name="${name}"`);
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
    const placeholder = await textarea.getAttribute('placeholder');
    const name = await textarea.getAttribute('name');
    console.log(`Textarea ${i}: placeholder="${placeholder}", name="${name}"`);
  }
  
  // Take screenshot for visual debugging
  await page.screenshot({ path: 'debug-form-fields.png', fullPage: true });
  
  console.log('✅ Form fields debug completed');
});
