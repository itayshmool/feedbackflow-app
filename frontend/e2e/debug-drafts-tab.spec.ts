// frontend/e2e/debug-drafts-tab.spec.ts

import { test, expect } from '@playwright/test';
import { setupAuthAs, clearAuth } from './helpers/auth.helper';

test.describe('Debug Drafts Tab', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('Check what appears in Drafts tab after creating draft', async ({ page }) => {
    const GIVER_EMAIL = 'efratr@wix.com';
    const RECEIVER_EMAIL = 'idanc@wix.com';
    const strengths = 'Excellent problem-solving skills.';

    // Setup auth and create draft
    await setupAuthAs(page, GIVER_EMAIL);
    
    // Navigate to Feedback page
    await page.click('a[href="/feedback"]');
    await page.waitForURL(/.*feedback/);
    
    // Click Give Feedback button
    await page.click('button:has-text("Give Feedback")');
    await page.waitForTimeout(2000);
    
    // Fill out the feedback form
    await page.fill('input[placeholder*="Search users by email or name"]', RECEIVER_EMAIL);
    await page.waitForTimeout(1000);
    await page.click(`text=${RECEIVER_EMAIL}`);
    
    await page.locator('select').nth(1).selectOption('775b4316-16d4-4b43-ae3d-35aa322f7b71');
    
    await page.fill('input[placeholder*="strength"]', strengths);
    await page.fill('input[placeholder*="improvement"]', 'Needs to improve time management.');
    
    // Save as Draft
    await page.click('button:has-text("Save as Draft")');
    
    // Wait for navigation back to feedback list
    await page.waitForURL(/.*feedback/);
    await page.waitForTimeout(3000);
    
    // Check what's in the Drafts tab
    await page.click('text=Drafts');
    await page.waitForTimeout(2000);
    
    // Get all text content in the drafts tab
    const draftsContent = await page.textContent('body');
    console.log('Drafts tab content:', draftsContent);
    
    // Check for any feedback items
    const feedbackItems = page.locator('[data-testid*="feedback"], .feedback-item, .feedback-card');
    const itemCount = await feedbackItems.count();
    console.log('Feedback items found:', itemCount);
    
    for (let i = 0; i < itemCount; i++) {
      const item = feedbackItems.nth(i);
      const text = await item.textContent();
      console.log(`Feedback item ${i}:`, text);
    }
    
    // Check for any text containing "Excellent"
    const excellentText = page.locator('text=/Excellent/i');
    const excellentCount = await excellentText.count();
    console.log('Text containing "Excellent" found:', excellentCount);
    
    // Check for any text containing "problem-solving"
    const problemSolvingText = page.locator('text=/problem-solving/i');
    const problemSolvingCount = await problemSolvingText.count();
    console.log('Text containing "problem-solving" found:', problemSolvingCount);
    
    // Take screenshot
    await page.screenshot({ path: 'debug-drafts-tab.png', fullPage: true });
    console.log('Screenshot saved as debug-drafts-tab.png');
  });
});




