// frontend/e2e/debug-dom.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Debug DOM Structure', () => {
  test('Check DOM structure of dashboard', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => {
      console.log(`Console ${msg.type()}:`, msg.text());
    });
    
    await page.goto('/login');
    
    // Login
    await page.fill('input[type="email"]', 'efratr@wix.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    await page.waitForTimeout(5000);
    
    // Check the DOM structure
    const html = await page.innerHTML('html');
    console.log('HTML length:', html.length);
    console.log('HTML preview:', html.substring(0, 500));
    
    // Check for specific elements in the DOM
    const bodyHTML = await page.innerHTML('body');
    console.log('Body HTML length:', bodyHTML.length);
    console.log('Body HTML preview:', bodyHTML.substring(0, 500));
    
    // Check for React root
    const rootHTML = await page.innerHTML('#root');
    console.log('Root HTML length:', rootHTML.length);
    console.log('Root HTML preview:', rootHTML.substring(0, 500));
    
    // Check for any elements with specific classes
    const elements = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const elementInfo = [];
      
      for (let i = 0; i < Math.min(allElements.length, 20); i++) {
        const el = allElements[i];
        elementInfo.push({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          textContent: el.textContent?.substring(0, 50)
        });
      }
      
      return elementInfo;
    });
    
    console.log('First 20 elements:', elements);
    
    // Check for any hidden elements
    const hiddenElements = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const hidden = [];
      
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          hidden.push({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            textContent: el.textContent?.substring(0, 50)
          });
        }
      }
      
      return hidden;
    });
    
    console.log('Hidden elements:', hiddenElements);
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-dom.png' });
    console.log('Screenshot saved as debug-dom.png');
  });
});




