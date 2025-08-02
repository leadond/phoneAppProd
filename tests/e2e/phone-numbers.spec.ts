import { test, expect } from '@playwright/test';

test.describe('Phone Numbers Management', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox', { name: 'admin@mdanderson.org' }).fill('admin@mdanderson.org');
    await page.getByRole('textbox', { name: 'Enter your password' }).fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Welcome back, admin')).toBeVisible();
    
    // Navigate to Phone Numbers page
    await page.getByRole('button', { name: 'Phone Numbers' }).click();
  });

  test('should display phone numbers page correctly', async ({ page }) => {
    // Verify page header
    await expect(page.getByRole('heading', { name: 'Phone Numbers' })).toBeVisible();
    await expect(page.getByText('Manage and track phone number assignments')).toBeVisible();
    
    // Verify top action buttons
    await expect(page.getByRole('button', { name: 'Duplicate Extensions (0)' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
    
    // Verify search and filter controls
    await expect(page.getByRole('textbox', { name: 'Search by number (with/without dashes), extension, or assignee...' })).toBeVisible();
    await expect(page.getByText('Tip: Search "12345" for extension, "XXXXXXXXXX" without dashes, or "XXX-XXX-XXXX" with dashes')).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByRole('button', { name: 'More Filters' })).toBeVisible();
  });

  test('should display phone numbers table with data', async ({ page }) => {
    // Verify table headers
    await expect(page.getByRole('cell', { name: 'Phone Number' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Extension' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'System' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Carrier' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Assigned To' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Notes' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Actions' })).toBeVisible();
    
    // Verify some sample data rows (using more specific selectors)
    await expect(page.locator('table').getByText('346-720-0001').first()).toBeVisible();
    await expect(page.locator('table').getByText('John Doe').first()).toBeVisible();
    await expect(page.locator('table').getByText('346-720-0002').first()).toBeVisible();
    await expect(page.locator('table').getByText('Jane Smith').first()).toBeVisible();
    
    // Verify pagination/results count
    await expect(page.getByText(/Showing \d+ of \d+ phone numbers/)).toBeVisible();
  });

  test('should filter phone numbers by search term', async ({ page }) => {
    // Get initial results count
    const initialCount = await page.getByText(/Showing \d+ of \d+ phone numbers/).textContent();
    
    // Search for specific phone number
    await page.getByRole('textbox', { name: 'Search by number (with/without dashes), extension, or assignee...' }).fill('346-720-0001');
    
    // Wait for search to filter results
    await page.waitForTimeout(500);
    
    // Verify filtered results
    await expect(page.locator('table').getByText('346-720-0001')).toBeVisible();
    await expect(page.getByText('Showing 1 of')).toBeVisible();
    
    // Verify other numbers are not visible
    await expect(page.locator('table').getByText('346-720-0002')).not.toBeVisible();
  });

  test('should search by extension', async ({ page }) => {
    // Search by extension
    await page.getByRole('textbox', { name: 'Search by number (with/without dashes), extension, or assignee...' }).fill('12345');
    
    // Wait for search to filter results
    await page.waitForTimeout(500);
    
    // Verify results contain numbers with extension 00001
    const results = await page.getByText(/Showing \d+ of \d+ phone numbers/).textContent();
    expect(results).toContain('Showing');
    
    // Should find at least one result with extension 00001
    await expect(page.locator('text=00001').first()).toBeVisible();
  });

  test('should search by assignee name', async ({ page }) => {
    // Search by assignee name
    await page.getByRole('textbox', { name: 'Search by number (with/without dashes), extension, or assignee...' }).fill('John Doe');
    
    // Wait for search to filter results
    await page.waitForTimeout(500);
    
    // Verify results show numbers assigned to John Doe
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText(/Showing .+ of \d+ phone numbers/)).toBeVisible();
  });

  test('should clear search and show all results', async ({ page }) => {
    // First, search for something
    await page.getByRole('textbox', { name: 'Search by number (with/without dashes), extension, or assignee...' }).fill('346-720-0001');
    await page.waitForTimeout(500);
    await expect(page.getByText('Showing 1 of')).toBeVisible();
    
    // Clear search
    await page.getByRole('textbox', { name: 'Search by number (with/without dashes), extension, or assignee...' }).clear();
    await page.waitForTimeout(500);
    
    // Verify all results are shown again
    await expect(page.getByText(/Showing \d+ of \d+ phone numbers/)).toBeVisible();
    await expect(page.locator('table').getByText('346-720-0001')).toBeVisible();
    await expect(page.locator('table').getByText('346-720-0002')).toBeVisible();
  });

  test('should have edit and release buttons for each row', async ({ page }) => {
    // Check that Edit and Release buttons exist for phone numbers
    const editButtons = page.getByRole('button', { name: 'Edit' });
    const releaseButtons = page.getByRole('button', { name: 'Release' });
    
    // Verify at least one edit and release button exists
    await expect(editButtons.first()).toBeVisible();
    await expect(releaseButtons.first()).toBeVisible();
    
    // Count should match (each row should have both buttons)
    const editCount = await editButtons.count();
    const releaseCount = await releaseButtons.count();
    expect(editCount).toEqual(releaseCount);
    expect(editCount).toBeGreaterThan(0);
  });

  test('should filter by status using dropdown', async ({ page }) => {
    // Get the status filter dropdown
    const statusFilter = page.getByRole('combobox');
    
    // Select "Assigned" status
    await statusFilter.selectOption('Assigned');
    await page.waitForTimeout(500);
    
    // Verify only assigned numbers are shown
    const assignedStatuses = page.locator('table').getByText('assigned');
    await expect(assignedStatuses.first()).toBeVisible();
    
    // Select "Available" status
    await statusFilter.selectOption('Available');
    await page.waitForTimeout(500);
    
    // Verify only available numbers are shown
    const availableStatuses = page.locator('table').getByText('available');
    await expect(availableStatuses.first()).toBeVisible();
    
    // Reset to "All Status"
    await statusFilter.selectOption('All Status');
    await page.waitForTimeout(500);
    
    // Verify all numbers are shown again
    await expect(page.getByText(/Showing \d+ of \d+ phone numbers/)).toBeVisible();
  });
});