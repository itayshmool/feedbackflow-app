// frontend/e2e/debug-loading-state.spec.ts

import { test, expect } from '@playwright/test';
import { clearAuth } from './helpers/auth.helper';

test('Debug isLoading state after login', async ({ page }) => {
  await clearAuth(page);
  
  // Go to login page
  await page.goto('/login');
  
  // Login
  await page.fill('input[type="email"]', 'efratr@wix.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Wait for navigation
  await page.waitForTimeout(2000);
  
  console.log('Current URL:', page.url());
  
  // Check isLoading state multiple times
  for (let i = 0; i < 10; i++) {
    const authState = await page.evaluate(() => {
      const stored = localStorage.getItem('auth-storage');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return {
        isLoading: parsed.state?.isLoading,
        isAuthenticated: parsed.state?.isAuthenticated,
        hasUser: !!parsed.state?.user,
        hasToken: !!parsed.state?.token
      };
    });
    
    console.log(`Check ${i + 1}: Auth state:`, authState);
    
    // Check if App is showing loading spinner
    const loadingSpinnerVisible = await page.locator('.animate-spin').isVisible().catch(() => false);
    console.log(`Check ${i + 1}: Loading spinner visible:`, loadingSpinnerVisible);
    
    //Check if ProtectedRoute is showing loading
    const protectedRouteLoading = await page.locator('div.min-h-screen:has(div.animate-spin)').isVisible().catch(() => false);
    console.log(`Check ${i + 1}: ProtectedRoute loading:`, protectedRouteLoading);
    
    // Check what's in the root div
    const rootHTML = await page.locator('#root').innerHTML();
    console.log(`Check ${i + 1}: Root HTML length:`, rootHTML.length);
    console.log(`Check ${i + 1}: Has AppRouter:`, rootHTML.includes('FeedbackFlow'));
    console.log(`Check ${i + 1}: Has LoadingSpinner:`, rootHTML.includes('animate-spin'));
    
    await page.waitForTimeout(1000);
  }
  
  await page.screenshot({ path: 'debug-loading-state.png' });
});





