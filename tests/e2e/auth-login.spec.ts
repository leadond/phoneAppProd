import { test, expect } from '@playwright/test';

test.describe('Authentication and Login', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto('/');
    
    // Verify login page elements
    await expect(page.getByRole('heading', { name: 'Phone Manager' })).toBeVisible();
    await expect(page.getByText('Internal Application System')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'admin@mdanderson.org' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Enter your password' })).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText('Demo credentials: Any email and password will work')).toBeVisible();
  });

  test('should login successfully with admin role', async ({ page }) => {
    await page.goto('/');
    
    // Fill login form
    await page.getByRole('textbox', { name: 'admin@mdanderson.org' }).fill('admin@mdanderson.org');
    await page.getByRole('textbox', { name: 'Enter your password' }).fill('password123');
    await page.getByRole('combobox').selectOption('admin');
    
    // Click Sign In
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Verify successful login and dashboard
    await expect(page.getByText('Welcome back, admin')).toBeVisible();
    await expect(page.getByText('Role: admin')).toBeVisible();
    await expect(page.getByText('admin@mdanderson.org')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Overview of phone number management system')).toBeVisible();
    
    // Verify sidebar navigation
    await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Phone Numbers' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'CSV Upload' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reports' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Audit Log' })).toBeVisible();
  });

  test('should login successfully with manager role', async ({ page }) => {
    await page.goto('/');
    
    // Fill login form with manager role
    await page.getByRole('textbox', { name: 'admin@mdanderson.org' }).fill('manager@mdanderson.org');
    await page.getByRole('textbox', { name: 'Enter your password' }).fill('password123');
    await page.getByRole('combobox').selectOption('manager');
    
    // Click Sign In
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Verify successful login with manager role
    await expect(page.getByText('Welcome back, manager')).toBeVisible();
    await expect(page.getByText('Role: manager')).toBeVisible();
    await expect(page.getByText('manager@mdanderson.org')).toBeVisible();
  });

  test('should login successfully with viewer role', async ({ page }) => {
    await page.goto('/');
    
    // Fill login form with viewer role
    await page.getByRole('textbox', { name: 'admin@mdanderson.org' }).fill('viewer@mdanderson.org');
    await page.getByRole('textbox', { name: 'Enter your password' }).fill('password123');
    await page.getByRole('combobox').selectOption('viewer');
    
    // Click Sign In
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Verify successful login with viewer role
    await expect(page.getByText('Welcome back, viewer')).toBeVisible();
    await expect(page.getByText('Role: viewer')).toBeVisible();
    await expect(page.getByText('viewer@mdanderson.org')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await page.goto('/');
    
    // Login first
    await page.getByRole('textbox', { name: 'admin@mdanderson.org' }).fill('admin@mdanderson.org');
    await page.getByRole('textbox', { name: 'Enter your password' }).fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Verify login success
    await expect(page.getByText('Welcome back, admin')).toBeVisible();
    
    // Logout
    await page.getByRole('button', { name: 'Logout' }).click();
    
    // Verify redirected back to login page
    await expect(page.getByRole('heading', { name: 'Phone Manager' })).toBeVisible();
    await expect(page.getByText('Internal Application System')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
});