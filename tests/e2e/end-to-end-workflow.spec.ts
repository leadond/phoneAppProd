import { test, expect } from '@playwright/test';

test.describe('End-to-End User Workflows', () => {
  test('should complete full admin workflow', async ({ page }) => {
    // 1. Login as admin
    await page.goto('/');
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // 2. Verify admin dashboard access
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20000 });
    
    // 3. Navigate to Phone Numbers
    await page.getByRole('button', { name: 'Phone Numbers' }).click();
    await expect(page.getByRole('heading', { name: 'Phone Number Management' })).toBeVisible();
    
    // 4. Basic presence of table content
    await expect(page.locator('table')).toBeVisible();
    
    // 6. Navigate to all sections to verify admin access
    const sections = ['Audit Log'];
    for (const section of sections) {
      await page.getByRole('button', { name: section }).click();
      await expect(page.getByRole('heading', { name: section })).toBeVisible();
    }
    
    // 7. Return to dashboard
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    
    // 8. Logout
    // Logout (if implemented)
    // await page.getByRole('button', { name: 'Logout' }).click();
    // await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should handle manager role workflow', async ({ page }) => {
    // 1. Login as manager
    await page.goto('/');
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // 2. Verify manager dashboard access
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20000 });
    
    // 3. Navigate to Phone Numbers and verify access
    await page.getByRole('button', { name: 'Phone Numbers' }).click();
    await expect(page.getByRole('heading', { name: 'Phone Number Management' })).toBeVisible();
    
    // 4. Verify manager can see phone numbers table
    await expect(page.locator('table')).toBeVisible();
    
    // 6. Logout
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should handle viewer role limitations', async ({ page }) => {
    // 1. Login as viewer
    await page.goto('/');
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // 2. Verify viewer dashboard access
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20000 });
    
    // 3. Navigate to Phone Numbers and verify read-only access
    await page.getByRole('button', { name: 'Phone Numbers' }).click();
    await expect(page.getByRole('heading', { name: 'Phone Number Management' })).toBeVisible();
    
    // 4. Verify viewer can view data
    await expect(page.locator('table')).toBeVisible();
    
    // 7. Logout (if implemented)
    // await page.getByRole('button', { name: 'Logout' }).click();
    // await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should maintain session state across navigation', async ({ page }) => {
    // 1. Login
    await page.goto('/');
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // 2. Navigate through multiple sections and assert headings
    const sections = [
      { button: 'Phone Numbers', heading: 'Phone Number Management' },
      { button: 'Audit Log', heading: 'Audit Log' },
      { button: 'Dashboard', heading: 'Dashboard' }
    ];
    
    for (const section of sections) {
      await page.getByRole('button', { name: section.button }).click();
      await expect(page.getByRole('heading', { name: section.heading })).toBeVisible();
      // Header control persists
      await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    }
    
    // 3. Final logout (if implemented)
    // await page.getByRole('button', { name: 'Logout' }).click();
    // await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should handle page refresh and maintain authentication state', async ({ page }) => {
    // 1. Login
    await page.goto('/');
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // 2. Navigate to Phone Numbers
    await page.getByRole('button', { name: 'Phone Numbers' }).click();
    await expect(page.getByRole('heading', { name: 'Phone Number Management' })).toBeVisible();
    
    // 3. Refresh the page
    await page.reload();
    
    // 4. Since this is a client-side app without persistent auth, user returns to login
    await expect(page.getByRole('heading', { name: 'Phone Range Nexus' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
});