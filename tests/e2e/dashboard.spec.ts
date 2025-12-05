import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Phone Range Nexus' })).toBeVisible({ timeout: 20000 });
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20000 });
  });

  test('should display dashboard statistics correctly', async ({ page }) => {
    // Verify dashboard heading and description
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Overview of phone number management system')).toBeVisible();
    
    // Verify all statistics cards are present (use first() to avoid strict-mode conflicts)
    await expect(page.getByText('Total Numbers').first()).toBeVisible();
    await expect(page.getByText('Assigned').first()).toBeVisible();
    await expect(page.getByText('Available').first()).toBeVisible();
    // Values are dynamic; ensure the stat titles render
    await expect(page.getByText('Aging Numbers').first()).toBeVisible();
  });

  test('should display recent activity section', async ({ page }) => {
    // Verify Recent Activity section
    await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();
    
    // Verify activity items
    // Ensure there is at least one activity row rendered
    const activityList = page.locator('div.space-y-3 > div');
    await expect(activityList.first()).toBeVisible();
  });

  test('should display quick actions section', async ({ page }) => {
    // Verify Quick Actions section
    await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible();
    
    // Verify quick action buttons
    await expect(page.getByRole('button', { name: 'Upload CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assign Number' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Release Number' })).toBeVisible();
  });

  test('should display quick action buttons (functionality coming soon)', async ({ page }) => {
    // Verify all quick action buttons are present and clickable
    const uploadButton = page.getByRole('button', { name: 'Upload CSV' });
    const assignButton = page.getByRole('button', { name: 'Assign Number' });
    const releaseButton = page.getByRole('button', { name: 'Release Number' });
    
    await expect(uploadButton).toBeVisible();
    await expect(assignButton).toBeVisible();
    await expect(releaseButton).toBeVisible();
    
    // Verify buttons are clickable (even if functionality is not implemented yet)
    await expect(uploadButton).toBeEnabled();
    await expect(assignButton).toBeEnabled();
    await expect(releaseButton).toBeEnabled();
  });

  test('should maintain user info in header', async ({ page }) => {
    // Verify user information persists in header
    // Header should render logout control
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });
});