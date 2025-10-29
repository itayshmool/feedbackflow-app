// frontend/e2e/feedback-workflow.spec.ts

import { test, expect } from '@playwright/test';
import { setupAuthAs, logout, clearAuth } from './helpers/auth.helper';

test.describe('Feedback Workflow - Complete Lifecycle', () => {
  const GIVER_EMAIL = 'efratr@wix.com';
  const RECEIVER_EMAIL = 'idanc@wix.com'; // Employee reporting to efratr
  
  let feedbackId: string;
  let feedbackTitle: string;

  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await clearAuth(page);
  });

  test('Complete feedback workflow: Draft → Submit → Acknowledge → Complete', async ({ page }) => {
    // Generate unique feedback title for this test run
    feedbackTitle = `E2E Test Feedback ${Date.now()}`;

    // ============================================================
    // Step 1-4: Giver creates and saves feedback as draft
    // ============================================================
        await test.step('Login as giver and create draft feedback', async () => {
          await setupAuthAs(page, GIVER_EMAIL);
      
      // Navigate to Feedback page first
      await page.click('a[href="/feedback"]');
      await page.waitForURL(/.*feedback/);
      
      // Then click Give Feedback button
      await page.click('button:has-text("Give Feedback")');
      await page.waitForTimeout(1000);
      
      // Fill out the feedback form
      // Select receiver
      await page.click('select[name="toUserId"], [data-testid="receiver-select"]');
      await page.click(`option:has-text("${RECEIVER_EMAIL}"), text=${RECEIVER_EMAIL}`);
      
      // Select feedback cycle (select first available active cycle)
      await page.click('select[name="cycleId"], [data-testid="cycle-select"]');
      await page.click('option:not([value=""]):first-of-type');
      
      // Add title if there's a title field
      const titleInput = page.locator('input[name="title"], [data-testid="feedback-title"]');
      if (await titleInput.isVisible()) {
        await titleInput.fill(feedbackTitle);
      }
      
      // Add strengths
      await page.click('button:has-text("Add Strength"), [data-testid="add-strength-btn"]');
      await page.fill('textarea[name*="strength"], textarea[placeholder*="strength" i]', 
        'Excellent problem-solving skills and technical expertise');
      
      // Add areas for improvement
      await page.click('button:has-text("Add Area"), button:has-text("Add Improvement"), [data-testid="add-improvement-btn"]');
      await page.fill('textarea[name*="improvement"], textarea[name*="area"], textarea[placeholder*="improvement" i]', 
        'Could improve communication with stakeholders');
      
      // Save as draft
      await page.click('button:has-text("Save as Draft"), [data-testid="save-draft-btn"]');
      
      // Wait for success message or redirect
      await page.waitForTimeout(2000);
      
      console.log('✓ Draft feedback created');
    });

    // ============================================================
    // Step 5: Verify draft appears in Drafts tab
    // ============================================================
    await test.step('Verify draft appears in Drafts tab', async () => {
      // Navigate to feedback list
      await page.click('a[href*="feedback"]');
      await page.waitForURL(/.*feedback/);
      
      // Click on Drafts tab
      await page.click('button:has-text("Drafts"), [data-testid="drafts-tab"]');
      await page.waitForTimeout(1000);
      
      // Verify the draft appears in the list
      const draftFeedback = page.locator(`text=${feedbackTitle}, text=Excellent problem-solving`).first();
      await expect(draftFeedback).toBeVisible({ timeout: 5000 });
      
      console.log('✓ Draft visible in Drafts tab');
    });

    // ============================================================
    // Step 6-7: Open draft, edit it, and submit
    // ============================================================
    await test.step('Edit draft and submit feedback', async () => {
      // Click on the draft to open it
      await page.click(`text=${feedbackTitle}, text=Excellent problem-solving`);
      await page.waitForTimeout(1000);
      
      // If not in edit mode, click edit button
      const editButton = page.locator('button:has-text("Edit")');
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(500);
      }
      
      // Add another strength
      await page.click('button:has-text("Add Strength"), [data-testid="add-strength-btn"]');
      const strengthInputs = page.locator('textarea[name*="strength"], textarea[placeholder*="strength" i]');
      await strengthInputs.last().fill('Great team collaboration and mentorship abilities');
      
      // Submit the feedback
      await page.click('button:has-text("Submit"), [data-testid="submit-feedback-btn"]');
      await page.waitForTimeout(2000);
      
      console.log('✓ Draft edited and submitted');
    });

    // ============================================================
    // Step 8: Verify feedback status is SUBMITTED
    // ============================================================
    await test.step('Verify feedback status is SUBMITTED', async () => {
      // Check for SUBMITTED status badge
      const statusBadge = page.locator('text=Submitted, [data-status="submitted"]');
      await expect(statusBadge.first()).toBeVisible({ timeout: 5000 });
      
      console.log('✓ Feedback status is SUBMITTED');
    });

    // ============================================================
    // Step 9-12: Logout, login as receiver, and acknowledge
    // ============================================================
    await test.step('Receiver acknowledges feedback', async () => {
      // Logout as giver
      await logout(page);
      
      // Login as receiver
      await setupAuthAs(page, RECEIVER_EMAIL);
      
      // Navigate to feedback list
      await page.click('a[href*="feedback"]');
      await page.waitForURL(/.*feedback/);
      
      // Click on "Received" tab to see feedback received
      await page.click('button:has-text("Received"), [data-testid="received-tab"]');
      await page.waitForTimeout(1000);
      
      // Find and click on the submitted feedback
      await page.click(`text=${feedbackTitle}, text=Excellent problem-solving`);
      await page.waitForTimeout(1000);
      
      // Click acknowledge button
      await page.click('button:has-text("Acknowledge"), [data-testid="acknowledge-btn"]');
      await page.waitForTimeout(500);
      
      // Fill acknowledgment message
      const ackMessage = page.locator('textarea[name*="comment"], textarea[name*="message"], textarea[placeholder*="message" i]');
      await ackMessage.fill('Thank you for the valuable feedback. I appreciate your insights and will work on improving my communication skills.');
      
      // Submit acknowledgment
      await page.click('button:has-text("Submit"), button:has-text("Confirm"), button:has-text("Acknowledge")');
      await page.waitForTimeout(2000);
      
      console.log('✓ Feedback acknowledged by receiver');
    });

    // ============================================================
    // Step 13: Verify acknowledgment message displays
    // ============================================================
    await test.step('Verify acknowledgment displays correctly', async () => {
      // Look for the acknowledgment message in the feedback detail
      const ackSection = page.locator('text=Thank you for the valuable feedback, text=Acknowledgment, text=Response');
      await expect(ackSection.first()).toBeVisible({ timeout: 5000 });
      
      console.log('✓ Acknowledgment message displayed');
    });

    // ============================================================
    // Step 14-16: Logout, login as giver, mark as complete
    // ============================================================
    await test.step('Giver marks feedback as complete', async () => {
      // Logout as receiver
      await logout(page);
      
      // Login as giver again
      await setupAuthAs(page, GIVER_EMAIL);
      
      // Navigate to feedback list
      await page.click('a[href*="feedback"]');
      await page.waitForURL(/.*feedback/);
      
      // Click on "Given" tab to see feedback given
      await page.click('button:has-text("Given"), [data-testid="given-tab"]');
      await page.waitForTimeout(1000);
      
      // Find and click on the feedback
      await page.click(`text=${feedbackTitle}, text=Excellent problem-solving`);
      await page.waitForTimeout(1000);
      
      // Click complete button
      await page.click('button:has-text("Complete"), button:has-text("Mark as Complete"), [data-testid="complete-btn"]');
      await page.waitForTimeout(2000);
      
      console.log('✓ Feedback marked as complete by giver');
    });

    // ============================================================
    // Step 17: Verify feedback status is COMPLETED
    // ============================================================
    await test.step('Verify final status is COMPLETED', async () => {
      // Check for COMPLETED status badge
      const statusBadge = page.locator('text=Completed, [data-status="completed"]');
      await expect(statusBadge.first()).toBeVisible({ timeout: 5000 });
      
      console.log('✓ Feedback status is COMPLETED');
      console.log('✅ Complete feedback workflow test passed!');
    });
  });

  test('Draft feedback can be deleted by giver', async ({ page }) => {
    const draftTitle = `Draft to Delete ${Date.now()}`;

    await test.step('Create a draft feedback', async () => {
      await setupAuthAs(page, GIVER_EMAIL);
      
      // Navigate to Feedback page first
      await page.click('a[href="/feedback"]');
      await page.waitForURL(/.*feedback/);
      
      // Then click Give Feedback button
      await page.click('button:has-text("Give Feedback")');
      await page.waitForTimeout(1000);
      
      // Fill minimal form
      await page.click('select[name="toUserId"], [data-testid="receiver-select"]');
      await page.click(`option:has-text("${RECEIVER_EMAIL}")`);
      
      await page.click('select[name="cycleId"], [data-testid="cycle-select"]');
      await page.click('option:not([value=""]):first-of-type');
      
      await page.click('button:has-text("Add Strength")');
      await page.fill('textarea[name*="strength"]', 'Test strength for deletion');
      
      await page.click('button:has-text("Save as Draft")');
      await page.waitForTimeout(2000);
    });

    await test.step('Delete the draft', async () => {
      await page.click('a[href*="feedback"]');
      await page.click('button:has-text("Drafts")');
      await page.waitForTimeout(1000);
      
      // Click on the draft
      await page.click('text=Test strength for deletion');
      await page.waitForTimeout(1000);
      
      // Look for delete button
      const deleteBtn = page.locator('button:has-text("Delete"), [data-testid="delete-draft-btn"]');
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        
        // Confirm deletion if there's a confirmation dialog
        const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
        
        await page.waitForTimeout(2000);
        
        // Verify draft is no longer in the list
        const deletedDraft = page.locator('text=Test strength for deletion');
        await expect(deletedDraft).not.toBeVisible({ timeout: 5000 });
        
        console.log('✓ Draft successfully deleted');
      }
    });
  });
});

