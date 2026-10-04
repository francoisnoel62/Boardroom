import { expect, test } from '@playwright/test';

test('field notes list the engineering articles, newest first', async ({ page }) => {
  await page.goto('/field-notes/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Field notes');
  const notes = page.locator('[data-note]');
  await expect(notes).toHaveCount(2);
  await expect(notes.locator('time').first()).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
});

test('an article ends with the sources it is built on', async ({ page }) => {
  await page.goto('/field-notes/');
  await page.locator('[data-note] a').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const sources = page.getByRole('region', { name: 'Sources' }).getByRole('link');
  expect(await sources.count()).toBeGreaterThanOrEqual(2);
  await expect(sources.first()).toHaveAttribute('href', /^https:\/\/github\.com\/francoisnoel62\/Boardroom\/blob\/main\//);
});
