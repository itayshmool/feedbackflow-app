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
    
    // Verify sidebar is visible
    await expect(page.locator('a[href="/feedback"]')).toBeVisible();
    await expect(page.locator('a[href="/analytics"]')).toBeVisible();
    
    // Verify dashboard content
    await expect(page.locator('text=Welcome back, Efrat Regev!')).toBeVisible();
    await expect(page.locator('text=Manager Dashboard')).toBeVisible();
    
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
