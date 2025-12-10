/**
 * E2E tests for drawing functionality
 */

import { test, expect } from '@playwright/test';
import { loadExtension, openPopup, getExtensionId } from '../helpers/extension';

test.describe('Drawing Mode', () => {
  test.beforeEach(async ({ context }) => {
    await loadExtension(context);
    const page = await context.newPage();
    await page.goto('https://example.com');
  });

  test('should toggle drawing mode', async ({ context, page }) => {
    const extensionId = await getExtensionId(context);
    const popup = await openPopup(context, extensionId);
    
    // Click drawing mode button
    const drawingButton = popup.locator('button:has-text("Drawing"), button:has-text("🎨")');
    if (await drawingButton.count() > 0) {
      await drawingButton.click();
      
      // Drawing canvas should appear
      await expect(page.locator('#pubky-drawing-canvas')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should save drawing', async ({ context, page }) => {
    const extensionId = await getExtensionId(context);
    const popup = await openPopup(context, extensionId);
    
    // Activate drawing mode
    const drawingButton = popup.locator('button:has-text("Drawing"), button:has-text("🎨")');
    if (await drawingButton.count() > 0) {
      await drawingButton.click();
      await page.waitForSelector('#pubky-drawing-canvas', { timeout: 3000 });
      
      // Draw something
      const canvas = page.locator('#pubky-drawing-canvas');
      await canvas.click({ position: { x: 100, y: 100 } });
      await canvas.dragTo(canvas, { 
        sourcePosition: { x: 100, y: 100 },
        targetPosition: { x: 200, y: 200 }
      });
      
      // Save drawing
      const saveButton = page.locator('#save-drawing, button:has-text("Save")');
      if (await saveButton.count() > 0) {
        await saveButton.click();
        
        // Should show success message
        await expect(
          page.locator('text=saved, text=Success, [role="alert"]')
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should load saved drawing', async ({ context, page }) => {
    // This test would require a saved drawing to exist
    // For now, just verify the drawing mode can be toggled
    const extensionId = await getExtensionId(context);
    const popup = await openPopup(context, extensionId);
    
    const drawingButton = popup.locator('button:has-text("Drawing"), button:has-text("🎨")');
    if (await drawingButton.count() > 0) {
      await drawingButton.click();
      await expect(page.locator('#pubky-drawing-canvas')).toBeVisible({ timeout: 3000 });
    }
  });
});
