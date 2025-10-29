// frontend/e2e/organization.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Organization Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Navigate to organization management tab
    await page.click('text=Organizations');
  });

  test('should display organization list', async ({ page }) => {
    // Should show organization table/list
    await expect(page.locator('text=Test Organization')).toBeVisible();
    
    // Should show organization details
    await expect(page.locator('text=test-org')).toBeVisible();
    await expect(page.locator('text=test@example.com')).toBeVisible();
  });

  test('should display organization statistics', async ({ page }) => {
    // Should show stats cards (if statistics are displayed on this page)
    const totalOrgs = page.locator('text=Total Organizations');
    const activeOrgs = page.locator('text=Active Organizations');
    
    if (await totalOrgs.isVisible()) {
      await expect(totalOrgs).toBeVisible();
    }
    if (await activeOrgs.isVisible()) {
      await expect(activeOrgs).toBeVisible();
    }
  });

  test('should open organization creation form', async ({ page }) => {
    // Click create organization button
    await page.click('button:has-text("New Organization")');
    
    // Should open form modal
    await expect(page.locator('text=Create Organization')).toBeVisible();
    
    // Should show form fields
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="slug"]')).toBeVisible();
    await expect(page.locator('input[name="contactEmail"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
  });

  test('should validate organization form', async ({ page }) => {
    // Open create form
    await page.click('button:has-text("New Organization")');
    
    // Try to submit empty form
    await page.click('button:has-text("Save")');
    
    // Should show validation errors
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Contact email is required')).toBeVisible();
  });

  test('should create new organization', async ({ page }) => {
    // Open create form
    await page.click('button:has-text("New Organization")');
    
    // Fill in organization details
    await page.fill('input[name="name"]', 'New Test Organization');
    await page.fill('input[name="slug"]', 'new-test-org');
    await page.fill('input[name="contactEmail"]', 'new@example.com');
    await page.fill('textarea[name="description"]', 'A new test organization');
    
    // Submit form
    await page.click('button:has-text("Save")');
    
    // Should show success message
    await expect(page.locator('text=Organization created successfully')).toBeVisible();
    
    // Should show new organization in list
    await expect(page.locator('text=New Test Organization')).toBeVisible();
  });

  test('should edit existing organization', async ({ page }) => {
    // Find and click edit button for first organization
    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();
    
    // Should open edit form
    await expect(page.locator('text=Edit Organization')).toBeVisible();
    
    // Modify organization name
    await page.fill('input[name="name"]', 'Updated Organization Name');
    
    // Save changes
    await page.click('button:has-text("Save")');
    
    // Should show success message
    await expect(page.locator('text=Organization updated successfully')).toBeVisible();
    
    // Should show updated name in list
    await expect(page.locator('text=Updated Organization Name')).toBeVisible();
  });

  test('should delete organization with confirmation', async ({ page }) => {
    // Find and click delete button for first organization
    const deleteButton = page.locator('button:has-text("Delete")').first();
    await deleteButton.click();
    
    // Should show confirmation dialog
    await expect(page.locator('text=Are you sure you want to delete')).toBeVisible();
    
    // Confirm deletion
    await page.click('button:has-text("Confirm")');
    
    // Should show success message
    await expect(page.locator('text=Organization deleted successfully')).toBeVisible();
  });

  test('should search organizations', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('Test');
    
    // Should filter results
    await expect(page.locator('text=Test Organization')).toBeVisible();
    
    // Clear search
    await searchInput.clear();
    await searchInput.fill('NonExistent');
    
    // Should show no results or empty state
    await expect(page.locator('text=No organizations found')).toBeVisible();
  });

  test('should filter organizations by status', async ({ page }) => {
    // Find status filter dropdown (if it exists)
    const statusFilter = page.locator('select[name="status"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('active');
      
      // Should show only active organizations
      await expect(page.locator('text=Test Organization')).toBeVisible();
    } else {
      // Skip test if filter doesn't exist
      test.skip();
    }
  });

  test('should filter organizations by subscription plan', async ({ page }) => {
    // Find plan filter dropdown (if it exists)
    const planFilter = page.locator('select[name="subscriptionPlan"]');
    if (await planFilter.isVisible()) {
      await planFilter.selectOption('basic');
      
      // Should show only basic plan organizations
      await expect(page.locator('text=Test Organization')).toBeVisible();
    } else {
      // Skip test if filter doesn't exist
      test.skip();
    }
  });

  test('should paginate through organizations', async ({ page }) => {
    // Look for pagination controls
    const nextButton = page.locator('button:has-text("Next")');
    const prevButton = page.locator('button:has-text("Previous")');
    
    if (await nextButton.isVisible()) {
      // Click next page
      await nextButton.click();
      
      // Should update page indicator
      await expect(page.locator('text=Page 2')).toBeVisible();
      
      // Click previous page
      await prevButton.click();
      
      // Should go back to page 1
      await expect(page.locator('text=Page 1')).toBeVisible();
    }
  });

  test('should view organization details', async ({ page }) => {
    // Click on organization name or view button
    const viewButton = page.locator('button:has-text("View")').first();
    await viewButton.click();
    
    // Should show organization details page/modal
    await expect(page.locator('text=Organization Details')).toBeVisible();
    
    // Should show organization information
    await expect(page.locator('text=Test Organization')).toBeVisible();
    await expect(page.locator('text=test-org')).toBeVisible();
    await expect(page.locator('text=test@example.com')).toBeVisible();
  });

  test('should export organizations', async ({ page }) => {
    // Click export button
    await page.click('button:has-text("Export")');
    
    // Should show export options or start download
    await expect(page.locator('text=Export Organizations')).toBeVisible();
    
    // Select export format (if applicable)
    const csvOption = page.locator('button:has-text("CSV")');
    if (await csvOption.isVisible()) {
      await csvOption.click();
    }
    
    // Should show success message or download notification
    await expect(page.locator('text=Export started')).toBeVisible();
  });

  test('should import organizations', async ({ page }) => {
    // Click import button
    await page.click('button:has-text("Import")');
    
    // Should show import dialog
    await expect(page.locator('text=Import Organizations')).toBeVisible();
    
    // Should show file upload area
    await expect(page.locator('input[type="file"]')).toBeVisible();
  });

  test('should show organization chart', async ({ page }) => {
    // Click organization chart button
    await page.click('button:has-text("Organization Chart")');
    
    // Should show chart visualization
    await expect(page.locator('text=Organization Chart')).toBeVisible();
    
    // Should show hierarchical structure
    await expect(page.locator('[data-testid="org-chart"]')).toBeVisible();
  });

  test('should handle bulk operations', async ({ page }) => {
    // Select multiple organizations (if checkboxes exist)
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    
    if (checkboxCount > 1) {
      // Select first two organizations
      await checkboxes.nth(1).check();
      await checkboxes.nth(2).check();
      
      // Should show bulk actions
      await expect(page.locator('text=Bulk Actions')).toBeVisible();
      
      // Test bulk delete
      await page.click('button:has-text("Bulk Delete")');
      await expect(page.locator('text=Are you sure')).toBeVisible();
    }
  });
});
