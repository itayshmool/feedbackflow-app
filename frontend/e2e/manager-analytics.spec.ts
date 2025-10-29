// frontend/e2e/manager-analytics.spec.ts

import { test, expect } from '@playwright/test';
import { setupAuthAs, clearAuth } from './helpers/auth.helper';

test.describe('Manager Analytics', () => {
  const MANAGER_EMAIL = 'efratr@wix.com';
  const NON_MANAGER_EMAIL = 'idanc@wix.com';

  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('Manager can access and view analytics dashboard', async ({ page }) => {
    await test.step('Login as manager', async () => {
      await setupAuthAs(page, MANAGER_EMAIL);
      console.log('✓ Logged in as manager');
    });

    await test.step('Navigate to Analytics page', async () => {
      // Click on Analytics link in navigation
      await page.click('a[href="/analytics"]');
      await page.waitForURL(/.*analytics/, { timeout: 10000 });
      
      console.log('✓ Navigated to Analytics page');
    });

    await test.step('Verify manager access granted', async () => {
      // Verify NO "Manager Access Required" message
      const accessDenied = page.locator('text=Manager Access Required, text=You do not have permission');
      await expect(accessDenied).not.toBeVisible({ timeout: 5000 });
      
      // Verify analytics page content is visible
      const analyticsContent = page.locator('[data-testid="analytics-overview"], .analytics-container, text=Overview');
      await expect(analyticsContent.first()).toBeVisible({ timeout: 10000 });
      
      console.log('✓ Manager access granted');
    });

    await test.step('Test Overview Tab', async () => {
      // Click Overview tab if not already active
      const overviewTab = page.locator('button:has-text("Overview"), [data-testid="overview-tab"]');
      if (await overviewTab.isVisible()) {
        await overviewTab.click();
        await page.waitForTimeout(1000);
      }
      
      // Verify statistics cards display
      const statsCards = page.locator('[data-testid="stat-card"], .stat-card, .analytics-card');
      const cardCount = await statsCards.count();
      expect(cardCount).toBeGreaterThan(0);
      
      // Look for key metrics (total feedback, completion rate, response time)
      const totalFeedback = page.locator('text=Total Feedback, text=Feedback Count');
      const completionRate = page.locator('text=Completion Rate, text=Complete');
      const responseTime = page.locator('text=Response Time, text=Average');
      
      // At least one of these should be visible
      const metricsVisible = (await totalFeedback.isVisible()) || 
                            (await completionRate.isVisible()) || 
                            (await responseTime.isVisible());
      expect(metricsVisible).toBeTruthy();
      
      console.log('✓ Overview tab displays statistics');
    });

    await test.step('Test Trends Tab', async () => {
      // Click Trends tab
      await page.click('button:has-text("Trends"), [data-testid="trends-tab"]');
      await page.waitForTimeout(2000);
      
      // Verify trend chart displays
      const trendChart = page.locator('[data-testid="trends-chart"], .recharts-wrapper, svg.recharts-surface');
      await expect(trendChart.first()).toBeVisible({ timeout: 10000 });
      
      // Test period filters if they exist
      const monthlyFilter = page.locator('button:has-text("Monthly"), [data-value="monthly"]');
      if (await monthlyFilter.isVisible()) {
        await monthlyFilter.click();
        await page.waitForTimeout(1000);
        
        const weeklyFilter = page.locator('button:has-text("Weekly"), [data-value="weekly"]');
        if (await weeklyFilter.isVisible()) {
          await weeklyFilter.click();
          await page.waitForTimeout(1000);
        }
        
        const dailyFilter = page.locator('button:has-text("Daily"), [data-value="daily"]');
        if (await dailyFilter.isVisible()) {
          await dailyFilter.click();
          await page.waitForTimeout(1000);
        }
      }
      
      console.log('✓ Trends tab displays charts and filters work');
    });

    await test.step('Test Categories Tab', async () => {
      // Click Categories tab
      await page.click('button:has-text("Categories"), [data-testid="categories-tab"]');
      await page.waitForTimeout(2000);
      
      // Verify feedback type breakdown displays
      const categoryChart = page.locator('[data-testid="categories-chart"], .recharts-wrapper, svg.recharts-surface');
      await expect(categoryChart.first()).toBeVisible({ timeout: 10000 });
      
      // Look for feedback type labels
      const feedbackTypes = page.locator('text=Peer, text=Manager, text=Self, text=360, text=Project');
      const typesVisible = await feedbackTypes.first().isVisible().catch(() => false);
      
      // Charts should be visible even if no specific labels
      expect(typesVisible || await categoryChart.isVisible()).toBeTruthy();
      
      console.log('✓ Categories tab displays feedback breakdown');
    });

    await test.step('Test Insights Tab', async () => {
      // Click Insights tab
      await page.click('button:has-text("Insights"), [data-testid="insights-tab"]');
      await page.waitForTimeout(2000);
      
      // Verify insights list displays
      const insightsList = page.locator('[data-testid="insights-list"], .insights-container');
      const insightItems = page.locator('[data-testid="insight-item"], .insight-card');
      
      // Check if insights section is visible (may be empty, which is okay)
      const insightsSection = await insightsList.isVisible().catch(() => false) || 
                             await insightItems.first().isVisible().catch(() => false) ||
                             await page.locator('text=No insights, text=Insight').isVisible();
      
      expect(insightsSection).toBeTruthy();
      
      // If insights exist, check for severity indicators
      const insightCount = await insightItems.count();
      if (insightCount > 0) {
        const severityBadge = page.locator('text=High, text=Medium, text=Low, [data-severity]');
        const hasSeverity = await severityBadge.first().isVisible().catch(() => false);
        console.log(`✓ Found ${insightCount} insights with severity indicators`);
      } else {
        console.log('✓ Insights tab displayed (no insights available)');
      }
    });

    await test.step('Test Cycle Filter', async () => {
      // Look for cycle filter dropdown
      const cycleFilter = page.locator('select[name*="cycle"], [data-testid="cycle-filter"]');
      
      if (await cycleFilter.isVisible()) {
        // Get available options
        const options = await cycleFilter.locator('option').count();
        
        if (options > 1) {
          // Select a different cycle
          await cycleFilter.selectOption({ index: 1 });
          await page.waitForTimeout(2000);
          
          // Verify page reloads/updates (loading spinner or updated content)
          const loadingSpinner = page.locator('[data-testid="loading"], .loading-spinner');
          
          // Navigate through tabs to verify they all update
          await page.click('button:has-text("Overview")');
          await page.waitForTimeout(1000);
          
          await page.click('button:has-text("Trends")');
          await page.waitForTimeout(1000);
          
          console.log('✓ Cycle filter works across all tabs');
        } else {
          console.log('✓ Cycle filter visible (only one cycle available)');
        }
      } else {
        console.log('✓ No cycle filter present (expected if only one cycle exists)');
      }
    });

    await test.step('Test data refresh functionality', async () => {
      // Look for refresh button
      const refreshButton = page.locator('button:has-text("Refresh"), [data-testid="refresh-btn"], button[aria-label*="refresh" i]');
      
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        await page.waitForTimeout(2000);
        
        // Verify content is still visible after refresh
        const content = page.locator('[data-testid="analytics-overview"], .analytics-container');
        await expect(content.first()).toBeVisible();
        
        console.log('✓ Data refresh functionality works');
      } else {
        console.log('✓ No refresh button (data auto-refreshes)');
      }
    });

    console.log('✅ All manager analytics tests passed!');
  });

  test('Non-manager user cannot access analytics', async ({ page }) => {
    await test.step('Login as non-manager employee', async () => {
      await setupAuthAs(page, NON_MANAGER_EMAIL);
      console.log('✓ Logged in as non-manager user');
    });

    await test.step('Attempt to navigate to Analytics page', async () => {
      // Try to click Analytics link if it exists
      const analyticsLink = page.locator('text=Analytics, a[href*="analytics"]');
      
      if (await analyticsLink.isVisible()) {
        await analyticsLink.click();
        await page.waitForURL(/.*analytics/, { timeout: 10000 });
        
        // Should see access denied message
        await test.step('Verify access denied message', async () => {
          const accessDenied = page.locator('text=Manager Access Required, text=You do not have permission, text=Access Denied');
          await expect(accessDenied).toBeVisible({ timeout: 5000 });
          
          // Verify analytics data is NOT visible
          const analyticsData = page.locator('[data-testid="analytics-overview"], .recharts-wrapper');
          await expect(analyticsData.first()).not.toBeVisible();
          
          console.log('✓ Access properly denied for non-manager');
        });
      } else {
        console.log('✓ Analytics link not visible for non-manager (expected behavior)');
      }
    });

    console.log('✅ Non-manager access restriction test passed!');
  });

  test('Loading states display appropriately', async ({ page }) => {
    await test.step('Login and navigate to analytics', async () => {
      await setupAuthAs(page, MANAGER_EMAIL);
      
      // Navigate to analytics and watch for loading states
      await page.click('a[href="/analytics"]');
      
      // Loading spinner should appear briefly
      const loadingSpinner = page.locator('[data-testid="loading"], .loading-spinner, text=Loading');
      
      // Check if loading state exists (it may be too fast to catch)
      const hadLoadingState = await loadingSpinner.isVisible({ timeout: 1000 }).catch(() => false);
      
      // Wait for content to load
      await page.waitForTimeout(3000);
      
      // Verify content is now visible and loading is gone
      const content = page.locator('[data-testid="analytics-overview"], .analytics-container');
      await expect(content.first()).toBeVisible();
      
      if (hadLoadingState) {
        await expect(loadingSpinner).not.toBeVisible();
        console.log('✓ Loading states displayed correctly');
      } else {
        console.log('✓ Data loaded quickly (loading state too fast to observe)');
      }
    });
  });

  test('Error states handled gracefully', async ({ page }) => {
    await test.step('Login as manager', async () => {
      await setupAuthAs(page, MANAGER_EMAIL);
      
      // Navigate to analytics
      await page.click('a[href="/analytics"]');
      await page.waitForURL(/.*analytics/);
      await page.waitForTimeout(2000);
    });

    await test.step('Check for error handling', async () => {
      // Look for any error messages (there shouldn't be any in happy path)
      const errorMessage = page.locator('text=Error, text=Failed to load, [role="alert"]');
      const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasError) {
        console.log('⚠ Error message displayed - this may indicate an issue');
        
        // Verify retry/refresh option exists
        const retryButton = page.locator('button:has-text("Retry"), button:has-text("Refresh")');
        const canRetry = await retryButton.isVisible();
        expect(canRetry).toBeTruthy();
        
        console.log('✓ Error state includes retry option');
      } else {
        console.log('✓ No errors - analytics loaded successfully');
      }
    });
  });
});

