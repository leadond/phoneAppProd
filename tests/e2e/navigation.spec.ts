import { test, expect } from '@playwright/test';

test.describe('Application Navigation', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Phone Range Nexus' })).toBeVisible({ timeout: 20000 });
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20000 });
  });

  test('should navigate to Dashboard and show content', async ({ page }) => {
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Overview of phone number management system')).toBeVisible();
  });

  test('should navigate to Phone Numbers section', async ({ page }) => {
    await page.getByRole('button', { name: 'Phone Numbers' }).click();
    await expect(page.getByRole('heading', { name: 'Phone Number Management' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('should navigate to Audit Log section', async ({ page }) => {
    await page.getByRole('button', { name: 'Audit Log' }).click();
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible();
  });

  test('should maintain sidebar and header across sections', async ({ page }) => {
    const sections = [
      { button: 'Dashboard', heading: 'Dashboard' },
      { button: 'Phone Numbers', heading: 'Phone Number Management' },
      { button: 'Audit Log', heading: 'Audit Log' }
    ];

    for (const section of sections) {
      await page.getByRole('button', { name: section.button }).click();
      await expect(page.getByRole('heading', { name: section.heading })).toBeVisible();
      // Header controls
      await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
      // Sidebar buttons persist
      await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Phone Numbers' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Audit Log' })).toBeVisible();
    }
  });

  // Skipped: legacy sidebar title tests not applicable
});
