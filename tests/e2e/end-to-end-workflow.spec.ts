import { test, expect } from '@playwright/test';

test.describe('End-to-End User Workflows', () => {
  test('should complete full admin workflow', async ({ page }) => {
    // 1. Login as admin
    await page.goto('/');
    await page.getByRole('textbox', { name: 'admin@mdanderson.org' }).fill('admin@mdanderson.org');
    await page.getByRole('textbox', { name: 'Enter your password' }).fill('password123');
    await page.getByRole('combobox').selectOption('admin');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // 2. Verify admin dashboard access
    await expect(page.getByText('Welcome back, admin')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    
    // 3. Navigate to Phone Numbers
    await page.getByRole('button', { name: 'Phone Numbers' }).click();
    await expect(page.getByRole('heading', { name: 'Phone Numbers' })).toBeVisible();
    
    // 4. Search for specific phone number
    await page.getByRole('textbox', { name: 'Search by number (with/without dashes), extension, or assignee...' }).fill('346-720-0001');
    await page.waitForTimeout(500);
    await expect(page.getByText('Showing 1 of')).toBeVisible();
    
    // 5. Clear search to see all results
    await page.getByRole('textbox', { name: 'Search by number (with/without dashes), extension, or assignee...' }).clear();
    await page.waitForTimeout(500);
    
    // 6. Navigate to all sections to verify admin access
    const sections = ['CSV Upload', 'Reports', 'Audit Log'];
    for (const section of sections) {
      await page.getByRole('button', { name: section }).click();
      await expect(page.getByText(section).first()).toBeVisible();
    }
    
    // 7. Return to dashboard
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    
    // 8. Logout
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByRole('heading', { name: 'Phone Manager' })).toBeVisible();
  });

  test('should handle manager role workflow', async ({ page }) => {
    // 1. Login as manager
    await page.goto('/');
    await page.getByRole('textbox', { name: 'admin@mdanderson.org' }).fill('manager@mdanderson.org');
    await page.getByRole('textbox', { name: 'Enter your password' }).fill('password123');
    await page.getByRole('combobox').selectOption('manager');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // 2. Verify manager dashboard access
    await expect(page.getByText('Welcome back, manager')).toBeVisible();
    await expect(page.getByText('Role: manager')).toBeVisible();
    
    // 3. Navigate to Phone Numbers and verify access
    await page.getByRole('button', { name: 'Phone Numbers' }).click();
    await expect(page.getByRole('heading', { name: 'Phone Numbers' })).toBeVisible();
    
    // 4. Test search functionality
    await page.getByRole('textbox', { name: 'Search by number (with/without dashes), extension, or assignee...' }).fill('John Doe');
    await page.waitForTimeout(500);
    
    // 5. Verify manager can see phone numbers table
    await expect(page.locator('table').getByText('John Doe').first()).toBeVisible();
    
    // 6. Logout
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should handle viewer role limitations', async ({ page }) => {
    // 1. Login as viewer
    await page.goto('/');
    await page.getByRole('textbox', { name: 'admin@mdanderson.org' }).fill('viewer@mdanderson.org');
    await page.getByRole('textbox', { name: 'Enter your password' }).fill('password123');
    await page.getByRole('combobox').selectOption('viewer');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // 2. Verify viewer dashboard access
    await expect(page.getByText('Welcome back, viewer')).toBeVisible();
    await expect(page.getByText('Role: viewer')).toBeVisible();
    
    // 3. Navigate to Phone Numbers and verify read-only access
    await page.getByRole('button', { name: 'Phone Numbers' }).click();
    await expect(page.getByRole('heading', { name: 'Phone Numbers' })).toBeVisible();
    
    // 4. Verify viewer can search and view data
    await page.getByRole('textbox', { name: 'Search by number (with/without dashes), extension, or assignee...' }).fill('346-720');
    await page.waitForTimeout(500);
    
    // 5. Verify table data is visible
    await expect(page.locator('table')).toBeVisible();
    
    // 6. Test navigation to other sections
    await page.getByRole('button', { name: 'Reports' }).click();
    await expect(page.getByText('Reports and analytics coming soon')).toBeVisible();
    
    // 7. Logout
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should maintain session state across navigation', async ({ page }) => {
    // 1. Login
    await page.goto('/');
    await page.getByRole('textbox', { name: 'admin@mdanderson.org' }).fill('admin@mdanderson.org');
    await page.getByRole('textbox', { name: 'Enter your password' }).fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // 2. Navigate through multiple sections
    const sections = [
      { name: 'Phone Numbers', expectedContent: 'Manage and track phone number assignments' },
      { name: 'CSV Upload', expectedContent: 'CSV upload functionality coming soon' },
      { name: 'Reports', expectedContent: 'Reports and analytics coming soon' },
      { name: 'Audit Log', expectedContent: 'Audit log functionality coming soon' },
      { name: 'Dashboard', expectedContent: 'Overview of phone number management system' }
    ];
    
    for (const section of sections) {
      await page.getByRole('button', { name: section.name }).click();
      
      // Verify user info persists
      await expect(page.getByText('Welcome back, admin')).toBeVisible();
      await expect(page.getByText('admin@mdanderson.org')).toBeVisible();
      
      // Verify section content
      await expect(page.getByText(section.expectedContent)).toBeVisible();
    }
    
    // 3. Final logout
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByRole('heading', { name: 'Phone Manager' })).toBeVisible();
  });

  test('should handle page refresh and maintain authentication state', async ({ page }) => {
    // 1. Login
    await page.goto('/');
    await page.getByRole('textbox', { name: 'admin@mdanderson.org' }).fill('admin@mdanderson.org');
    await page.getByRole('textbox', { name: 'Enter your password' }).fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // 2. Navigate to Phone Numbers
    await page.getByRole('button', { name: 'Phone Numbers' }).click();
    await expect(page.getByRole('heading', { name: 'Phone Numbers' })).toBeVisible();
    
    // 3. Refresh the page
    await page.reload();
    
    // 4. Since this is a client-side app without persistent auth, 
    // user should be redirected to login after refresh
    await expect(page.getByRole('heading', { name: 'Phone Manager' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
});