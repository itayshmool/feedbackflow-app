// frontend/e2e/simple-dashboard.spec.ts

import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/auth.helper';

test.describe('Simple Dashboard Test', () => {
  test('Login and verify dashboard content', async ({ page }) => {
    // Login
    await loginAsUser(page, 'efratr@wix.com');
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Take a screenshot
    await page.screenshot({ path: 'simple-dashboard.png' });
    console.log('Screenshot saved as simple-dashboard.png');
    
    // Check for any text on the page
    const allText = await page.textContent('body');
    console.log('Page content preview:', allText?.substring(0, 500));
    
    // Look for specific elements
    const managerDashboard = page.locator('text=Manager Dashboard');
    const welcomeText = page.locator('text=Welcome back');
    const feedbackLink = page.locator('text=Feedback');
    
    console.log('Manager Dashboard visible:', await managerDashboard.isVisible());
    console.log('Welcome text visible:', await welcomeText.isVisible());
    console.log('Feedback link visible:', await feedbackLink.isVisible());
    
    // Try to click on Feedback link
    if (await feedbackLink.isVisible()) {
      await feedbackLink.click();
      await page.waitForTimeout(2000);
      
      const feedbackUrl = page.url();
      console.log('After clicking Feedback, URL:', feedbackUrl);
      
      // Take another screenshot
      await page.screenshot({ path: 'simple-feedback.png' });
      console.log('Feedback page screenshot saved as simple-feedback.png');
    }
  });
});




