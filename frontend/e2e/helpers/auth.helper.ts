// frontend/e2e/helpers/auth.helper.ts

import { Page } from '@playwright/test';

/**
 * Set up authentication state directly in localStorage and navigate to dashboard
 */
export async function setupAuthAs(page: Page, email: string) {
  // First navigate to the app to establish the domain
  await page.goto('http://localhost:3008');
  
  // User data from database query
  const userData = {
    'efratr@wix.com': {
      id: '1764d577-3bc6-417b-9d47-e1b6115f09e8',
      name: 'Efrat Regev',
      position: 'UX',
      roles: ['employee', 'manager']
    },
    'idanc@wix.com': {
      id: '10420848-9173-49e3-8bbd-47ec740bff43',
      name: 'Idan Cohen',
      position: 'Server',
      roles: ['manager']
    }
  };
  
  const user = userData[email as keyof typeof userData];
  if (!user) {
    throw new Error(`Unknown user email: ${email}`);
  }
  
  // Mock auth data structure matching Zustand persist format
  const mockAuthData = {
    state: {
      user: {
        id: user.id,
        email: email,
        name: user.name,
        avatarUrl: null,
        isActive: true,
        emailVerified: false,
        lastLoginAt: null,
        createdAt: '2025-10-19T09:08:14.554Z',
        updatedAt: '2025-10-19T09:08:14.554Z',
        organizationId: '44c23f45-8e55-473e-91c7-3994dcf68f1d',
        organizationName: 'wix.com',
        department: null,
        position: user.position,
        roles: user.roles
      },
      token: `mock-jwt-token-${email}-${Date.now()}`,
      isAuthenticated: true,
      isLoading: false
    },
    version: 0
  };
  
  // Set auth data in localStorage
  await page.evaluate((authData) => {
    localStorage.setItem('auth-storage', JSON.stringify(authData));
  }, mockAuthData);
  
  // Navigate to dashboard
  await page.goto('/dashboard');
  
  // Wait for sidebar to confirm page loaded
  await page.waitForSelector('a[href="/feedback"]', { timeout: 10000 });
  
  console.log(`Successfully set up auth for ${email} and navigated to dashboard`);
}

/**
 * Legacy login function - kept for backward compatibility but deprecated
 * @deprecated Use setupAuthAs instead
 */
export async function loginAsUser(page: Page, email: string, password: string = 'password') {
  console.log('Warning: loginAsUser is deprecated, use setupAuthAs instead');
  return setupAuthAs(page, email);
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
  // Simply clear localStorage and navigate away
  try {
    await page.goto('http://localhost:3008'); // Use the correct base URL
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch (error) {
    // If navigation fails, just clear cookies
    console.log('Could not clear storage, only cleared cookies');
  }
}

/**
 * Clear authentication state
 */
export async function clearAuth(page: Page) {
  await page.context().clearCookies();
  
  // Navigate to a valid page first before clearing storage
  try {
    await page.goto('http://localhost:3007');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch (error) {
    // If navigation fails, just clear cookies
    console.log('Could not clear storage, only cleared cookies');
  }
}

