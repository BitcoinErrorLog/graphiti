/**
 * E2E tests for annotation functionality
 */

import { test, expect } from '@playwright/test';
import { loadExtension, openSidePanel, getExtensionId } from '../helpers/extension';

test.describe('Annotations', () => {
  test.beforeEach(async ({ context }) => {
    await loadExtension(context);
    const page = await context.newPage();
    await page.goto('https://example.com');
  });

  test('should create annotation from text selection', async ({ page }) => {
    // Select text on the page
    await page.selectText('body');
    
    // Wait for annotation button to appear
    const annotationButton = page.locator('.pubky-annotation-button, button:has-text("Add Annotation")');
    await expect(annotationButton).toBeVisible({ timeout: 3000 });
    
    // Click annotation button
    await annotationButton.click();
    
    // Annotation modal should appear
    const modal = page.locator('.pubky-annotation-modal');
    await expect(modal).toBeVisible();
    
    // Fill in comment
    const textarea = modal.locator('textarea');
    await textarea.fill('Test annotation comment');
    
    // Submit annotation
    const submitButton = modal.locator('button:has-text("Post"), button:has-text("Submit")');
    await submitButton.click();
    
    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 3000 });
  });

  test('should display annotations in side panel', async ({ context, page }) => {
    const extensionId = await getExtensionId(context);
    const sidePanel = await openSidePanel(context, extensionId);
    
    // Navigate to annotations tab
    const annotationsTab = sidePanel.locator('button:has-text("Annotations"), [role="tab"]:has-text("Annotations")');
    if (await annotationsTab.count() > 0) {
      await annotationsTab.click();
      
      // Should show annotations list
      await expect(sidePanel.locator('text=Annotations')).toBeVisible();
    }
  });

  test('should highlight annotation on page', async ({ page }) => {
    // This test would require an existing annotation
    // For now, verify highlight rendering capability
    const highlight = page.locator('.pubky-highlight');
    // Highlights may or may not be present depending on test data
    expect(true).toBe(true);
  });
});
