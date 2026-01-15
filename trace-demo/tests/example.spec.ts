import { test, expect } from '@playwright/test';

test('open example.com and check title', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example Domain/);
});
