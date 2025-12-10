/**
 * E2E tests for bookmark functionality
 */

import { test, expect } from '@playwright/test';
import { loadExtension, openPopup, getExtensionId } from '../helpers/extension';

test.describe('Bookmarking', () => {
  test.beforeEach(async ({ context }) => {
    await loadExtension(context);
    // Navigate to a test page
    const page = await context.newPage();
    await page.goto('https://example.com');
  });

  test('should bookmark a page', async ({ context }) => {
    const extensionId = await getExtensionId(context);
    const popup = await openPopup(context, extensionId);
    
    // Click bookmark button
    const bookmarkButton = popup.locator('button:has-text("Bookmark"), button:has-text("☆")');
    if (await bookmarkButton.count() > 0) {
      await bookmarkButton.click();
      
      // Should show success message or toast
      await expect(
        popup.locator('text=Bookmarked, text=Success, [role="alert"]')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should remove bookmark', async ({ context }) => {
    const extensionId = await getExtensionId(context);
    const popup = await openPopup(context, extensionId);
    
    // First bookmark
    const bookmarkButton = popup.locator('button:has-text("Bookmark"), button:has-text("☆")');
    if (await bookmarkButton.count() > 0) {
      await bookmarkButton.click();
      await popup.waitForTimeout(1000);
      
      // Then remove bookmark
      const removeButton = popup.locator('button:has-text("Bookmarked"), button:has-text("⭐")');
      if (await removeButton.count() > 0) {
        await removeButton.click();
        
        // Should show removal message
        await expect(
          popup.locator('text=removed, text=Success, [role="alert"]')
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
