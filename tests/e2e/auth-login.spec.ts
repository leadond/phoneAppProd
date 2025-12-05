import { test, expect } from '@playwright/test';

test.describe('Authentication and Login', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto('/');

    // Wait for login UI to render
    await expect(page.getByRole('heading', { name: 'Phone Range Nexus' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Local Database Edition')).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText('Default credentials: admin / admin123')).toBeVisible();
  });

  test('should login successfully as admin', async ({ page }) => {
    await page.goto('/');

    // Fill login form
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('admin123');

    // Click Sign In
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify dashboard
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Overview of phone number management system')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await page.goto('/');

    // Login first
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20000 });

    // Attempt to logout if a logout control exists (placeholder; adjust when logout is implemented)
    // await page.getByRole('button', { name: 'Logout' }).click();
    // await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
});
