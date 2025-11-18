// frontend/e2e/test-auth-setup.spec.ts

import { test, expect } from '@playwright/test';
import { setupAuthAs, clearAuth } from './helpers/auth.helper';

test.describe('Test Auth Setup', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('Setup auth for manager and verify dashboard loads', async ({ page }) => {
    await setupAuthAs(page, 'efratr@wix.com');
    
    // Verify we're on dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Verify sidebar links are visible
    await expect(page.locator('a[href="/feedback"]')).toBeVisible();
    await expect(page.locator('a[href="/cycles"]')).toBeVisible();
    await expect(page.locator('a[href="/notifications"]')).toBeVisible();
    
    // Verify dashboard content loads (check for any heading)
    await expect(page.locator('h1').first()).toBeVisible();
    
    console.log('✅ Manager auth setup successful');
  });

  test('Setup auth for non-manager and verify dashboard loads', async ({ page }) => {
    await setupAuthAs(page, 'idanc@wix.com');
    
    // Verify we're on dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Verify sidebar is visible
    await expect(page.locator('a[href="/feedback"]')).toBeVisible();
    
    // Verify dashboard content (should be different for non-manager)
    await expect(page.locator('text=Welcome back, Idan Cohen!')).toBeVisible();
    
    console.log('✅ Non-manager auth setup successful');
  });
});




