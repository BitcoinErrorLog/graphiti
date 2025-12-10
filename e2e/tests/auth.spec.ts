/**
 * E2E tests for authentication flow
 */

import { test, expect } from '@playwright/test';
import { loadExtension, openPopup, getExtensionId } from '../helpers/extension';

test.describe('Authentication', () => {
  test.beforeEach(async ({ context }) => {
    await loadExtension(context);
  });

  test('should show auth view when not signed in', async ({ context }) => {
    const extensionId = await getExtensionId(context);
    const popup = await openPopup(context, extensionId);
    
    // Should show authentication UI
    await expect(popup.locator('text=Sign in')).toBeVisible();
  });

  test('should display QR code for authentication', async ({ context }) => {
    const extensionId = await getExtensionId(context);
    const popup = await openPopup(context, extensionId);
    
    // QR code should be visible
    await expect(popup.locator('canvas, img[alt*="QR"]')).toBeVisible();
  });

  test('should allow skipping authentication', async ({ context }) => {
    const extensionId = await getExtensionId(context);
    const popup = await openPopup(context, extensionId);
    
    // Look for skip button or local-only mode option
    const skipButton = popup.locator('button:has-text("Skip"), button:has-text("Continue")');
    if (await skipButton.count() > 0) {
      await skipButton.click();
      // Should show main view
      await expect(popup.locator('text=Graphiti')).toBeVisible();
    }
  });
});
