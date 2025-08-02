import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox', { name: 'admin@mdanderson.org' }).fill('admin@mdanderson.org');
    await page.getByRole('textbox', { name: 'Enter your password' }).fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Welcome back, admin')).toBeVisible();
  });

  test('should display dashboard statistics correctly', async ({ page }) => {
    // Verify dashboard heading and description
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Overview of phone number management system')).toBeVisible();
    
    // Verify all statistics cards are present
    await expect(page.getByText('Total Numbers')).toBeVisible();
    await expect(page.getByText('67,500')).toBeVisible();
    await expect(page.getByText('+1.2% from last month')).toBeVisible();
    
    await expect(page.getByText('Assigned').first()).toBeVisible();
    await expect(page.getByText('45,320')).toBeVisible();
    await expect(page.getByText('+2.3% from last month')).toBeVisible();
    
    await expect(page.getByText('Available')).toBeVisible();
    await expect(page.getByText('22,180')).toBeVisible();
    await expect(page.getByText('-0.8% from last month')).toBeVisible();
    
    await expect(page.getByText('Issues')).toBeVisible();
    await expect(page.getByText('12', { exact: true })).toBeVisible();
    await expect(page.getByText('-15.2% from last month')).toBeVisible();
  });

  test('should display recent activity section', async ({ page }) => {
    // Verify Recent Activity section
    await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();
    
    // Verify activity items
    await expect(page.getByText('Number 346-720-1234 assigned to John Doe')).toBeVisible();
    await expect(page.getByText('2 minutes ago')).toBeVisible();
    
    await expect(page.getByText('Bulk upload completed: 500 numbers')).toBeVisible();
    await expect(page.getByText('15 minutes ago')).toBeVisible();
    
    await expect(page.getByText('Number 346-725-5678 released from Mary Smith')).toBeVisible();
    await expect(page.getByText('1 hour ago')).toBeVisible();
    
    await expect(page.getByText('System maintenance completed')).toBeVisible();
    await expect(page.getByText('3 hours ago')).toBeVisible();
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
    await expect(page.getByText('Welcome back, admin')).toBeVisible();
    await expect(page.getByText('Role: admin')).toBeVisible();
    await expect(page.getByText('admin@mdanderson.org')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });
});