// frontend/e2e/feedback-workflow.spec.ts

import { test, expect } from '@playwright/test';
import { setupAuthAs, logout, clearAuth } from './helpers/auth.helper';

test.describe('Feedback Workflow - Basic Tests', () => {
  const GIVER_EMAIL = 'efratr@wix.com';
  const RECEIVER_EMAIL = 'idanc@wix.com';

  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await clearAuth(page);
  });

  test('Manager can access feedback page and view all tabs', async ({ page }) => {
    await test.step('Login and navigate to feedback page', async () => {
      await setupAuthAs(page, GIVER_EMAIL);
      
      // Navigate to Feedback page
      await page.click('a[href="/feedback"]');
      await page.waitForURL(/.*feedback/);
      
      // Verify feedback page loaded with tabs
      await expect(page.locator('button:has-text("Received")')).toBeVisible();
      await expect(page.locator('button:has-text("Given")')).toBeVisible();
      await expect(page.locator('button:has-text("Drafts")')).toBeVisible();
      await expect(page.locator('button:has-text("Give Feedback")')).toBeVisible();
      
      console.log('✓ Feedback page loaded successfully');
    });

    await test.step('Verify Received tab loads', async () => {
      await page.click('button:has-text("Received")');
      await page.waitForTimeout(1000);
      await expect(page.locator('button:has-text("Received")')).toBeVisible();
      console.log('✓ Received tab loads');
    });

    await test.step('Verify Given tab loads', async () => {
      await page.click('button:has-text("Given")');
      await page.waitForTimeout(1000);
      await expect(page.locator('button:has-text("Given")')).toBeVisible();
      console.log('✓ Given tab loads');
    });

    await test.step('Verify Drafts tab loads', async () => {
      await page.click('button:has-text("Drafts")');
      await page.waitForTimeout(1000);
      await expect(page.locator('button:has-text("Drafts")')).toBeVisible();
      console.log('✓ Drafts tab loads');
    });
  });

  test('Manager can open feedback form', async ({ page }) => {
    await test.step('Login and open feedback form', async () => {
      await setupAuthAs(page, GIVER_EMAIL);
      
      // Navigate to Feedback page
      await page.click('a[href="/feedback"]');
      await page.waitForURL(/.*feedback/);
      
      // Click Give Feedback button
      await page.click('button:has-text("Give Feedback")');
      await page.waitForTimeout(2000);
      
      // Verify the feedback form loaded
      await expect(page.locator('h2:has-text("Give Feedback")')).toBeVisible();
      await expect(page.locator('text=Basic Information')).toBeVisible();
      await expect(page.locator('text=Feedback Cycle')).toBeVisible();
      
      // Verify form has required sections
      await expect(page.locator('label:has-text("Review Type")')).toBeVisible();
      await expect(page.locator('label:has-text("Select Cycle")')).toBeVisible();
      
      // Verify form has action buttons
      await expect(page.locator('button:has-text("Save as Draft")')).toBeVisible();
      await expect(page.locator('button:has-text("Submit Feedback")')).toBeVisible();
      
      console.log('✓ Feedback form loaded successfully with all required elements');
    });

    await test.step('Verify form can be closed', async () => {
      const closeButton = page.locator('button:has-text("Close")');
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(500);
        
        // Verify we're back to feedback list
        await expect(page.locator('button:has-text("Give Feedback")')).toBeVisible();
        console.log('✓ Form can be closed');
      }
    });
  });

  test('Employee can access feedback page', async ({ page }) => {
    await test.step('Login as employee and verify access', async () => {
      await setupAuthAs(page, RECEIVER_EMAIL);
      
      // Navigate to Feedback page
      await page.click('a[href="/feedback"]');
      await page.waitForURL(/.*feedback/);
      
      // Verify feedback page loaded
      await expect(page.locator('button:has-text("Received")')).toBeVisible();
      await expect(page.locator('button:has-text("Given")')).toBeVisible();
      
      console.log('✓ Employee can access feedback page');
    });
  });

  test('Feedback page handles tab switching without errors', async ({ page }) => {
    await setupAuthAs(page, GIVER_EMAIL);
    
    await page.click('a[href="/feedback"]');
    await page.waitForURL(/.*feedback/);
    
    // Rapidly switch between tabs
    await page.click('button:has-text("Received")');
    await page.waitForTimeout(500);
    
    await page.click('button:has-text("Given")');
    await page.waitForTimeout(500);
    
    await page.click('button:has-text("Drafts")');
    await page.waitForTimeout(500);
    
    await page.click('button:has-text("Received")');
    await page.waitForTimeout(500);
    
    // Verify page is still functional
    await expect(page.locator('button:has-text("Give Feedback")')).toBeVisible();
    
    console.log('✓ Tab switching works without errors');
  });
});
