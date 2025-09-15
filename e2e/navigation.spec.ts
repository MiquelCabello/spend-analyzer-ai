import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to landing page by default', async ({ page }) => {
    await page.goto('/');
    
    // Should be on landing page
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Expense Management')).toBeVisible();
  });

  test('should redirect to auth when accessing protected routes without authentication', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard');
    
    // Should redirect to auth
    await expect(page).toHaveURL('/auth');
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  test('should show 404 page for non-existent routes', async ({ page }) => {
    await page.goto('/non-existent-route');
    
    // Should show 404 page
    await expect(page.getByText('Page not found')).toBeVisible();
    await expect(page.getByText('404')).toBeVisible();
  });

  test('should have accessible navigation elements', async ({ page }) => {
    await page.goto('/');
    
    // Check for accessible navigation
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    
    // Check for proper heading hierarchy
    const mainHeading = page.getByRole('heading', { level: 1 });
    await expect(mainHeading).toBeVisible();
  });
});