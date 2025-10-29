// frontend/e2e/api-integration.spec.ts

import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should successfully authenticate and receive valid token', async ({ page }) => {
    // Check that authentication was successful by looking for user info
    await expect(page.locator('text=Test User')).toBeVisible();
    
    // Verify API calls are being made with proper headers
    const requests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/v1/')) {
        requests.push(request);
      }
    });

    // Navigate to organizations to trigger API calls
    await page.click('text=Organizations');
    
    // Wait for API calls to complete
    await page.waitForTimeout(1000);
    
    // Check that API calls have proper authorization headers
    const authRequests = requests.filter(req => 
      req.headers()['authorization']?.startsWith('Bearer ')
    );
    
    expect(authRequests.length).toBeGreaterThan(0);
  });

  test('should handle API response for organizations list', async ({ page }) => {
    // Mock API response
    await page.route('**/api/v1/admin/organizations', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organizations: [
            {
              id: '1',
              name: 'Mock Organization',
              slug: 'mock-org',
              description: 'A mock organization for testing',
              contactEmail: 'mock@example.com',
              isActive: true,
              status: 'active',
              subscriptionPlan: 'basic',
              maxUsers: 10,
              maxCycles: 5,
              storageLimitGb: 10,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]
        })
      });
    });

    // Navigate to organizations
    await page.click('text=Organizations');
    
    // Should display mock organization
    await expect(page.locator('text=Mock Organization')).toBeVisible();
    await expect(page.locator('text=mock@example.com')).toBeVisible();
  });

  test('should handle API response for organization statistics', async ({ page }) => {
    // Mock API response
    await page.route('**/api/v1/admin/organizations/stats', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalOrganizations: 5,
          activeOrganizations: 4,
          organizationsByPlan: {
            free: 1,
            basic: 2,
            professional: 1,
            enterprise: 1
          },
          averageUsersPerOrg: 8,
          totalDepartments: 12,
          totalTeams: 25,
          totalUsers: 40
        })
      });
    });

    // Navigate to organizations
    await page.click('text=Organizations');
    
    // Should display updated statistics
    await expect(page.locator('text=5')).toBeVisible(); // Total organizations
    await expect(page.locator('text=4')).toBeVisible(); // Active organizations
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/admin/organizations', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        })
      });
    });

    // Navigate to organizations
    await page.click('text=Organizations');
    
    // Should show error message
    await expect(page.locator('text=Failed to load organizations')).toBeVisible();
    
    // Should show retry option
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test('should handle network timeout', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/v1/admin/organizations', async route => {
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
      await route.continue();
    });

    // Navigate to organizations
    await page.click('text=Organizations');
    
    // Should show loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
  });

  test('should handle 401 unauthorized response', async ({ page }) => {
    // Mock 401 response
    await page.route('**/api/v1/admin/organizations', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Unauthorized',
          code: 'UNAUTHORIZED'
        })
      });
    });

    // Navigate to organizations
    await page.click('text=Organizations');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('should handle 403 forbidden response', async ({ page }) => {
    // Mock 403 response
    await page.route('**/api/v1/admin/organizations', async route => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Forbidden',
          code: 'FORBIDDEN'
        })
      });
    });

    // Navigate to organizations
    await page.click('text=Organizations');
    
    // Should show forbidden message
    await expect(page.locator('text=You do not have permission')).toBeVisible();
  });

  test('should handle malformed API response', async ({ page }) => {
    // Mock malformed response
    await page.route('**/api/v1/admin/organizations', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response'
      });
    });

    // Navigate to organizations
    await page.click('text=Organizations');
    
    // Should handle gracefully
    await expect(page.locator('text=Failed to load organizations')).toBeVisible();
  });

  test('should handle empty API response', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/v1/admin/organizations', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ organizations: [] })
      });
    });

    // Navigate to organizations
    await page.click('text=Organizations');
    
    // Should show empty state
    await expect(page.locator('text=No organizations found')).toBeVisible();
  });

  test('should make API calls with correct request headers', async ({ page }) => {
    const requests: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/v1/admin/organizations')) {
        requests.push(request);
      }
    });

    // Navigate to organizations
    await page.click('text=Organizations');
    
    // Wait for request to complete
    await page.waitForTimeout(1000);
    
    // Check request headers
    expect(requests.length).toBeGreaterThan(0);
    const request = requests[0];
    
    expect(request.headers()['content-type']).toBe('application/json');
    expect(request.headers()['authorization']).toMatch(/^Bearer /);
  });

  test('should handle API rate limiting', async ({ page }) => {
    // Mock rate limit response
    await page.route('**/api/v1/admin/organizations', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 60
        }),
        headers: {
          'Retry-After': '60'
        }
      });
    });

    // Navigate to organizations
    await page.click('text=Organizations');
    
    // Should show rate limit message
    await expect(page.locator('text=Too many requests')).toBeVisible();
  });

  test('should handle API pagination', async ({ page }) => {
    // Mock paginated response
    await page.route('**/api/v1/admin/organizations*', async route => {
      const url = new URL(route.request().url());
      const pageParam = url.searchParams.get('page') || '1';
      const limitParam = url.searchParams.get('limit') || '10';
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organizations: [
            {
              id: pageParam,
              name: `Organization ${pageParam}`,
              slug: `org-${pageParam}`,
              description: `Description for organization ${pageParam}`,
              contactEmail: `org${pageParam}@example.com`,
              isActive: true,
              status: 'active',
              subscriptionPlan: 'basic',
              maxUsers: 10,
              maxCycles: 5,
              storageLimitGb: 10,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          pagination: {
            page: parseInt(pageParam),
            limit: parseInt(limitParam),
            total: 25,
            totalPages: 3,
            hasNext: parseInt(pageParam) < 3,
            hasPrev: parseInt(pageParam) > 1
          }
        })
      });
    });

    // Navigate to organizations
    await page.click('text=Organizations');
    
    // Should show first page
    await expect(page.locator('text=Organization 1')).toBeVisible();
    
    // Test pagination if available
    const nextButton = page.locator('button:has-text("Next")');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await expect(page.locator('text=Organization 2')).toBeVisible();
    }
  });

  test('should handle API search functionality', async ({ page }) => {
    // Mock search response
    await page.route('**/api/v1/admin/organizations/search*', async route => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('q');
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organizations: query ? [
            {
              id: '1',
              name: `Search Result for ${query}`,
              slug: `search-${query}`,
              description: `Found by searching for ${query}`,
              contactEmail: `search@example.com`,
              isActive: true,
              status: 'active',
              subscriptionPlan: 'basic',
              maxUsers: 10,
              maxCycles: 5,
              storageLimitGb: 10,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ] : []
        })
      });
    });

    // Navigate to organizations
    await page.click('text=Organizations');
    
    // Perform search
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.keyboard.press('Enter');
      
      // Should show search results
      await expect(page.locator('text=Search Result for test')).toBeVisible();
    }
  });
});
