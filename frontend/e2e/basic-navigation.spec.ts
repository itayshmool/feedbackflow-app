// frontend/e2e/basic-navigation.spec.ts

import { test, expect } from '@playwright/test';
import { setupAuthAs, clearAuth, logout } from './helpers/auth.helper';

test.beforeEach(async ({ page }) => {
  await clearAuth(page);
});

test.afterEach(async ({ page }) => {
  await logout(page);
});

test.describe('Basic Navigation Tests', () => {
  test('Manager can navigate to feedback page', async ({ page }) => {
    await setupAuthAs(page, 'efratr@wix.com');
    
    // Verify dashboard loaded
    await expect(page.locator('h1:has-text("Manager Dashboard")')).toBeVisible();
    
    // Navigate to feedback
    await page.click('a[href="/feedback"]');
    await page.waitForURL(/.*feedback/);
    
    // Verify feedback page loaded
    await expect(page.locator('button:has-text("Give Feedback")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Received")')).toBeVisible();
    await expect(page.locator('button:has-text("Given")')).toBeVisible();
    await expect(page.locator('button:has-text("Drafts")')).toBeVisible();
    
    console.log('✅ Manager feedback navigation test passed');
  });

  test('Manager can navigate to cycles page', async ({ page }) => {
    await setupAuthAs(page, 'efratr@wix.com');
    
    // Navigate to cycles
    await page.click('a[href="/cycles"]');
    await page.waitForURL(/.*cycles/);
    
    // Verify cycles page loaded
    await expect(page.locator('h1:has-text("Feedback Cycles")')).toBeVisible();
    await expect(page.locator('button:has-text("Create Cycle")')).toBeVisible();
    
    console.log('✅ Manager cycles navigation test passed');
  });

  test('Manager can navigate to notifications page', async ({ page }) => {
    await setupAuthAs(page, 'efratr@wix.com');
    
    // Navigate to notifications
    await page.click('a[href="/notifications"]');
    await page.waitForURL(/.*notifications/);
    
    // Verify page loaded (check for heading or content)
    await expect(page.locator('h1').first()).toBeVisible();
    
    console.log('✅ Manager notifications navigation test passed');
  });
});
