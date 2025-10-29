// frontend/e2e/simple-feedback-test.spec.ts

import { test, expect } from '@playwright/test';
import { setupAuthAs, clearAuth } from './helpers/auth.helper';

test.describe('Simple Feedback Test', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('Create and save draft feedback', async ({ page }) => {
    const GIVER_EMAIL = 'efratr@wix.com';
    const RECEIVER_EMAIL = 'idanc@wix.com';
    const strengths = 'Excellent problem-solving skills.';
    const improvements = 'Needs to improve time management.';

    // Setup auth and navigate to dashboard
    await setupAuthAs(page, GIVER_EMAIL);
    
    // Navigate to Feedback page
    await page.click('a[href="/feedback"]');
    await page.waitForURL(/.*feedback/);
    
    // Click Give Feedback button
    await page.click('button:has-text("Give Feedback")');
    await page.waitForTimeout(2000);
    
    // Fill out the feedback form
    // Select receiver using search input
    await page.fill('input[placeholder*="Search users by email or name"]', RECEIVER_EMAIL);
    await page.waitForTimeout(1000); // Wait for search results
    await page.click(`text=${RECEIVER_EMAIL}`); // Click on the user from search results
    
    // Select feedback cycle using the second select (skip review type for now)
    await page.locator('select').nth(1).selectOption('775b4316-16d4-4b43-ae3d-35aa322f7b71');
    
    // Add strengths
    await page.fill('input[placeholder*="strength"]', strengths);
    
    // Add improvements
    await page.fill('input[placeholder*="improvement"]', improvements);
    
    // Save as Draft
    await page.click('button:has-text("Save as Draft")');
    
    // Wait for navigation back to feedback list
    await page.waitForURL(/.*feedback/);
    
    // Verify draft appears in "Drafts" tab
    await page.click('text=Drafts');
    await expect(page.locator('text=Excellent problem-solving skills')).toBeVisible();
    
    console.log('✅ Draft feedback created successfully');
  });
});
