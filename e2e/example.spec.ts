import { expect, test } from '@playwright/test';

/**
 * Sample E2E test
 * This will be expanded with actual tests for Zebra HMAI functionality
 */
test.describe('Zebra HMAI', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Zebra/i);
  });

  test.skip('login flow (to be implemented)', async ({ page }) => {
    await page.goto('/login');
    // TODO: Add login test
  });
});


