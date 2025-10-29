import { test, expect } from '@playwright/test';

test.describe('Organization CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3003');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Mock login - fill in any credentials to bypass auth
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
    
    // Navigate to organization management
    await page.click('text=Organizations');
    await page.waitForLoadState('networkidle');
  });

  test('should display organizations list', async ({ page }) => {
    // Check if organizations list is visible
    await expect(page.locator('h1')).toContainText('Organization Management');
    
    // Check if organizations table/list is present
    await expect(page.locator('[data-testid="organizations-list"]')).toBeVisible();
    
    // Check if create button is present
    await expect(page.locator('button:has-text("Create Organization")')).toBeVisible();
  });

  test('should open create organization modal', async ({ page }) => {
    // Click create organization button
    await page.click('button:has-text("Create Organization")');
    
    // Check if modal is open
    await expect(page.locator('[data-testid="organization-form-modal"]')).toBeVisible();
    
    // Check if form fields are present
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="slug"]')).toBeVisible();
    await expect(page.locator('input[name="contact_email"]')).toBeVisible();
    await expect(page.locator('select[name="subscription_plan"]')).toBeVisible();
  });

  test('should validate required fields in organization form', async ({ page }) => {
    // Open create organization modal
    await page.click('button:has-text("Create Organization")');
    await expect(page.locator('[data-testid="organization-form-modal"]')).toBeVisible();
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation errors
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Contact email is required')).toBeVisible();
  });

  test('should auto-generate slug from organization name', async ({ page }) => {
    // Open create organization modal
    await page.click('button:has-text("Create Organization")');
    await expect(page.locator('[data-testid="organization-form-modal"]')).toBeVisible();
    
    // Enter organization name
    const orgName = 'Test Organization Inc';
    await page.fill('input[name="name"]', orgName);
    
    // Trigger slug generation (usually on blur or after typing)
    await page.blur('input[name="name"]');
    
    // Check if slug is auto-generated
    const slugInput = page.locator('input[name="slug"]');
    await expect(slugInput).toHaveValue('test-organization-inc');
  });

  test('should check slug availability', async ({ page }) => {
    // Open create organization modal
    await page.click('button:has-text("Create Organization")');
    await expect(page.locator('[data-testid="organization-form-modal"]')).toBeVisible();
    
    // Enter a unique slug
    await page.fill('input[name="slug"]', 'unique-test-org-123');
    
    // Wait for slug availability check
    await page.waitForTimeout(1000);
    
    // Check if slug is marked as available
    await expect(page.locator('text=✓ Available')).toBeVisible();
  });

  test('should create organization successfully', async ({ page }) => {
    // Open create organization modal
    await page.click('button:has-text("Create Organization")');
    await expect(page.locator('[data-testid="organization-form-modal"]')).toBeVisible();
    
    // Fill in organization details
    const timestamp = Date.now();
    const orgData = {
      name: `Test Organization ${timestamp}`,
      slug: `test-org-${timestamp}`,
      description: 'A test organization for E2E testing',
      contact_email: `test${timestamp}@example.com`,
      phone: '+1-555-0123',
      address: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      zip_code: '12345',
      country: 'United States',
      website: 'https://testorg.com',
      subscription_plan: 'basic',
      max_users: 25,
      max_cycles: 6,
      storage_limit_gb: 2
    };
    
    // Fill form fields
    await page.fill('input[name="name"]', orgData.name);
    await page.fill('input[name="slug"]', orgData.slug);
    await page.fill('textarea[name="description"]', orgData.description);
    await page.fill('input[name="contact_email"]', orgData.contact_email);
    await page.fill('input[name="phone"]', orgData.phone);
    await page.fill('input[name="address"]', orgData.address);
    await page.fill('input[name="city"]', orgData.city);
    await page.fill('input[name="state"]', orgData.state);
    await page.fill('input[name="zip_code"]', orgData.zip_code);
    await page.fill('input[name="country"]', orgData.country);
    await page.fill('input[name="website"]', orgData.website);
    await page.selectOption('select[name="subscription_plan"]', orgData.subscription_plan);
    await page.fill('input[name="max_users"]', orgData.max_users.toString());
    await page.fill('input[name="max_cycles"]', orgData.max_cycles.toString());
    await page.fill('input[name="storage_limit_gb"]', orgData.storage_limit_gb.toString());
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for success message or modal to close
    await page.waitForTimeout(2000);
    
    // Check if modal is closed
    await expect(page.locator('[data-testid="organization-form-modal"]')).not.toBeVisible();
    
    // Check if success message is shown
    await expect(page.locator('text=Organization created successfully')).toBeVisible();
    
    // Check if new organization appears in the list
    await expect(page.locator(`text=${orgData.name}`)).toBeVisible();
  });

  test('should handle organization creation errors gracefully', async ({ page }) => {
    // Open create organization modal
    await page.click('button:has-text("Create Organization")');
    await expect(page.locator('[data-testid="organization-form-modal"]')).toBeVisible();
    
    // Fill in organization with duplicate slug (should cause error)
    await page.fill('input[name="name"]', 'Duplicate Test Org');
    await page.fill('input[name="slug"]', 'acme-corp'); // This slug already exists
    await page.fill('input[name="contact_email"]', 'duplicate@example.com');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for error handling
    await page.waitForTimeout(2000);
    
    // Check if error message is shown
    await expect(page.locator('text=Slug is already taken')).toBeVisible();
  });

  test('should display organization details', async ({ page }) => {
    // Wait for organizations to load
    await page.waitForSelector('[data-testid="organizations-list"]');
    
    // Click on first organization (if any exist)
    const firstOrg = page.locator('[data-testid="organization-item"]').first();
    if (await firstOrg.count() > 0) {
      await firstOrg.click();
      
      // Check if organization details are displayed
      await expect(page.locator('[data-testid="organization-details"]')).toBeVisible();
      
      // Check if key details are shown
      await expect(page.locator('[data-testid="org-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="org-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="org-plan"]')).toBeVisible();
    }
  });

  test('should edit organization', async ({ page }) => {
    // Wait for organizations to load
    await page.waitForSelector('[data-testid="organizations-list"]');
    
    // Click edit button on first organization (if any exist)
    const editButton = page.locator('[data-testid="edit-organization"]').first();
    if (await editButton.count() > 0) {
      await editButton.click();
      
      // Check if edit modal/form is open
      await expect(page.locator('[data-testid="organization-form-modal"]')).toBeVisible();
      
      // Modify organization name
      const nameInput = page.locator('input[name="name"]');
      const currentName = await nameInput.inputValue();
      const newName = `${currentName} (Updated)`;
      
      await nameInput.clear();
      await nameInput.fill(newName);
      
      // Submit changes
      await page.click('button[type="submit"]');
      
      // Wait for update to complete
      await page.waitForTimeout(2000);
      
      // Check if modal is closed
      await expect(page.locator('[data-testid="organization-form-modal"]')).not.toBeVisible();
      
      // Check if success message is shown
      await expect(page.locator('text=Organization updated successfully')).toBeVisible();
    }
  });

  test('should delete organization with confirmation', async ({ page }) => {
    // Wait for organizations to load
    await page.waitForSelector('[data-testid="organizations-list"]');
    
    // Click delete button on first organization (if any exist)
    const deleteButton = page.locator('[data-testid="delete-organization"]').first();
    if (await deleteButton.count() > 0) {
      await deleteButton.click();
      
      // Check if confirmation dialog is shown
      await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
      
      // Confirm deletion
      await page.click('button:has-text("Delete")');
      
      // Wait for deletion to complete
      await page.waitForTimeout(2000);
      
      // Check if success message is shown
      await expect(page.locator('text=Organization deleted successfully')).toBeVisible();
    }
  });

  test('should search and filter organizations', async ({ page }) => {
    // Check if search input is present
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    
    // Test search functionality
    await searchInput.fill('Acme');
    await page.waitForTimeout(1000);
    
    // Check if results are filtered
    const orgItems = page.locator('[data-testid="organization-item"]');
    const count = await orgItems.count();
    
    if (count > 0) {
      // Verify that displayed organizations contain the search term
      for (let i = 0; i < count; i++) {
        const orgText = await orgItems.nth(i).textContent();
        expect(orgText?.toLowerCase()).toContain('acme');
      }
    }
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(1000);
  });

  test('should paginate through organizations', async ({ page }) => {
    // Check if pagination controls are present
    const pagination = page.locator('[data-testid="pagination"]');
    
    if (await pagination.count() > 0) {
      // Check if next/previous buttons are present
      const nextButton = page.locator('button:has-text("Next")');
      const prevButton = page.locator('button:has-text("Previous")');
      
      if (await nextButton.count() > 0) {
        // Click next page
        await nextButton.click();
        await page.waitForTimeout(1000);
        
        // Check if page changed
        await expect(page.locator('[data-testid="current-page"]')).toContainText('2');
      }
    }
  });

  test('should display organization statistics', async ({ page }) => {
    // Check if statistics cards are displayed
    await expect(page.locator('[data-testid="total-organizations"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-organizations"]')).toBeVisible();
    await expect(page.locator('[data-testid="organizations-by-plan"]')).toBeVisible();
    
    // Check if statistics have numeric values
    const totalOrgs = page.locator('[data-testid="total-organizations"]');
    const totalText = await totalOrgs.textContent();
    expect(totalText).toMatch(/\d+/); // Should contain at least one digit
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept network requests to simulate errors
    await page.route('**/api/v1/admin/organizations', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    // Try to create organization
    await page.click('button:has-text("Create Organization")');
    await page.fill('input[name="name"]', 'Test Org');
    await page.fill('input[name="contact_email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    // Check if error message is displayed
    await expect(page.locator('text=Failed to create organization')).toBeVisible();
  });
});

test.describe('Organization API Integration', () => {
  test('should verify API endpoints are working', async ({ request }) => {
    // Test organizations list endpoint
    const response = await request.get('http://localhost:5000/api/v1/admin/organizations');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('should verify slug availability endpoint', async ({ request }) => {
    // Test slug availability check
    const response = await request.get('http://localhost:5000/api/v1/admin/organizations/check-slug?slug=test-unique-slug');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('available');
  });

  test('should verify organization stats endpoint', async ({ request }) => {
    // Test organization statistics endpoint
    const response = await request.get('http://localhost:5000/api/v1/admin/organizations/stats');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('total_organizations');
    expect(data.data).toHaveProperty('active_organizations');
  });
});

