// frontend/e2e/helpers/auth.helper.ts

import { Page } from '@playwright/test';

/**
 * Set up authentication by making a real login API call to get JWT cookie
 */
export async function setupAuthAs(page: Page, email: string) {
  // Navigate to the app first to establish the domain
  await page.goto('http://localhost:3006');
  
  // Make a real login API call to get JWT cookie
  const response = await page.request.post('http://localhost:5000/api/v1/auth/login/mock', {
    data: { 
      email,
      password: 'test123' // Mock password - backend doesn't validate it
    },
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok()) {
    throw new Error(`Login failed for ${email}: ${response.status()} ${await response.text()}`);
  }
  
  const responseData = await response.json();
  console.log(`Login response for ${email}:`, responseData.success ? 'Success' : 'Failed');
  
  // Extract the cookie from the response
  const cookies = await response.headersArray();
  const setCookieHeader = cookies.find(h => h.name.toLowerCase() === 'set-cookie');
  
  if (setCookieHeader) {
    // Parse and set the cookie in the browser context
    const cookieValue = setCookieHeader.value;
    const tokenMatch = cookieValue.match(/authToken=([^;]+)/);
    
    if (tokenMatch) {
      await page.context().addCookies([{
        name: 'authToken',
        value: tokenMatch[1],
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }]);
      
      console.log(`Successfully set JWT cookie for ${email}`);
    }
  }
  
  // Navigate to dashboard
  await page.goto('http://localhost:3006/dashboard');
  
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
  // Call the logout endpoint to clear the JWT cookie
  try {
    await page.request.post('http://localhost:5000/api/v1/auth/logout');
  } catch (error) {
    console.log('Logout API call failed, clearing cookies manually');
  }
  
  // Clear cookies and storage
  await page.context().clearCookies();
  
  try {
    await page.goto('http://localhost:3006');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch (error) {
    console.log('Could not clear storage');
  }
}

/**
 * Clear authentication state
 */
export async function clearAuth(page: Page) {
  // Clear cookies (including JWT token)
  await page.context().clearCookies();
  
  // Navigate to a valid page first before clearing storage
  try {
    await page.goto('http://localhost:3006');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch (error) {
    console.log('Could not clear storage, only cleared cookies');
  }
}

