import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/auth');
    
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should toggle between login and register', async ({ page }) => {
    await page.goto('/auth');
    
    // Should start with login
    await expect(page.getByText('Welcome back')).toBeVisible();
    
    // Click "Don't have an account? Sign up"
    await page.getByText("Don't have an account? Sign up").click();
    
    // Should show register form
    await expect(page.getByText('Create your account')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
    
    // Click back to login
    await page.getByText('Already have an account? Sign in').click();
    
    // Should show login form again
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/auth');
    
    // Try to submit empty form
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Should show validation errors
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/auth');
    
    // Enter invalid email
    await page.getByPlaceholder('Email').fill('invalid-email');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Should show email validation error
    await expect(page.getByText('Invalid email address')).toBeVisible();
  });
});