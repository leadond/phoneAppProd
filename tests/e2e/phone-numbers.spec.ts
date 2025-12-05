import { test, expect } from '@playwright/test';

test.describe('Phone Numbers Management', () => {
  // Login and navigate before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Phone Range Nexus' })).toBeVisible({ timeout: 20000 });
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20000 });

    // Navigate to Phone Numbers page
    await page.getByRole('button', { name: 'Phone Numbers' }).click();
    await expect(page.getByRole('heading', { name: 'Phone Number Management' })).toBeVisible({ timeout: 20000 });
  });

  test('should display phone numbers page correctly', async ({ page }) => {
    // Verify page header
    await expect(page.getByRole('heading', { name: 'Phone Number Management' })).toBeVisible();

    // Verify top action buttons
    await expect(page.getByRole('button', { name: 'Advanced Filters' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible();

    // Verify search and quick filter controls
    await expect(page.getByPlaceholder('Search by number, extension, assignee, department, location, or notes...')).toBeVisible();
    await expect(page.getByRole('tab', { name: /All Numbers/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Available/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Assigned/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Aging/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Toll-Free/ })).toBeVisible();

    // Table and results footer
    await expect(page.locator('table')).toBeVisible();
    await expect(page.getByText(/Showing \d+ of \d+ phone numbers/)).toBeVisible();
  });

  test('should display correct table headers', async ({ page }) => {
    // Wait for table to render (Enhanced table appears after initial loading)
    await expect(page.locator('table')).toBeVisible({ timeout: 20000 });

    const thead = page.locator('table thead');
    await expect(thead.getByText('Number / Type')).toBeVisible();
    await expect(thead.getByText('Status / System')).toBeVisible();
    await expect(thead.getByText('Assignment')).toBeVisible();
    await expect(thead.getByText('Usage / Activity')).toBeVisible();
    await expect(thead.getByText('Details')).toBeVisible();
    await expect(thead.getByText('Actions')).toBeVisible();
  });

  test('should support searching by number/extension/assignee', async ({ page }) => {
    const search = page.getByPlaceholder('Search by number, extension, assignee, department, location, or notes...');

    await search.fill('346-720');
    await page.waitForTimeout(200);
    await expect(page.getByText(/Showing \d+ of \d+ phone numbers/)).toBeVisible();

    await search.fill('12345');
    await page.waitForTimeout(200);
    await expect(page.getByText(/Showing \d+ of \d+ phone numbers/)).toBeVisible();

    await search.fill('John');
    await page.waitForTimeout(200);
    await expect(page.getByText(/Showing \d+ of \d+ phone numbers/)).toBeVisible();

    // Clear search
    await search.clear();
    await page.waitForTimeout(200);
    await expect(page.getByText(/Showing \d+ of \d+ phone numbers/)).toBeVisible();
  });

  test('should filter using quick filter tabs', async ({ page }) => {
    await page.getByRole('tab', { name: /Assigned/ }).click();
    await expect(page.getByText(/Showing \d+ of \d+ phone numbers/)).toBeVisible();

    await page.getByRole('tab', { name: /Available/ }).click();
    await expect(page.getByText(/Showing \d+ of \d+ phone numbers/)).toBeVisible();

    await page.getByRole('tab', { name: /All Numbers/ }).click();
    await expect(page.getByText(/Showing \d+ of \d+ phone numbers/)).toBeVisible();
  });

  test('should show results footer regardless of data presence', async ({ page }) => {
    await expect(page.getByText(/Showing \d+ of \d+ phone numbers/)).toBeVisible();
  });
});
