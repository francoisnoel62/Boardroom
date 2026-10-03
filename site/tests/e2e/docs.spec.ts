import { expect, test } from '@playwright/test';

test('the documentation opens on its introduction and links back to the site', async ({ page }) => {
  await page.goto('/docs/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Introduction');
  await expect(page.locator('header a[href="/"]').first()).toBeVisible();
});

test('the quickstart gives copyable commands for the recorded example', async ({ page }) => {
  await page.goto('/docs/quickstart/');
  const demo = page.locator('pre', { hasText: 'demo --data-dir' }).first();
  await expect(demo).toBeVisible();
  await expect(page.getByRole('button', { name: /copy/i }).first()).toBeAttached();
});

test('pages carry an honest availability status', async ({ page }) => {
  await page.goto('/docs/your-data/');
  await expect(page.locator('[data-status]').first()).toBeVisible();
});

test('search finds a page from the documentation', async ({ page }) => {
  await page.goto('/docs/');
  await page.getByRole('button', { name: 'Search' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Search' });
  await dialog.getByRole('textbox', { name: 'Search' }).fill('citation');
  await expect(dialog.locator('a[href*="/docs/"]').first()).toBeVisible({ timeout: 10_000 });
});

test('code blocks never need horizontal scrolling that a keyboard cannot reach', async ({ page }) => {
  // A wide monospace font must not create a scroll region: long commands wrap instead.
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto('/docs/quickstart/');
  await page.addStyleTag({ content: 'pre, code { font-family: "DejaVu Sans Mono", monospace !important; letter-spacing: 0.08em !important; }' });
  const unreachable = await page.locator('pre').evaluateAll(blocks => blocks
    .filter(block => block.scrollWidth > block.clientWidth + 1 && !block.hasAttribute('tabindex'))
    .map(block => block.textContent?.slice(0, 60)));
  expect(unreachable).toEqual([]);
});
