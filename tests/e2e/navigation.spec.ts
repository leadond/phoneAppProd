import { test, expect } from '@playwright/test';

test.describe('Application Navigation', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox', { name: 'admin@mdanderson.org' }).fill('admin@mdanderson.org');
    await page.getByRole('textbox', { name: 'Enter your password' }).fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Welcome back, admin')).toBeVisible();
  });

  test('should navigate to Dashboard and show active state', async ({ page }) => {
    // Click Dashboard (should already be active after login)
    await page.getByRole('button', { name: 'Dashboard' }).click();
    
    // Verify Dashboard content
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Overview of phone number management system')).toBeVisible();
    
    // Verify Dashboard is active in sidebar
    const dashboardButton = page.getByRole('button', { name: 'Dashboard' });
    await expect(dashboardButton).toHaveClass(/bg-blue-50/);
  });

  test('should navigate to Phone Numbers section', async ({ page }) => {
    // Navigate to Phone Numbers
    await page.getByRole('button', { name: 'Phone Numbers' }).click();
    
    // Verify Phone Numbers content
    await expect(page.getByRole('heading', { name: 'Phone Numbers' })).toBeVisible();
    await expect(page.getByText('Manage and track phone number assignments')).toBeVisible();
    
    // Verify Phone Numbers is active in sidebar
    const phoneNumbersButton = page.getByRole('button', { name: 'Phone Numbers' });
    await expect(phoneNumbersButton).toHaveClass(/bg-blue-50/);
    
    // Verify table is present
    await expect(page.getByRole('cell', { name: 'Phone Number' })).toBeVisible();
  });

  test('should navigate to CSV Upload section', async ({ page }) => {
    // Navigate to CSV Upload
    await page.getByRole('button', { name: 'CSV Upload' }).click();
    
    // Verify CSV Upload content
    await expect(page.getByRole('heading', { name: 'CSV Upload' })).toBeVisible();
    await expect(page.getByText('CSV upload functionality coming soon')).toBeVisible();
    
    // Verify CSV Upload is active in sidebar
    const csvUploadButton = page.getByRole('button', { name: 'CSV Upload' });
    await expect(csvUploadButton).toHaveClass(/bg-blue-50/);
  });

  test('should navigate to Reports section', async ({ page }) => {
    // Navigate to Reports
    await page.getByRole('button', { name: 'Reports' }).click();
    
    // Verify Reports content
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
    await expect(page.getByText('Reports and analytics coming soon')).toBeVisible();
    
    // Verify Reports is active in sidebar
    const reportsButton = page.getByRole('button', { name: 'Reports' });
    await expect(reportsButton).toHaveClass(/bg-blue-50/);
  });

  test('should navigate to Audit Log section', async ({ page }) => {
    // Navigate to Audit Log
    await page.getByRole('button', { name: 'Audit Log' }).click();
    
    // Verify Audit Log content
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible();
    await expect(page.getByText('Audit log functionality coming soon')).toBeVisible();
    
    // Verify Audit Log is active in sidebar
    const auditLogButton = page.getByRole('button', { name: 'Audit Log' });
    await expect(auditLogButton).toHaveClass(/bg-blue-50/);
  });

  test('should maintain active state when switching between sections', async ({ page }) => {
    // Start at Dashboard
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    
    // Navigate to Phone Numbers
    await page.getByRole('button', { name: 'Phone Numbers' }).click();
    await expect(page.getByRole('heading', { name: 'Phone Numbers' })).toBeVisible();
    
    // Navigate to CSV Upload
    await page.getByRole('button', { name: 'CSV Upload' }).click();
    await expect(page.getByRole('heading', { name: 'CSV Upload' })).toBeVisible();
    
    // Navigate back to Dashboard
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    
    // Verify Dashboard is active
    const dashboardButton = page.getByRole('button', { name: 'Dashboard' });
    await expect(dashboardButton).toHaveClass(/bg-blue-50/);
  });

  test('should maintain sidebar and header across all sections', async ({ page }) => {
    // Define sections to test
    const sections = [
      { button: 'Dashboard', heading: 'Dashboard' },
      { button: 'Phone Numbers', heading: 'Phone Numbers' },
      { button: 'CSV Upload', heading: 'CSV Upload' },
      { button: 'Reports', heading: 'Reports' },
      { button: 'Audit Log', heading: 'Audit Log' }
    ];
    
    for (const section of sections) {
      // Navigate to section
      await page.getByRole('button', { name: section.button }).click();
      
      // Verify header persists
      await expect(page.getByText('Welcome back, admin')).toBeVisible();
      await expect(page.getByText('Role: admin')).toBeVisible();
      await expect(page.getByText('admin@mdanderson.org')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
      
      // Verify sidebar persists
      await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Phone Numbers' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'CSV Upload' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Reports' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Audit Log' })).toBeVisible();
      
      // Verify section content
      await expect(page.getByRole('heading', { name: section.heading })).toBeVisible();
    }
  });

  test('should show correct sidebar title', async ({ page }) => {
    // Verify sidebar title
    await expect(page.getByRole('heading', { name: 'Phone Manager' })).toBeVisible();
    await expect(page.getByText('Internal System')).toBeVisible();
  });
});