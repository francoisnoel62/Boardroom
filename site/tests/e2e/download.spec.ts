import { expect, test } from '@playwright/test';

// These run against the real build, which reads GitHub Releases: no release is published yet.
test('the download page says plainly that no release is published, and how to get Boardroom today', async ({ page }) => {
  await page.goto('/download/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Download Boardroom');
  await expect(page.locator('[data-release-state]')).toHaveAttribute('data-release-state', 'none');
  await expect(page.getByRole('heading', { name: 'No release has been published yet.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Build from source' })).toHaveAttribute('href', '/docs/install/');
  await expect(page.locator('a[href$=".tar.gz"]')).toHaveCount(0);
  await expect(page.locator('pre', { hasText: 'install.sh' })).toHaveCount(0);
});

test('the welcome page gives the first commands after installing', async ({ page }) => {
  await page.goto('/welcome/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome to the room.');
  await expect(page.locator('pre', { hasText: 'boardroom demo' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /quickstart/i }).first()).toBeAttached();
});
